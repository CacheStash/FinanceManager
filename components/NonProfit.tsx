import React, { useState, useEffect } from "react";
import {
  NonProfitAccount,
  NonProfitTransaction,
  Account,
  AccountOwner,
} from "../types";
import {
  UserCircle2,
  Landmark,
  Plus,
  X,
  Pencil,
  BellRing,
  Trash2,
  PlusCircle,
  ArrowDownRight,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { format, isSameMonth, parseISO } from "date-fns";

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

interface NonProfitProps {
  accounts: NonProfitAccount[];
  transactions: NonProfitTransaction[];
  mainAccounts: Account[];
  onAddTransaction: (
    tx: NonProfitTransaction,
    sourceMainAccountId?: string,
  ) => void;
  onUpdateBalance: (accountId: string, newBalance: number) => void;
  onComplete: (accountId: string) => void;
  onClearHistory: () => void;
  onAddAccount: (
    name: string,
    owner: AccountOwner,
    target: number,
    initialBalance: number,
  ) => void;
  onDeleteAccount: (id: string) => void;
  lang?: "en" | "id";
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
  lang = "en",
  currency = "IDR",
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFundType, setNewFundType] = useState<"Haji" | "Umrah">("Haji");
  const [newOwner, setNewOwner] = useState<AccountOwner>("Husband");
  const [newTarget, setNewTarget] = useState("");
  const [newInitialBalance, setNewInitialBalance] = useState("");
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || "",
  );
  const [sourceType, setSourceType] = useState<"MANUAL" | "TRANSFER">("MANUAL");
  const [sourceMainAccountId, setSourceMainAccountId] = useState("");
  const [sourceOwnerFilter, setSourceOwnerFilter] =
    useState<AccountOwner>("Husband");
  const [targetAccount, setTargetAccount] = useState<NonProfitAccount | null>(
    null,
  );
  const [editBalanceValue, setEditBalanceValue] = useState("");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);

  // --- TRANSLATION DICTIONARY ---
  const t = (key: string) => {
    const dict: any = {
      title: lang === "en" ? "Hajj & Umrah" : "Haji & Umrah",
      newFund: lang === "en" ? "New Fund" : "Tabungan Baru",
      reminder: lang === "en" ? "Monthly Reminder" : "Pengingat Bulanan",
      reminderMsg:
        lang === "en"
          ? "Dont forget your deposit this month!"
          : "Jangan lupa setoran bulan ini!",
      noSavings: lang === "en" ? "No Savings Yet" : "Belum Ada Tabungan",
      createFirst: lang === "en" ? "Create Fund" : "Buat Tabungan",
      deposit: lang === "en" ? "Deposit" : "Setor",
      withdraw: lang === "en" ? "Withdraw/Use" : "Tunaikan",
      createTitle:
        lang === "en" ? "Create Hajj/Umrah Fund" : "Buat Tabungan Haji/Umrah",
      type: lang === "en" ? "Type" : "Tipe",
      owner: lang === "en" ? "Owner" : "Milik",
      husband: lang === "en" ? "Husband" : "Suami",
      wife: lang === "en" ? "Wife" : "Istri",
      target: lang === "en" ? "Target Amount" : "Target Dana",
      initialBal: lang === "en" ? "Initial Balance" : "Saldo Awal",
      save: lang === "en" ? "Save" : "Simpan",
      depositTitle: lang === "en" ? "Deposit Funds" : "Setor Dana",
      toAccount: lang === "en" ? "To Account" : "Ke Akun",
      source: lang === "en" ? "Source" : "Sumber Dana",
      cash: lang === "en" ? "Cash" : "Tunai",
      transfer: lang === "en" ? "Transfer" : "Transfer",
      selectSource:
        lang === "en" ? "Select Source Account" : "Pilih Akun Sumber",
      amount: lang === "en" ? "Amount" : "Jumlah",
      editTitle: lang === "en" ? "Edit Balance" : "Ubah Saldo",
      cancel: lang === "en" ? "Cancel" : "Batal",
      update: lang === "en" ? "Update" : "Update",
      completeTitle: lang === "en" ? "Complete / Withdraw" : "Tunaikan",
      completeDesc:
        lang === "en"
          ? "Funds will be used and balance reset to 0."
          : "Dana akan digunakan dan saldo di-reset ke 0.",
      collected: lang === "en" ? "Total Collected" : "Total Terkumpul",
      confirmComplete:
        lang === "en" ? "Bismillah, Complete" : "Bismillah, Tunaikan",
    };
    return dict[key] || key;
  };

  useEffect(() => {
    const checkMonthlyDeposit = () => {
      const now = new Date();
      const currentDay = now.getDate();
      if (currentDay > 20) {
        const hasDeposited = transactions.some((tx) => {
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

  const handleOpenDeposit = (accountId: string) => {
    setSelectedAccountId(accountId);
    const targetAcc = accounts.find((a) => a.id === accountId);
    if (targetAcc) {
      setSourceOwnerFilter(targetAcc.owner);
      const defaultSource = mainAccounts.find(
        (a) => a.owner === targetAcc.owner,
      );
      if (defaultSource) setSourceMainAccountId(defaultSource.id);
      else setSourceMainAccountId(mainAccounts[0]?.id || "");
    }
    setShowAddModal(true);
  };

  const handleSourceFilterChange = (owner: AccountOwner) => {
    setSourceOwnerFilter(owner);
    const firstAcc = mainAccounts.find((a) => a.owner === owner);
    if (firstAcc) setSourceMainAccountId(firstAcc.id);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount) || 0;
    const isInsufficientBalance =
      sourceType === "TRANSFER" &&
      mainAccounts.find((a) => a.id === sourceMainAccountId) &&
      numericAmount >
        (mainAccounts.find((a) => a.id === sourceMainAccountId)?.balance || 0);
    if (!amount || !selectedAccountId || isInsufficientBalance) return;
    onAddTransaction(
      {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amount: numericAmount,
        accountId: selectedAccountId,
        notes: notes || (sourceType === "TRANSFER" ? "Transfer" : "Deposit"),
      },
      sourceType === "TRANSFER" ? sourceMainAccountId : undefined,
    );
    setShowAddModal(false);
    setAmount("");
    setNotes("");
    setSourceType("MANUAL");
  };

  const handleEditBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetAccount && editBalanceValue) {
      onUpdateBalance(targetAccount.id, parseFloat(editBalanceValue));
      setShowEditModal(false);
      setTargetAccount(null);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const constructedName = `${newFundType} ${newOwner === "Husband" ? (lang === "en" ? "Husband" : "Suami") : lang === "en" ? "Wife" : "Istri"}`;
    onAddAccount(
      constructedName,
      newOwner,
      parseFloat(newTarget) || 0,
      parseFloat(newInitialBalance) || 0,
    );
    setShowCreateModal(false);
    setNewTarget("");
    setNewInitialBalance("");
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
      <div className="p-6 pt-32 pb-60 bg-surface rounded-b-[3rem] shadow-xl relative overflow-hidden text-center group">
        <div
          className="absolute inset-0 opacity-20 mix-blend-hard-light"
          style={{
            background: `linear-gradient(to bottom right, var(--color-primary), transparent)`,
          }}
        ></div>
        <div className="absolute top-0 right-0 p-4 opacity-10 mix-blend-overlay">
          <div className="w-32 h-32 bg-white rotate-45 border-4 border-white/50"></div>
        </div>
        <div className="absolute top-6 right-6 z-30">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3" /> {t("newFund")}
          </button>
        </div>
        <div className="relative z-10 mt-2">
          <h1 className="text-xl md:text-2xl font-serif text-white/80 mb-6 uppercase tracking-widest border-b border-white/20 inline-block pb-3">
            {t("title")}
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            {formatCurrency(totalBalance)}
          </h2>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-24 relative z-20">
        {showMonthlyReminder && accounts.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/50 p-4 rounded-2xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top-4 relative z-20 backdrop-blur-md">
            <div className="p-2 bg-rose-500 rounded-full text-white shrink-0 shadow-lg shadow-rose-900/50 animate-pulse">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-rose-400 font-bold text-sm mb-1">
                {t("reminder")}
              </h3>
              <p className="text-rose-200/80 text-xs leading-relaxed">
                {t("reminderMsg")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="bg-surface border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
                <Landmark className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                {t("noSavings")}
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg"
              >
                <PlusCircle className="w-5 h-5" /> {t("createFirst")}
              </button>
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <UserCircle2
                      className={`w-5 h-5 ${acc.owner === "Husband" ? "text-indigo-400" : "text-pink-400"}`}
                    />
                    <span className="font-semibold text-gray-200 text-sm">
                      {acc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {formatCurrency(acc.balance)}
                  </span>
                  {acc.target > 0 && (
                    <span className="text-xs text-gray-500">
                      / {formatCurrency(acc.target)}
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-6 opacity-50">
                  <div
                    className="h-full opacity-80"
                    style={{
                      width: `${Math.min((acc.balance / (acc.target || 1)) * 100, 100)}%`,
                      backgroundColor: "var(--color-primary)",
                    }}
                  ></div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleOpenDeposit(acc.id)}
                    className="relative flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all overflow-hidden group"
                  >
                    <div
                      className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    ></div>
                    <div className="relative z-10 flex items-center gap-2 text-white">
                      <Plus className="w-5 h-5" /> {t("deposit")}
                    </div>
                  </button>
                  <button
                    onClick={() => openCompleteModal(acc)}
                    disabled={acc.balance <= 0}
                    className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all bg-white/5 border border-white/10 text-gray-400 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Landmark className="w-4 h-4" /> {t("withdraw")}
                  </button>
                </div>
              </div>
            ))
          )}

          {/* UPDATE: HAJJ TRANSACTION HISTORY CARD */}
        <div className="mt-8">
            
            
            {transactions.length === 0 ? (
                // Tampilan Jika Kosong
                <div className="bg-surface border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-gray-600">
                        <Landmark className="w-6 h-6 opacity-50" />
                    </div>
                    <p className="text-gray-500 text-xs">
                        {lang === 'en' ? 'No transaction history yet.' : 'Belum ada riwayat transaksi.'}
                    </p>
                </div>
            ) : (
                // Tampilan List Transaksi
                <div className="bg-surface rounded-2xl border border-white/10 overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {transactions.slice(0, 10).map((tx, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                                        <ArrowDownRight className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-200">{tx.notes || 'Deposit'}</p>
                                        <p className="text-[10px] text-gray-500">{format(parseISO(tx.date), 'dd MMM yyyy, HH:mm')}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-emerald-400 text-sm">+{formatCurrency(tx.amount)}</span>
                            </div>
                        ))}
                    </div>
                    {transactions.length > 0 && (
                        <button onClick={onClearHistory} className="w-full py-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/5 font-medium flex items-center justify-center gap-2">
                            <Trash2 className="w-3 h-3" /> Clear History
                        </button>
                    )}
                </div>
            )}
        </div>

        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {t("createTitle")}
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("type")}
                </label>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setNewFundType("Haji")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newFundType === "Haji" ? "bg-emerald-600 text-white" : "text-gray-400"}`}
                  >
                    Haji
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFundType("Umrah")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newFundType === "Umrah" ? "bg-emerald-600 text-white" : "text-gray-400"}`}
                  >
                    Umrah
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("owner")}
                </label>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setNewOwner("Husband")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newOwner === "Husband" ? "bg-indigo-600 text-white" : "text-gray-400"}`}
                  >
                    {t("husband")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOwner("Wife")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newOwner === "Wife" ? "bg-pink-600 text-white" : "text-gray-400"}`}
                  >
                    {t("wife")}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("target")}
                </label>
                <CurrencyInput
                  value={newTarget}
                  onChange={(val) => setNewTarget(val)}
                  currency={currency}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("initialBal")}
                </label>
                <CurrencyInput
                  value={newInitialBalance}
                  onChange={(val) => setNewInitialBalance(val)}
                  currency={currency}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary font-bold text-lg text-right"
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t("save")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full md:w-[500px] bg-surface rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
              <h3 className="font-bold text-white text-lg">
                {t("depositTitle")}
              </h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleDepositSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("toAccount")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedAccountId === acc.id ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"}`}
                      style={
                        selectedAccountId === acc.id
                          ? {
                              borderColor: "var(--color-primary)",
                              color: "var(--color-primary)",
                              backgroundColor: "rgba(255,255,255,0.05)",
                            }
                          : {}
                      }
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("source")}
                </label>
                <div className="flex bg-white/5 p-1 rounded-lg mb-3">
                  <button
                    type="button"
                    onClick={() => setSourceType("MANUAL")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === "MANUAL" ? "text-white shadow" : "text-gray-400 hover:text-white"}`}
                    style={
                      sourceType === "MANUAL"
                        ? { backgroundColor: "var(--color-primary)" }
                        : {}
                    }
                  >
                    {t("cash")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("TRANSFER")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sourceType === "TRANSFER" ? "text-white shadow" : "text-gray-400 hover:text-white"}`}
                    style={
                      sourceType === "TRANSFER"
                        ? { backgroundColor: "#3b82f6" }
                        : {}
                    }
                  >
                    {t("transfer")}
                  </button>
                </div>
                {sourceType === "TRANSFER" && (
                  <div className="animate-in slide-in-from-top-2 space-y-3">
                    <div className="flex bg-white/5 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleSourceFilterChange("Husband")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === "Husband" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
                      >
                        {t("husband")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSourceFilterChange("Wife")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sourceOwnerFilter === "Wife" ? "bg-pink-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
                      >
                        {t("wife")}
                      </button>
                    </div>
                    <div className="relative">
                      <select 
                          value={sourceMainAccountId} 
                          onChange={e => setSourceMainAccountId(e.target.value)} 
                          className="w-full bg-surface-light text-white p-3 pr-10 rounded-xl border outline-none transition-colors border-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer"
                      >
                          {mainAccounts.filter(a => a.owner === sourceOwnerFilter).map(acc => (
                              <option key={acc.id} value={acc.id} className="bg-surface">{acc.name}</option>
                          ))}
                      </select>
                      {/* FIX: Arrow Style */}
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white opacity-50 pointer-events-none" />
                  </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                  {t("amount")}
                </label>
                <CurrencyInput
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  currency={currency}
                  className="bg-[#18181b] border border-white/10 rounded-xl p-4 text-2xl font-bold outline-none text-right focus:border-white/30 text-white placeholder-gray-600"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full font-bold py-4 rounded-xl mt-4 transition-all text-white relative overflow-hidden group"
              >
                <div
                  className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: "var(--color-primary)" }}
                ></div>
                <span className="relative z-10">{t("save")}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && targetAccount && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <Pencil className="w-12 h-12 text-amber-500 mx-auto mb-4 bg-amber-500/10 p-3 rounded-full" />
              <h3 className="text-lg font-bold text-white">{t("editTitle")}</h3>
              <p className="text-xs text-gray-400 mt-1">{targetAccount.name}</p>
            </div>
            <form onSubmit={handleEditBalanceSubmit} className="space-y-4">
              <CurrencyInput
                value={editBalanceValue}
                onChange={(val) => setEditBalanceValue(val)}
                currency={currency}
                className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {t("update")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && targetAccount && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-black rounded-t-[3rem] rounded-b-2xl border-2 border-amber-600 p-8 shadow-[0_0_50px_rgba(217,119,6,0.3)] animate-in zoom-in-95 duration-500 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-900/40 to-transparent"></div>
            <div className="w-20 h-20 bg-black border-2 border-amber-500 mx-auto mb-6 flex items-center justify-center rotate-45 shadow-lg shadow-amber-900/50">
              <div className="-rotate-45">
                <Landmark className="w-10 h-10 text-amber-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-amber-500 mb-2 font-serif">
              {t("completeTitle")}
            </h3>
            <p className="text-amber-200/60 text-sm mb-6 leading-relaxed">
              {t("completeDesc")}
            </p>
            <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-xl mb-8">
              <p className="text-xs text-amber-500/70 uppercase tracking-widest mb-1">
                {t("collected")}
              </p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(targetAccount.balance)}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCompleteSubmit}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-700 to-yellow-600 text-white font-bold text-lg shadow-lg hover:shadow-amber-500/20 transition-all active:scale-[0.98] border border-amber-400/30"
              >
                {t("confirmComplete")}
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-gray-500 text-sm py-2 hover:text-white transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NonProfit;
