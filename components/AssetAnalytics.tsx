import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, AccountOwner } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, 
  parseISO, format, differenceInDays, isSameDay, subDays, isAfter, isBefore, addDays,
  addWeeks, subWeeks, addMonths, subMonths, addYears, subYears
} from 'date-fns';
import { Calendar, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export type AnalyticsScope = 
  | { type: 'GLOBAL' }
  | { type: 'OWNER'; owner: AccountOwner }
  | { type: 'ACCOUNT'; accountId: string };

interface AssetAnalyticsProps {
  transactions: Transaction[];
  accounts: Account[];
  onBack: () => void;
  scope?: AnalyticsScope;
}

type RangeType = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

const AssetAnalytics: React.FC<AssetAnalyticsProps> = ({ transactions, accounts, onBack, scope: incomingScope }) => {
  const [range, setRange] = useState<RangeType>('MONTH');
  const [cursorDate, setCursorDate] = useState(new Date()); // Controls the navigation cursor
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Ensure scope is handled correctly with default value for type narrowing
  const scope: AnalyticsScope = incomingScope || { type: 'GLOBAL' };

  // Reset cursor when switching range types
  useEffect(() => {
    setCursorDate(new Date());
  }, [range]);

  // Get Title based on scope
  const chartTitle = useMemo(() => {
      if (scope.type === 'ACCOUNT') {
          return accounts.find(a => a.id === scope.accountId)?.name || 'Account';
      }
      if (scope.type === 'OWNER') {
          return `${scope.owner === 'Husband' ? "Husband's" : "Wife's"} Assets`;
      }
      return 'Total Net Worth';
  }, [scope, accounts]);

  // --- 1. Calculate Real-Time Balance (FIXED) ---
  // Always calculates the SUM of current account balances, regardless of chart history.
  const currentRealTimeBalance = useMemo(() => {
      let targetAccounts = accounts;
      if (scope.type === 'ACCOUNT') {
          const s = scope;
          targetAccounts = accounts.filter(a => a.id === s.accountId);
      } else if (scope.type === 'OWNER') {
          const s = scope;
          targetAccounts = accounts.filter(a => a.owner === s.owner);
      }
      return targetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts, scope]);


  // --- 2. Determine Date Range based on Cursor ---
  const { startDate, endDate, dateLabel } = useMemo(() => {
    let start: Date, end: Date, label = '';

    switch (range) {
      case 'WEEK':
        start = startOfWeek(cursorDate, { weekStartsOn: 1 });
        end = endOfWeek(cursorDate, { weekStartsOn: 1 });
        // Label format: "20 Jan - 26 Jan"
        label = `${format(start, 'd MMM')} - ${format(end, 'd MMM')}`;
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
        start = new Date(transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());
        end = new Date();
        label = 'Lifetime';
        break;
      case 'CUSTOM':
        start = parseISO(customStart);
        end = parseISO(customEnd);
        end.setHours(23, 59, 59, 999);
        label = 'Custom Range';
        break;
      default:
        start = startOfMonth(cursorDate);
        end = endOfMonth(cursorDate);
        label = format(cursorDate, 'MMMM yyyy');
    }
    return { startDate: start, endDate: end, dateLabel: label };
  }, [range, cursorDate, customStart, customEnd, transactions]);

  // --- 3. Navigation Handlers ---
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


  // --- 4. Calculate Historical Assets (Reverse Engineering) ---
  const chartData = useMemo(() => {
    // A. Filter Accounts based on Scope
    let targetAccounts = accounts;
    if (scope.type === 'ACCOUNT') {
        const s = scope; 
        targetAccounts = accounts.filter(a => a.id === s.accountId);
    } else if (scope.type === 'OWNER') {
        const s = scope;
        targetAccounts = accounts.filter(a => a.owner === s.owner);
    }

    // B. Setup Snapshot Map for "Current" state
    const balances = new Map<string, number>();
    targetAccounts.forEach(acc => balances.set(acc.id, acc.balance));

    // C. Create an array of all days in the range
    const days: Date[] = [];
    let currentDay = new Date(startDate);
    currentDay.setHours(0,0,0,0);
    const endMark = new Date(endDate);
    endMark.setHours(23,59,59,999);

    // Limit huge ranges
    if (differenceInDays(endMark, currentDay) > 3650) { 
        currentDay = subDays(endMark, 3650);
    }

    while (currentDay <= endMark) {
      days.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    // D. Sort transactions descending (Newest first)
    const sortedTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // E. Helper to calculate "Total Assets" from current balances map
    const getTotalAssets = () => {
        let total = 0;
        balances.forEach((bal) => total += bal);
        return total;
    };

    const dataPoints: { date: string; value: number; displayDate: string }[] = [];
    
    // Cursor for transactions (Starting from NOW/TODAY and moving backwards)
    let currentDateCursor = new Date();
    currentDateCursor.setHours(23, 59, 59, 999);

    // Store daily states
    const dailyStates = new Map<string, number>();
    dailyStates.set(format(currentDateCursor, 'yyyy-MM-dd'), getTotalAssets());

    // Walk backwards through transactions to build history
    for (const tx of sortedTx) {
        // Skip transactions that don't involve the tracked accounts
        const affectsTrackedAccounts = balances.has(tx.accountId) || (tx.toAccountId && balances.has(tx.toAccountId));
        if (!affectsTrackedAccounts) continue;

        const txDate = parseISO(tx.date);
        
        // Fill gaps between transaction dates
        while (differenceInDays(currentDateCursor, txDate) > 0) {
            currentDateCursor = subDays(currentDateCursor, 1);
            dailyStates.set(format(currentDateCursor, 'yyyy-MM-dd'), getTotalAssets());
        }

        // REVERSE Transaction Logic (Undo the transaction to find previous balance)
        if (balances.has(tx.accountId)) {
             const currentBal = balances.get(tx.accountId) || 0;
             if (tx.type === 'INCOME') balances.set(tx.accountId, currentBal - tx.amount);
             else if (tx.type === 'EXPENSE') balances.set(tx.accountId, currentBal + tx.amount);
             else if (tx.type === 'TRANSFER' && tx.toAccountId) {
                balances.set(tx.accountId, currentBal + tx.amount + (tx.fees || 0));
             }
        }
        if (tx.toAccountId && balances.has(tx.toAccountId)) {
             const toBal = balances.get(tx.toAccountId) || 0;
             if (tx.type === 'TRANSFER') {
                 balances.set(tx.toAccountId, toBal - tx.amount);
             }
        }
    }

    // Fill remaining days back to start date
    let minDate = startDate;
    minDate.setHours(0,0,0,0);
    
    while (currentDateCursor > minDate) {
         currentDateCursor = subDays(currentDateCursor, 1);
         dailyStates.set(format(currentDateCursor, 'yyyy-MM-dd'), getTotalAssets());
    }

    // Map the requested range to the calculated states
    return days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        // If day is in future compared to now, just show current real time balance (flat line) or null
        if (isAfter(day, new Date())) {
            // Optional: return null or last known value. We'll return last known.
             return {
                date: key,
                displayDate: range === 'YEAR' || range === 'ALL' ? format(day, 'MMM') : format(day, 'd MMM'),
                value: currentRealTimeBalance
            };
        }

        let val = dailyStates.get(key);
        // If undefined (e.g. range is way back before transactions started), assume 0 (or start balance)
        if (val === undefined) val = 0; 

        return {
            date: key,
            displayDate: range === 'YEAR' || range === 'ALL' ? format(day, 'MMM') : format(day, 'd MMM'),
            value: val || 0
        };
    });

  }, [accounts, transactions, startDate, endDate, range, scope, currentRealTimeBalance]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(val);

  return (
    <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
       {/* HEADER */}
       <div className="bg-surface border-b border-white/10 p-4 sticky top-0 z-20 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-gray-300">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold text-white">{chartTitle} Growth</h1>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
            {(['WEEK', 'MONTH', 'YEAR', 'ALL', 'CUSTOM'] as RangeType[]).map((r) => (
                <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    range === r 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                >
                {r === 'ALL' ? 'LIFETIME' : r}
                </button>
            ))}
            </div>

            {range === 'CUSTOM' && (
            <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg animate-in slide-in-from-top-2">
                <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-white text-sm outline-none border-b border-gray-600 focus:border-blue-500 px-1 w-full"
                />
                <span className="text-gray-500">-</span>
                <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-white text-sm outline-none border-b border-gray-600 focus:border-blue-500 px-1 w-full"
                />
            </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                    {(range !== 'ALL' && range !== 'CUSTOM') && (
                        <button onClick={handlePrev} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                    <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2 px-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {dateLabel}
                    </h2>
                    {(range !== 'ALL' && range !== 'CUSTOM') && (
                        <button onClick={handleNext} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="text-right">
                    <div className="text-xs text-gray-400">Current Balance</div>
                    <div className={`text-lg font-bold ${currentRealTimeBalance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {formatCurrency(currentRealTimeBalance)}
                    </div>
                </div>
            </div>
       </div>

       {/* CHART */}
       <div className="flex-1 p-4 min-h-[400px]">
           <div className="h-[350px] w-full bg-surface rounded-2xl p-4 border border-white/10 shadow-lg">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                        dataKey="displayDate" 
                        axisLine={false} 
                        tickLine={false} 
                        stroke="#71717a" 
                        fontSize={10} 
                        minTickGap={30}
                    />
                    <YAxis 
                        hide={false}
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={formatCurrency} 
                        stroke="#71717a" 
                        fontSize={10} 
                        width={60}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#60a5fa' }}
                        formatter={(val: number) => [formatCurrency(val), 'Balance']}
                        labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                    />
                </AreaChart>
              </ResponsiveContainer>
           </div>
       </div>
    </div>
  );
};

export default AssetAnalytics;