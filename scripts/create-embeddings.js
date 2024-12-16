import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ path: '.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TRANSCRIPTS_DIR = path.join(process.cwd(), 'data', 'transcripts');
const CHUNK_SIZE = 1000;

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

function extractTextFromQA(content) {
  const texts = [];

  // Extract executive responses
  if (content.speakers) {
    for (const [speaker, data] of Object.entries(content.speakers)) {
      // Extract individual responses
      if (data.responses) {
        data.responses.forEach(response => {
          const responseText = [
            `Speaker: ${speaker} (${data.role})`,
            `Topic: ${response.topic}`,
            `Context: ${response.context}`,
            `Response: ${response.content}`
          ].join('\n');
          texts.push(responseText);
        });
      }

      // Extract closing remarks if present
      if (data.closing_remarks) {
        texts.push(`Speaker: ${speaker} (${data.role})\nClosing Remarks: ${data.closing_remarks}`);
      }
    }
  }

  // Extract analyst questions
  if (content.analyst_questions) {
    content.analyst_questions.forEach(qa => {
      const questionText = [
        `Analyst: ${qa.analyst} (${qa.firm})`,
        `Topic: ${qa.topic}`,
        `Question: ${qa.question}`
      ].join('\n');
      texts.push(questionText);
    });
  }

  return texts;
}

function extractTextFromEarnings(content) {
  const texts = [];

  // Extract strategic initiatives
  if (content.strategic_initiatives?.length > 0) {
    texts.push('Strategic Initiatives: ' + content.strategic_initiatives.join('. '));
  }

  // Extract segment information
  if (content.segments?.length > 0) {
    content.segments.forEach(segment => {
      const segmentText = [
        `${segment.name} Segment:`,
        `Revenue: ${segment.revenue?.value} ${segment.revenue?.unit} (${segment.revenue?.context})`,
        segment.growth_yoy ? `YoY Growth: ${segment.growth_yoy}%` : '',
        segment.growth_qoq ? `QoQ Growth: ${segment.growth_qoq}%` : '',
        segment.key_points?.length > 0 ? `Key Points: ${segment.key_points.join('. ')}` : ''
      ].filter(Boolean).join(' ');
      texts.push(segmentText);
    });
  }

  // Extract CFO commentary
  if (content.cfo_commentary) {
    const cfoName = content.cfo_commentary.cfo_name;
    for (const [section, comments] of Object.entries(content.cfo_commentary)) {
      if (Array.isArray(comments)) {
        texts.push(`CFO ${cfoName} - ${section}: ${comments.join(' ')}`);
      }
    }
  }

  // Extract market opportunities
  if (content.market_opportunities?.length > 0) {
    content.market_opportunities.forEach(opportunity => {
      for (const [market, description] of Object.entries(opportunity)) {
        texts.push(`Market Opportunity - ${market}: ${description}`);
      }
    });
  }

  // Extract operational metrics
  if (content.operational_metrics) {
    const metrics = [];
    const { gross_margin, operating_margin, net_income, cash_flow } = content.operational_metrics;
    
    if (gross_margin) metrics.push(`Gross Margin: ${gross_margin.value}${gross_margin.unit} (${gross_margin.context})`);
    if (operating_margin) metrics.push(`Operating Margin: ${operating_margin.value}${operating_margin.unit} (${operating_margin.context})`);
    if (net_income) metrics.push(`Net Income: ${net_income.value} ${net_income.unit} (${net_income.context})`);
    if (cash_flow) metrics.push(`Cash Flow: ${cash_flow.value} ${cash_flow.unit} (${cash_flow.context})`);
    
    if (metrics.length > 0) {
      texts.push(`Operational Metrics: ${metrics.join('. ')}`);
    }
  }

  return texts;
}

function createChunks(text, maxLength = CHUNK_SIZE) {
  if (!text || typeof text !== 'string') return [];
  
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

async function processFile(filePath, company) {
  try {
    const content = await readJsonFile(filePath);
    if (!content) return [];

    const pathParts = filePath.split(path.sep);
    const fiscalYear = pathParts.find(part => part.startsWith('FY_'));
    const quarter = pathParts.find(part => part.startsWith('Q'));
    const fileType = filePath.includes('_qa.json') ? 'qa' : 'earnings';

    const textSections = fileType === 'qa' 
      ? extractTextFromQA(content)
      : extractTextFromEarnings(content);

    console.log(`Extracted ${textSections.length} sections from ${filePath}`);
    const vectors = [];

    for (let sectionIndex = 0; sectionIndex < textSections.length; sectionIndex++) {
      const chunks = createChunks(textSections[sectionIndex]);
      console.log(`Created ${chunks.length} chunks from section ${sectionIndex + 1}`);

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const embedding = await openai.embeddings.create({
          input: chunk,
          model: "text-embedding-3-small"
        });

        vectors.push({
          id: `${company}_${fiscalYear}_${quarter}_${fileType}_${sectionIndex}_${chunkIndex}`,
          values: embedding.data[0].embedding,
          metadata: {
            text: chunk,
            company,
            fiscalYear: fiscalYear?.replace('FY_', ''),
            quarter: quarter?.replace('Q', ''),
            type: fileType,
            section: sectionIndex,
            chunk_index: chunkIndex,
            source: path.basename(filePath)
          }
        });
      }
    }

    return vectors;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

async function upsertVectors(index, vectors, batchSize = 100) {
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
  }
}

async function createEarningsEmbeddings() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index('clarity');
    const companies = (await fs.readdir(TRANSCRIPTS_DIR)).filter(file => !file.startsWith('.'));
    
    let totalVectors = 0;

    for (const company of companies) {
      const companyDir = path.join(TRANSCRIPTS_DIR, company);
      const stats = await fs.stat(companyDir);
      if (!stats.isDirectory()) continue;

      console.log(`\nProcessing ${company}...`);
      const jsonFiles = await getJsonFiles(companyDir);
      console.log(`Found ${jsonFiles.length} files`);

      for (const filePath of jsonFiles) {
        console.log(`\nProcessing ${filePath}`);
        const vectors = await processFile(filePath, company);
        if (vectors.length > 0) {
          await upsertVectors(index, vectors);
          totalVectors += vectors.length;
          console.log(`Created ${vectors.length} vectors from ${filePath}`);
        }
      }
    }

    console.log(`\nAll done! Created ${totalVectors} vectors total`);
  } catch (error) {
    console.error('Error creating embeddings:', error);
    throw error;
  }
}

async function getJsonFiles(dirPath) {
  const files = await fs.readdir(dirPath);
  const jsonFiles = [];

  for (const file of files) {
    if (file.startsWith('.')) continue;
    
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      jsonFiles.push(...(await getJsonFiles(filePath)));
    } else if (file.endsWith('_qa.json') || file.endsWith('_earnings.json')) {
      jsonFiles.push(filePath);
    }
  }

  return jsonFiles;
}

createEarningsEmbeddings();