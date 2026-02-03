import { supabase } from "./services/supabase";
import React, { useState, useEffect, useRef } from "react";
import Layout from "./components/Layout";
import TransactionHistory from "./components/TransactionHistory";
import Reports from "./components/Reports";
import AccountCard from "./components/AccountCard";
import AccountDetail from "./components/AccountDetail";
import AssetAnalytics, { AnalyticsScope } from "./components/AssetAnalytics";
import NonProfit from "./components/NonProfit";
import ZakatMal from "./components/ZakatMal";
import NotificationBell, {
  AppNotification,
} from "./components/NotificationBell";
import {
  Account,
  Transaction,
  NonProfitAccount,
  NonProfitTransaction,
  AccountOwner,
  AccountGroup,
  MarketData,
} from "./types";
import {
  Pipette,
  Palette,
  FileSpreadsheet,
  FileJson,
  Upload,
  ChevronRight,
  Download,
  Trash2,
  Plus,
  X,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Edit3,
  Save,
  LogIn,
  UserPlus,
  TrendingUp,
  UserCircle2,
  Layers,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Lock,
  Unlock,
  Pencil,
  RefreshCw,
  Type,
  ChevronDown,
} from "lucide-react";
import {
  subDays,
  format,
  isSameMonth,
  parseISO,
  differenceInHours,
  subHours,
} from "date-fns";

// --- LOCK SCREEN COMPONENT (WITH BACKSPACE) ---
const LockScreen = ({
  onUnlock,
  correctPin,
  onForgot,
}: {
  onUnlock: () => void;
  correctPin: string;
  onForgot: () => void;
}) => {
  const [input, setInput] = useState("");
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
            setInput("");
            setShake(false);
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#18181b] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-500">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">FinancePro Locked</h2>
        <p className="text-sm text-gray-400">Enter your 6-digit PIN</p>
      </div>
      <div className={`flex gap-4 mb-12 ${shake ? "animate-shake" : ""}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < input.length ? (error ? "bg-red-500 scale-110" : "bg-emerald-500 scale-110") : "bg-white/10"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="w-20 h-20"></div>
        <button
          onClick={() => handlePress("0")}
          className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-20 h-20 rounded-full text-white/50 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
      <button
        onClick={onForgot}
        className="mt-12 text-sm text-gray-500 hover:text-emerald-500 transition-colors"
      >
        Lupa PIN? (Logout & Reset)
      </button>
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } } .animate-shake { animation: shake 0.3s ease-in-out; }`}</style>
    </div>
  );
};

const ACCENT_PRESETS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
];
const DEFAULT_EXPENSE_CATEGORIES = [
  "Food & Drink",
  "Groceries",
  "Utilities",
  "Transport",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Zakat & Charity",
  "Other",
];
const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Gift",
  "Investment Return",
  "Freelance",
  "Other",
];

interface CurrencyInputProps {
  value: string | number;
  onChange: (val: string) => void;
  currency: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}
const CurrencyInput = ({
  value,
  onChange,
  currency,
  className,
  ...props
}: CurrencyInputProps) => {
  const formatDisplay = (val: string | number) => {
    if (!val) return "";
    const digits = val.toString().replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US").format(
      BigInt(digits),
    );
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  };
  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <span
          className={`font-bold ${currency === "IDR" ? "text-emerald-500" : "text-blue-500"}`}
        >
          {currency === "IDR" ? "Rp" : "$"}
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

