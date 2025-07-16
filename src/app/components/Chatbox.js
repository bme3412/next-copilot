// src/app/components/Chatbox.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnalysisDisplay } from './Display';   
import QueryInput from './Query';             
import WelcomeGuide from './WelcomeGuide';
import AnalysisProgress from './AnalysisProgress';
import HelpTips from './HelpTips';
import { AlertCircle, Loader2, Bot, User, Sparkles, ArrowDown, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Chatbox() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isFirstQuery, setIsFirstQuery] = useState(true);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);
  const [analysisStage, setAnalysisStage] = useState('searching');
  const [showHelp, setShowHelp] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const handleStartAnalysis = (initialQuery = '') => {
    setShowWelcomeGuide(false);
    if (initialQuery) {
      setQuery(initialQuery);
      // Auto-submit the query after a short delay
      setTimeout(() => {
        handleSubmit({ preventDefault: () => {} }, initialQuery);
      }, 500);
    }
  };

  async function handleSubmit(e, customQuery = null) {
    e.preventDefault();
    const queryToSubmit = customQuery || query;
    if (!queryToSubmit.trim()) return;

    setLoading(true);
    setError(null);
    setIsFirstQuery(false);
    setAnalysisStage('searching');

    // Generate unique IDs for each message
    const queryId = uuidv4();
    const responseId = uuidv4();

    // Add query to conversation history immediately
    setConversationHistory((prevHistory) => [
      ...prevHistory,
      {
        id: queryId,
        type: 'query',
        content: queryToSubmit,
        timestamp: new Date().toISOString(),
      },
      {
        id: responseId,
        type: 'response',
        content: { analysis: '', metadata: {} },
        timestamp: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    try {
      // Simulate progress stages
      setTimeout(() => setAnalysisStage('processing'), 1000);
      setTimeout(() => setAnalysisStage('generating'), 2000);

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryToSubmit,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed. Please try again.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let analysis = '';
      let metadata = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'metadata') {
                metadata = data;
              } else if (data.type === 'content') {
                analysis += data.content;
                
                // Update the streaming response in real-time
                setConversationHistory((prevHistory) =>
                  prevHistory.map((item) =>
                    item.id === responseId
                      ? {
                          ...item,
                          content: { analysis, metadata },
                          isStreaming: true,
                        }
                      : item
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.error);
              } else if (data.type === 'end') {
                // Mark streaming as complete
                setConversationHistory((prevHistory) =>
                  prevHistory.map((item) =>
                    item.id === responseId
                      ? {
                          ...item,
                          content: { analysis, metadata },
                          isStreaming: false,
                        }
                      : item
                  )
                );
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }

      setQuery('');
    } catch (err) {
      setError(err.message);
      // Remove the failed response from conversation history
      setConversationHistory((prevHistory) =>
        prevHistory.filter((item) => item.id !== responseId)
      );
    } finally {
      setLoading(false);
      setAnalysisStage('searching');
    }
  }

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    if (error) setError(null);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setIsFirstQuery(true);
    setError(null);
  };

  // Show welcome guide for first-time users
  if (showWelcomeGuide) {
    return <WelcomeGuide onStartAnalysis={handleStartAnalysis} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="absolute top-0 right-0">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
            title="Help & Tips"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Generative-AI Investment CoPilot
        </h1>
        <p className="text-gray-400">
          Ask detailed questions about Big Tech company performance and strategies
        </p>
      </div>

      {/* Input Section - Sticky */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-900 to-gray-900/95 pt-4 pb-6 -mx-6 px-6">
        <QueryInput
          value={query}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      {/* Loading State with Progress */}
      {loading && (
        <div className="mt-6 animate-fadeIn">
          <AnalysisProgress stage={analysisStage} error={error} />
        </div>
      )}

      {/* Welcome State */}
      {isFirstQuery && conversationHistory.length === 0 && !loading && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Ready to analyze
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Start by asking about any tech company's performance, strategies, or market position. 
            Try the quick actions above for guided examples.
          </p>
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="mt-8 space-y-6">
          {/* Clear Conversation Button */}
          <div className="flex justify-end">
            <button
              onClick={clearConversation}
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Clear conversation
            </button>
          </div>

          {/* Messages */}
          {conversationHistory.map((item) => (
            <div
              key={item.id}
              className={`flex gap-4 ${
                item.type === 'query' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                item.type === 'query' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {item.type === 'query' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Content */}
              <div className={`max-w-3xl ${
                item.type === 'query' ? 'order-first' : 'order-last'
              }`}>
                <div className={`p-4 rounded-xl ${
                  item.type === 'query'
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'bg-gray-800/50 border border-gray-700'
                }`}>
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    {item.type === 'query' ? 'Your Question' : 'Analysis'}
                    {item.isStreaming && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs">Streaming...</span>
                      </div>
                    )}
                  </div>
                  <div className={
                    item.type === 'query' ? 'text-blue-400' : 'text-white'
                  }>
                    {item.type === 'query' ? (
                      item.content
                    ) : (
                      <AnalysisDisplay analysis={item.content} isStreaming={item.isStreaming} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scroll to bottom indicator */}
      <div ref={messagesEndRef} />

      {/* Help Modal */}
      <HelpTips isVisible={showHelp} onClose={() => setShowHelp(false)} />

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