import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { X, Calendar, FileText, ArrowRightLeft, TrendingUp, TrendingDown, Check, Loader2 } from 'lucide-react';

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

  const { showToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('Other');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [warning, setWarning] = useState<string | null>(null);

  // Unsaved changes confirm dialog state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Action states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Swipe-to-dismiss drag offsets
  const [startY, setStartY] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync state with prefilled parameters or selectedTransaction (for Edit mode)
  useEffect(() => {
    if (!isAddModalOpen) return;

    setShowDiscardConfirm(false);
    setSubmitting(false);
    setSuccess(false);

    if (selectedTransaction) {
      setActiveTab(selectedTransaction.type);
      setAmount(String(selectedTransaction.amount));
      setAccountId(selectedTransaction.accountId);
      setToAccountId(selectedTransaction.toAccountId || '');
      setCategory(selectedTransaction.category || 'Other');
      setDate(selectedTransaction.date);
      setNotes(selectedTransaction.notes);
    } else {
      setActiveTab(prefilledModalType || 'expense');
      setAmount('');
      setCategory('Other');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      if (prefilledAccountId) {
        setAccountId(prefilledAccountId);
      } else if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      }

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
    if (selectedTransaction) return;
    
    const filteredCats = categories.filter(c => c.type === activeTab);
    if (filteredCats.length > 0) {
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

    if (activeTab === 'expense' || activeTab === 'transfer') {
      let balance = sourceAccount.currentBalance;
      
      if (selectedTransaction && selectedTransaction.accountId === accountId) {
        balance += selectedTransaction.amount;
      }

      if (balance - amtNum < 0) {
        setWarning(`Warning: Account "${sourceAccount.name}" will fall below 0 (${currency}${(balance - amtNum).toFixed(2)})`);
      }
    }
  }, [amount, accountId, activeTab, accounts, selectedTransaction, currency]);

  if (!isAddModalOpen) return null;

  // Unsaved modified check
  const isModified = () => {
    if (selectedTransaction) {
      return (
        amount !== String(selectedTransaction.amount) ||
        accountId !== selectedTransaction.accountId ||
        toAccountId !== (selectedTransaction.toAccountId || '') ||
        category !== (selectedTransaction.category || 'Other') ||
        date !== selectedTransaction.date ||
        notes !== selectedTransaction.notes
      );
    } else {
      return (
        amount !== '' ||
        notes !== '' ||
        (prefilledAccountId ? accountId !== prefilledAccountId : (accounts.length > 0 && accountId !== accounts[0].id))
      );
    }
  };

  const handleCloseAttempt = () => {
    if (isModified()) {
      setShowDiscardConfirm(true);
    } else {
      closeAddModal();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      showToast("Please enter a valid amount greater than 0.", "error");
      return;
    }

    if (!accountId) {
      showToast("Please select an account.", "error");
      return;
    }

    if (activeTab === 'transfer' && !toAccountId) {
      showToast("Please select a destination account.", "error");
      return;
    }

    if (activeTab === 'transfer' && accountId === toAccountId) {
      showToast("Source and destination accounts must be different.", "error");
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
      setSubmitting(true);
      // Premium write-delay simulation to view loader spinner (500ms)
      await new Promise(r => setTimeout(r, 500));

      if (selectedTransaction) {
        await updateTransaction(selectedTransaction.id, transactionData);
        setSubmitting(false);
        setSuccess(true);
        await new Promise(r => setTimeout(r, 200));
        closeAddModal();
        showToast("Transaction updated successfully", "success");
      } else {
        await addTransaction(transactionData);
        setSubmitting(false);
        setSuccess(true);
        await new Promise(r => setTimeout(r, 200));
        closeAddModal();
        showToast(`${activeTab.toUpperCase()} transaction logged`, "success");
      }
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      showToast("Error saving transaction.", "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(selectedTransaction.id);
        closeAddModal();
        showToast("Transaction removed from ledger", "success");
      } catch (err) {
        console.error(err);
        showToast("Error deleting transaction.", "error");
      }
    }
  };

  // Touch Swipe Handlers for Sheet Dismissal
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 100) {
      // Close sheet
      handleCloseAttempt();
    }
    setDragOffset(0);
  };

  const filteredCategories = categories.filter(c => c.type === (activeTab === 'transfer' ? 'expense' : activeTab));

  return (
    <div className="fixed inset-0 z-45 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      
      {/* Backdrop Click Dismiss */}
      <div className="absolute inset-0" onClick={handleCloseAttempt} aria-hidden="true" />

      {/* Main Bottom Sheet Sheet Container */}
      <section 
        className="w-full max-w-lg bg-bg-surface rounded-t-[28px] shadow-2xl z-50 border-t border-border-custom flex flex-col max-h-[94vh] overflow-hidden transition-all duration-150 relative"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
        aria-labelledby="add-entry-title"
      >
        
        {/* Swipe Drag Handle */}
        <div 
          className="w-12 h-1 bg-white/10 rounded-full mx-auto my-3 flex-shrink-0 cursor-grab active:cursor-grabbing" 
          aria-hidden="true" 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Header */}
        <header className="flex items-center justify-between px-6 pb-4 border-b border-border-custom">
          <h1 id="add-entry-title" className="text-lg font-bold text-text-primary m-0 font-display">
            {selectedTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h1>
          <button
            id="add-entry-close-btn"
            onClick={handleCloseAttempt}
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Unsaved Discard Confirm Box overlay */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-50 bg-bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <div className="bento-card max-w-xs space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-text-primary">
                Discard changes?
              </h2>
              <p className="text-[10px] text-text-subtle leading-normal">
                You have unsaved changes in this ledger transaction record.
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  id="add-entry-discard-cancel"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2 min-h-[38px] rounded-xl border border-border-custom bg-white/5 text-xs text-text-primary font-bold"
                >
                  Keep Editing
                </button>
                <button
                  id="add-entry-discard-confirm"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    closeAddModal();
                  }}
                  className="flex-1 py-2 min-h-[38px] rounded-xl bg-accent-red hover:bg-accent-red/90 text-xs text-white font-bold"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 text-left">
          
          {/* Transaction Type tab buttons */}
          {!selectedTransaction && (
            <div className="flex p-1 bg-bg-base border border-border-custom rounded-2xl" role="tablist" aria-label="Transaction Type">
              <button
                id="add-entry-tab-expense"
                type="button"
                role="tab"
                aria-selected={activeTab === 'expense'}
                onClick={() => setActiveTab('expense')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] ${
                  activeTab === 'expense'
                    ? 'bg-bg-elevated text-accent-red shadow-sm border border-white/5'
                    : 'text-text-subtle hover:text-text-secondary'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense</span>
              </button>
              <button
                id="add-entry-tab-income"
                type="button"
                role="tab"
                aria-selected={activeTab === 'income'}
                onClick={() => setActiveTab('income')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] ${
                  activeTab === 'income'
                    ? 'bg-bg-elevated text-accent-green-light shadow-sm border border-white/5'
                    : 'text-text-subtle hover:text-text-secondary'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Income</span>
              </button>
              <button
                id="add-entry-tab-transfer"
                type="button"
                role="tab"
                aria-selected={activeTab === 'transfer'}
                onClick={() => setActiveTab('transfer')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] ${
                  activeTab === 'transfer'
                    ? 'bg-bg-elevated text-indigo-400 shadow-sm border border-white/5'
                    : 'text-text-subtle hover:text-text-secondary'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer</span>
              </button>
            </div>
          )}

          {/* Amount Box */}
          <div className="text-center space-y-1">
            <label htmlFor="add-entry-amount-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
              Amount ({currency})
            </label>
            <div className="flex items-center justify-center text-4xl font-extrabold text-text-primary">
              <span className="mr-1 text-text-subtle" aria-hidden="true">{currency}</span>
              <input
                id="add-entry-amount-input"
                type="number"
                step="any"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-48 text-center bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-accent-green focus:outline-none placeholder-white/10 py-1 min-h-[44px] tracking-tight tabular-nums"
              />
            </div>
            {warning && (
              <div className="flex items-center justify-center space-x-1 mt-1.5" role="alert">
                <span className="text-accent-amber text-[10px] font-semibold">{warning}</span>
              </div>
            )}
          </div>

          {/* Account Selector(s) */}
          <div className="space-y-4">
            {activeTab === 'transfer' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="add-entry-from-account-select" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                    From Account
                  </label>
                  <select
                    id="add-entry-from-account-select"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
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
                  <label htmlFor="add-entry-to-account-select" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                    To Account
                  </label>
                  <select
                    id="add-entry-to-account-select"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
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
                <label htmlFor="add-entry-account-select" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account
                </label>
                <select
                  id="add-entry-account-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
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

          {/* Category Chip Selector */}
          {activeTab !== 'transfer' && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                Category
              </span>
              <div className="flex overflow-x-auto py-1 px-0.5 gap-2 no-scrollbar scroll-smooth" role="group" aria-label="Select category">
                {filteredCategories.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.id}
                      id={`add-entry-category-${cat.name}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setCategory(cat.name)}
                      className={`flex-shrink-0 min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent-green border-accent-green text-bg-base shadow-sm'
                          : 'bg-bg-base border-border-custom text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Notes Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="add-entry-date-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-subtle" aria-hidden="true" />
                <span>Date</span>
              </label>
              <input
                id="add-entry-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-entry-notes-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-text-subtle" aria-hidden="true" />
                <span>Notes (Optional)</span>
              </label>
              <input
                id="add-entry-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details, bill ref, merchant name..."
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
              />
            </div>
          </div>

          {/* Save & Action Buttons */}
          <div className="flex space-x-3 pt-4">
            {selectedTransaction ? (
              <>
                <button
                  id="add-entry-delete-btn"
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-3 min-h-[44px] rounded-2xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red font-bold text-sm shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  id="add-entry-submit-btn"
                  type="submit"
                  disabled={submitting || success}
                  className="flex-1 py-3 min-h-[44px] rounded-2xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-sm shadow-sm flex items-center justify-center transition cursor-pointer disabled:opacity-85"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-bg-base" />
                  ) : success ? (
                    <Check className="w-5 h-5 text-bg-base animate-scale-pulse" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </>
            ) : (
              <button
                id="add-entry-submit-btn"
                type="submit"
                disabled={submitting || success}
                className="w-full py-3.5 min-h-[44px] rounded-2xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-sm shadow-sm flex items-center justify-center transition cursor-pointer disabled:opacity-85"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-bg-base" />
                ) : success ? (
                  <Check className="w-5 h-5 text-bg-base animate-scale-pulse" />
                ) : (
                  <span>Log Transaction</span>
                )}
              </button>
            )}
          </div>

        </form>
      </section>
    </div>
  );
};
