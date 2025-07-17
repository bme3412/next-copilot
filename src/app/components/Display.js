import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, BarChart2, AlertCircle, Info, Lightbulb, ChevronDown, ChevronUp, Table } from 'lucide-react';
import FinancialChart from './FinancialChart';
import StructuredFinancialTable from './StructuredFinancialTable';

const formatQuarterlyData = (progression) => {
  if (!progression || !Array.isArray(progression)) return [];
  return progression.map(quarter => ({
    name: quarter.period,
    revenue: parseFloat(quarter.key_metrics.revenue?.replace(/[^0-9.]/g, '')) || 0,
    profit: parseFloat(quarter.key_metrics.profit?.replace(/[^0-9.]/g, '')) || 0,
    margin: parseFloat(quarter.key_metrics.margin?.replace(/[^0-9.]/g, '')) || 0
  }));
};

const MetricCard = ({ title, value, trend, icon: Icon, subtitle }) => (
  <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-600/70">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-blue-600/20 rounded-lg">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <span className="text-sm text-gray-400 font-medium">{title}</span>
    </div>
    <div className="text-3xl font-bold text-white mb-2">{value}</div>
    {subtitle && (
      <div className="text-sm text-gray-500 mb-2">{subtitle}</div>
    )}
    {trend !== null && (
      <div className={`text-sm font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs prev quarter
      </div>
    )}
  </div>
);

const ChartSection = ({ title, children, isVisible = true }) => {
  if (!isVisible) return null;
  
  return (
    <div className="mt-6 p-6 border-t border-gray-800 bg-gray-900/50">
      <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-blue-400" />
        {title}
      </h3>
      <div className="w-full h-64">
        <ResponsiveContainer>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CollapsibleCitations = ({ citations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-800/50 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 text-sm font-medium text-gray-300 hover:text-gray-200 transition-colors w-full p-2 rounded-lg hover:bg-gray-800/30"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-400" />
        )}
        <span>Citations ({citations.length})</span>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {citations.map((citation, index) => (
            <div key={index} className="flex items-center gap-3 text-xs text-gray-400 p-2 rounded-lg bg-gray-800/30">
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
              <span className="truncate">{citation.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FinancialTableButton = ({ onGenerateTable, isGenerating = false }) => {
  return (
    <div className="border-t border-gray-800/50 pt-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Table className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Financial Data</h3>
      </div>
      <button
        onClick={onGenerateTable}
        disabled={isGenerating}
        className="w-full p-4 bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-blue-600/20 hover:to-blue-500/20 border border-gray-600/50 hover:border-blue-500/50 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center gap-3">
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-full animate-spin"></div>
              <span className="text-gray-200 font-medium">Generating Financial Table...</span>
            </>
          ) : (
            <>
              <Table className="w-5 h-5 text-blue-400" />
              <span className="text-gray-200 font-medium">Generate Financial Table</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
};

const CollapsibleSources = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-800/50 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 text-sm font-medium text-gray-300 hover:text-gray-200 transition-colors w-full p-2 rounded-lg hover:bg-gray-800/30"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-400" />
        )}
        <span>Sources ({sources.length})</span>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source, index) => (
            <div key={index} className="flex items-center gap-3 text-xs text-gray-400 p-2 rounded-lg bg-gray-800/30">
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
              <span className="truncate">{source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FollowUpQuestions = ({ questions, onQuestionClick }) => {
  if (!questions || questions.length === 0) return null;

  // Limit to exactly 3 questions
  const displayQuestions = questions.slice(0, 3);

  return (
    <div className="border-t border-gray-800/50 pt-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Lightbulb className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Follow-up Questions</h3>
      </div>
      <div className="space-y-3">
        {displayQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="w-full text-left p-4 bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-blue-600/20 hover:to-blue-500/20 border border-gray-600/50 hover:border-blue-500/50 rounded-xl transition-all duration-300 group cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mt-2 flex-shrink-0 group-hover:from-blue-300 group-hover:to-blue-400 transition-all duration-300 shadow-sm"></div>
              <span className="text-sm text-gray-200 group-hover:text-white transition-colors leading-relaxed font-medium">
                {question}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export function AnalysisDisplay({ analysis, isStreaming = false, onQuestionClick, onGenerateFinancialTable, isGeneratingTable = false }) {
  const formattedData = useMemo(() => formatQuarterlyData(analysis?.progression), [analysis?.progression]);
  
  if (!analysis) {
    return (
      <div className="mt-8 p-6 bg-gray-900/30 border border-gray-800 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <AlertCircle className="w-5 h-5" />
          No analysis data available
        </div>
      </div>
    );
  }

  const paragraphs = analysis?.analysis ? analysis.analysis.split('\n') : [];
  const latestData = formattedData[formattedData.length - 1];
  const previousData = formattedData[formattedData.length - 2];

  const calculateGrowth = (current, previous) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Determine if we should show charts based on data availability and analysis type
  const shouldShowCharts = formattedData.length > 1 && analysis.metadata?.analysis_type === 'financial';
  const hasFinancialMetrics = latestData && (latestData.revenue > 0 || latestData.profit > 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid - Only show if we have financial data */}
      {hasFinancialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="Revenue"
            value={`$${(latestData.revenue / 1000).toFixed(1)}B`}
            trend={calculateGrowth(latestData.revenue, previousData?.revenue)}
            icon={DollarSign}
            subtitle="Quarterly revenue"
          />
          <MetricCard
            title="Profit"
            value={`$${(latestData.profit / 1000).toFixed(1)}B`}
            trend={calculateGrowth(latestData.profit, previousData?.profit)}
            icon={TrendingUp}
            subtitle="Net income"
          />
          <MetricCard
            title="Margin"
            value={`${latestData.margin.toFixed(1)}%`}
            trend={calculateGrowth(latestData.margin, previousData?.margin)}
            icon={BarChart2}
            subtitle="Profit margin"
          />
        </div>
      )}

      {/* Main Analysis */}
      <div className="bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6">
          {isStreaming && (
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Streaming response...</span>
            </div>
          )}
          
          {paragraphs.length > 0 ? (
            <div className="space-y-4">
              {paragraphs.map((paragraph, idx) => (
                <p 
                  key={idx} 
                  className="text-gray-200 leading-relaxed text-base"
                >
                  {paragraph}
                  {isStreaming && idx === paragraphs.length - 1 && (
                    <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse"></span>
                  )}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No detailed analysis available.</p>
          )}
        </div>

        {/* Financial Table Button - Show for financial analysis */}
        {analysis.metadata?.analysis_type === 'financial' && (
          <FinancialTableButton 
            onGenerateTable={onGenerateFinancialTable}
            isGenerating={isGeneratingTable}
          />
        )}

        {/* Generated Financial Table */}
        {analysis.metadata?.financialTable && (
          <div className="border-t border-gray-800 pt-6 mt-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  Financial Analysis Table
                </h3>
              </div>
              <div className="p-6">
                {/* Use structured financial table for consistent rendering */}
                <StructuredFinancialTable data={analysis.metadata.financialTable} />
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Questions */}
        {analysis.followUpQuestions && analysis.followUpQuestions.length > 0 && (
          <FollowUpQuestions 
            questions={analysis.followUpQuestions} 
            onQuestionClick={onQuestionClick}
          />
        )}
      </div>

      {/* Citations Section - Collapsible */}
      {analysis.metadata?.citations && analysis.metadata.citations.length > 0 && (
        <CollapsibleCitations citations={analysis.metadata.citations} />
      )}

      {/* Sources Section - Collapsible */}
      {analysis.metadata?.sources && analysis.metadata.sources.length > 0 && (
        <CollapsibleSources sources={analysis.metadata.sources} />
      )}

      {/* Analysis Metadata - Simplified */}
      {analysis.metadata && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-t border-gray-800/50 pt-4">
          {analysis.metadata.time_periods && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-800/30">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Time Range: {analysis.metadata.time_periods}</span>
            </div>
          )}
          {analysis.metadata.topics_covered?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-800/30">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Topics:</span>
              </div>
              {analysis.metadata.topics_covered.slice(0, 3).map(topic => (
                <span 
                  key={topic}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  {topic}
                </span>
              ))}
              {analysis.metadata.topics_covered.length > 3 && (
                <span className="text-gray-500 px-2">+{analysis.metadata.topics_covered.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 