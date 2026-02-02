import React, { useState, useEffect } from 'react';
import { NonProfitAccount, NonProfitTransaction, Account, AccountOwner } from '../types';
import { UserCircle2, Landmark, Plus, X, ArrowDownRight, Pencil, CheckCircle2, BellRing, Trash2, PlusCircle } from 'lucide-react';
import { format, isSameMonth, parseISO } from 'date-fns';

// === INTERNAL COMPONENT: CURRENCY INPUT ===
interface CurrencyInputProps {
    value: string | number;
    onChange: (val: string) => void;
    currency: string;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

const CurrencyInput = ({ value, onChange, currency, className, ...props }: CurrencyInputProps) => {
    const formatDisplay = (val: string | number) => {
        if (!val) return '';
        const digits = val.toString().replace(/\D/g, ''); 
        if (!digits) return '';
        return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US').format(BigInt(digits));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        onChange(raw);
    };

    return (
        <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className={`font-bold ${currency === 'IDR' ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {currency === 'IDR' ? 'Rp' : '$'}
                </span>
            </div>
            <input
                type="text"
                inputMode="numeric"
                value={formatDisplay(value)}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 ${className}`}
                {...props}
            />
        </div>
    );
};

// === MAIN COMPONENT ===
interface NonProfitProps {
  accounts: NonProfitAccount[];
  transactions: NonProfitTransaction[];
  mainAccounts: Account[];
  onAddTransaction: (tx: NonProfitTransaction, sourceMainAccountId?: string) => void;
  onUpdateBalance: (accountId: string, newBalance: number) => void;
  onComplete: (accountId: string) => void;
  onClearHistory: () => void;
  onAddAccount: (name: string, owner: AccountOwner, target: number) => void;
  onDeleteAccount: (id: string) => void;
  lang?: 'en' | 'id';
  currency?: string;
}

const NonProfit: React.FC<NonProfitProps> = ({ 
    accounts, 
    transactions, 
    mainAccounts,
    onAddTransaction, 
    onUpdateBalance,
    onComplete,
    onClearHistory,
    onAddAccount,
    onDeleteAccount,
    lang = 'en',
    currency = 'IDR'
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Create Account State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOwner, setNewOwner] = useState<AccountOwner>('Husband');
  const [newTarget, setNewTarget] = useState('');

  // Alert State
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);
  
  // Add Transaction State
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [sourceType, setSourceType] = useState<'MANUAL' | 'TRANSFER'>('MANUAL');
  const [sourceMainAccountId, setSourceMainAccountId] = useState('');
  
  // Filter Sumber Dana
  const [sourceOwnerFilter, setSourceOwnerFilter] = useState<AccountOwner>('Husband');

  // Edit/Complete State
  const [targetAccount, setTargetAccount] = useState<NonProfitAccount | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(val);

  const t = (key: string) => {
    const dict: any = {
      'title': lang === 'en' ? 'Hajj & Umrah Fund' : 'Tabungan Haji & Umrah',
      'create_btn': lang === 'en' ? 'New Fund' : 'Buat Tabungan',
      'create_title': lang === 'en' ? 'Create Hajj/Umrah Fund' : 'Buat Tabungan Haji/Umrah',
      'fund_name': lang === 'en' ? 'Fund Name' : 'Nama Tabungan',
      'target': lang === 'en' ? 'Target Amount' : 'Target Dana',
      'save': lang === 'en' ? 'Save' : 'Simpan',
      'cancel': lang === 'en' ? 'Cancel' : 'Batal',
      'husband': lang === 'en' ? 'Husband' : 'Suami',
      'wife': lang === 'en' ? 'Wife' : 'Istri',
      'add': lang === 'en' ? 'Deposit' : 'Setor',
      'source': lang === 'en' ? 'Source of Fund' : 'Sumber Dana',
      'manual': lang === 'en' ? 'Cash / External' : 'Tunai / Luar',
      'transfer': lang === 'en' ? 'From Main Account' : 'Transfer Akun Utama',
      'select_source': lang === 'en' ? 'Select Source Account' : 'Pilih Akun Sumber',
      'edit_balance': lang === 'en' ? 'Update Balance' : 'Ubah Saldo',
      'complete_hajj': lang === 'en' ? 'Complete' : 'Tunaikan',
      'complete_desc': lang === 'en' ? 'Funds will be utilized and balance reset to 0.' : 'Dana akan digunakan dan saldo di-reset ke 0.',
      'bismillah': lang === 'en' ? 'Bismillah, Proceed' : 'Bismillah, Tunaikan',
      'history': lang === 'en' ? 'History' : 'Riwayat',
      'clear_history': lang === 'en' ? 'Clear History' : 'Hapus Riwayat',
      'reminder_title': lang === 'en' ? 'Monthly Deposit Reminder' : 'Pengingat Setoran Bulanan',
      'reminder_desc': lang === 'en' ? 'The month is ending and you haven\'t deposited yet. Keep your Hajj consistency!' : 'Bulan segera berakhir dan Anda belum setor tabungan Haji bulan ini. Yuk istiqomah!',
    };
    return dict[key] || key;
  };

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

