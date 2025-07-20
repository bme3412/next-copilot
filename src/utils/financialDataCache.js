import fs from 'fs';
import path from 'path';

class FinancialDataCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCleanup = Date.now();
  }

  // Generate cache key for a specific company, fiscal year, and quarter
  generateKey(company, fiscalYear, quarter) {
    return `${company}_FY${fiscalYear}_Q${quarter}`;
  }

  // Get cached data if it exists and is not expired
  get(company, fiscalYear, quarter) {
    const key = this.generateKey(company, fiscalYear, quarter);
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    
    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set data in cache with timestamp
  set(company, fiscalYear, quarter, data) {
    const key = this.generateKey(company, fiscalYear, quarter);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old entries periodically
    this.cleanup();
  }

  // Get multiple quarters at once with caching
  async getMultipleQuarters(company, fiscalYear, quarters = ['Q1', 'Q2', 'Q3', 'Q4']) {
    const results = [];
    
    for (const quarter of quarters) {
      // Check cache first
      let data = this.get(company, fiscalYear, quarter);
      
      if (!data) {
        // Load from file if not in cache
        data = await this.loadFromFile(company, fiscalYear, quarter);
        if (data) {
          this.set(company, fiscalYear, quarter, data);
        }
      }
      
      if (data) {
        results.push({
          quarter,
          ...data
        });
      }
    }
    
    return results;
  }

  // Load data from file
  async loadFromFile(company, fiscalYear, quarter) {
    try {
      const baseDir = path.join(process.cwd(), 'data', 'financials');
      const filePath = path.join(baseDir, company, `FY_${fiscalYear}`, quarter, `${company}_FY_${fiscalYear}_${quarter}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return this.extractFinancialMetrics(rawData);
    } catch (error) {
      console.error(`Error loading financial data for ${company} FY${fiscalYear} ${quarter}:`, error.message);
      return null;
    }
  }

  // Extract financial metrics (same logic as before, but optimized)
  extractFinancialMetrics(jsonData) {
    try {
      const report = jsonData.financial_report || jsonData.financial_reports?.[0];
      if (!report) return null;
      
      const incomeStatement = report.income_statement;
      if (!incomeStatement) return null;
      
      // Extract revenue - handle different field names
      let revenue = 0;
      if (incomeStatement.revenue?.total?.value) {
        revenue = incomeStatement.revenue.total.value;
      } else if (incomeStatement.net_sales?.total?.value) {
        revenue = incomeStatement.net_sales.total.value;
      } else if (incomeStatement.revenues?.total?.value) {
        revenue = incomeStatement.revenues.total.value;
      }
      
      // Extract operating income - handle different structures
      let profit = 0;
      if (incomeStatement.operating_income?.total) {
        profit = incomeStatement.operating_income.total;
      } else if (incomeStatement.operating_income?.value) {
        profit = incomeStatement.operating_income.value;
      } else if (incomeStatement.operating_income?.gaap?.value) {
        profit = incomeStatement.operating_income.gaap.value;
      } else if (incomeStatement.operating_income?.non_gaap?.value) {
        profit = incomeStatement.operating_income.non_gaap.value;
      } else if (incomeStatement.margins?.operating_margin?.gaap?.operating_income) {
        // NVDA structure
        profit = incomeStatement.margins.operating_margin.gaap.operating_income;
      } else if (incomeStatement.margins?.operating_margin?.non_gaap?.operating_income) {
        // NVDA non-GAAP structure
        profit = incomeStatement.margins.operating_margin.non_gaap.operating_income;
      }
      
      // Extract margin - handle different structures
      let margin = 0;
      if (incomeStatement.operating_income?.margin_percentage) {
        margin = parseFloat(incomeStatement.operating_income.margin_percentage);
      } else if (incomeStatement.margins?.operating_margin?.current_value) {
        margin = incomeStatement.margins.operating_margin.current_value;
      } else if (incomeStatement.margins?.operating_margin?.gaap?.value) {
        margin = parseFloat(incomeStatement.margins.operating_margin.gaap.value);
      } else if (incomeStatement.margins?.operating_margin?.non_gaap?.value) {
        margin = parseFloat(incomeStatement.margins.operating_margin.non_gaap.value);
      } else if (incomeStatement.operating_margin?.current_value) {
        margin = incomeStatement.operating_margin.current_value;
      } else if (incomeStatement.operating_margin?.value) {
        margin = incomeStatement.operating_margin.value;
      } else if (revenue > 0 && profit !== 0) {
        // Calculate operating margin if not provided
        margin = (profit / revenue) * 100;
      }
      
      // Extract growth - handle different structures
      let growth = 0;
      if (incomeStatement.revenue?.total?.yoy_growth) {
        growth = parseFloat(incomeStatement.revenue.total.yoy_growth);
      } else if (incomeStatement.net_sales?.total?.yoy_growth) {
        growth = incomeStatement.net_sales.total.yoy_growth;
      } else if (incomeStatement.revenues?.total?.yoy_growth) {
        growth = incomeStatement.revenues.total.yoy_growth;
      } else if (incomeStatement.operating_income?.yoy_growth) {
        growth = parseFloat(incomeStatement.operating_income.yoy_growth);
      } else if (incomeStatement.revenue?.total?.yoy_change) {
        // Amazon structure uses yoy_change
        growth = parseFloat(incomeStatement.revenue.total.yoy_change);
      } else if (incomeStatement.net_sales?.total?.yoy_change) {
        // Amazon structure uses yoy_change
        growth = parseFloat(incomeStatement.net_sales.total.yoy_change);
      } else if (incomeStatement.operating_income?.yoy_change) {
        // Amazon structure uses yoy_change
        growth = parseFloat(incomeStatement.operating_income.yoy_change);
      }
      
      // Extract net income
      const netIncome = incomeStatement.net_income?.gaap?.value ||
                       incomeStatement.net_income?.non_gaap?.value ||
                       incomeStatement.net_income?.value || 0;
      
      // Extract gross margin
      const grossMargin = parseFloat(incomeStatement.margins?.gross_margin?.gaap?.value) || 0;
      
      // Extract gross profit
      const grossProfit = incomeStatement.margins?.gross_margin?.gaap?.gross_profit || 0;
      
      // Extract cash flow data (handle different structures)
      let operatingCashFlow = 0;
      let freeCashFlow = 0;
      
      // Try different cash flow structures
      if (report.cash_flow) {
        // Q1 2024 structure
        if (report.cash_flow.operating_cash_flow) {
          operatingCashFlow = report.cash_flow.operating_cash_flow;
        }
        if (report.cash_flow.free_cash_flow) {
          freeCashFlow = report.cash_flow.free_cash_flow;
        }
        
        // Q2-Q4 2024 structure - free_cash_flow directly under financial_report
        if (report.free_cash_flow?.value) {
          freeCashFlow = report.free_cash_flow.value;
        }
        
        // Q2-Q4 2024 structure for operating cash flow
        if (report.cash_flow.cash_flow_from_operations?.total_operating_cash_flow?.value) {
          operatingCashFlow = report.cash_flow.cash_flow_from_operations.total_operating_cash_flow.value;
        }
        
        // Try metrics structure for operating cash flow (Q2-Q4)
        if (report.metrics?.key_metrics?.operating_cash_flow_margin?.components?.operating_cash_flow) {
          operatingCashFlow = report.metrics.key_metrics.operating_cash_flow_margin.components.operating_cash_flow;
        }
        
        // Try Q2-Q4 2024 structure (fallback)
        if (report.cash_flow.cash_flow_from_operations?.total_operating_cash_flow?.value) {
          operatingCashFlow = report.cash_flow.cash_flow_from_operations.total_operating_cash_flow.value;
        }
      }
      
      // Try key_metrics structure for free cash flow
      if (report.key_metrics?.free_cash_flow?.value) {
        freeCashFlow = report.key_metrics.free_cash_flow.value;
      }
      
      // Calculate cash flow margin as operating cash flow / revenue
      const cashFlowMargin = revenue > 0 ? (operatingCashFlow / revenue) * 100 : 0;
      
      return {
        revenue,
        profit,
        margin,
        growth,
        netIncome,
        grossMargin,
        grossProfit,
        operatingCashFlow,
        freeCashFlow,
        cashFlowMargin
      };
    } catch (error) {
      console.error('Error extracting financial metrics:', error.message);
      return null;
    }
  }

  // Cleanup expired cache entries
  cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) return; // Only cleanup once per minute
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
    
    this.lastCleanup = now;
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const financialDataCache = new FinancialDataCache();

// Clear cache on module load to ensure fresh data extraction
financialDataCache.clear(); 