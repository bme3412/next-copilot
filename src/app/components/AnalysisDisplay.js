import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const formatQuarterlyData = (progression) => {
  if (!progression || !Array.isArray(progression)) return [];
  return progression.map(quarter => ({
    name: quarter.period,
    value: parseFloat(quarter.key_metrics.revenue?.replace(/[^0-9.]/g, '')) || 0
  }));
};

export function AnalysisDisplay({ analysis }) {
  if (!analysis) {
    return (
      <div className="mt-8 p-6 bg-gray-900/30 border border-gray-800 rounded-xl backdrop-blur-sm text-gray-400">
        No analysis data available
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Main Analysis */}
      <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {analysis.analysis.split('\n').map((paragraph, idx) => (
            <p 
              key={idx} 
              className={`text-gray-200 leading-relaxed ${
                idx !== 0 ? 'mt-4' : ''
              }`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Charts Section */}
        {analysis.progression && analysis.progression.length > 0 && (
          <div className="mt-6 p-6 border-t border-gray-800 bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Revenue Progression</h3>
            <div className="w-full h-64">
              <LineChart
                width={800}
                height={240}
                data={formatQuarterlyData(analysis.progression)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#E5E7EB'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#60A5FA' }}
                />
              </LineChart>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      {analysis.metadata?.time_periods && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Time Range: {analysis.metadata.time_periods}
          </div>
          {analysis.metadata.topics_covered?.length > 0 && (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Topics: {analysis.metadata.topics_covered.map((topic, index) => (
                <span 
                  key={topic}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 ml-2"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}