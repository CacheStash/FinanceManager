import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, Account, AccountOwner } from '../types';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, RefreshCw, Calendar, ChevronLeft, ChevronRight, Wrench, Search, X, Trash2 } from 'lucide-react'; 
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
  
  // --- SEARCH STATE ---
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => { setCursorDate(new Date()); }, [dateRange]);

  useEffect(() => {
      if (showSearch && searchInputRef.current) {
          searchInputRef.current.focus();
      }
  }, [showSearch]);

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

        let searchMatch = true;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const cat = (tx.category || '').toLowerCase();
            const note = (tx.notes || '').toLowerCase();
            const amt = tx.amount.toString();
            searchMatch = cat.includes(q) || note.includes(q) || amt.includes(q);
        }

        return ownerMatch && dateMatch && searchMatch;
    });
  }, [transactions, accounts, ownerFilter, start, end, searchQuery]);

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
        
        {/* HEADER & SEARCH */}
        <div className="flex justify-between items-center h-8">
             {showSearch ? (
                 <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right-10 duration-200">
                     <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={lang === 'en' ? "Search transactions..." : "Cari transaksi..."}
                            className="w-full bg-white/10 border border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-sm text-white outline-none focus:border-primary"
                        />
                     </div>
                     <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                 </div>
             ) : (
                 <>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">{lang === 'en' ? 'Transactions' : 'Transaksi'}</h2>
                    <button onClick={() => setShowSearch(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"><Search className="w-5 h-5" /></button>
                 </>
             )}
        </div>

        <div className="flex flex-col gap-3">
            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full">
                 {(['All', 'Husband', 'Wife'] as const).map(filter => (
                     <button key={filter} onClick={() => setOwnerFilter(filter)} className={`flex-1 py-1.5 rounded-md transition-all ${ownerFilter === filter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t(filter)}</button>
                 ))}
            </div>

            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full gap-1 overflow-x-auto">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'LIFETIME', 'CUSTOM'] as DateRange[]).map(r => (
                    <button key={r} onClick={() => setDateRange(r)} className={`flex-1 px-1 py-1.5 rounded-md transition-all whitespace-nowrap text-[10px] sm:text-xs ${dateRange === r ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t(r)}</button>
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

        {/* SUMMARY BOX: Text XS & Font Medium */}
        <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex flex-col items-center text-center">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Income')}</span>
                <span className="text-xs font-medium text-emerald-400 truncate w-full">{formatCurrency(summary.income)}</span>
            </div>
            <div className="flex flex-col items-center text-center border-l border-white/10 pl-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Expense')}</span>
                <span className="text-xs font-medium text-rose-400 truncate w-full">{formatCurrency(summary.expense)}</span>
            </div>
            <div className="flex flex-col items-center text-center border-l border-white/10 pl-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Net')}</span>
                <span className={`text-xs font-medium truncate w-full ${summary.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
                </span>
            </div>
        </div>
      </div>
      
      {/* TRANSACTION LIST */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/10 bg-surface transition-colors duration-300">
        {filteredTransactions.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
               {searchQuery ? <Search className="w-8 h-8 opacity-20" /> : <Calendar className="w-8 h-8 opacity-20" />}
               <span className="text-xs">
                   {searchQuery ? (lang === 'en' ? 'No results found' : 'Tidak ada hasil') : (lang === 'en' ? 'No transactions found' : 'Tidak ada transaksi')}
               </span>
           </div>
        ) : (
          filteredTransactions.slice(0, 100).map((tx) => {
            const isAdjustment = tx.category === 'Adjustment';
            
            let amountColor = 'text-gray-200';
            let sign = '';
            
            if (isAdjustment) {
                if (tx.type === 'EXPENSE') { amountColor = 'text-red-500'; sign = '-'; }
                else { amountColor = 'text-emerald-500'; sign = '+'; }
            } else {
                if (tx.type === 'EXPENSE') { amountColor = 'text-rose-500'; sign = '-'; }
                else if (tx.type === 'INCOME') { amountColor = 'text-emerald-500'; sign = '+'; }
                else { amountColor = 'text-blue-400'; sign = ''; } // Transfer
            }

            return (
                <div 
                    key={tx.id} 
                    className="relative p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer active:bg-white/10 select-none"
                    onDoubleClick={() => onSelectAccount && accounts.find(a => a.id === tx.accountId) && onSelectAccount(accounts.find(a => a.id === tx.accountId)!)}
                >
                <div className="flex items-center gap-4 overflow-hidden">
                    {/* ICON */}
                    <div className={`p-2 rounded-full ${isAdjustment ? 'bg-indigo-500/10' : 'bg-white/5'} shrink-0`}>
                        {getIcon(tx.type, tx.category)}
                    </div>
                    
                    {/* CONTENT TENGAH: Vertical Layout */}
                    <div className="overflow-hidden min-w-0 flex flex-col gap-0.5">
                        {/* 1. Category / Title */}
                        <p className="text-xs font-bold text-gray-200 truncate">
                            {isAdjustment ? 'Balance Adjustment' : (tx.category || tx.type)}
                        </p>
                        
                        {/* 2. Date */}
                        <p className="text-[10px] text-gray-500">
                            {format(new Date(tx.date), 'dd MMM yyyy')}
                        </p>

                        {/* 3. Account Name */}
                        <div className="flex items-center text-[10px] text-gray-400 gap-1 truncate">
                            <span>{getAccountName(tx.accountId)}</span>
                            {ownerFilter === 'All' && (() => {
                                const acc = accounts.find(a => a.id === tx.accountId);
                                if (acc?.owner) return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.owner === 'Husband' ? 'bg-indigo-500' : 'bg-pink-500'}`} title={acc.owner}></span>
                            })()}
                            {tx.toAccountId && (
                                <>
                                    <span className="text-gray-600">→</span>
                                    <span>{getAccountName(tx.toAccountId)}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* AMOUNT */}
                <div className="text-right shrink-0">
                    <p className={`text-xs font-bold whitespace-nowrap ${amountColor}`}>
                        {sign}{formatCurrency(tx.amount)}
                    </p>
                    {tx.notes && !isAdjustment && <p className="text-[10px] text-gray-500 truncate max-w-[100px] ml-auto">{tx.notes}</p>}
                </div>
                
                {onDelete && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            onDelete(tx.id);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-red-600/90 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0"
                        title="Delete Transaction"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                </div>
          )})
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;