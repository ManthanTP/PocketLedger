export interface Account {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'UPI Wallet' | 'Credit Card' | 'Other';
  openingBalance: number;
  currentBalance: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category?: string; // Null for transfers
  accountId: string; // For transfers, this is the "From" account
  toAccountId?: string; // For transfers, this is the "To" account
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isCustom: boolean;
}

const DB_NAME = 'PocketLedgerDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object stores
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
        transactionStore.createIndex('accountId', 'accountId', { unique: false });
        transactionStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    };
  });
};

// Database operation wrappers
const getStore = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

export const db = {
  // --- ACCOUNTS ---
  async getAccounts(): Promise<Account[]> {
    const store = await getStore('accounts', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveAccount(account: Account): Promise<void> {
    const store = await getStore('accounts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(account);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteAccount(id: string): Promise<void> {
    const store = await getStore('accounts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- TRANSACTIONS ---
  async getTransactions(): Promise<Transaction[]> {
    const store = await getStore('transactions', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort transactions descending by date, then by createdAt
        const txs = request.result as Transaction[];
        txs.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return b.createdAt - a.createdAt;
        });
        resolve(txs);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveTransaction(transaction: Transaction): Promise<void> {
    const store = await getStore('transactions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(transaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    const store = await getStore('transactions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    const store = await getStore('categories', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveCategory(category: Category): Promise<void> {
    const store = await getStore('categories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(category);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const store = await getStore('categories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- CLEAR ALL DATA (WIPE DATABASE) ---
  async wipeDatabase(): Promise<void> {
    const db = await initDB();
    dbInstance = null;
    db.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        localStorage.clear(); // Clear settings stored in localstorage as well
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
};