  const selectedSourceAccount = mainAccounts.find(a => a.id === sourceMainAccountId);
  const numericAmount = parseFloat(amount) || 0;
  const isInsufficientBalance = sourceType === 'TRANSFER' && selectedSourceAccount && numericAmount > selectedSourceAccount.balance;

  const handleOpenDeposit = (accountId: string) => {
      setSelectedAccountId(accountId);
      const targetAcc = accounts.find(a => a.id === accountId);
      if (targetAcc) {
          setSourceOwnerFilter(targetAcc.owner);
          const defaultSource = mainAccounts.find(a => a.owner === targetAcc.owner);
          if (defaultSource) {
              setSourceMainAccountId(defaultSource.id);
          } else {
              setSourceMainAccountId(mainAccounts[0]?.id || '');
          }
      }
      setShowAddModal(true);
  };

  const handleSourceFilterChange = (owner: AccountOwner) => {
      setSourceOwnerFilter(owner);
      const firstAcc = mainAccounts.find(a => a.owner === owner);
      if (firstAcc) setSourceMainAccountId(firstAcc.id);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedAccountId || isInsufficientBalance) return;
    
    onAddTransaction({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amount: parseFloat(amount),
        accountId: selectedAccountId,
        notes: notes + (sourceType === 'TRANSFER' ? ' (Transfer)' : '')
    }, sourceType === 'TRANSFER' ? sourceMainAccountId : undefined);

