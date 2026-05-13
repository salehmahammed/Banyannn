import Dexie, { type Table } from 'dexie';
import { Transaction, Building, Category } from './types';

export class BunyanDatabase extends Dexie {
  transactions!: Table<Transaction>;
  buildings!: Table<Building>;
  categories!: Table<Category>;

  constructor() {
    super('BunyanDB');
    this.version(1).stores({
      transactions: 'id, buildingId, type, date, category',
      buildings: 'id, name, createdAt',
      categories: 'id, name, type'
    });
  }
}

export const db = new BunyanDatabase();
