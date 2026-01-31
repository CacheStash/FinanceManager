import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../types';
import { ArrowLeft, BarChart3, Edit2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';

interface AccountDetailProps {
  account: Account;
  transactions: Transaction[];
  onBack: () => void;
  onEdit: (account: Account) => void;
  onViewStats: (account: Account) => void;
}

const AccountDetail: React.FC<AccountDetailProps> = ({ account, transactions, onBack, onEdit, onViewStats }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- 1. Calculate Running Balance & Process Transactions ---
  const processedData = useMemo(() => {
    // A. Filter transactions for this account ONLY
    const accountTx = transactions.filter(t => 
        t.accountId === account.id || t.toAccountId === account.id
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Newest First

    // B. Calculate Running Balance (Reverse Engineering from Current Balance)
    // We start from current account balance and work backwards through the sorted transactions.
    let currentBalance = account.balance;
    
    const withRunningBalance = accountTx.map(tx => {
        const txDate = new Date(tx.date);
        const isTransferOut = tx.type === 'TRANSFER' && tx.accountId === account.id;
        const isTransferIn = tx.type === 'TRANSFER' && tx.toAccountId === account.id;
        
        // Determine the "Impact" of this transaction on the balance
        let amountEffect = 0;

        if (tx.type === 'INCOME') {
            amountEffect = tx.amount;
        } else if (tx.type === 'EXPENSE') {
            amountEffect = -tx.amount;
        } else if (isTransferOut) {
            amountEffect = -(tx.amount + (tx.fees || 0));
        } else if (isTransferIn) {
            amountEffect = tx.amount;
        }

        // Snapshot balance AFTER this transaction occurred
        const balanceAfter = currentBalance;

        // Revert balance to state BEFORE this transaction for the next iteration
        currentBalance = currentBalance - amountEffect;

        return {
            ...tx,
            balanceAfter,
            amountEffect,
            dateObj: txDate
        };
    });

    return withRunningBalance;
  }, [account, transactions]);

  // --- 2. Filter by Selected Month ---
  const monthlyData = useMemo(() => {
    return processedData.filter(tx => isSameMonth(tx.dateObj, currentMonth));
  }, [processedData, currentMonth]);

  // --- 3. Calculate Monthly Summaries ---
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    monthlyData.forEach(tx => {
        if (tx.amountEffect > 0) income += tx.amountEffect;
        else expense += Math.abs(tx.amountEffect);
    });

    return { income, expense, total: income - expense };
  }, [monthlyData]);

  // --- 4. Group by Date for Display ---
  const groupedTransactions = useMemo(() => {
      const groups: Record<string, typeof monthlyData> = {};
      monthlyData.forEach(tx => {
          const dateKey = format(tx.dateObj, 'yyyy-MM-dd');
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(tx);
      });
      return groups;
  }, [monthlyData]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: account.currency || 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
      {/* --- HEADER --- */}
      <div className="bg-surface border-b border-white/10 sticky top-0 z-20">
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

          {/* --- MONTH NAVIGATOR --- */}
          <div className="flex items-center justify-between px-4 pb-2">
             <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-1 hover:bg-white/10 rounded-full text-gray-400"><ChevronLeft className="w-6 h-6"/></button>
             <span className="text-white font-medium text-lg">{format(currentMonth, 'MMM yyyy')}</span>
             <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1 hover:bg-white/10 rounded-full text-gray-400"><ChevronRight className="w-6 h-6"/></button>
          </div>

          {/* --- TABS (Visual Only) --- */}
          <div className="flex px-4 mt-2">
              <div className="flex-1 border-b-2 border-primary text-primary text-center pb-2 text-sm font-bold">Daily</div>
              <div className="flex-1 border-b-2 border-transparent text-gray-500 text-center pb-2 text-sm font-medium">Monthly</div>
              <div className="flex-1 border-b-2 border-transparent text-gray-500 text-center pb-2 text-sm font-medium">Annually</div>
          </div>

          {/* --- SUMMARY ROW --- */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-[#27272a] text-xs border-b border-white/10">
              <div className="text-center">
                  <div className="text-gray-400 mb-1">Deposit</div>
                  <div className="text-blue-400 font-bold truncate">{formatCurrency(summary.income)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">Withdrawal</div>
                  <div className="text-red-400 font-bold truncate">{formatCurrency(summary.expense)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">Total</div>
                  <div className={`${summary.total >= 0 ? 'text-white' : 'text-red-400'} font-bold truncate`}>{formatCurrency(summary.total)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 mb-1">End Balance</div>
                  {/* Show balance of the last transaction of this month, or carry over if no tx this month */}
                  <div className="text-gray-200 font-bold truncate">
                      {monthlyData.length > 0 
                        ? formatCurrency(monthlyData[0].balanceAfter) 
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
                <p>No transactions in {format(currentMonth, 'MMMM')}</p>
            </div>
        ) : (
            Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
                const dayTx = groupedTransactions[dateKey];
                const dayIncome = dayTx.reduce((sum, t) => t.amountEffect > 0 ? sum + t.amountEffect : sum, 0);
                const dayExpense = dayTx.reduce((sum, t) => t.amountEffect < 0 ? sum + Math.abs(t.amountEffect) : sum, 0);

                return (
                    <div key={dateKey}>
                        {/* DATE HEADER */}
                        <div className="bg-[#18181b] px-4 py-2 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-white">{format(parseISO(dateKey), 'dd')}</span>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{format(parseISO(dateKey), 'EEE')}</span>
                                    <span className="text-[10px] text-gray-500">{format(parseISO(dateKey), 'MM/yyyy')}</span>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs">
                                {dayIncome > 0 && <span className="text-blue-400">{formatCurrency(dayIncome)}</span>}
                                {dayExpense > 0 && <span className="text-red-400">{formatCurrency(dayExpense)}</span>}
                            </div>
                        </div>

                        {/* ROWS */}
                        {dayTx.map(tx => (
                            <div key={tx.id} className="px-4 py-3 bg-surface border-b border-white/5 flex justify-between items-center">
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
                                        Balance {formatCurrency(tx.balanceAfter)}
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