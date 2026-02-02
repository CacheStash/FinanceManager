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

            <div className={`flex gap-4 mb-12 ${shake ? 'animate-shake' : ''}`}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < input.length ? (error ? 'bg-red-500 scale-110' : 'bg-emerald-500 scale-110') : 'bg-white/10'}`} />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handlePress(num.toString())} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center">
                        {num}
                    </button>
                ))}
                <div className="w-20 h-20"></div>
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

const DEFAULT_EXPENSE_CATEGORIES = ['Food & Drink', 'Groceries', 'Utilities', 'Transport', 'Shopping', 'Health', 'Education', 'Entertainment', 'Zakat & Charity', 'Other'];
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Bonus', 'Gift', 'Investment Return', 'Freelance', 'Other'];

// === KOMPONEN: CurrencyInput ===
interface CurrencyInputProps {
    value: string | number;
    onChange: (val: string) => void;
    currency: 'IDR' | 'USD';
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

// ==========================================
// 2. APP COMPONENT (MAIN LOGIC)
// ==========================================
const App = () => {
  // --- A. STATE DEFINITIONS (SEMUA STATE DISINI) ---
  const [activeTab, setActiveTab] = useState('trans');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Data State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nonProfitAccounts, setNonProfitAccounts] = useState<NonProfitAccount[]>([]);
  const [nonProfitTransactions, setNonProfitTransactions] = useState<NonProfitTransaction[]>([]);
  
  // Categories State
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);

  // Settings State
  const [lang, setLang] = useState<'en' | 'id'>('en');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [currentAccent, setCurrentAccent] = useState('Emerald');
  const [customAccentHex, setCustomAccentHex] = useState('#10b981');
  const [currentTheme, setCurrentTheme] = useState('Default');
  const [customBgHex, setCustomBgHex] = useState('#18181b');

  // App Lock State
  const [appPin, setAppPin] = useState<string>(''); 
  const [isLocked, setIsLocked] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  // Manage Mode (Delete Account)
  const [isManageMode, setIsManageMode] = useState(false);

  // Auth State
  const [user, setUser] = useState<{id?: string, name: string, email: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modals & UI State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccOwner, setNewAccOwner] = useState<AccountOwner>('Husband');
  const [newAccBalance, setNewAccBalance] = useState(''); 

  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [newTxType, setNewTxType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategory, setNewTxCategory] = useState('Food & Drink');
  const [newTxAccountId, setNewTxAccountId] = useState('');
  const [newTxToAccountId, setNewTxToAccountId] = useState('');
  const [newTxDate, setNewTxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTxNotes, setNewTxNotes] = useState('');
  const [newTxOwnerFilter, setNewTxOwnerFilter] = useState<'All' | AccountOwner>('All');

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{idx: number, name: string} | null>(null);

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);
  const [showAssetAnalytics, setShowAssetAnalytics] = useState(false);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>({ type: 'GLOBAL' });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accentInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);


  // --- B. USE EFFECTS (URUTAN PENTING) ---

  // 1. Auto Switch Category saat Tipe Transaksi Berubah
  // (Diletakkan SETELAH newTxType didefinisikan)
  useEffect(() => {
      const currentList = newTxType === 'INCOME' ? incomeCategories : expenseCategories;
      if (currentList.length > 0) {
          setNewTxCategory(currentList[0]);
      }
  }, [newTxType, incomeCategories, expenseCategories]);

  // 2. Load Settings from Supabase Helper
  const loadSettingsFromSupabase = async (userId: string) => {
    const { data } = await supabase
      .from('user_settings') 
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
        if (data.language) setLang(data.language as 'en' | 'id');
        if (data.app_pin) {
            setAppPin(data.app_pin);
            setIsLocked(true); 
        }
        if (data.accent_color) {
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
            try {
                const themeObj = JSON.parse(data.bg_theme);
                if(themeObj.name) setCurrentTheme(themeObj.name);
                if(themeObj.customBg) setCustomBgHex(themeObj.customBg);
            } catch (e) { console.log("Old theme format"); }
        }
    }
  };

  // 3. Main Data Loader
  const loadDataFromSupabase = async (userId: string, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
        const [accRes, txRes, settingsRes] = await Promise.all([
            supabase.from('accounts').select('*').eq('user_id', userId),
            supabase.from('transactions').select('*').eq('user_id', userId),
            loadSettingsFromSupabase(userId)
        ]);

        const accData = accRes.data;
        const txData = txRes.data;

        if (accData && accData.length > 0) setAccounts(accData); 
        if (txData && txData.length > 0) {
            const mappedTx = txData.map(t => ({
                ...t, accountId: t.account_id, toAccountId: t.to_account_id, notes: t.note
            }));
            setTransactions(mappedTx);
        }
    } catch (err) {
        console.error("Critical Load Error:", err);
    } finally {
        setIsDataLoaded(true);
        if (!isSilent) setIsLoading(false);
    }
  };

  // 4. Auth Check & Initial Load
  useEffect(() => {
    const checkUser = async () => {
      try {
          const sessionPromise = supabase.auth.getSession();
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.display_name || 'User',
            email: session.user.email || ''
          });
          await loadDataFromSupabase(session.user.id, true);
        } else {
          setUser(null);
        }
        setIsAuthLoading(false); 
    });
    return () => subscription.unsubscribe();
  }, []);

  // 5. Auto Save Settings
  useEffect(() => {
    if (!user || !user.id || !isDataLoaded) return;
    const timer = setTimeout(async () => {
        let colorToSave = customAccentHex;
        const preset = ACCENT_PRESETS.find(p => p.name === currentAccent);
        if (preset) colorToSave = preset.value;

        const themeData = { name: currentTheme, customBg: customBgHex };
        await supabase.from('user_settings').upsert({
              user_id: user.id,
              language: lang,
              accent_color: colorToSave,
              bg_theme: JSON.stringify(themeData),
              app_pin: appPin,
              updated_at: new Date().toISOString()
          });
    }, 2000); 
    return () => clearTimeout(timer); 
  }, [currentAccent, customAccentHex, currentTheme, customBgHex, lang, user, isDataLoaded, appPin]);

  // 6. Apply Theme
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

  // 7. Load Local Data (Backup)
  useEffect(() => {
    const saved = localStorage.getItem('financeProData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAccounts(data.accounts || []);
        setTransactions(data.transactions || []);
        setNonProfitAccounts(data.nonProfitAccounts || []);
        setNonProfitTransactions(data.nonProfitTransactions || []);
        
        // Load Categories (Fixed)
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        else if (data.categories) setExpenseCategories(data.categories);
        if (data.incomeCategories) setIncomeCategories(data.incomeCategories);
        
        setLang(data.lang || 'en');
        if (data.currency) setCurrency(data.currency);
        if(data.theme) {
            setCurrentAccent(data.theme.accent || 'Emerald');
            setCustomAccentHex(data.theme.customAccent || '#10b981');
            setCurrentTheme(data.theme.bg || 'Default');
            setCustomBgHex(data.theme.customBg || '#18181b');
        }
      } catch (e) { console.error("Failed to load data", e); }
    } 
    setIsDataLoaded(true);
  }, []);

  // 8. Save Local Data
  useEffect(() => {
     if (!isDataLoaded) return; 
     localStorage.setItem('financeProData', JSON.stringify({
         accounts, transactions, nonProfitAccounts, nonProfitTransactions, 
         expenseCategories, incomeCategories, 
         lang, currency,
         theme: { accent: currentAccent, customAccent: customAccentHex, bg: currentTheme, customBg: customBgHex }
     }));
  }, [accounts, transactions, nonProfitAccounts, nonProfitTransactions, expenseCategories, incomeCategories, lang, user, currentAccent, customAccentHex, currentTheme, customBgHex, isDataLoaded]);


  // --- C. HANDLERS ---

  const handleLocalLogin = async () => {
    setAuthError('');
    if (!regEmail || !regPass) { setAuthError('Email and password required.'); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email: regEmail, password: regPass });
    if (error) { setAuthError(error.message); return; }
    if (data.user) {
        setUser({ id: data.user.id, name: data.user.user_metadata?.display_name || 'User', email: data.user.email || '' });
        setShowAuthModal(false); setRegEmail(''); setRegPass(''); setAuthError('');
    }
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPass) { setAuthError('All fields required.'); return; }
    setAuthError('');
    const { data, error } = await supabase.auth.signUp({
        email: regEmail, password: regPass, options: { data: { display_name: regName } }
    });
    if (error) { setAuthError(error.message); return; }
    if (data.user) {
        alert("Registration successful! Check email for verification.");
        setRegEmail(''); setRegPass(''); setRegName(''); setShowAuthModal(false); setAuthError('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setAppPin(''); setIsLocked(false);
  };

  const handleCreatePin = () => {
      if (newPinInput.length === 6) {
          setAppPin(newPinInput); setShowPinSetup(false); setNewPinInput('');
          alert("App Lock Enabled!");
      } else alert("PIN must be 6 digits.");
  };

  const handleDisablePin = () => {
      if (confirm("Disable App Lock?")) { setAppPin(''); setIsLocked(false); }
  };

  const handleForgotPin = () => {
      if (confirm("Forgot PIN? You must Logout to reset.")) { handleLogout(); }
  };

  // --- IMPORT FILE HANDLER (FIXED) ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
        setTimeout(async () => {
          try {
              const rawData = JSON.parse(evt.target?.result as string);
              let importedAccounts: Account[] = [];
              let importedTransactions: Transaction[] = [];
              
              if (rawData.accounts && Array.isArray(rawData.accounts)) {
                  importedAccounts = rawData.accounts;
                  importedTransactions = rawData.transactions || [];
                  setAccounts(importedAccounts);
                  if(rawData.transactions) setTransactions(importedTransactions);
                  if(rawData.nonProfitAccounts) setNonProfitAccounts(rawData.nonProfitAccounts);
                  if(rawData.nonProfitTransactions) setNonProfitTransactions(rawData.nonProfitTransactions);
                  if(rawData.expenseCategories) setExpenseCategories(rawData.expenseCategories);
                  if(rawData.incomeCategories) setIncomeCategories(rawData.incomeCategories);
                  if(rawData.categories) setExpenseCategories(rawData.categories); 
                  alert("Data Restored!");
              } else {
                  throw new Error("Unknown JSON Format");
              }
              setActiveTab('trans');
          } catch (err) { alert("File Error"); } finally { setIsLoading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
        }, 500);
    };
    reader.readAsText(file);
  };

  const openEditAccountModal = (acc: Account) => {
      setEditingAccount({...acc}); setShowEditAccountModal(true);
  };

  const handleSaveAccountEdit = async () => {
    if (!editingAccount) return;
    const allowedNegativeGroups = ['Credit Cards', 'Loans'];
    if (editingAccount.balance < 0 && !allowedNegativeGroups.includes(editingAccount.group)) {
        alert("Error: Balance cannot be negative."); return;
    }

    try {
        const oldAccount = accounts.find(a => a.id === editingAccount.id);
        if (!oldAccount) return;
        const diff = editingAccount.balance - oldAccount.balance;
        let adjustmentTx: Transaction | null = null;

        if (diff !== 0) {
            const isSurplus = diff > 0;
            adjustmentTx = {
                id: `adj-${Date.now()}`, date: new Date().toISOString(),
                type: isSurplus ? 'INCOME' : 'EXPENSE', amount: Math.abs(diff),
                accountId: editingAccount.id, category: 'Adjustment', 
                notes: `Balance Correction (${isSurplus ? 'Surplus' : 'Deficit'})`
            };
        }

        if (user && user.id) {
            await supabase.from('accounts').update({
                  name: editingAccount.name, owner: editingAccount.owner, "group": editingAccount.group, balance: editingAccount.balance
              }).eq('id', editingAccount.id).eq('user_id', user.id);
            if (adjustmentTx) await supabase.from('transactions').insert([{
                   user_id: user.id, amount: adjustmentTx.amount, type: adjustmentTx.type,
                   category: adjustmentTx.category, note: adjustmentTx.notes, date: adjustmentTx.date, account_id: adjustmentTx.accountId
               }]);
        }

        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? editingAccount : a));
        if (adjustmentTx) setTransactions(prev => [adjustmentTx!, ...prev]);
        if (selectedAccountForDetail?.id === editingAccount.id) setSelectedAccountForDetail(editingAccount);

        setShowEditAccountModal(false); setEditingAccount(null);
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleDeleteAccount = async (accountId: string) => {
      if(!confirm("Delete account and its transactions?")) return;
      if(user?.id) {
          await supabase.from('accounts').delete().eq('id', accountId);
          await supabase.from('transactions').delete().eq('account_id', accountId);
          await supabase.from('transactions').delete().eq('to_account_id', accountId); 
      }
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setTransactions(prev => prev.filter(t => t.accountId !== accountId && t.toAccountId !== accountId));
  };

  const handleDeleteTransaction = async (txId: string) => {
    if(!confirm("Delete transaction?")) return;
    if (user && user.id) {
        await supabase.from('transactions').delete().eq('id', txId).eq('user_id', user.id);
    }
    const txToDelete = transactions.find(t => t.id === txId);
    if (txToDelete) {
        setAccounts(prev => prev.map(acc => {
            if (acc.id === txToDelete.accountId) {
                let newBalance = acc.balance;
                if (txToDelete.type === 'EXPENSE') newBalance += txToDelete.amount; 
                if (txToDelete.type === 'INCOME') newBalance -= txToDelete.amount; 
                return { ...acc, balance: newBalance };
            }
            return acc;
        }));
    }
    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  const handleTabChange = (tab: string) => {
      setActiveTab(tab); setSelectedAccountForDetail(null); setShowAssetAnalytics(false);
  };
  
  const onAddPress = () => {
      setNewTxDate(format(new Date(), 'yyyy-MM-dd')); 
      if (selectedAccountForDetail) {
          setNewTxAccountId(selectedAccountForDetail.id);
          setNewTxOwnerFilter(selectedAccountForDetail.owner);
      } else {
          setNewTxAccountId(''); setNewTxOwnerFilter('All');
      }
      setShowTransactionModal(true);
  };

  const handleAddCategory = () => {
      const targetSet = newTxType === 'INCOME' ? setIncomeCategories : setExpenseCategories;
      const currentList = newTxType === 'INCOME' ? incomeCategories : expenseCategories;
      if (newCategoryName.trim() && !currentList.includes(newCategoryName.trim())) {
          targetSet(prev => [...prev, newCategoryName.trim()]); setNewCategoryName('');
      }
  };

  const handleUpdateCategory = () => {
      const targetSet = newTxType === 'INCOME' ? setIncomeCategories : setExpenseCategories;
      const currentList = newTxType === 'INCOME' ? incomeCategories : expenseCategories;
      if (editingCategory && editingCategory.name.trim()) {
          const newName = editingCategory.name.trim();
          if (!currentList.includes(newName)) {
             targetSet(prev => {
                 const copy = [...prev]; copy[editingCategory.idx] = newName; return copy;
             });
          }
          setEditingCategory(null);
      }
  };

  const handleDeleteCategory = (category: string) => {
      const targetSet = newTxType === 'INCOME' ? setIncomeCategories : setExpenseCategories;
      if (confirm(`Delete category "${category}"?`)) targetSet(prev => prev.filter(c => c !== category));
  };

  const handleSubmitTransaction = async () => {
    const amountVal = parseFloat(newTxAmount);
    if (!amountVal || amountVal <= 0) return alert("Invalid amount");
    if (!newTxAccountId) return alert("Select account");
    if (newTxType === 'TRANSFER' && !newTxToAccountId) return alert("Select destination");

    const nowISO = new Date().toISOString();
    const newTx: Transaction = {
        id: `tx-${Date.now()}`, date: nowISO, type: newTxType, amount: amountVal,
        accountId: newTxAccountId, toAccountId: newTxType === 'TRANSFER' ? newTxToAccountId : undefined,
        category: newTxType === 'TRANSFER' ? 'Transfer' : newTxCategory, notes: newTxNotes
    };

    setTransactions(prev => [newTx, ...prev]);
    setAccounts(prev => prev.map(acc => {
        let balance = acc.balance;
        if (acc.id === newTxAccountId) {
            if (newTxType === 'INCOME') balance += amountVal; else balance -= amountVal; 
        }
        if (newTxType === 'TRANSFER' && acc.id === newTxToAccountId) balance += amountVal;
        return { ...acc, balance };
    }));

    setShowTransactionModal(false); setNewTxAmount(''); setNewTxNotes('');

    if (user?.id) {
        await supabase.from('transactions').insert([{
            user_id: user.id, amount: amountVal, type: newTxType, category: newTx.category,
            note: newTxNotes, date: nowISO, account_id: newTxAccountId, to_account_id: newTx.toAccountId
        }]);
    }
  };

  const handleOpenAddAccountModal = () => {
    setNewAccName(''); setNewAccOwner('Husband'); setNewAccBalance(''); setShowAddAccountModal(true);
  };

  const handleSubmitNewAccount = async () => {
    if (!newAccName.trim()) return alert("Name required");
    const initialBalance = parseFloat(newAccBalance) || 0;
    const newAcc: Account = {
        id: `acc_${Date.now()}`, name: newAccName, group: 'Bank Accounts',
        balance: initialBalance, currency: 'IDR', includeInTotals: true, owner: newAccOwner
    };

    if (user && user.id) {
         const { error } = await supabase.from('accounts').insert([{
             id: newAcc.id, user_id: user.id, name: newAcc.name, "group": newAcc.group,
             balance: newAcc.balance, currency: newAcc.currency, owner: newAcc.owner
         }]);
         if (error) return alert("Save failed: " + error.message);
    }
    setAccounts(prev => [...prev, newAcc]); setShowAddAccountModal(false);
  };

  const handleClearHajjHistory = () => {
      if (confirm('Clear Hajj/Umrah history?')) setNonProfitTransactions([]);
  };

  // --- FUNGSI TAMBAH AKUN HAJI (UPDATED) ---
  const handleAddNonProfitAccount = (name: string, owner: AccountOwner, target: number, initialBalance: number) => {
      const newAcc: NonProfitAccount = {
          id: `np_${Date.now()}`,
          name: name,
          owner: owner,
          balance: initialBalance, // Set saldo awal
          target: target
      };
      setNonProfitAccounts(prev => [...prev, newAcc]);

      // OTOMATIS buat riwayat transaksi jika ada saldo awal
      if (initialBalance > 0) {
          const initTx: NonProfitTransaction = {
              id: `init_${Date.now()}`,
              date: new Date().toISOString(),
              amount: initialBalance,
              accountId: newAcc.id,
              notes: 'Saldo Awal'
          };
          setNonProfitTransactions(prev => [...prev, initTx]);
      }
  };

  // --- FUNGSI HAPUS AKUN HAJI (BARU) ---
  const handleDeleteNonProfitAccount = (id: string) => {
      if (confirm(lang === 'en' ? 'Delete this fund and its history?' : 'Hapus tabungan ini beserta riwayatnya?')) {
          setNonProfitAccounts(prev => prev.filter(acc => acc.id !== id));
          setNonProfitTransactions(prev => prev.filter(tx => tx.accountId !== id));
      }
  };

  const t = (key: string) => {
    const dict: any = {
        'settings': lang === 'en' ? 'Settings' : 'Pengaturan',
        'language': lang === 'en' ? 'Language' : 'Bahasa',
        'accentColor': lang === 'en' ? 'Accent Color' : 'Warna Aksen',
        'custom': lang === 'en' ? 'Custom' : 'Kustom',
        'bgTheme': lang === 'en' ? 'Background Theme' : 'Tema Latar',
        'dataMgmt': lang === 'en' ? 'Data Management' : 'Manajemen Data',
        'resetData': lang === 'en' ? 'Reset Data' : 'Reset Data',
        'confirmReset': lang === 'en' ? 'Are you sure?' : 'Anda yakin?',
    };
    return dict[key] || key;
  };

  // --- RENDERERS ---

  const renderAccountsTab = () => {
      const husbandAccounts = accounts.filter(a => a.owner === 'Husband');
      const wifeAccounts = accounts.filter(a => a.owner === 'Wife');
      const otherAccounts = accounts.filter(a => !a.owner);
      const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
      const husbandTotal = husbandAccounts.reduce((s, a) => s + a.balance, 0);
      const wifeTotal = wifeAccounts.reduce((s, a) => s + a.balance, 0);
      const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

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
                                <span className={`text-xs font-bold ${groupTotal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(groupTotal)}</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {groupAccs.map(acc => (
                                    <AccountCard key={acc.id} account={acc} onEdit={(a) => setSelectedAccountForDetail(a)} listView={true} isDeleteMode={isManageMode} onDelete={() => handleDeleteAccount(acc.id)} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                {accList.filter(a => !groups.includes(a.group)).length > 0 && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div className="px-4 py-2 bg-white/5 text-xs font-bold text-gray-300 uppercase tracking-wider">Other</div>
                        <div className="divide-y divide-white/5">
                            {accList.filter(a => !groups.includes(a.group)).map(acc => (
                                <AccountCard key={acc.id} account={acc} onEdit={(a) => setSelectedAccountForDetail(a)} listView={true} isDeleteMode={isManageMode} onDelete={() => handleDeleteAccount(acc.id)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
          );
      };

      return (
          <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div onClick={() => { setAnalyticsScope({ type: 'GLOBAL' }); setShowAssetAnalytics(true); }} className="relative p-4 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform border border-white/10 bg-surface group">
                      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                      <div className="relative z-10">
                          <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-primary)' }}>Total Assets</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</p>
                          <div className="flex items-center gap-1 mt-2 text-white/60 text-xs"><TrendingUp className="w-3 h-3" /><span>View Growth</span></div>
                      </div>
                  </div>
                  <div onClick={() => { setAnalyticsScope({ type: 'OWNER', owner: 'Husband' }); setShowAssetAnalytics(true); }} className="bg-surface p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors group">
                      <div className="flex justify-between items-start mb-2"><p className="text-gray-400 text-xs font-bold uppercase">Husband</p><UserCircle2 className="w-4 h-4 text-indigo-400" /></div>
                      <p className="text-xl font-bold text-indigo-400">{formatCurrency(husbandTotal)}</p>
                  </div>
                  <div onClick={() => { setAnalyticsScope({ type: 'OWNER', owner: 'Wife' }); setShowAssetAnalytics(true); }} className="bg-surface p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors group">
                      <div className="flex justify-between items-start mb-2"><p className="text-gray-400 text-xs font-bold uppercase">Wife</p><UserCircle2 className="w-4 h-4 text-pink-400" /></div>
                      <p className="text-xl font-bold text-pink-400">{formatCurrency(wifeTotal)}</p>
                  </div>
              </div>

              <div className="flex gap-3">
                  <button onClick={handleOpenAddAccountModal} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95"><Plus className="w-5 h-5" /> Add Account</button>
                  <button onClick={() => setIsManageMode(!isManageMode)} className={`px-4 py-3 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 ${isManageMode ? 'bg-rose-600 text-white' : 'bg-white/10 text-gray-300'}`}>
                      {isManageMode ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />} {isManageMode ? 'Done' : 'Manage'}
                  </button>
              </div>

              <div className="space-y-8">
                  {husbandAccounts.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pl-1">Husband's Accounts</h3>{renderGroupedList(husbandAccounts)}</div>}
                  {wifeAccounts.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider pl-1">Wife's Accounts</h3>{renderGroupedList(wifeAccounts)}</div>}
                  {otherAccounts.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider pl-1">Joint / Other</h3>{renderGroupedList(otherAccounts)}</div>}
              </div>
          </div>
      );
  };

  const renderContent = () => {
      if (showAssetAnalytics) return <AssetAnalytics transactions={transactions} accounts={accounts} onBack={() => setShowAssetAnalytics(false)} scope={analyticsScope} />;
      if (selectedAccountForDetail) return <AccountDetail account={selectedAccountForDetail} transactions={transactions} onBack={() => setSelectedAccountForDetail(null)} onEdit={(acc) => openEditAccountModal(acc)} onViewStats={(acc) => { setAnalyticsScope({ type: 'ACCOUNT', accountId: acc.id }); setShowAssetAnalytics(true); }} />;

      switch (activeTab) {
          case 'trans': return <TransactionHistory transactions={transactions} accounts={accounts} lang={lang} onSelectAccount={(acc) => setSelectedAccountForDetail(acc)} />;
          case 'stats': return <div className="h-full overflow-y-auto pb-24"><Reports transactions={transactions} accounts={accounts} lang={lang} /></div>;
          case 'accounts': return renderAccountsTab();
          case 'non-profit': 
            return <NonProfit 
                accounts={nonProfitAccounts} 
                transactions={nonProfitTransactions} 
                mainAccounts={accounts} 
                onClearHistory={handleClearHajjHistory}
                lang={lang} 
                currency={currency} // <--- PASTIKAN INI ADA
                onAddAccount={handleAddNonProfitAccount}
                onDeleteAccount={handleDeleteNonProfitAccount}
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
          case 'more': return (
              <div className="p-4 space-y-4 overflow-y-auto h-full pb-24">
                  {user && <div className="bg-surface p-4 rounded-xl border border-white/10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div><div><p className="font-bold text-white">{user.name}</p><p className="text-xs text-gray-400">{user.email}</p></div></div><button onClick={handleLogout} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">Log Out</button></div>}
                  <div className="bg-surface p-4 rounded-xl border border-white/10"><h3 className="font-bold text-lg mb-4 text-white">{t('settings')}</h3><div className="space-y-4"><button onClick={() => setLang(lang === 'en' ? 'id' : 'en')} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700"><span>{t('language')}</span><span className="text-primary font-bold">{lang.toUpperCase()}</span></button><div className="flex items-center justify-between p-3 bg-surface-light rounded-lg"><span className="text-sm font-medium text-gray-300">Currency</span><div className="flex bg-black/20 p-1 rounded-lg"><button onClick={() => setCurrency('IDR')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'IDR' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>IDR</button><button onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>USD</button></div></div><div className="mt-4 bg-surface-light p-3 rounded-lg flex items-center justify-between border border-white/5"><div><p className="text-sm font-medium text-gray-300 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${appPin ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>App Lock</p><p className="text-[10px] text-gray-500 mt-0.5">{appPin ? 'Active' : 'Disabled'}</p></div>{appPin ? <button onClick={handleDisablePin} className="text-xs font-bold text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">Disable</button> : <button onClick={() => setShowPinSetup(true)} className="text-xs font-bold text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg hover:bg-emerald-400/10">Enable</button>}</div><div className="p-3 bg-surface-light rounded-lg"><div className="flex justify-between items-center mb-3"><label className="text-xs text-gray-400 uppercase font-semibold">{t('accentColor')}</label><button onClick={() => accentInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-white/10"><Pipette className="w-4 h-4 text-gray-400" /></button></div><div className="flex gap-2 flex-wrap items-center">{ACCENT_PRESETS.map(acc => (<button key={acc.name} onClick={() => setCurrentAccent(acc.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentAccent === acc.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: acc.value }} />))}<div className="relative"><input ref={accentInputRef} type="color" value={customAccentHex} onChange={(e) => { setCustomAccentHex(e.target.value); setCurrentAccent('Custom'); }} className="opacity-0 absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 ml-2" /><button onClick={() => accentInputRef.current?.click()} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentAccent === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: currentAccent === 'Custom' ? customAccentHex : 'transparent' }} /></div></div></div></div></div>
                  <div className="bg-surface p-4 rounded-xl border border-white/10"><h3 className="font-bold text-lg mb-4 text-white">{t('dataMgmt')}</h3><div className="space-y-2"><button onClick={() => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({accounts, transactions, nonProfitAccounts, nonProfitTransactions, expenseCategories, incomeCategories})); const node = document.createElement('a'); node.setAttribute("href", dataStr); node.setAttribute("download", "finance_backup.json"); document.body.appendChild(node); node.click(); node.remove(); }} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700 group"><div className="flex items-center"><FileJson className="w-5 h-5 text-yellow-500 mr-3" /><div className="text-left"><div className="font-medium">Export JSON</div><div className="text-xs text-gray-500">Backup</div></div></div><Download className="w-4 h-4 text-gray-500 group-hover:text-white" /></button><input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" /><button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700 group"><div className="flex items-center"><Upload className="w-5 h-5 text-blue-500 mr-3" /><div className="text-left"><div className="font-medium">Import Data</div><div className="text-xs text-gray-500">Restore</div></div></div><ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white" /></button><button onClick={() => { if(window.confirm(t('confirmReset'))) { setAccounts([]); setTransactions([]); setNonProfitAccounts([]); setNonProfitTransactions([]); setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES); setIncomeCategories(DEFAULT_INCOME_CATEGORIES); localStorage.removeItem('financeProData'); window.location.reload(); } }} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-red-900/20 group"><div className="flex items-center text-red-500"><Trash2 className="w-5 h-5 mr-3" /><span className="font-medium">{t('resetData')}</span></div></button></div></div>
              </div>
          );
          default: return null;
      }
  };

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#18181b] text-white flex-col gap-4"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-400 font-medium animate-pulse">Checking session...</p></div>;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange} onAddPress={onAddPress} user={user} onAuthRequest={() => { setShowAuthModal(true); setAuthMode('LOGIN'); }} onLogout={handleLogout} lang={lang} setLang={setLang}>
        {isLocked && appPin && <LockScreen correctPin={appPin} onUnlock={() => setIsLocked(false)} onForgot={handleForgotPin} />}
        {renderContent()}

        {showAddAccountModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-white">Add Account</h3><button onClick={() => setShowAddAccountModal(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
                    <div className="space-y-4">
                        <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Name</label><input type="text" value={newAccName} onChange={e => setNewAccName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary" placeholder="BCA Main" autoFocus /></div>
                        <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Owner</label><div className="flex bg-white/5 p-1 rounded-lg"><button onClick={() => setNewAccOwner('Husband')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === 'Husband' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Husband</button><button onClick={() => setNewAccOwner('Wife')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === 'Wife' ? 'bg-pink-600 text-white' : 'text-gray-400'}`}>Wife</button></div></div>
                        <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Initial Balance</label><CurrencyInput value={newAccBalance} onChange={val => setNewAccBalance(val)} currency={currency} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right" placeholder="0" /></div>
                        <button onClick={handleSubmitNewAccount} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg mt-2">Create Account</button>
                    </div>
                </div>
            </div>
        )}

        {showEditAccountModal && editingAccount && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Edit Account</h3></div>
                    <div className="space-y-4">
                        <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Account Name</label><input type="text" value={editingAccount.name} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"/></div>
                        <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Current Balance</label><CurrencyInput value={editingAccount.balance} onChange={val => setEditingAccount({...editingAccount, balance: parseFloat(val) || 0})} currency={currency} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right"/><p className="text-[10px] text-gray-500 mt-1">* Creates adjustment transaction.</p></div>
                        <button onClick={handleSaveAccountEdit} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {showTransactionModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-surface rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0"><h3 className="font-bold text-white text-lg">{showCategoryManager ? 'Manage Categories' : 'New Transaction'}</h3><button onClick={() => { setShowTransactionModal(false); setShowCategoryManager(false); }}><X className="w-6 h-6 text-gray-400" /></button></div>
                    {(() => {
                        const activeCategories = newTxType === 'INCOME' ? incomeCategories : expenseCategories;
                        return showCategoryManager ? (
                            <div className="overflow-y-auto p-6 space-y-4 flex-1">
                                <div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-400">Manage <span className={newTxType === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>{newTxType}</span> Categories</p><button onClick={() => setShowCategoryManager(false)} className="text-xs font-bold text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full">Done</button></div>
                                <div className="flex gap-2"><input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder={`New ${newTxType === 'INCOME' ? 'Income' : 'Expense'} Category...`} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500" onKeyDown={(e) => { if(e.key === 'Enter') handleAddCategory(); }} /><button onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-700 px-4 rounded-xl text-white shadow-lg"><Plus className="w-5 h-5"/></button></div>
                                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">{activeCategories.map((cat, idx) => (<div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/20 transition-colors">{editingCategory?.idx === idx ? (<div className="flex items-center gap-2 flex-1"><input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="bg-black/40 text-white rounded-lg p-2 flex-1 outline-none border border-blue-500 text-sm" autoFocus /><button onClick={handleUpdateCategory} className="p-2 bg-blue-600 rounded-lg text-white"><Save className="w-4 h-4"/></button></div>) : (<span className="text-sm text-gray-200 font-medium pl-1">{cat}</span>)}{editingCategory?.idx !== idx && (<div className="flex gap-1"><button onClick={() => setEditingCategory({idx, name: cat})} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><Edit3 className="w-4 h-4"/></button><button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button></div>)}</div>))}</div>
                            </div>
                        ) : (
                            <div className="overflow-y-auto p-6 space-y-5">
                                <div className="flex bg-white/5 p-1 rounded-xl"><button onClick={() => setNewTxType('EXPENSE')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'EXPENSE' ? 'bg-rose-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}><ArrowUpRight className="w-4 h-4"/> Expense</button><button onClick={() => setNewTxType('INCOME')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'INCOME' ? 'bg-emerald-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}><ArrowDownRight className="w-4 h-4"/> Income</button><button onClick={() => setNewTxType('TRANSFER')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${newTxType === 'TRANSFER' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}><ArrowRightLeft className="w-4 h-4"/> Transfer</button></div>
                                <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label><CurrencyInput value={newTxAmount} onChange={val => setNewTxAmount(val)} currency={currency} className="bg-[#18181b] border border-white/10 rounded-xl p-4 text-2xl font-bold outline-none text-right focus:border-white/30 text-white placeholder-gray-600" placeholder="0" autoFocus /></div>
                                <div className="grid grid-cols-1 gap-4"><div><div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-400 uppercase font-bold block">{newTxType === 'TRANSFER' ? 'From Account' : 'Account'}</label><div className="flex bg-white/5 p-0.5 rounded-lg">{(['All', 'Husband', 'Wife'] as const).map(role => (<button key={role} onClick={() => setNewTxOwnerFilter(role)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${newTxOwnerFilter === role ? 'bg-gray-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{role === 'All' ? 'All' : role === 'Husband' ? 'Suami' : 'Istri'}</button>))}</div></div><select value={newTxAccountId} onChange={e => setNewTxAccountId(e.target.value)} className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"><option value="" disabled>Select Account</option>{accounts.filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>))}</select></div>{newTxType === 'TRANSFER' && (<div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">To Account</label><select value={newTxToAccountId} onChange={e => setNewTxToAccountId(e.target.value)} className="w-full bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary"><option value="" disabled>Select Destination</option>{accounts.filter(a => newTxOwnerFilter === 'All' || a.owner === newTxOwnerFilter || !a.owner).filter(a => a.id !== newTxAccountId).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>))}</select></div>)}</div>
                                {newTxType !== 'TRANSFER' && (<div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Category</label><div className="flex gap-2"><select value={newTxCategory} onChange={e => setNewTxCategory(e.target.value)} className="flex-1 bg-surface-light text-white p-3 rounded-xl border border-white/10 outline-none focus:border-primary">{activeCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select><button onClick={() => setShowCategoryManager(true)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 text-white transition-colors border border-white/5"><Settings className="w-5 h-5"/></button></div></div>)}
                                <div><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note</label><input type="text" value={newTxNotes} onChange={e => setNewTxNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary" placeholder="Description (Optional)..." /><p className="text-[10px] text-gray-500 mt-1 ml-1">* Date set to now automatically.</p></div>
                                <button onClick={handleSubmitTransaction} className={`w-full font-bold py-3.5 rounded-xl mt-4 transition-all text-white shadow-lg ${newTxType === 'EXPENSE' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' : newTxType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'}`}>Save Transaction</button>
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}

        {showPinSetup && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-white">Create App PIN</h3><button onClick={() => setShowPinSetup(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
                    <div className="flex justify-center mb-6"><input type="text" inputMode="numeric" maxLength={6} value={newPinInput} onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))} className="bg-black/50 border border-emerald-500/50 text-white text-3xl font-bold tracking-[0.5em] text-center w-full py-4 rounded-xl outline-none focus:border-emerald-500" placeholder="••••••" autoFocus /></div>
                    <button onClick={handleCreatePin} disabled={newPinInput.length !== 6} className="w-full py-3 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all">Save PIN</button>
                </div>
            </div>
        )}

        {showAuthModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">{authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h3><button onClick={() => setShowAuthModal(false)}><X className="w-6 h-6 text-gray-400" /></button></div>
                    {authError && <div className="p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{authError}</div>}
                    <div className="space-y-4">
                        {authMode === 'REGISTER' && (<div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"><UserCircle2 className="text-gray-400 w-5 h-5" /><input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" /></div>)}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"><UserCircle2 className="text-gray-400 w-5 h-5" /><input type="email" placeholder="Email Address" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" /></div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"><div onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">{showPassword ? <EyeOff className="text-gray-400 w-5 h-5"/> : <Eye className="text-gray-400 w-5 h-5"/>}</div><input type={showPassword ? "text" : "password"} placeholder="Password" value={regPass} onChange={e => setRegPass(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" /></div>
                        {authMode === 'LOGIN' ? (<button onClick={handleLocalLogin} disabled={isLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">{isLoading ? <Loader2 className="animate-spin"/> : <LogIn className="w-4 h-4"/>} Login</button>) : (<button onClick={handleRegister} disabled={isLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">{isLoading ? <Loader2 className="animate-spin"/> : <UserPlus className="w-4 h-4"/>} Register</button>)}
                    </div>
                    <div className="mt-6 text-center"><p className="text-xs text-gray-400">{authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setAuthError(''); }} className="ml-1 text-emerald-400 font-bold hover:underline">{authMode === 'LOGIN' ? 'Sign Up' : 'Log In'}</button></p></div>
                </div>
            </div>
        )}
    </Layout>
  );
};

export default App;