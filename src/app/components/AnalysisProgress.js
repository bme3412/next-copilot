import React from 'react';
import { Search, Cpu, FileText, CheckCircle, Loader2 } from 'lucide-react';

const AnalysisProgress = ({ stage = 'searching', error = null }) => {
  const stages = [
    {
      key: 'searching',
      icon: <Search className="w-5 h-5" />,
      label: 'Searching data',
      description: 'Finding relevant company information and transcripts'
    },
    {
      key: 'processing',
      icon: <Cpu className="w-5 h-5" />,
      label: 'Processing',
      description: 'Analyzing financial data and market trends'
    },
    {
      key: 'generating',
      icon: <FileText className="w-5 h-5" />,
      label: 'Generating analysis',
      description: 'Creating comprehensive insights and recommendations'
    }
  ];

  const getStageIndex = (stageKey) => {
    return stages.findIndex(s => s.key === stageKey);
  };

  const currentIndex = getStageIndex(stage);

  return (
    <div className="max-w-md mx-auto">
      <div className="space-y-4">
        {stages.map((stageItem, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div
              key={stageItem.key}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-500/10 border border-green-500/20'
                  : isCurrent
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : 'bg-gray-800/50 border border-gray-700'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-600 text-gray-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  stageItem.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className={`font-medium ${
                  isCompleted
                    ? 'text-green-400'
                    : isCurrent
                    ? 'text-blue-400'
                    : 'text-gray-400'
                }`}>
                  {stageItem.label}
                </div>
                <div className="text-sm text-gray-500">
                  {stageItem.description}
                </div>
              </div>

              {/* Status indicator */}
              {isCurrent && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress; 