// src/app/api/chat/stream/route.js

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
// 2. Streaming Pipeline
// ----------------------------------------------------------------
class StreamingRAGPipeline {
  constructor(openaiClient, pineconeIndex, baseDir) {
    this.openai = openaiClient;
    this.pineconeIndex = pineconeIndex;
    this.baseDir = baseDir;
    this.embeddingCache = new Map(); // Simple in-memory cache for embeddings
  }

  detectCompany(companyName) {
    if (!companyName) return 'NVDA';
    
    // Handle array of companies (comparison queries)
    if (Array.isArray(companyName)) {
      // For comparison queries, use the first company as primary
      const primaryCompany = companyName[0];
      if (primaryCompany) {
        const lower = primaryCompany.toLowerCase();
        return COMPANY_ALIASES[lower] || 'NVDA';
      }
      return 'NVDA';
    }
    
    // Handle single company
    const lower = companyName.toLowerCase();
    return COMPANY_ALIASES[lower] || 'NVDA';
  }

  async analyzeQueryIntent(query) {
    const systemPrompt = `
You are a classification system. Given the user's query, return a JSON object with fields:
analysis_type: one of [technology, financial, market, strategic, general]
topics: array of strings representing topics (e.g. ["ai","revenue"])
timeframe: detect if user wants a specific quarter/year or general timeframe. 
- For "past year", "last year", "previous year" → return "past year"
- For "recent", "current", "latest" → return "recent" 
- For specific quarters like "Q1 2023" → return "Q1 2023"
- For specific years like "FY2022" → return "FY2022"
- For "future", "upcoming" → return "future"
- If none specified, return "all"
content_type: one of ["earnings_call", "qa", "cfo_commentary", "all"]
company_name: the company(ies) the user is asking about. For comparison queries (e.g., "compare X and Y"), return an array of company names. For single company queries, return a string. If no company mentioned, return null.

Return ONLY valid JSON. 
DO NOT wrap the JSON in triple backticks, 
DO NOT include any additional text, code blocks, or markdown formatting.
If your output is not valid JSON, it will break the system.
    `;
    const userPrompt = `User query: "${query}"`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    let classification;
    let rawContent = response.choices[0].message.content.trim();
    rawContent = rawContent.replace(/```([\s\S]*?)```/g, '$1');

    try {
      classification = JSON.parse(rawContent);
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

    classification.style = classification.style || 'neutral';
    return classification;
  }

  async embed(text) {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text);
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    const embedding = response.data[0].embedding;
    
    // Cache the result (limit cache size to prevent memory issues)
    if (this.embeddingCache.size > 50) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(text, embedding);
    
    return embedding;
  }

  async retrieveRelevantData(query, intent, ticker) {
    // Enhanced query preprocessing for better relevance
    const enhancedQuery = this.preprocessQuery(query);
    const vector = await this.embed(enhancedQuery);
    
    // Check if this is a comparison query
    const isComparisonQuery = Array.isArray(intent.company_name) && intent.company_name.length > 1;
    
    // Build query parameters
    const queryParams = {
      vector,
      topK: isComparisonQuery ? 6 : 4, // More results for comparison queries
      includeMetadata: true
    };
    
    // Only add filter for non-comparison queries
    if (!isComparisonQuery) {
      queryParams.filter = this.buildFilters(intent, ticker);
    }
    
    // Query Pinecone with optimized parameters
    const result = await this.pineconeIndex.query(queryParams);

    // Post-process results for better relevance
    const filteredResults = this.postProcessResults(result.matches || [], query);
    return filteredResults;
  }

