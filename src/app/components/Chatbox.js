// src/app/components/Chatbox.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnalysisDisplay } from './Display';   
import QueryInput from './Query';             
import WelcomeGuide from './WelcomeGuide';
import AnalysisProgress from './AnalysisProgress';
import HelpTips from './HelpTips';
import { AlertCircle, Loader2, Bot, User, Sparkles, ArrowDown, HelpCircle, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Chatbox() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isFirstQuery, setIsFirstQuery] = useState(true);
  const [analysisStage, setAnalysisStage] = useState('searching');
  const [showHelp, setShowHelp] = useState(false);
  const [generatingTableFor, setGeneratingTableFor] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  // Additional scroll effect when new responses are added
  useEffect(() => {
    if (conversationHistory.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [conversationHistory.length]);

  const handleStartAnalysis = (initialQuery = '') => {
    // setShowWelcomeGuide(false); // REMOVE: This line is no longer needed
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
              } else if (data.type === 'followup_questions') {
                // Store follow-up questions in the response
                setConversationHistory((prevHistory) =>
                  prevHistory.map((item) =>
                    item.id === responseId
                      ? {
                          ...item,
                          content: { analysis, metadata, followUpQuestions: data.questions },
                          isStreaming: true,
                        }
                      : item
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.error);
              } else if (data.type === 'end') {
                // Mark streaming as complete, but preserve followUpQuestions
                setConversationHistory((prevHistory) =>
                  prevHistory.map((item) =>
                    item.id === responseId
                      ? {
                          ...item,
                          content: { 
                            analysis, 
                            metadata,
                            followUpQuestions: item.content.followUpQuestions || []
                          },
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

  const handleFollowUpQuestion = (question) => {
    // Set the question in the input field for visual feedback
    setQuery(question);
    
    // Clear any existing errors
    if (error) setError(null);
    
    // Auto-submit the follow-up question with a small delay for better UX
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} }, question);
    }, 200);
  };

  const handleGenerateFinancialTable = async (responseId) => {
    setGeneratingTableFor(responseId);
    
    try {
      // Find the original query for this response
      const responseIndex = conversationHistory.findIndex(item => item.id === responseId);
      const originalQuery = responseIndex > 0 ? conversationHistory[responseIndex - 1].content : '';
      
      const response = await fetch('/api/chat/financial-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: responseId,
          query: originalQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate financial table');
      }

      const data = await response.json();
      
      // Update the conversation history with the financial table
      setConversationHistory((prevHistory) =>
        prevHistory.map((item) =>
          item.id === responseId
            ? {
                ...item,
                content: {
                  ...item.content,
                  metadata: {
                    ...item.content.metadata,
                    financialTable: data.financialTable
                  }
                }
              }
            : item
        )
      );
    } catch (err) {
      console.error('Error generating financial table:', err);
      setError('Failed to generate financial table. Please try again.');
    } finally {
      setGeneratingTableFor(null);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setIsFirstQuery(true);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="absolute top-0 right-0">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-800/50"
            title="Help & Tips"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4 shadow-lg">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
          Generative-AI Investment CoPilot
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Ask detailed questions about Big Tech company performance and strategies
        </p>
      </div>

      {/* Input Section - Enhanced styling */}
      <div className="bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/80 pt-6 pb-8 -mx-6 px-6 backdrop-blur-xl border-b border-gray-800/50 shadow-xl">
        <QueryInput
          value={query}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      </div>

      {/* Main Content Area */}
      <div className="pt-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl backdrop-blur-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}

        {/* Loading State with Progress */}
        {loading && (
          <div className="mb-6 animate-fadeIn">
            <AnalysisProgress stage={analysisStage} error={error} />
          </div>
        )}

        {/* Welcome State */}
        {isFirstQuery && conversationHistory.length === 0 && !loading && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-3xl mb-6 shadow-lg border border-blue-500/20">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">
              Ready to analyze
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-lg leading-relaxed">
              Start by asking about any tech company's performance, strategies, or market position. 
              Try the quick actions above for guided examples.
            </p>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="space-y-8 min-h-0 conversation-container">
            {/* Clear Conversation Button */}
            <div className="flex justify-end">
              <button
                onClick={clearConversation}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors px-3 py-1 rounded-lg hover:bg-gray-800/50"
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
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                  item.type === 'query' 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-300 border border-gray-600'
                }`}>
                  {item.type === 'query' ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`max-w-4xl ${
                  item.type === 'query' ? 'order-first' : 'order-last'
                }`}>
                  <div className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm ${
                    item.type === 'query'
                      ? 'bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30'
                      : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50'
                  }`}>
                    <div className={
                      item.type === 'query' ? 'text-blue-300' : 'text-white'
                    }>
                      {item.type === 'query' ? (
                        <div className="text-lg leading-relaxed font-medium">
                          {item.content}
                        </div>
                      ) : (
                        <AnalysisDisplay 
                          analysis={item.content} 
                          isStreaming={item.isStreaming} 
                          onQuestionClick={handleFollowUpQuestion}
                          onGenerateFinancialTable={() => handleGenerateFinancialTable(item.id)}
                          isGeneratingTable={generatingTableFor === item.id}
                        />
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
      </div>

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
        
        /* Ensure proper scrolling behavior */
        html, body {
          scroll-behavior: smooth;
        }
        
        /* Ensure content is not hidden behind fixed elements */
        .conversation-container {
          padding-bottom: 2rem;
        }
      `}</style>
    </div>
  );
}