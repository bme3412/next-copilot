// src/app/api/chat/route.js

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';

// ----------------------------------------------------------------
// 1. Company Aliases
// ----------------------------------------------------------------
const COMPANY_ALIASES = {
  apple: 'AAPL',
  aapl: 'AAPL',
  meta: 'META',
  facebook: 'META',
  fb: 'META',
  meta : 'META',
  nvidia: 'NVDA',
  nvda: 'NVDA',
  google: 'GOOGL',
  googl: 'GOOGL',
  amazon: 'AMZN',
  amzn: 'AMZN',
  amd: 'AMD',
  avago: 'AVGO',
  broadcom: 'AVGO',
  avgo: 'AVGO',
  salesforce: 'CRM',
  crm: 'CRM',
  google: 'GOOGL',
  googl: 'GOOGL',
  goog: 'GOOGL',
  alphabet: 'GOOGL',
  microsoft: 'MSFT',
  msft: 'MSFT',
  oracle: 'ORCL',
  orcl: 'ORCL'
};

// ----------------------------------------------------------------
// 2. Base Classes
// ----------------------------------------------------------------
class BaseEmbedder {
  async embed(text) {
    throw new Error('Must implement embed method');
  }
}

class BaseRetriever {
  async retrieve(vector, options = {}) {
    throw new Error('Must implement retrieve method');
  }
}

class BaseAnalyzer {
  async analyze(data, queryIntent, companyName) {
    throw new Error('Must implement analyze method');
  }
}

// ----------------------------------------------------------------
// 3. OpenAIEmbedder
// ----------------------------------------------------------------
class OpenAIEmbedder extends BaseEmbedder {
  constructor(openaiClient) {
    super();
    this.openai = openaiClient;
  }

