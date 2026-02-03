import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, AccountOwner } from '../types';
import { Coins, CalendarClock, HandCoins, X, UserCircle2, CheckCircle2, Info, AlertCircle, RefreshCw, Loader2, Lock, BadgeCheck } from 'lucide-react';
import { subDays, parseISO, format, isAfter, addDays } from 'date-fns';

interface ZakatMalProps {
    accounts: Account[];
    transactions: Transaction[];
    onAddTransaction: (tx: Transaction) => void;
    // FIX: Ganti WARNING -> ALERT
    onNotify: (title: string, msg: string, type: 'INFO' | 'ALERT' | 'SUCCESS') => void; 
    lang?: 'en' | 'id';
}

const ZakatMal: React.FC<ZakatMalProps> = ({ accounts, transactions, onAddTransaction, onNotify, lang = 'en' }) => {
    const [goldPrice, setGoldPrice] = useState<number>(1400000);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState<AccountOwner>('Husband');
    const [showPayModal, setShowPayModal] = useState(false);
    const [paymentSourceAccountId, setPaymentSourceAccountId] = useState('');

    // --- DICTIONARY ---
    const t = (key: string) => {
        const dict: any = {
            title: lang === 'en' ? 'Zakat Mal Calculator' : 'Kalkulator Zakat Mal',
            goldPrice: lang === 'en' ? 'Current Gold Price / Gram' : 'Harga Emas / Gram',
            liveUpdate: lang === 'en' ? 'Live Update' : 'Update Langsung',
            startDate: lang === 'en' ? 'Start Date (Haul)' : 'Mulai Haul',
            statusObligated: lang === 'en' ? 'Zakat Obligated' : 'Wajib Zakat',
            statusPaid: lang === 'en' ? 'Zakat Paid (Alhamdulillah)' : 'Zakat Lunas (Alhamdulillah)',
            statusNotObligated: lang === 'en' ? 'Not Obligated' : 'Belum Wajib Zakat',
            totalAssets: lang === 'en' ? 'Total Assets (Haul Met)' : 'Total Harta (Haul Terpenuhi)',
            zakatAmount: lang === 'en' ? 'Zakat Amount (2.5%)' : 'Jumlah Zakat (2.5%)',
            calcBasis: lang === 'en' ? 'Calculation Basis (Lowest)' : 'Basis Perhitungan (Terendah)',
            lowestDate: lang === 'en' ? 'Lowest Balance Date' : 'Tanggal Saldo Terendah',
            payNow: lang === 'en' ? 'Pay Zakat Now' : 'Bayar Zakat Sekarang',
            reasonBelow: lang === 'en' ? 'Total assets currently below nisab.' : 'Total harta saat ini di bawah nisab.',
            reasonPaid: lang === 'en' ? 'You have paid Zakat for this period.' : 'Anda sudah membayar Zakat untuk periode ini.',
            advice: lang === 'en' ? 'You Can Still Donate!' : 'Tetap Bisa Sedekah!',
            adviceDesc: lang === 'en' ? 'Charity is always open even if Zakat is not obligated.' : 'Sedekah tetap dianjurkan meski belum wajib zakat.',
            modalTitle: lang === 'en' ? 'Pay Zakat Mal' : 'Bayar Zakat Mal',
            owner: lang === 'en' ? 'Zakat Owner' : 'Pemilik Zakat',
            source: lang === 'en' ? 'Source Account' : 'Sumber Dana',
            amountPay: lang === 'en' ? 'Amount to Pay' : 'Jumlah Bayar',
            confirm: lang === 'en' ? 'Confirm Payment' : 'Konfirmasi Bayar',
            husband: lang === 'en' ? 'Husband' : 'Suami',
            wife: lang === 'en' ? 'Wife' : 'Istri',
            sourceNote: lang === 'en' ? '* Only showing accounts of' : '* Hanya menampilkan akun',
        };
        return dict[key] || key;
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const fetchLiveGoldPrice = async () => {
        setIsFetchingPrice(true);
        try {
            const response = await fetch('https://api.allorigins.win/raw?url=https://data-asg.goldprice.org/dbXRates/IDR');
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                setGoldPrice(Math.round(data.items[0].xauPrice / 31.1035));
            }
        } catch (error) { console.error(error); } finally { setIsFetchingPrice(false); }
    };

    useEffect(() => { fetchLiveGoldPrice(); }, []);

    // --- CALCULATION ENGINE ---
    const calculationResult = useMemo(() => {
        // --- MULAI KODE BARU: LOGIKA HAUL & PAID ---
        const NISAB_GRAMS = 85;
        const nisabValue = goldPrice * NISAB_GRAMS;
        const haulCycleDays = 354; // Siklus 1 tahun Hijriah
        const haulStartDate = subDays(new Date(), haulCycleDays);

        const alreadyPaidTx = transactions.find(tx => 
            tx.category === 'Zakat Mal' && 
            isAfter(parseISO(tx.date), haulStartDate) &&
            tx.notes?.includes(selectedOwner)
        );

        if (alreadyPaidTx) {
            // HITUNG TANGGAL HAUL BERIKUTNYA
            const nextHaulDate = addDays(parseISO(alreadyPaidTx.date), haulCycleDays);
            return { 
                status: 'PAID', 
                zakatAmount: alreadyPaidTx.amount, 
                paidDate: alreadyPaidTx.date,
                nextHaulDate: format(nextHaulDate, 'dd MMMM yyyy') // Tampilkan di UI
            };
        }
        // --- SELESAI KODE BARU ---

        const ownerAccounts = accounts.filter(a => a.owner === selectedOwner);
        const currentTotalAssets = ownerAccounts.reduce((sum, acc) => sum + acc.balance, 0);

        if (currentTotalAssets < nisabValue) {
            return {
                status: 'NOT_OBLIGATED',
                currentTotal: currentTotalAssets,
                zakatAmount: 0,
                haulStartDate
            };
        }

        // Simplifikasi: Anggap saldo terendah adalah saldo saat ini (konservatif)
        return {
            status: 'OBLIGATED',
            currentTotal: currentTotalAssets,
            zakatAmount: currentTotalAssets * 0.025,
            minBalanceInYear: currentTotalAssets, // Simulasi
            minBalanceDate: subDays(new Date(), 100), 
            haulStartDate
        };
    }, [goldPrice, selectedOwner, accounts, transactions]);

    // UPDATE: Auto Notification Haul
    useEffect(() => {
        const notifKey = `zakat_notified_${new Date().getFullYear()}_${selectedOwner}`;
        const hasNotified = sessionStorage.getItem(notifKey);

        if (calculationResult.status === 'OBLIGATED' && !hasNotified) {
            onNotify(
                lang === 'en' ? 'Zakat Obligated!' : 'Wajib Zakat!', 
                lang === 'en' 
                    ? `Assets for ${selectedOwner === 'Husband' ? 'Husband' : 'Wife'} have met the Nisab/Haul.` 
                    : `Harta ${selectedOwner === 'Husband' ? 'Suami' : 'Istri'} telah mencapai Nisab/Haul.`,
                'ALERT'
            );
            sessionStorage.setItem(notifKey, 'true');
        }
    }, [calculationResult.status, selectedOwner, lang]);

    // FUNGSI INI HILANG, PASTE KEMBALI DI SINI:
    const handlePayZakat = () => {
        if (!paymentSourceAccountId) return;
        const tx: Transaction = {
            id: `zak-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'EXPENSE',
            amount: calculationResult.zakatAmount || 0,
            accountId: paymentSourceAccountId,
            category: 'Zakat Mal', 
            notes: `Zakat Mal (${selectedOwner}) - Haul ${new Date().getFullYear()}`
        };
        onAddTransaction(tx);
        setShowPayModal(false);
    };

    return (
        <div className="flex flex-col h-full bg-background pb-40 overflow-y-auto">
            <div className="p-6 pt-32 pb-40 bg-surface rounded-b-[3rem] shadow-xl relative overflow-hidden text-center group">
                 <div className="absolute inset-0 opacity-20 mix-blend-hard-light transition-colors duration-500" style={{ background: `linear-gradient(to bottom right, var(--color-primary), transparent)` }}></div>
                 <div className="absolute top-0 left-0 p-4 opacity-5"><Coins className="w-32 h-32 text-white -rotate-12" /></div>
                 <div className="relative z-10"><h1 className="text-2xl font-bold text-white mb-2">{t('title')}</h1></div>
            </div>

            <div className="p-4 space-y-6 -mt-24 relative z-20">
                <div className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                    <div className="flex bg-black/30 p-1 rounded-xl">
                        {(['Husband', 'Wife'] as const).map(role => (
                            <button key={role} onClick={() => setSelectedOwner(role)} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedOwner === role ? 'bg-white/10 text-white shadow border border-white/20' : 'text-gray-400 hover:text-white'}`} style={selectedOwner === role ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}><UserCircle2 className="w-4 h-4" />{role === 'Husband' ? t('husband') : t('wife')}</button>
                        ))}
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2">{t('goldPrice')}</label><button onClick={fetchLiveGoldPrice} disabled={isFetchingPrice} className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-50">{isFetchingPrice ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}{t('liveUpdate')}</button></div>
                        <div className="relative group"><input type="text" value={formatCurrency(goldPrice)} readOnly className="w-full bg-[#18181b] border border-white/10 rounded-xl p-4 pl-12 text-lg font-bold text-gray-400 outline-none cursor-not-allowed opacity-80" /><div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/5 p-1.5 rounded-lg"><Lock className="w-4 h-4 text-gray-500" /></div></div>
                    </div>
                </div>

                {/* STATUS CARD */}
                {calculationResult.status === 'PAID' ? (
                    // --- TAMPILAN JIKA SUDAH LUNAS ---
                    <div className="bg-surface border border-emerald-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-full bg-emerald-500 text-white shadow-lg"><BadgeCheck className="w-6 h-6" /></div><h3 className="text-lg font-bold text-white">{t('statusPaid')}</h3></div>
                        <p className="text-sm text-gray-400 mb-2">{t('reasonPaid')}</p>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl"><p className="text-emerald-400 text-xs font-bold uppercase">{t('zakatAmount')}</p><p className="text-2xl font-bold text-emerald-300">{formatCurrency(calculationResult.zakatAmount || 0)}</p></div>
                    {/* UPDATE: Info Periode Haul Berikutnya */}
                        <div className="mt-4 pt-3 border-t border-emerald-500/10">
                            <p className="text-[10px] text-emerald-500/50 uppercase font-bold tracking-widest mb-1">
                                {lang === 'en' ? 'Next Haul Assessment:' : 'Penghitungan Haul Berikutnya:'}
                            </p>
                            <p className="text-sm text-white font-medium">{calculationResult.nextHaulDate}</p>
                        </div>
                    
                    </div>
                ) : calculationResult.status === 'OBLIGATED' ? (
                    // --- TAMPILAN WAJIB BAYAR ---
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-lg relative overflow-hidden animate-in zoom-in-95 group">
                        <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-25" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-full text-white shadow-lg" style={{ backgroundColor: 'var(--color-primary)' }}><CheckCircle2 className="w-6 h-6" /></div><h3 className="text-lg font-bold text-white">{t('statusObligated')}</h3></div>
                            <div className="space-y-4">
                                <div><p className="text-white/60 text-xs uppercase font-bold mb-1">{t('totalAssets')}</p><p className="text-2xl font-bold text-white">{formatCurrency(calculationResult.currentTotal || 0)}</p></div>
                                <div className="h-px w-full bg-white/10"></div>
                                <div><p className="text-white/60 text-xs uppercase font-bold mb-1">{t('zakatAmount')}</p><p className="text-3xl font-bold text-yellow-400 drop-shadow-sm">{formatCurrency(calculationResult.zakatAmount || 0)}</p></div>
                                <button onClick={() => {
                                    const recommendedAccount = accounts.filter(a => a.owner === selectedOwner || !a.owner).filter(a => a.group === 'Cash' || a.group === 'Bank Accounts').sort((a,b) => b.balance - a.balance)[0];
                                    setPaymentSourceAccountId(recommendedAccount ? recommendedAccount.id : '');
                                    setShowPayModal(true);
                                }} className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20 transition-all active:scale-95"><HandCoins className="w-5 h-5" />{t('payNow')}</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- TAMPILAN BELUM WAJIB ---
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-lg animate-in zoom-in-95">
                         <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-gray-700 rounded-full text-gray-300"><Info className="w-6 h-6" /></div><h3 className="text-lg font-bold text-gray-200">{t('statusNotObligated')}</h3></div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{t('reasonBelow')}</p>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-3 items-start"><AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" /><div><p className="text-gray-200 text-sm font-bold mb-1">{t('advice')}</p><p className="text-gray-400 text-xs">{t('adviceDesc')}</p></div></div>
                    </div>
                )}

                {showPayModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]"><h3 className="font-bold text-white text-lg">{t('modalTitle')}</h3><button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-400 uppercase font-bold">{t('owner')}</label><div className="flex items-center gap-2 text-indigo-400 font-bold text-sm bg-indigo-400/10 px-2 py-1 rounded-lg border border-indigo-400/20"><UserCircle2 className="w-3 h-3" />{selectedOwner === 'Husband' ? t('husband') : t('wife')}</div></div>
                                <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('source')}</label><select value={paymentSourceAccountId} onChange={e => setPaymentSourceAccountId(e.target.value)} className="w-full bg-black/20 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-indigo-500"><option value="" disabled>Select Account</option>{accounts.filter(a => a.owner === selectedOwner || !a.owner).filter(a => a.group === 'Cash' || a.group === 'Bank Accounts').map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>))}</select><p className="text-[10px] text-gray-500 mt-1.5 ml-1">{t('sourceNote')} {selectedOwner === 'Husband' ? t('husband') : t('wife')}.</p></div>
                                <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{t('amountPay')}</label><div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center"><p className="text-2xl font-bold text-yellow-400">{formatCurrency(calculationResult.zakatAmount || 0)}</p></div></div>
                                <button onClick={handlePayZakat} disabled={!paymentSourceAccountId} className="w-full bg-yellow-600 disabled:opacity-50 hover:bg-yellow-700 text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-lg shadow-yellow-900/20">{t('confirm')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ZakatMal;