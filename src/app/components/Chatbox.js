// src/app/components/Chatbox.js
'use client';

import React, { useState } from 'react';
import { AnalysisDisplay } from './Display';   
import QueryInput from './Query';             
import { AlertCircle, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Import UUID

export default function Chatbox() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          // history: conversationHistory // Remove or uncomment if needed
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed. Please try again.');
      }

      const result = await response.json();

      // Generate unique IDs for each message
      const queryId = uuidv4();
      const responseId = uuidv4();

      setConversationHistory((prevHistory) => [
        ...prevHistory,
        {
          id: queryId,
          type: 'query',
          content: query,
          timestamp: new Date().toISOString(),
        },
        {
          id: responseId,
          type: 'response',
          content: result,
          timestamp: new Date().toISOString(),
        },
      ]);

      setQuery('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Generative-AI Investment CoPilot
        </h1>
        <p className="text-gray-400">
          Ask detailed questions about Big Tech company performance and strategies
        </p>
      </div>

      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-900 to-gray-900/95 pt-4 pb-6 -mx-6 px-6">
        <QueryInput
          value={query}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-6 text-center text-gray-400 animate-fadeIn">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing your query...</span>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {conversationHistory.map((item) => (
          <div
            key={item.id} // Use unique UUID as key
            className={`p-4 rounded-xl ${
              item.type === 'query'
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'bg-gray-800/50'
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">
              {item.type === 'query' ? 'Your Question:' : 'Analysis:'}
            </div>
            <div
              className={
                item.type === 'query' ? 'text-blue-400' : 'text-white'
              }
            >
              {item.type === 'query' ? (
                item.content
              ) : (
                <AnalysisDisplay analysis={item.content} />
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}