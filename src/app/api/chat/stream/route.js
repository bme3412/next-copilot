// src/app/api/chat/stream/route.js

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import { FinancialDataProcessor } from '../../../../utils/financialDataProcessor.js';

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
    this.financialProcessor = new FinancialDataProcessor(path.join(process.cwd(), 'data', 'financials'));
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
      topK: isComparisonQuery ? 16 : 12, // Increased for more comprehensive results
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

    // Enhanced timeframe context - prioritize recent data
    if (enhancedQuery.includes('2024') || enhancedQuery.includes('recent') || enhancedQuery.includes('latest')) {
      enhancedQuery += ' fiscal year 2024 2023 2022 2021 2020 quarterly earnings call recent data';
    } else if (enhancedQuery.includes('past year') || enhancedQuery.includes('last year')) {
      enhancedQuery += ' fiscal year 2024 2023 2022 quarterly earnings call';
    } else if (enhancedQuery.includes('quarter') || enhancedQuery.includes('Q')) {
      enhancedQuery += ' quarterly earnings call fiscal year 2024 2023 2022 2021 2020';
    } else {
      // Default to include all available years for comprehensive coverage
      enhancedQuery += ' fiscal year 2024 2023 2022 2021 2020 quarterly earnings call comprehensive data';
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
      
      // Boost recent data (2024, 2023) for better relevance
      if (text.includes('2024') || text.includes('FY2024')) {
        relevanceScore += 0.4;
      } else if (text.includes('2023') || text.includes('FY2023')) {
        relevanceScore += 0.3;
      } else if (text.includes('2022') || text.includes('FY2022')) {
        relevanceScore += 0.25;
      } else if (text.includes('2021') || text.includes('FY2021')) {
        relevanceScore += 0.2;
      } else if (text.includes('2020') || text.includes('FY2020')) {
        relevanceScore += 0.15;
      }
      
      // Boost data from different quarters for better coverage
      if (text.includes('Q1') || text.includes('Q2') || text.includes('Q3') || text.includes('Q4')) {
        relevanceScore += 0.15;
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
      .slice(0, 10); // Increased to top 10 for more comprehensive citations
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

  async generateFinancialCharts(query, ticker) {
    try {
      // Determine what charts to generate based on query content
      const queryLower = query.toLowerCase();
      const charts = [];

      // Revenue trend chart
      if (queryLower.includes('revenue') || queryLower.includes('growth') || queryLower.includes('performance')) {
        const revenueData = await this.financialProcessor.getTimeSeriesData(ticker, ['revenue', 'netIncome'], 8);
        if (revenueData.labels.length > 0) {
          charts.push({
            type: 'revenue',
            title: `${ticker} Revenue & Net Income Trend`,
            config: this.financialProcessor.generateChartConfig(revenueData, 'line', `${ticker} Financial Performance`)
          });
        }
      }

      // Margin analysis chart
      if (queryLower.includes('margin') || queryLower.includes('profitability')) {
        const marginData = await this.financialProcessor.getTimeSeriesData(ticker, ['grossMargin', 'operatingMargin'], 8);
        if (marginData.labels.length > 0) {
          charts.push({
            type: 'margins',
            title: `${ticker} Margin Analysis`,
            config: this.financialProcessor.generateChartConfig(marginData, 'line', `${ticker} Margin Trends`)
          });
        }
      }

      // Cash flow chart
      if (queryLower.includes('cash') || queryLower.includes('flow')) {
        const cashFlowData = await this.financialProcessor.getTimeSeriesData(ticker, ['operatingCashFlow', 'freeCashFlow'], 8);
        if (cashFlowData.labels.length > 0) {
          charts.push({
            type: 'cashFlow',
            title: `${ticker} Cash Flow Analysis`,
            config: this.financialProcessor.generateChartConfig(cashFlowData, 'line', `${ticker} Cash Flow Trends`)
          });
        }
      }

      // Segment breakdown (pie chart) for most recent quarter
      if (queryLower.includes('segment') || queryLower.includes('business') || queryLower.includes('breakdown')) {
        const latestData = await this.financialProcessor.getSegmentData(ticker, '2024', '1');
        if (latestData) {
          charts.push({
            type: 'segments',
            title: `${ticker} Revenue by Segment`,
            config: {
              type: 'pie',
              data: latestData,
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: `${ticker} Revenue Breakdown`,
                    font: { size: 16, weight: 'bold' }
                  },
                  legend: {
                    display: true,
                    position: 'right'
                  }
                }
              }
            }
          });
        }
      }

      return charts;
    } catch (error) {
      console.error('Error generating financial charts:', error);
      return [];
    }
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
- ALWAYS cite your sources using the provided citation format

