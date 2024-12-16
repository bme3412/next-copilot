import OpenAI from 'openai';
import { createSystemPrompt, createAnalysisPrompt } from './prompts';
import { processQuarterlyData } from '../data/processors/quarterlyData';
import { extractTrends } from '../data/processors/trends';
import { analyzeThematic } from '../data/processors/thematic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateAnalysis(query, rawData) {
  try {
    // Process and validate data
    const processedData = processQuarterlyData(rawData);
    
    // Prepare context
    const context = {
      availableQuarters: processedData.map(d => `FY${d.fiscal_year} Q${d.quarter}`),
      data: processedData
    };

    // Generate analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: createSystemPrompt(context)
        },
        {
          role: "user",
          content: createAnalysisPrompt(query, context)
        }
      ],
      temperature: 0.1,
      max_tokens: 2500
    });

    // Process and enhance response
    const baseAnalysis = completion.choices[0].message.content;
    const enhancedAnalysis = await enhanceAnalysis(baseAnalysis, context);

    return {
      analysis: enhancedAnalysis,
      metadata: {
        analyzed_periods: context.availableQuarters,
        data_points: countDataPoints(processedData)
      }
    };

  } catch (error) {
    console.error('Analysis generation error:', error);
    throw new Error('Failed to generate analysis');
  }
}

async function enhanceAnalysis(baseAnalysis, context) {
  // Extract trends if relevant
  const trends = await extractTrends(context.data);
  
  // Perform thematic analysis if needed
  const thematicInsights = await analyzeThematic(context.data);

  // Combine insights
  return {
    main_analysis: baseAnalysis,
    trends,
    thematic_insights: thematicInsights
  };
}

function countDataPoints(data) {
  return {
    quarters: data.length,
    segments: data.reduce((acc, q) => acc + (q.segments?.length || 0), 0),
    metrics: data.reduce((acc, q) => acc + Object.keys(q.operational_metrics || {}).length, 0)
  };
}