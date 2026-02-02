import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, Account, AccountOwner } from '../types';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, RefreshCw, Calendar, ChevronLeft, ChevronRight, Wrench, Search, X, Trash2, MoreVertical } from 'lucide-react'; 
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
  onDeleteBatch?: (ids: string[]) => void; // New Prop
}

type DateRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'CUSTOM';

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, accounts, lang = 'en', onSelectAccount, onDelete, onDeleteBatch }) => {
  const [ownerFilter, setOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [dateRange, setDateRange] = useState<DateRange>('MONTHLY');
  const [cursorDate, setCursorDate] = useState(new Date()); 
  
  // --- SEARCH STATE ---
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- DESKTOP MENU STATE ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
      'ClearHistory': lang === 'en' ? 'Clear History' : 'Hapus Riwayat',
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
        <div className="flex items-center h-8 gap-2">
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

        {/* FILTERS */}
        <div className="flex flex-col gap-3">
            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full">
                 {(['All', 'Husband', 'Wife'] as const).map(filter => (
                     <button key={filter} onClick={() => setOwnerFilter(filter)} className={`flex-1 py-1.5 rounded-md transition-all ${ownerFilter === filter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t(filter)}</button>
                 ))}
            </div>

            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full gap-1 overflow-x-auto custom-scrollbar">
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

        {/* SUMMARY BOX */}
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

        {/* CLEAR HISTORY BUTTON (NEW) */}
        {filteredTransactions.length > 0 && onDeleteBatch && (
            <button 
                onClick={() => onDeleteBatch(filteredTransactions.map(t => t.id))}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border border-red-500/20 transition-all"
            >
                <Trash2 className="w-3 h-3" />
                {t('ClearHistory')} ({filteredTransactions.length})
            </button>
        )}
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
                // WRAPPER: Scroll Container untuk Mobile Slide
                <div key={tx.id} className="group relative flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                    
                    {/* CONTENT UTAMA (Width 100%) */}
                    <div 
                        className="w-full flex-shrink-0 snap-start flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer select-none border-b border-white/5"
                        onDoubleClick={() => onSelectAccount && accounts.find(a => a.id === tx.accountId) && onSelectAccount(accounts.find(a => a.id === tx.accountId)!)}
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className={`p-2 rounded-full ${isAdjustment ? 'bg-indigo-500/10' : 'bg-white/5'} shrink-0`}>
                                {getIcon(tx.type, tx.category)}
                            </div>
                            
                            <div className="overflow-hidden min-w-0 flex flex-col gap-0.5">
                                <p className="text-xs font-bold text-gray-200 truncate">
                                    {isAdjustment ? 'Balance Adjustment' : (tx.category || tx.type)}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    {format(new Date(tx.date), 'dd MMM yyyy')}
                                </p>
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
                        
                        {/* RIGHT SIDE: Amount + Desktop Menu */}
                        <div className="flex items-center gap-3">
                            <div className="text-right shrink-0">
                                <p className={`text-xs font-bold whitespace-nowrap ${amountColor}`}>
                                    {sign}{formatCurrency(tx.amount)}
                                </p>
                                {tx.notes && !isAdjustment && <p className="text-[10px] text-gray-500 truncate max-w-[100px] ml-auto">{tx.notes}</p>}
                            </div>

                            {/* DESKTOP ONLY MENU */}
                            <div className="hidden md:block relative">
                                {openMenuId === tx.id ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(tx.id); }}
                                        className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded flex items-center animate-in slide-in-from-right-2 duration-200"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setOpenMenuId(tx.id); 
                                            // Auto close after 3s
                                            setTimeout(() => setOpenMenuId(null), 3000);
                                        }}
                                        className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MOBILE SLIDE DELETE BUTTON (Off-canvas to right) */}
                    <div className="flex-shrink-0 snap-end w-[80px] bg-red-600 flex items-center justify-center md:hidden">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm("Delete transaction?")) onDelete && onDelete(tx.id);
                            }}
                            className="w-full h-full flex flex-col items-center justify-center text-white"
                        >
                            <Trash2 className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">Delete</span>
                        </button>
                    </div>

                </div>
          )})
        )}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default TransactionHistory;