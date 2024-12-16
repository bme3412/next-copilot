import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from "@langchain/pinecone";
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'PINECONE_API_KEY',
  'PINECONE_INDEX',
  'OPENAI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

async function initializeVectorStore() {
  console.log('Starting vector store initialization...');
  
  try {
    // Initialize Pinecone client
    console.log('Connecting to Pinecone...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    // Get the index
    console.log('Accessing Pinecone index...');
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    // Initialize OpenAI embeddings
    console.log('Initializing OpenAI embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Create PineconeStore instance
    console.log('Setting up Pinecone store...');
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { 
        pineconeIndex: index,
        namespace: 'resume-content'
      }
    );

    console.log('Vector store initialized successfully!');
    return vectorStore;
  } catch (error) {
    console.error('Error initializing vector store:', error);
    throw error;
  }
}

initializeVectorStore().catch(error => {
  console.error('Failed to initialize vector store:', error);
  process.exit(1);
});