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
import NotificationBell, { AppNotification } from './components/NotificationBell'; 
import { Account, Transaction, NonProfitAccount, NonProfitTransaction, AccountOwner, AccountGroup, MarketData } from './types';
import { Pipette, Palette, FileSpreadsheet, FileJson, Upload, ChevronRight, Download, Trash2, Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Settings, Edit3, Save, LogIn, UserPlus, TrendingUp, UserCircle2, Layers, Loader2, AlertTriangle, Eye, EyeOff, LogOut, Lock, Unlock, Pencil } from 'lucide-react';
import { subDays, format, isSameMonth, parseISO, differenceInHours, subHours } from 'date-fns';

const LockScreen = ({ onUnlock, correctPin, onForgot }: { onUnlock: () => void, correctPin: string, onForgot: () => void }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const handlePress = (num: string) => {
        if (input.length < 6) {
            const next = input + num; setInput(next);
            if (next.length === 6) { if (next === correctPin) onUnlock(); else { setError(true); setShake(true); setTimeout(() => { setInput(''); setShake(false); setError(false); }, 500); } }
        }
    };
    const handleDelete = () => { setInput(prev => prev.slice(0, -1)); setError(false); };
    return (
        <div className="fixed inset-0 z-[100] bg-[#18181b] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-500"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div></div>
                <h2 className="text-xl font-bold text-white mb-2">FinancePro Locked</h2>
                <p className="text-sm text-gray-400">Enter PIN to access</p>
            </div>
            <div className={`flex gap-4 mb-12 ${shake ? 'animate-shake' : ''}`}>{Array(6).fill(0).map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < input.length ? (error ? 'bg-red-500 scale-110' : 'bg-emerald-500 scale-110') : 'bg-white/10'}`} />))}</div>
            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<button key={num} onClick={() => handlePress(num.toString())} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white flex items-center justify-center">{num}</button>))}
                <div className="w-20 h-20"></div>
                <button onClick={() => handlePress('0')} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white flex items-center justify-center">0</button>
                <button onClick={handleDelete} className="w-20 h-20 rounded-full text-white/50 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"><Trash2 className="w-6 h-6" /></button>
            </div>
            <button onClick={onForgot} className="mt-12 text-sm text-gray-500 hover:text-emerald-500 transition-colors">Lupa PIN? (Logout & Reset)</button>
             <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } } .animate-shake { animation: shake 0.3s ease-in-out; }`}</style>
        </div>
    );
};

const DEFAULT_EXPENSE_CATEGORIES = ['Food & Drink', 'Groceries', 'Utilities', 'Transport', 'Shopping', 'Health', 'Education', 'Entertainment', 'Zakat & Charity', 'Other'];
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Bonus', 'Gift', 'Investment Return', 'Freelance', 'Other'];

