import React, { useState } from 'react';
import { Transaction, Account } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface MarketData {
    usdRate: number;
    goldPrice: number;
    usdChange: number;
    goldChange: number;
    lastUpdated: string;
}

interface ReportsProps {
  transactions: Transaction[];
  accounts: Account[];
  lang?: 'en' | 'id';
  marketData?: MarketData; // NEW PROP
}

const Reports: React.FC<ReportsProps> = ({ transactions, accounts, lang = 'en', marketData }) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'breakdown'>('monthly');

  const t = (key: string) => {
    const dict: any = {
      'total_income': lang === 'en' ? 'TOTAL INCOME' : 'TOTAL PEMASUKAN',
      'total_expense': lang === 'en' ? 'TOTAL EXPENSE' : 'TOTAL PENGELUARAN',
      'net_period': lang === 'en' ? 'NET PERIOD' : 'BERSIH PERIODE',
      'expense_breakdown': lang === 'en' ? 'Expense Breakdown' : 'Rincian Pengeluaran',
      'income_breakdown': lang === 'en' ? 'Income Breakdown' : 'Rincian Pemasukan',
      'cashflow': lang === 'en' ? 'Cashflow' : 'Arus Kas',
    };
    return dict[key] || key;
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#6366f1'];

  // --- STATS CALCULATION ---
  const currentMonth = new Date();
  const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const totalIncome = currentMonthTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = currentMonthTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const expenseByCategory = currentMonthTx.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
  }, {} as Record<string, number>);

  const incomeByCategory = currentMonthTx.filter(t => t.type === 'INCOME').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
  }, {} as Record<string, number>);

  const expenseData = Object.keys(expenseByCategory).map(name => ({ name, value: expenseByCategory[name] })).sort((a,b) => b.value - a.value);
  const incomeData = Object.keys(incomeByCategory).map(name => ({ name, value: incomeByCategory[name] })).sort((a,b) => b.value - a.value);

  const formatShort = (val: number) => {
      if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' M';
      if (val >= 1000000) return (val / 1000000).toFixed(1) + ' jt';
      return (val / 1000).toFixed(0) + ' rb';
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* --- 1. GLOBAL MARKET STATS (NEW) --- */}
      {marketData && (
          <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface p-4 rounded-xl border border-white/10 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-12 h-12 text-blue-400" /></div>
                  <div className="relative z-10">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Kurs USD/IDR</p>
                      <h3 className="text-xl font-bold text-white">{formatCurrency(marketData.usdRate)}</h3>
                      <div className={`flex items-center text-xs mt-2 font-medium ${marketData.usdChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {marketData.usdChange > 0 ? <TrendingUp className="w-3 h-3 mr-1"/> : <TrendingDown className="w-3 h-3 mr-1"/>}
                          {Math.abs(marketData.usdChange).toFixed(2)}%
                      </div>
                  </div>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-white/10 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet className="w-12 h-12 text-yellow-400" /></div>
                  <div className="relative z-10">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Emas Antam/gr</p>
                      <h3 className="text-xl font-bold text-white">{formatCurrency(marketData.goldPrice)}</h3>
                      <div className={`flex items-center text-xs mt-2 font-medium ${marketData.goldChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {marketData.goldChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1"/> : <TrendingDown className="w-3 h-3 mr-1"/>}
                          {Math.abs(marketData.goldChange).toFixed(2)}%
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- 2. MAIN SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500"><TrendingUp className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-gray-400 uppercase">{t('total_income')}</span>
            </div>
            <h2 className="text-2xl font-bold text-emerald-400 tracking-tight">{formatShort(totalIncome)}</h2>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-500/10 rounded-full text-rose-500"><TrendingDown className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-gray-400 uppercase">{t('total_expense')}</span>
            </div>
            <h2 className="text-2xl font-bold text-rose-400 tracking-tight">{formatShort(totalExpense)}</h2>
        </div>
      </div>

      <div className={`p-4 rounded-xl text-center border font-bold text-sm ${net >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          {t('net_period')}: {net >= 0 ? '+' : ''}{formatShort(net)}
      </div>

      {/* --- 3. CHARTS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* EXPENSE PIE */}
          <div className="bg-surface p-5 rounded-2xl border border-white/10 flex flex-col h-[380px]">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div>{t('expense_breakdown')}</h3>
              </div>
              <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {expenseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Real Spend</span>
                      <span className="text-lg font-bold text-white">{formatShort(totalExpense)}</span>
                  </div>
              </div>
              <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                  {expenseData.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-300 truncate max-w-[100px]">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{formatShort(entry.value)}</span>
                              <span className="text-gray-500 w-8 text-right">{((entry.value / totalExpense) * 100).toFixed(1)}%</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* INCOME PIE */}
          <div className="bg-surface p-5 rounded-2xl border border-white/10 flex flex-col h-[380px]">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>{t('income_breakdown')}</h3>
              </div>
              <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={incomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {incomeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Real Income</span>
                      <span className="text-lg font-bold text-white">{formatShort(totalIncome)}</span>
                  </div>
              </div>
              <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                  {incomeData.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-300 truncate max-w-[100px]">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{formatShort(entry.value)}</span>
                              <span className="text-gray-500 w-8 text-right">{((entry.value / totalIncome) * 100).toFixed(1)}%</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* CASHFLOW BAR CHART */}
      <div className="bg-surface p-5 rounded-2xl border border-white/10 h-[300px]">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>{t('cashflow')}</h3>
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Month', in: totalIncome, out: totalExpense }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => formatShort(val)} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }} />
                  <Bar dataKey="in" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="out" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Reports;