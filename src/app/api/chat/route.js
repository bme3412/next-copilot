import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Base classes for modular components
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

// Implementation classes
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

class PineconeRetriever extends BaseRetriever {
  constructor(pineconeIndex) {
    super();
    this.index = pineconeIndex;
  }

  async retrieve(vector, options = {}) {
    const { topK = 8, filters = {} } = options;  // Increased topK for more context

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

class QueryIntentAnalyzer {
  analyze(query) {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Enhanced topic detection
      let topics = [];
      let analysis_type = 'general';
      
      // AI and Technology
      if (lowerQuery.includes('ai') || 
          lowerQuery.includes('artificial intelligence') ||
          lowerQuery.includes('machine learning') ||
          lowerQuery.includes('deep learning') ||
          lowerQuery.includes('neural') ||
          lowerQuery.includes('model')) {
        topics.push('ai');
        analysis_type = 'technology';
      }
      
      // Financial Performance
      if (lowerQuery.includes('revenue') || 
          lowerQuery.includes('sales') ||
          lowerQuery.includes('margin') ||
          lowerQuery.includes('profit') ||
          lowerQuery.includes('earnings')) {
        topics.push('financial');
        analysis_type = 'financial';
      }
      
      // Market and Competition
      if (lowerQuery.includes('market') || 
          lowerQuery.includes('compet') ||
          lowerQuery.includes('industry') ||
          lowerQuery.includes('landscape')) {
        topics.push('market');
        analysis_type = 'market';
      }
      
      // Strategy and Future
      if (lowerQuery.includes('strategy') || 
          lowerQuery.includes('plan') ||
          lowerQuery.includes('future') ||
          lowerQuery.includes('outlook')) {
        topics.push('strategy');
        analysis_type = 'strategic';
      }

      // If no specific topics detected, use general
      if (topics.length === 0) {
        topics = ['general'];
      }

      console.log('Analyzed query intent:', { topics, analysis_type });

      return {
        topics,
        analysis_type,
        focus_areas: this.getFocusAreas(analysis_type),
        timeframe: this.getTimeframe(lowerQuery),
        query_context: query
      };
    } catch (error) {
      console.error('Query intent analysis error:', error);
      throw new Error(`Query intent analysis failed: ${error.message}`);
    }
  }

  getFocusAreas(analysis_type) {
    const focusAreas = {
      technology: ['technological advancement', 'product development', 'research initiatives', 'implementation examples'],
      financial: ['revenue growth', 'margin trends', 'segment performance', 'future guidance'],
      market: ['competitive position', 'market share', 'industry trends', 'customer adoption'],
      strategic: ['long-term vision', 'strategic initiatives', 'growth opportunities', 'risk management'],
      general: ['quarterly performance', 'market trends', 'future outlook', 'key developments']
    };
    return focusAreas[analysis_type] || focusAreas.general;
  }

  getTimeframe(query) {
    if (query.includes('recent') || 
        query.includes('latest') || 
        query.includes('current')) {
      return 'recent';
    }
    if (query.includes('future') || 
        query.includes('upcoming') || 
        query.includes('next')) {
      return 'future';
    }
    if (query.includes('history') || 
        query.includes('past') || 
        query.includes('previous')) {
      return 'historical';
    }
    return 'all';
  }
}

class GPT4Analyzer extends BaseAnalyzer {
  constructor(openai) {
    super();
    this.openai = openai;
  }