  preprocessQuery(query) {
    // Enhance query with relevant financial terms
    const financialTerms = {
      'cash flow': 'operating cash flow free cash flow cash generation cash from operations',
      'revenue': 'revenue sales net sales total revenue top line',
      'profit': 'profit earnings net income operating income bottom line',
      'margin': 'margin gross margin operating margin profit margin',
      'growth': 'growth increase year-over-year quarter-over-quarter',
      'trend': 'trend pattern trajectory direction movement'
    };

    let enhancedQuery = query.toLowerCase();
    
    // Add relevant financial terms based on query content
    for (const [term, synonyms] of Object.entries(financialTerms)) {
      if (enhancedQuery.includes(term)) {
        enhancedQuery += ' ' + synonyms;
      }
    }

    // Enhanced timeframe context
    if (enhancedQuery.includes('past year') || enhancedQuery.includes('last year')) {
      enhancedQuery += ' fiscal year 2024 2023 quarterly earnings call';
    }
    if (enhancedQuery.includes('quarter') || enhancedQuery.includes('Q')) {
      enhancedQuery += ' quarterly earnings call';
    }
    
    // Add CFO commentary context for financial queries
    if (enhancedQuery.includes('cash') || enhancedQuery.includes('revenue') || enhancedQuery.includes('financial')) {
      enhancedQuery += ' CFO commentary financial metrics';
    }

    return enhancedQuery;
  }

  postProcessResults(matches, originalQuery) {
    if (!matches || matches.length === 0) return [];

    const queryTerms = originalQuery.toLowerCase().split(' ');
    const relevantTerms = ['cash', 'flow', 'revenue', 'profit', 'earnings', 'financial', 'performance', 'trend'];
    
    // Enhanced scoring based on query type
    const isCashFlowQuery = originalQuery.toLowerCase().includes('cash flow');
    const isFinancialPerformanceQuery = originalQuery.toLowerCase().includes('financial performance');
    const isCompetitiveQuery = originalQuery.toLowerCase().includes('competitive') || originalQuery.toLowerCase().includes('position');
    
    const scoredMatches = matches.map(match => {
      let relevanceScore = match.score;
      const text = (match.metadata?.text || '').toLowerCase();
      
      // Boost score for exact term matches
      for (const term of queryTerms) {
        if (text.includes(term) && relevantTerms.some(rt => rt.includes(term))) {
          relevanceScore += 0.15;
        }
      }
      
      // Special boost for cash flow specific content
      if (isCashFlowQuery) {
        const cashFlowTerms = ['operating cash flow', 'free cash flow', 'cash generation', 'cash from operations', 'cash flow'];
        for (const term of cashFlowTerms) {
          if (text.includes(term)) {
            relevanceScore += 0.4;
          }
        }
      }
      
      // Special boost for financial performance queries
      if (isFinancialPerformanceQuery) {
        const performanceTerms = ['revenue', 'profit', 'margin', 'growth', 'earnings', 'income'];
        for (const term of performanceTerms) {
          if (text.includes(term)) {
            relevanceScore += 0.3;
          }
        }
      }
      
      // Special boost for competitive positioning queries
      if (isCompetitiveQuery) {
        const competitiveTerms = ['market', 'competitive', 'position', 'share', 'advantage', 'leadership'];
        for (const term of competitiveTerms) {
          if (text.includes(term)) {
            relevanceScore += 0.3;
          }
        }
      }
      
      // Penalize irrelevant content more aggressively
      const irrelevantTerms = ['applecare', 'app store', 'apple pay', 'iphone_and_services', 'future_guidance'];
      for (const term of irrelevantTerms) {
        if (text.includes(term) && !originalQuery.toLowerCase().includes(term)) {
          relevanceScore -= 0.5;
        }
      }
      
      // Boost CFO commentary and earnings call content for financial queries
      if (text.includes('cfo') || text.includes('chief financial officer') || text.includes('earnings')) {
        relevanceScore += 0.25;
      }
      
      // Penalize very short or generic content
      if (text.length < 50) {
        relevanceScore -= 0.2;
      }
      
      return {
        ...match,
        score: Math.max(0, relevanceScore)
      };
    });

    // Sort by enhanced relevance score and take top results
    return scoredMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 2); // Reduced to top 2 for more focused responses
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
    
    // Enhanced timeframe detection for "past year"
    if (timeframe.includes('past year') || timeframe.includes('last year') || timeframe.includes('previous year')) {
      return {
        ...baseFilter,
        $or: [
          { fiscalYear: '2024' },
          { fiscalYear: '2023' }
        ]
      };
    }

