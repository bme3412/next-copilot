import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// A dictionary of known companies and their aliases
const COMPANY_ALIASES = {
  'apple': 'AAPL',
  'aapl': 'AAPL',
  'meta': 'META',
  'facebook': 'META',
  'fb': 'META',
  'nvidia': 'NVDA',
  'nvda': 'NVDA',
  'google':'GOOGL',
  'googl':'GOOGL',
  'amazon':'AMZN',
  'amzn':'AMZN',
  'amd':'AMD',
  'advanced micro devices':'AMD',
};

// Base classes
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

// OpenAI embedder using text-embedding-3-small
class OpenAIEmbedder extends BaseEmbedder {
  constructor(openai) {
    super();
    this.openai = openai;
  }

  async embed(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Embedding failed: ${error.message}`);
    }
  }
}

// Pinecone retriever with filters
class PineconeRetriever extends BaseRetriever {
  constructor(pineconeIndex) {
    super();
    this.index = pineconeIndex;
  }

  async retrieve(vector, options = {}) {
    const { topK = 8, filters = {} } = options;
    const queryParams = {
      vector,
      topK,
      includeMetadata: true
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

// LLM-based QueryIntentAnalyzer
class QueryIntentAnalyzer {
  constructor(openai) {
    this.openai = openai;
  }

  async analyze(query) {
    const systemPrompt = `
You are a classification system. Given the user's query, return a JSON object with fields:
analysis_type: one of [technology, financial, market, strategic, general]
topics: array of strings representing topics (e.g. ["ai","revenue"])
timeframe: detect if user wants a specific quarter/year or general timeframe (e.g. "recent", "future", "historical", "Q1 2023", "FY2022"). If nothing specific, return "all".
content_type: what content user wants? one of ["earnings_call", "qa", "cfo_commentary", "all"]
company_name: the company the user is asking about if mentioned, else null.

Only return a JSON object. If unsure, guess best possible. No explanations, just JSON.
`;

    const userPrompt = `User query: "${query}"`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 500
    });

    let classification;
    try {
      classification = JSON.parse(response.choices[0].message.content.trim());
    } catch (err) {
      console.error('Failed to parse classification JSON:', err);
      classification = {
        analysis_type: 'general',
        topics: ['general'],
        timeframe: 'all',
        content_type: 'all',
        company_name: null
      };
    }

    console.log('Analyzed query intent:', classification);
    return classification;
  }
}

// GPT4Analyzer
class GPT4Analyzer extends BaseAnalyzer {
  constructor(openai) {
    super();
    this.openai = openai;
  }

  normalizeChronologicalData(data) {
    return data.map(item => {
      const quarterMatch = item.metadata?.quarter?.match(/Q?(\d)/i);
      const quarter = quarterMatch ? `Q${quarterMatch[1]}` : (item.metadata?.quarter || 'Q1');

      const yearMatch = item.metadata?.fiscalYear?.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : (item.metadata?.fiscalYear || '2023');

      return {
        ...item,
        fiscalYear: year,
        quarter: quarter,
        normalized_period: `${quarter} ${year}`
      };
    }).sort((a, b) => {
      const yearA = parseInt(a.fiscalYear);
      const yearB = parseInt(b.fiscalYear);
      if (yearA !== yearB) return yearB - yearA;

      const qA = parseInt(a.quarter.substring(1));
      const qB = parseInt(b.quarter.substring(1));
      return qB - qA;
    });
  }

  extractRelevantData(matches) {
    return matches.map(match => {
      const text = match.metadata?.text;
      if (!text) {
        console.log('Missing text in match:', match);
        return null;
      }

      return {
        fiscalYear: match.metadata?.fiscalYear || 'Unknown',
        quarter: match.metadata?.quarter || 'Unknown',
        content: text,
        type: match.metadata?.type || 'Unknown',
        score: match.score || 0
      };
    }).filter(Boolean);
  }

  formatTimePeriods(data) {
    const uniquePeriods = [...new Set(data.map(d => `${d.fiscalYear} ${d.quarter}`))];
    return uniquePeriods.sort((a, b) => {
      const [yA, qA] = a.split(' ');
      const [yB, qB] = b.split(' ');
      if (yA !== yB) return yB.localeCompare(yA);
      return qB.localeCompare(qA);
    }).join(', ');
  }

  async analyze(data, queryIntent, companyName = 'NVIDIA') {
    try {
      const normalizedData = this.normalizeChronologicalData(data);
      const relevantData = this.extractRelevantData(normalizedData);

      if (!relevantData.length) {
        console.log('No relevant data found for analysis');
        return this.generateEmptyResponse(queryIntent);
      }

      const systemPrompt = `You are a financial analyst specializing in ${companyName}'s earnings transcripts.
Analyze the provided data with a focus on the following:
- analysis_type: ${queryIntent.analysis_type}
- topics: ${queryIntent.topics.join(', ')}
- timeframe: ${queryIntent.timeframe}
- content_type: ${queryIntent.content_type}

Your analysis should:
1. Be thorough but concise
2. Focus on concrete developments and specific statements
3. Include exact dates and quarters when discussing trends
4. Connect executive statements with actual developments
5. Highlight quantitative metrics when available
6. Organize information chronologically
7. Write in clear, professional prose with no bullet points or sections

The response should be a single coherent analysis in plain text format, focusing on how trends and developments have evolved over time.`;

      const userPrompt = `User asked: "${queryIntent.topics.join(', ')}" in the context of ${queryIntent.query_context || 'the company'}.
Focus areas to address: ${queryIntent.analysis_type}, timeframe: ${queryIntent.timeframe}, content_type: ${queryIntent.content_type}

Analyze these chronologically ordered transcript excerpts:
${relevantData.map(d => `[${d.fiscalYear} ${d.quarter}] ${d.content}`).join('\n\n')}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 4000
      });

      const analysis = response.choices[0].message.content.trim();

      return {
        analysis,
        metadata: {
          time_periods: this.formatTimePeriods(relevantData),
          query_type: queryIntent.analysis_type,
          data_points: relevantData.length,
          topics_covered: queryIntent.topics
        }
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  generateEmptyResponse(queryIntent) {
    return {
      analysis: "No relevant information found for this query in the available earnings transcripts.",
      metadata: {
        time_periods: "",
        query_type: queryIntent.analysis_type,
        data_points: 0,
        topics_covered: queryIntent.topics
      }
    };
  }
}

