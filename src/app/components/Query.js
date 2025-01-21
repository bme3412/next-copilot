import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Search, TrendingUp, Cpu, DollarSign } from 'lucide-react';

const QUESTION_CATEGORIES = [
  {
    title: "Financial Performance",
    icon: <DollarSign className="w-4 h-4" />,
    questions: [
      "Can you describe Nvidia's financial performance during FY 2023?",
      "Provide in-depth analysis of GOOGL`s FY 2024 financial performance and position in the tech industry, focusing on profit margins, growth metrics, market size, and competitive positioning",
      "Show me Apple's cash flow trends over the past year",
      "What's Microsoft's revenue breakdown by segment in Q1 2024?",
    ]
  },
  {
    title: "AI & Technology",
    icon: <Cpu className="w-4 h-4" />,
    questions: [
      "What are NVIDIA's main AI initiatives and how has this evolved over time?",
      "Please describe Microsoft's partnership with OpenAI, and how is Microsoft implementing AI across products?",
      "Explain Google's AI strategy and investments and how does this compare vs Microsoft?",
      "Please describe CRM's AI capabilities and what role do agents play?",
    ]
  },
  {
    title: "Market Analysis",
    icon: <TrendingUp className="w-4 h-4" />,
    questions: [
      "How has NVIDIA's market share evolved?",
      "Compare Apple's competitive position in smartphones",
      "What are the key market trends affecting Amazon?",
      "Analyze Microsoft's cloud market position and how does this compare to AMZN AWS?",
    ]
  }
];

const QueryInput = ({ value, onChange, onSubmit, disabled }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const componentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setExpandedCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleQuestionClick = (question) => {
    onChange({ target: { value: question } });
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full" ref={componentRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-6 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <textarea
              value={value}
              onChange={onChange}
              disabled={disabled}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ask about any tech company's performance, or click for sample questions..."
              rows="3"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 text-white placeholder-gray-400 border border-gray-700 rounded-xl 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                disabled:opacity-50 transition-all backdrop-blur-sm resize-none"
              style={{ minHeight: '100px' }}
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="px-4 py-3 h-12 self-start mt-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg
              hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 ease-in-out font-medium shadow-lg shadow-blue-500/20
              hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]
              flex items-center gap-2 text-sm"
          >
            {disabled ? (
              <>
                <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze
              </>
            )}
          </button>
        </div>

        {showSuggestions && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            {QUESTION_CATEGORIES.map((category, index) => (
              <div key={index} className="border-b border-gray-700 last:border-none">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2 text-blue-400">
                    {category.icon}
                    <span className="font-medium">{category.title}</span>
                  </div>
                  {expandedCategory === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {expandedCategory === index && (
                  <div className="px-4 py-2 space-y-2">
                    {category.questions.map((question, qIndex) => (
                      <button
                        key={qIndex}
                        type="button"
                        onClick={() => handleQuestionClick(question)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </form>
      
      <div className="mt-4 text-sm text-gray-400 px-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span>
          <span className="font-medium text-blue-400">Pro tip:</span> You can ask about any major tech company - 
          try questions about quarterly results, AI strategies, market trends, or competitive analysis, etc...
        </span>
      </div>
    </div>
  );
};

export default QueryInput;