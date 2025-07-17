import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Search, TrendingUp, Cpu, DollarSign, Lightbulb, Zap } from "lucide-react";

const QUICK_ACTIONS = [
  {
    icon: <DollarSign className="w-4 h-4" />,
    text: "Financial Performance",
    examples: [
      "What was Apple's revenue growth in Q1 2024?",
      "How have Microsoft's profit margins changed over the last year?",
      "Can you show Nvidia's cash flow trends for the past four quarters?",
      "What are Amazon's quarterly earnings highlights for 2023?",
      "How does Google's revenue breakdown by business segment?",
      "What trends are visible in Meta's advertising revenue?",
      "How has Salesforce's subscription revenue growth trajectory?",
      "What's Oracle's cloud revenue performance in recent quarters?",
      "What's AMD's market share gains in the server CPU space?",
      "How is Broadcom's semiconductor business performing?"
    ]
  },
  {
    icon: <Cpu className="w-4 h-4" />,
    text: "AI & Technology",
    examples: [
      "How is Microsoft partnering with OpenAI, and what are the results?",
      "What are Nvidia's most important AI initiatives this year?",
      "How is AMD competing with Nvidia in AI chips?",
      "How is Salesforce leveraging AI in its CRM platform?",
      "What's Oracle's approach to AI in enterprise software?",
      "What AI capabilities is Broadcom developing?",
      "What is Google's overall AI strategy in 2024?",
      "How is Apple integrating AI into its products?",
      "What AI investments has Amazon made recently?",
      "What are Meta's main areas of AI research and development?"
    ]
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    text: "Market Analysis",
    examples: [
      "Compare the AI chip strategies of Nvidia, AMD, and Intel",
      "How do cloud providers (AWS, Azure, GCP) differentiate themselves?",
      "What's the impact of AI on enterprise software companies?",
      "How are semiconductor companies adapting to AI demand?",
      "What are the key trends in enterprise software consolidation?",
      "Can you analyze the cloud market share for major tech companies?",
      "How do Google and Microsoft compete in the cloud space?",
      "How does Salesforce compare to Oracle in enterprise software?",
      "What's AMD's competitive position against Intel in CPUs?",
      "How is Broadcom positioned in the networking chip market?"
    ]
  }
];

const SAMPLE_QUESTIONS = [
  "Compare the AI chip strategies of Nvidia, AMD, and Intel",
  "How do cloud providers (AWS, Azure, GCP) differentiate themselves?",
  "What's the impact of AI on enterprise software companies?",
  "How are semiconductor companies adapting to AI demand?",
  "What are the key trends in enterprise software consolidation?",
  "How is Microsoft partnering with OpenAI, and what are the results?",
  "Can you analyze the cloud market share for major tech companies?",
  "How does Salesforce compare to Oracle in enterprise software?",
  "What's AMD's competitive position against Intel in CPUs?",
  "How has Salesforce's subscription model evolved?",
  "What's Oracle's cloud transformation progress?",
  "What's Broadcom's strategy in the semiconductor consolidation?",
  "What are Nvidia's main growth drivers?",
  "How is AMD gaining market share from Intel?",
  "What's Meta's AI investment strategy?"
];

export default function QueryInput({ value, onChange, onSubmit, disabled }) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showSamples, setShowSamples] = useState(false);
  const textareaRef = useRef(null);
  const componentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setShowSamples(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickActionClick = (actionText) => {
    setActiveDropdown(activeDropdown === actionText ? null : actionText);
    setShowSamples(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSampleClick = (question) => {
    onChange({ target: { value: question } });
    setActiveDropdown(null);
    setShowSamples(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(e);
    setActiveDropdown(null);
    setShowSamples(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
  };

  return (
    <div className="w-full relative" ref={componentRef}>
      {/* Quick Actions Bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action, idx) => (
          <div key={action.text} className="relative">
            <button
              onClick={() => handleQuickActionClick(action.text)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all duration-200 group ${
                activeDropdown === action.text
                  ? "bg-blue-600/20 border-blue-500/30"
                  : "bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 text-gray-300 hover:text-white"
              }`}
            >
              {action.icon}
              <span>{action.text}</span>
              <ChevronDown className={`w-3 h-3 opacity-50 transition-opacity ${activeDropdown === action.text ? "opacity-100" : "group-hover:opacity-100"}`} />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            setShowSamples(!showSamples);
            setActiveDropdown(null);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-sm text-blue-300 hover:text-blue-200 transition-all duration-200"
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
              placeholder="Ask about any tech company's performance, strategies, or market position..."
              rows={3}
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 text-white placeholder-gray-400 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 transition-all backdrop-blur-sm resize-none"
              style={{ minHeight: "100px" }}
            />
          </div>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="px-6 py-4 h-12 self-start mt-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
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
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <Zap className="w-3 h-3" />
          <span>Press Cmd+Enter to analyze</span>
        </div>
      </form>

      {/* Dropdowns positioned below the input area */}
      <div className="mt-4">
        {/* Quick Action Dropdowns */}
        {QUICK_ACTIONS.map((action, idx) => (
          activeDropdown === action.text && (
            <div key={action.text} className="mb-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                  {action.icon}
                  {action.text} Example Queries
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {action.examples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleClick(example)}
                      className="w-full text-left p-3 text-sm text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors border border-transparent hover:border-gray-600"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        ))}

        {/* Sample Questions Dropdown */}
        {showSamples && (
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Sample Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {SAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleClick(question)}
                    className="w-full text-left p-3 text-sm text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors border border-transparent hover:border-gray-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}