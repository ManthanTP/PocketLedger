import { create } from 'zustand';
import { db, initDB } from '../db/db';
import type { Account, Transaction, Category } from '../db/db';
import { useNotificationStore } from './useNotificationStore';

export interface ReminderItem {
  id: string;
  title: string;
  body: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  channel: 'Bill Reminders' | 'Loan Repayments' | 'Budget Alerts' | 'Backup Reminders';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string;
}

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  initialized: boolean;
  activeTab: 'dashboard' | 'accounts' | 'reports' | 'settings' | 'cashbook' | 'transactions';
  selectedAccount: Account | null;
  selectedTransaction: Transaction | null;

  // Add Entry Modal State
  isAddModalOpen: boolean;
  prefilledAccountId: string | null;
  prefilledModalType: 'income' | 'expense' | 'transfer' | null;
  openAddModal: (accountId?: string, type?: 'income' | 'expense' | 'transfer') => void;
  closeAddModal: () => void;

  // Security / Settings
  theme: 'light' | 'dark' | 'system';
  currency: string;
  pinHash: string | null; // MD5/SHA or simple hash (we will store simple string hash)
  pinLength: number;
  isLocked: boolean;
  securityQuestion: string | null;
  securityAnswer: string | null;
  autoLockTimeout: number; // in minutes (0 = immediate, -1 = never, etc.)
  hideBalance: boolean;
  budgets: { [category: string]: number };
  reminders: ReminderItem[];
  goals: SavingsGoal[];
  settingsActivePanel: 'none' | 'categories' | 'security' | 'backup' | 'currency' | 'theme' | 'budgets' | 'reminders' | 'goals' | 'guide';
  setSettingsActivePanel: (panel: 'none' | 'categories' | 'security' | 'backup' | 'currency' | 'theme' | 'budgets' | 'reminders' | 'goals' | 'guide') => void;

  // Actions
  init: () => Promise<void>;
  fetchData: () => Promise<void>;
  setActiveTab: (tab: FinanceState['activeTab']) => void;
  setSelectedAccount: (account: Account | null) => void;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  setHideBalance: (hide: boolean) => void;
  setBudget: (category: string, limit: number) => void;
  addReminder: (data: Omit<ReminderItem, 'id'>) => void;
  updateReminder: (id: string, data: Omit<ReminderItem, 'id'>) => void;
  deleteReminder: (id: string) => void;
  addGoal: (data: Omit<SavingsGoal, 'id'>) => void;
  updateGoal: (id: string, data: Omit<SavingsGoal, 'id'>) => void;
  deleteGoal: (id: string) => void;

  // Account actions
  addAccount: (name: string, type: Account['type'], openingBalance: number) => Promise<void>;
  updateAccount: (id: string, name: string, type: Account['type']) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Transaction actions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Category actions
  addCategory: (name: string, type: Category['type']) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Settings & Security actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: string) => void;
  setSecurityPIN: (pin: string, question: string, answer: string) => void;
  disablePIN: () => void;
  unlockApp: (pin: string) => boolean;
  recoverPIN: (answer: string) => boolean;
  setAutoLockTimeout: (minutes: number) => void;
  wipeAllData: () => Promise<void>;
}