const App = () => {
  const [activeTab, setActiveTab] = useState("trans");
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nonProfitAccounts, setNonProfitAccounts] = useState<
    NonProfitAccount[]
  >([]);
  const [nonProfitTransactions, setNonProfitTransactions] = useState<
    NonProfitTransaction[]
  >([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    DEFAULT_EXPENSE_CATEGORIES,
  );
  const [incomeCategories, setIncomeCategories] = useState<string[]>(
    DEFAULT_INCOME_CATEGORIES,
  );

  // NEW: Account Groups State
  const [accountGroups, setAccountGroups] = useState<string[]>([
    "Cash",
    "Bank Accounts",
    "Credit Cards",
    "Investments",
    "Loans",
  ]);

  // NEW: Manage Mode States for Modals
  const [isManagingCategories, setIsManagingCategories] = useState(false); // Untuk Toggle tampilan manage di modal
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [manageItemName, setManageItemName] = useState(""); // Input untuk rename/add

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({
    usdRate: 15850,
    goldPrice: 1350000,
    usdChange: 0,
    goldChange: 0,
    lastUpdated: "",
  });

  // Settings
  const [lang, setLang] = useState<"en" | "id">("en");
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");

  // Customization (Dikembalikan)
  const [currentAccent, setCurrentAccent] = useState("Emerald");
  const [customAccentHex, setCustomAccentHex] = useState("#10b981");
  const [customBgHex, setCustomBgHex] = useState("#18181b");
  const [customTextHex, setCustomTextHex] = useState("#ffffff"); // STATE BARU: Warna Teks

  // Security
  const [appPin, setAppPin] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);
  // FIX: Unlock jika session storage ada (agar tidak lock saat minimize)
  const [hasUnlockedSession, setHasUnlockedSession] = useState(() => {
    return sessionStorage.getItem("finance_unlocked") === "true";
  });
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAssetAnalytics, setShowAssetAnalytics] = useState(false);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>({
    type: "GLOBAL",
  });
  const [selectedAccountForDetail, setSelectedAccountForDetail] =
    useState<Account | null>(null);

  const [user, setUser] = useState<{
    id?: string;
    name: string;
    email: string;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [authError, setAuthError] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccOwner, setNewAccOwner] = useState<AccountOwner>("Husband");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [newTxType, setNewTxType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(
    "EXPENSE",
  );
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxCategory, setNewTxCategory] = useState("Food & Drink");
  const [newTxAccountId, setNewTxAccountId] = useState("");
  const [newTxToAccountId, setNewTxToAccountId] = useState("");
  const [newTxDate, setNewTxDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTxNotes, setNewTxNotes] = useState('');
  const [newTxOwnerFilter, setNewTxOwnerFilter] = useState<'All' | AccountOwner>('All');
  const [newTxToOwnerFilter, setNewTxToOwnerFilter] = useState<'All' | AccountOwner>('All'); // STATE BARU
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{
    idx: number;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accentInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null); // REF BARU

  useEffect(() => {
    const currentList =
      newTxType === "INCOME" ? incomeCategories : expenseCategories;
    if (currentList.length > 0) setNewTxCategory(currentList[0]);
  }, [newTxType, incomeCategories, expenseCategories]);

  // --- MARKET DATA ENGINE (SYNC DENGAN ZAKATMAL) ---
  useEffect(() => {
    if (!isDataLoaded) return;

    const fetchApiData = async () => {
      let newUsd = 16773;
      let newGold = 2681000;

      try {
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD",
        );
        const data = await res.json();
        if (data?.rates?.IDR) newUsd = data.rates.IDR;
      } catch (e) {
        console.warn("USD Fail");
      }

      try {
        // LOGIC SAMA DENGAN ZAKAT MAL: Menggunakan allorigins proxy ke goldprice.org
        const proxyUrl = "https://api.allorigins.win/raw?url=";
        const targetUrl = encodeURIComponent(
          "https://data-asg.goldprice.org/dbXRates/IDR",
        );
        const res = await fetch(proxyUrl + targetUrl);
        const data = await res.json();

        if (data?.items?.[0]?.xauPrice) {
          // xauPrice = Harga per Ounce. Bagi 31.1035 untuk dapat per Gram.
          newGold = Math.floor(data.items[0].xauPrice / 31.1035);
        }
      } catch (e) {
        // Fallback calculation
        newGold = Math.floor((2740 * newUsd) / 31.1035);
      }

      return { usd_price: newUsd, gold_price: newGold };
    };

    const syncMarketData = async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      const { data: dbData } = await supabase
        .from("market_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);
      let latest = dbData?.[0];
      let prev = dbData?.[1];
      let insert = false;

      if (!latest) {
        // Init Data
        const initData = {
          usd_price: 16773,
          gold_price: 2681000,
          created_at: subDays(today, 1).toISOString(),
        };
        await supabase.from("market_logs").insert([initData]);
        insert = true;
        prev = initData as any;
      } else if (
        format(parseISO(latest.created_at), "yyyy-MM-dd") !== todayStr
      ) {
        insert = true;
      }

      if (insert) {
        const newData = await fetchApiData();
        const { data: ins } = await supabase
          .from("market_logs")
          .insert([
            {
              usd_price: newData.usd_price,
              gold_price: newData.gold_price,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        prev = latest;
        latest = ins;

        // Cleanup old rows
        if (latest && prev)
          await supabase
            .from("market_logs")
            .delete()
            .not("id", "in", `(${latest.id},${prev.id})`);
      }

      const safePrevUsd = prev?.usd_price || 16773;
      const safePrevGold = prev?.gold_price || 2681000;

      if (latest) {
        const usdChg = ((latest.usd_price - safePrevUsd) / safePrevUsd) * 100;
        const goldChg =
          ((latest.gold_price - safePrevGold) / safePrevGold) * 100;
        setMarketData({
          usdRate: latest.usd_price,
          goldPrice: latest.gold_price,
          usdChange: usdChg,
          goldChange: goldChg,
          lastUpdated: latest.created_at,
        });
      }
    };
    syncMarketData();
  }, [isDataLoaded]);

  // --- AUTH & LOCK SYSTEM (SESSION BASED) ---
  const loadSettingsFromSupabase = async (userId: string) => {
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      if (data.language) setLang(data.language);

      // Logic Lock Screen: Cek sessionStorage
      if (data.app_pin) {
        setAppPin(data.app_pin);
        // Cek apakah user sudah unlock di sesi ini (tab belum ditutup)
        const sessionOpen =
          sessionStorage.getItem("finance_unlocked") === "true";
        if (!sessionOpen) {
          setIsLocked(true);
        }
      }

      if (data.accent_color) {
        const isPreset = ACCENT_PRESETS.some(
          (p) => p.value === data.accent_color,
        );
        if (isPreset)
          setCurrentAccent(
            ACCENT_PRESETS.find((p) => p.value === data.accent_color)?.name ||
              "Emerald",
          );
        else {
          setCurrentAccent("Custom");
          setCustomAccentHex(data.accent_color);
        }
      }

      // Load Custom Background
      if (data.bg_theme) {
        try {
          // Support format lama (json) atau string hex
          if (data.bg_theme.startsWith("#")) {
            setCustomBgHex(data.bg_theme);
          } else {
            const themeObj = JSON.parse(data.bg_theme);
            if (themeObj.customBg) setCustomBgHex(themeObj.customBg);
          }
        } catch (e) {
          /* ignore */
        }
      }
    }
  };

  // UPDATE 1: Load Data Haji/Umrah dari Database
  const loadDataFromSupabase = async (userId: string, isSilent = false) => { 
      if (!isSilent) setIsLoading(true); 
      try { 
          const [accRes, txRes, npAccRes, npTxRes, settingsRes] = await Promise.all([ 
              supabase.from('accounts').select('*').eq('user_id', userId), 
              supabase.from('transactions').select('*').eq('user_id', userId),
              supabase.from('non_profit_accounts').select('*').eq('user_id', userId), // Load Akun Haji
              supabase.from('non_profit_transactions').select('*').eq('user_id', userId), // Load History Haji
              loadSettingsFromSupabase(userId) 
          ]); 
          
          if (accRes.data) setAccounts(accRes.data); 
          if (txRes.data) setTransactions(txRes.data.map(t => ({ ...t, accountId: t.account_id, toAccountId: t.to_account_id, notes: t.note }))); 
          if (npAccRes.data) setNonProfitAccounts(npAccRes.data);
          if (npTxRes.data) setNonProfitTransactions(npTxRes.data.map(t => ({ ...t, accountId: t.account_id, notes: t.notes })));
      } catch (err) { console.error(err); } 
      finally { setIsDataLoaded(true); if (!isSilent) setIsLoading(false); } 
  };

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted && isAuthLoading) {
        setIsAuthLoading(false);
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    }, 2000);
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.display_name || "User",
            email: session.user.email || "",
          });
          await loadDataFromSupabase(session.user.id, false);
        } else {
          setIsDataLoaded(true);
        }
      } catch (error) {
        setUser(null);
        setIsDataLoaded(true);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
          setIsLoading(false);
          clearTimeout(timer);
        }
      }
    };
    checkUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.display_name || "User",
          email: session.user.email || "",
        });
        loadDataFromSupabase(session.user.id, true);
      } else setUser(null);
      setIsAuthLoading(false);
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // Update CSS Vars
  // Update CSS Vars (VIBE GENERATOR)
  useEffect(() => {
    const root = document.documentElement;
    const accent =
      ACCENT_PRESETS.find((p) => p.name === currentAccent)?.value ||
      customAccentHex;

    root.style.setProperty("--color-primary", accent);

    // 1. SET BACKGROUND & SURFACE VIBE (Otomatis mix warna)
    root.style.setProperty("--bg-background", customBgHex);
    // Surface = Background dicampur 5% Putih (biar sedikit lebih terang dari bg utama)
    root.style.setProperty(
      "--bg-surface",
      `color-mix(in srgb, ${customBgHex}, white 5%)`,
    );
    // Surface Light = Background dicampur 10% Putih
    root.style.setProperty(
      "--bg-surface-light",
      `color-mix(in srgb, ${customBgHex}, white 10%)`,
    );

    // 2. SET TEXT COLOR
    root.style.setProperty("--text-main", customTextHex);
    // Text Muted = Warna Teks dicampur 40% Transparan
    root.style.setProperty(
      "--text-muted",
      `color-mix(in srgb, ${customTextHex}, transparent 40%)`,
    );

    // Auto Save Settings
    if (user?.id && isDataLoaded) {
      const timer = setTimeout(() => {
        supabase.from("user_settings").upsert({
          user_id: user.id,
          accent_color: accent,
          bg_theme: JSON.stringify({
            customBg: customBgHex,
            customText: customTextHex,
          }), // Simpan Text Color juga
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    currentAccent,
    customAccentHex,
    customBgHex,
    customTextHex,
    user,
    isDataLoaded,
  ]);

// FIX: Ganti 'WARNING' menjadi 'ALERT' agar sesuai tipe data
  const addNotification = (title: string, message: string, type: 'INFO' | 'ALERT' | 'SUCCESS' = 'INFO') => {
      const newNotif: AppNotification = { 
          id: `n-${Date.now()}`, 
          title, 
          message, 
          date: new Date().toISOString(), 
          read: false, 
          type: type as any // Gunakan 'as any' untuk menimpa strict check sementara jika perlu
      }; 
      setNotifications(p => {
          const updated = [newNotif, ...p];
          localStorage.setItem('appNotifications', JSON.stringify(updated));
          return updated;
      });
  };

  // Auth & Pin Handlers
  const handleLocalLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: regEmail,
      password: regPass,
    });
    if (error) setAuthError(error.message);
    else setShowAuthModal(false);
  };
  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { display_name: regName } },
    });
    if (error) setAuthError(error.message);
    else alert("Success! Check email.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppPin("");
    setIsLocked(false);
    sessionStorage.removeItem("finance_unlocked"); // Clear session
  };

  const handleCreatePin = async () => {
    if (newPinInput.length === 6) {
      setAppPin(newPinInput);
      setShowPinSetup(false);
      sessionStorage.setItem("finance_unlocked", "true");
      if (user?.id)
        await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, app_pin: newPinInput });
    } else {
      alert("Must be 6 digits");
    }
  };

  const handleDisablePin = async () => {
    if (confirm("Disable App Lock?")) {
      setAppPin("");
      setIsLocked(false);
      if (user?.id)
        await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, app_pin: null }); // Nullify in DB
    }
  };

  const handleForgotPin = () => {
    if (confirm("Reset Data (Logout)?")) handleLogout();
  };

  const onUnlockSuccess = () => {
    setIsLocked(false);
    sessionStorage.setItem("finance_unlocked", "true"); // Mark session as unlocked
  };

  // Data Handlers (Import/Export Multi Format)
  // UPDATE 0a: Support JSON & CSV Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const content = ev.target?.result as string;

        if (file.name.endsWith(".json")) {
          const d = JSON.parse(content);
          if (d.accounts) {
            setAccounts(d.accounts);
            setTransactions(d.transactions || []);
            alert("JSON Restored!");
          }
        } else if (file.name.endsWith(".csv")) {
          // Simple CSV Parser
          const lines = content.split("\n");
          const newTxs: Transaction[] = [];
          // Skip header (row 0), start from row 1
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(",");
            if (row.length >= 4) {
              // Basic validation
              // Format CSV expectation: Date,Type,Amount,Category,AccountName,Notes
              const [date, type, amount, category, accName, notes] = row;
              // Find account ID by name (rough matching)
              const accId =
                accounts.find((a) => a.name === accName)?.id ||
                accounts[0]?.id ||
                "";

              newTxs.push({
                id: `csv-${Date.now()}-${i}`,
                date: date || new Date().toISOString(),
                type: (type as any) || "EXPENSE",
                amount: parseFloat(amount) || 0,
                category: category || "Uncategorized",
                accountId: accId,
                notes: notes ? notes.replace(/"/g, "") : "",
              });
            }
          }
          setTransactions((prev) => [...newTxs, ...prev]);
          alert(`Imported ${newTxs.length} transactions from CSV`);
        }
      } catch (e) {
        alert("Invalid File Format");
      }
    };
    r.readAsText(file);
  };

  const handleExportFile = (format: "json" | "csv") => {
    let content = "";
    let mime = "application/json";
    let name = "finance_backup.json";

    if (format === "json") {
      content = JSON.stringify({
        accounts,
        transactions,
        nonProfitAccounts,
        nonProfitTransactions,
        expenseCategories,
        incomeCategories,
      });
    } else {
      // CSV Simple Export (Transactions Only)
      mime = "text/csv";
      name = "transactions.csv";
      const header = "Date,Type,Amount,Category,Account,Notes\n";
      const rows = transactions
        .map((t) => {
          const accName =
            accounts.find((a) => a.id === t.accountId)?.name || "Unknown";
          return `${t.date},${t.type},${t.amount},${t.category},${accName},"${t.notes || ""}"`;
        })
        .join("\n");
      content = header + rows;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const node = document.createElement("a");
    node.href = url;
    node.download = name;
    document.body.appendChild(node);
    node.click();
    node.remove();
  };

  const handleAddCategory = () => {
    const t =
      newTxType === "INCOME" ? setIncomeCategories : setExpenseCategories;
    if (newCategoryName) t((p) => [...p, newCategoryName]);
    setNewCategoryName("");
  };
  const handleDeleteCategory = (cat: string) => {
    if (confirm("Delete?")) {
      const t =
        newTxType === "INCOME" ? setIncomeCategories : setExpenseCategories;
      t((p) => p.filter((c) => c !== cat));
    }
  };
  // UPDATE 2: Hapus History Haji di Database
  const handleClearHajjHistory = async () => { 
      if(confirm('Clear history?')) {
          setNonProfitTransactions([]); 
          if(user?.id) await supabase.from('non_profit_transactions').delete().eq('user_id', user.id);
      }
  };

  const handleMarkAsRead = (id: string) => {
    const u = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(u);
    localStorage.setItem("appNotifications", JSON.stringify(u));
  };
  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("appNotifications");
  };

  const handleDeleteBatch = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} items?`)) return;
    if (user?.id)
      await supabase
        .from("transactions")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);
    const txsToDelete = transactions.filter((t) => ids.includes(t.id));
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    setAccounts((prevAccounts) => {
      const accMap = new Map<string, Account>(
        prevAccounts.map((a) => [a.id, { ...a }]),
      );
      txsToDelete.forEach((tx) => {
        const acc = accMap.get(tx.accountId);
        if (acc) {
          if (tx.type === "EXPENSE") acc.balance += tx.amount;
          else if (tx.type === "INCOME") acc.balance -= tx.amount;
          else if (tx.type === "TRANSFER" && tx.toAccountId) {
            acc.balance += tx.amount;
            const dest = accMap.get(tx.toAccountId);
            if (dest) dest.balance -= tx.amount;
          }
        }
      });
      return Array.from(accMap.values());
    });
  };

  // UPDATE 3: Edit Akun + Auto Adjustment Transaction
  const handleSaveAccountEdit = async () => {
    if (!editingAccount) return;

    // 1. Cari akun lama untuk hitung selisih
    const oldAccount = accounts.find((a) => a.id === editingAccount.id);
    if (!oldAccount) return;

    const diff = editingAccount.balance - oldAccount.balance;
    let adjustmentTx: Transaction | null = null;

    // 2. Jika saldo berubah, siapkan transaksi Adjustment
    if (diff !== 0) {
      adjustmentTx = {
        id: `adj-${Date.now()}`,
        date: new Date().toISOString(),
        type: diff > 0 ? "INCOME" : "EXPENSE",
        amount: Math.abs(diff),
        accountId: editingAccount.id,
        category: "Adjustment",
        notes: "Manual Balance Adjustment",
      };
    }

    // 3. Update Database (Akun & Transaksi Baru)
    if (user?.id) {
      await supabase
        .from("accounts")
        .update({ name: editingAccount.name, balance: editingAccount.balance })
        .eq("id", editingAccount.id);

      if (adjustmentTx) {
        await supabase.from("transactions").insert([
          {
            user_id: user.id,
            amount: adjustmentTx.amount,
            type: adjustmentTx.type,
            category: adjustmentTx.category,
            note: adjustmentTx.notes,
            date: adjustmentTx.date,
            account_id: adjustmentTx.accountId,
          },
        ]);
      }
    }

    // 4. Update State Lokal (Akun)
    setAccounts((prev) =>
      prev.map((a) => (a.id === editingAccount.id ? editingAccount : a)),
    );

    // 5. Update State Lokal (Transaksi) jika ada adjustment
    if (adjustmentTx) {
      setTransactions((prev) => [adjustmentTx!, ...prev]);
    }

    // 6. FIX BUG: Update tampilan Detail Akun jika sedang dibuka
    if (
      selectedAccountForDetail &&
      selectedAccountForDetail.id === editingAccount.id
    ) {
      setSelectedAccountForDetail(editingAccount);
    }

    setShowEditAccountModal(false);
    setEditingAccount(null);
  };

  
  // UPDATE: Delete Account dengan History & Notif
  const handleDeleteAccount = async (id: string) => { 
      const acc = accounts.find(a => a.id === id);
      if(confirm('Delete Account?')) { 
          if(user?.id) { 
              try { 
                  await supabase.from('transactions').delete().eq('account_id', id); 
                  await supabase.from('accounts').delete().eq('id', id); 
              } catch(e){} 
          } 
          
          // 1. Catat History Penghapusan (Tanpa Saldo)
          const deleteTx: Transaction = {
              id: `del-${Date.now()}`,
              date: new Date().toISOString(),
              type: 'EXPENSE',
              amount: 0, 
              accountId: 'deleted-account', 
              category: 'System',
              notes: `Account '${acc?.name}' has been deleted`
          };
          setTransactions(prev => [deleteTx, ...prev]);

          // 2. Kirim Notifikasi (ALERT)
          addNotification('Account Deleted', `Account ${acc?.name || 'Unknown'} has been permanently deleted.`, 'ALERT');

          // 3. Hapus dari State
          setAccounts(prev => prev.filter(a => a.id !== id)); 
      } 
  };

  const handleDeleteTransaction = async (id: string) => {
    handleDeleteBatch([id]);
  };

  // NEW: Helper untuk Manage Kategori/Grup
  const handleManageItem = (
    action: "ADD" | "DELETE" | "RENAME",
    type: "EXPENSE" | "INCOME" | "GROUP",
    value: string,
    newValue?: string,
  ) => {
    const setter =
      type === "EXPENSE"
        ? setExpenseCategories
        : type === "INCOME"
          ? setIncomeCategories
          : setAccountGroups;

    if (action === "ADD" && value) {
      setter((prev) => [...prev, value]);
    } else if (action === "DELETE") {
      if (confirm(`Delete ${value}?`))
        setter((prev) => prev.filter((item) => item !== value));
    } else if (action === "RENAME" && newValue) {
      setter((prev) => prev.map((item) => (item === value ? newValue : item)));
    }
  };

  const onAddPress = () => { 
      setNewTxDate(format(new Date(), 'yyyy-MM-dd')); 
      if (selectedAccountForDetail) { 
          setNewTxAccountId(selectedAccountForDetail.id); 
          // Auto-select Filter berdasarkan Owner Akun
          setNewTxOwnerFilter(selectedAccountForDetail.owner || 'All');
          // Default tujuan transfer disamakan dulu (bisa diubah user nanti)
          setNewTxToOwnerFilter(selectedAccountForDetail.owner || 'All');
      } else { 
          setNewTxAccountId(''); 
          setNewTxOwnerFilter('All'); 
          setNewTxToOwnerFilter('All'); // Default Reset
      } 
      setShowTransactionModal(true); 
  };

  const handleSubmitTransaction = async () => {
    const val = parseFloat(newTxAmount);
    if (!val || !newTxAccountId) return;

    const txData: Transaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString(),
      type: newTxType,
      amount: val,
      accountId: newTxAccountId,
      category: newTxCategory,
      notes: newTxNotes,
      toAccountId: newTxType === "TRANSFER" ? newTxToAccountId : undefined,
    };

    if (user?.id)
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          amount: val,
          type: newTxType,
          category: newTxCategory,
          note: newTxNotes,
          date: txData.date,
          account_id: newTxAccountId,
          to_account_id: txData.toAccountId,
        },
      ]);

    setTransactions((prev) => [txData, ...prev]);
    setAccounts((prev) =>
      prev.map((a) => {
        let b = a.balance;
        if (a.id === newTxAccountId) {
          if (newTxType === "INCOME") b += val;
          else b -= val;
        }
        if (newTxType === "TRANSFER" && a.id === newTxToAccountId) b += val;
        return { ...a, balance: b };
      }),
    );
    setShowTransactionModal(false);
    setNewTxAmount("");
    setNewTxNotes("");
  };

  const handleSubmitNewAccount = async () => {
    if (!newAccName) return;
    const acc: Account = {
      id: `acc_${Date.now()}`,
      name: newAccName,
      group: "Bank Accounts",
      balance: parseFloat(newAccBalance) || 0,
      currency: "IDR",
      includeInTotals: true,
      owner: newAccOwner,
    };
    if (user?.id)
      await supabase.from("accounts").insert([
        {
          id: acc.id,
          user_id: user.id,
          name: acc.name,
          balance: acc.balance,
          owner: acc.owner,
        },
      ]);
    setAccounts((prev) => [...prev, acc]);
    setShowAddAccountModal(false);
  };
  // UPDATE 3: Simpan Akun Haji Baru ke Database
  const handleAddNonProfitAccount = async (name: string, owner: AccountOwner, target: number, initialBalance: number) => { 
      const newAcc: NonProfitAccount = { id: `np_${Date.now()}`, name, owner, balance: initialBalance, target }; 
      
      if(user?.id) {
          await supabase.from('non_profit_accounts').insert([{ id: newAcc.id, user_id: user.id, name, owner, balance: initialBalance, target }]);
          
          if (initialBalance > 0) {
              const tx = { id: `init_${Date.now()}`, date: new Date().toISOString(), amount: initialBalance, account_id: newAcc.id, notes: 'Saldo Awal' };
              await supabase.from('non_profit_transactions').insert([{ ...tx, user_id: user.id }]);
              setNonProfitTransactions(prev => [...prev, { ...tx, accountId: newAcc.id }]);
          }
      }
      setNonProfitAccounts(prev => [...prev, newAcc]); 
  };

  const handleDeleteNonProfitAccount = (id: string) => {
    if (confirm("Delete?")) {
      setNonProfitAccounts((prev) => prev.filter((a) => a.id !== id));
      setNonProfitTransactions((prev) =>
        prev.filter((t) => t.accountId !== id),
      );
    }
  };
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedAccountForDetail(null);
    setShowAssetAnalytics(false);
  };
  const openEditAccountModal = (acc: Account) => {
    setEditingAccount({ ...acc });
    setShowEditAccountModal(true);
  };
  const t = (key: string) => {
    const dict: any = {
      settings: lang === "en" ? "Settings" : "Pengaturan",
      language: lang === "en" ? "Language" : "Bahasa",
      accentColor: lang === "en" ? "Accent Color" : "Warna Aksen",
      custom: lang === "en" ? "Custom" : "Kustom",
      bgTheme: lang === "en" ? "Background Theme" : "Tema Latar",
      dataMgmt: lang === "en" ? "Data Management" : "Manajemen Data",
      resetData: lang === "en" ? "Reset Data" : "Reset Data",
      confirmReset: lang === "en" ? "Are you sure?" : "Anda yakin?",
    };
    return dict[key] || key;
  };

  // --- RENDER ACCOUNTS ---
  const renderAccountsTab = () => {
    const formatCurrency = (v: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(v);
    const renderList = (list: Account[]) => (
      <div className="space-y-4">
        {["Cash", "Bank Accounts", "Credit Cards", "Investments", "Loans"].map(
          (g) => {
            const grp = list.filter((a) => a.group === g);
            if (grp.length === 0) return null;
            return (
              <div
                key={g}
                className="bg-white/5 rounded-xl overflow-hidden border border-white/5"
              >
                <div className="px-4 py-2 bg-white/5 flex justify-between">
                  <div className="flex gap-2">
                    <Layers className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-bold text-gray-300 uppercase">
                      {g}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatCurrency(grp.reduce((s, a) => s + a.balance, 0))}
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {grp.map((a) => (
                    <AccountCard
                      key={a.id}
                      account={a}
                      onEdit={(a) => setSelectedAccountForDetail(a)}
                      listView={true}
                      isDeleteMode={isManageMode}
                      onDelete={() => handleDeleteAccount(a.id)}
                      onRename={(acc) => openEditAccountModal(acc)}
                    />
                  ))}
                </div>
              </div>
            );
          },
        )}
      </div>
    );
    const hus = accounts.filter((a) => a.owner === "Husband"),
      wif = accounts.filter((a) => a.owner === "Wife");
    return (
      <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-surface p-4 rounded-xl border border-white/10 group relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/10 opacity-50"></div>
            <div className="relative">
              <p className="text-emerald-400 text-xs font-bold uppercase mb-1">
                Total Assets
              </p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}
              </p>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-white/10">
            <p className="text-gray-400 text-xs font-bold uppercase mb-2">
              Husband
            </p>
            <p className="text-xl font-bold text-indigo-400">
              {formatCurrency(hus.reduce((s, a) => s + a.balance, 0))}
            </p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-white/10">
            <p className="text-gray-400 text-xs font-bold uppercase mb-2">
              Wife
            </p>
            <p className="text-xl font-bold text-pink-400">
              {formatCurrency(wif.reduce((s, a) => s + a.balance, 0))}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex-1 py-3 bg-indigo-600 font-bold rounded-xl text-white shadow-lg flex justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Account
          </button>
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-4 py-3 font-bold rounded-xl flex justify-center gap-2 shadow-lg ${isManageMode ? "bg-rose-600 text-white" : "bg-white/10 text-gray-300"}`}
          >
            {isManageMode ? (
              <X className="w-5 h-5" />
            ) : (
              <Edit3 className="w-5 h-5" />
            )}{" "}
            {isManageMode ? "Done" : "Manage"}
          </button>
        </div>
        <div className="space-y-8">
          {hus.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-indigo-400 uppercase pl-1">
                Husband's Accounts
              </h3>
              {renderList(hus)}
            </div>
          )}
          {wif.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-pink-400 uppercase pl-1">
                Wife's Accounts
              </h3>
              {renderList(wif)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (showAssetAnalytics)
      return (
        <AssetAnalytics
          transactions={transactions}
          accounts={accounts}
          onBack={() => setShowAssetAnalytics(false)}
          scope={analyticsScope}
        />
      );
    if (selectedAccountForDetail)
      return (
        <AccountDetail
          account={selectedAccountForDetail}
          transactions={transactions}
          onBack={() => setSelectedAccountForDetail(null)}
          onEdit={openEditAccountModal}
          onViewStats={(a) => {
            setAnalyticsScope({ type: "ACCOUNT", accountId: a.id });
            setShowAssetAnalytics(true);
          }}
        />
      );
    switch (activeTab) {
      case "trans":
        return (
          <TransactionHistory
            transactions={transactions}
            accounts={accounts}
            lang={lang}
            onSelectAccount={setSelectedAccountForDetail}
            onDelete={handleDeleteTransaction}
            onDeleteBatch={handleDeleteBatch}
          />
        );
      case "stats":
        return (
          <div className="h-full overflow-y-auto pb-24">
            <Reports
              transactions={transactions}
              accounts={accounts}
              lang={lang}
              marketData={marketData}
            />
          </div>
        );
      case "accounts":
        return renderAccountsTab();
      // UPDATE 5: Render Halaman Haji dengan Logika Transaksi Database
          case 'non-profit': return <NonProfit 
              accounts={nonProfitAccounts} 
              transactions={nonProfitTransactions} 
              mainAccounts={accounts} 
              onClearHistory={handleClearHajjHistory} 
              lang={lang} 
              currency={currency} 
              onAddAccount={handleAddNonProfitAccount} 
              onDeleteAccount={handleDeleteNonProfitAccount} 
              onAddTransaction={async (tx, src)=>{ 
                  // A. Catat Transaksi Haji (Local & DB)
                  setNonProfitTransactions(p=>[...p, tx]); 
                  if(user?.id) await supabase.from('non_profit_transactions').insert([{ id: tx.id, user_id: user.id, account_id: tx.accountId, amount: tx.amount, date: tx.date, notes: tx.notes }]);

                  // B. Update Saldo Akun Haji (Local & DB)
                  const currentBal = nonProfitAccounts.find(a => a.id === tx.accountId)?.balance || 0;
                  const newBalance = currentBal + tx.amount;
                  setNonProfitAccounts(p => p.map(a => a.id === tx.accountId ? { ...a, balance: newBalance } : a));
                  if(user?.id) await supabase.from('non_profit_accounts').update({ balance: newBalance }).eq('id', tx.accountId);

                  // C. Jika Transfer dari Akun Utama (Kurangi Saldo Bank)
                  if(src) { 
                      const t: Transaction = { id:'tr-'+tx.id, date:tx.date, type:'EXPENSE', amount:tx.amount, accountId:src, category:'Non-Profit Transfer', notes:'Transfer to '+tx.accountId }; 
                      if(user?.id) await supabase.from('transactions').insert([{ user_id: user.id, amount: t.amount, type: t.type, category: t.category, note: t.notes, date: t.date, account_id: t.accountId }]);
                      setTransactions(p=>[t,...p]); 
                      
                      const mainAcc = accounts.find(a => a.id === src);
                      if (mainAcc) {
                          const newMainBal = mainAcc.balance - t.amount;
                          setAccounts(p=>p.map(a=>a.id===src?{...a, balance:newMainBal}:a));
                          if(user?.id) await supabase.from('accounts').update({ balance: newMainBal }).eq('id', src);
                      }
                  } 
              }} 
              onUpdateBalance={async (id, bal) => {
                  setNonProfitAccounts(p=>p.map(a=>a.id===id?{...a, balance:bal}:a));
                  if(user?.id) await supabase.from('non_profit_accounts').update({ balance: bal }).eq('id', id);
              }} 
              onComplete={async (id) => {
                  setNonProfitAccounts(p=>p.map(a=>a.id===id?{...a, balance:0}:a));
                  if(user?.id) await supabase.from('non_profit_accounts').update({ balance: 0 }).eq('id', id);
              }} 
          />;

      case 'zakat': return <ZakatMal 
              accounts={accounts} 
              transactions={transactions} 
              lang={lang} // Fix 1: Bahasa
              onNotify={addNotification} // Fix 2: Kirim fungsi notifikasi
              onAddTransaction={async (tx)=>{ 
                  setTransactions(p=>[tx,...p]); 
                  addNotification('Zakat Paid', `Zakat payment recorded.`, 'SUCCESS'); // Notif Bayar
                  if(user?.id) await supabase.from('transactions').insert([{ user_id: user.id, amount: tx.amount, type: tx.type, category: tx.category, note: tx.notes, date: tx.date, account_id: tx.accountId }]);
                  
                  const acc = accounts.find(a => a.id === tx.accountId);
                  if(acc) {
                      const newBal = acc.balance - tx.amount;
                      setAccounts(p=>p.map(a=>a.id===tx.accountId?{...a, balance:newBal}:a));
                      if(user?.id) await supabase.from('accounts').update({ balance: newBal }).eq('id', tx.accountId);
                  }
              }} 
          />;

      case "more":
        return (
          <div className="p-4 space-y-4 overflow-y-auto h-full pb-24">
            {/* USER PROFILE CARD */}
            {user && (
              <div className="bg-surface p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-main)]">
                      {user.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10"
                >
                  Log Out
                </button>
              </div>
            )}

            {/* SETTINGS CARD */}
            <div className="bg-surface p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-lg mb-4 text-[var(--text-main)]">
                {t("settings")}
              </h3>
              <div className="space-y-4">
                {/* LANGUAGE */}
                <button
                  onClick={() => setLang(lang === "en" ? "id" : "en")}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <span className="text-[var(--text-main)]">
                    {t("language")}
                  </span>
                  <span className="text-primary font-bold">
                    {lang.toUpperCase()}
                  </span>
                </button>

                {/* CURRENCY */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-[var(--text-main)]">Currency</span>
                  <div className="flex bg-black/20 p-1 rounded-lg">
                    <button
                      onClick={() => setCurrency("IDR")}
                      className={`px-3 py-1 rounded-md text-xs font-bold ${currency === "IDR" ? "bg-emerald-600 text-white" : "text-gray-500"}`}
                    >
                      IDR
                    </button>
                    <button
                      onClick={() => setCurrency("USD")}
                      className={`px-3 py-1 rounded-md text-xs font-bold ${currency === "USD" ? "bg-blue-600 text-white" : "text-gray-500"}`}
                    >
                      USD
                    </button>
                  </div>
                </div>

                {/* APP LOCK */}
                <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2 text-[var(--text-main)]">
                      {appPin ? (
                        <Lock className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-500" />
                      )}{" "}
                      App Lock
                    </p>
                  </div>
                  {appPin ? (
                    <button
                      onClick={handleDisablePin}
                      className="text-xs font-bold text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPinSetup(true)}
                      className="text-xs font-bold text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {/* --- CUSTOMIZATION SECTION --- */}

                {/* 1. ACCENT COLOR */}
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-[var(--text-muted)] uppercase font-bold">
                      {t("accentColor")}
                    </span>
                    <Pipette className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_PRESETS.map((acc) => (
                      <button
                        key={acc.name}
                        onClick={() => setCurrentAccent(acc.name)}
                        className={`w-8 h-8 rounded-full border-2 ${currentAccent === acc.name ? "border-[var(--text-main)]" : "border-transparent"}`}
                        style={{ backgroundColor: acc.value }}
                      />
                    ))}
                    <div className="relative">
                      <input
                        ref={accentInputRef}
                        type="color"
                        value={customAccentHex}
                        onChange={(e) => {
                          setCustomAccentHex(e.target.value);
                          setCurrentAccent("Custom");
                        }}
                        className="opacity-0 absolute left-0 top-0 w-full h-full cursor-pointer"
                      />
                      <button
                        onClick={() => accentInputRef.current?.click()}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${currentAccent === "Custom" ? "border-[var(--text-main)]" : "border-gray-600"}`}
                        style={{
                          backgroundColor:
                            currentAccent === "Custom"
                              ? customAccentHex
                              : "transparent",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. BACKGROUND & FONT COLOR (GRID) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2 z-10 relative">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
                        Background
                      </span>
                      <Palette className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex gap-2 items-center z-10 relative">
                      <div
                        className="w-full h-8 rounded border border-white/10"
                        style={{ backgroundColor: customBgHex }}
                      ></div>
                      <input
                        ref={bgInputRef}
                        type="color"
                        value={customBgHex}
                        onChange={(e) => setCustomBgHex(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2 z-10 relative">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
                        Font Color
                      </span>
                      <Type className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex gap-2 items-center z-10 relative">
                      <div
                        className="w-full h-8 rounded border border-white/10"
                        style={{ backgroundColor: customTextHex }}
                      ></div>
                      <input
                        ref={textInputRef}
                        type="color"
                        value={customTextHex}
                        onChange={(e) => setCustomTextHex(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DATA MANAGEMENT CARD */}
            <div className="bg-surface p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-lg mb-4 text-[var(--text-main)]">
                {t("dataMgmt")}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleExportFile("json")}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-[var(--text-main)]"
                >
                  <div className="flex items-center">
                    <FileJson className="w-5 h-5 text-yellow-500 mr-3" />
                    <span>Export JSON</span>
                  </div>
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleExportFile("csv")}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-[var(--text-main)]"
                >
                  <div className="flex items-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-500 mr-3" />
                    <span>Export CSV</span>
                  </div>
                  <Download className="w-4 h-4" />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                  accept=".json"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-gray-700 text-[var(--text-main)]"
                >
                  <div className="flex items-center">
                    <Upload className="w-5 h-5 text-blue-500 mr-3" />
                    <span>Import Data</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(t("confirmReset"))) {
                      setAccounts([]);
                      setTransactions([]);
                      setNonProfitAccounts([]);
                      setNonProfitTransactions([]);
                      localStorage.removeItem("financeProData");
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-red-900/20 text-red-500"
                >
                  <div className="flex items-center">
                    <Trash2 className="w-5 h-5 mr-3" />
                    <span>{t("resetData")}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isAuthLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#18181b] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onAddPress={onAddPress}
      user={user}
      onAuthRequest={() => {
        setShowAuthModal(true);
        setAuthMode("LOGIN");
      }}
      onLogout={handleLogout}
      lang={lang}
      setLang={setLang}
    >
      {isLocked && appPin && !hasUnlockedSession && (
        <LockScreen
          correctPin={appPin}
          onUnlock={onUnlockSuccess}
          onForgot={handleForgotPin}
        />
      )}
      <NotificationBell
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearNotifications}
      />
      {renderContent()}
      {/* NEW ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Add Account</h3>
              {/* 2c. Close Button */}
              <button onClick={() => setShowAddAccountModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 2a. Owner Selection */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  Owner
                </label>
                <div className="flex bg-black/30 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setNewAccOwner("Husband")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === "Husband" ? "bg-indigo-600 text-white" : "text-gray-400"}`}
                  >
                    Husband
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccOwner("Wife")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAccOwner === "Wife" ? "bg-pink-600 text-white" : "text-gray-400"}`}
                  >
                    Wife
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                  placeholder="e.g. BCA, Wallet"
                />
              </div>

              {/* 2b. Account Group + Gear */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-gray-400 uppercase font-bold">
                    Group
                  </label>
                  <button
                    onClick={() => setIsManagingGroups(!isManagingGroups)}
                    className="text-gray-400 hover:text-primary"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>

                {isManagingGroups ? (
                  <div className="bg-[#18181b] p-2 rounded-xl border border-white/10 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={manageItemName}
                        onChange={(e) => setManageItemName(e.target.value)}
                        className="flex-1 bg-white/5 text-xs text-white p-2 rounded"
                        placeholder="New Group..."
                      />
                      <button
                        onClick={() => {
                          handleManageItem("ADD", "GROUP", manageItemName);
                          setManageItemName("");
                        }}
                        className="bg-emerald-600 p-2 rounded text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {accountGroups.map((grp) => (
                        <div
                          key={grp}
                          className="flex justify-between items-center text-xs text-gray-300 bg-white/5 p-2 rounded"
                        >
                          <span>{grp}</span>
                          <button
                            onClick={() =>
                              handleManageItem("DELETE", "GROUP", grp)
                            }
                            className="text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <select
                    onChange={(e) => {
                      /* Logic grup disimpan ke state jika perlu, default Bank Accounts */
                    }}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary appearance-none"
                  >
                    {accountGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  Balance
                </label>
                <CurrencyInput
                  value={newAccBalance}
                  onChange={setNewAccBalance}
                  currency={currency}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl p-3 text-white text-right outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleSubmitNewAccount}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg mt-2"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TRANSACTION MODAL */}
        {showTransactionModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
            
            {/* 1. TABS TIPE TRANSAKSI */}
            <div className="flex bg-[#18181b] p-1 border-b border-white/10">
                <button onClick={() => setNewTxType('EXPENSE')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${newTxType === 'EXPENSE' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Expense</button>
                <button onClick={() => setNewTxType('INCOME')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${newTxType === 'INCOME' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Income</button>
                <button onClick={() => setNewTxType('TRANSFER')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${newTxType === 'TRANSFER' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Transfer</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
                
                {/* 2. FILTER OWNER SUMBER (FROM) */}
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">{newTxType === 'TRANSFER' ? 'From Owner' : 'Wallet Owner'}</label>
                    <div className="flex bg-black/30 p-1 rounded-lg mb-2">
                        <button type="button" onClick={() => setNewTxOwnerFilter('Husband')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newTxOwnerFilter === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Husband</button>
                        <button type="button" onClick={() => setNewTxOwnerFilter('Wife')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newTxOwnerFilter === 'Wife' ? 'bg-pink-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Wife</button>
                    </div>
                </div>

                {newTxType === 'TRANSFER' ? (
                   // --- TAMPILAN TRANSFER ---
                   <div className="space-y-5">
                       {/* FROM ACCOUNT */}
                       <div>
                           <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">From Account</label>
                           <div className="relative">
                               <select value={newTxAccountId} onChange={e=>setNewTxAccountId(e.target.value)} className="w-full bg-[#18181b] p-4 pr-10 rounded-xl border border-white/10 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer">
                                   <option value="" disabled>Select Source</option>
                                   {accounts.filter(a => a.owner === newTxOwnerFilter).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                               </select>
                               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-50 pointer-events-none" />
                           </div>
                       </div>
                       
                       {/* FILTER OWNER TUJUAN (TO) */}
                       <div className="pt-2 border-t border-white/5">
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">To Owner</label>
                            <div className="flex bg-black/30 p-1 rounded-lg mb-2">
                                <button type="button" onClick={() => setNewTxToOwnerFilter('Husband')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newTxToOwnerFilter === 'Husband' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Husband</button>
                                <button type="button" onClick={() => setNewTxToOwnerFilter('Wife')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newTxToOwnerFilter === 'Wife' ? 'bg-pink-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Wife</button>
                            </div>
                       </div>

                       {/* TO ACCOUNT */}
                       <div>
                           <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">To Account</label>
                           <div className="relative">
                               <select value={newTxToAccountId} onChange={e=>setNewTxToAccountId(e.target.value)} className="w-full bg-[#18181b] p-4 pr-10 rounded-xl border border-white/10 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer">
                                   <option value="" disabled>Select Destination</option>
                                   {accounts
                                        .filter(a => a.owner === newTxToOwnerFilter)
                                        .filter(a => a.id !== newTxAccountId)
                                        .map(a=><option key={a.id} value={a.id}>{a.name}</option>)
                                   }
                               </select>
                               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-50 pointer-events-none" />
                           </div>
                       </div>
                   </div>
                ) : (
                    // --- TAMPILAN EXPENSE / INCOME ---
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Account</label>
                        <div className="relative">
                            <select value={newTxAccountId} onChange={e=>setNewTxAccountId(e.target.value)} className="w-full bg-[#18181b] p-4 pr-10 rounded-xl border border-white/10 text-white outline-none focus:border-primary appearance-none cursor-pointer">
                                <option value="" disabled>Select Account</option>
                                {accounts.filter(a => a.owner === newTxOwnerFilter).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-50 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* AMOUNT INPUT */}
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Amount</label>
                    <CurrencyInput value={newTxAmount} onChange={setNewTxAmount} currency={currency} className="bg-[#18181b] border border-white/10 rounded-xl p-4 text-3xl font-bold text-white text-right outline-none focus:border-white/30" placeholder="0" autoFocus />
                </div>

                {/* CATEGORY (EXPENSE/INCOME ONLY) */}
                {newTxType !== 'TRANSFER' && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Category</label>
                            <button onClick={() => setIsManagingCategories(!isManagingCategories)} className={`p-1 rounded hover:bg-white/10 ${isManagingCategories ? 'text-primary' : 'text-gray-400'}`}><Settings className="w-3 h-3" /></button>
                        </div>
                        
                        {isManagingCategories ? (
                             <div className="bg-[#18181b] p-3 rounded-xl border border-white/10 space-y-3 animate-in fade-in">
                                <div className="flex gap-2"><input value={manageItemName} onChange={e=>setManageItemName(e.target.value)} className="flex-1 bg-white/5 text-sm text-white p-2 rounded outline-none border border-transparent focus:border-primary" placeholder="New Category..." /><button onClick={() => { handleManageItem('ADD', newTxType, manageItemName); setManageItemName(''); }} className="bg-primary p-2 rounded text-white"><Plus className="w-4 h-4"/></button></div>
                                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">{(newTxType === 'INCOME' ? incomeCategories : expenseCategories).map(cat => (
                                    <div key={cat} className="flex justify-between items-center text-sm text-gray-300 bg-white/5 p-2 rounded hover:bg-white/10"><span>{cat}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { const newName = prompt("Rename to:", cat); if(newName) handleManageItem('RENAME', newTxType, cat, newName); }} className="text-amber-400"><Edit3 className="w-3 h-3"/></button>
                                        <button onClick={() => handleManageItem('DELETE', newTxType, cat)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>
                                    </div></div>
                                ))}</div>
                                <button onClick={() => setIsManagingCategories(false)} className="w-full py-2 bg-white/5 text-xs text-gray-400 rounded hover:bg-white/10">Done Managing</button>
                             </div>
                        ) : (
                            <div className="relative">
                                <select value={newTxCategory} onChange={e=>setNewTxCategory(e.target.value)} className="w-full bg-[#18181b] p-4 pr-10 rounded-xl border border-white/10 text-white outline-none focus:border-primary appearance-none cursor-pointer">
                                    {(newTxType === 'INCOME' ? incomeCategories : expenseCategories).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-50 pointer-events-none" />
                            </div>
                        )}
                    </div>
                )}
                
                {/* NOTES */}
                <div>
                     <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Note (Optional)</label>
                     <input type="text" value={newTxNotes} onChange={e=>setNewTxNotes(e.target.value)} className="w-full bg-[#18181b] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary" placeholder="Description..." />
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-3 pt-4">
                    <button onClick={()=>setShowTransactionModal(false)} className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={handleSubmitTransaction} className="flex-[2] py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg">Save Transaction</button>
                </div>
            </div>
        </div>
        </div>
        )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-6">
              {authMode === "LOGIN" ? "Login" : "Register"}
            </h3>
            {authError && (
              <p className="text-red-400 text-xs mb-4">{authError}</p>
            )}
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-white/5 p-3 rounded-xl text-white"
              />
              <input
                type="password"
                placeholder="Password"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                className="w-full bg-white/5 p-3 rounded-xl text-white"
              />
              {authMode === "LOGIN" ? (
                <button
                  onClick={handleLocalLogin}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Login
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* EDIT ACCOUNT MODAL (WITH PENCIL) */}
      {showEditAccountModal && editingAccount && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <Pencil className="w-12 h-12 text-amber-500 mx-auto mb-4 bg-amber-500/10 p-3 rounded-full" />
              <h3 className="text-lg font-bold text-white">Edit Account</h3>
              <p className="text-xs text-gray-400 mt-1">
                {editingAccount.name}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAccountEdit();
              }}
              className="space-y-4"
            >
              <div className="text-left">
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  Account Name
                </label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary"
                />
              </div>
              <div className="text-left">
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  Current Balance
                </label>
                <CurrencyInput
                  value={editingAccount.balance}
                  onChange={(val) =>
                    setEditingAccount({
                      ...editingAccount,
                      balance: parseFloat(val) || 0,
                    })
                  }
                  currency={currency}
                  className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditAccountModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PIN SETUP MODAL */}
      {showPinSetup && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-4">Set New PIN</h3>
            <input
              type="text"
              maxLength={6}
              value={newPinInput}
              onChange={(e) =>
                setNewPinInput(e.target.value.replace(/\D/g, ""))
              }
              className="bg-black/50 border border-emerald-500/50 text-white text-3xl font-bold tracking-[0.5em] text-center w-full py-4 rounded-xl outline-none mb-4"
              placeholder="••••••"
              autoFocus
            />
            <button
              onClick={handleCreatePin}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl"
            >
              Save PIN
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
