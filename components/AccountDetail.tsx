import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction } from '../types';
import { ArrowLeft, BarChart3, Edit2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
    format, addDays, subDays, addMonths, subMonths, addYears, subYears,
    isSameDay, isSameMonth, isSameYear, startOfYear, endOfYear, startOfMonth, endOfMonth,
    parseISO
} from 'date-fns';

interface AccountDetailProps {
  account: Account;
  transactions: Transaction[];
  onBack: () => void;
  onEdit: (account: Account) => void;
  onViewStats: (account: Account) => void;
}

type ViewMode = 'DAILY' | 'MONTHLY' | 'ANNUALLY';

const AccountDetail: React.FC<AccountDetailProps> = ({ account, transactions, onBack, onEdit, onViewStats }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTHLY');
  const [cursorDate, setCursorDate] = useState(new Date());

  // Reset cursor when account changes
  useEffect(() => {
      setCursorDate(new Date());
  }, [account.id]);

  // --- 1. Calculate Running Balance & Process Transactions ---
  const processedData = useMemo(() => {
    // A. Filter transactions for this account ONLY
    const accountTx = transactions.filter(t => 
        t.accountId === account.id || t.toAccountId === account.id
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Newest First

    // B. Calculate Running Balance (Reverse Engineering)
    let currentBalance = account.balance;
    
    return accountTx.map(tx => {
        const txDate = new Date(tx.date);
        const isTransferOut = tx.type === 'TRANSFER' && tx.accountId === account.id;
        const isTransferIn = tx.type === 'TRANSFER' && tx.toAccountId === account.id;
        
        let amountEffect = 0;
        if (tx.type === 'INCOME') amountEffect = tx.amount;
        else if (tx.type === 'EXPENSE') amountEffect = -tx.amount;
        else if (isTransferOut) amountEffect = -(tx.amount + (tx.fees || 0));
        else if (isTransferIn) amountEffect = tx.amount;

        const balanceAfter = currentBalance;
        currentBalance = currentBalance - amountEffect;

        return { ...tx, balanceAfter, amountEffect, dateObj: txDate };
    });
  }, [account, transactions]);

  // --- 2. Filter Data based on View Mode & Cursor ---
  const filteredData = useMemo(() => {
    return processedData.filter(tx => {
        if (viewMode === 'DAILY') return isSameDay(tx.dateObj, cursorDate);
        if (viewMode === 'MONTHLY') return isSameMonth(tx.dateObj, cursorDate);
        if (viewMode === 'ANNUALLY') return isSameYear(tx.dateObj, cursorDate);
        return false;
    });
  }, [processedData, viewMode, cursorDate]);

  // --- 3. Calculate Summaries ---
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    filteredData.forEach(tx => {
        if (tx.amountEffect > 0) income += tx.amountEffect;
        else expense += Math.abs(tx.amountEffect);
    });

    return { income, expense, total: income - expense };
  }, [filteredData]);

  // --- 4. Grouping Logic ---
  const groupedTransactions = useMemo(() => {
      const groups: Record<string, typeof filteredData> = {};
      filteredData.forEach(tx => {
          // If Annually, group by Month. If Monthly/Daily, group by Day.
          const dateKey = viewMode === 'ANNUALLY' 
            ? format(tx.dateObj, 'yyyy-MM') 
            : format(tx.dateObj, 'yyyy-MM-dd');
          
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(tx);
      });
      return groups;
  }, [filteredData, viewMode]);

  // --- 5. Navigation Handlers ---
  const handlePrev = () => {
      if (viewMode === 'DAILY') setCursorDate(d => subDays(d, 1));
      if (viewMode === 'MONTHLY') setCursorDate(d => subMonths(d, 1));
      if (viewMode === 'ANNUALLY') setCursorDate(d => subYears(d, 1));
  };

  const handleNext = () => {
      if (viewMode === 'DAILY') setCursorDate(d => addDays(d, 1));
      if (viewMode === 'MONTHLY') setCursorDate(d => addMonths(d, 1));
      if (viewMode === 'ANNUALLY') setCursorDate(d => addYears(d, 1));
  };

  const getDisplayLabel = () => {
      if (viewMode === 'DAILY') return format(cursorDate, 'dd MMM yyyy');
      if (viewMode === 'MONTHLY') return format(cursorDate, 'MMMM yyyy');
      if (viewMode === 'ANNUALLY') return format(cursorDate, 'yyyy');
      return '';
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: account.currency || 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
      {/* --- HEADER --- */}
      <div className="bg-surface border-b border-white/10 sticky top-0 z-20 shadow-lg">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-gray-300">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white leading-tight">{account.name}</h1>
                    <span className="text-gray-500">-</span>
                    <span className="text-sm text-gray-400 font-medium">{account.group}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onViewStats(account)} className="p-2 rounded-full hover:bg-white/10 text-gray-300" title="Statistics">
                    <BarChart3 className="w-5 h-5" />
                </button>
                <button onClick={() => onEdit(account)} className="p-2 rounded-full hover:bg-white/10 text-gray-300" title="Edit Account">
                    <Edit2 className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* --- TABS --- */}
          <div className="grid grid-cols-3 px-4 mb-3 gap-1">
              {(['DAILY', 'MONTHLY', 'ANNUALLY'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`text-xs font-bold py-2 rounded-lg transition-colors ${
                        viewMode === mode 
                        ? 'bg-white/10 text-primary' 
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                      {mode === 'ANNUALLY' ? 'Yearly' : mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </button>
              ))}
          </div>

          {/* --- NAVIGATOR SLIDER --- */}
          <div className="flex items-center justify-between px-4 pb-4">
             <button onClick={handlePrev} className="p-1 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronLeft className="w-6 h-6"/></button>
             <span className="text-white font-bold text-lg select-none">{getDisplayLabel()}</span>
             <button onClick={handleNext} className="p-1 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronRight className="w-6 h-6"/></button>
          </div>

          {/* --- SUMMARY ROW --- */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-[#27272a] text-xs border-b border-white/10">
              <div className="text-center">
                  <div className="text-gray-400 mb-1">In</div>
                  <div className="text-blue-400 font-bold truncate">{formatCurrency(summary.income)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">Out</div>
                  <div className="text-red-400 font-bold truncate">{formatCurrency(summary.expense)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">Change</div>
                  <div className={`${summary.total >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold truncate`}>
                      {summary.total > 0 ? '+' : ''}{formatCurrency(summary.total)}
                  </div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">End Balance</div>
                  {/* Show latest balance of period, or fallback */}
                  <div className="text-gray-200 font-bold truncate">
                      {filteredData.length > 0 
                        ? formatCurrency(filteredData[0].balanceAfter) 
                        : '-' 
                      }
                  </div>
              </div>
          </div>
      </div>

      {/* --- TRANSACTION LIST --- */}
      <div className="flex-1">
        {Object.keys(groupedTransactions).length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-gray-500 opacity-50">
                <CalendarIcon className="w-12 h-12 mb-2" />
                <p>No transactions found</p>
                <p className="text-xs mt-1">{getDisplayLabel()}</p>
            </div>
        ) : (
            Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
                const dayTx = groupedTransactions[dateKey];
                // Group totals
                const dayIncome = dayTx.reduce((sum, t) => t.amountEffect > 0 ? sum + t.amountEffect : sum, 0);
                const dayExpense = dayTx.reduce((sum, t) => t.amountEffect < 0 ? sum + Math.abs(t.amountEffect) : sum, 0);
                
                // Date formatting for group header
                const dateObj = viewMode === 'ANNUALLY' ? parseISO(dateKey + '-01') : parseISO(dateKey);
                const dayLabel = viewMode === 'ANNUALLY' ? format(dateObj, 'MMMM yyyy') : format(dateObj, 'dd');
                const subLabel = viewMode === 'ANNUALLY' ? '' : format(dateObj, 'EEE, MMM yyyy');

                return (
                    <div key={dateKey}>
                        {/* GROUP HEADER */}
                        <div className="bg-[#18181b] px-4 py-2 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-white">{dayLabel}</span>
                                {subLabel && (
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] text-gray-500 font-medium uppercase">{subLabel}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 text-xs">
                                {dayIncome > 0 && <span className="text-blue-400">{formatCurrency(dayIncome)}</span>}
                                {dayExpense > 0 && <span className="text-red-400">{formatCurrency(dayExpense)}</span>}
                            </div>
                        </div>

                        {/* ROWS */}
                        {dayTx.map(tx => (
                            <div key={tx.id} className="px-4 py-3 bg-surface border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    <span className="text-sm font-medium text-gray-200 truncate pr-2">{tx.category || tx.type}</span>
                                    {tx.notes && <span className="text-xs text-gray-500 truncate">{tx.notes}</span>}
                                    <span className="text-[10px] text-gray-600">
                                        {tx.type === 'TRANSFER' ? (tx.amountEffect > 0 ? 'Transfer In' : 'Transfer Out') : tx.type}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`font-bold text-sm ${tx.amountEffect > 0 ? 'text-blue-400' : 'text-gray-200'}`}>
                                        {formatCurrency(tx.amountEffect)}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                        {formatCurrency(tx.balanceAfter)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default AccountDetail;