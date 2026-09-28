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
});
