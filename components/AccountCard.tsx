import React from 'react';
import { Account } from '../types';
import { ChevronRight, Trash2 } from 'lucide-react';

interface AccountCardProps {
    account: Account;
    onEdit: (account: Account) => void;
    listView?: boolean;
    isDeleteMode?: boolean; // Prop baru
    onDelete?: () => void;  // Prop baru
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, listView, isDeleteMode, onDelete }) => {
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: account.currency, maximumFractionDigits: 0 }).format(val);

    return (
        <div 
            onClick={() => !isDeleteMode && onEdit(account)} 
            className={`p-4 flex justify-between items-center group transition-colors relative ${
                listView ? 'hover:bg-white/5 cursor-pointer' : 'bg-surface border border-white/10 rounded-xl'
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Jika mode hapus aktif, tampilkan tombol hapus di kiri */}
                {isDeleteMode && onDelete && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Mencegah klik tembus ke detail akun
                            onDelete();
                        }}
                        className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all animate-in zoom-in duration-200"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                <div>
                    <h3 className="font-bold text-white text-sm">{account.name}</h3>
                    {!listView && <p className="text-xs text-gray-500">{account.group}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className={`font-bold text-sm ${account.balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrency(account.balance)}
                </span>
                {/* Sembunyikan panah jika sedang mode hapus agar tidak penuh */}
                {!isDeleteMode && listView && <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />}
            </div>
        </div>
    );
};

export default AccountCard;