import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, BarChart2, AlertCircle, Info, Lightbulb, ChevronDown, ChevronUp, Table } from 'lucide-react';
import FinancialChart from './FinancialChart';

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
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-blue-400" />
      <span className="text-sm text-gray-400">{title}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    {subtitle && (
      <div className="text-sm text-gray-500 mb-1">{subtitle}</div>
    )}
    {trend !== null && (
      <div className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
    <div className="border-t border-gray-800 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-200 transition-colors w-full"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {citations.map((citation, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <span>{citation.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FinancialTableButton = ({ onGenerateTable, isGenerating = false }) => {
  return (
    <div className="border-t border-gray-800 pt-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Table className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-200">Financial Data</h3>
      </div>
      <button
        onClick={onGenerateTable}
        disabled={isGenerating}
        className="w-full p-4 bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-blue-600/20 hover:to-blue-500/20 border border-gray-600 hover:border-blue-500/50 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="border-t border-gray-800 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-200 transition-colors w-full"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sources.map((source, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <span>{source}</span>
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
    <div className="border-t border-gray-800 pt-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-200">Follow-up Questions</h3>
      </div>
      <div className="space-y-3">
        {displayQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="w-full text-left p-4 bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-blue-600/20 hover:to-blue-500/20 border border-gray-600 hover:border-blue-500/50 rounded-xl transition-all duration-300 group cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
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

// New component to parse and render ASCII tables as proper HTML tables
const FinancialTableRenderer = ({ tableText }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table', 'cards', or 'dashboard'
  
  const parseAsciiTable = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;
    
    for (const line of lines) {
      // Check if this is a section header (all caps, no special chars)
      if (/^[A-Z\s]+$/.test(line.trim()) && line.trim().length > 3) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.trim(),
          table: null
        };
        continue;
      }
      
      // Check if this line contains table data (has | characters)
      if (line.includes('|') && currentSection) {
        if (!currentSection.table) {
          currentSection.table = [];
        }
        currentSection.table.push(line);
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };
  
  const parseTableData = (tableLines) => {
    if (!tableLines || tableLines.length < 3) return null;
    
    // Remove the separator lines (lines with only +, -, and |)
    const dataLines = tableLines.filter(line => 
      !/^[\s|+\-]+$/.test(line.trim())
    );
    
    if (dataLines.length < 2) return null;
    
    // Parse headers (first data line)
    const headerLine = dataLines[0];
    const allHeaders = headerLine.split('|').map(cell => cell.trim());
    
    // Skip the first empty column, use the rest as headers
    const headers = allHeaders.slice(1).filter(header => header && header.trim() !== '');
    
    // Parse data rows
    const rows = dataLines.slice(1).map(line => {
      const allCells = line.split('|').map(cell => cell.trim());
      // Skip the first empty column, use the rest as data
      return allCells.slice(1);
    });
    
    console.log('Parsed table data:', { headers, rows });
    
    return { headers, rows };
  };
  
  const formatCellValue = (value) => {
    // Format numbers with commas
    if (/^\d+$/.test(value)) {
      return parseInt(value).toLocaleString();
    }
    // Format percentages
    if (value.includes('%')) {
      return value;
    }
    // Format currency (assuming values in millions)
    if (/^\d+\.?\d*$/.test(value.replace(/[^\d.]/g, ''))) {
      const num = parseFloat(value.replace(/[^\d.]/g, ''));
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(1)}B`;
      } else if (num >= 1) {
        return `$${num.toFixed(1)}M`;
      }
    }
    return value;
  };
  
  const getNumericValue = (value) => {
    if (!value || typeof value !== 'string') return 0;
    
    // Remove common financial formatting
    let cleanedValue = value.trim();
    
    // Handle empty or dash values
    if (cleanedValue === '' || cleanedValue === '-' || cleanedValue === 'N/A') {
      return 0;
    }
    
    // Handle percentage values
    if (cleanedValue.includes('%')) {
      const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    }
    
    // Handle currency values (e.g., "$1,234.56B", "$1,234.56M", "$1,234.56K")
    if (cleanedValue.includes('$')) {
      // Remove $ and commas
      cleanedValue = cleanedValue.replace(/[$,]/g, '');
      
      // Handle B (billions), M (millions), K (thousands)
      if (cleanedValue.includes('B')) {
        const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
        return numMatch ? parseFloat(numMatch[1]) * 1000 : 0; // Convert to millions
      } else if (cleanedValue.includes('M')) {
        const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
        return numMatch ? parseFloat(numMatch[1]) : 0;
      } else if (cleanedValue.includes('K')) {
        const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
        return numMatch ? parseFloat(numMatch[1]) / 1000 : 0; // Convert to millions
      } else {
        // Just a dollar amount
        const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
        return numMatch ? parseFloat(numMatch[1]) / 1000000 : 0; // Convert to millions
      }
    }
    
    // Handle plain numbers with commas
    cleanedValue = cleanedValue.replace(/,/g, '');
    
    // Extract numeric value for calculations
    if (/^\d+$/.test(cleanedValue)) {
      return parseInt(cleanedValue);
    }
    if (/^\d+\.?\d*$/.test(cleanedValue)) {
      return parseFloat(cleanedValue);
    }
    
    // Try to extract any number from the string
    const numMatch = cleanedValue.match(/([+-]?\d+\.?\d*)/);
    return numMatch ? parseFloat(numMatch[1]) : 0;
  };
  
  const sections = parseAsciiTable(tableText);
  
  if (!sections || sections.length === 0) {
    return (
      <div className="text-sm text-gray-800 font-sans leading-relaxed whitespace-pre-wrap">
        {tableText}
      </div>
    );
  }
  
  const renderTableView = () => (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => {
        const tableData = parseTableData(section.table);
        
        return (
          <div key={sectionIndex} className="space-y-4">
            {section.title && (
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                {section.title}
              </h4>
            )}
            
            {tableData ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                        Metric
                      </th>
                      {tableData.headers.map((header, index) => (
                        <th 
                          key={index}
                          className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tableData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                          {row[0]}
                        </td>
                        {row.slice(1).map((cell, cellIndex) => (
                          <td 
                            key={cellIndex}
                            className="px-4 py-3 text-sm text-gray-900"
                          >
                            {formatCellValue(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Fallback for non-table content
              <div className="text-sm text-gray-700 leading-relaxed">
                {section.table?.join('\n')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  
  const renderCardView = () => (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => {
        const tableData = parseTableData(section.table);
        
        return (
          <div key={sectionIndex} className="space-y-4">
            {section.title && (
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                {section.title}
              </h4>
            )}
            
            {tableData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableData.rows.map((row, rowIndex) => {
                  const metricName = row[0];
                  const values = row.slice(1);
                  
                  return (
                    <div key={rowIndex} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">{metricName}</h5>
                      <div className="space-y-2">
                        {tableData.headers.map((header, headerIndex) => (
                          <div key={headerIndex} className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">{header}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCellValue(values[headerIndex] || '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback for non-table content
              <div className="text-sm text-gray-700 leading-relaxed">
                {section.table?.join('\n')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  
  const renderDashboardView = () => {
    // Find the main performance section for dashboard metrics
    const performanceSection = sections.find(section => 
      section.title.includes('PERFORMANCE') || 
      section.title.includes('SUMMARY') ||
      section.title.includes('QUARTERLY') ||
      section.title.includes('ANNUAL')
    );
    
    console.log('Section detection:', {
      allSections: sections.map(s => s.title),
      selectedSection: performanceSection ? performanceSection.title : 'Not found'
    });
    
    const tableData = performanceSection ? parseTableData(performanceSection.table) : null;
    
    if (!tableData) {
      return renderCardView(); // Fallback to card view
    }
    
    // Extract key metrics for dashboard - match actual table row names
    const revenueRow = tableData.rows.find(row => 
      row[0].toLowerCase().includes('revenue') ||
      row[0].toLowerCase().includes('sales') ||
      row[0].toLowerCase().includes('top line')
    );
    const profitRow = tableData.rows.find(row => 
      row[0].toLowerCase().includes('op. income') ||
      row[0].toLowerCase().includes('operating income') ||
      row[0].toLowerCase().includes('op income') ||
      row[0].toLowerCase().includes('operating') ||
      row[0].toLowerCase().includes('income')
    );
    const marginRow = tableData.rows.find(row => 
      row[0].toLowerCase().includes('op. margin') ||
      row[0].toLowerCase().includes('operating margin') ||
      row[0].toLowerCase().includes('op margin') ||
      row[0].toLowerCase().includes('margin')
    );
    
    // Also look for YoY Growth as a separate metric
    const growthRow = tableData.rows.find(row => 
      row[0].toLowerCase().includes('yoy growth') ||
      row[0].toLowerCase().includes('growth')
    );
    
    console.log('Row detection:', {
      allRows: tableData.rows.map(row => row[0]),
      revenueRow: revenueRow ? revenueRow[0] : 'Not found',
      profitRow: profitRow ? profitRow[0] : 'Not found',
      marginRow: marginRow ? marginRow[0] : 'Not found',
      growthRow: growthRow ? growthRow[0] : 'Not found',
      headers: tableData.headers,
      fullTableData: tableData
    });
    
    // Prepare chart data - headers are the quarters, data rows have metric names at index 0
    const chartData = tableData.headers
      .filter(header => header && header.trim() !== '') // Filter out empty headers
      .map((header, index) => {
        // Fix indexing: data starts at index 1, not index 0 (index 0 is the metric name)
        const dataIndex = index + 1;
        const revenueValue = revenueRow && revenueRow[dataIndex] ? getNumericValue(revenueRow[dataIndex]) : 0;
        const profitValue = profitRow && profitRow[dataIndex] ? getNumericValue(profitRow[dataIndex]) : 0;
        const marginValue = marginRow && marginRow[dataIndex] ? getNumericValue(marginRow[dataIndex]) : 0;
        const growthValue = growthRow && growthRow[dataIndex] ? getNumericValue(growthRow[dataIndex]) : 0;
        
        console.log(`Data for ${header}:`, {
          revenueValue,
          profitValue,
          marginValue,
          growthValue,
          revenueRaw: revenueRow ? revenueRow[dataIndex] : 'no row',
          profitRaw: profitRow ? profitRow[dataIndex] : 'no row',
          marginRaw: marginRow ? marginRow[dataIndex] : 'no row',
          growthRaw: growthRow ? growthRow[dataIndex] : 'no row'
        });
        
        return {
          name: header, // Use 'name' instead of 'period' for Recharts
          revenue: revenueValue,
          profit: profitValue,
          margin: marginValue,
          growth: growthValue
        };
      }); // Remove the filter to see all data points
    
    // Don't filter out any quarters - show all quarters even if some have zero values
    const filteredChartData = chartData;
    
    console.log('Chart data:', {
      originalData: chartData,
      filteredData: filteredChartData,
      revenueRow: revenueRow ? revenueRow[0] : 'Not found',
      profitRow: profitRow ? profitRow[0] : 'Not found',
      marginRow: marginRow ? marginRow[0] : 'Not found',
      headers: tableData.headers
    });
    
    // Check if we have valid chart data
    if (filteredChartData.length === 0) {
      // Try to use any available data as fallback
      const fallbackChartData = tableData.headers
        .filter(header => header && header.trim() !== '')
        .map((header, index) => {
          // Fix indexing: data starts at index 1, not index 0 (index 0 is the metric name)
          const dataIndex = index + 1;
          // Use the first row with data as fallback
          const firstRowWithData = tableData.rows.find(row => 
            row[dataIndex] && row[dataIndex].trim() !== '' && row[dataIndex] !== '-'
          );
          
          const value = firstRowWithData && firstRowWithData[dataIndex] 
            ? getNumericValue(firstRowWithData[dataIndex]) 
            : 0;
          
          return {
            name: header,
            revenue: value,
            profit: value,
            margin: value
          };
        })
        ; // Don't filter - show all quarters
      
      if (fallbackChartData.length === 0) {
        return (
          <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">No Chart Data Available</h4>
              <p className="text-gray-600">Unable to extract chart data from the financial table. Please try generating a different table format.</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
                <strong>Debug Info:</strong><br/>
                Original Data: {JSON.stringify(chartData, null, 2)}<br/>
                Filtered Data: {JSON.stringify(filteredChartData, null, 2)}<br/>
                Fallback Data: {JSON.stringify(fallbackChartData, null, 2)}<br/>
                Revenue Row: {revenueRow ? revenueRow.join(', ') : 'Not found'}<br/>
                Profit Row: {profitRow ? profitRow.join(', ') : 'Not found'}<br/>
                Margin Row: {marginRow ? marginRow.join(', ') : 'Not found'}<br/>
                Growth Row: {growthRow ? growthRow.join(', ') : 'Not found'}<br/>
                All Rows: {tableData.rows.map(row => row[0]).join(', ')}
              </div>
            </div>
            {renderCardView()}
          </div>
        );
      }
      
      // Use fallback data
      console.log('Using fallback chart data:', fallbackChartData);
      return (
        <div className="space-y-8">
          
          {/* Fallback Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Financial Performance Trend</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fallbackChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`}
                    domain={[0, 'dataMax + 10000']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${(value / 1000).toFixed(1)}B`,
                      'Financial Metric'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Financial Metric"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {renderCardView()}
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {revenueRow && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatCellValue(revenueRow[revenueRow.length - 1] || 'N/A')}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">Latest Quarter</p>
                </div>
                <div className="w-14 h-14 bg-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </div>
          )}
          
          {profitRow && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Operating Income</p>
                  <p className="text-3xl font-bold text-green-900">
                    {formatCellValue(profitRow[profitRow.length - 1] || 'N/A')}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Latest Quarter</p>
                </div>
                <div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </div>
          )}
          
          {marginRow && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Operating Margin</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCellValue(marginRow[marginRow.length - 1] || 'N/A')}
                  </p>
                  <p className="text-xs text-purple-600 mt-2">Latest Quarter</p>
                </div>
                <div className="w-14 h-14 bg-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <BarChart2 className="w-7 h-7 text-purple-600" />
                </div>
              </div>
            </div>
          )}
          
          {growthRow && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">YoY Growth</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {formatCellValue(growthRow[growthRow.length - 1] || 'N/A')}
                  </p>
                  <p className="text-xs text-orange-600 mt-2">Latest Quarter</p>
                </div>
                <div className="w-14 h-14 bg-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-7 h-7 text-orange-600" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Revenue Performance Chart */}
        {revenueRow && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Revenue Performance</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`}
                    domain={[0, 'dataMax + 10000']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${(value / 1000).toFixed(1)}B`,
                      name === 'revenue' ? 'Revenue' : 'Operating Income'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Debug info */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
              <strong>Debug Info:</strong><br/>
              Original Data: {JSON.stringify(chartData, null, 2)}<br/>
              Filtered Data: {JSON.stringify(filteredChartData, null, 2)}<br/>
              Revenue Row: {revenueRow ? revenueRow.join(', ') : 'Not found'}
            </div>
          </div>
        )}
        
        {/* Operating Income Chart */}
        {profitRow && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Operating Income Trend</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`}
                    domain={[0, 'dataMax + 2000']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${(value / 1000).toFixed(1)}B`,
                      'Operating Income'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Operating Income"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Margin Analysis Chart */}
        {marginRow && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Operating Margin Analysis</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    domain={[0, 'dataMax + 2']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value.toFixed(1)}%`,
                      'Operating Margin'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="margin" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                    name="Operating Margin"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Growth Analysis Chart */}
        {growthRow && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Year-over-Year Growth</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    domain={[0, 'dataMax + 5']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value.toFixed(1)}%`,
                      'YoY Growth'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="growth" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                    name="YoY Growth"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Detailed Data Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Detailed Quarterly Data</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {tableData.headers.map((header, index) => (
                    <th 
                      key={index}
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="px-6 py-4 text-sm text-gray-900"
                      >
                        {formatCellValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>
      
      {/* Render based on view mode */}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'cards' && renderCardView()}
      {viewMode === 'dashboard' && renderDashboardView()}
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
      <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {isStreaming && (
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Streaming response...</span>
            </div>
          )}
          
          {paragraphs.length > 0 ? (
            <div className="space-y-4">
              {paragraphs.map((paragraph, idx) => (
                <p 
                  key={idx} 
                  className="text-gray-200 leading-relaxed"
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
                <FinancialTableRenderer tableText={analysis.metadata.financialTable} />
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
        <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
          {analysis.metadata.time_periods && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Time Range: {analysis.metadata.time_periods}</span>
            </div>
          )}
          {analysis.metadata.topics_covered?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Topics:</span>
              {analysis.metadata.topics_covered.slice(0, 3).map(topic => (
                <span 
                  key={topic}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400"
                >
                  {topic}
                </span>
              ))}
              {analysis.metadata.topics_covered.length > 3 && (
                <span className="text-gray-500">+{analysis.metadata.topics_covered.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}