import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Sparkles, Search, TrendingUp, Cpu, DollarSign, Lightbulb, Zap } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    icon: <DollarSign className="w-4 h-4" />,
    text: "Financial Performance",
    examples: [
      "Apple's revenue growth in 2024",
      "Microsoft's profit margins",
      "Nvidia's cash flow trends"
    ]
  },
  {
    icon: <Cpu className="w-4 h-4" />,
    text: "AI & Technology",
    examples: [
      "Google's AI strategy",
      "Microsoft's OpenAI partnership",
      "Nvidia's AI initiatives"
    ]
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    text: "Market Analysis",
    examples: [
      "Amazon's market position",
      "Apple vs Samsung comparison",
      "Cloud market share analysis"
    ]
  }
];

const SAMPLE_QUESTIONS = [
  "What's Apple's financial performance in Q1 2024?",
  "How is Microsoft implementing AI across its products?",
  "Compare Google and Microsoft's cloud strategies",
  "What are Nvidia's main growth drivers?",
  "Analyze Amazon's competitive position in e-commerce",
  "What's Meta's AI investment strategy?"
];

const QueryInput = ({ value, onChange, onSubmit, disabled }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [focusedAction, setFocusedAction] = useState(null);
  const componentRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        setShowQuickActions(false);
        setShowSamples(false);
        setFocusedAction(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleQuickActionClick = (action) => {
    setFocusedAction(action);
    setShowQuickActions(false);
    setShowSamples(false);
    
    // Auto-focus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSampleClick = (question) => {
    onChange({ target: { value: question } });
    setShowSamples(false);
    setShowQuickActions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(e);
    setShowQuickActions(false);
    setShowSamples(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full" ref={componentRef}>
      {/* Quick Actions Bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickActionClick(action)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 
              border border-gray-700 hover:border-gray-600 rounded-lg text-sm text-gray-300 
              hover:text-white transition-all duration-200 group"
          >
            {action.icon}
            <span>{action.text}</span>
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
        
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 
            border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-sm text-blue-300 
            hover:text-blue-200 transition-all duration-200"
        >
          <Lightbulb className="w-4 h-4" />
          <span>Sample Questions</span>
        </button>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-4 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={focusedAction 
                ? `Ask about ${focusedAction.text.toLowerCase()}... (e.g., "${focusedAction.examples[0]}")`
                : "Ask about any tech company's performance, strategies, or market position..."
              }
              rows="3"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 text-white placeholder-gray-400 
                border border-gray-700 rounded-xl focus:outline-none focus:ring-2 
                focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 
                transition-all backdrop-blur-sm resize-none"
              style={{ minHeight: '100px' }}
            />
            
            {/* Quick Action Focus Indicator */}
            {focusedAction && (
              <div className="absolute -top-2 left-4 px-2 py-1 bg-blue-600 text-white text-xs rounded-md">
                {focusedAction.text}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="px-6 py-4 h-12 self-start mt-2 bg-gradient-to-r from-blue-600 to-blue-700 
              text-white rounded-lg hover:from-blue-500 hover:to-blue-600 
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
              ease-in-out font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 
              hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            {disabled ? (
              <>
                <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze
              </>
            )}
          </button>
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <Zap className="w-3 h-3" />
          <span>Press Cmd+Enter to analyze</span>
        </div>
      </form>

      {/* Quick Actions Dropdown */}
      {showQuickActions && focusedAction && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              {focusedAction.icon}
              {focusedAction.text} Examples
            </h3>
            <div className="space-y-2">
              {focusedAction.examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleClick(example)}
                  className="w-full text-left p-3 text-sm text-gray-300 hover:bg-gray-800/50 
                    rounded-lg transition-colors border border-transparent hover:border-gray-600"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sample Questions Dropdown */}
      {showSamples && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Sample Questions
            </h3>
            <div className="space-y-2">
              {SAMPLE_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleClick(question)}
                  className="w-full text-left p-3 text-sm text-gray-300 hover:bg-gray-800/50 
                    rounded-lg transition-colors border border-transparent hover:border-gray-600"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Pro Tip */}
      <div className="mt-4 text-sm text-gray-400 px-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span>
          <span className="font-medium text-blue-400">Pro tip:</span> Be specific! 
          Include company names, timeframes, or metrics for better analysis.
        </span>
      </div>
    </div>
  );
};

export default QueryInput;