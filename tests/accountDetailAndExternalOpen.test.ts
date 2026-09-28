import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupMockStorage } from './mockStorage.ts';

// Setup mock browser/IDB environments before store import
setupMockStorage();

const { useFinanceStore } = await import('../src/store/useFinanceStore.ts');
const { openLandingPageInExternalBrowser, OFFICIAL_LANDING_PAGE_URL } = await import('../src/utils/externalOpener.ts');

describe('Account Detail Balance Update & External Browser Opener Tests', () => {
  beforeEach(async () => {
    setupMockStorage();
    await useFinanceStore.getState().init();
  });

  test('1. Account creation and selectedAccount balance synchronization', async () => {
    const store = useFinanceStore.getState();

    // Create an account with ₹1,000 opening balance
    await store.addAccount('Cash Account', 'Cash', 1000);

    const accounts = useFinanceStore.getState().accounts;
    const cashAcc = accounts.find(a => a.name === 'Cash Account');
    assert.ok(cashAcc, 'Account should exist');
    assert.equal(cashAcc.openingBalance, 1000);
    assert.equal(cashAcc.currentBalance, 1000);

    // User navigates into Account Details page
    store.setSelectedAccount(cashAcc);
    assert.equal(useFinanceStore.getState().selectedAccount?.currentBalance, 1000);

    // 2. Add ₹200 expense while on the page
    await store.addTransaction({
      accountId: cashAcc.id,
      amount: 200,
      type: 'expense',
      date: '2026-09-28',
      notes: 'Coffee & snacks',
      category: 'Food',
    });

    // Check that selectedAccount and accounts array are immediately updated to ₹800
    const stateAfterExpense = useFinanceStore.getState();
    const updatedSelectedAcc = stateAfterExpense.selectedAccount;
    assert.ok(updatedSelectedAcc, 'selectedAccount should be defined');
    assert.equal(updatedSelectedAcc.currentBalance, 800, 'selectedAccount balance should immediately be 800');

    const updatedAccountInList = stateAfterExpense.accounts.find(a => a.id === cashAcc.id);
    assert.equal(updatedAccountInList?.currentBalance, 800, 'Account in list should be 800');

    // 3. Add ₹500 income while on the page
    await store.addTransaction({
      accountId: cashAcc.id,
      amount: 500,
      type: 'income',
      date: '2026-09-28',
      notes: 'Freelance payment',
      category: 'Salary',
    });

    const stateAfterIncome = useFinanceStore.getState();
    assert.equal(stateAfterIncome.selectedAccount?.currentBalance, 1300, 'Balance should immediately be 1300 after 500 income');

    // 4. Edit transaction: change 200 expense to 100 expense
    const expenseTx = stateAfterIncome.transactions.find(t => t.type === 'expense' && t.accountId === cashAcc.id);
    assert.ok(expenseTx, 'Expense transaction should exist');

    await store.updateTransaction(expenseTx.id, {
      ...expenseTx,
      amount: 100,
    });

    const stateAfterEdit = useFinanceStore.getState();
    assert.equal(stateAfterEdit.selectedAccount?.currentBalance, 1400, 'Balance should immediately recalculate to 1400 after editing expense from 200 to 100');

    // 5. Delete income transaction
    const incomeTx = stateAfterEdit.transactions.find(t => t.type === 'income' && t.accountId === cashAcc.id);
    assert.ok(incomeTx, 'Income transaction should exist');

    await store.deleteTransaction(incomeTx.id);

    const stateAfterDelete = useFinanceStore.getState();
    assert.equal(stateAfterDelete.selectedAccount?.currentBalance, 900, 'Balance should immediately recalculate to 900 after deleting income');

    // 6. Persistence verification: re-read directly from database
    await store.fetchData();
    const stateAfterRefetch = useFinanceStore.getState();
    assert.equal(stateAfterRefetch.selectedAccount?.currentBalance, 900, 'Balance should persist as 900 in IndexedDB');
  });

  test('2. openLandingPageInExternalBrowser opens official landing page URL in external browser', async () => {
    let openedUrl = '';
    let targetWindow = '';

    (globalThis as any).window.open = (url: string, target?: string) => {
      openedUrl = url;
      targetWindow = target || '';
      return { closed: false } as any;
    };

    await openLandingPageInExternalBrowser();

    assert.equal(openedUrl, OFFICIAL_LANDING_PAGE_URL, 'Should open the official landing page URL');
    assert.ok(targetWindow === '_system' || targetWindow === '_blank', 'Target should be external (_system or _blank)');
  });

  test('3. Rename existing category updates transactions, budgets, and prevents duplicates', async () => {
    const store = useFinanceStore.getState();

    // 1. Add account and transaction under 'Food'
    await store.addAccount('Card Account', 'Credit Card', 5000);
    const cardAcc = useFinanceStore.getState().accounts.find(a => a.name === 'Card Account')!;

    await store.addTransaction({
      accountId: cardAcc.id,
      amount: 450,
      type: 'expense',
      date: '2026-09-28',
      notes: 'Dinner at restaurant',
      category: 'Food',
    });

    // Set a budget for 'Food'
    store.setBudget('Food', 3000);
    assert.equal(useFinanceStore.getState().budgets['Food'], 3000);

    // Find 'Food' category
    const foodCat = useFinanceStore.getState().categories.find(c => c.name === 'Food' && c.type === 'expense')!;
    assert.ok(foodCat, 'Food category should exist');

    // 2. Reject empty name
    const emptyRes = await store.renameCategory(foodCat.id, '   ');
    assert.equal(emptyRes.success, false);
    assert.match(emptyRes.error || '', /empty/i);

    // 3. Reject duplicate name (Grocery already exists for expense)
    const duplicateRes = await store.renameCategory(foodCat.id, 'Grocery');
    assert.equal(duplicateRes.success, false);
    assert.match(duplicateRes.error || '', /already exists/i);

    // 4. Successfully rename 'Food' to 'Dining & Drinks'
    const successRes = await store.renameCategory(foodCat.id, 'Dining & Drinks');
    assert.equal(successRes.success, true);

    const updatedCategories = useFinanceStore.getState().categories;
    const renamedCat = updatedCategories.find(c => c.id === foodCat.id);
    assert.equal(renamedCat?.name, 'Dining & Drinks');

    // Transactions must update to the new category name
    const updatedTxs = useFinanceStore.getState().transactions;
    const tx = updatedTxs.find(t => t.accountId === cardAcc.id);
    assert.equal(tx?.category, 'Dining & Drinks', 'Transaction category should be renamed to Dining & Drinks');

    // Budget must migrate to the new category name
    const updatedBudgets = useFinanceStore.getState().budgets;
    assert.equal(updatedBudgets['Dining & Drinks'], 3000, 'Budget should be moved to Dining & Drinks');
    assert.equal(updatedBudgets['Food'], undefined, 'Old Food budget key should be removed');

    // 5. Verify persistence across DB re-fetch
    await store.fetchData();
    const persistedCategories = useFinanceStore.getState().categories;
    assert.ok(persistedCategories.some(c => c.name === 'Dining & Drinks'));
    const persistedTxs = useFinanceStore.getState().transactions;
    assert.equal(persistedTxs.find(t => t.accountId === cardAcc.id)?.category, 'Dining & Drinks');
  });
});

