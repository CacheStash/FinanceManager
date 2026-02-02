import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Account, AccountOwner } from '../types';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, RefreshCw, Calendar, ChevronLeft, ChevronRight, Trash2, Wrench } from 'lucide-react'; 
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  isWithinInterval, parseISO, addDays, subDays, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, subYears
} from 'date-fns';

interface TransactionHistoryProps {
  transactions: Transaction[];
  accounts: Account[];
  lang?: 'en' | 'id';
  onSelectAccount?: (account: Account) => void;
  onDelete?: (id: string) => void; 
}

type DateRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'CUSTOM';

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, accounts, lang = 'en', onSelectAccount, onDelete }) => {
  const [ownerFilter, setOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [dateRange, setDateRange] = useState<DateRange>('MONTHLY');
  const [cursorDate, setCursorDate] = useState(new Date()); 
  
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => { setCursorDate(new Date()); }, [dateRange]);

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown Account';
  
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
      'Income': lang === 'en' ? 'Income' : 'Masuk',
      'Expense': lang === 'en' ? 'Expense' : 'Keluar',
      'Net': lang === 'en' ? 'Net' : 'Selisih',
    };
    return dict[key] || key;
  };

  const getIcon = (type: string, category: string) => {
    if (category === 'Adjustment') return <Wrench className="w-5 h-5 text-indigo-400" />;
    switch (type) {
      case 'INCOME': return <ArrowDownRight className="w-5 h-5 text-emerald-500" />;
      case 'EXPENSE': return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
      case 'TRANSFER': return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
      default: return <RefreshCw className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

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

  const filteredTransactions = useMemo(() => {
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

  const summary = useMemo(() => {
      let income = 0; let expense = 0;
      filteredTransactions.forEach(tx => {
          if (tx.type === 'INCOME') income += tx.amount;
          if (tx.type === 'EXPENSE') expense += tx.amount;
      });
      return { income, expense, net: income - expense };
  }, [filteredTransactions]);

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
    <div className="bg-surface rounded-2xl shadow-sm border border-white/10 overflow-hidden flex flex-col h-full transition-colors duration-300">
      <div className="p-4 border-b border-white/10 flex flex-col gap-4 bg-surface transition-colors duration-300">
        <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {lang === 'en' ? 'Transactions' : 'Transaksi'}
            </h2>
        </div>

        <div className="flex flex-col gap-3">
            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full">
                 {(['All', 'Husband', 'Wife'] as const).map(filter => (
                     <button key={filter} onClick={() => setOwnerFilter(filter)} className={`flex-1 py-1.5 rounded-md transition-all ${ownerFilter === filter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t(filter)}</button>
                 ))}
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'LIFETIME', 'CUSTOM'] as DateRange[]).map(r => (
                    <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${dateRange === r ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'}`}>{t(r)}</button>
                ))}
            </div>

            {dateRange === 'CUSTOM' && (
                <div className="flex gap-2 items-center animate-in slide-in-from-top-2">
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary" />
                    <span className="text-gray-500">-</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary" />
                </div>
            )}
        </div>

        {showSlider && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-1.5 animate-in slide-in-from-top-2">
                <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-white text-sm select-none">{label}</span>
                <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
        )}

        <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Income')}</span><span className="text-sm font-bold text-emerald-400 truncate">{formatCurrency(summary.income)}</span></div>
            <div className="flex flex-col border-l border-white/10 pl-2"><span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Expense')}</span><span className="text-sm font-bold text-rose-400 truncate">{formatCurrency(summary.expense)}</span></div>
            <div className="flex flex-col border-l border-white/10 pl-2"><span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Net')}</span><span className={`text-sm font-bold truncate ${summary.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}</span></div>
        </div>
      </div>
      
      {/* --- TRANSACTION LIST (UPDATED UI: CLEAN NO LABELS) --- */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/10 bg-surface transition-colors duration-300">
        {filteredTransactions.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2"><Calendar className="w-8 h-8 opacity-20" /><span className="text-xs">{lang === 'en' ? 'No transactions found' : 'Tidak ada transaksi'}</span></div>
        ) : (
          filteredTransactions.slice(0, 100).map((tx) => {
            const isAdjustment = tx.category === 'Adjustment';
            const isSurplus = isAdjustment && tx.type === 'INCOME';
            const isDeficit = isAdjustment && tx.type === 'EXPENSE';

            // Menentukan Warna Text Amount
            let amountColor = 'text-gray-200';
            let sign = '';
            
            if (isAdjustment) {
                if (isDeficit) { amountColor = 'text-red-500'; sign = '-'; }
                else { amountColor = 'text-emerald-500'; sign = '+'; }
            } else {
                if (tx.type === 'EXPENSE') { amountColor = 'text-rose-500'; sign = '-'; }
                else if (tx.type === 'INCOME') { amountColor = 'text-emerald-500'; sign = '+'; }
                else { amountColor = 'text-blue-400'; sign = ''; } // Transfer
            }

            return (
                <div 
                    key={tx.id} 
                    className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer active:bg-white/10 select-none"
                    onDoubleClick={() => onSelectAccount && accounts.find(a => a.id === tx.accountId) && onSelectAccount(accounts.find(a => a.id === tx.accountId)!)}
                >
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`p-2 rounded-full ${isAdjustment ? 'bg-indigo-500/10' : 'bg-white/5'} shrink-0`}>
                        {getIcon(tx.type, tx.category)}
                    </div>
                    <div className="overflow-hidden min-w-0">
                        {/* Judul: Jika Adjustment, tampilkan "Balance Adjustment", jika tidak tampilkan Category */}
                        <p className="font-medium text-gray-200 truncate pr-2">
                            {isAdjustment ? 'Balance Adjustment' : (tx.category || tx.type)}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 gap-2 flex-wrap">
                            <span>{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                                {getAccountName(tx.accountId)}
                                {ownerFilter === 'All' && (() => {
                                    const acc = accounts.find(a => a.id === tx.accountId);
                                    if (acc?.owner) return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.owner === 'Husband' ? 'bg-indigo-500' : 'bg-pink-500'}`} title={acc.owner}></span>
                                })()}
                                {tx.toAccountId && ` → ${getAccountName(tx.toAccountId)}`}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 pl-2 shrink-0">
                    <div className="text-right">
                        {/* AMOUNT: BERSIH TANPA LABEL, CUKUP WARNA */}
                        <p className={`font-bold whitespace-nowrap ${amountColor}`}>
                            {sign}{formatCurrency(tx.amount)}
                        </p>
                        
                        {/* Notes ditampilkan kecil jika ada. Kalau adjustment, sembunyikan notes "Surplus/Deficit" yang panjang biar bersih */}
                        {tx.notes && !isAdjustment && <p className="text-xs text-gray-500 truncate max-w-[100px] ml-auto">{tx.notes}</p>}
                    </div>
                    
                    {onDelete && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation(); 
                                onDelete(tx.id);
                            }}
                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Transaction"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                </div>
          )})
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;