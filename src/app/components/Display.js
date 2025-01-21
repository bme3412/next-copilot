import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area
} from 'recharts';
import { TrendingUp, DollarSign, BarChart2, AlertCircle } from 'lucide-react';

const formatQuarterlyData = (progression) => {
  if (!progression || !Array.isArray(progression)) return [];
  return progression.map(quarter => ({
    name: quarter.period,
    revenue: parseFloat(quarter.key_metrics.revenue?.replace(/[^0-9.]/g, '')) || 0,
    profit: parseFloat(quarter.key_metrics.profit?.replace(/[^0-9.]/g, '')) || 0,
    margin: parseFloat(quarter.key_metrics.margin?.replace(/[^0-9.]/g, '')) || 0
  }));
};

const MetricCard = ({ title, value, trend, icon: Icon }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-blue-400" />
      <span className="text-sm text-gray-400">{title}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    {trend && (
      <div className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs prev quarter
      </div>
    )}
  </div>
);

const ChartSection = ({ title, children }) => (
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

export function AnalysisDisplay({ analysis }) {
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

  return (
    <div className="mt-8 space-y-6">
      {/* Key Metrics Grid */}
      {latestData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="Revenue"
            value={`$${(latestData.revenue / 1000).toFixed(1)}B`}
            trend={calculateGrowth(latestData.revenue, previousData?.revenue)}
            icon={DollarSign}
          />
          <MetricCard
            title="Profit"
            value={`$${(latestData.profit / 1000).toFixed(1)}B`}
            trend={calculateGrowth(latestData.profit, previousData?.profit)}
            icon={TrendingUp}
          />
          <MetricCard
            title="Margin"
            value={`${latestData.margin.toFixed(1)}%`}
            trend={calculateGrowth(latestData.margin, previousData?.margin)}
            icon={BarChart2}
          />
        </div>
      )}

      {/* Main Analysis */}
      <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, idx) => (
              <p 
                key={idx} 
                className={`text-gray-200 leading-relaxed ${idx !== 0 ? 'mt-4' : ''}`}
              >
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-gray-400">No detailed analysis available.</p>
          )}
        </div>

        {/* Revenue Chart */}
        {formattedData.length > 0 && (
          <>
            <ChartSection title="Revenue Trend">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#E5E7EB'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartSection>

            {/* Profit & Margin Chart */}
            <ChartSection title="Profit & Margin Analysis">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#E5E7EB'
                  }}
                />
                <Legend />
                <Bar dataKey="profit" fill="#3B82F6" />
                <Bar dataKey="margin" fill="#60A5FA" />
              </BarChart>
            </ChartSection>
          </>
        )}
      </div>

      {/* Analysis Metadata */}
      {analysis.metadata?.time_periods && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Time Range: {analysis.metadata.time_periods}</span>
          </div>
          {analysis.metadata.topics_covered?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Topics:</span>
              {analysis.metadata.topics_covered.map(topic => (
                <span 
                  key={topic}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400"
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