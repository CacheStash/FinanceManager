import { supabase } from './services/supabase';
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import TransactionHistory from './components/TransactionHistory';
import Reports from './components/Reports';
import AccountCard from './components/AccountCard';
import AccountDetail from './components/AccountDetail';
import AssetAnalytics, { AnalyticsScope } from './components/AssetAnalytics';
import NonProfit from './components/NonProfit';
import ZakatMal from './components/ZakatMal';
import { Account, Transaction, NonProfitAccount, NonProfitTransaction, AccountOwner, AccountGroup } from './types';
import { Pipette, Palette, FileSpreadsheet, FileJson, Upload, ChevronRight, Download, Trash2, Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Settings, Edit3, Save, LogIn, UserPlus, TrendingUp, UserCircle2, Layers, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { subDays, format } from 'date-fns';



// ==========================================
// 1. KOMPONEN LOCK SCREEN (GLOBAL OVERLAY)
// ==========================================
const LockScreen = ({ onUnlock, correctPin, onForgot }: { onUnlock: () => void, correctPin: string, onForgot: () => void }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handlePress = (num: string) => {
        if (input.length < 6) {
            const next = input + num;
            setInput(next);
            
            // Auto submit jika sudah 6 digit
            if (next.length === 6) {
                if (next === correctPin) {
                    onUnlock();
                } else {
                    setError(true);
                    setShake(true);
                    setTimeout(() => {
                        setInput('');
                        setShake(false);
                        setError(false);
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
        setError(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#18181b] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">FinancePro Locked</h2>
                <p className="text-sm text-gray-400">Enter your 6-digit PIN to access</p>
            </div>

            {/* Indikator Titik PIN */}
            <div className={`flex gap-4 mb-12 ${shake ? 'animate-shake' : ''}`}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < input.length ? (error ? 'bg-red-500 scale-110' : 'bg-emerald-500 scale-110') : 'bg-white/10'}`} />
                ))}
            </div>

            {/* Keypad Angka */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handlePress(num.toString())} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center">
                        {num}
                    </button>
                ))}
                <div className="w-20 h-20"></div> {/* Spacer */}
                <button onClick={() => handlePress('0')} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center">0</button>
                <button onClick={handleDelete} className="w-20 h-20 rounded-full text-white/50 hover:text-white transition-all active:scale-95 flex items-center justify-center"><Trash2 className="w-6 h-6" /></button>
            </div>

            <button onClick={onForgot} className="mt-12 text-sm text-gray-500 hover:text-emerald-500 transition-colors">
                Lupa PIN? (Logout & Reset)
            </button>
            <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } } .animate-shake { animation: shake 0.3s ease-in-out; }`}</style>
        </div>
    );
};


// OFFLINE MODE: No external services imported.

const ACCENT_PRESETS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Violet', value: '#8b5cf6' },
];

const BG_THEMES = [
    { name: 'Default', bg: '#18181b', surface: '#27272a', surfaceLight: '#3f3f46' },
    { name: 'Midnight', bg: '#020617', surface: '#0f172a', surfaceLight: '#1e293b' },
    { name: 'Deep Forest', bg: '#022c22', surface: '#064e3b', surfaceLight: '#065f46' },
    { name: 'Dark Berry', bg: '#2a0a18', surface: '#4a044e', surfaceLight: '#701a75' },
];

const DEFAULT_CATEGORIES = ['Food & Drink', 'Groceries', 'Utilities', 'Salary', 'Investment', 'Entertainment', 'Transport', 'Shopping', 'Health', 'Education', 'Zakat & Charity', 'Other'];

// === KOMPONEN BARU: INPUT CURRENCY YANG CANTIK ===
interface CurrencyInputProps {
    value: string | number;
    onChange: (val: string) => void;
    currency: 'IDR' | 'USD';
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

const CurrencyInput = ({ value, onChange, currency, className, ...props }: CurrencyInputProps) => {
    // Fungsi Format: Mengubah "5000000" jadi "5.000.000"
    const formatDisplay = (val: string | number) => {
        if (!val) return '';
        const digits = val.toString().replace(/\D/g, ''); // Hapus karakter non-angka
        if (!digits) return '';
        // Format sesuai locale (IDR pakai titik, USD pakai koma)
        return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US').format(BigInt(digits));
    };

    // Handle Perubahan: Bersihkan format, kirim angka murni ke state
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Ambil angka saja
        const raw = e.target.value.replace(/\D/g, '');
        onChange(raw);
    };

    return (
        <div className="relative w-full">
            {/* LABEL SIMBOL (Rp / $) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className={`font-bold ${currency === 'IDR' ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {currency === 'IDR' ? 'Rp' : '$'}
                </span>
            </div>
            
            {/* INPUT FIELD */}
            <input
                type="text"
                inputMode="numeric" // Agar keyboard HP tetap angka
                value={formatDisplay(value)}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 ${className}`} // pl-12 memberi ruang untuk label Rp
                {...props}
            />
        </div>
    );
};

const App = () => {


// ... state lainnya ...


  // --- NEW: APP LOCK STATE ---
  const [appPin, setAppPin] = useState<string>(''); // PIN yang aktif (dari Cloud)
  const [isLocked, setIsLocked] = useState(false);  // Status layar terkunci
  const [showPinSetup, setShowPinSetup] = useState(false); // Modal bikin PIN
  const [newPinInput, setNewPinInput] = useState(''); // Input sementara bikin PIN
  
  // --- ADD ACCOUNT MODAL STATE (NEW) ---
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccOwner, setNewAccOwner] = useState<AccountOwner>('Husband');
  const [newAccBalance, setNewAccBalance] = useState(''); // String agar bisa kosong/0

  // ... ref refs ...

    const [showPassword, setShowPassword] = useState(false); // <--- TAMBAHKAN INI
    const [activeTab, setActiveTab] = useState('trans');
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true); // Tambahkan di sini

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nonProfitAccounts, setNonProfitAccounts] = useState<NonProfitAccount[]>([]);
  const [nonProfitTransactions, setNonProfitTransactions] = useState<NonProfitTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  
  const [lang, setLang] = useState<'en' | 'id'>('en');
  // 1. TAMBAHKAN STATE CURRENCY INI
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [currentAccent, setCurrentAccent] = useState('Emerald');
  const [customAccentHex, setCustomAccentHex] = useState('#10b981');
  const [currentTheme, setCurrentTheme] = useState('Default');
  const [customBgHex, setCustomBgHex] = useState('#18181b');

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);
  
  // Asset Analytics State
  const [showAssetAnalytics, setShowAssetAnalytics] = useState(false);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>({ type: 'GLOBAL' });

  // Auth State (LOCAL ONLY)
  // Tambahkan 'id: string' di sini
  const [user, setUser] = useState<{id?: string, name: string, email: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState('');
  
  // Registration Inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  // --- NEW TRANSACTION MODAL STATE ---
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [newTxType, setNewTxType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategory, setNewTxCategory] = useState('Food & Drink');
  const [newTxAccountId, setNewTxAccountId] = useState('');
  const [newTxToAccountId, setNewTxToAccountId] = useState('');
  const [newTxDate, setNewTxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTxNotes, setNewTxNotes] = useState('');
  const [newTxOwnerFilter, setNewTxOwnerFilter] = useState<'All' | AccountOwner>('All');

  // --- EDIT ACCOUNT MODAL STATE ---
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // --- CATEGORY MANAGER STATE ---
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{idx: number, name: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accentInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // --- A. FUNGSI LOAD SETTINGS DARI CLOUD ---
  const loadSettingsFromSupabase = async (userId: string) => {
    const { data } = await supabase
      .from('user_settings') // Pastikan tabel ini sudah dibuat di SQL
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
        if (data.language) setLang(data.language as 'en' | 'id');
        // --- 1. LOAD PIN DARI CLOUD ---
        if (data.app_pin) {
            setAppPin(data.app_pin);
            setIsLocked(true); // Langsung kunci jika ada PIN
        }
        // ------------------------------
        if (data.accent_color) {
            // Cek apakah preset atau custom
            const isPreset = ACCENT_PRESETS.some(p => p.value === data.accent_color);
            if(isPreset) {
                const presetName = ACCENT_PRESETS.find(p => p.value === data.accent_color)?.name;
                setCurrentAccent(presetName || 'Emerald');
            } else {
                setCurrentAccent('Custom');
                setCustomAccentHex(data.accent_color);
            }
        }
        if (data.bg_theme) {
            // Cek apakah preset atau custom
            try {
                const themeObj = JSON.parse(data.bg_theme); // Kita simpan sebagai JSON string
                if(themeObj.name) setCurrentTheme(themeObj.name);
                if(themeObj.customBg) setCustomBgHex(themeObj.customBg);
            } catch (e) { console.log("Old theme format"); }
        }
    }
};


 // ================= MULAI KODE PERBAIKAN =================

  // 1. FUNGSI LOAD DATA (DENGAN MODE SILENT)
  const loadDataFromSupabase = async (userId: string, isSilent = false) => {
    // HANYA nyalakan loading screen jika BUKAN silent mode
    if (!isSilent) setIsLoading(true);

    try {
        // --- PARALLEL FETCHING ---
        const [accRes, txRes, settingsRes] = await Promise.all([
            supabase.from('accounts').select('*').eq('user_id', userId),
            supabase.from('transactions').select('*').eq('user_id', userId),
            loadSettingsFromSupabase(userId)
        ]);

        const accData = accRes.data;
        const txData = txRes.data;

        if (accRes.error || txRes.error) {
            console.error("Gagal ambil data:", accRes.error || txRes.error);
        }

        // C. Masukkan ke State Aplikasi
        if (accData && accData.length > 0) {
            setAccounts(accData); 
        }

        if (txData && txData.length > 0) {
            const mappedTx = txData.map(t => ({
                ...t,
                accountId: t.account_id, 
                toAccountId: t.to_account_id,
                notes: t.note
            }));
            setTransactions(mappedTx);
        }

    } catch (err) {
        console.error("Critical Load Error:", err);
    } finally {
        setIsDataLoaded(true);
        // HANYA matikan loading screen jika tadi dinyalakan
        if (!isSilent) setIsLoading(false);
    }
  };

 // 2. // 2. USEEFFECT UTAMA
  useEffect(() => {
    const checkUser = async () => {
      try {
          const sessionPromise = supabase.auth.getSession();
          // Timeout dipercepat jadi 1 detik biar ngebut
          const timeoutPromise = new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error("Auth Timeout")), 1000);
          });

          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          
          if (session?.user) {
            setUser({
                id: session.user.id,
                name: session.user.user_metadata?.display_name || 'User',
                email: session.user.email || ''
            });

            // LOAD AWAL: Pake Loading Screen (isSilent = false)
            await loadDataFromSupabase(session.user.id, false);
          } else {
             setIsDataLoaded(true); 
          }

      } catch (error) {
          console.warn("Auth check timeout/gagal, masuk mode Guest.", error);
          setUser(null);
          setIsDataLoaded(true);
      } finally {
          setIsAuthLoading(false); 
          setIsLoading(false);
      }
    };

    checkUser();

    // LISTENER: Saat token refresh (aplikasi resume dari background)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.display_name || 'User',
            email: session.user.email || ''
          });
          
          // REFRESH DATA: Pakai Mode SILENT (isSilent = true)
          // Agar layar tidak tertutup loading hitam saat ganti aplikasi
          await loadDataFromSupabase(session.user.id, true);
        } else {
          setUser(null);
        }
        setIsAuthLoading(false); 
    });

    return () => subscription.unsubscribe();
  }, []);

// --- B. AUTO-SAVE SETTINGS (DEBOUNCE 2 DETIK) ---
useEffect(() => {
    // Jangan simpan kalau user belum login atau data belum siap
    if (!user || !user.id || !isDataLoaded) return;

    const timer = setTimeout(async () => {
        // Tentukan nilai warna yg mau disimpan
        let colorToSave = customAccentHex;
        const preset = ACCENT_PRESETS.find(p => p.name === currentAccent);
        if (preset) colorToSave = preset.value;

        // Tentukan tema yg mau disimpan
        const themeData = {
            name: currentTheme,
            customBg: customBgHex
        };

        const { error } = await supabase
          .from('user_settings')
          .upsert({
              user_id: user.id,
              language: lang,
              accent_color: colorToSave,
              bg_theme: JSON.stringify(themeData),
              app_pin: appPin, // <--- 2. SIMPAN PIN KE CLOUD
              updated_at: new Date().toISOString()
          });
          
        if (error) console.error("Gagal auto-save settings:", error);
        
    }, 2000); // Tunggu 2 detik setelah user selesai klik-klik

    return () => clearTimeout(timer); // Reset timer jika user masih mengganti setting
}, [currentAccent, customAccentHex, currentTheme, customBgHex, lang, user, isDataLoaded, appPin]);

  // ================= SELESAI KODE PERBAIKAN =================

  // --- EFFECT: APPLY THEME ---
  useEffect(() => {
    const root = document.documentElement;
    let accent = '#10b981';
    if (currentAccent === 'Custom') accent = customAccentHex;
    else {
        const preset = ACCENT_PRESETS.find(p => p.name === currentAccent);
        if (preset) accent = preset.value;
    }
    root.style.setProperty('--color-primary', accent);

    let bg = '#18181b', surface = '#27272a', surfaceLight = '#3f3f46';
    if (currentTheme === 'Custom') {
        bg = customBgHex;
        root.style.setProperty('--bg-background', bg);
        root.style.setProperty('--bg-surface', '#202025'); 
        root.style.setProperty('--bg-surface-light', '#2a2a30');
    } else {
        const theme = BG_THEMES.find(t => t.name === currentTheme);
        if (theme) {
            bg = theme.bg; surface = theme.surface; surfaceLight = theme.surfaceLight;
        }
        root.style.setProperty('--bg-background', bg);
        root.style.setProperty('--bg-surface', surface);
        root.style.setProperty('--bg-surface-light', surfaceLight);
    }
  }, [currentAccent, customAccentHex, currentTheme, customBgHex]);

  // --- 1. LOAD DATA EFFECT (Run Once) ---
  useEffect(() => {
    const saved = localStorage.getItem('financeProData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAccounts(data.accounts || []);
        setTransactions(data.transactions || []);
        setNonProfitAccounts(data.nonProfitAccounts || []);
        setNonProfitTransactions(data.nonProfitTransactions || []);
        setCategories(data.categories || DEFAULT_CATEGORIES);
        setLang(data.lang || 'en');
        

        // LOAD CURRENCY
        if (data.currency) setCurrency(data.currency);

        // Handle User Session from LocalStorage
       

        if(data.theme) {
            setCurrentAccent(data.theme.accent || 'Emerald');
            setCustomAccentHex(data.theme.customAccent || '#10b981');
            setCurrentTheme(data.theme.bg || 'Default');
            setCustomBgHex(data.theme.customBg || '#18181b');
        }
      } catch (e) { console.error("Failed to load data", e); }
    } else {
        // --- INITIAL DEMO DATA (INTEGRATED & VARIED) ---
        
        const demoAccounts: Account[] = [
             // HUSBAND ACCOUNTS
             { id: 'acc_bca_h', name: 'BCA Suami (Payroll)', group: 'Bank Accounts', balance: 35000000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_jenius_h', name: 'Jenius Saver', group: 'Bank Accounts', balance: 15500000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_stock_h', name: 'Ajaib Saham (BBCA/TLKM)', group: 'Investments', balance: 120000000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_sbn_h', name: 'SBN Ritel (ORI023)', group: 'Investments', balance: 50000000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_cc_bca', name: 'BCA Credit Card', group: 'Credit Cards', balance: -4200000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },

             // WIFE ACCOUNTS
             { id: 'acc_mandiri_w', name: 'Mandiri Istri', group: 'Bank Accounts', balance: 18500000, currency: 'IDR', includeInTotals: true, owner: 'Wife' },
             { id: 'acc_seabank_w', name: 'Seabank (Bunga Harian)', group: 'Bank Accounts', balance: 22000000, currency: 'IDR', includeInTotals: true, owner: 'Wife' },
             { id: 'acc_bibit_w', name: 'Bibit Reksadana', group: 'Investments', balance: 65000000, currency: 'IDR', includeInTotals: true, owner: 'Wife' },
             { id: 'acc_gold_w', name: 'Logam Mulia (Antam)', group: 'Investments', balance: 0, currency: 'IDR', includeInTotals: true, owner: 'Wife', metadata: { grams: 50 } },

             // JOINT / CASH
             { id: 'acc_cash_joint', name: 'Uang Tunai Rumah', group: 'Cash', balance: 3200000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
        ];

        // Helper date generator
        const d = (daysAgo: number) => subDays(new Date(), daysAgo).toISOString();

        const demoTransactions: Transaction[] = [
            // --- TODAY / YESTERDAY (Small Flow) ---
            { id: 'tx_01', date: d(0), type: 'EXPENSE', amount: 145000, accountId: 'acc_cash_joint', category: 'Food & Drink', notes: 'Makan Keluarga Resto Padang' },
            { id: 'tx_02', date: d(0), type: 'INCOME', amount: 450000, accountId: 'acc_seabank_w', category: 'Other', notes: 'Jual Barang Preloved' },
            { id: 'tx_03', date: d(1), type: 'EXPENSE', amount: 3250000, accountId: 'acc_bca_h', category: 'Groceries', notes: 'Belanja Bulanan Besar (Superindo)' },
            
            // --- THIS MONTH (Major Flows) ---
            { id: 'tx_04', date: d(3), type: 'INCOME', amount: 32000000, accountId: 'acc_bca_h', category: 'Salary', notes: 'Gaji Bulanan Suami' },
            { id: 'tx_05', date: d(5), type: 'TRANSFER', amount: 15000000, accountId: 'acc_bca_h', toAccountId: 'acc_stock_h', category: 'Transfer', notes: 'Topup RDN Ajaib' },
            { id: 'tx_06', date: d(6), type: 'EXPENSE', amount: 8500000, accountId: 'acc_bca_h', category: 'Education', notes: 'Bayar Uang Gedung Sekolah' },
            { id: 'tx_07', date: d(7), type: 'INCOME', amount: 18500000, accountId: 'acc_mandiri_w', category: 'Salary', notes: 'Project Freelance Design (Termin Akhir)' },
            { id: 'tx_08', date: d(8), type: 'TRANSFER', amount: 5000000, accountId: 'acc_mandiri_w', toAccountId: 'acc_seabank_w', category: 'Transfer', notes: 'Pindah Dana Darurat' },

            // --- LAST MONTH (Historical Data for Charts) ---
            { id: 'tx_09', date: d(30), type: 'INCOME', amount: 32000000, accountId: 'acc_bca_h', category: 'Salary', notes: 'Gaji Bulanan Suami' },
            { id: 'tx_10', date: d(32), type: 'EXPENSE', amount: 4500000, accountId: 'acc_cc_bca', category: 'Transport', notes: 'Servis Besar Mobil' },
            { id: 'tx_11', date: d(35), type: 'EXPENSE', amount: 12000000, accountId: 'acc_bca_h', category: 'Entertainment', notes: 'Liburan Keluarga Bali' },
            { id: 'tx_12', date: d(35), type: 'INCOME', amount: 12500000, accountId: 'acc_mandiri_w', category: 'Salary', notes: 'Project Freelance (DP)' },

            // --- 2 MONTHS AGO (More History) ---
            { id: 'tx_13', date: d(60), type: 'INCOME', amount: 55000000, accountId: 'acc_bca_h', category: 'Salary', notes: 'Bonus Tahunan Kantor' },
            { id: 'tx_14', date: d(62), type: 'TRANSFER', amount: 40000000, accountId: 'acc_bca_h', toAccountId: 'acc_sbn_h', category: 'Transfer', notes: 'Beli SBN ORI023' },
            { id: 'tx_15', date: d(65), type: 'EXPENSE', amount: 25000000, accountId: 'acc_bca_h', category: 'Utilities', notes: 'Renovasi Dapur' },
        ];

        const demoHajjAcc: NonProfitAccount[] = [
            { id: 'np_hajj_h', name: 'Tabungan Haji Suami', owner: 'Husband', balance: 35000000, target: 50000000 },
            { id: 'np_umrah_w', name: 'Tabungan Umrah Istri', owner: 'Wife', balance: 15000000, target: 35000000 }
        ];

        const demoHajjTx: NonProfitTransaction[] = [
            { id: 'np_tx_1', date: d(120), amount: 25000000, accountId: 'np_hajj_h', notes: 'Setoran Awal Porsi Haji' },
            { id: 'np_tx_2', date: d(30), amount: 10000000, accountId: 'np_hajj_h', notes: 'Topup Tahunan' },
            { id: 'np_tx_3', date: d(15), amount: 15000000, accountId: 'np_umrah_w', notes: 'Deposito Awal Umrah' }
        ];

        setAccounts(demoAccounts);
        setTransactions(demoTransactions);
        setNonProfitAccounts(demoHajjAcc);
        setNonProfitTransactions(demoHajjTx);
    }
    
    // CRITICAL: Mark data as loaded so we don't overwrite LS with empty state
    setIsDataLoaded(true);
  }, []);

  // --- 2. SAVE DATA EFFECT (Runs on change, but blocked if !isDataLoaded) ---
  useEffect(() => {
     if (!isDataLoaded) return; // Prevent overwriting data during initial load

     localStorage.setItem('financeProData', JSON.stringify({
         accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories, lang, currency,
         theme: { accent: currentAccent, customAccent: customAccentHex, bg: currentTheme, customBg: customBgHex }
     }));
  }, [accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories, lang, user, currentAccent, customAccentHex, currentTheme, customBgHex, isDataLoaded]);

  const handleLocalLogin = async () => {
    setAuthError('');
    
    // 1. Validasi Input
    if (!regEmail || !regPass) {
        setAuthError('Email and password are required.');
        return;
    }

    // 2. "Menelepon" Supabase untuk Login
    const { data, error } = await supabase.auth.signInWithPassword({
        email: regEmail,
        password: regPass,
    });

    // 3. Jika Error (Email salah / Password salah)
    if (error) {
        setAuthError(error.message);
        return;
    }

    // 4. Jika Berhasil
if (data.user) {
    // Mengambil nama dari metadata
    const userName = data.user.user_metadata?.display_name || 'User';
    
    setUser({ 
        id: data.user.id, // <--- INI WAJIB ADA (Tambahan Baru)
        name: userName, 
        email: data.user.email || '' 
    });

    setShowAuthModal(false);
    setRegEmail(''); 
    setRegPass('');
    setAuthError('');
}

};

 // 1. Ganti handleRegister menjadi versi ini
 const handleRegister = async () => {
    if (!regName || !regEmail || !regPass) {
        setAuthError('All fields are required.');
        return;
    }
    setAuthError('');

    const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPass,
        options: {
            data: {
                display_name: regName, // Menyimpan nama ke database Supabase
            }
        }
    });

    if (error) {
        setAuthError(error.message);
        return;
    }

    if (data.user) {
        alert("Pendaftaran berhasil! Silakan cek email kamu untuk verifikasi.");
        setRegEmail(''); setRegPass(''); setRegName('');
        setShowAuthModal(false);
        setAuthError('');
    }
};

// 2. Ganti handleLogout menjadi versi ini
// GANTI handleLogout YANG LAMA DENGAN INI (HANYA BOLEH ADA 1)
const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
    }
    
    // Reset semua state User & Keamanan
    setUser(null);
    setAppPin('');      // Bersihkan PIN dari memori lokal
    setIsLocked(false); // Buka kunci (karena kembali ke login screen)
};

// --- PIN HANDLERS ---
  const handleCreatePin = () => {
      if (newPinInput.length === 6) {
          setAppPin(newPinInput); // State berubah -> useEffect jalan -> Simpan ke Cloud
          setShowPinSetup(false);
          setNewPinInput('');
          alert("Keamanan Aktif! Aplikasi akan terkunci otomatis di semua perangkat Anda.");
      } else {
          alert("PIN harus 6 digit angka.");
      }
  };

  const handleDisablePin = () => {
      if (confirm("Matikan fitur PIN Lock? (Berlaku untuk semua perangkat)")) {
          setAppPin(''); // Kosongkan PIN -> useEffect jalan -> Hapus dari Cloud
          setIsLocked(false);
      }
  };

  const handleForgotPin = () => {
      if (confirm("Lupa PIN? Anda harus Logout untuk reset sesi demi keamanan.")) {
          handleLogout(); 
      }
  };
  



  // --- IMPORT FILE HANDLER (DENGAN SYNC SUPABASE) ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => { // Ubah jadi async
        // Wrap in timeout to allow UI to render the loader
        setTimeout(async () => { // Ubah jadi async
          try {
              const rawData = JSON.parse(evt.target?.result as string);
              let importedAccounts: Account[] = [];
              let importedTransactions: Transaction[] = [];
              
              // --- STRATEGY: DETECT FORMAT ---
              
              // Case 1: Native Backup Format (contains 'accounts' key)
              if (rawData.accounts && Array.isArray(rawData.accounts)) {
                  importedAccounts = rawData.accounts;
                  importedTransactions = rawData.transactions || [];
                  
                  setAccounts(importedAccounts);
                  if(rawData.transactions) setTransactions(importedTransactions);
                  if(rawData.nonProfitAccounts) setNonProfitAccounts(rawData.nonProfitAccounts);
                  if(rawData.nonProfitTransactions) setNonProfitTransactions(rawData.nonProfitTransactions);
                  if(rawData.categories) setCategories(rawData.categories);
                  alert("Data Lokal Berhasil Dipulihkan!");
              } 
              // Case 2: External/Flat JSON Format
              else if (Array.isArray(rawData)) {
                  const newAccountsMap = new Map<string, Account>();
                  const newTransactions: Transaction[] = [];
                  const newCategories = new Set<string>(DEFAULT_CATEGORIES);
                  const genId = () => Math.random().toString(36).substr(2, 9);
                  
                  // ... (Logika parsing Excel/JSON lama Anda tetap sama) ...
                  // Supaya hemat tempat, saya persingkat bagian parsing ini karena sudah ada di kode lama Anda.
                  // Intinya variabel 'importedAccounts' dan 'importedTransactions' terisi.
                  // KITA PAKA LOGIKA STANDAR UNTUK MENGISI VARIABLE INI DARI RAW DATA:
                   
                  const guessOwner = (name: string): AccountOwner => name.toLowerCase().includes('istri') ? 'Wife' : 'Husband';
                  const guessGroup = (name: string): AccountGroup => 'Bank Accounts'; // Simplified

                  rawData.forEach((row: any, index) => {
                      const accName = row.Accounts || "Unknown Account";
                      let accId = '';
                      if (newAccountsMap.has(accName)) {
                          accId = newAccountsMap.get(accName)!.id;
                      } else {
                          accId = `acc_${genId()}_${index}`;
                          newAccountsMap.set(accName, {
                              id: accId, name: accName, balance: 0, currency: 'IDR', includeInTotals: true, group: guessGroup(accName), owner: guessOwner(accName)
                          });
                      }
                      const amount = Math.abs(parseFloat(row.Amount) || 0);
                      const type = (row['Income/Expense'] || 'Expense').toLowerCase().includes('income') ? 'INCOME' : 'EXPENSE';
                      
                      newTransactions.push({
                          id: `tx_${genId()}_${index}`,
                          date: row.Period ? new Date(row.Period).toISOString() : new Date().toISOString(),
                          amount, type, category: row.Category || 'Uncategorized', accountId: accId, notes: row.Note || ''
                      });
                      const acc = newAccountsMap.get(accName)!;
                      if (type === 'INCOME') acc.balance += amount; else acc.balance -= amount;
                  });

                  importedAccounts = Array.from(newAccountsMap.values());
                  importedTransactions = newTransactions;

                  setAccounts(importedAccounts);
                  setTransactions(importedTransactions);
                  setCategories(Array.from(newCategories));
              } 
              else {
                  throw new Error("Unknown JSON Format");
              }

              // === BAGIAN BARU: SYNC KE SUPABASE ===
              if (user && user.id) {
                  const confirmSync = confirm("Apakah Anda ingin menyimpan data hasil import ini ke Database Online (Cloud)?");
                  
                  if (confirmSync) {
                      // 1. Upload Akun
                      if (importedAccounts.length > 0) {
                          const dbAccounts = importedAccounts.map(acc => ({
                              id: acc.id,
                              user_id: user.id,
                              name: acc.name,
                              "group": acc.group,
                              balance: acc.balance,
                              currency: acc.currency,
                              owner: acc.owner
                          }));
                          const { error: accErr } = await supabase.from('accounts').upsert(dbAccounts);
                          if (accErr) console.error("Gagal upload akun:", accErr);
                      }

                      // 2. Upload Transaksi
                      if (importedTransactions.length > 0) {
                          const dbTx = importedTransactions.map(tx => ({
                              id: tx.id, // Pertahankan ID agar tidak duplikat
                              user_id: user.id,
                              account_id: tx.accountId,
                              to_account_id: tx.toAccountId || null,
                              amount: tx.amount,
                              type: tx.type,
                              category: tx.category,
                              note: tx.notes,
                              date: tx.date
                          }));
                          const { error: txErr } = await supabase.from('transactions').upsert(dbTx);
                          if (txErr) console.error("Gagal upload transaksi:", txErr);
                      }
                      alert("✅ Sukses! Data import tersimpan di Cloud.");
                  }
              }

              // Redirect ke tab utama
              setActiveTab('trans');

          } catch (err) { 
              console.error(err);
              alert("File Error atau Format Salah."); 
          } finally {
              setIsLoading(false);
              if(fileInputRef.current) fileInputRef.current.value = '';
          }
        }, 500);
    };
    reader.readAsText(file);
};

  // --- EDIT ACCOUNT HANDLERS ---
  const openEditAccountModal = (acc: Account) => {
      setEditingAccount({...acc});
      setShowEditAccountModal(true);
  };

  const handleSaveAccountEdit = async () => {
    if (!editingAccount) return;

    // 1. VALIDASI: Cek Saldo Negatif
    // Hanya Credit Cards dan Loans yang boleh memiliki saldo negatif
    const allowedNegativeGroups = ['Credit Cards', 'Loans'];
    if (editingAccount.balance < 0 && !allowedNegativeGroups.includes(editingAccount.group)) {
        alert("Error: Saldo tidak boleh negatif (kecuali untuk Kartu Kredit / Hutang).");
        return;
    }

    try {
        // Ambil data akun lama untuk perbandingan
        const oldAccount = accounts.find(a => a.id === editingAccount.id);
        if (!oldAccount) return;

        // 2. HITUNG SELISIH (Untuk Transaksi Adjustment Otomatis)
        const diff = editingAccount.balance - oldAccount.balance;
        let adjustmentTx: Transaction | null = null;

        // Jika saldo berubah, siapkan data transaksi penyesuaian
        if (diff !== 0) {
            const isSurplus = diff > 0;
            const absAmount = Math.abs(diff);

            adjustmentTx = {
                id: `adj-${Date.now()}`,
                date: new Date().toISOString(),
                type: isSurplus ? 'INCOME' : 'EXPENSE',
                amount: absAmount,
                accountId: editingAccount.id,
                // Menggunakan 'toAccountId' null/undefined karena ini adjustment
                category: 'Adjustment', 
                notes: `Balance Correction (${isSurplus ? 'Surplus' : 'Deficit'}) - Manual Edit`
            };
        }

        // 3. SIMPAN KE SUPABASE (Jika Login)
        if (user && user.id) {
            // A. Update Data Akun
            const { error: accError } = await supabase
              .from('accounts')
              .update({
                  name: editingAccount.name,
                  owner: editingAccount.owner,
                  "group": editingAccount.group, 
                  balance: editingAccount.balance
              })
              .eq('id', editingAccount.id)
              .eq('user_id', user.id);

            if (accError) throw new Error("Gagal update akun: " + accError.message);

            // B. Insert Transaksi Adjustment (Jika ada selisih)
            if (adjustmentTx) {
               const { error: txError } = await supabase.from('transactions').insert([{
                   user_id: user.id,
                   amount: adjustmentTx.amount,
                   type: adjustmentTx.type,
                   category: adjustmentTx.category,
                   note: adjustmentTx.notes,
                   date: adjustmentTx.date,
                   account_id: adjustmentTx.accountId
               }]);
               
               if (txError) console.error("Gagal simpan adjustment ke cloud:", txError);
            }
        }

        // 4. UPDATE STATE LOKAL (Agar UI langsung berubah)
        // Update List Akun
        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? editingAccount : a));
        
        // Masukkan Transaksi Baru ke List
        if (adjustmentTx) {
            setTransactions(prev => [adjustmentTx!, ...prev]);
        }
        
        // Update tampilan detail jika sedang dibuka
        if (selectedAccountForDetail && selectedAccountForDetail.id === editingAccount.id) {
            setSelectedAccountForDetail(editingAccount);
        }

        // Tutup Modal & Beri Feedback
        setShowEditAccountModal(false);
        setEditingAccount(null);
        // alert("Perubahan berhasil disimpan!"); // Opsional: Boleh dihapus jika ingin silent

    } catch (err: any) {
        alert("Terjadi kesalahan: " + err.message);
    }
};


// --- FUNGSI HAPUS TRANSAKSI (SYNC SUPABASE) ---
const handleDeleteTransaction = async (txId: string) => {
    if(!confirm("Are you sure you want to delete this transaction?")) return;

    // 1. Hapus dari Supabase (Jika Login)
    if (user && user.id) {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', txId)
          .eq('user_id', user.id);
        
        if (error) {
            alert("Gagal hapus dari cloud: " + error.message);
            return;
        }
    }

    // 2. Hapus Lokal & Update Saldo Akun
    const txToDelete = transactions.find(t => t.id === txId);
    if (txToDelete) {
        // Kembalikan saldo akun (Revert Balance)
        setAccounts(prev => prev.map(acc => {
            if (acc.id === txToDelete.accountId) {
                let newBalance = acc.balance;
                // Kalau hapus PENGELUARAN -> Saldo nambah balik
                if (txToDelete.type === 'EXPENSE') newBalance += txToDelete.amount; 
                // Kalau hapus PEMASUKAN -> Saldo berkurang balik
                if (txToDelete.type === 'INCOME') newBalance -= txToDelete.amount; 
                return { ...acc, balance: newBalance };
            }
            return acc;
        }));
    }
    
    // Hapus dari list transaksi
    setTransactions(prev => prev.filter(t => t.id !== txId));
};

  // --- MISC HANDLERS ---
  const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      setSelectedAccountForDetail(null);
      setShowAssetAnalytics(false);
  };
  
  const onAddPress = () => {
      setNewTxDate(format(new Date(), 'yyyy-MM-dd')); // Reset Tanggal
      
      // LOGIC BARU: Auto-Select Account
      if (selectedAccountForDetail) {
          setNewTxAccountId(selectedAccountForDetail.id);
          // Otomatis set filter owner biar dropdown-nya sesuai
          setNewTxOwnerFilter(selectedAccountForDetail.owner);
      } else {
          setNewTxAccountId(''); // Reset jika di halaman depan
          setNewTxOwnerFilter('All');
      }

      setShowTransactionModal(true);
  };

  const handleAddCategory = () => {
      if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
          setCategories(prev => [...prev, newCategoryName.trim()]);
          setNewCategoryName('');
      }
  };

  const handleUpdateCategory = () => {
      if (editingCategory && editingCategory.name.trim()) {
          const newName = editingCategory.name.trim();
          if (!categories.includes(newName)) {
             setCategories(prev => {
                 const copy = [...prev];
                 copy[editingCategory.idx] = newName;
                 return copy;
             });
          }
          setEditingCategory(null);
      }
  };

  const handleDeleteCategory = (category: string) => {
      if (confirm(`Delete category "${category}"?`)) {
          setCategories(prev => prev.filter(c => c !== category));
      }
  };

const handleSubmitTransaction = async () => {
    // 1. Validasi Input
    const amountVal = parseFloat(newTxAmount);
    if (!amountVal || amountVal <= 0) {
        alert("Please enter a valid amount");
        return;
    }
    if (!newTxAccountId) {
        alert("Please select an account");
        return;
    }
    if (newTxType === 'TRANSFER' && !newTxToAccountId) {
        alert("Please select destination account for transfer");
        return;
    }

    // 2. Generate Data (Auto Date: NOW)
    const nowISO = new Date().toISOString(); // <--- OTOMATIS WAKTU SEKARANG
    
    // 3. OPTIMISTIC UPDATE (Update Lokal DULUAN agar UI terasa instan)
    const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        date: nowISO,
        type: newTxType,
        amount: amountVal,
        accountId: newTxAccountId,
        toAccountId: newTxType === 'TRANSFER' ? newTxToAccountId : undefined,
        category: newTxType === 'TRANSFER' ? 'Transfer' : newTxCategory,
        notes: newTxNotes
    };

    setTransactions(prev => [newTx, ...prev]);

    setAccounts(prev => prev.map(acc => {
        let balance = acc.balance;
        
        if (acc.id === newTxAccountId) {
            if (newTxType === 'INCOME') balance += amountVal;
            else balance -= amountVal; 
        }
        
        if (newTxType === 'TRANSFER' && acc.id === newTxToAccountId) {
            balance += amountVal;
        }

        return { ...acc, balance };
    }));

    // Reset Form & Tutup Modal SEGERA
    setShowTransactionModal(false);
    setNewTxAmount('');
    setNewTxNotes('');

    // 4. KIRIM KE SUPABASE (Background Process)
    // Biarkan ini jalan di belakang layar, user tidak perlu menunggu
    if (user?.id) {
        const dbData = {
            user_id: user.id, 
            amount: amountVal,
            type: newTxType,
            category: newTxType === 'TRANSFER' ? 'Transfer' : newTxCategory,
            note: newTxNotes,
            date: nowISO,
            account_id: newTxAccountId,
            to_account_id: newTxType === 'TRANSFER' ? newTxToAccountId : null
        };

        const { error } = await supabase.from('transactions').insert([dbData]);
        if (error) console.error("Background Sync Error:", error);
    }
};

  const t = (key: string) => {
    const dict: any = {
        'settings': lang === 'en' ? 'Settings' : 'Pengaturan',
        'language': lang === 'en' ? 'Language' : 'Bahasa',
        'accentColor': lang === 'en' ? 'Accent Color' : 'Warna Aksen',
        'custom': lang === 'en' ? 'Custom' : 'Kustom',
        'bgTheme': lang === 'en' ? 'Background Theme' : 'Tema Latar',
        'loginMenu': lang === 'en' ? 'Login / Sync' : 'Masuk / Sinkronisasi',
        'dataMgmt': lang === 'en' ? 'Data Management' : 'Manajemen Data',
        'resetData': lang === 'en' ? 'Reset Data' : 'Reset Data',
        'confirmReset': lang === 'en' ? 'Are you sure? This will delete all data.' : 'Anda yakin? Ini akan menghapus semua data.',
    };
    return dict[key] || key;
  };

// --- FUNGSI TAMBAH AKUN BARU (SUPABASE LINKED) ---
// 1. Tombol Add Account hanya membuka modal
const handleOpenAddAccountModal = () => {
    setNewAccName('');
    setNewAccOwner('Husband');
    setNewAccBalance('');
    setShowAddAccountModal(true);
};

// 2. Fungsi Submit Akun Baru (Lengkap)
const handleSubmitNewAccount = async () => {
    if (!newAccName.trim()) {
        alert("Account name is required");
        return;
    }

    const initialBalance = parseFloat(newAccBalance) || 0; // Opsional, default 0

    const newAcc: Account = {
        id: `acc_${Date.now()}`,
        name: newAccName,
        group: 'Bank Accounts', // Default group (bisa diedit nanti)
        balance: initialBalance,
        currency: 'IDR',
        includeInTotals: true,
        owner: newAccOwner
    };

    // Simpan ke Supabase (Jika Login)
    if (user && user.id) {
         const dbAccount = {
             id: newAcc.id,
             user_id: user.id,
             name: newAcc.name,
             "group": newAcc.group,
             balance: newAcc.balance,
             currency: newAcc.currency,
             owner: newAcc.owner
         };

         const { error } = await supabase.from('accounts').insert([dbAccount]);
         if (error) {
             alert("Gagal simpan online: " + error.message);
             return;
         }
    }

    // Update Lokal
    setAccounts(prev => [...prev, newAcc]);
    setShowAddAccountModal(false);
};


  // --- ACCOUNT TAB RENDER LOGIC ---
  const renderAccountsTab = () => {
      const husbandAccounts = accounts.filter(a => a.owner === 'Husband');
      const wifeAccounts = accounts.filter(a => a.owner === 'Wife');
      const otherAccounts = accounts.filter(a => !a.owner);

      const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
      const husbandTotal = husbandAccounts.reduce((s, a) => s + a.balance, 0);
      const wifeTotal = wifeAccounts.reduce((s, a) => s + a.balance, 0);

      const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

      // Helper to render grouped accounts
      const renderGroupedList = (accList: Account[]) => {
          const groups: AccountGroup[] = ['Cash', 'Bank Accounts', 'Credit Cards', 'Investments', 'Loans'];
          
          return (
            <div className="space-y-4">
                {groups.map(group => {
                    const groupAccs = accList.filter(a => a.group === group);
                    if (groupAccs.length === 0) return null;
                    const groupTotal = groupAccs.reduce((s, a) => s + a.balance, 0);

                    return (
                        <div key={group} className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                            <div className="flex justify-between items-center px-4 py-2 bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{group}</span>
                                </div>
                                <span className={`text-xs font-bold ${groupTotal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatCurrency(groupTotal)}
                                </span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {groupAccs.map(acc => (
                                    <AccountCard key={acc.id} account={acc} onEdit={(a) => setSelectedAccountForDetail(a)} listView={true} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                {/* Catch any leftover accounts not in main groups */}
                {accList.filter(a => !groups.includes(a.group)).length > 0 && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div className="px-4 py-2 bg-white/5 text-xs font-bold text-gray-300 uppercase tracking-wider">Other</div>
                        <div className="divide-y divide-white/5">
                            {accList.filter(a => !groups.includes(a.group)).map(acc => (
                                <AccountCard key={acc.id} account={acc} onEdit={(a) => setSelectedAccountForDetail(a)} listView={true} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
          );
      };

      return (
          <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full">
              {/* ASSETS SUMMARY DASHBOARD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Total Card */}
                 {/* Total Card */}
                  <div 
                    onClick={() => { setAnalyticsScope({ type: 'GLOBAL' }); setShowAssetAnalytics(true); }}
                    // HAPUS: bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-500/30
                    // GANTI DENGAN CODE DI BAWAH:
                    className="relative p-4 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform border border-white/10 bg-surface group"
                  >
                      {/* BACKGROUND BLENDING: Mengikuti warna Primary User */}
                      <div 
                        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      ></div>
                      
                      {/* GRADIENT ACCENT: Agar tidak flat */}
                      <div 
                        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-40 mix-blend-screen"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      ></div>

                      <div className="relative z-10">
                          {/* Text color juga diubah jadi text-primary biar match */}
                          <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-primary)' }}>
                              Total Assets
                          </p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</p>
                          <div className="flex items-center gap-1 mt-2 text-white/60 text-xs">
                              <TrendingUp className="w-3 h-3" />
                              <span>View Growth</span>
                          </div>
                      </div>
                      
                      <div className="absolute right-0 bottom-0 opacity-10">
                          <TrendingUp className="w-24 h-24 text-white" />
                      </div>
                  </div>
                  
                  {/* Husband Card */}
                  <div 
                    onClick={() => { setAnalyticsScope({ type: 'OWNER', owner: 'Husband' }); setShowAssetAnalytics(true); }}
                    className="bg-surface p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-gray-400 text-xs font-bold uppercase">Husband</p>
                          <UserCircle2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-xl font-bold text-indigo-400">{formatCurrency(husbandTotal)}</p>
                  </div>

                  {/* Wife Card */}
                  <div 
                    onClick={() => { setAnalyticsScope({ type: 'OWNER', owner: 'Wife' }); setShowAssetAnalytics(true); }}
                    className="bg-surface p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-gray-400 text-xs font-bold uppercase">Wife</p>
                          <UserCircle2 className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-xl font-bold text-pink-400">{formatCurrency(wifeTotal)}</p>
                  </div>
              </div>

              {/* LISTS */}
              <div className="space-y-8">
                  {husbandAccounts.length > 0 && (
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 pl-1 mb-2">
                              <UserCircle2 className="w-4 h-4 text-indigo-400" />
                              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Husband's Accounts</h3>
                          </div>
                          {renderGroupedList(husbandAccounts)}
                      </div>
                  )}

                  {wifeAccounts.length > 0 && (
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 pl-1 mb-2">
                              <UserCircle2 className="w-4 h-4 text-pink-400" />
                              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider">Wife's Accounts</h3>
                          </div>
                          {renderGroupedList(wifeAccounts)}
                      </div>
                  )}

                  {otherAccounts.length > 0 && (
                      <div className="space-y-2">
                           <div className="flex items-center gap-2 pl-1 mb-2">
                              <UserCircle2 className="w-4 h-4 text-gray-400" />
                              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Joint / Other</h3>
                           </div>
                           {renderGroupedList(otherAccounts)}
                      </div>
                  )}
              </div>

              
<button 
                  onClick={handleOpenAddAccountModal} 
                  className="w-full py-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
              >
                  <Plus className="w-5 h-5 bg-white/20 rounded-full p-0.5" />
                  Add New Account
              </button>
          </div>
      );
  };


  // --- TAMBAHKAN FUNGSI INI DI SINI ---
  const handleClearHajjHistory = () => {
      if (confirm(lang === 'en' ? 'Delete all Hajj/Umrah history?' : 'Hapus semua riwayat Haji/Umrah?')) {
          setNonProfitTransactions([]);
          // Kita update state lokal saja, karena history ini tidak disimpan di Supabase secara terpisah 
          // (kecuali kamu mau bikin logic delete di Supabase juga, tapi untuk sekarang lokal cukup).
      }
  };

  const renderContent = () => {
      // 1. Asset Analytics View
      if (showAssetAnalytics) {
          return <AssetAnalytics 
              transactions={transactions} 
              accounts={accounts} 
              onBack={() => setShowAssetAnalytics(false)}
              scope={analyticsScope}
          />
      }

      // 2. Account Detail View
      if (selectedAccountForDetail) {
          return <AccountDetail 
              account={selectedAccountForDetail} 
              transactions={transactions} 
              onBack={() => setSelectedAccountForDetail(null)}
              onEdit={(acc) => openEditAccountModal(acc)} // Passes to proper modal handler
              onViewStats={(acc) => {
                  setAnalyticsScope({ type: 'ACCOUNT', accountId: acc.id });
                  setShowAssetAnalytics(true);
              }}
          />;
      }

      
        switch (activeTab) {
            case 'trans': return <TransactionHistory 
                transactions={transactions} 
                accounts={accounts} 
                lang={lang} 
                onSelectAccount={(acc) => setSelectedAccountForDetail(acc)} 
                // TAMBAHKAN BARIS DI BAWAH INI:
                onDelete={handleDeleteTransaction} 
            />;
          case 'stats': 
    return (
        // Tambahkan div pembungkus ini agar bisa di-scroll
        <div className="h-full overflow-y-auto pb-24"> 
            <Reports transactions={transactions} accounts={accounts} lang={lang} />
        </div>
    );
          case 'accounts': return renderAccountsTab();
          case 'non-profit': 
            return <NonProfit 
                accounts={nonProfitAccounts} 
                transactions={nonProfitTransactions} 
                mainAccounts={accounts} 
                // --- TAMBAHKAN PROPS INI 👇 ---
                onClearHistory={handleClearHajjHistory}
                // ------------------------------
                lang={lang} 
                onAddTransaction={(tx, src) => { 
                    setNonProfitTransactions(prev => [...prev, tx]); 
                    setNonProfitAccounts(prev => prev.map(a => a.id === tx.accountId ? {...a, balance: a.balance + tx.amount} : a)); 
                    if (src && tx.amount > 0) { 
                        const mainTx: Transaction = { id: 'tr-' + tx.id, date: tx.date, type: 'EXPENSE', amount: tx.amount, accountId: src, category: 'Non-Profit Transfer', notes: 'Transfer to ' + tx.accountId }; 
                        setTransactions(prev => [mainTx, ...prev]); 
                        setAccounts(prev => prev.map(a => a.id === src ? {...a, balance: a.balance - tx.amount} : a)); 
                    } 
                }} 
                onUpdateBalance={(id, bal) => setNonProfitAccounts(prev => prev.map(a => a.id === id ? {...a, balance: bal} : a))} 
                onComplete={(id) => setNonProfitAccounts(prev => prev.map(a => a.id === id ? {...a, balance: 0} : a))} 
            />;
          case 'zakat': return <ZakatMal accounts={accounts} transactions={transactions} onAddTransaction={(tx) => { setTransactions(prev => [tx, ...prev]); setAccounts(prev => prev.map(a => a.id === tx.accountId ? {...a, balance: a.balance - tx.amount} : a)); }} />;
          case 'more':
              // ... (Settings Tab Content - Keeping mostly same but referencing user state)
              return (
                  <div className="p-4 space-y-4 overflow-y-auto h-full pb-24">
                      {user && (
                          <div className="bg-surface p-4 rounded-xl border border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                      {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                      <p className="font-bold text-white">{user.name}</p>
                                      <p className="text-xs text-gray-400">{user.email}</p>
                                  </div>
                              </div>
                              <button onClick={handleLogout} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">Log Out</button>
                          </div>
                      )}

                      <div className="bg-surface p-4 rounded-xl border border-white/10">
                          <h3 className="font-bold text-lg mb-4 text-white">{t('settings')}</h3>
                          <div className="space-y-4">
                              {/* --- LANGUAGE --- */}
                              <button onClick={() => setLang(lang === 'en' ? 'id' : 'en')} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700"><span>{t('language')}</span><span className="text-primary font-bold">{lang.toUpperCase()}</span></button>
                              
                              {/* --- CURRENCY SETTING (BARU) --- */}
                              <div className="flex items-center justify-between p-3 bg-surface-light rounded-lg">
                                  <span className="text-sm font-medium text-gray-300">Currency Format</span>
                                  <div className="flex bg-black/20 p-1 rounded-lg">
                                      <button 
                                          onClick={() => setCurrency('IDR')}
                                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'IDR' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                                      >
                                          Rp (IDR)
                                      </button>
                                      <button 
                                          onClick={() => setCurrency('USD')}
                                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'USD' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                                      >
                                          $ (USD)
                                      </button>
                                  </div>
                              </div>

                              {/* --- SECURITY SETTING --- */}
<div className="mt-4 bg-surface-light p-3 rounded-lg flex items-center justify-between border border-white/5">
    <div>
        <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${appPin ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
            App Lock (PIN)
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
            {appPin ? 'Aktif (Cloud Synced)' : 'Nonaktif'}
        </p>
    </div>
    
    {appPin ? (
        <button 
            onClick={handleDisablePin}
            className="text-xs font-bold text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
        >
            Matikan
        </button>
    ) : (
        <button 
            onClick={() => setShowPinSetup(true)}
            className="text-xs font-bold text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg hover:bg-emerald-400/10 transition-colors"
        >
            Aktifkan
        </button>
    )}
</div>

                              {/* --- ACCENT COLOR --- */}
                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('accentColor')}</label>
                                      {/* Tombol Pipette di Header tetap ada, tapi mentrigger input di bawah */}
                                      <button 
                                          onClick={() => accentInputRef.current?.showPicker ? accentInputRef.current.showPicker() : accentInputRef.current?.click()} 
                                          className="p-1.5 rounded-full hover:bg-white/10" 
                                          title={t('custom')}
                                      >
                                          <Pipette className="w-4 h-4 text-gray-400" />
                                      </button>
                                  </div>
                                  <div className="flex gap-2 flex-wrap items-center">
                                      {ACCENT_PRESETS.map(acc => (
                                          <button key={acc.name} onClick={() => setCurrentAccent(acc.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentAccent === acc.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: acc.value }} />
                                      ))}
                                      
                                      {/* === PERBAIKAN: Input dipindah ke sini (sebelah lingkaran Custom) === */}
                                      <div className="relative">
                                          <input 
                                              ref={accentInputRef} 
                                              type="color" 
                                              value={customAccentHex} 
                                              onChange={(e) => { setCustomAccentHex(e.target.value); setCurrentAccent('Custom'); }} 
                                              // Posisi absolute di kanan luar (left-full = 100% ke kanan)
                                              className="opacity-0 absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 overflow-hidden ml-2" 
                                          />
                                          <button 
                                            onClick={() => accentInputRef.current?.showPicker ? accentInputRef.current.showPicker() : accentInputRef.current?.click()} 
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentAccent === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} 
                                            style={{ backgroundColor: currentAccent === 'Custom' ? customAccentHex : 'transparent' }}
                                          >
                                              {currentAccent !== 'Custom' && <div className="w-full h-full rounded-full" style={{background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`}} />}
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              {/* --- BACKGROUND THEME --- */}
                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('bgTheme')}</label>
                                      <button 
                                          onClick={() => bgInputRef.current?.showPicker ? bgInputRef.current.showPicker() : bgInputRef.current?.click()} 
                                          className="p-1.5 rounded-full hover:bg-white/10" 
                                          title={t('custom')}
                                      >
                                          <Palette className="w-4 h-4 text-gray-400" />
                                      </button>
                                  </div>
                                  <div className="flex gap-2 flex-wrap items-center">
                                      {BG_THEMES.map(theme => (
                                          <button key={theme.name} onClick={() => setCurrentTheme(theme.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentTheme === theme.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: theme.bg }} />
                                      ))}
                                      
                                      {/* === PERBAIKAN: Input dipindah ke sini (sebelah lingkaran Custom) === */}
                                      <div className="relative">
                                          <input 
                                              ref={bgInputRef} 
                                              type="color" 
                                              value={customBgHex} 
                                              onChange={(e) => { setCustomBgHex(e.target.value); setCurrentTheme('Custom'); }} 
                                              // Posisi absolute di kanan luar
                                              className="opacity-0 absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 overflow-hidden ml-2" 
                                          />
                                          <button 
                                            onClick={() => bgInputRef.current?.showPicker ? bgInputRef.current.showPicker() : bgInputRef.current?.click()} 
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentTheme === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} 
                                            style={{ backgroundColor: currentTheme === 'Custom' ? customBgHex : 'transparent' }}
                                          >
                                              {currentTheme !== 'Custom' && <div className="w-full h-full rounded-full" style={{background: `conic-gradient(black, #333, #555, #111)`}} />}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Data Management Section (Keeping standard) */}
                      <div className="bg-surface p-4 rounded-xl border border-white/10">
                        <h3 className="font-bold text-lg mb-4 text-white">{t('dataMgmt')}</h3>
                        <div className="space-y-2">
                            <button onClick={() => { alert("Export Excel not implemented"); }} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700 group"><div className="flex items-center"><FileSpreadsheet className="w-5 h-5 text-green-500 mr-3" /><div className="text-left"><div className="font-medium">Export to Excel</div><div className="text-xs text-gray-500">Backup data</div></div></div><Download className="w-4 h-4 text-gray-500 group-hover:text-white" /></button>
                            <button onClick={() => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories})); const node = document.createElement('a'); node.setAttribute("href", dataStr); node.setAttribute("download", "finance_backup.json"); document.body.appendChild(node); node.click(); node.remove(); }} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700 group"><div className="flex items-center"><FileJson className="w-5 h-5 text-yellow-500 mr-3" /><div className="text-left"><div className="font-medium">Export to JSON</div><div className="text-xs text-gray-500">Backup data</div></div></div><Download className="w-4 h-4 text-gray-500 group-hover:text-white" /></button>
                            <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json,.xlsx,.xls" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700 group"><div className="flex items-center"><Upload className="w-5 h-5 text-blue-500 mr-3" /><div className="text-left"><div className="font-medium">Import Data</div><div className="text-xs text-gray-500">Restore backup</div></div></div><ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white" /></button>
                            <button onClick={() => { if(window.confirm(t('confirmReset'))) { setAccounts([]); setTransactions([]); setNonProfitAccounts([]); setNonProfitTransactions([]); setCategories(DEFAULT_CATEGORIES); localStorage.removeItem('financeProData'); window.location.reload(); } }} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-red-900/20 group border border-transparent hover:border-red-900/50"><div className="flex items-center text-red-500"><Trash2 className="w-5 h-5 mr-3" /><span className="font-medium">{t('resetData')}</span></div></button>
                        </div>
                    </div>
                  </div>
              );
          default: return null;
      }
  };

  // --- RENDERING ---

  // ... (kode logika di atas biarkan saja) ...

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#18181b] text-white flex-col gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium animate-pulse">Checking your session...</p>
      </div>
    );
  }

  // === GANTI DARI SINI SAMPAI PALING BAWAH FILE ===
  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      onAddPress={onAddPress}
      user={user}
      onAuthRequest={() => { setShowAuthModal(true); setAuthMode('LOGIN'); }}
      onLogout={handleLogout}
      lang={lang}
      setLang={setLang}
    >
        {/* 1. LOCK SCREEN (Layer Paling Atas) */}
        {isLocked && appPin && (
            <LockScreen 
                correctPin={appPin} 
                onUnlock={() => setIsLocked(false)} 
                onForgot={handleForgotPin}
            />
        )}

        {/* 2. KONTEN UTAMA (Tabs) */}
        {renderContent()}


        {/* ========================================= */}
        {/* MULAI BAGIAN MODAL YANG HILANG       */}
        {/* ========================================= */}

        {/* 3. MODAL: ADD NEW ACCOUNT */}
        {showAddAccountModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Add New Account</h3>
                        <button onClick={() => setShowAddAccountModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Account Name</label>
                            <input type="text" value={newAccName} onChange={e => setNewAccName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary" placeholder="e.g. BCA Main" autoFocus />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Owner</label>
                            <div className="flex bg-white/5 p-1 rounded-lg">
                                <button onClick={() => setNewAccOwner('Husband')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Husband</button>
                                <button onClick={() => setNewAccOwner('Wife')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === 'Wife' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Wife</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Initial Balance</label>
                            <CurrencyInput 
                                value={newAccBalance}
                                onChange={val => setNewAccBalance(val)}
                                currency={currency}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right"
                                placeholder="0"
                            />
                        </div>
                        <button onClick={handleSubmitNewAccount} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg mt-2">Create Account</button>
                    </div>
                </div>
            </div>
        )}

        {/* 4. MODAL: EDIT ACCOUNT */}
        {showEditAccountModal && editingAccount && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Edit Account</h3>
                        <button onClick={() => setShowEditAccountModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Account Name</label>
                            <input 
                                type="text" 
                                value={editingAccount.name} 
                                onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Current Balance</label>
                            <CurrencyInput 
                                value={editingAccount.balance}
                                onChange={val => setEditingAccount({...editingAccount, balance: parseFloat(val) || 0})}
                                currency={currency}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 ml-1">* Changing balance creates an Adjustment transaction.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={handleSaveAccountEdit} className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Save</button>
                            <button onClick={() => {
                                if(confirm("Delete this account and all its transactions?")) {
                                    // Logic hapus akun (simple version)
                                    setAccounts(prev => prev.filter(a => a.id !== editingAccount.id));
                                    setTransactions(prev => prev.filter(t => t.accountId !== editingAccount.id && t.toAccountId !== editingAccount.id));
                                    setShowEditAccountModal(false);
                                }
                            }} className="py-3 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-500 font-bold rounded-xl border border-red-600/30 flex items-center justify-center gap-2 transition-colors"><Trash2 className="w-4 h-4"/> Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 5. MODAL: ADD TRANSACTION (FLOATING CENTER STYLE) */}
        {showTransactionModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-surface rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                    
                    {/* Header Modal */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0">
                        <h3 className="font-bold text-white text-lg">
                            {showCategoryManager ? 'Manage Categories' : 'New Transaction'}
                        </h3>
                        <button onClick={() => { setShowTransactionModal(false); setShowCategoryManager(false); }}><X className="w-6 h-6 text-gray-400" /></button>
                    </div>
                    
                    {/* === MODE 1: CATEGORY MANAGER === */}
                    {showCategoryManager ? (
                        <div className="overflow-y-auto p-6 space-y-4 flex-1">
                             <div className="flex items-center justify-between mb-2">
                                 <p className="text-xs text-gray-400">Add or edit your transaction categories.</p>
                                 <button onClick={() => setShowCategoryManager(false)} className="text-xs font-bold text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full">Done</button>
                             </div>
                             
                             <div className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={newCategoryName} 
                                     onChange={e => setNewCategoryName(e.target.value)}
                                     placeholder="New Category Name..."
                                     className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                     onKeyDown={(e) => { if(e.key === 'Enter') handleAddCategory(); }}
                                 />
                                 <button onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-700 px-4 rounded-xl text-white shadow-lg"><Plus className="w-5 h-5"/></button>
                             </div>

                             <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                 {categories.map((cat, idx) => (
                                     <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/20 transition-colors">
                                         {editingCategory?.idx === idx ? (
                                             <div className="flex items-center gap-2 flex-1">
                                                 <input 
                                                     value={editingCategory.name} 
                                                     onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                                                     className="bg-black/40 text-white rounded-lg p-2 flex-1 outline-none border border-blue-500 text-sm"
                                                     autoFocus
                                                 />
                                                 <button onClick={handleUpdateCategory} className="p-2 bg-blue-600 rounded-lg text-white"><Save className="w-4 h-4"/></button>
                                             </div>
                                         ) : (
                                             <span className="text-sm text-gray-200 font-medium pl-1">{cat}</span>
                                         )}
                                         
                                         {editingCategory?.idx !== idx && (
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingCategory({idx, name: cat})} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                         )}
                                     </div>
                                 ))}
                             </div>
                        </div>
                    ) : (
                        /* === MODE 2: FORM TRANSAKSI === */
                        <div className="overflow-y-auto p-6 space-y-5">
                            {/* Type Toggle */}
                            <div className="flex bg-white/5 p-1 rounded-xl">
                                <button type="button" onClick={() => setNewTxType('EXPENSE')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'EXPENSE' ? 'bg-rose-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                    <ArrowUpRight className="w-4 h-4"/> Expense
                                </button>
                                <button type="button" onClick={() => setNewTxType('INCOME')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'INCOME' ? 'bg-emerald-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                    <ArrowDownRight className="w-4 h-4"/> Income
                                </button>
                                <button type="button" onClick={() => setNewTxType('TRANSFER')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'TRANSFER' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                    <ArrowRightLeft className="w-4 h-4"/> Transfer
                                </button>
                            </div>

                            {/* Amount Input (Fixed Keypad) */}
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label>
                                <CurrencyInput 
                                    value={newTxAmount}
                                    onChange={val => setNewTxAmount(val)}
                                    currency={currency}
                                    className="bg-[#18181b] border border-white/10 rounded-xl p-4 text-2xl font-bold outline-none text-right focus:border-white/30 text-white placeholder-gray-600"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            {/* Accounts Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-gray-400 uppercase font-bold block">{newTxType === 'TRANSFER' ? 'From Account' : 'Account'}</label>
                                        <div className="flex bg-white/5 p-0.5 rounded-lg">
                                            {(['All', 'Husband', 'Wife'] as const).map(role => (
                                                <button key={role} type="button" onClick={() => setNewTxOwnerFilter(role)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${newTxOwnerFilter === role ? 'bg-gray-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{role === 'All' ? 'All' : role === 'Husband' ? 'Suami' : 'Istri'}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <select value={newTxAccountId} onChange={e => setNewTxAccountId(e.target.value)} className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                                        <option value="" disabled>Select Account</option>
                                        {accounts.filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner).map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                                        ))}
                                    </select>
                                </div>
                                {newTxType === 'TRANSFER' && (
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">To Account</label>
                                        <select value={newTxToAccountId} onChange={e => setNewTxToAccountId(e.target.value)} className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                                            <option value="" disabled>Select Destination</option>
                                            {accounts.filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner).filter(a => a.id !== newTxAccountId).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Category with Gear Icon */}
                            {newTxType !== 'TRANSFER' && (
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Category</label>
                                    <div className="flex gap-2">
                                        <select value={newTxCategory} onChange={e => setNewTxCategory(e.target.value)} className="flex-1 bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                                            {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                        </select>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCategoryManager(true)} 
                                            className="p-3 bg-white/10 rounded-xl hover:bg-white/20 text-white transition-colors border border-white/5"
                                        >
                                            <Settings className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note</label>
                                <input 
                                    type="text"
                                    value={newTxNotes}
                                    onChange={e => setNewTxNotes(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                    placeholder="Description (Optional)..."
                                />
                                <p className="text-[10px] text-gray-500 mt-1 ml-1">* Date set to now automatically.</p>
                            </div>

                            <button 
                                onClick={handleSubmitTransaction}
                                className={`w-full font-bold py-3.5 rounded-xl mt-4 transition-all text-white shadow-lg ${
                                    newTxType === 'EXPENSE' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' :
                                    newTxType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' :
                                    'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
                                }`}
                            >
                                Save Transaction
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 6. MODAL: PIN SETUP */}
        {showPinSetup && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Create App PIN</h3>
                        <button onClick={() => setShowPinSetup(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <p className="text-sm text-gray-400 text-center mb-6">Create a 6-digit PIN to secure this device.</p>
                    <div className="flex justify-center mb-6">
                        <input 
                            type="text" 
                            inputMode="numeric"
                            maxLength={6}
                            value={newPinInput}
                            onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                            className="bg-black/50 border border-emerald-500/50 text-white text-3xl font-bold tracking-[0.5em] text-center w-full py-4 rounded-xl outline-none focus:border-emerald-500"
                            placeholder="••••••"
                            autoFocus
                        />
                    </div>
                    <button 
                        onClick={handleCreatePin}
                        disabled={newPinInput.length !== 6}
                        className="w-full py-3 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        Save PIN
                    </button>
                </div>
            </div>
        )}

        {/* 7. MODAL: AUTH / LOGIN */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                   {/* ... Isi Auth Modal yang lama (Singkat saja karena tidak berubah) ... */}
                   <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">{authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h3>
                        <button onClick={() => setShowAuthModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
                    </div>
                    {authError && <div className="p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{authError}</div>}
                    
                    <div className="space-y-4">
                        {authMode === 'REGISTER' && (
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                                <UserCircle2 className="text-gray-400 w-5 h-5" />
                                <input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
                            </div>
                        )}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                            <UserCircle2 className="text-gray-400 w-5 h-5" />
                            <input type="email" placeholder="Email Address" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                            <div onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">{showPassword ? <EyeOff className="text-gray-400 w-5 h-5"/> : <Eye className="text-gray-400 w-5 h-5"/>}</div>
                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={regPass} onChange={e => setRegPass(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
                        </div>

                        {authMode === 'LOGIN' ? (
                            <button onClick={handleLocalLogin} disabled={isLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">
                                {isLoading ? <Loader2 className="animate-spin"/> : <LogIn className="w-4 h-4"/>} Login
                            </button>
                        ) : (
                            <button onClick={handleRegister} disabled={isLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">
                                {isLoading ? <Loader2 className="animate-spin"/> : <UserPlus className="w-4 h-4"/>} Register
                            </button>
                        )}
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">
                            {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"} 
                            <button onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setAuthError(''); }} className="ml-1 text-emerald-400 font-bold hover:underline">
                                {authMode === 'LOGIN' ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        )}

    </Layout>
  );
};

export default App;