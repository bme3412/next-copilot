// scripts/test-connections.js
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnections() {
  console.log('Testing connections...\n');

  try {
    // Test AWS Connection
    console.log('Testing AWS connection...');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ AWS Connection successful!');
    console.log('Available buckets:', buckets.Buckets.map(b => b.Name).join(', '));

    // Test Pinecone Connection
    console.log('\nTesting Pinecone connection...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexes = await pinecone.listIndexes();
    console.log('✅ Pinecone Connection successful!');
    console.log('Available indexes:', Object.keys(indexes).join(', '));

    // Test OpenAI Connection
    console.log('\nTesting OpenAI connection...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const models = await openai.models.list();
    console.log('✅ OpenAI Connection successful!');

    console.log('\nAll connections tested successfully! 🎉');
  } catch (error) {
    console.error('Error during connection test:', error);
  }
}

testConnections();