  async embed(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Embedding failed: ${error.message}`);
    }
  }
}

// ----------------------------------------------------------------
// 4. PineconeRetriever
// ----------------------------------------------------------------
class PineconeRetriever extends BaseRetriever {
  constructor(pineconeIndex) {
    super();
    this.index = pineconeIndex;
  }

  async retrieve(vector, options = {}) {
    const { topK = 24, filters = {} } = options;
    const queryParams = {
      vector,
      topK,
      includeMetadata: true,
    };

    if (Object.keys(filters).length > 0) {
      queryParams.filter = filters;
    }

    try {
      const result = await this.index.query(queryParams);
      console.log('Pinecone query result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('Pinecone retrieval error:', error);
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }
}

// ----------------------------------------------------------------
// 5. FinancialJSONRetriever
// ----------------------------------------------------------------
class FinancialJSONRetriever {
  constructor(baseDir) {
    this.baseDir = baseDir; // e.g. path.join(process.cwd(), 'data', 'financials')
  }

  async retrieveFinancialData(ticker, timeframe = {}) {
    // By default, e.g. FY=2024, Q=Q1
    const fy = timeframe.fiscalYear || '2024';
    const q = timeframe.quarter || 'Q1';

    // e.g. data/financials/AAPL/FY_2024/Q1/AAPL_FY_2024_Q1.json
    const fileDir = path.join(this.baseDir, ticker, `FY_${fy}`, q);
    const fileName = `${ticker}_FY_${fy}_${q}.json`;
    const filePath = path.join(fileDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`No local financial data found at: ${filePath}`);
      return [];
    }

    let jsonData;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      jsonData = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse financial JSON:', err);
      return [];
    }

    // Convert the JSON to text for GPT analysis
    const text = JSON.stringify(jsonData, null, 2);

    return [
      {
        metadata: {
          company: ticker,
          quarter: q,
          fiscalYear: fy,
          type: 'financial_data',
          text,
        },
        score: 0,
      },
    ];
  }
}

// ----------------------------------------------------------------
// 6. QueryIntentAnalyzer (LLM-based classification)
// ----------------------------------------------------------------
class QueryIntentAnalyzer {
  constructor(openaiClient) {
    this.openai = openaiClient;
  }

  async analyze(query) {
    const systemPrompt = `
You are a classification system. Given the user's query, return a JSON object with fields:
analysis_type: one of [technology, financial, market, strategic, general]
topics: array of strings representing topics (e.g. ["ai","revenue"])
timeframe: detect if user wants a specific quarter/year or general timeframe ("recent", "future", "historical", "Q1 2023", "FY2022"). If none, return "all".
content_type: one of ["earnings_call", "qa", "cfo_commentary", "all"]
company_name: the company the user is asking about if any, else null.

Return ONLY a JSON object, no extra text.
    `;
    const userPrompt = `User query: "${query}"`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    let classification;
    try {
      classification = JSON.parse(response.choices[0].message.content.trim());
    } catch (err) {
      console.error('Could not parse classification JSON:', err);
      classification = {
        analysis_type: 'general',
        topics: ['general'],
        timeframe: 'all',
        content_type: 'all',
        company_name: null,
      };
    }
    console.log('Analyzed query intent:', classification);
    return classification;
  }
}

// ----------------------------------------------------------------
// 7. GPT4Analyzer (no markdown/bullets)
// ----------------------------------------------------------------
class GPT4Analyzer extends BaseAnalyzer {
  constructor(openaiClient) {
    super();
    this.openai = openaiClient;
  }

  normalize(data) {
    // Turn "1" into "Q1" for sorting, etc.
    return data
      .map((item) => {
        const quarterRaw = item.metadata?.quarter || 'Q1';
        // If it's just a digit, we prefix with "Q"
        const qMatch = quarterRaw.match(/^(\d+)$/);
        const qFinal = qMatch ? `Q${qMatch[1]}` : quarterRaw; // e.g. "Q1"

        const yearRaw = item.metadata?.fiscalYear || '2023';
        const yMatch = yearRaw.match(/\d{4}/);
        const yFinal = yMatch ? yMatch[0] : '2023';

        return {
          ...item,
          quarter: qFinal,
          year: yFinal,
        };
      })
      .sort((a, b) => {
        // Sort by year desc, then quarter desc
        const yearA = parseInt(a.year, 10);
        const yearB = parseInt(b.year, 10);
        if (yearB !== yearA) return yearB - yearA;

        const qa = parseInt(a.quarter.replace('Q', ''), 10);
        const qb = parseInt(b.quarter.replace('Q', ''), 10);
        return qb - qa;
      });
  }

  extractText(data) {
    return data
      .map((m) => {
        if (!m.metadata?.text) return null;
        return {
          fiscalYear: m.metadata.fiscalYear,
          quarter: m.metadata.quarter,
          content: m.metadata.text,
          type: m.metadata.type || 'Unknown',
        };
      })
      .filter(Boolean);
  }

  async analyze(data, queryIntent, company = 'NVDA') {
    const normalized = this.normalize(data);
    const relevantData = this.extractText(normalized);

    if (!relevantData.length) {
      return this.emptyAnalysis(queryIntent);
    }

    const systemPrompt = `
You are a financial analyst covering ${company}. 
You have both transcript data and financial data. 
Do NOT use bullet points, headings, or any markdown formatting. 
When summarizing a specific quarter or multiple quarters, start with a brief introduction highlighting the main points and context for that period. 
Follow it with relevant metrics, strategic developments, and concise commentary in a cohesive plain-text narrative. 
analysis_type: ${queryIntent.analysis_type}
topics: ${queryIntent.topics.join(', ')}
timeframe: ${queryIntent.timeframe}
content_type: ${queryIntent.content_type}
`;

    const userPrompt = `
User asked about: ${queryIntent.topics.join(', ')} 
Timeframe: ${queryIntent.timeframe}
Content type: ${queryIntent.content_type}

Relevant data:
${relevantData.map(d => `[${d.fiscalYear} ${d.quarter} | ${d.type}] ${d.content}`).join('\n\n')}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const answer = response.choices[0].message.content.trim();
      return {
        analysis: answer,
        metadata: {
          data_points: relevantData.length,
          analysis_type: queryIntent.analysis_type,
          timeframe: queryIntent.timeframe,
          topics_covered: queryIntent.topics,
        },
      };
    } catch (error) {
      console.error('GPT4 analysis error:', error);
      throw new Error(`GPT4 analysis failed: ${error.message}`);
    }
  }

  emptyAnalysis(queryIntent) {
    return {
      analysis: 'No relevant data found for this query.',
      metadata: {
        query_type: queryIntent.analysis_type,
        data_points: 0,
      },
    };
  }
}

