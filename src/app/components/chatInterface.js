// ChatInterface.js
'use client';

import { useState } from 'react';
import { AnalysisDisplay } from './AnalysisDisplay';
import QueryInput from './QueryInput';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ChatInterface() {
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
          history: conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed. Please try again.');
      }

      const result = await response.json();
      
      // Update conversation history with new entry
      setConversationHistory(prev => [...prev, {
        type: 'query',
        content: query,
        timestamp: new Date().toISOString()
      }, {
        type: 'response',
        content: result,
        timestamp: new Date().toISOString()
      }]);
      
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
          Tech Investment Analysis
        </h1>
        <p className="text-gray-400">
          Ask detailed questions about major tech companies' performance and strategies
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
        {conversationHistory.map((item, index) => (
          <div
            key={item.timestamp}
            className={`p-4 rounded-xl ${
              item.type === 'query'
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'bg-gray-800/50'
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">
              {item.type === 'query' ? 'Your Question:' : 'Analysis:'}
            </div>
            <div className={item.type === 'query' ? 'text-blue-400' : 'text-white'}>
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}