    return baseFilter;
  }

  async streamAnalysis(query, relevantData, intent, ticker) {
    const systemPrompt = `
You are an advanced financial and business analyst covering ${ticker}. Provide focused, actionable insights that directly answer the user's question.

Key Guidelines:
- Answer the specific question asked, don't provide general company overview
- Lead with the most important insight or trend
- Use specific numbers and percentages when available
- Keep responses under 200 words unless more detail is specifically requested
- Write in plain text without any markdown formatting
- Use simple paragraphs and natural language
- Focus on trends, changes, and implications rather than static facts
- If data is limited, acknowledge it and focus on what's available

Query Focus:
- Analysis Type: ${intent.analysis_type}
- Topics: ${intent.topics.join(', ')}
- Timeframe: ${intent.timeframe}
- Content Type: ${intent.content_type}

Response Structure:
1. Direct answer to the question (1-2 sentences)
2. Key supporting data points (2-3 bullet points)
3. Brief trend analysis or implication
`;

    const userPrompt = `
User Question: "${query}"
Company: ${ticker}
Timeframe: ${intent.timeframe}

Focus specifically on what the user is asking for. If they ask about cash flow trends, focus on cash flow metrics and trends. If they ask about financial performance, focus on key performance indicators. If they ask about competitive positioning, focus on market position and competitive advantages.

Available data:
${relevantData
  .map((d) => `[${d.metadata?.fiscalYear || 'N/A'} ${d.metadata?.quarter || 'N/A'} | ${d.metadata?.type || 'Unknown'}] ${d.metadata?.text?.substring(0, 300) || 'No text'}...`)
  .join('\n\n')}

Provide a direct, focused answer to the user's specific question. Avoid generic statements and focus on specific insights and trends.
`;

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000, // Reduced for faster response
      stream: true,
    });

    return stream;
  }
}

// ----------------------------------------------------------------
// 3. Create Pipeline
// ----------------------------------------------------------------
function createStreamingPipeline() {
  const envVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX'];
  for (const v of envVars) {
    if (!process.env[v]) throw new Error(`${v} is required`);
  }

  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);
  const baseDir = path.join(process.cwd(), 'data', 'financials');

  return new StreamingRAGPipeline(openaiClient, pineconeIndex, baseDir);
}

const streamingPipeline = createStreamingPipeline();

// ----------------------------------------------------------------
// 4. Streaming POST Handler
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

    console.log('Streaming query:', query);

    // Create a ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Add timeout to prevent very long responses
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 20000); // 20 second timeout
          });

          const processPromise = (async () => {
            // 1. Analyze query intent
            const intent = await streamingPipeline.analyzeQueryIntent(query);
            console.log('Intent:', intent);

            // 2. Detect company ticker(s)
            const isComparisonQuery = Array.isArray(intent.company_name) && intent.company_name.length > 1;
            const ticker = streamingPipeline.detectCompany(intent.company_name);
            
            console.log('Company detection:', {
              company_name: intent.company_name,
              isComparisonQuery,
              ticker,
              type: typeof intent.company_name
            });

            // 3. Retrieve relevant data
            const relevantData = await streamingPipeline.retrieveRelevantData(query, intent, ticker);
            console.log('Relevant data matches:', relevantData.length);

            // 4. Stream the analysis
            const analysisStream = await streamingPipeline.streamAnalysis(query, relevantData, intent, ticker);

            // Send initial metadata
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'metadata',
                  data_points: relevantData.length,
                  analysis_type: intent.analysis_type,
                  timeframe: intent.timeframe,
                  topics_covered: intent.topics,
                })}\n\n`
              )
            );

            // Stream the analysis content
            for await (const chunk of analysisStream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: 'content', content })}\n\n`
                  )
                );
              }
            }

            // Send end marker
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'end' })}\n\n`
              )
            );
          })();

          await Promise.race([processPromise, timeoutPromise]);

        } catch (error) {
          console.error('Streaming error:', error);
          let errorMessage = 'An error occurred while processing your query.';
          
          if (error.message === 'Request timeout') {
            errorMessage = 'The request took too long to process. Please try a more specific query.';
          } else if (error.message.includes('toLowerCase')) {
            errorMessage = 'Error processing company information. Please try rephrasing your query.';
          } else if (error.message.includes('JSON')) {
            errorMessage = 'Error parsing response. Please try a different query.';
          }
          
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'error', 
                error: errorMessage
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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
}