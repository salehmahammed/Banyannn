import Dexie, { type Table } from 'dexie';
import { Transaction, Building, Category, BuildingAccount, AppSettings } from './types';

export class BunyanDatabase extends Dexie {
  transactions!: Table<Transaction>;
  buildings!: Table<Building>;
  categories!: Table<Category>;
  accounts!: Table<BuildingAccount>;
  settings!: Table<AppSettings>;

  constructor() {
    super('BunyanDB');
    this.version(3).stores({
      transactions: 'id, buildingId, accountId, type, date, category',
      buildings: 'id, name, createdAt',
      categories: 'id, name, type, color',
      accounts: 'id, buildingId, name, type',
      settings: 'id'
    });
  }
}

export const db = new BunyanDatabase();
