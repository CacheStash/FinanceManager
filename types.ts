export type AccountOwner = 'Husband' | 'Wife';
export type AccountGroup = 'Cash' | 'Bank Accounts' | 'Credit Cards' | 'Investments' | 'Loans';

export interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  balance: number;
  currency: 'IDR' | 'USD';
  includeInTotals: boolean;
  owner?: AccountOwner;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  accountId: string;
  toAccountId?: string;
  category: string;
  notes?: string;
}

export interface NonProfitAccount {
  id: string;
  name: string;
  owner: AccountOwner;
  balance: number;
  target: number;
}

export interface NonProfitTransaction {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  notes?: string;
}

export interface MarketData {
    usdRate: number;
    goldPrice: number;
    usdChange: number; 
    goldChange: number; 
    lastUpdated: string;
}