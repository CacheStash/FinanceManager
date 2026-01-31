import React, { useState, useMemo } from 'react';
import { Transaction, Account, AccountOwner } from '../types';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, RefreshCw, Calendar, MousePointerClick } from 'lucide-react';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  isWithinInterval, parseISO 
} from 'date-fns';

interface TransactionHistoryProps {
  transactions: Transaction[];
  accounts: Account[];
  lang?: 'en' | 'id';
  onSelectAccount?: (account: Account) => void;
}

type DateRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'CUSTOM';

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, accounts, lang = 'en', onSelectAccount }) => {
  const [ownerFilter, setOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [dateRange, setDateRange] = useState<DateRange>('MONTHLY');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown Account';
  
  // Helper to get labels based on lang
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowDownRight className="w-5 h-5 text-emerald-500" />;
      case 'EXPENSE': return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
      case 'TRANSFER': return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
      default: return <RefreshCw className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
     return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  }

  // --- 1. Filter Logic ---
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    // Determine Date Range
    switch (dateRange) {
        case 'DAILY':
            start = startOfDay(now);
            end = endOfDay(now);
            break;
        case 'WEEKLY':
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
            break;
        case 'MONTHLY':
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
        case 'YEARLY':
            start = startOfYear(now);
            end = endOfYear(now);
            break;
        case 'CUSTOM':
            start = parseISO(customStart);
            end = parseISO(customEnd);
            end.setHours(23, 59, 59, 999);
            break;
        case 'LIFETIME':
        default:
            start = new Date(0);
            end = new Date(8640000000000000);
            break;
    }

    return transactions.filter(tx => {
        // A. Owner Filter
        let ownerMatch = true;
        if (ownerFilter !== 'All') {
            const account = accounts.find(a => a.id === tx.accountId);
            ownerMatch = account?.owner === ownerFilter;
        }

        // B. Date Filter
        const txDate = parseISO(tx.date);
        const dateMatch = isWithinInterval(txDate, { start, end });

        return ownerMatch && dateMatch;
    });
  }, [transactions, accounts, ownerFilter, dateRange, customStart, customEnd]);

  // --- 2. Calculate Summary ---
  const summary = useMemo(() => {
      let income = 0;
      let expense = 0;
      
      filteredTransactions.forEach(tx => {
          if (tx.type === 'INCOME') income += tx.amount;
          if (tx.type === 'EXPENSE') expense += tx.amount;
      });

      return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const handleDoubleClick = (accountId: string) => {
      const acc = accounts.find(a => a.id === accountId);
      if (acc && onSelectAccount) {
          onSelectAccount(acc);
      }
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-white/10 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex flex-col gap-4 bg-[#18181b]">
        
        {/* Header Title */}
        <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {lang === 'en' ? 'Transactions' : 'Transaksi'}
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400 font-normal hidden md:inline-flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3"/> Dbl Click to View Account
                </span>
            </h2>
        </div>

        {/* Filters Container */}
        <div className="flex flex-col gap-3">
            {/* Owner Filter */}
            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold w-full">
                 {(['All', 'Husband', 'Wife'] as const).map(filter => (
                     <button
                        key={filter}
                        onClick={() => setOwnerFilter(filter)}
                        className={`flex-1 py-1.5 rounded-md transition-all ${ownerFilter === filter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                         {t(filter)}
                     </button>
                 ))}
            </div>

            {/* Date Range Filter */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'LIFETIME', 'CUSTOM'] as DateRange[]).map(r => (
                    <button
                        key={r}
                        onClick={() => setDateRange(r)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                            dateRange === r 
                            ? 'bg-white/10 text-white border-white/20' 
                            : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'
                        }`}
                    >
                        {t(r)}
                    </button>
                ))}
            </div>

            {/* Custom Date Inputs */}
            {dateRange === 'CUSTOM' && (
                <div className="flex gap-2 items-center animate-in slide-in-from-top-2">
                    <input 
                        type="date" 
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary"
                    />
                    <span className="text-gray-500">-</span>
                    <input 
                        type="date" 
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2 w-full outline-none focus:border-primary"
                    />
                </div>
            )}
        </div>

        {/* Financial Summary Box */}
        <div className="grid grid-cols-3 gap-2 bg-[#27272a] p-3 rounded-xl border border-white/5">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Income')}</span>
                <span className="text-sm font-bold text-emerald-400 truncate">{formatCurrency(summary.income)}</span>
            </div>
            <div className="flex flex-col border-l border-white/10 pl-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Expense')}</span>
                <span className="text-sm font-bold text-rose-400 truncate">{formatCurrency(summary.expense)}</span>
            </div>
            <div className="flex flex-col border-l border-white/10 pl-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{t('Net')}</span>
                <span className={`text-sm font-bold truncate ${summary.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
                </span>
            </div>
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/10 bg-surface">
        {filteredTransactions.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
               <Calendar className="w-8 h-8 opacity-20" />
               <span className="text-xs">{lang === 'en' ? 'No transactions found' : 'Tidak ada transaksi'}</span>
           </div>
        ) : (
          filteredTransactions.slice(0, 100).map((tx) => (
            <div 
                key={tx.id} 
                className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer active:bg-white/10 select-none"
                onDoubleClick={() => handleDoubleClick(tx.accountId)}
                title="Double click to view account"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full bg-white/5`}>
                  {getIcon(tx.type)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-200 truncate pr-2">{tx.category || tx.type}</p>
                  <div className="flex items-center text-xs text-gray-500 gap-2 flex-wrap">
                    <span>{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                        {getAccountName(tx.accountId)}
                        {/* Owner Indicator Dot */}
                        {ownerFilter === 'All' && (() => {
                            const acc = accounts.find(a => a.id === tx.accountId);
                            if (acc?.owner) return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.owner === 'Husband' ? 'bg-indigo-500' : 'bg-pink-500'}`} title={acc.owner}></span>
                        })()}
                        {tx.toAccountId && ` → ${getAccountName(tx.toAccountId)}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right pl-2 shrink-0">
                <p className={`font-bold ${
                   tx.type === 'INCOME' ? 'text-emerald-500' :
                   tx.type === 'EXPENSE' ? 'text-rose-500' :
                   'text-gray-200'
                }`}>
                  {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                </p>
                {tx.notes && <p className="text-xs text-gray-500 truncate max-w-[100px] ml-auto">{tx.notes}</p>}
              </div>
            </div>
          ))
        )}
        {filteredTransactions.length > 100 && (
            <div className="p-4 text-center text-xs text-gray-500 italic">
                {lang === 'en' ? 'Showing last 100 transactions' : 'Menampilkan 100 transaksi terakhir'}
            </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;