// ----------------------------------------------------------------
// 8. RAGPipeline + Extended Pipeline
// ----------------------------------------------------------------
class RAGPipeline {
  constructor(embedder, retriever, analyzer, intentAnalyzer) {
    this.embedder = embedder;
    this.retriever = retriever;
    this.analyzer = analyzer;
    this.intentAnalyzer = intentAnalyzer;
  }

  detectCompany(companyName) {
    if (!companyName) return 'NVDA'; // fallback
    const lower = companyName.toLowerCase();
    return COMPANY_ALIASES[lower] || 'NVDA';
  }

  // NEW CODE: Helper function to parse ALL Q / Year references
  extractQuartersAndYears(timeframeString) {
    const regex = /q(\d)\s*(\d{4})/gi;
    const matches = [...timeframeString.matchAll(regex)];
    return matches.map(m => ({
      quarter: m[1],      // '1', '2', etc.
      fiscalYear: m[2],   // '2024'
    }));
  }

  buildFilters(intent, ticker) {
    // Always start with base filter for the company
    let baseFilter = { company: ticker };

    // If content_type is not "all", map to Pinecone's doc types
    if (intent.content_type && intent.content_type !== 'all') {
      if (intent.content_type === 'earnings_call') {
        baseFilter.type = 'earnings';
      } else {
        baseFilter.type = intent.content_type;
      }
    }

    // Convert timeframe string to lowercase
    const timeframe = (intent.timeframe || '').toLowerCase();

    // NEW CODE: Extract multiple Q references
    const quartersAndYears = this.extractQuartersAndYears(timeframe); // e.g. Q1 2024, Q2 2024
    // Also parse possible multiple FY references
    const fyRegex = /fy(\d{4})/gi;
    const fyMatches = [...timeframe.matchAll(fyRegex)];
    const fiscalYears = fyMatches.map(m => m[1]); // e.g. ['2023', '2024']

    // If user says "recent"
    if (timeframe === 'recent' && !quartersAndYears.length && !fiscalYears.length) {
      // fallback
      return {
        ...baseFilter,
        fiscalYear: '2024'
      };
    }

    // If multiple Q references
    if (quartersAndYears.length > 1) {
      // Build an $or clause
      const orClauses = quartersAndYears.map(qy => ({
        quarter: qy.quarter,
        fiscalYear: qy.fiscalYear
      }));
      return {
        $and: [
          baseFilter,
          { $or: orClauses }
        ]
      };
    }

    // If exactly one Q reference
    if (quartersAndYears.length === 1) {
      return {
        ...baseFilter,
        fiscalYear: quartersAndYears[0].fiscalYear,
        quarter: quartersAndYears[0].quarter
      };
    }

    // If multiple FY references
    if (fiscalYears.length > 1) {
      const orFYs = fiscalYears.map(y => ({ fiscalYear: y }));
      return {
        $and: [
          baseFilter,
          { $or: orFYs }
        ]
      };
    }

    // If exactly one FY reference
    if (fiscalYears.length === 1) {
      return {
        ...baseFilter,
        fiscalYear: fiscalYears[0]
      };
    }

    // If no Q or FY found, just return baseFilter
    return baseFilter;
  }

  async process(query) {
    console.log('Base pipeline process. Extend me for custom logic.');
    return { analysis: 'No data.', metadata: {} };
  }
}

class ExtendedRAGPipeline extends RAGPipeline {
  constructor(embedder, retriever, analyzer, intentAnalyzer, financialRetriever) {
    super(embedder, retriever, analyzer, intentAnalyzer);
    this.financialRetriever = financialRetriever;
  }

