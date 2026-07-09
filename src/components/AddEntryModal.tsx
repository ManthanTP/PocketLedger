import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { X, Calendar, FileText, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';


export const AddEntryModal: React.FC = () => {
  const {
    accounts,
    categories,
    selectedTransaction,
    isAddModalOpen,
    prefilledAccountId,
    prefilledModalType,
    closeAddModal,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    currency
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('Other');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [warning, setWarning] = useState<string | null>(null);

  // Sync state with prefilled parameters or selectedTransaction (for Edit mode)
  useEffect(() => {
    if (!isAddModalOpen) return;

    if (selectedTransaction) {
      // Edit mode
      setActiveTab(selectedTransaction.type);
      setAmount(String(selectedTransaction.amount));
      setAccountId(selectedTransaction.accountId);
      setToAccountId(selectedTransaction.toAccountId || '');
      setCategory(selectedTransaction.category || 'Other');
      setDate(selectedTransaction.date);
      setNotes(selectedTransaction.notes);
    } else {
      // Add mode
      setActiveTab(prefilledModalType || 'expense');
      setAmount('');
      setCategory('Other');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      // Determine default account
      if (prefilledAccountId) {
        setAccountId(prefilledAccountId);
      } else if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      }

      // Default destination account for transfers (second account if available)
      if (accounts.length > 1) {
        const otherAcc = accounts.find(a => a.id !== (prefilledAccountId || accounts[0].id));
        setToAccountId(otherAcc ? otherAcc.id : '');
      } else {
        setToAccountId('');
      }
    }
  }, [isAddModalOpen, selectedTransaction, prefilledAccountId, prefilledModalType, accounts]);

  // Set default category when tab changes
  useEffect(() => {
    if (selectedTransaction) return; // Keep transaction category when editing
    
    const filteredCats = categories.filter(c => c.type === activeTab);
    if (filteredCats.length > 0) {
      // Try to find if 'Other' exists, otherwise grab the first one
      const otherCat = filteredCats.find(c => c.name.toLowerCase() === 'other');
      setCategory(otherCat ? otherCat.name : filteredCats[0].name);
    } else {
      setCategory('Other');
    }
  }, [activeTab, categories, selectedTransaction]);

  // Balance warnings check
  useEffect(() => {
    setWarning(null);
    const amtNum = parseFloat(amount) || 0;
    if (amtNum <= 0 || !accountId) return;

    const sourceAccount = accounts.find(a => a.id === accountId);
    if (!sourceAccount) return;

    // Check if it's expense or transfer
    if (activeTab === 'expense' || activeTab === 'transfer') {
      let balance = sourceAccount.currentBalance;
      
      // If we are editing, we add back the current transaction's amount first to check warning
      if (selectedTransaction && selectedTransaction.accountId === accountId) {
        balance += selectedTransaction.amount;
      }

      if (balance - amtNum < 0) {
        setWarning(`Warning: Account "${sourceAccount.name}" will fall below 0 (${currency}${(balance - amtNum).toFixed(2)})`);
      }
    }
  }, [amount, accountId, activeTab, accounts, selectedTransaction, currency]);

  if (!isAddModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    if (!accountId) {
      alert("Please select an account.");
      return;
    }

    if (activeTab === 'transfer' && !toAccountId) {
      alert("Please select a destination account.");
      return;
    }

    if (activeTab === 'transfer' && accountId === toAccountId) {
      alert("Source and destination accounts must be different.");
      return;
    }

    const transactionData = {
      type: activeTab,
      amount: amtNum,
      accountId,
      date,
      notes: notes.trim(),
      category: activeTab === 'transfer' ? undefined : category,
      toAccountId: activeTab === 'transfer' ? toAccountId : undefined,
    };

    try {
      if (selectedTransaction) {
        await updateTransaction(selectedTransaction.id, transactionData);
      } else {
        await addTransaction(transactionData);
      }
      closeAddModal();
    } catch (err) {
      console.error(err);
      alert("Error saving transaction.");
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(selectedTransaction.id);
        closeAddModal();
      } catch (err) {
        console.error(err);
        alert("Error deleting transaction.");
      }
    }
  };

  const filteredCategories = categories.filter(c => c.type === (activeTab === 'transfer' ? 'expense' : activeTab));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity duration-300">
      
      {/* Tap outside to close backdrop */}
      <div className="absolute inset-0" onClick={closeAddModal} />

      {/* Slide-up Container */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-[28px] shadow-2xl z-50 border-t border-slate-100 dark:border-slate-700/50 flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 animate-slide-up">
        
        {/* Drag handle / Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {selectedTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <button
            onClick={closeAddModal}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          
          {/* Tabs */}
          {!selectedTransaction && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('expense')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'income'
                    ? 'bg-white dark:bg-slate-800 text-green-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Income</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transfer')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'transfer'
                    ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer</span>
              </button>
            </div>
          )}

          {/* Amount input */}
          <div className="text-center space-y-1">
            <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
              Amount ({currency})
            </label>
            <div className="flex items-center justify-center text-4xl font-extrabold text-slate-800 dark:text-slate-100">
              <span className="mr-1 text-slate-400 dark:text-slate-500">{currency}</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-48 text-center bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 py-1"
              />
            </div>
            {warning && (
              <p className="text-rose-500 text-[11px] font-semibold mt-1">
                {warning}
              </p>
            )}
          </div>

          {/* Account selector(s) */}
          <div className="space-y-4">
            {activeTab === 'transfer' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                    From Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-150 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="" disabled>Select Source</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({currency}{acc.currentBalance.toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                    To Account
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-150 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="" disabled>Select Destination</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({currency}{acc.currentBalance.toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-150 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="" disabled>Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({currency}{acc.currentBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category Chip Selector (Income & Expenses only) */}
          {activeTab !== 'transfer' && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                Category
              </label>
              <div className="flex overflow-x-auto py-2 px-1 gap-2 no-scrollbar scroll-smooth">
                {filteredCategories.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-350'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details, bill ref, merchant name..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            {selectedTransaction ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-455 font-bold text-sm shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Log Transaction
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
