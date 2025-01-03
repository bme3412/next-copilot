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

// ======================== //
// 1) Generic JSON Walker   //
// ======================== //
function extractAllTextRecursively(obj, prefix = '', texts = []) {
  // If it's an array, iterate each element
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractAllTextRecursively(item, `${prefix}[${index}]`, texts);
    });
  }
  // If it's an object, iterate each key
  else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        extractAllTextRecursively(value, prefix ? `${prefix}.${key}` : key, texts);
      } else {
        const stringValue = value === null ? 'null' : String(value);
        texts.push(`${prefix ? prefix + '.' + key : key}: ${stringValue}`);
      }
    }
  } 
  // Otherwise, it's a primitive
  else {
    texts.push(`${prefix}: ${obj}`);
  }
  return texts;
}

// ======================== //
// 2) QA Extraction         //
// ======================== //
function extractTextFromQA(content) {
  // Keep your existing logic. No changes needed.
  const texts = [];
  if (content.speakers) {
    for (const [speaker, data] of Object.entries(content.speakers)) {
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
      if (data.closing_remarks) {
        texts.push(`Speaker: ${speaker} (${data.role})\nClosing Remarks: ${data.closing_remarks}`);
      }
    }
  }
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

// ======================== //
// 3) Earnings Extraction   //
// ======================== //
function extractTextFromEarnings(content) {
  if (!content) return [];
  // Simply walk through all data
  return extractAllTextRecursively(content, 'earnings');
}

// ======================== //
// 4) Create Chunks         //
// ======================== //
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

// ======================== //
// 5) Process File          //
// ======================== //
async function processFile(filePath, company) {
  try {
    const content = await readJsonFile(filePath);
    if (!content) return [];

    const pathParts = filePath.split(path.sep);
    const fiscalYear = pathParts.find(part => part.startsWith('FY_'));
    const quarter = pathParts.find(part => part.startsWith('Q'));
    const fileType = filePath.includes('_qa.json') ? 'qa' : 'earnings';

    // Choose QA vs. earnings
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

// ======================== //
// 6) Upsert                //
// ======================== //
async function upsertVectors(index, vectors, batchSize = 100) {
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
  }
}

// ======================== //
// 7) Main Script           //
// ======================== //
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
