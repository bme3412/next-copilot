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
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          No analysis data available
        </div>
      );
    }
  
    return (
      <div className="mt-8 space-y-8">
        {/* Main Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="prose max-w-none">
            {analysis.analysis.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </div>
  
        {/* Metadata */}
        {analysis.metadata?.time_periods && (
          <div className="text-sm text-gray-500 mt-4">
            Analysis based on: {analysis.metadata.time_periods}
            {analysis.metadata.topics_covered?.length > 0 && (
              <span className="ml-2">| Topics: {analysis.metadata.topics_covered.join(', ')}</span>
            )}
          </div>
        )}
      </div>
    );
  }