  normalizeChronologicalData(data) {
    return data.map(item => {
      // Normalize quarter format
      const quarterMatch = item.metadata?.quarter?.match(/Q?(\d)/i);
      const quarter = quarterMatch ? `Q${quarterMatch[1]}` : item.metadata?.quarter;
      
      // Normalize fiscal year format
      const yearMatch = item.metadata?.fiscalYear?.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : item.metadata?.fiscalYear;
      
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

  extractRelevantData(matches, queryIntent) {
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
      const relevantData = this.extractRelevantData(normalizedData, queryIntent);
      
      if (!relevantData.length) {
        console.log('No relevant data found for analysis');
        return this.generateEmptyResponse(queryIntent);
      }

      const systemPrompt = `You are a financial analyst specializing in ${companyName}'s earnings transcripts. 
Analyze the provided data and return a response focusing on ${queryIntent.topics.join(', ')}.
Your analysis should:
1. Be thorough but concise
2. Focus on concrete developments and specific statements
3. Include exact dates and quarters when discussing trends
4. Connect executive statements with actual developments
5. Highlight quantitative metrics when available
6. Organize information chronologically
7. Write in clear, professional prose with no bullet points or sections

The response should be a single coherent analysis in plain text format, focusing on how trends and developments have evolved over time.`;

      const userPrompt = `Analyze how ${queryIntent.query_context}
Focus areas to address: ${queryIntent.focus_areas.join(', ')}

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

class RAGPipeline {
  constructor(embedder, retriever, analyzer, queryIntentAnalyzer) {
    this.embedder = embedder;
    this.retriever = retriever;
    this.analyzer = analyzer;
    this.queryIntentAnalyzer = queryIntentAnalyzer;
  }

  async process(query) {
    try {
      console.log('Processing query:', query);
      
      const companyName = this.detectCompanyFromQuery(query);
      console.log('Detected company:', companyName);

      const queryIntent = this.queryIntentAnalyzer.analyze(query);
      console.log('Query intent:', queryIntent);
      
      const embedding = await this.embedder.embed(query);
      console.log('Generated embedding');
      
      // Use 'company' as the filter field
      let companyValue;
      switch (companyName) {
        case 'Apple':
          companyValue = 'AAPL';
          break;
        case 'NVIDIA':
          companyValue = 'NVDA';
          break;
        case 'Meta':
          companyValue = 'META'; // Added Meta/Facebook support
          break;
        default:
          companyValue = 'NVDA'; // Default to NVIDIA if unspecified
      }

      const retrievalResults = await this.retriever.retrieve(embedding, { filters: { company: companyValue } });
      console.log('Retrieved documents:', retrievalResults.matches?.length || 0);
      
      if (!retrievalResults.matches?.length) {
        console.log('No matches found');
        return this.generateEmptyResponse(queryIntent);
      }

      return await this.analyzer.analyze(retrievalResults.matches, queryIntent, companyName);
    } catch (error) {
      console.error('Pipeline processing error:', error);
      throw error;
    }
  }

  detectCompanyFromQuery(query) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('apple') || lowerQuery.includes('aapl')) {
      return 'Apple';
    } else if (lowerQuery.includes('nvidia') || lowerQuery.includes('nvda')) {
      return 'NVIDIA';
    } else if (lowerQuery.includes('meta') || lowerQuery.includes('facebook') || lowerQuery.includes('fb') || lowerQuery.includes('META')) {
      return 'Meta'; // Added detection for Meta/Facebook
    } else {
      // Default to NVIDIA if none found
      return 'NVIDIA';
    }
  }

  generateEmptyResponse(queryIntent) {
    return {
      chronological_summary: {
        quarterly_progression: [{
          period: "No Data Found",
          key_metrics: {},
          highlights: ["No relevant transcript data found for the specified query."],
          executive_perspective: []
        }],
        trend_analysis: {
          sequential_changes: [],
          year_over_year: []
        }
      },
      thematic_insights: {
        ai_and_compute: {
          key_developments: [],
          customer_success: [],
          market_implications: ""
        },
        financial_metrics: {
          revenue: [],
          margins: [],
          segment_analysis: {}
        },
        strategy: {
          current_priorities: [],
          future_direction: [],
          investment_areas: []
        }
      },
      market_context: {
        competitive_advantages: [],
        challenges: [],
        opportunities: []
      },
      metadata: {
        time_periods: [],
        query_type: queryIntent.analysis_type,
        data_points: 0,
        topics_covered: []
      }
    };
  }
}

// Initialize dependencies and pipeline
const createPipeline = () => {
  try {
    // Validate environment variables
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
      new QueryIntentAnalyzer()
    );
  } catch (error) {
    console.error('Failed to create pipeline:', error);
    throw error;
  }
};

const pipeline = createPipeline();

// API Route handler
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
          chronological_summary: {
            quarterly_progression: [{
              period: "Database Query Error",
              key_metrics: {},
              highlights: ["There was an error querying the transcript database. Please try again."],
              executive_perspective: []
            }],
            trend_analysis: {
              sequential_changes: [],
              year_over_year: []
            }
          },
          thematic_insights: {
            ai_and_compute: {
              key_developments: [],
              customer_success: [],
              market_implications: ""
            },
            financial_metrics: {
              revenue: [],
              margins: [],
              segment_analysis: {}
            },
            strategy: {
              current_priorities: [],
              future_direction: [],
              investment_areas: []
            }
          },
          market_context: {
            competitive_advantages: [],
            challenges: [],
            opportunities: []
          },
          metadata: {
            error: error.message,
            query_type: 'error'
          }
        }, { status: 500 });
      }
      
      return NextResponse.json({
        chronological_summary: {
          quarterly_progression: [{
            period: "Analysis Error",
            key_metrics: {},
            highlights: ["An error occurred while processing your query. Please try again."],
            executive_perspective: []
          }],
          trend_analysis: {
            sequential_changes: [],
            year_over_year: []
          }
        },
        thematic_insights: {
          ai_and_compute: {
            key_developments: [],
            customer_success: [],
            market_implications: ""
          },
          financial_metrics: {
            revenue: [],
            margins: [],
            segment_analysis: {}
          },
          strategy: {
            current_priorities: [],
            future_direction: [],
            investment_areas: []
          }
        },
        market_context: {
          competitive_advantages: [],
          challenges: [],
          opportunities: []
        },
        metadata: {
          error: error.message,
          query_type: 'error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({
      chronological_summary: {
        quarterly_progression: [{
          period: "Request Error",
          key_metrics: {},
          highlights: ["Failed to process the request. Please ensure your query is properly formatted."],
          executive_perspective: []
        }],
        trend_analysis: {
          sequential_changes: [],
          year_over_year: []
        }
      },
      thematic_insights: {
        ai_and_compute: {
          key_developments: [],
          customer_success: [],
          market_implications: ""
        },
        financial_metrics: {
          revenue: [],
          margins: [],
          segment_analysis: {}
        },
        strategy: {
          current_priorities: [],
          future_direction: [],
          investment_areas: []
        }
      },
      market_context: {
        competitive_advantages: [],
        challenges: [],
        opportunities: []
      },
      metadata: {
        error: error.message,
        query_type: 'error'
      }
    }, { status: 400 });
  }
};
