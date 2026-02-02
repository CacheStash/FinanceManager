import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Account, AccountOwner } from '../types';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  isWithinInterval, parseISO, addDays, subDays, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, subYears
} from 'date-fns';

interface ReportsProps {
  transactions: Transaction[];
  accounts: Account[];
  lang?: 'en' | 'id';
}

type DateRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'CUSTOM';

const CHART_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

const Reports: React.FC<ReportsProps> = ({ transactions, accounts, lang = 'en' }) => {
  const [ownerFilter, setOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [dateRange, setDateRange] = useState<DateRange>('MONTHLY');
  const [cursorDate, setCursorDate] = useState(new Date()); 
  
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => { setCursorDate(new Date()); }, [dateRange]);

  const t = (key: string) => {
    const dict: any = {
      'All': lang === 'en' ? 'Joint' : 'Gabungan',
      'Husband': lang === 'en' ? 'Husband' : 'Suami',
      'Wife': lang === 'en' ? 'Wife' : 'Istri',
      'DAILY': lang === 'en' ? 'Daily' : 'Harian',
      'WEEKLY': lang === 'en' ? 'Weekly' : 'Mingguan',
      'MONTHLY': lang === 'en' ? 'Monthly' : 'Bulanan',
      'YEARLY': lang === 'en' ? 'Yearly' : 'Tahunan',
      'LIFETIME': lang === 'en' ? 'All Time' : 'Semua',
      'CUSTOM': lang === 'en' ? 'Custom' : 'Kustom',
    };
    return dict[key] || key;
  };

  const formatCurrency = (amount: number) => {
     if (Math.abs(amount) >= 1_000_000_000) {
         return 'Rp ' + (amount / 1_000_000_000).toFixed(1) + ' M'; // Milyar
     }
     if (Math.abs(amount) >= 1_000_000) {
         return 'Rp ' + (amount / 1_000_000).toFixed(1) + ' jt'; // Juta
     }
     return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  }

  // --- 1. DATE LOGIC ---
  const { start, end, label } = useMemo(() => {
    let s: Date, e: Date, l = '';
    switch (dateRange) {
        case 'DAILY': s = startOfDay(cursorDate); e = endOfDay(cursorDate); l = format(cursorDate, 'dd MMMM yyyy'); break;
        case 'WEEKLY': s = startOfWeek(cursorDate, { weekStartsOn: 1 }); e = endOfWeek(cursorDate, { weekStartsOn: 1 }); l = `${format(s, 'dd MMM')} - ${format(e, 'dd MMM yyyy')}`; break;
        case 'MONTHLY': s = startOfMonth(cursorDate); e = endOfMonth(cursorDate); l = format(cursorDate, 'MMMM yyyy'); break;
        case 'YEARLY': s = startOfYear(cursorDate); e = endOfYear(cursorDate); l = format(cursorDate, 'yyyy'); break;
        case 'CUSTOM': s = parseISO(customStart); e = parseISO(customEnd); e.setHours(23, 59, 59, 999); l = 'Custom Range'; break;
        case 'LIFETIME': default: s = new Date(0); e = new Date(8640000000000000); l = 'Lifetime'; break;
    }
    return { start: s, end: e, label: l };
  }, [dateRange, cursorDate, customStart, customEnd]);

  // --- 2. FILTER DATA ---
  const filteredData = useMemo(() => {
    return transactions.filter(tx => {
        let ownerMatch = true;
        if (ownerFilter !== 'All') {
            const account = accounts.find(a => a.id === tx.accountId);
            ownerMatch = account?.owner === ownerFilter;
        }
        const txDate = parseISO(tx.date);
        const dateMatch = isWithinInterval(txDate, { start, end });
        return ownerMatch && dateMatch;
    });
  }, [transactions, accounts, ownerFilter, start, end]);

  // --- 3. SUMMARY STATS ---
  const summary = useMemo(() => {
      let income = 0; let expense = 0;
      filteredData.forEach(tx => {
          if (tx.type === 'INCOME') income += tx.amount;
          if (tx.type === 'EXPENSE') expense += tx.amount;
      });
      return { income, expense, net: income - expense };
  }, [filteredData]);

  // --- 4. DATA PROCESSING FOR CHARTS ---
  const getCategoryBreakdown = (type: 'EXPENSE' | 'INCOME') => {
      const map = new Map<string, number>();
      
      // FILTER PENTING: Sembunyikan 'Adjustment' agar grafik tidak rusak karena nominal Milyaran
      filteredData
        .filter(t => t.type === type && t.category !== 'Adjustment') 
        .forEach(t => {
            const cat = t.category;
            map.set(cat, (map.get(cat) || 0) + t.amount);
        });

      const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
      
      const sorted = Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, value], index) => ({
              name,
              value,
              percent: total > 0 ? (value / total) * 100 : 0,
              color: CHART_COLORS[index % CHART_COLORS.length]
          }));

      if (sorted.length > 5) {
          const top5 = sorted.slice(0, 5);
          const others = sorted.slice(5);
          const otherValue = others.reduce((s, i) => s + i.value, 0);
          return [
              ...top5, 
              { 
                  name: 'Other', 
                  value: otherValue, 
                  percent: total > 0 ? (otherValue / total) * 100 : 0, 
                  color: '#64748b' 
              }
          ];
      }
      return sorted;
  };

  const expenseBreakdown = useMemo(() => getCategoryBreakdown('EXPENSE'), [filteredData]);
  const incomeBreakdown = useMemo(() => getCategoryBreakdown('INCOME'), [filteredData]);

  // Helper CSS Conic Gradient (Agar Pie Chart Smooth & Stabil)
  const getConicGradient = (data: typeof expenseBreakdown) => {
      if (data.length === 0) return 'conic-gradient(#333 0% 100%)'; 
      
      let currentDeg = 0;
      const stops = data.map(item => {
          const start = currentDeg;
          const end = currentDeg + (item.percent * 360 / 100);
          currentDeg = end;
          return `${item.color} ${start}deg ${end}deg`;
      });
      return `conic-gradient(${stops.join(', ')})`;
  };

  const handlePrev = () => {
      if (dateRange === 'DAILY') setCursorDate(d => subDays(d, 1));
      if (dateRange === 'WEEKLY') setCursorDate(d => subWeeks(d, 1));
      if (dateRange === 'MONTHLY') setCursorDate(d => subMonths(d, 1));
      if (dateRange === 'YEARLY') setCursorDate(d => subYears(d, 1));
  };

  const handleNext = () => {
      if (dateRange === 'DAILY') setCursorDate(d => addDays(d, 1));
      if (dateRange === 'WEEKLY') setCursorDate(d => addWeeks(d, 1));
      if (dateRange === 'MONTHLY') setCursorDate(d => addMonths(d, 1));
      if (dateRange === 'YEARLY') setCursorDate(d => addYears(d, 1));
  };

  const showSlider = dateRange !== 'LIFETIME' && dateRange !== 'CUSTOM';

  return (
    <div className="space-y-6">
      
      {/* 1. FILTERS (FULL WIDTH) */}
      <div className="bg-surface p-4 rounded-2xl border border-white/10 space-y-4">
          {/* Owner Filter: Full Width */}
          <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full">
                {(['All', 'Husband', 'Wife'] as const).map(filter => (
                    <button key={filter} onClick={() => setOwnerFilter(filter)} className={`flex-1 py-1.5 rounded-md transition-all ${ownerFilter === filter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t(filter)}</button>
                ))}
          </div>

          {/* Date Filter: Full Width & Flex-1 */}
          <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full gap-1 overflow-x-auto">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'LIFETIME', 'CUSTOM'] as DateRange[]).map(r => (
                    <button 
                        key={r} 
                        onClick={() => setDateRange(r)} 
                        className={`flex-1 px-1 py-1.5 rounded-md transition-all whitespace-nowrap text-[10px] sm:text-xs ${
                            dateRange === r 
                            ? 'bg-white/10 text-white shadow' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {t(r)}
                    </button>
                ))}
          </div>

          {dateRange === 'CUSTOM' && (
              <div className="flex gap-2 items-center animate-in slide-in-from-top-2">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary" />
                  <span className="text-gray-500">-</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary" />
              </div>
          )}

          {showSlider && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-1.5 animate-in slide-in-from-top-2">
                <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-white text-sm select-none">{label}</span>
                <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}

          {/* Net Period Strip */}
          <div className={`p-3 rounded-xl border border-white/5 text-center font-bold text-sm ${summary.net >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              NET PERIOD: {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
          </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-full"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
                  <span className="text-xs text-gray-400 uppercase font-bold">Total Income</span>
              </div>
              <span className="text-xl font-bold text-emerald-400">{formatCurrency(summary.income)}</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-rose-500/10 rounded-full"><TrendingDown className="w-4 h-4 text-rose-500" /></div>
                  <span className="text-xs text-gray-400 uppercase font-bold">Total Expense</span>
              </div>
              <span className="text-xl font-bold text-rose-400">{formatCurrency(summary.expense)}</span>
          </div>
      </div>

      {/* 3. CHARTS GRID (3 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* A. EXPENSE BREAKDOWN */}
          <div className="bg-surface p-5 rounded-2xl border border-white/10 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                  <PieIcon className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-white text-sm">Expense Breakdown</h3>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                  {expenseBreakdown.length > 0 ? (
                      <div className="relative w-40 h-40 rounded-full shadow-xl" style={{ background: getConicGradient(expenseBreakdown) }}>
                          {/* Inner Circle for Donut Effect */}
                          <div className="absolute inset-4 bg-surface rounded-full flex items-center justify-center flex-col">
                              {/* Total disini menampilkan Total Filtered (Non-Adjustment) */}
                              <span className="text-[10px] text-gray-500">Real Spend</span>
                              <span className="text-xs font-bold text-white">
                                  {formatCurrency(expenseBreakdown.reduce((a,b)=>a+b.value,0))}
                              </span>
                          </div>
                      </div>
                  ) : (
                      <div className="text-gray-500 text-xs">No data (excluding adjustments)</div>
                  )}
              </div>

              <div className="mt-6 space-y-2">
                  {expenseBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{formatCurrency(item.value)}</span>
                              <span className="text-gray-500 text-[10px] w-8 text-right">{item.percent.toFixed(1)}%</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* B. INCOME BREAKDOWN (NEW) */}
          <div className="bg-surface p-5 rounded-2xl border border-white/10 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                  <PieIcon className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-white text-sm">Income Breakdown</h3>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                  {incomeBreakdown.length > 0 ? (
                      <div className="relative w-40 h-40 rounded-full shadow-xl" style={{ background: getConicGradient(incomeBreakdown) }}>
                          <div className="absolute inset-4 bg-surface rounded-full flex items-center justify-center flex-col">
                              <span className="text-[10px] text-gray-500">Real Income</span>
                              <span className="text-xs font-bold text-white">
                                  {formatCurrency(incomeBreakdown.reduce((a,b)=>a+b.value,0))}
                              </span>
                          </div>
                      </div>
                  ) : (
                      <div className="text-gray-500 text-xs">No data (excluding adjustments)</div>
                  )}
              </div>

              <div className="mt-6 space-y-2">
                  {incomeBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{formatCurrency(item.value)}</span>
                              <span className="text-gray-500 text-[10px] w-8 text-right">{item.percent.toFixed(1)}%</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* C. CASHFLOW (SIMPLE BAR) */}
          <div className="bg-surface p-5 rounded-2xl border border-white/10 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-white text-sm">Cashflow</h3>
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div> Income
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <div className="w-2 h-2 bg-rose-500 rounded-sm"></div> Expense
                  </div>
              </div>

              <div className="flex-1 flex items-end justify-center gap-8 min-h-[200px] border-b border-white/5 pb-2">
                  {/* Income Bar */}
                  <div className="flex flex-col items-center gap-2 group w-16">
                      <span className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(summary.income)}
                      </span>
                      <div 
                          className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 hover:bg-emerald-400"
                          style={{ 
                              height: summary.income > 0 && summary.income > summary.expense 
                                  ? '150px' 
                                  : `${(summary.income / (Math.max(summary.income, summary.expense) || 1)) * 150}px` 
                          }}
                      ></div>
                  </div>

                  {/* Expense Bar */}
                  <div className="flex flex-col items-center gap-2 group w-16">
                      <span className="text-[10px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(summary.expense)}
                      </span>
                      <div 
                          className="w-full bg-rose-500 rounded-t-lg transition-all duration-500 hover:bg-rose-400"
                          style={{ 
                              height: summary.expense > 0 && summary.expense > summary.income
                                  ? '150px' 
                                  : `${(summary.expense / (Math.max(summary.income, summary.expense) || 1)) * 150}px` 
                          }}
                      ></div>
                  </div>
              </div>
              <div className="flex justify-between px-8 pt-2 text-xs text-gray-500">
                  <span>In</span>
                  <span>Out</span>
              </div>
          </div>

      </div>
    </div>
  );
};

export default Reports;