import React from 'react';
import { Account } from '../types';
import { Layers, Trash2, ChevronRight, Pencil } from 'lucide-react'; // FIX: Import Pencil

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete?: () => void;
  onRename?: (account: Account) => void; // Prop baru untuk rename
  listView?: boolean;
  isDeleteMode?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({ 
    account, 
    onEdit, 
    onDelete, 
    onRename, 
    listView = false, 
    isDeleteMode = false 
}) => {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(account.currency === 'USD' ? 'en-US' : 'id-ID', { 
        style: 'currency', 
        currency: account.currency, 
        maximumFractionDigits: 0 
    }).format(val);

  return (
    <div 
        onClick={() => !isDeleteMode && onEdit(account)} 
        className={`bg-surface hover:bg-white/5 border border-white/5 p-4 transition-all cursor-pointer group ${listView ? 'flex items-center justify-between' : 'rounded-xl'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            account.group === 'Cash' ? 'bg-emerald-500/20 text-emerald-500' :
            account.group === 'Bank Accounts' ? 'bg-blue-500/20 text-blue-500' :
            account.group === 'Credit Cards' ? 'bg-rose-500/20 text-rose-500' :
            'bg-purple-500/20 text-purple-500'
        }`}>
            <Layers className="w-5 h-5" />
        </div>
        <div>
            <h3 className="font-bold text-white text-sm">{account.name}</h3>
            <p className="text-xs text-gray-400">{account.group}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
          {isDeleteMode ? (
              <div className="flex items-center gap-2">
                  {/* TOMBOL RENAME */}
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if(onRename) onRename(account); 
                    }}
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors"
                  >
                      <Pencil className="w-4 h-4" />
                  </button>
                  {/* TOMBOL DELETE */}
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if(onDelete) onDelete(); 
                    }}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <>
                <span className="font-bold text-white">{formatCurrency(account.balance)}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </>
          )}
      </div>
    </div>
  );
};

export default AccountCard;