export type AccountGroup = 'Cash' | 'Bank Accounts' | 'Credit Cards' | 'Investments' | 'Loans';
export type AccountOwner = 'Husband' | 'Wife';

export interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  balance: number;
  currency: string;
  includeInTotals: boolean;
  owner?: AccountOwner; // Added owner field
  description?: string;
  type?: string;
  metadata?: {
    grams?: number;
    [key: string]: any;
  };
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: string;
  date: string; // ISO String
  type: TransactionType;
  amount: number;
  fees?: number; // For transfers
  accountId: string; // From Account
  toAccountId?: string; // To Account (for transfers)
  category: string;
  notes?: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
  total: number;
}

// --- NON PROFIT ISOLATED TYPES ---
export interface NonProfitAccount {
    id: string;
    name: string; // e.g., "Tabungan Haji Suami"
    owner: AccountOwner;
    balance: number;
    target?: number; // Optional target amount
}

export interface NonProfitTransaction {
    id: string;
    date: string;
    amount: number;
    accountId: string;
    notes?: string;
}