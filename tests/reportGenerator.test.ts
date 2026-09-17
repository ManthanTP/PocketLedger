import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compileAccountReportData, computeReportDateRange } from '../src/utils/reportGenerator.ts';
import type { Account, Transaction } from '../src/db/db.ts';

describe('Report Generator Tests', () => {
  const mockAccounts: Account[] = [
    { id: 'acc1', name: 'Cash In Hand', type: 'Cash', openingBalance: 1000, currentBalance: 1500, createdAt: 100000 },
    { id: 'acc2', name: 'Main Bank', type: 'Bank', openingBalance: 5000, currentBalance: 6000, createdAt: 100000 },
  ];

  const mockTransactions: Transaction[] = [
    // Prior to 2026-03-01 (opening balance adjustments)
    { id: 'tx0', accountId: 'acc1', type: 'income', amount: 500, date: '2026-02-15', category: 'Salary', notes: 'Advance', createdAt: 1 },
    { id: 'tx1', accountId: 'acc1', type: 'expense', amount: 200, date: '2026-02-20', category: 'Food', notes: 'Lunch', createdAt: 2 },
    // During 2026-03-01 to 2026-03-31
    { id: 'tx2', accountId: 'acc1', type: 'income', amount: 2000, date: '2026-03-05', category: 'Salary', notes: 'Monthly pay', createdAt: 3 },
    { id: 'tx3', accountId: 'acc1', type: 'expense', amount: 400, date: '2026-03-10', category: 'Grocery', notes: 'Supermarket', createdAt: 4 },
    { id: 'tx4', accountId: 'acc1', toAccountId: 'acc2', type: 'transfer', amount: 300, date: '2026-03-15', notes: 'Bank deposit', createdAt: 5 },
    { id: 'tx5', accountId: 'acc2', type: 'expense', amount: 150, date: '2026-03-20', category: 'Bills', notes: 'Internet', createdAt: 6 },
  ];

  it('computes correct date range for this-month and custom', () => {
    const custom = computeReportDateRange('custom', '2026-03-01', '2026-03-31');
    assert.equal(custom.startDate, '2026-03-01');
    assert.equal(custom.endDate, '2026-03-31');
    assert.equal(custom.label, '2026-03-01 to 2026-03-31');
  });

  it('compiles specific account report accurately', () => {
    const report = compileAccountReportData({
      accountId: 'acc1',
      preset: 'custom',
      customStartDate: '2026-03-01',
      customEndDate: '2026-03-31',
      accounts: mockAccounts,
      transactions: mockTransactions,
      currency: '₹',
    });

    assert.equal(report.accountName, 'Cash In Hand');
    // Opening balance before 2026-03-01: 1000 (initial) + 500 (income) - 200 (expense) = 1300
    assert.equal(report.openingBalance, 1300);

    // Period income: 2000
    assert.equal(report.totalIncome, 2000);

    // Period expense for acc1: 400 (grocery) + 300 (transfer out) = 700
    assert.equal(report.totalExpense, 700);

    // Net savings: 2000 - 700 = 1300
    assert.equal(report.netSavings, 1300);

    // Closing balance: 1300 + 1300 = 2600
    assert.equal(report.closingBalance, 2600);

    // Filtered transactions in period for acc1: tx2, tx3, tx4 (3 txs)
    assert.equal(report.transactions.length, 3);
  });

  it('compiles all accounts report accurately', () => {
    const report = compileAccountReportData({
      accountId: 'all',
      preset: 'custom',
      customStartDate: '2026-03-01',
      customEndDate: '2026-03-31',
      accounts: mockAccounts,
      transactions: mockTransactions,
      currency: '₹',
    });

    assert.equal(report.accountName, 'All Accounts');
    // Opening balance of all accounts: 1000 + 5000 + 500 - 200 = 6300
    assert.equal(report.openingBalance, 6300);

    // Period income: tx2 = 2000
    assert.equal(report.totalIncome, 2000);

    // Period expense: tx3 (400) + tx5 (150) = 550 (internal transfer tx4 does not affect net all accounts)
    assert.equal(report.totalExpense, 550);

    // Net savings: 2000 - 550 = 1450
    assert.equal(report.netSavings, 1450);

    // Closing: 6300 + 1450 = 7750
    assert.equal(report.closingBalance, 7750);
  });
});
