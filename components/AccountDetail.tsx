import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction } from '../types';
import { ArrowLeft, BarChart3, Edit2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wrench, ArrowDownRight, ArrowUpRight, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, subDays, subWeeks, subMonths, subYears, addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface AccountDetailProps {
    account: Account;
    transactions: Transaction[];
    onBack: () => void;
    onEdit: (account: Account) => void;
    onViewStats: (account: Account) => void;
}

type DateRange = 'DAILY' | 'MONTHLY' | 'YEARLY';

const AccountDetail: React.FC<AccountDetailProps> = ({ account, transactions, onBack, onEdit, onViewStats }) => {
    const [dateRange, setDateRange] = useState<DateRange>('MONTHLY');
    const [cursorDate, setCursorDate] = useState(new Date());

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: account.currency, maximumFractionDigits: 0 }).format(val);

    useEffect(() => { setCursorDate(new Date()); }, [account.id]);

    const { start, end, label } = useMemo(() => {
        let s: Date, e: Date, l = '';
        switch (dateRange) {
            case 'DAILY': s = startOfDay(cursorDate); e = endOfDay(cursorDate); l = format(cursorDate, 'dd MMMM yyyy'); break;
            case 'MONTHLY': s = startOfMonth(cursorDate); e = endOfMonth(cursorDate); l = format(cursorDate, 'MMMM yyyy'); break;
            case 'YEARLY': s = startOfYear(cursorDate); e = endOfYear(cursorDate); l = format(cursorDate, 'yyyy'); break;
        }
        return { start: s, end: e, label: l };
    }, [dateRange, cursorDate]);

    const handlePrev = () => {
        if (dateRange === 'DAILY') setCursorDate(d => subDays(d, 1));
        if (dateRange === 'MONTHLY') setCursorDate(d => subMonths(d, 1));
        if (dateRange === 'YEARLY') setCursorDate(d => subYears(d, 1));
    };
  
    const handleNext = () => {
        if (dateRange === 'DAILY') setCursorDate(d => addDays(d, 1));
        if (dateRange === 'MONTHLY') setCursorDate(d => addMonths(d, 1));
        if (dateRange === 'YEARLY') setCursorDate(d => addYears(d, 1));
    };

    const filteredTx = useMemo(() => {
        return transactions.filter(tx => {
            const isRelevant = tx.accountId === account.id || tx.toAccountId === account.id;
            if (!isRelevant) return false;

            const txDate = parseISO(tx.date);
            return isWithinInterval(txDate, { start, end });
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, account.id, start, end]);

    const stats = useMemo(() => {
        let income = 0; let expense = 0;
        filteredTx.forEach(tx => {
            let amount = 0;
            if (tx.accountId === account.id) {
                if (tx.type === 'INCOME') income += tx.amount;
                else {
                    amount = tx.amount;
                    if(tx.type === 'TRANSFER' && tx.toAccountId) expense += amount;
                    else if(tx.type === 'EXPENSE') expense += amount;
                }
            } else if (tx.toAccountId === account.id) {
                income += tx.amount;
            }
        });
        return { income, expense, net: income - expense };
    }, [filteredTx, account.id]);

    const getIcon = (type: string, category: string) => {
        if (category === 'Adjustment') return <Wrench className="w-5 h-5 text-indigo-400" />;
        switch (type) {
          case 'INCOME': return <ArrowDownRight className="w-5 h-5 text-emerald-500" />;
          case 'EXPENSE': return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
          case 'TRANSFER': return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
          default: return <RefreshCw className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="bg-surface h-full flex flex-col pb-20 overflow-y-auto transition-colors duration-300">
            {/* HEADER */}
            <div className="p-4 border-b border-white/10 sticky top-0 bg-surface z-10 flex justify-between items-center transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-gray-300" /></button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* NAMA AKUN & SALDO: Text SM & Font Medium (Tidak Bold) */}
                            <h2 className="font-bold text-sm text-white">{account.name}</h2>
                            <span className="text-gray-500 text-xs hidden sm:inline">-</span>
                            <span className={`text-sm font-medium ${account.balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatCurrency(account.balance)}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500">{account.group}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => onViewStats && onViewStats(account)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"><BarChart3 className="w-5 h-5"/></button>
                     <button onClick={() => onEdit(account)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"><Edit2 className="w-5 h-5"/></button>
                </div>
            </div>

            {/* DATE CONTROLS */}
            <div className="p-4 space-y-4">
                 <div className="flex bg-white/5 p-1 rounded-lg">
                    {(['DAILY', 'MONTHLY', 'YEARLY'] as DateRange[]).map(r => (
                        <button key={r} onClick={() => setDateRange(r)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${dateRange === r ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                        </button>
                    ))}
                 </div>
                 <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-1.5">
                    <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="font-bold text-white text-sm">{label}</span>
                    <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><ChevronRight className="w-5 h-5" /></button>
                </div>

                {/* SUMMARY BOX: Text XS & Font Medium */}
                <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-gray-400">In</span>
                        <span className="text-xs font-medium text-emerald-400 truncate w-full">{formatCurrency(stats.income)}</span>
                    </div>
                    <div className="flex flex-col items-center text-center border-l border-white/10 pl-2">
                        <span className="text-[10px] text-gray-400">Out</span>
                        <span className="text-xs font-medium text-rose-400 truncate w-full">{formatCurrency(stats.expense)}</span>
                    </div>
                    <div className="flex flex-col items-center text-center border-l border-white/10 pl-2">
                        <span className="text-[10px] text-gray-400">Change</span>
                        <span className={`text-xs font-medium truncate w-full ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}
                        </span>
                    </div>
                </div>
            </div>

            {/* TRANSACTION LIST */}
            <div className="flex-1 divide-y divide-white/10">
                {filteredTx.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2"><CalendarIcon className="w-8 h-8 opacity-20" /><span className="text-xs">No transactions in this period</span></div>
                ) : (
                    filteredTx.map(tx => {
                        const isAdjustment = tx.category === 'Adjustment';
                        
                        let amountColor = 'text-gray-200';
                        let sign = '';
                        let displayAmount = tx.amount;

                        if (tx.type === 'TRANSFER') {
                            if (tx.accountId === account.id) {
                                amountColor = 'text-rose-500'; sign = '-';
                            } else {
                                amountColor = 'text-emerald-500'; sign = '+';
                            }
                        } else {
                            const isIncome = tx.type === 'INCOME';
                            amountColor = isIncome ? 'text-emerald-500' : 'text-rose-500';
                            sign = isIncome ? '+' : '-';
                        }

                        return (
                            <div key={tx.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`p-2 rounded-full ${isAdjustment ? 'bg-indigo-500/10' : 'bg-white/5'} shrink-0`}>
                                        {getIcon(tx.type, tx.category)}
                                    </div>
                                    <div className="overflow-hidden min-w-0">
                                        <p className="text-xs font-medium text-gray-200 truncate pr-2">
                                            {isAdjustment ? 'Balance Adjustment' : (tx.category || tx.type)}
                                        </p>
                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                            {format(new Date(tx.date), 'dd MMM yyyy')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {/* NOMINAL LIST: Text XS & Font Medium */}
                                    <p className={`text-xs font-medium whitespace-nowrap ${amountColor}`}>
                                        {sign}{formatCurrency(displayAmount)}
                                    </p>
                                    {tx.notes && !isAdjustment && <p className="text-[10px] text-gray-500 truncate max-w-[100px] ml-auto">{tx.notes}</p>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AccountDetail;