  async process(query) {
    console.log('Processing query:', query);

    // 1) Analyze the user query
    const intent = await this.intentAnalyzer.analyze(query);
    console.log('Intent:', intent);

    // 2) Detect the company's ticker
    const ticker = this.detectCompany(intent.company_name);

    // 3) Generate an embedding
    const vector = await this.embedder.embed(query);

    // 4) Build filters (fiscalYear, quarter, type, etc.)
    const filters = this.buildFilters(intent, ticker);

    // 5) Retrieve transcripts from Pinecone
    const pineconeRes = await this.retriever.retrieve(vector, { filters });
    const transcripts = pineconeRes.matches || [];
    console.log('Transcript matches:', transcripts.length);

    // 6) Optionally retrieve local financial data
    let finMatches = [];
    const isFinQuery =
      intent.analysis_type === 'financial' ||
      (intent.topics || []).some((t) =>
        ['financial', 'revenue', 'eps', 'profit'].includes(t.toLowerCase())
      );

    if (isFinQuery) {
      // Because user might have multiple Q references, let's pick the relevant ones
      // For simplicity, just handle the "first" or the "recent" if multiple are present,
      // or you can loop over them if you want to retrieve all local JSON files that match.
      const timeframe = {};

      // For demonstration, handle only single-quarter or single-FY
      // If you want to retrieve multiple, you'd need to loop over them
      // and gather all matches. 
      // E.g. if filters has $and/$or, you'd parse them here similarly.

      // A simpler approach: parse again with `extractQuartersAndYears`:
      const quartersAndYears = this.extractQuartersAndYears(intent.timeframe.toLowerCase());
      const fyRegex = /fy(\d{4})/gi;
      const fyMatches = [...intent.timeframe.toLowerCase().matchAll(fyRegex)];
      const fiscalYears = fyMatches.map(m => m[1]);

      // Example: if multiple Q references, retrieve them all
      if (quartersAndYears.length > 1) {
        for (const qy of quartersAndYears) {
          const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, {
            fiscalYear: qy.fiscalYear,
            quarter: `Q${qy.quarter}`,
          });
          finMatches.push(...theseMatches);
        }
      } else if (quartersAndYears.length === 1) {
        timeframe.fiscalYear = quartersAndYears[0].fiscalYear;
        timeframe.quarter = `Q${quartersAndYears[0].quarter}`;
        const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, timeframe);
        finMatches.push(...theseMatches);
      } else if (fiscalYears.length > 1) {
        for (const fy of fiscalYears) {
          const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, {
            fiscalYear: fy
          });
          finMatches.push(...theseMatches);
        }
      } else if (fiscalYears.length === 1) {
        timeframe.fiscalYear = fiscalYears[0];
        const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, timeframe);
        finMatches.push(...theseMatches);
      } else {
        // fallback for "recent" or none
        const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, {
          fiscalYear: '2024',
          quarter: 'Q1'
        });
        finMatches.push(...theseMatches);
      }

      console.log('Financial data matches:', finMatches.length);
    }

    // 7) Merge transcripts + financial data
    const combined = [...transcripts, ...finMatches];
    if (!combined.length) {
      return {
        analysis: 'No data found for the specified query.',
        metadata: { query_type: intent.analysis_type, data_points: 0 },
      };
    }

    // 8) Let the analyzer produce the final text
    return await this.analyzer.analyze(combined, intent, ticker);
  }
}

// ----------------------------------------------------------------
// 9. Create & Export Pipeline
// ----------------------------------------------------------------
function createPipeline() {
  // Confirm required env variables
  const envVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX'];
  for (const v of envVars) {
    if (!process.env[v]) throw new Error(`${v} is required`);
  }

  // Initialize clients
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);

  // Instantiate all classes
  const embedder = new OpenAIEmbedder(openaiClient);
  const pineRetriever = new PineconeRetriever(pineconeIndex);
  const analyzer = new GPT4Analyzer(openaiClient);
  const intentAnalyzer = new QueryIntentAnalyzer(openaiClient);

  // Local JSON data (financial data) retriever
  const baseDir = path.join(process.cwd(), 'data', 'financials');
  const finRetriever = new FinancialJSONRetriever(baseDir);

  // Build the extended pipeline
  return new ExtendedRAGPipeline(
    embedder,
    pineRetriever,
    analyzer,
    intentAnalyzer,
    finRetriever
  );
}

const pipeline = createPipeline();

// ----------------------------------------------------------------
// 10. POST Handler
// ----------------------------------------------------------------
export async function POST(req) {
  try {
    const { query } = await req.json();
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Invalid query.', details: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    console.log('User query:', query);

    try {
      const result = await pipeline.process(query);
      return NextResponse.json(result);
    } catch (err) {
      console.error('Processing error:', err);
      return NextResponse.json(
        {
          analysis: 'An error occurred while processing your query.',
          metadata: { error: err.message },
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Request parsing error:', err);
    return NextResponse.json(
      {
        analysis: 'Failed to process the request. Ensure JSON body with { query: "..." }.',
        metadata: { error: err.message },
      },
      { status: 400 }
    );
  }
};