// RAGPipeline with improved logic
class RAGPipeline {
  constructor(embedder, retriever, analyzer, queryIntentAnalyzer) {
    this.embedder = embedder;
    this.retriever = retriever;
    this.analyzer = analyzer;
    this.queryIntentAnalyzer = queryIntentAnalyzer;
  }

  detectCompanyFromIntent(companyName) {
    if (!companyName) return 'NVDA'; // default fallback
    const lowerName = companyName.toLowerCase();

    if (COMPANY_ALIASES[lowerName]) {
      return COMPANY_ALIASES[lowerName];
    }

    // If not found in aliases, default:
    return 'NVDA';
  }

  buildFiltersFromIntent(queryIntent, companyTicker) {
    const filters = { company: companyTicker };

    const timeframe = (queryIntent.timeframe || '').toLowerCase();
    const fyMatch = timeframe.match(/fy(\d{4})/i);
    const qMatch = timeframe.match(/q(\d)\s*(\d{4})/i);

    // Specific quarter/year filtering
    if (qMatch) {
      filters.fiscalYear = qMatch[2];
      filters.quarter = `Q${qMatch[1]}`;
    } else if (fyMatch) {
      filters.fiscalYear = fyMatch[1];
    } else if (timeframe === 'recent') {
      // Example: If recent means latest fiscal year data
      filters.fiscalYear = '2024'; 
    }
    // For 'historical', 'future', or 'all', we either don't set filters or rely on defaults.

    // content_type filtering
    // Ensure your metadata.type matches these values:
    // "earnings_call", "qa", "cfo_commentary"
    if (queryIntent.content_type && queryIntent.content_type !== 'all') {
      filters.type = queryIntent.content_type;
    }

    return filters;
  }

  async process(query) {
    console.log('Processing query:', query);
    const queryIntent = await this.queryIntentAnalyzer.analyze(query);
    console.log('Query intent:', queryIntent);

    const companyTicker = this.detectCompanyFromIntent(queryIntent.company_name);
    const embedding = await this.embedder.embed(query);
    console.log('Generated embedding');

    const filters = this.buildFiltersFromIntent(queryIntent, companyTicker);
    console.log('Filters to apply:', filters);

    const retrievalResults = await this.retriever.retrieve(embedding, { filters });
    console.log('Retrieved documents:', retrievalResults.matches?.length || 0);

    if (!retrievalResults.matches?.length) {
      return this.generateEmptyResponse(queryIntent);
    }

    return await this.analyzer.analyze(retrievalResults.matches, queryIntent, companyTicker);
  }

  generateEmptyResponse(queryIntent) {
    return {
      analysis: "No data found for the specified query.",
      metadata: {
        query_type: queryIntent.analysis_type,
        data_points: 0
      }
    };
  }
}

function createPipeline() {
  const requiredEnvVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} environment variable is required`);
    }
  }

  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);

  return new RAGPipeline(
    new OpenAIEmbedder(openaiClient),
    new PineconeRetriever(pineconeIndex),
    new GPT4Analyzer(openaiClient),
    new QueryIntentAnalyzer(openaiClient)
  );
}

const pipeline = createPipeline();

export async function POST(req) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({
        error: 'Invalid query input.',
        details: 'Query cannot be empty'
      }, { status: 400 });
    }

    console.log('Received query:', query);

    try {
      const analysis = await pipeline.process(query);
      return NextResponse.json(analysis);
    } catch (error) {
      console.error('Pipeline processing error:', error);

      if (error.name === 'PineconeArgumentError') {
        return NextResponse.json({
          analysis: "Database Query Error",
          metadata: {
            error: error.message,
            query_type: 'error'
          }
        }, { status: 500 });
      }

      return NextResponse.json({
        analysis: "An error occurred while processing your query. Please try again.",
        metadata: {
          error: error.message,
          query_type: 'error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({
      analysis: "Failed to process the request. Please ensure your query is properly formatted.",
      metadata: {
        error: error.message,
        query_type: 'error'
      }
    }, { status: 400 });
  }
}
