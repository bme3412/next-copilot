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
  meta: 'META',
  nvidia: 'NVDA',
  nvda: 'NVDA',
  google: 'GOOGL',
  googl: 'GOOGL',
  goog:'GOOGL',
  amazon: 'AMZN',
  amzn: 'AMZN',
  amd: 'AMD',
  avago: 'AVGO',
  broadcom: 'AVGO',
  avgo: 'AVGO',
  salesforce: 'CRM',
  crm: 'CRM',
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
  async analyze(data, queryIntent, companyName, style) {
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
    const { topK = 10, filters = {} } = options;
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
// 6. QueryIntentAnalyzer
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

Return ONLY valid JSON. 
DO NOT wrap the JSON in triple backticks, 
DO NOT include any additional text, code blocks, or markdown formatting.
If your output is not valid JSON, it will break the system.
    `;
    const userPrompt = `User query: "${query}"`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    let classification;
    let rawContent = response.choices[0].message.content.trim();

    // Remove potential code fences if GPT accidentally included them
    rawContent = rawContent.replace(/```([\s\S]*?)```/g, '$1');

    try {
      classification = JSON.parse(rawContent);
    } catch (err) {
      console.error('Could not parse classification JSON:', err);
      // Fallback
      classification = {
        analysis_type: 'general',
        topics: ['general'],
        timeframe: 'all',
        content_type: 'all',
        company_name: null,
      };
    }

    // Optional style handling
    classification.style = classification.style || 'neutral';

    console.log('Analyzed query intent:', classification);
    return classification;
  }
}

// ----------------------------------------------------------------
// 7. EnhancedFinancialAnalyst (Replaces GPT4Analyzer)
// ----------------------------------------------------------------
class EnhancedFinancialAnalyst extends BaseAnalyzer {
  constructor(openai) {
    super();
    this.openai = openai;
  }

  // Reuse the normalization logic to handle quarter/year sorting
  normalize(data) {
    return data
      .map((item) => {
        const quarterRaw = item.metadata?.quarter || 'Q1';
        const qMatch = quarterRaw.match(/^(\d+)$/);
        const qFinal = qMatch ? `Q${qMatch[1]}` : quarterRaw;

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
        const yearA = parseInt(a.year, 10);
        const yearB = parseInt(b.year, 10);
        if (yearB !== yearA) return yearB - yearA;

        const qa = parseInt(a.quarter.replace('Q', ''), 10);
        const qb = parseInt(b.quarter.replace('Q', ''), 10);
        return qb - qa;
      });
  }

  // Reuse the extraction logic from the raw data
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

  // Remove markdown formatting while preserving text
  removeMarkdown(text) {
    // Remove markdown characters (#, *, _, `)
    return text
      .replace(/[#*_`]/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  // Enhanced analysis method
  async analyze(data, queryIntent, company = 'NVDA', style = 'professional') {
    // Normalize and extract relevant data
    const normalized = this.normalize(data);
    const relevantData = this.extractText(normalized);

    if (!relevantData.length) {
      return this.emptyAnalysis(queryIntent);
    }

    // Enhanced system prompt with emphasis on quantitative data
    const systemPrompt = `
You are an advanced financial and business analyst covering ${company}. Your responses should emphasize quantitative data and market metrics when available.

Key Analysis Guidelines:
- Provide natural, conversational answers that directly address the user's question
- Always include specific numbers when discussing:
  * Market opportunities and Total Addressable Market (TAM)
  * Revenue projections and growth rates
  * Market share and competitive positioning
  * Customer metrics and unit economics
  * Industry-wide statistics
- When mentioning market sizes or opportunities, cite specific figures (e.g. "Company sees the AI market at $500B by 2025")
- For market share discussions, include percentages and growth metrics
- Quote executives directly when they provide specific numbers or market projections
- Include revenue ranges and growth rates even when exact figures aren't available
- Maintain ${style} tone throughout the response
- Present information in plain text without formatting

Focus Areas:
Analysis Type: ${queryIntent.analysis_type}
Topics: ${queryIntent.topics.join(', ')}
Timeframe: ${queryIntent.timeframe}
Content Type: ${queryIntent.content_type}
`;

    // Enhanced user prompt to emphasize numerical data
    const userPrompt = `
Analyze these topics: ${queryIntent.topics.join(', ')}
Timeframe: ${queryIntent.timeframe}
Content Type: ${queryIntent.content_type}

Please emphasize:
- Market size estimates and TAM figures
- Growth rates and financial projections
- Revenue and margin metrics
- Market share percentages
- Customer/user metrics
- Unit economics and pricing data
- Geographic market breakdowns
- Industry-wide statistics

Relevant data:
${relevantData
  .map((d) => `[${d.fiscalYear} ${d.quarter} | ${d.type}] ${d.content}`)
  .join('\n\n')}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });

      let answer = response.choices[0].message.content.trim();
      answer = this.removeMarkdown(answer);

      return {
        analysis: answer,
        metadata: {
          data_points: relevantData.length,
          analysis_type: queryIntent.analysis_type,
          timeframe: queryIntent.timeframe,
          topics_covered: queryIntent.topics,
          quantitative_focus: true
        },
      };
    } catch (error) {
      console.error('GPT4 analysis error:', error);
      throw new Error(`GPT4 analysis failed: ${error.message}`);
    }
  }

  emptyAnalysis(queryIntent) {
    return {
      analysis: 'No relevant data found for this query. The information might be outside our available transcripts or financials.',
      metadata: {
        query_type: queryIntent.analysis_type,
        data_points: 0,
        quantitative_focus: true
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

  extractQuartersAndYears(timeframeString) {
    const regex = /q(\d)\s*(\d{4})/gi;
    const matches = [...timeframeString.matchAll(regex)];
    return matches.map(m => ({
      quarter: m[1],
      fiscalYear: m[2],
    }));
  }

  buildFilters(intent, ticker) {
    let baseFilter = { company: ticker };

    if (intent.content_type && intent.content_type !== 'all') {
      if (intent.content_type === 'earnings_call') {
        baseFilter.type = 'earnings';
      } else {
        baseFilter.type = intent.content_type;
      }
    }

    const timeframe = (intent.timeframe || '').toLowerCase();
    const quartersAndYears = this.extractQuartersAndYears(timeframe);
    const fyRegex = /fy(\d{4})/gi;
    const fyMatches = [...timeframe.matchAll(fyRegex)];
    const fiscalYears = fyMatches.map(m => m[1]);

    // "recent" fallback
    if (timeframe === 'recent' && !quartersAndYears.length && !fiscalYears.length) {
      return {
        ...baseFilter,
        fiscalYear: '2024'
      };
    }

    // If multiple Q references
    if (quartersAndYears.length > 1) {
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

    // Otherwise just return the base filter
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

    // 2) Detect company ticker
    const ticker = this.detectCompany(intent.company_name);

    // 3) Generate embedding
    const vector = await this.embedder.embed(query);

    // 4) Build filters
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
      const timeframe = {};
      const quartersAndYears = this.extractQuartersAndYears(intent.timeframe.toLowerCase());
      const fyRegex = /fy(\d{4})/gi;
      const fyMatches = [...intent.timeframe.toLowerCase().matchAll(fyRegex)];
      const fiscalYears = fyMatches.map(m => m[1]);

      // Multiple Q references
      if (quartersAndYears.length > 1) {
        for (const qy of quartersAndYears) {
          const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, {
            fiscalYear: qy.fiscalYear,
            quarter: `Q${qy.quarter}`,
          });
          finMatches.push(...theseMatches);
        }
      } else if (quartersAndYears.length === 1) {
        // Single Q
        timeframe.fiscalYear = quartersAndYears[0].fiscalYear;
        timeframe.quarter = `Q${quartersAndYears[0].quarter}`;
        const theseMatches = await this.financialRetriever.retrieveFinancialData(
          ticker,
          timeframe
        );
        finMatches.push(...theseMatches);
      } else if (fiscalYears.length > 1) {
        // Multiple FY
        for (const fy of fiscalYears) {
          const theseMatches = await this.financialRetriever.retrieveFinancialData(ticker, {
            fiscalYear: fy
          });
          finMatches.push(...theseMatches);
        }
      } else if (fiscalYears.length === 1) {
        // Single FY
        timeframe.fiscalYear = fiscalYears[0];
        const theseMatches = await this.financialRetriever.retrieveFinancialData(
          ticker,
          timeframe
        );
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

    // 8) Final text from EnhancedFinancialAnalyst
    return await this.analyzer.analyze(combined, intent, ticker, intent.style);
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

  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);

  const embedder = new OpenAIEmbedder(openaiClient);
  const pineRetriever = new PineconeRetriever(pineconeIndex);
  const intentAnalyzer = new QueryIntentAnalyzer(openaiClient);

  // Use the new EnhancedFinancialAnalyst instead of GPT4Analyzer
  const analyzer = new EnhancedFinancialAnalyst(openaiClient);

  const baseDir = path.join(process.cwd(), 'data', 'financials');
  const finRetriever = new FinancialJSONRetriever(baseDir);

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