interface CurrencyInputProps { value: string | number; onChange: (val: string) => void; currency: string; placeholder?: string; className?: string; autoFocus?: boolean; }
const CurrencyInput = ({ value, onChange, currency, className, ...props }: CurrencyInputProps) => {
    const formatDisplay = (val: string | number) => { if (!val) return ''; const digits = val.toString().replace(/\D/g, ''); if (!digits) return ''; return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US').format(BigInt(digits)); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw); };
    return (<div className="relative w-full"><div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><span className={`font-bold ${currency === 'IDR' ? 'text-emerald-500' : 'text-blue-500'}`}>{currency === 'IDR' ? 'Rp' : '$'}</span></div><input type="text" inputMode="numeric" value={formatDisplay(value)} onChange={handleChange} className={`w-full pl-12 pr-4 ${className}`} {...props} /></div>);
};

const App = () => {
  const [activeTab, setActiveTab] = useState('trans');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nonProfitAccounts, setNonProfitAccounts] = useState<NonProfitAccount[]>([]);
  const [nonProfitTransactions, setNonProfitTransactions] = useState<NonProfitTransaction[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({ usdRate: 15850, goldPrice: 1350000, usdChange: 0, goldChange: 0, lastUpdated: '' });

  const [lang, setLang] = useState<'en' | 'id'>('en');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  
  const [appPin, setAppPin] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [hasUnlockedSession, setHasUnlockedSession] = useState(false); 
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAssetAnalytics, setShowAssetAnalytics] = useState(false);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>({ type: 'GLOBAL' });
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);

  const [user, setUser] = useState<{id?: string, name: string, email: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const currentList = newTxType === 'INCOME' ? incomeCategories : expenseCategories; if (currentList.length > 0) setNewTxCategory(currentList[0]); }, [newTxType, incomeCategories, expenseCategories]);

  // --- MARKET DATA ENGINE ---
  useEffect(() => {
      if (!isDataLoaded) return;
      const fetchApiData = async () => {
          let newUsd = 16773; let newGold = 2681000;
          try { const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD'); const data = await res.json(); if (data?.rates?.IDR) newUsd = data.rates.IDR; } catch (e) {}
          try { const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://data-asg.goldprice.org/dbXRates/IDR')); const data = await res.json(); if (data?.items?.[0]?.xauPrice) newGold = Math.floor(data.items[0].xauPrice / 31.1035); } catch (e) { newGold = Math.floor((2740 * newUsd) / 31.1035); }
          return { usd_price: newUsd, gold_price: newGold };
      };
      const sync = async () => {
          const today = new Date(); const todayStr = format(today, 'yyyy-MM-dd');
          const { data: dbData } = await supabase.from('market_logs').select('*').order('created_at', { ascending: false }).limit(2);
          let latest = dbData?.[0], prev = dbData?.[1], insert = false;
          if (!latest) { await supabase.from('market_logs').insert([{ usd_price: 16773, gold_price: 2681000, created_at: subDays(today, 1).toISOString() }]); insert = true; prev = { usd_price: 16773, gold_price: 2681000 } as any; }
          else if (format(parseISO(latest.created_at), 'yyyy-MM-dd') !== todayStr) insert = true;
          if (insert) {
              const newData = await fetchApiData();
              const { data: ins } = await supabase.from('market_logs').insert([{ usd_price: newData.usd_price, gold_price: newData.gold_price, created_at: new Date().toISOString() }]).select().single();
              prev = latest; latest = ins;
              if (latest && prev) await supabase.from('market_logs').delete().not('id', 'in', `(${latest.id},${prev.id})`);
          }
          const safePrevUsd = prev?.usd_price || 16773, safePrevGold = prev?.gold_price || 2681000;
          if (latest) {
              const usdChg = ((latest.usd_price - safePrevUsd) / safePrevUsd) * 100, goldChg = ((latest.gold_price - safePrevGold) / safePrevGold) * 100;
              setMarketData({ usdRate: latest.usd_price, goldPrice: latest.gold_price, usdChange: usdChg, goldChange: goldChg, lastUpdated: latest.created_at });
          }
      };
      sync();
  }, [isDataLoaded]);

  // --- LOADERS & AUTH ---
  const loadSettingsFromSupabase = async (userId: string) => { 
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single(); 
      if (data) { 
          if (data.language) setLang(data.language as 'en' | 'id'); 
          if (data.app_pin) { setAppPin(data.app_pin); if(!hasUnlockedSession) setIsLocked(true); }
      } 
  };
  
  const loadDataFromSupabase = async (userId: string, isSilent = false) => { 
      if (!isSilent) setIsLoading(true); 
      try { 
          const [accRes, txRes] = await Promise.all([ 
              supabase.from('accounts').select('*').eq('user_id', userId), 
              supabase.from('transactions').select('*').eq('user_id', userId), 
              loadSettingsFromSupabase(userId) 
          ]); 
          if (accRes.data) setAccounts(accRes.data); 
          // FIX: GANTI tx.data MENJADI txRes.data
          if (txRes.data) setTransactions(txRes.data.map(t => ({ ...t, accountId: t.account_id, toAccountId: t.to_account_id, notes: t.note }))); 
      } catch (err) { console.error(err); } 
      finally { setIsDataLoaded(true); if (!isSilent) setIsLoading(false); } 
  };

  useEffect(() => { 
    let mounted = true;
    const timer = setTimeout(() => { if(mounted && isAuthLoading) { setIsAuthLoading(false); setIsLoading(false); setIsDataLoaded(true); } }, 2000); 
    const checkUser = async () => { try { const { data: { session } } = await supabase.auth.getSession(); if(!mounted) return; if (session?.user) { setUser({ id: session.user.id, name: session.user.user_metadata?.display_name || 'User', email: session.user.email || '' }); await loadDataFromSupabase(session.user.id, false); } else { setIsDataLoaded(true); } } catch (error) { setUser(null); setIsDataLoaded(true); } finally { if(mounted) { setIsAuthLoading(false); setIsLoading(false); clearTimeout(timer); } } }; checkUser(); 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { if (session?.user) { setUser({ id: session.user.id, name: session.user.user_metadata?.display_name || 'User', email: session.user.email || '' }); loadDataFromSupabase(session.user.id, true); } else setUser(null); setIsAuthLoading(false); }); 
    return () => { mounted = false; clearTimeout(timer); subscription.unsubscribe(); }; 
  }, []);

  // FORCE DARK MODE
  useEffect(() => { 
      const root = document.documentElement; 
      root.style.setProperty('--color-primary', '#10b981'); 
      root.style.setProperty('--bg-background', '#18181b');
      root.style.setProperty('--bg-surface', '#27272a');
      root.style.setProperty('--bg-surface-light', '#3f3f46');
  }, []);

  // Handlers
  const handleLocalLogin = async () => { const { data, error } = await supabase.auth.signInWithPassword({ email: regEmail, password: regPass }); if (error) setAuthError(error.message); else setShowAuthModal(false); };
  const handleRegister = async () => { const { error } = await supabase.auth.signUp({ email: regEmail, password: regPass, options: { data: { display_name: regName } } }); if (error) setAuthError(error.message); else alert("Success! Check email."); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setAppPin(''); setIsLocked(false); sessionStorage.removeItem('finance_unlocked'); };
  const handleCreatePin = async () => { if(newPinInput.length===6) { setAppPin(newPinInput); setShowPinSetup(false); setHasUnlockedSession(true); if (user?.id) await supabase.from('user_settings').upsert({ user_id: user.id, app_pin: newPinInput }); } else { alert("Must be 6 digits"); } };
  const handleDisablePin = async () => { if (confirm("Disable App Lock?")) { setAppPin(''); setIsLocked(false); if (user?.id) await supabase.from('user_settings').upsert({ user_id: user.id, app_pin: null }); } };
  const handleForgotPin = () => { if (confirm("Reset Data (Logout)?")) handleLogout(); };
  const onUnlockSuccess = () => { setIsLocked(false); sessionStorage.setItem('finance_unlocked', 'true'); };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(!file) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); if(d.accounts) { setAccounts(d.accounts); setTransactions(d.transactions||[]); alert("Restored!"); } } catch(e){ alert("Invalid File"); } }; r.readAsText(file); };
  const handleExportFile = (format: 'json' | 'csv') => { 
      let content = "", mime = "application/json", name = "finance_backup.json";
      if (format === 'json') content = JSON.stringify({accounts, transactions, nonProfitAccounts, nonProfitTransactions, expenseCategories, incomeCategories});
      else { mime = "text/csv"; name = "transactions.csv"; content = "Date,Type,Amount,Category,Account,Notes\n" + transactions.map(t => `${t.date},${t.type},${t.amount},${t.category},${accounts.find(a=>a.id===t.accountId)?.name||'Unknown'},"${t.notes||''}"`).join("\n"); }
      const blob = new Blob([content], {type: mime}); const url = URL.createObjectURL(blob); const node = document.createElement('a'); node.href = url; node.download = name; document.body.appendChild(node); node.click(); node.remove(); 
  };

  const handleAddCategory = () => { const t = newTxType==='INCOME'?setIncomeCategories:setExpenseCategories; if(newCategoryName) t(p => [...p, newCategoryName]); setNewCategoryName(''); };
  const handleDeleteCategory = (cat: string) => { if(confirm('Delete?')) { const t = newTxType==='INCOME'?setIncomeCategories:setExpenseCategories; t(p => p.filter(c => c !== cat)); } };
  const handleClearHajjHistory = () => { if(confirm('Clear history?')) setNonProfitTransactions([]); };
  const handleMarkAsRead = (id: string) => { const u = notifications.map(n => n.id === id ? { ...n, read: true } : n); setNotifications(u); localStorage.setItem('appNotifications', JSON.stringify(u)); };
  const handleClearNotifications = () => { setNotifications([]); localStorage.removeItem('appNotifications'); };

  const handleDeleteBatch = async (ids: string[]) => {
      if(!confirm(`Delete ${ids.length} items?`)) return;
      if(user?.id) await supabase.from('transactions').delete().in('id', ids).eq('user_id', user.id);
      const txsToDelete = transactions.filter(t => ids.includes(t.id));
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      setAccounts(prevAccounts => {
          const accMap = new Map<string, Account>(prevAccounts.map(a => [a.id, {...a}]));
          txsToDelete.forEach(tx => {
             const acc = accMap.get(tx.accountId);
             if(acc) {
                 if(tx.type==='EXPENSE') acc.balance += tx.amount;
                 else if(tx.type==='INCOME') acc.balance -= tx.amount;
                 else if(tx.type==='TRANSFER' && tx.toAccountId) { acc.balance += tx.amount; const dest = accMap.get(tx.toAccountId); if(dest) dest.balance -= tx.amount; }
             }
          });
          return Array.from(accMap.values());
      });
  };

  const handleSaveAccountEdit = async () => { if(!editingAccount) return; if(user?.id) await supabase.from('accounts').update({ name: editingAccount.name, balance: editingAccount.balance }).eq('id', editingAccount.id); setAccounts(prev => prev.map(a => a.id === editingAccount.id ? editingAccount : a)); setShowEditAccountModal(false); };
  const handleDeleteAccount = async (id: string) => { if(confirm('Delete Account?')) { if(user?.id) { try { await supabase.from('transactions').delete().eq('account_id', id); await supabase.from('accounts').delete().eq('id', id); } catch(e){} } setAccounts(prev => prev.filter(a => a.id !== id)); } };
  const handleDeleteTransaction = async (id: string) => { handleDeleteBatch([id]); };
  
  const onAddPress = () => { setNewTxDate(format(new Date(), 'yyyy-MM-dd')); if (selectedAccountForDetail) { setNewTxAccountId(selectedAccountForDetail.id); setNewTxOwnerFilter(selectedAccountForDetail.owner || 'All'); } else { setNewTxAccountId(''); setNewTxOwnerFilter('All'); } setShowTransactionModal(true); };
  const handleSubmitTransaction = async () => { const val = parseFloat(newTxAmount); if(!val || !newTxAccountId) return; const tx: Transaction = { id: `tx-${Date.now()}`, date: new Date().toISOString(), type: newTxType, amount: val, accountId: newTxAccountId, category: newTxCategory, notes: newTxNotes, toAccountId: newTxType==='TRANSFER'?newTxToAccountId:undefined }; if(user?.id) await supabase.from('transactions').insert([{ user_id: user.id, amount: val, type: newTxType, category: newTxCategory, note: newTxNotes, date: tx.date, account_id: newTxAccountId, to_account_id: tx.toAccountId }]); setTransactions(prev => [tx, ...prev]); setAccounts(prev => prev.map(a => { let b = a.balance; if(a.id===newTxAccountId) { if(newTxType==='INCOME') b+=val; else b-=val; } if(newTxType==='TRANSFER' && a.id===newTxToAccountId) b+=val; return {...a, balance: b}; })); setShowTransactionModal(false); setNewTxAmount(''); setNewTxNotes(''); };
  const handleSubmitNewAccount = async () => { if(!newAccName) return; const acc: Account = { id: `acc_${Date.now()}`, name: newAccName, group: 'Bank Accounts', balance: parseFloat(newAccBalance)||0, currency: 'IDR', includeInTotals: true, owner: newAccOwner }; if(user?.id) await supabase.from('accounts').insert([{ id: acc.id, user_id: user.id, name: acc.name, balance: acc.balance, owner: acc.owner }]); setAccounts(prev => [...prev, acc]); setShowAddAccountModal(false); };
  const handleAddNonProfitAccount = (name: string, owner: AccountOwner, target: number, initialBalance: number) => { const newAcc: NonProfitAccount = { id: `np_${Date.now()}`, name, owner, balance: initialBalance, target }; setNonProfitAccounts(prev => [...prev, newAcc]); if(initialBalance > 0) setNonProfitTransactions(prev => [...prev, { id: `init_${Date.now()}`, date: new Date().toISOString(), amount: initialBalance, accountId: newAcc.id, notes: 'Saldo Awal' }]); };
  const handleDeleteNonProfitAccount = (id: string) => { if(confirm("Delete?")) { setNonProfitAccounts(prev => prev.filter(a => a.id !== id)); setNonProfitTransactions(prev => prev.filter(t => t.accountId !== id)); } };
  const handleTabChange = (tab: string) => { setActiveTab(tab); setSelectedAccountForDetail(null); setShowAssetAnalytics(false); };
  const openEditAccountModal = (acc: Account) => { setEditingAccount({...acc}); setShowEditAccountModal(true); };
  const t = (key: string) => { const dict: any = { 'settings': lang === 'en' ? 'Settings' : 'Pengaturan', 'language': lang === 'en' ? 'Language' : 'Bahasa', 'dataMgmt': lang === 'en' ? 'Data Management' : 'Manajemen Data', 'resetData': lang === 'en' ? 'Reset Data' : 'Reset Data', 'confirmReset': lang === 'en' ? 'Are you sure?' : 'Anda yakin?', }; return dict[key] || key; };

  const renderAccountsTab = () => {
      const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
      const renderList = (list: Account[]) => (
          <div className="space-y-4">{['Cash','Bank Accounts','Credit Cards','Investments','Loans'].map(g => {
              const grp = list.filter(a => a.group === g); if(grp.length===0) return null;
              // PASS ONRENAME PROP HERE
              return (<div key={g} className="bg-white/5 rounded-xl overflow-hidden border border-white/5"><div className="px-4 py-2 bg-white/5 flex justify-between"><div className="flex gap-2"><Layers className="w-3 h-3 text-gray-400"/><span className="text-xs font-bold text-gray-300 uppercase">{g}</span></div><span className="text-xs font-bold text-emerald-400">{formatCurrency(grp.reduce((s,a)=>s+a.balance,0))}</span></div><div className="divide-y divide-white/5">{grp.map(a => <AccountCard key={a.id} account={a} onEdit={a => setSelectedAccountForDetail(a)} listView={true} isDeleteMode={isManageMode} onDelete={() => handleDeleteAccount(a.id)} onRename={(acc) => openEditAccountModal(acc)} />)}</div></div>);
          })}</div>
      );
      const hus = accounts.filter(a => a.owner==='Husband'), wif = accounts.filter(a => a.owner==='Wife');
      return (
          <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-surface p-4 rounded-xl border border-white/10 group relative overflow-hidden"><div className="absolute inset-0 bg-emerald-500/10 opacity-50"></div><div className="relative"><p className="text-emerald-400 text-xs font-bold uppercase mb-1">Total Assets</p><p className="text-2xl font-bold text-white">{formatCurrency(accounts.reduce((s,a)=>s+a.balance,0))}</p></div></div>
                  <div className="bg-surface p-4 rounded-xl border border-white/10"><p className="text-gray-400 text-xs font-bold uppercase mb-2">Husband</p><p className="text-xl font-bold text-indigo-400">{formatCurrency(hus.reduce((s,a)=>s+a.balance,0))}</p></div>
                  <div className="bg-surface p-4 rounded-xl border border-white/10"><p className="text-gray-400 text-xs font-bold uppercase mb-2">Wife</p><p className="text-xl font-bold text-pink-400">{formatCurrency(wif.reduce((s,a)=>s+a.balance,0))}</p></div>
              </div>
              <div className="flex gap-3"><button onClick={()=>setShowAddAccountModal(true)} className="flex-1 py-3 bg-indigo-600 font-bold rounded-xl text-white shadow-lg flex justify-center gap-2"><Plus className="w-5 h-5"/> Add Account</button><button onClick={()=>setIsManageMode(!isManageMode)} className={`px-4 py-3 font-bold rounded-xl flex justify-center gap-2 shadow-lg ${isManageMode?'bg-rose-600 text-white':'bg-white/10 text-gray-300'}`}>{isManageMode?<X className="w-5 h-5"/>:<Edit3 className="w-5 h-5"/>} {isManageMode?'Done':'Manage'}</button></div>
              <div className="space-y-8">{hus.length>0 && <div className="space-y-2"><h3 className="text-sm font-bold text-indigo-400 uppercase pl-1">Husband's Accounts</h3>{renderList(hus)}</div>}{wif.length>0 && <div className="space-y-2"><h3 className="text-sm font-bold text-pink-400 uppercase pl-1">Wife's Accounts</h3>{renderList(wif)}</div>}</div>
          </div>
      );
  };

  const renderContent = () => {
      if(showAssetAnalytics) return <AssetAnalytics transactions={transactions} accounts={accounts} onBack={()=>setShowAssetAnalytics(false)} scope={analyticsScope} />;
      if(selectedAccountForDetail) return <AccountDetail account={selectedAccountForDetail} transactions={transactions} onBack={()=>setSelectedAccountForDetail(null)} onEdit={openEditAccountModal} onViewStats={(a)=>{setAnalyticsScope({type:'ACCOUNT',accountId:a.id});setShowAssetAnalytics(true);}} />;
      switch(activeTab) {
          case 'trans': return <TransactionHistory transactions={transactions} accounts={accounts} lang={lang} onSelectAccount={setSelectedAccountForDetail} onDelete={handleDeleteTransaction} onDeleteBatch={handleDeleteBatch} />;
          case 'stats': return <div className="h-full overflow-y-auto pb-24"><Reports transactions={transactions} accounts={accounts} lang={lang} marketData={marketData} /></div>;
          case 'accounts': return renderAccountsTab();
          case 'non-profit': return <NonProfit accounts={nonProfitAccounts} transactions={nonProfitTransactions} mainAccounts={accounts} onClearHistory={handleClearHajjHistory} lang={lang} currency={currency} onAddAccount={handleAddNonProfitAccount} onDeleteAccount={handleDeleteNonProfitAccount} onAddTransaction={(tx, src)=>{ setNonProfitTransactions(p=>[...p, tx]); if(src) { const t: Transaction = { id:'tr-'+tx.id, date:tx.date, type:'EXPENSE', amount:tx.amount, accountId:src, category:'Non-Profit Transfer', notes:'Transfer to '+tx.accountId }; setTransactions(p=>[t,...p]); setAccounts(p=>p.map(a=>a.id===src?{...a, balance:a.balance-tx.amount}:a)); } }} onUpdateBalance={(id, bal)=>setNonProfitAccounts(p=>p.map(a=>a.id===id?{...a, balance:bal}:a))} onComplete={(id)=>setNonProfitAccounts(p=>p.map(a=>a.id===id?{...a, balance:0}:a))} />;
          case 'zakat': return <ZakatMal accounts={accounts} transactions={transactions} onAddTransaction={(tx)=>{ setTransactions(p=>[tx,...p]); setAccounts(p=>p.map(a=>a.id===tx.accountId?{...a, balance:a.balance-tx.amount}:a)); }} />;
          case 'more': return (
             <div className="p-4 space-y-4 overflow-y-auto h-full pb-24">
                {user && <div className="bg-surface p-4 rounded-xl border border-white/10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div><div><p className="font-bold text-white">{user.name}</p><p className="text-xs text-gray-400">{user.email}</p></div></div><button onClick={handleLogout} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">Log Out</button></div>}
                <div className="bg-surface p-4 rounded-xl border border-white/10">
                   <h3 className="font-bold text-lg mb-4 text-white">{t('settings')}</h3>
                   <div className="space-y-4">
                      <button onClick={()=>setLang(lang==='en'?'id':'en')} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg"><span>{t('language')}</span><span className="text-primary font-bold">{lang.toUpperCase()}</span></button>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg"><span>Currency</span><div className="flex bg-black/20 p-1 rounded-lg"><button onClick={()=>setCurrency('IDR')} className={`px-3 py-1 rounded-md text-xs font-bold ${currency==='IDR'?'bg-emerald-600 text-white':'text-gray-500'}`}>IDR</button><button onClick={()=>setCurrency('USD')} className={`px-3 py-1 rounded-md text-xs font-bold ${currency==='USD'?'bg-blue-600 text-white':'text-gray-500'}`}>USD</button></div></div>
                      <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between"><div><p className="text-sm font-medium flex items-center gap-2">{appPin ? <Lock className="w-4 h-4 text-emerald-500"/> : <Unlock className="w-4 h-4 text-gray-500"/>} App Lock</p></div>{appPin ? <button onClick={handleDisablePin} className="text-xs font-bold text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg">Disable</button> : <button onClick={()=>setShowPinSetup(true)} className="text-xs font-bold text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg">Enable</button>}</div>
                   </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-white/10">
                   <h3 className="font-bold text-lg mb-4 text-white">{t('dataMgmt')}</h3>
                   <div className="space-y-2">
                      <button onClick={()=>handleExportFile('json')} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-white"><div className="flex items-center"><FileJson className="w-5 h-5 text-yellow-500 mr-3"/><span>Export JSON</span></div><Download className="w-4 h-4"/></button>
                      <button onClick={()=>handleExportFile('csv')} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-white"><div className="flex items-center"><FileSpreadsheet className="w-5 h-5 text-green-500 mr-3"/><span>Export CSV</span></div><Download className="w-4 h-4"/></button>
                      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json"/><button onClick={()=>fileInputRef.current?.click()} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-white"><div className="flex items-center"><Upload className="w-5 h-5 text-blue-500 mr-3"/><span>Import Data</span></div><ChevronRight className="w-4 h-4"/></button>
                      <button onClick={()=>{if(confirm(t('confirmReset'))){setAccounts([]);setTransactions([]);setNonProfitAccounts([]);setNonProfitTransactions([]);localStorage.removeItem('financeProData');window.location.reload();}}} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-red-900/20 text-red-500"><div className="flex items-center"><Trash2 className="w-5 h-5 mr-3"/><span>{t('resetData')}</span></div></button>
                   </div>
                </div>
             </div>
          );
          default: return null;
      }
  };

  if(isAuthLoading) return <div className="flex h-screen items-center justify-center bg-[#18181b] text-white"><Loader2 className="w-10 h-10 animate-spin text-emerald-500"/></div>;

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange} onAddPress={onAddPress} user={user} onAuthRequest={()=>{setShowAuthModal(true);setAuthMode('LOGIN');}} onLogout={handleLogout} lang={lang} setLang={setLang}>
        {isLocked && appPin && !hasUnlockedSession && <LockScreen correctPin={appPin} onUnlock={onUnlockSuccess} onForgot={handleForgotPin} />}
        <NotificationBell notifications={notifications} onMarkAsRead={handleMarkAsRead} onClearAll={handleClearNotifications} />
        {renderContent()}
        {showAddAccountModal && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6"><h3 className="text-lg font-bold text-white mb-4">Add Account</h3><input type="text" value={newAccName} onChange={e=>setNewAccName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-white" placeholder="Name"/><button onClick={handleSubmitNewAccount} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Save</button></div></div>)}
        {showTransactionModal && (<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"><div className="w-full max-w-md bg-surface rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]"><div className="p-4 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-white">New Transaction</h3><button onClick={()=>setShowTransactionModal(false)}><X className="w-6 h-6 text-gray-400"/></button></div><div className="p-6 space-y-4 overflow-y-auto"><CurrencyInput value={newTxAmount} onChange={setNewTxAmount} currency={currency} className="bg-black/50 border border-white/10 rounded-xl p-4 text-2xl font-bold text-white text-right"/><div className="grid grid-cols-1 gap-4"><select value={newTxAccountId} onChange={e=>setNewTxAccountId(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white"><option value="" disabled>Select Account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><button onClick={handleSubmitTransaction} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Save</button></div></div></div>)}
        {showAuthModal && (<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6"><h3 className="text-lg font-bold text-white mb-6">{authMode==='LOGIN'?'Login':'Register'}</h3>{authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}<div className="space-y-4"><input type="email" placeholder="Email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-white"/><input type="password" placeholder="Password" value={regPass} onChange={e=>setRegPass(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-white"/>{authMode==='LOGIN'?<button onClick={handleLocalLogin} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Login</button>:<button onClick={handleRegister} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Register</button>}</div></div></div>)}
        {/* EDIT ACCOUNT MODAL (DENGAN PENCIL) */}
        {showEditAccountModal && editingAccount && (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"><div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200"><div className="text-center mb-6"><Pencil className="w-12 h-12 text-amber-500 mx-auto mb-4 bg-amber-500/10 p-3 rounded-full" /><h3 className="text-lg font-bold text-white">Edit Account</h3><p className="text-xs text-gray-400 mt-1">{editingAccount.name}</p></div><form onSubmit={(e) => { e.preventDefault(); handleSaveAccountEdit(); }} className="space-y-4"><div className="text-left"><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Account Name</label><input type="text" value={editingAccount.name} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"/></div><div className="text-left"><label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Current Balance</label><CurrencyInput value={editingAccount.balance} onChange={val => setEditingAccount({...editingAccount, balance: parseFloat(val) || 0})} currency={currency} className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500" /></div><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowEditAccountModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">Cancel</button><button type="submit" className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">Update</button></div></form></div></div>)}
        {/* PIN SETUP MODAL */}
        {showPinSetup && (<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 text-center"><h3 className="text-lg font-bold text-white mb-4">Set New PIN</h3><input type="text" maxLength={6} value={newPinInput} onChange={e=>setNewPinInput(e.target.value.replace(/\D/g,''))} className="bg-black/50 border border-emerald-500/50 text-white text-3xl font-bold tracking-[0.5em] text-center w-full py-4 rounded-xl outline-none mb-4" placeholder="••••••" autoFocus/><button onClick={handleCreatePin} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Save PIN</button></div></div>)}
    </Layout>
  );
};

export default App;