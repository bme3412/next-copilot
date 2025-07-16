import React, { useState } from 'react';
import { HelpCircle, X, Lightbulb, TrendingUp, DollarSign, Cpu, Target } from 'lucide-react';

const HelpTips = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');

  const tips = {
    general: [
      {
        icon: <Target className="w-4 h-4" />,
        title: "Be Specific",
        description: "Include company names, timeframes, or specific metrics for better results."
      },
      {
        icon: <TrendingUp className="w-4 h-4" />,
        title: "Ask About Trends",
        description: "Questions about growth, trends, and comparisons work well."
      },
      {
        icon: <Cpu className="w-4 h-4" />,
        title: "Focus on Key Areas",
        description: "Financial performance, AI strategies, market position, and competitive analysis."
      }
    ],
    financial: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        title: "Revenue Analysis",
        description: "Ask about revenue growth, segment breakdown, and geographic performance."
      },
      {
        icon: <TrendingUp className="w-4 h-4" />,
        title: "Profit Metrics",
        description: "Inquire about profit margins, earnings growth, and cash flow trends."
      },
      {
        icon: <Target className="w-4 h-4" />,
        title: "Quarterly Results",
        description: "Compare Q1, Q2, Q3, Q4 performance or year-over-year trends."
      }
    ],
    ai: [
      {
        icon: <Cpu className="w-4 h-4" />,
        title: "AI Strategies",
        description: "Ask about AI investments, partnerships, and product integration."
      },
      {
        icon: <Target className="w-4 h-4" />,
        title: "Technology Focus",
        description: "Inquire about cloud services, AI chips, or specific technologies."
      },
      {
        icon: <TrendingUp className="w-4 h-4" />,
        title: "Competitive AI",
        description: "Compare AI strategies between companies like Google vs Microsoft."
      }
    ]
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Help & Tips</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {Object.keys(tips).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'general' && 'General Tips'}
              {tab === 'financial' && 'Financial Queries'}
              {tab === 'ai' && 'AI & Technology'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {tips[activeTab].map((tip, index) => (
              <div
                key={index}
                className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                    {tip.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-1">{tip.title}</h3>
                    <p className="text-sm text-gray-400">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example Queries */}
          <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <h3 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Example Queries
            </h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">
                • "What's Apple's revenue growth in Q1 2024?"
              </div>
              <div className="text-gray-300">
                • "How is Microsoft implementing AI across products?"
              </div>
              <div className="text-gray-300">
                • "Compare Google and Amazon's cloud strategies"
              </div>
              <div className="text-gray-300">
                • "What are Nvidia's main growth drivers?"
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/30">
          <div className="text-center text-sm text-gray-400">
            <p>Need more help? Try being more specific with your questions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpTips; 