    setShowAddModal(false);
    setAmount(''); setNotes(''); setSourceType('MANUAL');
  };

  const handleEditBalanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(targetAccount && editBalanceValue) {
          onUpdateBalance(targetAccount.id, parseFloat(editBalanceValue));
          setShowEditModal(false);
          setTargetAccount(null);
      }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newName) {
          onAddAccount(newName, newOwner, parseFloat(newTarget) || 0);
          setShowCreateModal(false);
          setNewName(''); setNewTarget('');
      }
  };

  const handleCompleteSubmit = () => {
      if (targetAccount) {
          onComplete(targetAccount.id);
          setShowCompleteModal(false);
          setTargetAccount(null);
      }
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
      <div className="p-6 pt-32 pb-60 bg-surface rounded-b-[3rem] shadow-xl relative overflow-hidden text-center group">
         <div className="absolute inset-0 opacity-20 mix-blend-hard-light" style={{ background: `linear-gradient(to bottom right, var(--color-primary), transparent)` }}></div>
         <div className="absolute top-0 right-0 p-4 opacity-10 mix-blend-overlay"><div className="w-32 h-32 bg-white rotate-45 border-4 border-white/50"></div></div>
        
        <div className="absolute top-6 right-6 z-30">
            <button onClick={() => setShowCreateModal(true)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all"><Plus className="w-3 h-3" /> {t('create_btn')}</button>
        </div>

        <div className="relative z-10 mt-2">
            <h1 className="text-xl md:text-2xl font-serif text-white/80 mb-6 uppercase tracking-widest border-b border-white/20 inline-block pb-3">{t('title')}</h1>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">{formatCurrency(totalBalance)}</h2>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-24 relative z-20">
        {showMonthlyReminder && accounts.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/50 p-4 rounded-2xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top-4 relative z-20 backdrop-blur-md">
                <div className="p-2 bg-rose-500 rounded-full text-white shrink-0 shadow-lg shadow-rose-900/50 animate-pulse"><BellRing className="w-5 h-5" /></div>
                <div><h3 className="text-rose-400 font-bold text-sm mb-1">{t('reminder_title')}</h3><p className="text-rose-200/80 text-xs leading-relaxed">{t('reminder_desc')}</p></div>
            </div>
        )}

        <div className="space-y-4">
            {accounts.length === 0 ? (
                <div className="bg-surface border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500"><Landmark className="w-8 h-8" /></div>
                    <h3 className="text-white font-bold text-lg mb-2">Belum Ada Tabungan</h3>
                    <p className="text-gray-400 text-sm mb-6">Mulai rencanakan ibadah haji/umrah Anda sekarang.</p>
                    <button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg"><PlusCircle className="w-5 h-5" />{t('create_btn')}</button>
                </div>
            ) : (
                accounts.map(acc => (
                    <div key={acc.id} className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <UserCircle2 className={`w-5 h-5 ${acc.owner === 'Husband' ? 'text-indigo-400' : 'text-pink-400'}`} />
                                <span className="font-semibold text-gray-200 text-sm">{acc.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(acc)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => onDeleteAccount(acc.id)} className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                {acc.owner === 'Husband' ? <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded">{t('husband')}</span> : <span className="bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2 py-1 rounded">{t('wife')}</span>}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(acc.balance)}</span>
                            {acc.target > 0 && <span className="text-xs text-gray-500">/ {formatCurrency(acc.target)}</span>}
                        </div>
                        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-6 opacity-50">
                            <div className="h-full opacity-80" style={{ width: `${Math.min((acc.balance / (acc.target || 1)) * 100, 100)}%`, backgroundColor: 'var(--color-primary)' }}></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleOpenDeposit(acc.id)} className="relative flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all overflow-hidden group"><div className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'var(--color-primary)' }}></div><div className="relative z-10 flex items-center gap-2 text-white"><Plus className="w-5 h-5" />{t('add')}</div></button>
                            <button onClick={() => openCompleteModal(acc)} disabled={acc.balance <= 0} className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all bg-white/5 border border-white/10 text-gray-400 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"><Landmark className="w-4 h-4" />{t('complete_hajj')}</button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* --- RIWAYAT TRANSAKSI (LAYOUT BARU) --- */}
        <div className="space-y-3 pb-8">
            <div className="flex justify-between items-end px-1">
                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">{t('history')}</h3>
                {transactions.length > 0 && (
                    <button onClick={onClearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3" />{t('clear_history')}</button>
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
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                {/* KIRI: Icon & Info Vertikal */}
                                <div className="flex items-center gap-4 overflow-hidden flex-1">
                                    {/* Icon Box */}
                                    <div className={`p-2 rounded-full shrink-0 ${isCompletion ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                                        {isCompletion ? <CheckCircle2 className="w-5 h-5 text-amber-500" /> : <ArrowDownRight className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
                                    </div>
                                    
                                    {/* Teks Vertikal */}
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        {/* Baris 1: Pemilik (Suami/Istri) */}
                                        <span className="text-sm font-bold text-white">
                                            {acc?.owner === 'Husband' ? t('husband') : (acc?.owner === 'Wife' ? t('wife') : acc?.name)}
                                        </span>
                                        {/* Baris 2: Tanggal */}
                                        <span className="text-xs text-gray-500">
                                            {format(new Date(tx.date), 'dd MMM yyyy')}
                                        </span>
                                        {/* Baris 3: Notes / Type */}
                                        <span className="text-xs text-gray-400 truncate italic">
                                            {tx.notes || t('add')}
                                        </span>
                                    </div>
                                </div>

                                {/* KANAN: Nominal (Rata Kanan) */}
                                <div className="text-right pl-4 shrink-0">
                                    <span className={`font-bold text-sm block ${isCompletion ? 'text-gray-400' : ''}`} style={{ color: isCompletion ? undefined : 'var(--color-primary)' }}>
                                        {isCompletion ? 'COMPLETED' : `+${formatCurrency(tx.amount)}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {/* --- CREATE ACCOUNT MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">{t('create_title')}</h3><button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('fund_name')}</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary" placeholder="e.g. Haji Suami" autoFocus /></div>
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Owner</label><div className="flex bg-white/5 p-1 rounded-lg"><button type="button" onClick={() => setNewOwner('Husband')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newOwner === 'Husband' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>{t('husband')}</button><button type="button" onClick={() => setNewOwner('Wife')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newOwner === 'Wife' ? 'bg-pink-600 text-white' : 'text-gray-400'}`}>{t('wife')}</button></div></div>
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('target')}</label><CurrencyInput value={newTarget} onChange={val => setNewTarget(val)} currency={currency} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right" placeholder="0" /></div>
                    <button type="submit" disabled={!newName} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> {t('create_btn')}</button>
                </form>
            </div>
        </div>
      )}

      {/* --- ADD TRANSACTION MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full md:w-[500px] bg-surface rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]"><h3 className="font-bold text-white text-lg">{t('add')}</h3><button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-gray-400" /></button></div>
                <form onSubmit={handleDepositSubmit} className="p-6 space-y-5">
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Destination Account</label><div className="grid grid-cols-2 gap-3">{accounts.map(acc => (<button key={acc.id} type="button" onClick={() => setSelectedAccountId(acc.id)} className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedAccountId === acc.id ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`} style={selectedAccountId === acc.id ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'rgba(255,255,255,0.05)' } : {}}>{acc.name}</button>))}</div></div>
                    <div>
                         <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('source')}</label>
                         <div className="flex bg-white/5 p-1 rounded-lg mb-3"><button type="button" onClick={() => setSourceType('MANUAL')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === 'MANUAL' ? 'text-white shadow' : 'text-gray-400 hover:text-white'}`} style={sourceType === 'MANUAL' ? { backgroundColor: 'var(--color-primary)' } : {}}>{t('manual')}</button><button type="button" onClick={() => setSourceType('TRANSFER')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === 'TRANSFER' ? 'text-white shadow' : 'text-gray-400 hover:text-white'}`} style={sourceType === 'TRANSFER' ? { backgroundColor: '#3b82f6' } : {}}>{t('transfer')}</button></div>
                         {sourceType === 'TRANSFER' && (<div className="animate-in slide-in-from-top-2 space-y-3"><div className="flex bg-white/5 p-1 rounded-lg"><button type="button" onClick={() => handleSourceFilterChange('Husband')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>{t('husband')}</button><button type="button" onClick={() => handleSourceFilterChange('Wife')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === 'Wife' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>{t('wife')}</button></div><div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t('select_source')}</label><select value={sourceMainAccountId} onChange={e => setSourceMainAccountId(e.target.value)} className={`w-full bg-surface-light text-white p-3 rounded-xl border outline-none transition-colors ${isInsufficientBalance ? 'border-red-500' : 'border-blue-500/30 focus:border-blue-500'}`}>{mainAccounts.filter(a => a.owner === sourceOwnerFilter).map(acc => (<option key={acc.id} value={acc.id} className="bg-surface">{acc.name} ({formatCurrency(acc.balance)})</option>))}{mainAccounts.filter(a => a.owner === sourceOwnerFilter).length === 0 && (<option disabled>No accounts found for {sourceOwnerFilter}</option>)}</select></div></div>)}
                    </div>
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label><CurrencyInput value={amount} onChange={val => setAmount(val)} currency={currency} className="bg-[#18181b] border border-white/10 rounded-xl p-4 text-2xl font-bold outline-none text-right focus:border-white/30 text-white placeholder-gray-600" placeholder="0" autoFocus /></div>
                    <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-white/30" placeholder="Notes..." /></div>
                    <button type="submit" disabled={!amount || isInsufficientBalance} className="w-full font-bold py-4 rounded-xl mt-4 transition-all text-white relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group"><div className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'var(--color-primary)' }}></div><span className="relative z-10">{t('save')}</span></button>
                </form>
            </div>
        </div>
      )}

      {showEditModal && targetAccount && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6"><Pencil className="w-12 h-12 text-amber-500 mx-auto mb-4 bg-amber-500/10 p-3 rounded-full" /><h3 className="text-lg font-bold text-white">{t('edit_balance')}</h3><p className="text-xs text-gray-400 mt-1">{targetAccount.name}</p></div>
                <form onSubmit={handleEditBalanceSubmit} className="space-y-4">
                    <CurrencyInput value={editBalanceValue} onChange={val => setEditBalanceValue(val)} currency={currency} className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500" />
                    <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">{t('cancel')}</button><button type="submit" className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">Update</button></div>
                </form>
            </div>
        </div>
      )}

      {showCompleteModal && targetAccount && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="w-full max-w-sm bg-black rounded-t-[3rem] rounded-b-2xl border-2 border-amber-600 p-8 shadow-[0_0_50px_rgba(217,119,6,0.3)] animate-in zoom-in-95 duration-500 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-900/40 to-transparent"></div>
                <div className="w-20 h-20 bg-black border-2 border-amber-500 mx-auto mb-6 flex items-center justify-center rotate-45 shadow-lg shadow-amber-900/50"><div className="-rotate-45"><Landmark className="w-10 h-10 text-amber-400" /></div></div>
                <h3 className="text-2xl font-bold text-amber-500 mb-2 font-serif">{t('complete_hajj')}</h3><p className="text-amber-200/60 text-sm mb-6 leading-relaxed">{t('complete_desc')}</p>
                <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-xl mb-8"><p className="text-xs text-amber-500/70 uppercase tracking-widest mb-1">Total Utilized</p><p className="text-2xl font-bold text-white">{formatCurrency(targetAccount.balance)}</p></div>
                <div className="flex flex-col gap-3"><button onClick={handleCompleteSubmit} className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-700 to-yellow-600 text-white font-bold text-lg shadow-lg hover:shadow-amber-500/20 transition-all active:scale-[0.98] border border-amber-400/30">{t('bismillah')}</button><button onClick={() => setShowCompleteModal(false)} className="text-gray-500 text-sm py-2 hover:text-white transition-colors">{t('cancel')}</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default NonProfit;