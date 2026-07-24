import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Account, Order, LogEntry } from './types';

interface AppDB extends DBSchema {
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-name': string };
  };
  accounts: {
    key: string;
    value: Account;
    indexes: { 'by-customer': string };
  };
  orders: {
    key: string;
    value: Order;
    indexes: { 'by-customer': string, 'by-date': number };
  };
  history: {
    key: string;
    value: LogEntry;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('business-app-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('customers')) {
          const store = db.createObjectStore('customers', { keyPath: 'id' });
          store.createIndex('by-name', 'name');
        }
        if (!db.objectStoreNames.contains('accounts')) {
          const store = db.createObjectStore('accounts', { keyPath: 'id' });
          store.createIndex('by-customer', 'customerId');
        }
        if (!db.objectStoreNames.contains('orders')) {
          const store = db.createObjectStore('orders', { keyPath: 'id' });
          store.createIndex('by-customer', 'customerId');
          store.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('by-date', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

// Helper to log history
export async function logAction(action: string, details: string) {
  const db = await initDB();
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    action,
    details,
    timestamp: Date.now(),
  };
  await db.put('history', entry);
}
