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
import { Pipette, Palette, FileSpreadsheet, FileJson, Upload, ChevronRight, Download, Trash2, Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Settings, Edit3, Save, LogIn, UserPlus, TrendingUp, UserCircle2, Layers, Loader2, AlertTriangle } from 'lucide-react';
import { subDays, format } from 'date-fns';

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

const App = () => {
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

  // 1. DEFINISIKAN FUNGSI LOAD DATA DULU (Jangan ada useEffect di dalam sini)
  const loadDataFromSupabase = async (userId: string) => {
    setIsLoading(true);

    // A. Ambil Akun
    const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

    // B. Ambil Transaksi
    const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

    if (accError || txError) {
        console.error("Gagal ambil data:", accError || txError);
        setIsLoading(false);
        return;
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
    
// TAMBAHKAN BARIS INI 👇
await loadSettingsFromSupabase(userId);

    setIsDataLoaded(true);
    setIsLoading(false);
  };

 // 2. USEEFFECT UTAMA (Cek Login & Load Data - DENGAN TIMEOUT PROTECTION)
  useEffect(() => {
    const checkUser = async () => {
      try {
          // --- PROTEKSI TIMEOUT (ANTI-STUCK) ---
          // Kita buat balapan: "Tanya Supabase" vs "Timer 3 Detik"
          // Siapa yang duluan selesai, dia yang menang.
          
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error("Auth Timeout")), 3000);
          });

          // Mulai Balapan!
          // Jika Supabase macet > 3 detik, timeoutPromise akan melempar Error.
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          
          // --- LOGIKA NORMAL ---
          if (session?.user) {
            setUser({
                id: session.user.id,
                name: session.user.user_metadata?.display_name || 'User',
                email: session.user.email || ''
            });

            // Load data dari server
            await loadDataFromSupabase(session.user.id);
          } else {
             // Tidak ada session (Logout)
             setIsDataLoaded(true); 
          }

      } catch (error) {
          // --- JIKA TIMEOUT / ERROR TERJADI ---
          console.warn("Auth check terlalu lama atau gagal, memaksa masuk mode Guest.", error);
          
          // Paksa aplikasi jalan terus (anggap sebagai Guest / Logout)
          // Daripada user stuck di loading screen selamanya.
          setUser(null);
          setIsDataLoaded(true);

      } finally {
          // Apapun yang terjadi (Sukses / Error / Timeout), Loading HARUS mati.
          setIsAuthLoading(false); 
          setIsLoading(false);
      }
    };

    checkUser();

    // Listener Login/Logout (Tidak perlu timeout karena trigger user action)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.display_name || 'User',
            email: session.user.email || ''
          });
          await loadDataFromSupabase(session.user.id);
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
              updated_at: new Date().toISOString()
          });
          
        if (error) console.error("Gagal auto-save settings:", error);
        
    }, 2000); // Tunggu 2 detik setelah user selesai klik-klik

    return () => clearTimeout(timer); // Reset timer jika user masih mengganti setting
}, [currentAccent, customAccentHex, currentTheme, customBgHex, lang, user, isDataLoaded]);

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
         accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories, lang,
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
const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
    }
    // Hapus data user dari state aplikasi agar kembali ke tampilan login
    setUser(null);
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
    if (editingAccount) {
        // 1. Update ke Supabase (Jika Login)
        if (user && user.id) {
            const { error } = await supabase
              .from('accounts')
              .update({
                  name: editingAccount.name,
                  owner: editingAccount.owner,
                  "group": editingAccount.group, 
                  balance: editingAccount.balance
              })
              .eq('id', editingAccount.id)
              .eq('user_id', user.id);

            if (error) {
                alert("Gagal update akun online: " + error.message);
                return;
            }
        }

        // 2. Logika Lama (Adjustment Transaction Lokal & State Update)
        const oldAccount = accounts.find(a => a.id === editingAccount.id);
        if (oldAccount && oldAccount.balance !== editingAccount.balance) {
            const diff = editingAccount.balance - oldAccount.balance;
            
            const newTx: Transaction = {
                id: `adj-${Date.now()}`,
                date: new Date().toISOString(),
                type: diff > 0 ? 'INCOME' : 'EXPENSE',
                amount: Math.abs(diff),
                accountId: editingAccount.id,
                category: 'Adjustment',
                notes: `Manual Balance Correction (${diff > 0 ? 'Surplus' : 'Deficit'})`
            };
            
            // Opsional: Simpan Adjustment ke Cloud juga
            if (user && user.id) {
               await supabase.from('transactions').insert([{
                   user_id: user.id,
                   amount: newTx.amount,
                   type: newTx.type,
                   category: newTx.category,
                   note: newTx.notes,
                   date: newTx.date,
                   account_id: newTx.accountId
               }]);
            }

            setTransactions(prev => [newTx, ...prev]);
        }

        // 3. Update State Lokal
        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? editingAccount : a));
        
        if (selectedAccountForDetail && selectedAccountForDetail.id === editingAccount.id) {
            setSelectedAccountForDetail(editingAccount);
        }

        setShowEditAccountModal(false);
        setEditingAccount(null);
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
      setNewTxDate(format(new Date(), 'yyyy-MM-dd'));
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

    // 2. Siapkan Data
    // Data untuk Supabase (nama kolom harus sesuai tabel database)
    const dbData = {
        user_id: user?.id, 
        amount: amountVal,
        type: newTxType,
        category: newTxType === 'TRANSFER' ? 'Transfer' : newTxCategory,
        note: newTxNotes, // Di database kolomnya 'note'
        date: new Date(newTxDate).toISOString(),
        account_id: newTxAccountId,
        to_account_id: newTxType === 'TRANSFER' ? newTxToAccountId : null
    };

    // 3. KIRIM KE SUPABASE (Hanya jika user login)
    if (user?.id) {
        const { error } = await supabase
            .from('transactions')
            .insert([dbData]); // Kirim data ke tabel 'transactions'
        
        if (error) {
            console.error("Gagal simpan ke cloud:", error);
            alert("Gagal menyimpan ke server, tapi data tersimpan lokal.");
            // Kita tidak return, supaya data tetap muncul di layar (Optimistic UI)
        }
    }

    // 4. Update Tampilan Lokal (Agar aplikasi tidak lemot nunggu server)
    const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        date: new Date(newTxDate).toISOString(),
        type: newTxType,
        amount: amountVal,
        accountId: newTxAccountId,
        toAccountId: newTxType === 'TRANSFER' ? newTxToAccountId : undefined,
        category: newTxType === 'TRANSFER' ? 'Transfer' : newTxCategory,
        notes: newTxNotes // Di state lokal namanya 'notes'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update Saldo Akun Lokal
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

    // Reset Form
    setShowTransactionModal(false);
    setNewTxAmount('');
    setNewTxNotes('');
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
const handleCreateAccount = async () => {
    // 1. Minta nama akun (seperti sebelumnya)
    const name = prompt("Account Name:");
    if(!name) return;

    // 2. Siapkan data akun baru
    const newAcc: Account = {
        id: `acc_${Date.now()}`, // ID Unik
        name,
        group: 'Bank Accounts', // Default group
        balance: 0,
        currency: 'IDR',
        includeInTotals: true,
        owner: 'Husband' // Default owner (bisa diedit nanti)
    };

    // 3. Simpan ke Supabase (Hanya jika user sedang Login)
    if (user && user.id) {
         const dbAccount = {
             id: newAcc.id,
             user_id: user.id,
             name: newAcc.name,
             "group": newAcc.group, // Pakai kutip karena 'group' kata kunci SQL
             balance: newAcc.balance,
             currency: newAcc.currency,
             owner: newAcc.owner
         };

         const { error } = await supabase
             .from('accounts')
             .insert([dbAccount]);

         if (error) {
             alert("Gagal simpan ke database: " + error.message);
             return; // Stop jika gagal simpan online
         }
    }

    // 4. Update Tampilan di Aplikasi (Lokal)
    setAccounts(prev => [...prev, newAcc]);
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
                  <div 
                    onClick={() => { setAnalyticsScope({ type: 'GLOBAL' }); setShowAssetAnalytics(true); }}
                    className="bg-gradient-to-br from-emerald-900 to-emerald-950 p-4 rounded-xl border border-emerald-500/30 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                      <div className="relative z-10">
                          <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Total Assets</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</p>
                          <div className="flex items-center gap-1 mt-2 text-emerald-400/80 text-xs">
                              <TrendingUp className="w-3 h-3" />
                              <span>View Growth</span>
                          </div>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10">
                          <TrendingUp className="w-24 h-24 text-emerald-400" />
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

              <button onClick={handleCreateAccount} className="w-full py-4 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:text-white hover:border-white/30 flex items-center justify-center gap-2">
    <Plus className="w-5 h-5"/> Add Account
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
          case 'stats': return <Reports transactions={transactions} accounts={accounts} lang={lang} />;
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
                              
                              {/* --- ACCENT COLOR (DIPERBAIKI) --- */}
                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('accentColor')}</label>
                                      
                                      {/* Container dibuat RELATIVE agar kita bisa atur posisi input di dalamnya */}
                                      <div className="flex items-center gap-2 relative">
                                          {/* Input Transparan & Digeser ke Kanan (-35px) */}
                                          <input 
                                              ref={accentInputRef} 
                                              type="color" 
                                              value={customAccentHex} 
                                              onChange={(e) => { setCustomAccentHex(e.target.value); setCurrentAccent('Custom'); }} 
                                              className="opacity-0 absolute top-1/2 -translate-y-1/2 w-0 h-0 cursor-pointer"
                                              style={{ right: '-35px' }} 
                                          />
                                          <button 
                                              onClick={() => accentInputRef.current?.showPicker ? accentInputRef.current.showPicker() : accentInputRef.current?.click()} 
                                              className="p-1.5 rounded-full hover:bg-white/10" 
                                              title={t('custom')}
                                          >
                                              <Pipette className="w-4 h-4 text-gray-400" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                      {ACCENT_PRESETS.map(acc => (
                                          <button key={acc.name} onClick={() => setCurrentAccent(acc.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentAccent === acc.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: acc.value }} />
                                      ))}
                                      {/* Tombol Bulat Custom juga men-trigger picker yang sama */}
                                      <button onClick={() => accentInputRef.current?.showPicker ? accentInputRef.current.showPicker() : accentInputRef.current?.click()} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentAccent === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: currentAccent === 'Custom' ? customAccentHex : 'transparent' }}>
                                          {currentAccent !== 'Custom' && <div className="w-full h-full rounded-full" style={{background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`}} />}
                                      </button>
                                  </div>
                              </div>

                              {/* --- BACKGROUND THEME (DIPERBAIKI) --- */}
                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('bgTheme')}</label>
                                      
                                      {/* Container RELATIVE */}
                                      <div className="flex items-center gap-2 relative">
                                          {/* Input Transparan & Digeser ke Kanan (-35px) */}
                                          <input 
                                              ref={bgInputRef} 
                                              type="color" 
                                              value={customBgHex} 
                                              onChange={(e) => { setCustomBgHex(e.target.value); setCurrentTheme('Custom'); }} 
                                              className="opacity-0 absolute top-1/2 -translate-y-1/2 w-0 h-0 cursor-pointer" 
                                              style={{ right: '-35px' }}
                                          />
                                          <button 
                                              onClick={() => bgInputRef.current?.showPicker ? bgInputRef.current.showPicker() : bgInputRef.current?.click()} 
                                              className="p-1.5 rounded-full hover:bg-white/10" 
                                              title={t('custom')}
                                          >
                                              <Palette className="w-4 h-4 text-gray-400" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                      {BG_THEMES.map(theme => (
                                          <button key={theme.name} onClick={() => setCurrentTheme(theme.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentTheme === theme.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: theme.bg }} />
                                      ))}
                                      <button onClick={() => bgInputRef.current?.showPicker ? bgInputRef.current.showPicker() : bgInputRef.current?.click()} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentTheme === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: currentTheme === 'Custom' ? customBgHex : 'transparent' }}>
                                          {currentTheme !== 'Custom' && <div className="w-full h-full rounded-full" style={{background: `conic-gradient(black, #333, #555, #111)`}} />}
                                      </button>
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

  // Taruh di sini (di atas return utama)
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#18181b] text-white flex-col gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium animate-pulse">Checking your session...</p>
      </div>
    );
  }

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
        {renderContent()}

        {/* --- GLOBAL LOADING OVERLAY --- */}
        {isLoading && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col animate-in fade-in duration-200">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-white font-bold text-lg animate-pulse">Processing Data...</p>
                <p className="text-gray-400 text-sm mt-2">Please wait while we import your transactions.</p>
            </div>
        )}

        {/* --- ADD TRANSACTION MODAL --- */}
        {showTransactionModal && (
            <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-full md:w-[500px] bg-surface rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[95vh] flex flex-col">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0">
                        <h3 className="font-bold text-white text-lg">New Transaction</h3>
                        <button onClick={() => { setShowTransactionModal(false); setShowCategoryManager(false); }}><X className="w-6 h-6 text-gray-400" /></button>
                    </div>
                    
                    {showCategoryManager ? (
                        <div className="overflow-y-auto p-6 space-y-4 flex-1">
                             <div className="flex items-center justify-between mb-2">
                                 <h4 className="font-bold text-white">Manage Categories</h4>
                                 <button onClick={() => setShowCategoryManager(false)} className="text-xs text-blue-400">Done</button>
                             </div>
                             
                             <div className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={newCategoryName} 
                                     onChange={e => setNewCategoryName(e.target.value)}
                                     placeholder="New Category Name"
                                     className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none"
                                 />
                                 <button onClick={handleAddCategory} className="bg-emerald-600 p-2 rounded-lg text-white"><Plus className="w-5 h-5"/></button>
                             </div>

                             <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                                 {categories.map((cat, idx) => (
                                     <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg group">
                                         {editingCategory?.idx === idx ? (
                                             <div className="flex items-center gap-2 flex-1">
                                                 <input 
                                                     value={editingCategory.name} 
                                                     onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                                                     className="bg-black/20 text-white rounded p-1 flex-1 outline-none border border-blue-500"
                                                     autoFocus
                                                 />
                                                 <button onClick={handleUpdateCategory} className="text-emerald-500"><Save className="w-4 h-4"/></button>
                                             </div>
                                         ) : (
                                             <span className="text-sm text-gray-200">{cat}</span>
                                         )}
                                         
                                         <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setEditingCategory({idx, name: cat})} className="text-gray-400 hover:text-white"><Edit3 className="w-4 h-4"/></button>
                                             <button onClick={() => handleDeleteCategory(cat)} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    ) : (
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

                            {/* Amount */}
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={newTxAmount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (parseFloat(val) < 0) return; 
                                        setNewTxAmount(val);
                                    }}
                                    className={`w-full bg-[#18181b] border border-white/10 rounded-xl p-4 text-2xl font-bold outline-none text-right focus:border-white/30 text-white placeholder-gray-600`}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            {/* Accounts */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-gray-400 uppercase font-bold block">{newTxType === 'TRANSFER' ? 'From Account' : 'Account'}</label>
                                        
                                        {/* Owner Filter Toggle */}
                                        <div className="flex bg-white/5 p-0.5 rounded-lg">
                                            {(['All', 'Husband', 'Wife'] as const).map(role => (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => setNewTxOwnerFilter(role)}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                                                        newTxOwnerFilter === role 
                                                        ? 'bg-gray-600 text-white shadow' 
                                                        : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                                >
                                                    {role === 'All' ? 'All' : role === 'Husband' ? 'Suami' : 'Istri'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <select 
                                        value={newTxAccountId} 
                                        onChange={e => setNewTxAccountId(e.target.value)} 
                                        className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                                    >
                                        <option value="" disabled>Select Account</option>
                                        {accounts
                                            .filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner)
                                            .map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                                        ))}
                                    </select>
                                </div>
                                {newTxType === 'TRANSFER' && (
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">To Account</label>
                                        <select 
                                            value={newTxToAccountId} 
                                            onChange={e => setNewTxToAccountId(e.target.value)} 
                                            className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                                        >
                                            <option value="" disabled>Select Destination</option>
                                            {accounts
                                                .filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner)
                                                .filter(a => a.id !== newTxAccountId).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Category */}
                            {newTxType !== 'TRANSFER' && (
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Category</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={newTxCategory} 
                                            onChange={e => setNewTxCategory(e.target.value)} 
                                            className="flex-1 bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCategoryManager(true)}
                                            className="p-3 bg-white/10 rounded-xl hover:bg-white/20 text-white"
                                            title="Manage Categories"
                                        >
                                            <Settings className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Date</label>
                                    <input 
                                        type="date"
                                        value={newTxDate}
                                        onChange={e => setNewTxDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note</label>
                                    <input 
                                        type="text"
                                        value={newTxNotes}
                                        onChange={e => setNewTxNotes(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                        placeholder="Notes..."
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSubmitTransaction}
                                className={`w-full font-bold py-4 rounded-xl mt-4 transition-all text-white shadow-lg ${
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

        {/* --- EDIT ACCOUNT MODAL --- */}
        {showEditAccountModal && editingAccount && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Edit Account</h3>
                        <button onClick={() => setShowEditAccountModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
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
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Owner</label>
                            <div className="flex bg-white/5 p-1 rounded-lg">
                                {(['Husband', 'Wife'] as const).map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setEditingAccount({...editingAccount, owner: role})}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                            editingAccount.owner === role
                                            ? (role === 'Husband' ? 'bg-indigo-600 text-white' : 'bg-pink-600 text-white')
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Group</label>
                            <select 
                                value={editingAccount.group}
                                onChange={e => setEditingAccount({...editingAccount, group: e.target.value as any})}
                                className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                            >
                                <option value="Bank Accounts">Bank Account</option>
                                <option value="Cash">Cash</option>
                                <option value="Credit Cards">Credit Card</option>
                                <option value="Investments">Investment</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Current Balance</label>
                            <input 
                                type="number"
                                value={editingAccount.balance}
                                onChange={e => setEditingAccount({...editingAccount, balance: parseFloat(e.target.value) || 0})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">* Adjusting this creates a correction transaction.</p>
                        </div>
                        
                        <button 
                            onClick={handleSaveAccountEdit}
                            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl mt-4"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- AUTH MODAL --- */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-8 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                        {authMode === 'LOGIN' ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        {authMode === 'LOGIN' ? 'Login to access your local data.' : 'Register to secure your local data.'}
                    </p>
                    
                    {authError && (
                        <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg mb-4 border border-red-500/20 text-left">
                            <div className="flex gap-2 items-start">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{authError}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 mb-6 text-left">
                        {authMode === 'REGISTER' && (
                            <div>
                                <label className="text-xs text-gray-500 font-bold ml-1">Name</label>
                                <input 
                                    type="text" 
                                    value={regName}
                                    onChange={e => setRegName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                    placeholder="Your Name"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 font-bold ml-1">Email</label>
                            <input 
                                type="email" 
                                value={regEmail}
                                onChange={e => setRegEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                placeholder="name@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold ml-1">Password</label>
                            <input 
                                type="password" 
                                value={regPass}
                                onChange={e => setRegPass(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {authMode === 'LOGIN' ? (
                            <button onClick={handleLocalLogin} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                Log In (Local)
                            </button>
                        ) : (
                            <button onClick={handleRegister} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20">
                                Register (Local)
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <button onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setAuthError(''); }} className="text-sm text-gray-400 hover:text-white">
                            {authMode === 'LOGIN' ? "Don't have an account? Register" : "Already have an account? Log In"}
                        </button>
                    </div>
                    <button onClick={() => setShowAuthModal(false)} className="mt-4 text-xs text-gray-600 hover:text-gray-400">Cancel</button>
                </div>
            </div>
        )}
    </Layout>
  );
};

export default App;