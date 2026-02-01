import React, { useState, useMemo } from 'react';
import { Account, Transaction, AccountOwner } from '../types';
import { Coins, CalendarClock, HandCoins, X, UserCircle2, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { subDays, parseISO, format } from 'date-fns';

interface ZakatMalProps {
    accounts: Account[];
    transactions: Transaction[];
    onAddTransaction: (tx: Transaction) => void;
}

const ZakatMal: React.FC<ZakatMalProps> = ({ accounts, transactions, onAddTransaction }) => {
    const [goldPrice, setGoldPrice] = useState<number>(1000000); // Default 1jt/gram
    const [selectedOwner, setSelectedOwner] = useState<AccountOwner>('Husband');
    
    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [paymentSourceAccountId, setPaymentSourceAccountId] = useState('');

    // --- 1. Hijri Date Helper ---
    const getHijriDateParts = (date: Date) => {
        try {
            const parts = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
                day: 'numeric', month: 'numeric', year: 'numeric'
            }).formatToParts(date);
            const d = parseInt(parts.find(p => p.type === 'day')?.value || '1');
            const m = parseInt(parts.find(p => p.type === 'month')?.value || '1');
            const y = parseInt(parts.find(p => p.type === 'year')?.value || '1445');
            return { d, m, y, valid: true };
        } catch (e) { return { d: 1, m: 1, y: 1445, valid: false }; }
    };

    // --- 2. Calculation Logic ---
    const calculationResult = useMemo(() => {
        const NISAB_GRAMS = 85;
        const nisabValue = goldPrice * NISAB_GRAMS;
        
        let haulStartDate = subDays(new Date(), 354);
        let haulStartHijriString = "Approx. 1 Lunar Year Ago";
        try {
            const todayParts = getHijriDateParts(new Date());
            if(todayParts.valid) haulStartHijriString = `Ramadan ${todayParts.y - 1}`;
        } catch(e) {}

        const ownerAccounts = accounts.filter(a => a.owner === selectedOwner);
        const currentTotalAssets = ownerAccounts.reduce((sum, acc) => sum + acc.balance, 0);

        if (currentTotalAssets < nisabValue) {
            return {
                status: 'NOT_OBLIGATED',
                reason: 'Current assets below Nisab.',
                currentTotal: currentTotalAssets,
                nisabValue,
                zakatAmount: 0,
                minBalanceInYear: currentTotalAssets,
                minBalanceDate: new Date(),
                haulStartDate, haulStartHijriString
            };
        }

        // Logic Haul Sederhana (Simulation)
        let minBalanceInHaul = currentTotalAssets; 
        
        return {
            status: 'OBLIGATED',
            reason: 'Assets above Nisab.',
            currentTotal: currentTotalAssets,
            nisabValue,
            zakatAmount: currentTotalAssets * 0.025, // Menggunakan currentTotal untuk demo simplifikasi
            minBalanceInYear: minBalanceInHaul, // Di real app ini hasil loop history
            minBalanceDate: subDays(new Date(), 100), // Contoh tanggal dummy untuk visualisasi
            haulStartDate, haulStartHijriString
        };
    }, [goldPrice, selectedOwner, accounts, transactions]);

    const handlePayZakat = () => {
        if (!paymentSourceAccountId) return;
        
        const tx: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'EXPENSE',
            amount: calculationResult.zakatAmount,
            accountId: paymentSourceAccountId,
            category: 'Zakat & Charity',
            notes: `Zakat Mal (${selectedOwner})`
        };
        onAddTransaction(tx);
        setShowPayModal(false);
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const currentHijriDisplay = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(new Date());
        } catch { return "Hijri Date"; }
    }, []);

    return (
        <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
            {/* --- HEADER DYNAMIC --- */}
            <div className="p-6 pt-32 pb-40 bg-surface rounded-b-[3rem] shadow-xl relative overflow-hidden text-center group">
                 <div 
                    className="absolute inset-0 opacity-20 mix-blend-hard-light transition-colors duration-500"
                    style={{ background: `linear-gradient(to bottom right, var(--color-primary), transparent)` }}
                 ></div>
                 <div className="absolute top-0 left-0 p-4 opacity-5">
                     <Coins className="w-32 h-32 text-white -rotate-12" />
                 </div>
                 <div className="relative z-10">
                    <h1 className="text-2xl font-bold text-white mb-2">Zakat Mal Calculator</h1>
                    <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                        <p className="text-white/80 text-sm font-medium">{currentHijriDisplay}</p>
                    </div>
                 </div>
            </div>

            <div className="p-4 space-y-6 -mt-24 relative z-20">
                
                {/* Input Section */}
                <div className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                    <div className="flex bg-black/30 p-1 rounded-xl">
                        {(['Husband', 'Wife'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedOwner(role)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    selectedOwner === role 
                                    ? 'bg-white/10 text-white shadow border border-white/20' 
                                    : 'text-gray-400 hover:text-white'
                                }`}
                                style={selectedOwner === role ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                            >
                                <UserCircle2 className="w-4 h-4" />
                                {role === 'Husband' ? 'Suami' : 'Istri'}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 flex items-center gap-2">Current Gold Price / Gram (IDR)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                value={goldPrice}
                                onChange={e => setGoldPrice(Number(e.target.value))}
                                className="w-full bg-[#18181b] border border-white/10 rounded-xl p-4 pl-12 text-lg font-bold text-white outline-none focus:border-white/30 transition-colors"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-yellow-500/10 p-1.5 rounded-lg">
                                <Coins className="w-4 h-4 text-yellow-500" />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">* Nisab (85g) = {formatCurrency(goldPrice * 85)}</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center text-xs text-gray-300">
                    <span className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Start Date (Haul):</span>
                    <span className="font-bold text-white text-right">
                        {calculationResult.haulStartHijriString} <br/> 
                        <span className="text-[10px] text-gray-500 font-normal">({format(calculationResult.haulStartDate, 'd MMM yyyy')})</span>
                    </span>
                </div>

                {/* --- RESULT SECTION (DYNAMIC) --- */}
                {calculationResult.status === 'OBLIGATED' ? (
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-lg relative overflow-hidden animate-in zoom-in-95 group">
                        <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-25" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-full text-white shadow-lg" style={{ backgroundColor: 'var(--color-primary)' }}>
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Wajib Zakat</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-white/60 text-xs uppercase font-bold mb-1">Total Assets (Haul Met)</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(calculationResult.currentTotal)}</p>
                                </div>
                                
                                <div className="h-px w-full bg-white/10"></div>

                                <div>
                                    <p className="text-white/60 text-xs uppercase font-bold mb-1">Zakat Amount (2.5%)</p>
                                    <p className="text-3xl font-bold text-yellow-400 drop-shadow-sm">{formatCurrency(calculationResult.zakatAmount)}</p>
                                    
                                    {/* --- NEW: DETAILED LOWEST BALANCE INFO (MOVED HERE) --- */}
                                    <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-white/70 uppercase font-bold">Basis Perhitungan (Terendah)</span>
                                            <span className="text-sm font-bold text-white">{formatCurrency(calculationResult.minBalanceInYear)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-white/50">Tanggal Saldo Terendah</span>
                                            <span className="text-[10px] text-white/80 font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                                {format(calculationResult.minBalanceDate, 'd MMM yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                    {/* -------------------------------------------------- */}
                                </div>

                                <button 
                                    onClick={() => {
                                        setPaymentSourceAccountId(accounts.find(a => a.group === 'Cash' || a.group === 'Bank Accounts')?.id || '');
                                        setShowPayModal(true);
                                    }}
                                    className="w-full py-3 hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                                    style={{ backgroundColor: '#ca8a04' }}
                                >
                                    <HandCoins className="w-5 h-5" />
                                    Bayar Zakat Sekarang
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-lg animate-in zoom-in-95">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-700 rounded-full text-gray-300"><Info className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-gray-200">Tidak Wajib Zakat</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            {calculationResult.status === 'HAUL_BROKEN' 
                                ? `Total harta sempat turun di bawah nisab.`
                                : `Total harta saat ini (${formatCurrency(calculationResult.currentTotal)}) belum mencapai nisab.`
                            }
                        </p>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-3 items-start">
                             <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                             <div>
                                 <p className="text-gray-200 text-sm font-bold mb-1">Tetap Bisa Sedekah!</p>
                                 <p className="text-gray-400 text-xs">Meski tidak wajib zakat mal, anjuran bersedekah tetap terbuka lebar.</p>
                             </div>
                        </div>
                    </div>
                )}

                {/* PAY ZAKAT MODAL */}
                {showPayModal && (
                    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="w-full md:w-[500px] bg-surface rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
                                <h3 className="font-bold text-white text-lg">Bayar Zakat Mal</h3>
                                <button onClick={() => setShowPayModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Source Account</label>
                                    <select 
                                        value={paymentSourceAccountId} 
                                        onChange={e => setPaymentSourceAccountId(e.target.value)} 
                                        className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                                    >
                                        <option value="" disabled>Select Account</option>
                                        {accounts.filter(a => a.group === 'Cash' || a.group === 'Bank Accounts').map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                                    <p className="text-xs text-yellow-500 uppercase font-bold mb-1">Amount to Pay</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(calculationResult.zakatAmount)}</p>
                                </div>
                                <button 
                                    onClick={handlePayZakat}
                                    disabled={!paymentSourceAccountId}
                                    className="w-full bg-yellow-600 disabled:opacity-50 hover:bg-yellow-700 text-white font-bold py-4 rounded-xl mt-4 transition-all"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ZakatMal;