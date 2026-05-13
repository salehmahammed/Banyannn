export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Building {
  id: string;
  name: string;
  createdAt: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  buildingId: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string; // ISO string
  notes?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expenses: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}