// Helper to hash PIN
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  categories: [],
  initialized: false,
  activeTab: 'dashboard',
  settingsActivePanel: 'none',
  selectedAccount: null,
  selectedTransaction: null,

  isAddModalOpen: false,
  prefilledAccountId: null,
  prefilledModalType: null,

  // Settings defaults loaded synchronously from LocalStorage
  theme: (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system',
  currency: localStorage.getItem('currency') || '₹',
  pinHash: localStorage.getItem('pinHash') || null,
  pinLength: parseInt(localStorage.getItem('pinLength') || '4', 10),
  isLocked: !!localStorage.getItem('pinHash'), // lock if PIN is set
  securityQuestion: localStorage.getItem('securityQuestion') || null,
  securityAnswer: localStorage.getItem('securityAnswer') || null,
  autoLockTimeout: parseInt(localStorage.getItem('autoLockTimeout') || '5', 10),
  hideBalance: localStorage.getItem('hideBalance') === 'true',
  budgets: JSON.parse(localStorage.getItem('budgets') || '{}'),
  reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
  goals: JSON.parse(localStorage.getItem('goals') || '[]'),

  init: async () => {
    // 1. Init IndexedDB
    await initDB();

    // 2. Seed default categories if empty
    const dbCategories = await db.getCategories();
    if (dbCategories.length === 0) {
      const defaultCategories: Category[] = [
        // Income
        { id: 'inc_salary', name: 'Salary', type: 'income', isCustom: false },
        { id: 'inc_business', name: 'Business', type: 'income', isCustom: false },
        { id: 'inc_freelancing', name: 'Freelancing', type: 'income', isCustom: false },
        { id: 'inc_interest', name: 'Interest', type: 'income', isCustom: false },
        { id: 'inc_cashback', name: 'Cashback', type: 'income', isCustom: false },
        { id: 'inc_refund', name: 'Refund', type: 'income', isCustom: false },
        { id: 'inc_gift', name: 'Gift', type: 'income', isCustom: false },
        { id: 'inc_other', name: 'Other', type: 'income', isCustom: false },
        // Expense
        { id: 'exp_food', name: 'Food', type: 'expense', isCustom: false },
        { id: 'exp_grocery', name: 'Grocery', type: 'expense', isCustom: false },
        { id: 'exp_fuel', name: 'Fuel', type: 'expense', isCustom: false },
        { id: 'exp_travel', name: 'Travel', type: 'expense', isCustom: false },
        { id: 'exp_bills', name: 'Bills', type: 'expense', isCustom: false },
        { id: 'exp_shopping', name: 'Shopping', type: 'expense', isCustom: false },
        { id: 'exp_entertainment', name: 'Entertainment', type: 'expense', isCustom: false },
        { id: 'exp_education', name: 'Education', type: 'expense', isCustom: false },
        { id: 'exp_medical', name: 'Medical', type: 'expense', isCustom: false },
        { id: 'exp_other', name: 'Other', type: 'expense', isCustom: false },
      ];

      for (const cat of defaultCategories) {
        await db.saveCategory(cat);
      }
    }

    // Apply active theme class
    const initialTheme = get().theme;
    get().setTheme(initialTheme);

    // 3. Fetch initial data
    await get().fetchData();

    set({ initialized: true });
  },

  fetchData: async () => {
    const [accounts, transactions, categories] = await Promise.all([
      db.getAccounts(),
      db.getTransactions(),
      db.getCategories(),
    ]);

    // Make sure balances are fully consistent
    const updatedAccounts = accounts.map((acc) => {
      let currentBalance = acc.openingBalance;
      transactions.forEach((tx) => {
        if (tx.type === 'income' && tx.accountId === acc.id) {
          currentBalance += tx.amount;
        } else if (tx.type === 'expense' && tx.accountId === acc.id) {
          currentBalance -= tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.accountId === acc.id) {
            currentBalance -= tx.amount; // Transfer out
          }
          if (tx.toAccountId === acc.id) {
            currentBalance += tx.amount; // Transfer in
          }
        }
      });
      return { ...acc, currentBalance };
    });

    // Write updated balances back to DB asynchronously if they changed
    for (const acc of updatedAccounts) {
      const match = accounts.find((a) => a.id === acc.id);
      if (!match || match.currentBalance !== acc.currentBalance) {
        await db.saveAccount(acc);
      }
    }

    set({ accounts: updatedAccounts, transactions, categories });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSettingsActivePanel: (panel) => set({ settingsActivePanel: panel }),
  setSelectedAccount: (account) => set({ selectedAccount: account }),
  setSelectedTransaction: (transaction) => set({ selectedTransaction: transaction }),

  openAddModal: (accountId, type) => {
    set({
      isAddModalOpen: true,
      prefilledAccountId: accountId || null,
      prefilledModalType: type || null,
    });
  },
  closeAddModal: () => {
    set({
      isAddModalOpen: false,
      prefilledAccountId: null,
      prefilledModalType: null,
      selectedTransaction: null,
    });
  },

  setHideBalance: (hide) => {
    localStorage.setItem('hideBalance', String(hide));
    set({ hideBalance: hide });
  },

  // --- ACCOUNTS ---
  addAccount: async (name, type, openingBalance) => {
    const newAccount: Account = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name,
      type,
      openingBalance,
      currentBalance: openingBalance,
      createdAt: Date.now(),
    };
    await db.saveAccount(newAccount);
    await get().fetchData();
  },

  updateAccount: async (id, name, type) => {
    const accounts = get().accounts;
    const existing = accounts.find((a) => a.id === id);
    if (!existing) return;

    const updatedAccount: Account = {
      ...existing,
      name,
      type,
    };
    await db.saveAccount(updatedAccount);
    await get().fetchData();

    // Sync selectedAccount state if active
    const selected = get().selectedAccount;
    if (selected && selected.id === id) {
      set({ selectedAccount: updatedAccount });
    }
  },

  deleteAccount: async (id) => {
    // Delete account and all transactions associated with it
    const transactions = get().transactions.filter(
      (tx) => tx.accountId === id || tx.toAccountId === id
    );

    // Delete associated transactions
    for (const tx of transactions) {
      await db.deleteTransaction(tx.id);
    }

    // Delete account itself
    await db.deleteAccount(id);
    await get().fetchData();

    if (get().selectedAccount?.id === id) {
      set({ selectedAccount: null });
    }
  },

  // --- TRANSACTIONS ---
  addTransaction: async (data) => {
    const newTx: Transaction = {
      ...data,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    await db.saveTransaction(newTx);
    await get().fetchData();
  },

  updateTransaction: async (id, data) => {
    const transactions = get().transactions;
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return;

    const updatedTx: Transaction = {
      ...existing,
      ...data,
    };
    await db.saveTransaction(updatedTx);
    await get().fetchData();
  },

  deleteTransaction: async (id) => {
    await db.deleteTransaction(id);
    await get().fetchData();
  },

  // --- CATEGORIES ---
  addCategory: async (name, type) => {
    // Check if category name already exists for this type to avoid duplicates
    const categories = get().categories;
    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type
    );
    if (duplicate) return;

    const newCat: Category = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name,
      type,
      isCustom: true,
    };
    await db.saveCategory(newCat);
    await get().fetchData();
  },

  deleteCategory: async (id) => {
    // Soft safeguard - we won't delete a category if it is used in a transaction
    // Or we reassign those transactions to 'Other'
    const cat = get().categories.find((c) => c.id === id);
    if (!cat) return;

    const txs = get().transactions.filter((tx) => tx.category === cat.name && tx.type === cat.type);
    for (const tx of txs) {
      await db.saveTransaction({
        ...tx,
        category: 'Other',
      });
    }

    await db.deleteCategory(id);
    await get().fetchData();
  },

  // --- SETTINGS / SECURITY ---
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    set({ theme });
  },

  setCurrency: (currency) => {
    localStorage.setItem('currency', currency);
    set({ currency });
  },

  setSecurityPIN: (pin, question, answer) => {
    const hash = hashString(pin);
    const ansHash = hashString(answer.trim().toLowerCase());

    localStorage.setItem('pinHash', hash);
    localStorage.setItem('pinLength', pin.length.toString());
    localStorage.setItem('securityQuestion', question);
    localStorage.setItem('securityAnswer', ansHash);

    set({
      pinHash: hash,
      pinLength: pin.length,
      securityQuestion: question,
      securityAnswer: ansHash,
      isLocked: false,
    });
  },

  disablePIN: () => {
    localStorage.removeItem('pinHash');
    localStorage.removeItem('pinLength');
    localStorage.removeItem('securityQuestion');
    localStorage.removeItem('securityAnswer');

    set({
      pinHash: null,
      pinLength: 4,
      securityQuestion: null,
      securityAnswer: null,
      isLocked: false,
    });
  },

  unlockApp: (pin) => {
    const hash = hashString(pin);
    if (hash === get().pinHash) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  recoverPIN: (answer) => {
    const hash = hashString(answer.trim().toLowerCase());
    if (hash === get().securityAnswer) {
      // Temporarily unlock and clear the pin so the user can set a new one
      get().disablePIN();
      return true;
    }
    return false;
  },

  setAutoLockTimeout: (minutes) => {
    localStorage.setItem('autoLockTimeout', String(minutes));
    set({ autoLockTimeout: minutes });
  },

  wipeAllData: async () => {
    await db.wipeDatabase();
    localStorage.removeItem('budgets');
    localStorage.removeItem('reminders');
    localStorage.removeItem('goals');
    useNotificationStore.setState({ simulatedNotifications: [], toasts: [], banners: [] });
    set({
      accounts: [],
      transactions: [],
      categories: [],
      activeTab: 'dashboard',
      selectedAccount: null,
      selectedTransaction: null,
      theme: 'system',
      currency: '₹',
      pinHash: null,
      isLocked: false,
      securityQuestion: null,
      securityAnswer: null,
      autoLockTimeout: 5,
      hideBalance: false,
      budgets: {},
      reminders: [],
      goals: []
    });
    // Apply changes
    get().setTheme('system');
    await get().init();
  },

  setBudget: (category, limit) => {
    const updated = { ...get().budgets, [category]: limit };
    localStorage.setItem('budgets', JSON.stringify(updated));
    set({ budgets: updated });
  },

  addReminder: (data) => {
    const newRem = {
      ...data,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    const updated = [...get().reminders, newRem];
    localStorage.setItem('reminders', JSON.stringify(updated));
    set({ reminders: updated });
  },

  updateReminder: (id, data) => {
    const updated = get().reminders.map((r) => r.id === id ? { ...r, ...data } : r);
    localStorage.setItem('reminders', JSON.stringify(updated));
    set({ reminders: updated });
  },

  deleteReminder: (id) => {
    const updated = get().reminders.filter((r) => r.id !== id);
    localStorage.setItem('reminders', JSON.stringify(updated));
    set({ reminders: updated });

    // Dismiss active simulated notifications for this reminder
    const active = useNotificationStore.getState().simulatedNotifications.filter(
      (n) => !n.id.startsWith(id)
    );
    useNotificationStore.setState({ simulatedNotifications: active });
  },

  addGoal: (data) => {
    const newGoal = {
      ...data,
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    const updated = [...get().goals, newGoal];
    localStorage.setItem('goals', JSON.stringify(updated));
    set({ goals: updated });
  },

  updateGoal: (id, data) => {
    const updated = get().goals.map((g) => g.id === id ? { ...g, ...data } : g);
    localStorage.setItem('goals', JSON.stringify(updated));
    set({ goals: updated });
  },

  deleteGoal: (id) => {
    const updated = get().goals.filter((g) => g.id !== id);
    localStorage.setItem('goals', JSON.stringify(updated));
    set({ goals: updated });
  },
}));
