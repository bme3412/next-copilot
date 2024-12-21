'use client';

import React from 'react';
import Link from 'next/link';

const companies = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Consumer electronics, software, and services',
    dataRange: '2019-2024',
    transcripts: '24 quarterly earnings calls'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    description: 'Internet services and products',
    dataRange: '2019-2024',
    transcripts: '23 quarterly earnings calls'
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    description: 'Social media and technology',
    dataRange: '2019-2024',
    transcripts: '23 quarterly earnings calls'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Software, cloud computing, and technology',
    dataRange: '2019-2024',
    transcripts: '24 quarterly earnings calls'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    description: 'Graphics and AI computing',
    dataRange: '2019-2025',
    transcripts: '27 quarterly earnings calls'
  }
];

const ViewCompaniesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 mb-4">
            Company Analysis Coverage
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Explore detailed earnings call transcripts and financial analysis for leading tech companies
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div 
              key={company.symbol} 
              className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="mb-4">
                <h2 className="text-2xl text-blue-400 font-semibold">
                  {company.symbol} - {company.name}
                </h2>
                <p className="text-gray-400 mt-1">
                  {company.description}
                </p>
              </div>
              
              <div className="space-y-2 text-gray-300">
                <p>Data Range: {company.dataRange}</p>
                <p>Available Data: {company.transcripts}</p>
                <Link 
                  href={`/company/${company.symbol.toLowerCase()}`}
                  className="inline-block mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all"
                >
                  View Analysis →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewCompaniesPage;