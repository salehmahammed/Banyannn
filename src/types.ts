export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Building {
  id: string;
  name: string;
  createdAt: string;
  icon?: string;
  ownerId?: string;
  firmId?: string;
}

export interface Transaction {
  id: string;
  buildingId: string;
  accountId?: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string; // ISO string
  note?: string;
  quantity?: number;
  unitPrice?: number;
  ownerId?: string;
  firmId?: string;
}

export interface BuildingAccount {
  id: string;
  buildingId: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT' | 'OTHER';
  initialBalance: number;
  ownerId?: string;
  firmId?: string;
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
  color?: string;
  icon?: string;
  ownerId?: string;
  firmId?: string;
}

export interface UserRole {
  uid: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  firmId: string;
  displayName?: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  currencySymbol: string;
  currencyPosition: 'BEFORE' | 'AFTER';
}
