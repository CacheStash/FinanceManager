import React, { useState, useMemo } from 'react';
import { Account, Transaction, AccountOwner } from '../types';
import { Coins, Calculator, AlertCircle, CheckCircle2, Info, UserCircle2, CalendarClock, HandCoins, X } from 'lucide-react';
import { subDays, differenceInDays, parseISO, format, addDays } from 'date-fns';

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
                day: 'numeric',
                month: 'numeric',
                year: 'numeric'
            }).formatToParts(date);
            
            const d = parseInt(parts.find(p => p.type === 'day')?.value || '1');
            const m = parseInt(parts.find(p => p.type === 'month')?.value || '1');
            const y = parseInt(parts.find(p => p.type === 'year')?.value || '1445');
            return { d, m, y, valid: true };
        } catch (e) {
            return { d: 1, m: 1, y: 1445, valid: false };
        }
    };

    // --- 2. Calculation Logic ---
    const calculationResult = useMemo(() => {
        // A. Parameters
        const NISAB_GRAMS = 85;
        const nisabValue = goldPrice * NISAB_GRAMS;
        
        // B. Determine Haul Start Date (1 Ramadan of Previous Hijri Year)
        // Logic: Zakat Mal Haul is 1 lunar year. If user aligns to Ramadan, we calculate strictly from last Ramadan.
        let haulStartDate = subDays(new Date(), 354); // Fallback
        let haulStartHijriString = "";

        const todayParts = getHijriDateParts(new Date());
        
        if (todayParts.valid) {
            // We want to find the Gregorian date for 1 Ramadan of the PREVIOUS Hijri cycle.
            // If today is Ramadan (9) 1446, Haul started Ramadan (9) 1445.
            // If today is Muharram (1) 1446, Haul started Ramadan (9) 1445.
            
            // Start searching backwards from approx 330 days ago to find 1st Ramadan
            let searchDate = subDays(new Date(), 330); 
            // Safety limit for loop
            let checks = 0;
            
            // Loop backwards until we find Month 9 (Ramadan) and Day 1
            // Optimized: Just scan a range around expected date
            let found = false;
            
            // Adjust search window: Go back enough to ensure we hit the previous year's Ramadan
            // If currently month 10, 11, 12 -> Last Ramadan was this year.
            // If currently month 1..8 -> Last Ramadan was previous year.
            // Actually, Zakat Haul is always 1 full year (~354 days). 
            // So we simply look for Month 9, Day 1 that is closest to (Now - 354 days).
            
            searchDate = subDays(new Date(), 340); // Start slightly after 1 year ago

            while (checks < 60) { // Search window of ~2 months around the target
                const p = getHijriDateParts(searchDate);
                // Ramadan is month 9
                if (p.m === 9 && p.d === 1) {
                    haulStartDate = searchDate;
                    haulStartHijriString = `1 Ramadan ${p.y}`;
                    found = true;
                    break;
                }
                // If we are at Month 9 Day 2, go back 1 day. 
                // If we are at Month 8, we went too far back? No, we start from 340 days ago.
                searchDate = subDays(searchDate, 1);
                checks++;
            }
            
            if (!found) {
                 // Fallback: Try searching forward from 370 days ago
                 searchDate = subDays(new Date(), 370);
                 checks = 0;
                 while(checks < 60) {
                    const p = getHijriDateParts(searchDate);
                    if (p.m === 9 && p.d === 1) {
                        haulStartDate = searchDate;
                        haulStartHijriString = `1 Ramadan ${p.y}`;
                        found = true;
                        break;
                    }
                    searchDate = addDays(searchDate, 1);
                    checks++;
                 }
            }

            if (!found) {
                haulStartHijriString = "Approx. 1 Lunar Year Ago";
                haulStartDate = subDays(new Date(), 354);
            }
        }

        // C. Filter Accounts by Owner
        const ownerAccounts = accounts.filter(a => a.owner === selectedOwner);
        const currentTotalAssets = ownerAccounts.reduce((sum, acc) => sum + acc.balance, 0);

        // D. Quick Check: Current Balance vs Nisab
        if (currentTotalAssets < nisabValue) {
            return {
                status: 'NOT_OBLIGATED',
                reason: 'Current assets below Nisab.',
                currentTotal: currentTotalAssets,
                nisabValue,
                zakatAmount: 0,
                minBalanceInYear: currentTotalAssets,
                minBalanceDate: new Date(),
                haulStartDate,
                haulStartHijriString
            };
        }

        // E. HAUL CHECK (Historical Simulation)
        const balances = new Map<string, number>();
        ownerAccounts.forEach(acc => balances.set(acc.id, acc.balance));

        const sortedTx = [...transactions]
            .filter(t => ownerAccounts.some(acc => acc.id === t.accountId || acc.id === t.toAccountId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let minBalanceInHaul = currentTotalAssets;
        let minBalanceDate = new Date(); // Default today

        const getTotal = () => {
            let total = 0;
            balances.forEach(v => total += v);
            return total;
        };

        // Iterate transactions backwards
        for (const tx of sortedTx) {
            const txDate = parseISO(tx.date);
            // Stop if we go before the Haul Start Date (Last Ramadan)
            if (txDate < haulStartDate) break;

            const dailyTotal = getTotal();
            // We check the balance *after* the transaction occurred (which is 'dailyTotal' in this backward loop context)
            // Wait, in reverse loop:
            // State: End of Day 5.
            // Tx happened on Day 5.
            // Before processing Tx (reverse), 'dailyTotal' is End of Day 5 balance.
            
            if (dailyTotal < minBalanceInHaul) {
                minBalanceInHaul = dailyTotal;
                minBalanceDate = txDate;
            }

            // Reverse Transaction Logic to get to state *before* this transaction
            const accId = tx.accountId;
            if (balances.has(accId)) {
                const currentBal = balances.get(accId) || 0;
                if (tx.type === 'INCOME') balances.set(accId, currentBal - tx.amount);
                else if (tx.type === 'EXPENSE') balances.set(accId, currentBal + tx.amount);
                else if (tx.type === 'TRANSFER' && tx.toAccountId) {
                    balances.set(accId, currentBal + tx.amount + (tx.fees || 0));
                }
            }
            if (tx.toAccountId && balances.has(tx.toAccountId)) {
                const toBal = balances.get(tx.toAccountId) || 0;
                if (tx.type === 'TRANSFER') balances.set(tx.toAccountId, toBal - tx.amount);
            }
        }

        // Check the balance at the very start of the Haul
        const startOfHaulTotal = getTotal();
        if (startOfHaulTotal < minBalanceInHaul) {
            minBalanceInHaul = startOfHaulTotal;
            minBalanceDate = haulStartDate;
        }

        // F. Determine Status
        if (minBalanceInHaul < nisabValue) {
            return {
                status: 'HAUL_BROKEN',
                reason: 'Assets dipped below Nisab within the Hijri year.',
                currentTotal: currentTotalAssets,
                nisabValue,
                zakatAmount: 0,
                minBalanceInYear: minBalanceInHaul,
                minBalanceDate,
                haulStartDate,
                haulStartHijriString
            };
        }

        return {
            status: 'OBLIGATED',
            reason: 'Assets remained above Nisab since last Ramadan.',
            currentTotal: currentTotalAssets,
            nisabValue,
            zakatAmount: minBalanceInHaul * 0.025, // Rule: 2.5% of the LOWEST balance in the year
            minBalanceInYear: minBalanceInHaul,
            minBalanceDate,
            haulStartDate,
            haulStartHijriString
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
            notes: `Zakat Mal (${selectedOwner}) - ${calculationResult.haulStartHijriString} Cycle`
        };

        onAddTransaction(tx);
        setShowPayModal(false);
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    // Header Display Date (Current Hijri)
    const currentHijriDisplay = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(new Date());
        } catch { return "Hijri Date"; }
    }, []);

    return (
        <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
            {/* Header */}
            <div className="p-6 pt-32 pb-40 bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] rounded-b-[3rem] shadow-xl relative overflow-hidden text-center border-b border-indigo-900/50">
                <div className="absolute top-0 left-0 p-4 opacity-5">
                     <Coins className="w-32 h-32 text-indigo-300 -rotate-12" />
                </div>
                
                <h1 className="text-2xl font-bold text-indigo-100 mb-1 relative z-10">Zakat Mal Calculator</h1>
                <p className="text-indigo-300 text-sm font-medium relative z-10 bg-indigo-900/40 inline-block px-3 py-1 rounded-full border border-indigo-500/30">
                    {currentHijriDisplay}
                </p>
            </div>

            <div className="p-4 space-y-6 -mt-24 relative z-20">
                
                {/* Input Section */}
                <div className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                    {/* Owner Toggle */}
                    <div className="flex bg-black/30 p-1 rounded-xl">
                        {(['Husband', 'Wife'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedOwner(role)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    selectedOwner === role 
                                    ? (role === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'bg-pink-600 text-white shadow')
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <UserCircle2 className="w-4 h-4" />
                                {role === 'Husband' ? 'Suami' : 'Istri'}
                            </button>
                        ))}
                    </div>

                    {/* Gold Price Input */}
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 flex items-center gap-2">
                            Current Gold Price / Gram (IDR)
                        </label>
                        <div className="relative">
                            <input 
                                type="number"
                                value={goldPrice}
                                onChange={e => setGoldPrice(Number(e.target.value))}
                                className="w-full bg-[#18181b] border border-white/10 rounded-xl p-4 pl-12 text-lg font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-yellow-500/10 p-1.5 rounded-lg">
                                <Coins className="w-4 h-4 text-yellow-500" />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            * Nisab (85g) = {formatCurrency(goldPrice * 85)}
                        </p>
                    </div>
                </div>

                {/* Calculation Info Box */}
                <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-xl flex justify-between items-center text-xs text-indigo-200">
                    <span className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        Start Date (Haul):
                    </span>
                    <span className="font-bold text-white text-right">
                        {calculationResult.haulStartHijriString} <br/> 
                        <span className="text-[10px] text-indigo-400 font-normal">({format(calculationResult.haulStartDate, 'd MMM yyyy')})</span>
                    </span>
                </div>

                {/* Result Section */}
                {calculationResult.status === 'OBLIGATED' ? (
                    <div className="bg-gradient-to-br from-emerald-900/80 to-emerald-950 border border-emerald-500/50 p-6 rounded-2xl shadow-lg relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full"></div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-900/50">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-emerald-100">Wajib Zakat</h3>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <p className="text-emerald-300 text-xs uppercase font-bold mb-1">Total Assets (Haul Met)</p>
                                <p className="text-2xl font-bold text-white">{formatCurrency(calculationResult.currentTotal)}</p>
                            </div>
                            
                            <div className="h-px bg-emerald-500/30 w-full"></div>

                            <div>
                                <p className="text-emerald-300 text-xs uppercase font-bold mb-1">Zakat Amount (2.5%)</p>
                                <p className="text-3xl font-bold text-yellow-400">{formatCurrency(calculationResult.zakatAmount)}</p>
                                <p className="text-xs text-emerald-200/60 mt-2 italic">
                                    * Calculated from lowest asset balance: {formatCurrency(calculationResult.minBalanceInYear)}
                                </p>
                            </div>

                            <button 
                                onClick={() => {
                                    setPaymentSourceAccountId(accounts.find(a => a.group === 'Cash' || a.group === 'Bank Accounts')?.id || '');
                                    setShowPayModal(true);
                                }}
                                className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20 transition-all active:scale-95"
                            >
                                <HandCoins className="w-5 h-5" />
                                Bayar Zakat Sekarang
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-lg animate-in zoom-in-95">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-700 rounded-full text-gray-300">
                                <Info className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-200">Tidak Wajib Zakat</h3>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            {calculationResult.status === 'HAUL_BROKEN' 
                                ? `Total harta sempat turun di bawah nisab (${formatCurrency(calculationResult.minBalanceInYear)} pada ${format(calculationResult.minBalanceDate, 'd MMM yyyy')}) sejak Ramadan lalu.`
                                : `Total harta saat ini (${formatCurrency(calculationResult.currentTotal)}) belum mencapai nisab.`
                            }
                        </p>

                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
                             <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                             <div>
                                 <p className="text-blue-200 text-sm font-bold mb-1">Tetap Bisa Sedekah!</p>
                                 <p className="text-blue-200/60 text-xs">
                                     Meski tidak wajib zakat mal, anjuran bersedekah tetap terbuka lebar untuk membersihkan harta.
                                 </p>
                             </div>
                        </div>
                    </div>
                )}

                {/* Calculation Details */}
                <div className="px-4 py-2">
                    <h4 className="text-xs text-gray-500 font-bold uppercase mb-3">Calculation Details</h4>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex justify-between">
                            <span>Owner</span>
                            <span className="text-white">{selectedOwner === 'Husband' ? 'Suami' : 'Istri'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Current Total Assets</span>
                            <span className="text-white">{formatCurrency(calculationResult.currentTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Nisab (85g Gold)</span>
                            <span className="text-white">{formatCurrency(calculationResult.nisabValue)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Lowest Balance (Since Haul Start)</span>
                            <div className="text-right">
                                <div className={`${calculationResult.minBalanceInYear < calculationResult.nisabValue ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatCurrency(calculationResult.minBalanceInYear)}
                                </div>
                                <div className="text-[10px] text-gray-500">{format(calculationResult.minBalanceDate, 'd MMM yyyy')}</div>
                            </div>
                        </div>
                    </div>
                </div>

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
                                        className="w-full bg-surface-light text-white p-3 rounded-xl border border-blue-500/30 outline-none focus:border-blue-500"
                                    >
                                        <option value="" disabled>Select Account</option>
                                        {accounts
                                            .filter(a => a.owner === selectedOwner || !a.owner) // Allow generic accounts or specific owner
                                            .filter(a => a.group === 'Cash' || a.group === 'Bank Accounts')
                                            .map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} ({formatCurrency(acc.balance)})
                                                </option>
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