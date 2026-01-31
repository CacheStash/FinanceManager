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
import { Pipette, Palette, User, FileSpreadsheet, FileJson, Upload, ChevronRight, Download, Trash2, Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Settings, Edit3, Save, LogIn, CheckCircle, UserPlus, TrendingUp, UserCircle2, Layers, Loader2, AlertTriangle } from 'lucide-react';
import { subYears, addDays, getDate, getMonth, isSaturday, isSunday, format } from 'date-fns';
import { auth, googleProvider } from './services/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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

const DEFAULT_CATEGORIES = ['Food & Drink', 'Groceries', 'Utilities', 'Salary', 'Investment', 'Entertainment', 'Transport', 'Shopping', 'Health', 'Education', 'Other'];

const App = () => {
  const [activeTab, setActiveTab] = useState('trans');
  const [isLoading, setIsLoading] = useState(false); // Global Loading State
  const [isDataLoaded, setIsDataLoaded] = useState(false); // CRITICAL: Prevent saving empty data before load

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

  // Auth State
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
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
  // New: Owner Filter for Transaction Modal
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
        
        // Handle User Session from LocalStorage (Fallback if Firebase not used)
        if(data.user) setUser(data.user);

        if(data.theme) {
            setCurrentAccent(data.theme.accent || 'Emerald');
            setCustomAccentHex(data.theme.customAccent || '#10b981');
            setCurrentTheme(data.theme.bg || 'Default');
            setCustomBgHex(data.theme.customBg || '#18181b');
        }
      } catch (e) { console.error("Failed to load data", e); }
    } else {
        // Initial Dummy Data (Only if LocalStorage is empty)
        const accs: Account[] = [
             { id: 'acc_bca_h', name: 'BCA Utama', group: 'Bank Accounts', balance: 5000000, currency: 'IDR', includeInTotals: true, owner: 'Husband', description: 'Salary Account' },
             { id: 'acc_mandiri_w', name: 'Mandiri Istri', group: 'Bank Accounts', balance: 3000000, currency: 'IDR', includeInTotals: true, owner: 'Wife', description: 'Personal Account' },
             { id: 'acc_cash_h', name: 'Dompet Suami', group: 'Cash', balance: 500000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_cash_w', name: 'Dompet Istri', group: 'Cash', balance: 500000, currency: 'IDR', includeInTotals: true, owner: 'Wife' },
             { id: 'acc_cc', name: 'BCA Credit Card', group: 'Credit Cards', balance: -2000000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_invest', name: 'Bibit / Stock', group: 'Investments', balance: 10000000, currency: 'IDR', includeInTotals: true, owner: 'Husband' },
             { id: 'acc_gold', name: 'Emas Antam', group: 'Investments', balance: 0, currency: 'IDR', includeInTotals: true, owner: 'Wife', metadata: { grams: 0 } },
        ];
        setAccounts(accs);
    }
    
    // CRITICAL: Mark data as loaded so we don't overwrite LS with empty state
    setIsDataLoaded(true);
  }, []);

  // --- 2. SAVE DATA EFFECT (Runs on change, but blocked if !isDataLoaded) ---
  useEffect(() => {
     if (!isDataLoaded) return; // Prevent overwriting data during initial load

     localStorage.setItem('financeProData', JSON.stringify({
         accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories, lang, user,
         theme: { accent: currentAccent, customAccent: customAccentHex, bg: currentTheme, customBg: customBgHex }
     }));
  }, [accounts, transactions, nonProfitAccounts, nonProfitTransactions, categories, lang, user, currentAccent, customAccentHex, currentTheme, customBgHex, isDataLoaded]);

  // --- FIREBASE AUTH SYNC ---
  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                setUser({ 
                    name: firebaseUser.displayName || firebaseUser.email || 'User', 
                    email: firebaseUser.email || '' 
                });
            } else {
                // User is signed out, but we might want to keep local session if manual
                // For now, let's strictly follow firebase state if it was initiated
                // setUser(null); // Optional: Uncomment to force logout when firebase session ends
            }
        });
        return () => unsubscribe();
    }
  }, []);

  // --- AUTH HANDLERS ---
  const handleLocalLogin = async () => {
      setAuthError('');
      
      // Try Firebase First
      if (auth) {
          try {
              const userCredential = await signInWithEmailAndPassword(auth, regEmail, regPass);
              const u = userCredential.user;
              setUser({ name: u.displayName || u.email || 'User', email: u.email || '' });
              setShowAuthModal(false);
              setRegEmail(''); setRegPass('');
              return;
          } catch (error: any) {
              console.log("Firebase Login Failed, trying local:", error.message);
              // Fallthrough to Local Storage check
          }
      }

      // Local Storage Fallback
      const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const found = storedUsers.find((u: any) => u.email === regEmail && u.password === regPass);
      
      if (found) {
          setUser({ name: found.name, email: found.email });
          setShowAuthModal(false);
          setAuthError('');
          setRegEmail(''); setRegPass('');
      } else {
          setAuthError('Invalid email or password (Local & Cloud failed).');
      }
  };

  const handleRegister = async () => {
      if(!regName || !regEmail || !regPass) {
          setAuthError('All fields are required.');
          return;
      }
      setAuthError('');

      // Try Firebase Registration
      if (auth) {
          try {
             await createUserWithEmailAndPassword(auth, regEmail, regPass);
             // Note: Updating display name in Firebase requires another call, skipping for brevity
             setUser({ name: regName, email: regEmail });
             setShowAuthModal(false);
             setRegEmail(''); setRegPass(''); setRegName('');
             return;
          } catch (error: any) {
             setAuthError(error.message);
             return;
          }
      }

      // Local Storage Fallback
      const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      if (storedUsers.find((u: any) => u.email === regEmail)) {
          setAuthError('Email already registered locally.');
          return;
      }
      
      const newUser = { name: regName, email: regEmail, password: regPass };
      localStorage.setItem('registeredUsers', JSON.stringify([...storedUsers, newUser]));
      
      setUser({ name: regName, email: regEmail });
      setShowAuthModal(false);
      setAuthError('');
      setRegEmail(''); setRegPass(''); setRegName('');
  };

  const handleGoogleLogin = async () => {
      if (!auth || !googleProvider) {
          setAuthError('Google Login is not configured. Please add Firebase keys in services/firebase.ts');
          return;
      }

      try {
          const result = await signInWithPopup(auth, googleProvider);
          const u = result.user;
          setUser({ name: u.displayName || 'Google User', email: u.email || '' });
          setShowAuthModal(false);
      } catch (error: any) {
          console.error(error);
          setAuthError('Google Login Failed: ' + error.message);
      }
  };
  
  const handleLogout = () => {
      if (auth) signOut(auth);
      setUser(null);
  };

  // --- IMPORT / EXPORT HANDLERS ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (evt) => {
          // Wrap in timeout to allow UI to render the loader
          setTimeout(() => {
            try {
                const rawData = JSON.parse(evt.target?.result as string);
                
                // --- STRATEGY: DETECT FORMAT ---
                
                // Case 1: Native Backup Format (contains 'accounts' key)
                if (rawData.accounts && Array.isArray(rawData.accounts)) {
                    setAccounts(rawData.accounts);
                    if(rawData.transactions) setTransactions(rawData.transactions);
                    if(rawData.nonProfitAccounts) setNonProfitAccounts(rawData.nonProfitAccounts);
                    if(rawData.nonProfitTransactions) setNonProfitTransactions(rawData.nonProfitTransactions);
                    if(rawData.categories) setCategories(rawData.categories);
                    alert("Native Backup Data Restored Successfully!");
                } 
                // Case 2: External/Flat JSON Format (Array of transaction objects)
                else if (Array.isArray(rawData)) {
                    const newAccountsMap = new Map<string, Account>();
                    const newTransactions: Transaction[] = [];
                    const newCategories = new Set<string>(DEFAULT_CATEGORIES);

                    // Helper to generate ID
                    const genId = () => Math.random().toString(36).substr(2, 9);
                    
                    // Helper to guess Owner based on Account Name
                    const guessOwner = (name: string): AccountOwner => {
                        const n = name.toLowerCase();
                        if (n.includes('istri') || n.includes('wife')) return 'Wife';
                        return 'Husband'; // Default to Husband if not specified
                    };

                    // Helper to guess Group based on Account Name or Currency
                    const guessGroup = (name: string): AccountGroup => {
                        const n = name.toLowerCase();
                        if (n.includes('gold') || n.includes('invest') || n.includes('saham') || n.includes('reksa')) return 'Investments';
                        if (n.includes('cash') || n.includes('tunai') || n.includes('dompet')) return 'Cash';
                        if (n.includes('cc') || n.includes('credit') || n.includes('kartu')) return 'Credit Cards';
                        return 'Bank Accounts';
                    };

                    rawData.forEach((row: any, index) => {
                        // 1. Extract/Create Account
                        const accName = row.Accounts || "Unknown Account";
                        let accId = '';

                        // Check if we already created this account in this session
                        if (newAccountsMap.has(accName)) {
                            accId = newAccountsMap.get(accName)!.id;
                        } else {
                            accId = `acc_${genId()}_${index}`;
                            newAccountsMap.set(accName, {
                                id: accId,
                                name: accName,
                                balance: 0, // Will calculate from transactions
                                currency: row.Currency || 'IDR',
                                includeInTotals: true,
                                group: guessGroup(accName),
                                owner: guessOwner(accName)
                            });
                        }

                        // 2. Extract Category
                        if (row.Category) {
                            newCategories.add(row.Category);
                        }

                        // 3. Create Transaction
                        const amount = Math.abs(parseFloat(row.Amount) || parseFloat(row.IDR) || 0);
                        const typeString = row['Income/Expense'] || 'Expense';
                        const type = typeString.toLowerCase().includes('income') ? 'INCOME' : 'EXPENSE';
                        
                        // Handle date "YYYY-MM-DD"
                        let dateStr = new Date().toISOString();
                        if (row.Period) {
                            dateStr = new Date(row.Period).toISOString();
                        }

                        newTransactions.push({
                            id: `tx_${genId()}_${index}`,
                            date: dateStr,
                            amount: amount,
                            type: type,
                            category: row.Category || 'Uncategorized',
                            accountId: accId,
                            notes: row.Note || row.Description || ''
                        });

                        // 4. Update Running Balance
                        const acc = newAccountsMap.get(accName)!;
                        if (type === 'INCOME') acc.balance += amount;
                        else acc.balance -= amount;
                    });

                    // Update State (Replace old data completely)
                    setAccounts(Array.from(newAccountsMap.values()));
                    setTransactions(newTransactions);
                    setCategories(Array.from(newCategories));
                    
                    // Reset others not in JSON
                    setNonProfitAccounts([]);
                    setNonProfitTransactions([]);

                    alert(`Imported ${newTransactions.length} transactions and created ${newAccountsMap.size} accounts.`);
                } 
                else {
                    throw new Error("Unknown JSON Format");
                }

                // Redirect to Main Transaction Tab
                setActiveTab('trans');

            } catch (err) { 
                console.error(err);
                alert("Invalid JSON Format or Corrupted File."); 
            } finally {
                setIsLoading(false);
                // Clear input
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
          }, 500); // 500ms delay for visual feedback
      };
      reader.readAsText(file);
  };

  // --- EDIT ACCOUNT HANDLERS ---
  const openEditAccountModal = (acc: Account) => {
      setEditingAccount({...acc});
      setShowEditAccountModal(true);
  };

  const handleSaveAccountEdit = () => {
      if (editingAccount) {
          // 1. Calculate Balance Difference
          const oldAccount = accounts.find(a => a.id === editingAccount.id);
          if (oldAccount && oldAccount.balance !== editingAccount.balance) {
              const diff = editingAccount.balance - oldAccount.balance;
              
              // 2. Create Adjustment Transaction
              const newTx: Transaction = {
                  id: `adj-${Date.now()}`,
                  date: new Date().toISOString(),
                  type: diff > 0 ? 'INCOME' : 'EXPENSE',
                  amount: Math.abs(diff),
                  accountId: editingAccount.id,
                  category: 'Adjustment',
                  notes: `Manual Balance Correction (${diff > 0 ? 'Surplus' : 'Deficit'})`
              };
              setTransactions(prev => [newTx, ...prev]);
          }

          // 3. Update Account State
          setAccounts(prev => prev.map(a => a.id === editingAccount.id ? editingAccount : a));
          
          // 4. Update Selected Detail View if applicable
          if (selectedAccountForDetail && selectedAccountForDetail.id === editingAccount.id) {
              setSelectedAccountForDetail(editingAccount);
          }

          setShowEditAccountModal(false);
          setEditingAccount(null);
      }
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

  const handleSubmitTransaction = () => {
      const amountVal = parseFloat(newTxAmount);
      if (!amountVal || amountVal <= 0) {
          alert("Please enter a valid amount");
          return;
      }
      if (!newTxAccountId) {
          alert("Please select an account");
          return;
      }
      
      let txType = newTxType;
      // Basic validation
      if (txType === 'TRANSFER' && !newTxToAccountId) {
          alert("Please select destination account for transfer");
          return;
      }

      const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          date: new Date(newTxDate).toISOString(),
          type: txType,
          amount: amountVal,
          accountId: newTxAccountId,
          toAccountId: txType === 'TRANSFER' ? newTxToAccountId : undefined,
          category: txType === 'TRANSFER' ? 'Transfer' : newTxCategory,
          notes: newTxNotes
      };

      setTransactions(prev => [newTx, ...prev]);

      // Update Account Balances
      setAccounts(prev => prev.map(acc => {
          let balance = acc.balance;
          
          if (acc.id === newTxAccountId) {
              if (txType === 'INCOME') balance += amountVal;
              else balance -= amountVal; // Expense or Transfer Out
          }
          
          if (txType === 'TRANSFER' && acc.id === newTxToAccountId) {
              balance += amountVal; // Transfer In
          }

          return { ...acc, balance };
      }));

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

              <button onClick={() => {
                   // Simple add account for now, defaults to husband
                   const name = prompt("Account Name:");
                   if(name) {
                       const newAcc: Account = {
                           id: Date.now().toString(),
                           name,
                           group: 'Bank Accounts',
                           balance: 0,
                           currency: 'IDR',
                           includeInTotals: true,
                           owner: 'Husband'
                       };
                       setAccounts(prev => [...prev, newAcc]);
                   }
               }} className="w-full py-4 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:text-white hover:border-white/30 flex items-center justify-center gap-2">
                   <Plus className="w-5 h-5"/> Add Account
               </button>
          </div>
      );
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
          case 'trans': return <TransactionHistory transactions={transactions} accounts={accounts} lang={lang} onSelectAccount={(acc) => setSelectedAccountForDetail(acc)} />;
          case 'stats': return <Reports transactions={transactions} accounts={accounts} lang={lang} />;
          case 'accounts': return renderAccountsTab();
          case 'non-profit': return <NonProfit accounts={nonProfitAccounts} transactions={nonProfitTransactions} mainAccounts={accounts} onAddTransaction={(tx, src) => { setNonProfitTransactions(prev => [...prev, tx]); setNonProfitAccounts(prev => prev.map(a => a.id === tx.accountId ? {...a, balance: a.balance + tx.amount} : a)); if (src && tx.amount > 0) { const mainTx: Transaction = { id: 'tr-' + tx.id, date: tx.date, type: 'EXPENSE', amount: tx.amount, accountId: src, category: 'Non-Profit Transfer', notes: 'Transfer to ' + tx.accountId }; setTransactions(prev => [mainTx, ...prev]); setAccounts(prev => prev.map(a => a.id === src ? {...a, balance: a.balance - tx.amount} : a)); } }} onUpdateBalance={(id, bal) => setNonProfitAccounts(prev => prev.map(a => a.id === id ? {...a, balance: bal} : a))} onComplete={(id) => setNonProfitAccounts(prev => prev.map(a => a.id === id ? {...a, balance: 0} : a))} lang={lang} />;
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
                              <button onClick={() => setLang(lang === 'en' ? 'id' : 'en')} className="w-full flex items-center justify-between p-3 bg-surface-light rounded-lg hover:bg-gray-700"><span>{t('language')}</span><span className="text-primary font-bold">{lang.toUpperCase()}</span></button>
                              
                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('accentColor')}</label>
                                      <div className="flex items-center gap-2">
                                          <input ref={accentInputRef} type="color" value={customAccentHex} onChange={(e) => { setCustomAccentHex(e.target.value); setCurrentAccent('Custom'); }} className="hidden" />
                                          <button onClick={() => accentInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-white/10" title={t('custom')}>
                                              <Pipette className="w-4 h-4 text-gray-400" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                      {ACCENT_PRESETS.map(acc => (
                                          <button key={acc.name} onClick={() => setCurrentAccent(acc.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentAccent === acc.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: acc.value }} />
                                      ))}
                                      <button onClick={() => accentInputRef.current?.click()} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentAccent === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: currentAccent === 'Custom' ? customAccentHex : 'transparent' }}>
                                          {currentAccent !== 'Custom' && <div className="w-full h-full rounded-full" style={{background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`}} />}
                                      </button>
                                  </div>
                              </div>

                              <div className="p-3 bg-surface-light rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs text-gray-400 uppercase font-semibold">{t('bgTheme')}</label>
                                      <div className="flex items-center gap-2">
                                          <input ref={bgInputRef} type="color" value={customBgHex} onChange={(e) => { setCustomBgHex(e.target.value); setCurrentTheme('Custom'); }} className="hidden" />
                                          <button onClick={() => bgInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-white/10" title={t('custom')}>
                                              <Palette className="w-4 h-4 text-gray-400" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                      {BG_THEMES.map(theme => (
                                          <button key={theme.name} onClick={() => setCurrentTheme(theme.name)} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentTheme === theme.name ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: theme.bg }} />
                                      ))}
                                      <button onClick={() => bgInputRef.current?.click()} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-transparent transition-transform ${currentTheme === 'Custom' ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: currentTheme === 'Custom' ? customBgHex : 'transparent' }}>
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

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      onAddPress={onAddPress}
      user={user}
      onAuthRequest={() => { setShowAuthModal(true); setAuthMode('LOGIN'); }}
      onLogout={handleLogout}
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
                        {authMode === 'LOGIN' ? 'Login to sync your financial data.' : 'Register to secure your local data.'}
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
                            <>
                                <button onClick={handleLocalLogin} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                    Log In
                                </button>
                                <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S14.89 2 12.2 2c-5.53 0-10 4.47-10 10s4.47 10 10 10c5.77 0 10-4.75 10-10c0-.88-.09-1.53-.15-1.9z"/></svg>
                                    Sign in with Google
                                </button>
                            </>
                        ) : (
                            <button onClick={handleRegister} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20">
                                Register Account
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