import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, AccountOwner } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import GlobalMarketStats from './GlobalMarketStats';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, 
  isWithinInterval, parseISO, format, differenceInDays, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, subYears
} from 'date-fns';
import { Calendar, UserCircle2, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  accounts: Account[];
  lang?: 'en' | 'id';
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366f1', '#14b8a6'];

type RangeType = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

const Reports: React.FC<ReportsProps> = ({ transactions, accounts, lang = 'en' }) => {
  const [range, setRange] = useState<RangeType>('MONTH');
  const [ownerFilter, setOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [cursorDate, setCursorDate] = useState(new Date());

  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Reset cursor on range change
  useEffect(() => {
    setCursorDate(new Date());
  }, [range]);

  // Translations helper
  const t = (key: string) => {
    const dict: any = {
        'All': lang === 'en' ? 'Joint' : 'Gabungan',
        'Husband': lang === 'en' ? 'Husband' : 'Suami',
        'Wife': lang === 'en' ? 'Wife' : 'Istri',
        'Income': lang === 'en' ? 'Total Income' : 'Total Pemasukan',
        'Expense': lang === 'en' ? 'Total Expense' : 'Total Pengeluaran',
        'Breakdown': lang === 'en' ? 'Expense Breakdown' : 'Rincian Pengeluaran',
        'Cashflow': lang === 'en' ? 'Cashflow' : 'Arus Kas',
        'NoData': lang === 'en' ? 'No data for this period' : 'Tidak ada data',
    };
    return dict[key] || key;
  };

  // --- 1. Filter Transactions based on Range AND Owner AND Cursor ---
  const { filteredTransactions, dateLabel, start, end } = useMemo(() => {
    let start: Date, end: Date;
    let label = '';

    switch (range) {
      case 'WEEK':
        start = startOfWeek(cursorDate, { weekStartsOn: 1 }); // Monday start
        end = endOfWeek(cursorDate, { weekStartsOn: 1 });
        label = `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
        break;
      case 'MONTH':
        start = startOfMonth(cursorDate);
        end = endOfMonth(cursorDate);
        label = format(cursorDate, 'MMMM yyyy');
        break;
      case 'YEAR':
        start = startOfYear(cursorDate);
        end = endOfYear(cursorDate);
        label = format(cursorDate, 'yyyy');
        break;
      case 'ALL':
        start = new Date(0); // Epoch
        end = new Date(8640000000000000); // Max date
        label = 'Lifetime';
        break;
      case 'CUSTOM':
        start = new Date(customStart);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        label = `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
        break;
      default:
        start = startOfMonth(cursorDate);
        end = endOfMonth(cursorDate);
        label = format(cursorDate, 'MMMM yyyy');
    }

    const filtered = transactions.filter(t => {
      // 1. Date Check
      const tDate = parseISO(t.date);
      const inDate = isWithinInterval(tDate, { start, end });
      if (!inDate) return false;

      // 2. Owner Check
      if (ownerFilter === 'All') return true;
      const acc = accounts.find(a => a.id === t.accountId);
      return acc?.owner === ownerFilter;
    });

    return { filteredTransactions: filtered, dateLabel: label, start, end };
  }, [range, ownerFilter, transactions, accounts, customStart, customEnd, cursorDate]);

  // --- 2. Navigation Handlers ---
  const handlePrev = () => {
    if (range === 'WEEK') setCursorDate(d => subWeeks(d, 1));
    if (range === 'MONTH') setCursorDate(d => subMonths(d, 1));
    if (range === 'YEAR') setCursorDate(d => subYears(d, 1));
  };

  const handleNext = () => {
    if (range === 'WEEK') setCursorDate(d => addWeeks(d, 1));
    if (range === 'MONTH') setCursorDate(d => addMonths(d, 1));
    if (range === 'YEAR') setCursorDate(d => addYears(d, 1));
  };

  const showSlider = range !== 'ALL' && range !== 'CUSTOM';

  // --- 3. Calculate Totals for Header ---
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'INCOME') income += t.amount;
      if (t.type === 'EXPENSE') expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  // --- 4. Category Breakdown (Pie Chart) ---
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');
    const categories: Record<string, number> = {};
    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.keys(categories).map(key => ({
      name: key,
      value: categories[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // --- 5. Cashflow (Bar Chart) - Dynamic Grouping ---
  const cashflowData = useMemo(() => {
    const data: Record<string, { income: number, expense: number, sortDate: number }> = {};
    
    // Determine grouping strategy
    let isDaily = false;
    if (range === 'WEEK' || range === 'MONTH') isDaily = true;
    if (range === 'CUSTOM') {
       const diff = differenceInDays(new Date(customEnd), new Date(customStart));
       if (diff <= 62) isDaily = true; // Show daily if range is roughly 2 months or less
    }

    filteredTransactions.forEach(t => {
      const date = parseISO(t.date);
      let key = '';
      let sortDate = 0;

      if (isDaily) {
        key = format(date, 'd MMM'); // "12 Jan"
        const d = new Date(date); d.setHours(0,0,0,0);
        sortDate = d.getTime();
      } else {
        key = format(date, 'MMM yyyy'); // "Jan 2024"
        const d = startOfMonth(date);
        sortDate = d.getTime();
      }
      
      if (!data[key]) data[key] = { income: 0, expense: 0, sortDate };
      
      if (t.type === 'INCOME') data[key].income += t.amount;
      if (t.type === 'EXPENSE') data[key].expense += t.amount;
    });

    return Object.keys(data)
      .map(key => ({
        name: key,
        Income: data[key].income,
        Expense: data[key].expense,
        sortDate: data[key].sortDate
      }))
      .sort((a, b) => a.sortDate - b.sortDate);
  }, [filteredTransactions, range, customStart, customEnd]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(val);

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- FILTER CONTROLS --- */}
      <div className="bg-surface p-4 rounded-xl border border-white/10 sticky top-0 z-20 shadow-lg">
        {/* Owner Toggle */}
        <div className="flex justify-center mb-4">
            <div className="flex bg-black/20 p-1 rounded-xl w-full max-w-sm">
                {(['All', 'Husband', 'Wife'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setOwnerFilter(f)}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            ownerFilter === f 
                            ? (f === 'Husband' ? 'bg-indigo-600 text-white shadow-md' : f === 'Wife' ? 'bg-pink-600 text-white shadow-md' : 'bg-primary text-white shadow-md')
                            : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {f === 'All' ? <Users className="w-3 h-3" /> : <UserCircle2 className="w-3 h-3" />}
                        {t(f)}
                    </button>
                ))}
            </div>
        </div>

        {/* Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
          {(['WEEK', 'MONTH', 'YEAR', 'ALL', 'CUSTOM'] as RangeType[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === r 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'LIFETIME' : r}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs */}
        {range === 'CUSTOM' && (
          <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg animate-in slide-in-from-top-2">
            <input 
              type="date" 
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-transparent text-white text-sm outline-none border-b border-gray-600 focus:border-primary px-1 w-full"
            />
            <span className="text-gray-500">-</span>
            <input 
              type="date" 
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-transparent text-white text-sm outline-none border-b border-gray-600 focus:border-primary px-1 w-full"
            />
          </div>
        )}

        {/* Navigation Slider */}
        {showSlider && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-1.5 mb-3 animate-in slide-in-from-top-1">
                <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 font-bold text-white text-sm select-none">
                     <Calendar className="w-4 h-4 text-gray-400" />
                     {dateLabel}
                </div>
                <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        )}

        {/* Total Summary */}
        <div className={`text-center py-1 rounded-lg ${totals.net >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <span className="text-xs uppercase font-bold mr-2">Net Period:</span>
            <span className="font-bold">{totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}</span>
        </div>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-white/10">
          <p className="text-xs text-gray-400 mb-1">{t('Income')}</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(totals.income)}</p>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-white/10">
          <p className="text-xs text-gray-400 mb-1">{t('Expense')}</p>
          <p className="text-lg font-bold text-rose-400">{formatCurrency(totals.expense)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- CATEGORY BREAKDOWN --- */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-white/10 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">{t('Breakdown')}</h3>
          <div className="h-[300px] w-full">
              {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                      >
                          {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip 
                          formatter={(value: number) => formatCurrency(value)} 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                      {t('NoData')}
                  </div>
              )}
          </div>
        </div>

        {/* --- CASHFLOW CHART --- */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-white/10 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">{t('Cashflow')}</h3>
          <div className="h-[300px] w-full">
             {cashflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#71717a" fontSize={12} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} stroke="#71717a" fontSize={12} />
                  <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
              </ResponsiveContainer>
             ) : (
               <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                  {t('NoData')}
              </div>
             )}
          </div>
        </div>
      </div>
      <GlobalMarketStats />
    </div>
  );
};

export default Reports;