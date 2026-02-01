import React, { useState, useEffect } from 'react';
import { NonProfitAccount, NonProfitTransaction, Account, AccountOwner } from '../types';
import { UserCircle2, Landmark, Plus, X, ArrowDownRight, Pencil, CheckCircle2, AlertCircle, BellRing, Trash2 } from 'lucide-react';
import { format, endOfMonth, isSameMonth, parseISO } from 'date-fns';

interface NonProfitProps {
  accounts: NonProfitAccount[];
  transactions: NonProfitTransaction[];
  mainAccounts: Account[];
  onAddTransaction: (tx: NonProfitTransaction, sourceMainAccountId?: string) => void;
  onUpdateBalance: (accountId: string, newBalance: number) => void;
  onComplete: (accountId: string) => void;
  onClearHistory: () => void;
  lang?: 'en' | 'id';
}

const NonProfit: React.FC<NonProfitProps> = ({ 
    accounts, 
    transactions, 
    mainAccounts,
    onAddTransaction, 
    onUpdateBalance,
    onComplete,
    onClearHistory,
    lang = 'en' 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Alert State
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);
  
  // Add Transaction State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [sourceType, setSourceType] = useState<'MANUAL' | 'TRANSFER'>('MANUAL');
  const [sourceMainAccountId, setSourceMainAccountId] = useState('');
  
  // --- NEW STATE: FILTER SUMBER DANA (Suami/Istri) ---
  const [sourceOwnerFilter, setSourceOwnerFilter] = useState<AccountOwner>('Husband');

  // Edit/Complete State
  const [targetAccount, setTargetAccount] = useState<NonProfitAccount | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const t = (key: string) => {
    const dict: any = {
      'title': lang === 'en' ? 'Hajj & Umrah Fund' : 'Hajj & Umrah Fund',
      'total': lang === 'en' ? 'Total Savings' : 'Total Tabungan',
      'history': lang === 'en' ? 'History' : 'Riwayat',
      'add': lang === 'en' ? 'Deposit' : 'Setor',
      'husband': lang === 'en' ? 'Husband' : 'Suami',
      'wife': lang === 'en' ? 'Wife' : 'Istri',
      'save': lang === 'en' ? 'Save' : 'Simpan',
      'cancel': lang === 'en' ? 'Cancel' : 'Batal',
      'source': lang === 'en' ? 'Source of Fund' : 'Sumber Dana',
      'manual': lang === 'en' ? 'Cash / External' : 'Tunai / Luar',
      'transfer': lang === 'en' ? 'From Main Account' : 'Transfer Akun Utama',
      'edit_balance': lang === 'en' ? 'Update Balance (Revaluation)' : 'Ubah Saldo (Revaluasi Emas)',
      'complete_hajj': lang === 'en' ? 'Complete' : 'Tunaikan',
      'complete_desc': lang === 'en' ? 'Funds will be utilized and balance reset to 0.' : 'Dana akan digunakan dan saldo di-reset ke 0.',
      'bismillah': lang === 'en' ? 'Bismillah, Proceed' : 'Bismillah, Tunaikan',
      'insufficient': lang === 'en' ? 'Insufficient Balance' : 'Saldo Tidak Cukup',
      'reminder_title': lang === 'en' ? 'Monthly Deposit Reminder' : 'Pengingat Setoran Bulanan',
      'reminder_desc': lang === 'en' ? 'The month is ending and you haven\'t deposited yet. Keep your Hajj consistency!' : 'Bulan segera berakhir dan Anda belum setor tabungan Haji bulan ini. Yuk istiqomah!',
      'clear_history': lang === 'en' ? 'Clear History' : 'Hapus Riwayat',
      'select_source': lang === 'en' ? 'Select Source Account' : 'Pilih Akun Sumber',
    };
    return dict[key] || key;
  };

  // --- CHECK FOR MONTHLY DEPOSIT ---
  useEffect(() => {
    const checkMonthlyDeposit = () => {
        const now = new Date();
        const currentDay = now.getDate();

        if (currentDay > 20) {
            const hasDeposited = transactions.some(tx => {
                const txDate = parseISO(tx.date);
                return isSameMonth(txDate, now) && tx.amount > 0;
            });
            setShowMonthlyReminder(!hasDeposited);
        } else {
            setShowMonthlyReminder(false);
        }
    };
    checkMonthlyDeposit();
  }, [transactions]);


  // --- VALIDATION LOGIC ---
  const selectedSourceAccount = mainAccounts.find(a => a.id === sourceMainAccountId);
  const numericAmount = parseFloat(amount) || 0;
  const isInsufficientBalance = sourceType === 'TRANSFER' && selectedSourceAccount && numericAmount > selectedSourceAccount.balance;

  // --- LOGIC BARU: OPEN MODAL & AUTO-SET SOURCE FILTER ---
  const handleOpenDeposit = (accountId: string) => {
      setSelectedAccountId(accountId);
      
      const targetAcc = accounts.find(a => a.id === accountId);
      if (targetAcc) {
          // 1. Set Filter Sumber Dana sesuai pemilik akun tujuan (Suami -> Suami)
          setSourceOwnerFilter(targetAcc.owner);
          
          // 2. Otomatis pilih akun pertama dari kelompok tersebut agar dropdown tidak kosong
          const defaultSource = mainAccounts.find(a => a.owner === targetAcc.owner);
          if (defaultSource) {
              setSourceMainAccountId(defaultSource.id);
          } else {
              // Fallback jika tidak punya akun, ambil akun pertama apa saja
              setSourceMainAccountId(mainAccounts[0]?.id || '');
          }
      }
      
      setShowAddModal(true);
  };

  // --- LOGIC BARU: GANTI FILTER SOURCE (MANUAL CLICK) ---
  const handleSourceFilterChange = (owner: AccountOwner) => {
      setSourceOwnerFilter(owner);
      // Reset pilihan dropdown ke akun pertama di grup baru
      const firstAcc = mainAccounts.find(a => a.owner === owner);
      if (firstAcc) setSourceMainAccountId(firstAcc.id);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedAccountId || isInsufficientBalance) return;
    
    onAddTransaction({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        accountId: selectedAccountId,
        notes: notes + (sourceType === 'TRANSFER' ? ' (Transfer)' : '')
    }, sourceType === 'TRANSFER' ? sourceMainAccountId : undefined);

    setShowAddModal(false);
    resetForm();
  };

  const handleEditBalanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(targetAccount && editBalanceValue) {
          onUpdateBalance(targetAccount.id, parseFloat(editBalanceValue));
          setShowEditModal(false);
          setTargetAccount(null);
      }
  };

  const handleCompleteSubmit = () => {
      if (targetAccount) {
          onComplete(targetAccount.id);
          setShowCompleteModal(false);
          setTargetAccount(null);
      }
  };

  const resetForm = () => {
      setAmount('');
      setNotes('');
      setSourceType('MANUAL');
  };

  const openEditModal = (acc: NonProfitAccount) => {
      setTargetAccount(acc);
      setEditBalanceValue(acc.balance.toString());
      setShowEditModal(true);
  };

  const openCompleteModal = (acc: NonProfitAccount) => {
      setTargetAccount(acc);
      setShowCompleteModal(true);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
      {/* HEADER */}
      {/* HAPUS class warna lama: bg-gradient-to-br from-emerald-900 via-[#064e3b] to-black */}
      {/* GANTI dengan: bg-surface relative overflow-hidden */}
      <div className="p-6 pt-32 pb-40 bg-surface rounded-b-[3rem] shadow-xl relative overflow-hidden text-center group">
        
        {/* --- LAYER 1: Dynamic Color Blending (Harmonisasi) --- */}
        {/* Ini kuncinya: Menggunakan var(--color-primary) dengan opacity rendah & blending */}
        <div 
            className="absolute inset-0 opacity-30 mix-blend-hard-light"
            style={{ 
                background: `linear-gradient(to bottom right, var(--color-primary), transparent)` 
            }}
        ></div>
        
        {/* --- LAYER 2: Pattern Overlay (Opsional - Biar lebih texture) --- */}
        <div className="absolute top-0 right-0 p-4 opacity-10 mix-blend-overlay">
            <div className="w-32 h-32 bg-white rotate-45 border-4 border-white/50"></div>
        </div>
        
        {/* CONTENT (Kasih relative z-10 biar di atas layer warna) */}
        <div className="relative z-10 mt-2">
            <h1 className="text-xl md:text-2xl font-serif text-white/80 mb-6 uppercase tracking-widest border-b border-white/20 inline-block pb-3">
                {t('title')}
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                {formatCurrency(totalBalance)}
            </h2>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-24 relative z-20">
        
        {showMonthlyReminder && (
            <div className="bg-rose-500/10 border border-rose-500/50 p-4 rounded-2xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top-4 relative z-20 backdrop-blur-md">
                <div className="p-2 bg-rose-500 rounded-full text-white shrink-0 shadow-lg shadow-rose-900/50 animate-pulse">
                    <BellRing className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-rose-400 font-bold text-sm mb-1">{t('reminder_title')}</h3>
                    <p className="text-rose-200/80 text-xs leading-relaxed">
                        {t('reminder_desc')}
                    </p>
                </div>
            </div>
        )}

        <div className="space-y-4">
            {accounts.map(acc => (
                <div key={acc.id} className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                             <UserCircle2 className={`w-5 h-5 ${acc.owner === 'Husband' ? 'text-indigo-400' : 'text-pink-400'}`} />
                             <span className="font-semibold text-gray-200 text-sm">{acc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(acc)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            {acc.owner === 'Husband' ? 
                                <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded">{t('husband')}</span> :
                                <span className="bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2 py-1 rounded">{t('wife')}</span>
                            }
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(acc.balance)}</span>
                        <span className="text-[10px] text-amber-500 border border-amber-500/30 px-1.5 rounded bg-amber-500/10">GOLD / IDR</span>
                    </div>

                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-6 opacity-50">
                        <div className="bg-emerald-500 h-full" style={{ width: '20%' }}></div>
                    </div>

                    <div className="flex gap-3">
                         <button 
                            onClick={() => handleOpenDeposit(acc.id)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                         >
                            <Plus className="w-5 h-5" />
                            {t('add')}
                         </button>
                         
                         <button 
                            onClick={() => openCompleteModal(acc)}
                            disabled={acc.balance <= 0}
                            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all
                            bg-white/5 border border-white/10 text-gray-400 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5
                            active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Landmark className="w-4 h-4" />
                            {t('complete_hajj')}
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="space-y-3 pb-8">
            <div className="flex justify-between items-end px-1">
                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">{t('history')}</h3>
                {transactions.length > 0 && (
                    <button 
                        onClick={onClearHistory}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                        <Trash2 className="w-3 h-3" />
                        {t('clear_history')}
                    </button>
                )}
            </div>

            <div className="bg-surface rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No history yet.</div>
                ) : (
                    transactions.slice().reverse().map(tx => {
                        const acc = accounts.find(a => a.id === tx.accountId);
                        const isCompletion = tx.amount === 0 || (tx.notes && tx.notes.includes('Completed'));
                        
                        return (
                            <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isCompletion ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                                        {isCompletion ? <CheckCircle2 className="w-5 h-5 text-amber-500" /> : <ArrowDownRight className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{acc?.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                                            {tx.notes && <span className="text-gray-500 truncate max-w-[150px]">• {tx.notes}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className={`${isCompletion ? 'text-gray-400' : 'text-emerald-400'} font-bold text-sm`}>
                                    {isCompletion ? 'COMPLETED' : `+${formatCurrency(tx.amount)}`}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full md:w-[500px] bg-surface rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
                    <h3 className="font-bold text-white text-lg">{t('add')}</h3>
                    <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
                </div>
                <form onSubmit={handleDepositSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Destination Account</label>
                        <div className="grid grid-cols-2 gap-3">
                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setSelectedAccountId(acc.id)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                        selectedAccountId === acc.id 
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {acc.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                         <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('source')}</label>
                         <div className="flex bg-white/5 p-1 rounded-lg mb-3">
                             <button
                                type="button"
                                onClick={() => setSourceType('MANUAL')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === 'MANUAL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                             >
                                {t('manual')}
                             </button>
                             <button
                                type="button"
                                onClick={() => setSourceType('TRANSFER')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === 'TRANSFER' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                             >
                                {t('transfer')}
                             </button>
                         </div>
                         
                         {/* --- BAGIAN YANG DIUPDATE: SOURCE ACCOUNT FILTER --- */}
                         {sourceType === 'TRANSFER' && (
                             <div className="animate-in slide-in-from-top-2 space-y-3">
                                {/* Toggle Filter Suami / Istri */}
                                <div className="flex bg-white/5 p-1 rounded-lg">
                                     <button
                                        type="button"
                                        onClick={() => handleSourceFilterChange('Husband')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                     >
                                        {t('husband')}
                                     </button>
                                     <button
                                        type="button"
                                        onClick={() => handleSourceFilterChange('Wife')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === 'Wife' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                     >
                                        {t('wife')}
                                     </button>
                                </div>

                                {/* Dropdown Akun (Sudah terfilter) */}
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t('select_source')}</label>
                                    <select 
                                        value={sourceMainAccountId} 
                                        onChange={e => setSourceMainAccountId(e.target.value)} 
                                        className={`w-full bg-surface-light text-white p-3 rounded-xl border outline-none transition-colors ${
                                            isInsufficientBalance ? 'border-red-500' : 'border-blue-500/30 focus:border-blue-500'
                                        }`}
                                    >
                                        {mainAccounts
                                            .filter(a => a.owner === sourceOwnerFilter)
                                            .map(acc => (
                                            <option key={acc.id} value={acc.id} className="bg-surface">
                                                {acc.name} ({formatCurrency(acc.balance)})
                                            </option>
                                        ))}
                                        {/* Fallback jika kosong */}
                                        {mainAccounts.filter(a => a.owner === sourceOwnerFilter).length === 0 && (
                                            <option disabled>No accounts found for {sourceOwnerFilter}</option>
                                        )}
                                    </select>
                                </div>
                             </div>
                         )}
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label>
                        <input 
                            type="number"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={`w-full bg-[#18181b] border rounded-xl p-4 text-2xl font-bold outline-none text-right transition-colors ${
                                isInsufficientBalance 
                                ? 'border-red-500 text-red-500' 
                                : 'border-white/10 text-white focus:border-emerald-500'
                            }`}
                            placeholder="0"
                            autoFocus
                        />
                        {isInsufficientBalance && (
                            <div className="flex items-center justify-end mt-2 text-red-500 animate-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                <span className="text-xs font-medium">
                                    {t('insufficient')} (Max: {formatCurrency(selectedSourceAccount?.balance || 0)})
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Date</label>
                            <input 
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                            />
                         </div>
                         <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note</label>
                            <input 
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                placeholder="Notes..."
                            />
                         </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={!amount || isInsufficientBalance} 
                        className="w-full bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-bold py-4 rounded-xl mt-4 transition-all"
                    >
                        {t('save')}
                    </button>
                </form>
            </div>
        </div>
      )}

      {showEditModal && targetAccount && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <Pencil className="w-12 h-12 text-amber-500 mx-auto mb-4 bg-amber-500/10 p-3 rounded-full" />
                    <h3 className="text-lg font-bold text-white">{t('edit_balance')}</h3>
                    <p className="text-xs text-gray-400 mt-1">{targetAccount.name}</p>
                </div>
                <form onSubmit={handleEditBalanceSubmit} className="space-y-4">
                    <input 
                        type="number"
                        value={editBalanceValue}
                        onChange={e => setEditBalanceValue(e.target.value)}
                        className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">{t('cancel')}</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">Update</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showCompleteModal && targetAccount && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="w-full max-w-sm bg-black rounded-t-[3rem] rounded-b-2xl border-2 border-amber-600 p-8 shadow-[0_0_50px_rgba(217,119,6,0.3)] animate-in zoom-in-95 duration-500 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-900/40 to-transparent"></div>
                <div className="w-20 h-20 bg-black border-2 border-amber-500 mx-auto mb-6 flex items-center justify-center rotate-45 shadow-lg shadow-amber-900/50">
                    <div className="-rotate-45">
                        <Landmark className="w-10 h-10 text-amber-400" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-amber-500 mb-2 font-serif">{t('complete_hajj')}</h3>
                <p className="text-amber-200/60 text-sm mb-6 leading-relaxed">{t('complete_desc')}</p>
                <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-xl mb-8">
                     <p className="text-xs text-amber-500/70 uppercase tracking-widest mb-1">Total Utilized</p>
                     <p className="text-2xl font-bold text-white">{formatCurrency(targetAccount.balance)}</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleCompleteSubmit} 
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-700 to-yellow-600 text-white font-bold text-lg shadow-lg hover:shadow-amber-500/20 transition-all active:scale-[0.98] border border-amber-400/30"
                    >
                        {t('bismillah')}
                    </button>
                    <button 
                        onClick={() => setShowCompleteModal(false)} 
                        className="text-gray-500 text-sm py-2 hover:text-white transition-colors"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default NonProfit;