Query Focus:
- Analysis Type: ${intent.analysis_type}
- Topics: ${intent.topics.join(', ')}
- Timeframe: ${intent.timeframe}
- Content Type: ${intent.content_type}

Response Structure:
1. Direct answer to the question (1-2 sentences)
2. Key supporting data points with citations (5-8 bullet points for comprehensive coverage)
   - Present information in CHRONOLOGICAL ORDER (earliest to latest)
   - Include data from multiple quarters and years for complete coverage
   - Group related data points by time period
   - Maintain logical flow from past to present
   - Ensure coverage spans multiple years and quarters
3. Brief trend analysis or implication
4. Citations section at the end listing all sources used

Citation Format: When referencing data, use [Source: Company FY20XX QX] format. Include multiple citations when available to provide comprehensive coverage.

IMPORTANT: Always present historical information in chronological order, starting with the earliest events and progressing to the most recent. Ensure coverage includes multiple quarters and years, not just Q1 data.
`;

    // Format data with proper metadata for citations
    const formattedData = relevantData.map((d, index) => {
      const metadata = d.metadata || {};
      const source = metadata.fiscalYear && metadata.quarter 
        ? `${ticker} FY${metadata.fiscalYear} Q${metadata.quarter}`
        : metadata.fiscalYear 
        ? `${ticker} FY${metadata.fiscalYear}`
        : metadata.type === 'earnings' 
        ? `${ticker} Earnings Call`
        : `${ticker} Financial Data`;
      
      return {
        index: index + 1,
        source: source,
        metadata: metadata,
        text: metadata.text?.substring(0, 300) || 'No text available'
      };
    });

    const userPrompt = `
User Question: "${query}"
Company: ${ticker}
Timeframe: ${intent.timeframe}

Focus specifically on what the user is asking for. If they ask about cash flow trends, focus on cash flow metrics and trends. If they ask about financial performance, focus on key performance indicators. If they ask about competitive positioning, focus on market position and competitive advantages.

Available data with citations:
${formattedData
  .map((d) => `[${d.index}] [Source: ${d.source}] ${d.text}...`)
  .join('\n\n')}

IMPORTANT: When referencing any data or information, you MUST cite the source using the format [Source: Company FY20XX QX]. Include a "Citations:" section at the end listing all sources used.

CRITICAL: Present all historical information in CHRONOLOGICAL ORDER (earliest to latest). Do not jump between time periods randomly. Group related data points by time period and maintain a logical flow from past to present.

IMPORTANT: Provide comprehensive coverage by including data from multiple quarters and years, not just Q1 data. Ensure the analysis spans multiple time periods to show complete trends.

CRITICAL: Fill any data gaps by including data from all available years (2020, 2021, 2022, 2023, 2024) to show a complete chronological progression. Do not skip years or create gaps in the timeline.

Provide a direct, focused answer to the user's specific question. Avoid generic statements and focus on specific insights and trends. Always cite your sources and maintain chronological order with comprehensive quarter and year coverage.
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

            // 4. Generate financial charts
            const charts = await streamingPipeline.generateFinancialCharts(query, ticker);
            console.log('Generated charts:', charts.length);

            // 5. Stream the analysis
            const analysisStream = await streamingPipeline.streamAnalysis(query, relevantData, intent, ticker);

            // Send initial metadata with citation info
            const citationSources = relevantData.map((d, index) => {
              const metadata = d.metadata || {};
              const source = metadata.fiscalYear && metadata.quarter 
                ? `${ticker} FY${metadata.fiscalYear} Q${metadata.quarter}`
                : metadata.fiscalYear 
                ? `${ticker} FY${metadata.fiscalYear}`
                : metadata.type === 'earnings' 
                ? `${ticker} Earnings Call`
                : `${ticker} Financial Data`;
              
              return {
                index: index + 1,
                source: source,
                fiscalYear: metadata.fiscalYear,
                quarter: metadata.quarter,
                type: metadata.type
              };
            });

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'metadata',
                  data_points: relevantData.length,
                  analysis_type: intent.analysis_type,
                  timeframe: intent.timeframe,
                  topics_covered: intent.topics,
                  citations: citationSources,
                  charts: charts
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