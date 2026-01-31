import React from 'react';
import { Account } from '../types';
import { Wallet, Landmark, Coins, CreditCard, Banknote, User, UserCircle2 } from 'lucide-react';

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  listView?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, listView = false }) => {
  // Derive account type from group if property is missing
  const accountType = account.type || (() => {
    switch (account.group) {
      case 'Cash': return 'CASH';
      case 'Bank Accounts': return 'BANK';
      case 'Investments': return 'INVESTMENT';
      case 'Credit Cards': return 'CREDIT';
      case 'Loans': return 'LOAN';
      default: return 'OTHER';
    }
  })();

  const getIcon = () => {
    switch (accountType) {
      case 'CASH': return <Wallet className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-emerald-500`} />;
      case 'BANK': return <Landmark className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-blue-500`} />;
      case 'INVESTMENT': return <Coins className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-amber-500`} />;
      case 'CREDIT': return <CreditCard className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-rose-500`} />;
      case 'LOAN': return <Banknote className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-red-500`} />;
      default: return <CreditCard className={`${listView ? 'w-5 h-5' : 'w-6 h-6'} text-purple-500`} />;
    }
  };

  const getOwnerBadge = () => {
    const isHusband = account.owner === 'Husband';
    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${isHusband ? 'bg-indigo-500/20 text-indigo-400' : 'bg-pink-500/20 text-pink-400'}`}>
            <UserCircle2 className="w-3 h-3" />
            {isHusband ? 'Suami' : 'Istri'}
        </div>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(amount);
  };

  // --- LIST VIEW (Compact Row) ---
  if (listView) {
    return (
        <div 
          className="group flex items-center justify-between p-4 bg-surface border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10"
          onClick={() => onEdit && onEdit(account)}
        >
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-200 font-medium text-sm">{account.name}</span>
                        {account.owner && <span className={`w-2 h-2 rounded-full ${account.owner === 'Husband' ? 'bg-indigo-500' : 'bg-pink-500'}`}></span>}
                    </div>
                    {accountType === 'INVESTMENT' && account.metadata?.grams && (
                        <span className="text-[10px] text-amber-500 flex items-center mt-0.5">
                            <Coins className="w-3 h-3 mr-1" /> {account.metadata.grams}g
                        </span>
                    )}
                </div>
            </div>
            
            <div className="text-right">
                 <span className={`font-medium text-sm ${account.balance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {formatCurrency(account.balance, account.currency)}
                 </span>
            </div>
        </div>
    );
  }

  // --- CARD VIEW (Grid Box) ---
  return (
    <div 
      className="bg-surface rounded-2xl p-6 shadow-sm border border-white/10 hover:shadow-md transition-all cursor-pointer group hover:bg-surface-light relative overflow-hidden"
      onClick={() => onEdit && onEdit(account)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
          {getIcon()}
        </div>
        <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-white/10 text-gray-300 rounded-lg uppercase tracking-wider">
            {accountType}
            </span>
            {account.owner && getOwnerBadge()}
        </div>
      </div>
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{account.name}</h3>
        <p className={`text-2xl font-bold tracking-tight ${account.balance < 0 ? 'text-red-400' : 'text-white'}`}>
          {formatCurrency(account.balance, account.currency)}
        </p>
        {accountType === 'INVESTMENT' && account.metadata?.grams && (
          <p className="text-xs text-amber-500 mt-2 font-medium flex items-center">
            <Coins className="w-3 h-3 mr-1" />
            {account.metadata.grams}g Gold Holdings
          </p>
        )}
      </div>
    </div>
  );
};

export default AccountCard;