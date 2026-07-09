import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Settings as SettingsIcon, Shield, Database, Palette, CircleDollarSign, Plus, Trash2, AlertOctagon, Save, ArrowLeft } from 'lucide-react';
import type { Category } from '../db/db';
import { AppIconFull } from '../components/AppIcon';

type SubPanel = 'none' | 'categories' | 'security' | 'backup' | 'currency' | 'theme' | 'budgets' | 'reminders';

export const Settings: React.FC = () => {
  const {
    budgets,
    setBudget,
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    categories,
    addCategory,
    deleteCategory,
    theme,
    setTheme,
    currency,
    setCurrency,
    pinHash,
    setSecurityPIN,
    disablePIN,
    securityQuestion,
    autoLockTimeout,
    setAutoLockTimeout,
    hideBalance,
    setHideBalance,
    wipeAllData,
    accounts,
    transactions
  } = useFinanceStore();

  const { showToast } = useNotificationStore();

  const [activePanel, setActivePanel] = useState<SubPanel>('none');

  // Categories states
  const [catType, setCatType] = useState<Category['type']>('expense');
  const [newCatName, setNewCatName] = useState<string>('');

  // Security states
  const [secPin, setSecPin] = useState<string>('');
  const [secConfirmPin, setSecConfirmPin] = useState<string>('');
  const [secQuestion, setSecQuestion] = useState<string>('What was the name of your first pet?');
  const [secAnswer, setSecAnswer] = useState<string>('');
  const [secError, setSecError] = useState<string | null>(null);

  // Loading skeleton state
  const [loading, setLoading] = useState(true);

  // Reminders states
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remBody, setRemBody] = useState('');
  const [remAmount, setRemAmount] = useState(0);
  const [remCategory, setRemCategory] = useState('Bills');
  const [remDay, setRemDay] = useState(1);
  const [remChannel, setRemChannel] = useState<'Bill Reminders' | 'Loan Repayments' | 'Budget Alerts' | 'Backup Reminders'>('Bill Reminders');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [activePanel]);

  // --- BACKUP ACTIONS ---
  const handleExportBackup = () => {
    try {
      const backupData = {
        accounts,
        transactions,
        categories,
        settings: {
          theme,
          currency,
          pinHash,
          securityQuestion,
          autoLockTimeout,
          hideBalance
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pocket_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Data backup file exported", "success");
    } catch (e) {
      showToast("Failed to export backup", "error");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json.accounts || !json.transactions || !json.categories) {
          showToast("Invalid backup file format.", "error");
          return;
        }

        if (window.confirm("WARNING: Restoring this backup will completely overwrite your current database. This action cannot be undone. Are you sure you want to proceed?")) {
          const dbInstance = await import('../db/db').then(m => m.db);
          
          await useFinanceStore.getState().wipeAllData();

          for (const acc of json.accounts) {
            await dbInstance.saveAccount(acc);
          }
          for (const tx of json.transactions) {
            await dbInstance.saveTransaction(tx);
          }
          for (const cat of json.categories) {
            await dbInstance.saveCategory(cat);
          }

          if (json.settings) {
            if (json.settings.currency) useFinanceStore.getState().setCurrency(json.settings.currency);
            if (json.settings.theme) useFinanceStore.getState().setTheme(json.settings.theme);
            if (json.settings.autoLockTimeout !== undefined) useFinanceStore.getState().setAutoLockTimeout(json.settings.autoLockTimeout);
            if (json.settings.hideBalance !== undefined) useFinanceStore.getState().setHideBalance(json.settings.hideBalance);
            
            if (json.settings.pinHash) {
              localStorage.setItem('pinHash', json.settings.pinHash);
              if (json.settings.securityQuestion) localStorage.setItem('securityQuestion', json.settings.securityQuestion);
              if (json.settings.securityAnswer) localStorage.setItem('securityAnswer', 'restored_recovery_hash');
              
              useFinanceStore.setState({
                pinHash: json.settings.pinHash,
                securityQuestion: json.settings.securityQuestion,
                isLocked: false
              });
            }
          }

          await useFinanceStore.getState().fetchData();
          showToast("Database backup successfully restored", "success");
          setActivePanel('none');
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to parse backup JSON file.", "error");
      }
    };
    reader.readAsText(file);
  };

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), catType);
    showToast(`Category "${newCatName.trim()}" added`, "success");
    setNewCatName('');
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    await deleteCategory(catId);
    showToast(`Category "${catName}" removed`, "success");
  };

  // --- SECURITY ACTIONS ---
  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);

    if (secPin.length < 4 || secPin.length > 6) {
      setSecError("PIN must be 4 to 6 digits.");
      return;
    }

    if (secPin !== secConfirmPin) {
      setSecError("PIN codes do not match.");
      return;
    }

    if (!secAnswer.trim()) {
      setSecError("Please provide an answer to the recovery question.");
      return;
    }

    setSecurityPIN(secPin, secQuestion, secAnswer);
    setSecPin('');
    setSecConfirmPin('');
    setSecAnswer('');
    showToast("Security PIN enabled", "success");
  };

  const handleDisablePIN = () => {
    disablePIN();
    showToast("Security PIN lock disabled", "info");
  };

  const handleWipeData = async () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete ALL accounts, transactions, custom categories, and security settings on this device. This cannot be undone. Are you absolutely sure?")) {
      await wipeAllData();
      setActivePanel('none');
      showToast("All application database records wiped", "success");
    }
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle || !remBody) {
      showToast("Title and message are required", "error");
      return;
    }
    const payload = {
      title: remTitle,
      body: remBody,
      amount: remAmount,
      category: remCategory,
      dayOfMonth: remDay,
      channel: remChannel
    };

    if (editingReminder) {
      updateReminder(editingReminder.id, payload);
    } else {
      addReminder(payload);
    }

    setEditingReminder(null);
    setIsAddingReminder(false);
    setRemTitle('');
    setRemBody('');
    setRemAmount(0);
    setRemCategory('Bills');
    setRemDay(1);
    setRemChannel('Bill Reminders');
  };

  const startEditReminder = (rem: any) => {
    setEditingReminder(rem);
    setIsAddingReminder(false);
    setRemTitle(rem.title);
    setRemBody(rem.body);
    setRemAmount(rem.amount);
    setRemCategory(rem.category);
    setRemDay(rem.dayOfMonth);
    setRemChannel(rem.channel);
  };

  const startAddReminder = () => {
    setEditingReminder(null);
    setIsAddingReminder(true);
    setRemTitle('');
    setRemBody('');
    setRemAmount(0);
    setRemCategory('Bills');
    setRemDay(1);
    setRemChannel('Bill Reminders');
  };

  return (
    <div className="pb-24 transition-all duration-300">
      
      {/* Header Panel */}
      {activePanel === 'none' ? (
        <header className="pt-6 px-4 max-w-lg mx-auto text-left">
          <div className="flex items-center space-x-2.5">
            <AppIconFull size={36} className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-text-subtle uppercase tracking-wide">
                Pocket Ledger
              </span>
              <h1 id="settings-title" className="text-2xl font-bold text-text-primary font-display mt-0.5">
                App Settings
              </h1>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 bg-bg-surface border-b border-border-custom z-20 flex justify-between items-center px-4 py-2 mx-auto max-w-lg">
          <button
            id="settings-subpanel-back-btn"
            onClick={() => { setActivePanel('none'); setSecError(null); }}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-white/5 text-text-primary cursor-pointer"
            aria-label="Back to settings menu"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-1.5 justify-center">
            <AppIconFull size={24} className="w-6 h-6 rounded-lg flex-shrink-0" />
            <h1 className="text-sm font-bold text-text-primary font-display">
              {activePanel === 'categories' && 'Manage Categories'}
              {activePanel === 'security' && 'PIN Lock & Security'}
              {activePanel === 'backup' && 'Database Backup'}
              {activePanel === 'currency' && 'Currency Settings'}
              {activePanel === 'theme' && 'Visual Theme'}
              {activePanel === 'budgets' && 'Monthly Budgets'}
            </h1>
          </div>
          <div className="w-10 h-10" />
        </header>
      )}

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-6">
        
        {loading ? (
          <div className="space-y-4">
            <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
            <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
          </div>
        ) : activePanel === 'none' ? (
          /* Main Settings Menu */
          <nav aria-label="Settings options menu" className="bento-card divide-y divide-border-custom overflow-hidden p-0">
            {/* Categories Option */}
            <button
              id="settings-menu-categories"
              onClick={() => setActivePanel('categories')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl" aria-hidden="true">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Manage Categories</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Add or edit transaction categories</span>
                </div>
              </div>
            </button>

            {/* Budgets Option */}
            <button
              id="settings-menu-budgets"
              onClick={() => setActivePanel('budgets')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-accent-amber/10 text-accent-amber rounded-xl" aria-hidden="true">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Monthly Budgets</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Set and plan category spend limits</span>
                </div>
              </div>
            </button>

            {/* Reminders Option */}
            <button
              id="settings-menu-reminders"
              onClick={() => setActivePanel('reminders')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-accent-green/10 text-accent-green-light rounded-xl" aria-hidden="true">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Notification Reminders</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Create, edit, and schedule push alerts</span>
                </div>
              </div>
            </button>

            {/* Security Option */}
            <button
              id="settings-menu-security"
              onClick={() => setActivePanel('security')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-accent-violet/10 text-accent-violet rounded-xl" aria-hidden="true">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">App Security</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">
                    PIN lock: {pinHash ? 'Enabled' : 'Disabled'} • Auto-lock
                  </span>
                </div>
              </div>
            </button>

            {/* Backup Option */}
            <button
              id="settings-menu-backup"
              onClick={() => setActivePanel('backup')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-accent-green/10 text-accent-green-light rounded-xl" aria-hidden="true">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Backup & Restore</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Export data to JSON file or import records</span>
                </div>
              </div>
            </button>

            {/* Currency Option */}
            <button
              id="settings-menu-currency"
              onClick={() => setActivePanel('currency')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-accent-amber/10 text-accent-amber rounded-xl" aria-hidden="true">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Currency Settings</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Selected symbol: {currency}</span>
                </div>
              </div>
            </button>

            {/* Theme Option */}
            <button
              id="settings-menu-theme"
              onClick={() => setActivePanel('theme')}
              className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-white/5 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-white/5 text-text-secondary rounded-xl" aria-hidden="true">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary block font-display">Visual Theme</span>
                  <span className="text-[10px] text-text-subtle block mt-0.5 font-body">Selected: {theme.toUpperCase()}</span>
                </div>
              </div>
            </button>
          </nav>
        ) : (
          /* Sub panels */
          <div className="space-y-4">
            
            {/* 1. Sub-panel Categories */}
            {activePanel === 'categories' && (
              <section id="settings-categories-panel" aria-labelledby="settings-title" className="bento-card space-y-4 text-left">
                {/* Type Switcher */}
                <div className="flex p-1 bg-bg-base border border-border-custom rounded-xl" role="tablist" aria-label="Category type selector">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={catType === 'expense'}
                    onClick={() => setCatType('expense')}
                    className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs font-bold transition cursor-pointer ${
                      catType === 'expense'
                        ? 'bg-bg-elevated text-accent-red border border-white/5 shadow-sm'
                        : 'text-text-subtle'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={catType === 'income'}
                    onClick={() => setCatType('income')}
                    className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs font-bold transition cursor-pointer ${
                      catType === 'income'
                        ? 'bg-bg-elevated text-accent-green-light border border-white/5 shadow-sm'
                        : 'text-text-subtle'
                    }`}
                  >
                    Income
                  </button>
                </div>

                {/* Add category form */}
                <form onSubmit={handleAddCategory} className="flex space-x-2">
                  <label htmlFor="settings-cat-name-input" className="sr-only">New Category Name</label>
                  <input
                    id="settings-cat-name-input"
                    type="text"
                    required
                    placeholder="Custom category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                  />
                  <button
                    id="settings-cat-submit-btn"
                    type="submit"
                    className="px-4 py-2 min-h-[44px] bg-accent-green hover:bg-accent-green/90 text-bg-base rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Categories list */}
                <div id="settings-cat-list" className="divide-y divide-border-custom overflow-y-auto max-h-56 no-scrollbar pt-2" aria-label="Available categories">
                  {categories
                    .filter((c) => c.type === catType)
                    .map((cat) => (
                      <article key={cat.id} className="flex justify-between items-center py-2 min-h-[44px] text-xs">
                        <span className="text-text-secondary font-medium">{cat.name}</span>
                        {cat.isCustom ? (
                          <button
                            id={`settings-cat-delete-${cat.name}`}
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            aria-label={`Delete custom category ${cat.name}`}
                            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/5 text-text-subtle hover:text-accent-red cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-text-subtle uppercase">
                            Preset
                          </span>
                        )}
                      </article>
                    ))}
                </div>
              </section>
            )}

            {/* Sub-panel Budgets */}
            {activePanel === 'budgets' && (
              <section id="settings-budgets-panel" className="bento-card space-y-4 text-left">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-text-primary font-display">Configure Category Limits</h2>
                  <p className="text-[10px] text-text-subtle leading-normal font-body">
                    Enter the maximum monthly budget limit for each category. Set to 0 to disable tracking.
                  </p>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar divide-y divide-border-custom" aria-label="Monthly budget categories">
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => {
                      const currentVal = budgets[cat.name] || 0;
                      return (
                        <div key={cat.id} className="pt-3 pb-1 flex items-center justify-between space-x-4">
                          <span className="text-xs font-bold text-text-secondary">{cat.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-text-subtle">{currency}</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              defaultValue={currentVal || ''}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBudget(cat.name, val);
                              }}
                              className="w-24 min-h-[36px] px-2 py-1 rounded-lg border border-border-custom bg-bg-base text-text-primary text-xs font-bold text-right focus:outline-none focus:border-accent-green"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* Sub-panel Reminders */}
            {activePanel === 'reminders' && (
              <section id="settings-reminders-panel" className="bento-card space-y-4 text-left">
                {isAddingReminder || editingReminder ? (
                  <form onSubmit={handleSaveReminder} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-sm font-bold text-text-primary font-display">
                        {editingReminder ? 'Edit Notification Alert' : 'New Notification Alert'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => { setIsAddingReminder(false); setEditingReminder(null); }}
                        className="text-xs font-bold text-text-subtle hover:text-text-primary cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label htmlFor="rem-title-input" className="text-[10px] font-bold text-text-secondary uppercase">Alert Title</label>
                        <input
                          id="rem-title-input"
                          type="text"
                          required
                          placeholder="e.g. Electricity Bill"
                          value={remTitle}
                          onChange={(e) => setRemTitle(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="rem-body-input" className="text-[10px] font-bold text-text-secondary uppercase">Message Body</label>
                        <textarea
                          id="rem-body-input"
                          required
                          placeholder="e.g. ₹1,240 · due in 2 days"
                          value={remBody}
                          onChange={(e) => setRemBody(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="rem-amount-input" className="text-[10px] font-bold text-text-secondary uppercase">Amount ({currency})</label>
                          <input
                            id="rem-amount-input"
                            type="number"
                            placeholder="0"
                            value={remAmount || ''}
                            onChange={(e) => setRemAmount(parseFloat(e.target.value) || 0)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs text-right focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="rem-day-input" className="text-[10px] font-bold text-text-secondary uppercase">Day of Month</label>
                          <input
                            id="rem-day-input"
                            type="number"
                            min={1}
                            max={31}
                            required
                            placeholder="1"
                            value={remDay}
                            onChange={(e) => setRemDay(parseInt(e.target.value, 10) || 1)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="rem-cat-select" className="text-[10px] font-bold text-text-secondary uppercase">Category</label>
                          <select
                            id="rem-cat-select"
                            value={remCategory}
                            onChange={(e) => setRemCategory(e.target.value)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="rem-channel-select" className="text-[10px] font-bold text-text-secondary uppercase">Alert Type</label>
                          <select
                            id="rem-channel-select"
                            value={remChannel}
                            onChange={(e) => setRemChannel(e.target.value as any)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                          >
                            <option value="Bill Reminders">Bill Reminder</option>
                            <option value="Loan Repayments">Loan Repayment</option>
                            <option value="Budget Alerts">Budget Alert</option>
                            <option value="Backup Reminders">Backup Reminder</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold rounded-xl text-xs shadow-md transition duration-150 cursor-pointer text-center"
                    >
                      {editingReminder ? 'Save Changes' : 'Schedule Alert'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-sm font-bold text-text-primary font-display">Scheduled Reminders</h2>
                      <button
                        onClick={startAddReminder}
                        className="px-3 py-1.5 bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold rounded-lg text-[10px] shadow-xs transition duration-150 cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Alert</span>
                      </button>
                    </div>

                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto no-scrollbar pr-1 divide-y divide-border-custom">
                      {reminders.length > 0 ? (
                        reminders.map((rem) => (
                          <div key={rem.id} className="pt-3 pb-1 flex items-center justify-between space-x-4">
                            <div className="min-w-0 text-left space-y-0.5">
                              <h3 className="text-xs font-bold text-text-primary truncate">{rem.title}</h3>
                              <p className="text-[10px] text-text-subtle truncate max-w-[200px]">{rem.body}</p>
                              <span className="inline-block text-[8px] font-extrabold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-text-secondary uppercase">
                                Day {rem.dayOfMonth} · {rem.channel}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                onClick={() => startEditReminder(rem)}
                                aria-label={`Edit reminder ${rem.title}`}
                                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/5 text-text-subtle hover:text-text-primary cursor-pointer"
                              >
                                <Palette className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteReminder(rem.id)}
                                aria-label={`Delete reminder ${rem.title}`}
                                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/5 text-text-subtle hover:text-accent-red cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-text-subtle text-xs">
                          No custom reminders scheduled yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 2. Sub-panel Security */}
            {activePanel === 'security' && (
              <section id="settings-security-panel" aria-labelledby="settings-title" className="bento-card space-y-4 text-left">
                {pinHash ? (
                  <div className="p-4 bg-white/5 border border-border-custom rounded-2xl flex flex-col space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-text-primary">
                        PIN Lock is Active
                      </span>
                      <button
                        id="settings-security-disable-btn"
                        onClick={handleDisablePIN}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl border border-accent-red/20 bg-accent-red/10 text-xs font-bold text-accent-red cursor-pointer hover:bg-accent-red/20"
                      >
                        Disable PIN
                      </button>
                    </div>
                    <div className="border-t border-border-custom pt-3 text-left">
                      <span className="text-[9px] uppercase font-bold text-text-subtle block">
                        Recovery Question
                      </span>
                      <span className="text-xs font-medium text-text-secondary block mt-0.5">
                        {securityQuestion}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Set PIN form */
                  <form onSubmit={handleSetPin} className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="settings-security-pin-input" className="text-[9px] text-text-secondary uppercase font-bold">
                          Set PIN
                        </label>
                        <input
                          id="settings-security-pin-input"
                          type="password"
                          required
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={secPin}
                          onChange={(e) => setSecPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="4-6 digits"
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs text-center font-bold focus:border-accent-green"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="settings-security-confirm-pin-input" className="text-[9px] text-text-secondary uppercase font-bold">
                          Confirm PIN
                        </label>
                        <input
                          id="settings-security-confirm-pin-input"
                          type="password"
                          required
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={secConfirmPin}
                          onChange={(e) => setSecConfirmPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Repeat PIN"
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs text-center font-bold focus:border-accent-green"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="settings-security-question-select" className="text-[9px] text-text-secondary uppercase font-bold">
                        Recovery Question
                      </label>
                      <select
                        id="settings-security-question-select"
                        value={secQuestion}
                        onChange={(e) => setSecQuestion(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none focus:border-accent-green"
                      >
                        <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                        <option value="In what city were you born?">In what city were you born?</option>
                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        <option value="What was your first car?">What was your first car?</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="settings-security-answer-input" className="text-[9px] text-text-secondary uppercase font-bold">
                        Recovery Answer
                      </label>
                      <input
                        id="settings-security-answer-input"
                        type="text"
                        required
                        placeholder="Case-insensitive answer"
                        value={secAnswer}
                        onChange={(e) => setSecAnswer(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none focus:border-accent-green"
                      />
                    </div>

                    {secError && (
                      <p className="text-[10px] text-accent-red font-semibold text-center mt-1">
                        {secError}
                      </p>
                    )}

                    <button
                      id="settings-security-submit-btn"
                      type="submit"
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-sm cursor-pointer"
                    >
                      Set PIN Lock
                    </button>
                  </form>
                )}

                <div className="border-t border-border-custom my-4" />

                {/* Toggles */}
                <div className="space-y-4 text-xs">
                  {/* Auto Lock Timeout */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-text-primary block">Auto-lock Screen</span>
                      <span className="text-[9px] text-text-subtle">Lock app after background period</span>
                    </div>
                    <select
                      id="settings-security-lock-select"
                      value={autoLockTimeout}
                      onChange={(e) => setAutoLockTimeout(parseInt(e.target.value, 10))}
                      className="px-2 py-1 min-h-[36px] rounded-lg border border-border-custom bg-bg-base text-text-primary focus:outline-none"
                    >
                      <option value={0}>Immediately</option>
                      <option value={1}>1 Minute</option>
                      <option value={5}>5 Minutes</option>
                      <option value={15}>15 Minutes</option>
                      <option value={-1}>Never</option>
                    </select>
                  </div>

                  {/* Hide Balance Toggle */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-text-primary block">Hide Balances</span>
                      <span className="text-[9px] text-text-subtle">Blurs amounts by default</span>
                    </div>
                    <button
                      id="settings-security-blur-toggle-btn"
                      type="button"
                      onClick={() => setHideBalance(!hideBalance)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        hideBalance ? 'bg-accent-green' : 'bg-bg-base border border-border-custom'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                        hideBalance ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Sub-panel Backup */}
            {activePanel === 'backup' && (
              <section id="settings-backup-panel" aria-labelledby="settings-title" className="bento-card space-y-5 text-left">
                <div className="space-y-4">
                  {/* Export */}
                  <article className="space-y-2">
                    <h2 className="text-xs font-bold text-text-secondary">
                      Export Data (JSON)
                    </h2>
                    <p className="text-[10px] text-text-subtle leading-normal">
                      Downloads a clear-text JSON file containing all ledger data. You can share this file manually to backup your records.
                    </p>
                    <button
                      id="settings-backup-export-btn"
                      onClick={handleExportBackup}
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Create & Download Backup</span>
                    </button>
                  </article>

                  <div className="border-t border-border-custom my-3" />

                  {/* Import */}
                  <article className="space-y-2">
                    <h2 className="text-xs font-bold text-text-secondary">
                      Restore Data (JSON)
                    </h2>
                    <p className="text-[10px] text-text-subtle leading-normal">
                      Select a previously exported JSON backup file to restore. Note that restoring files will completely overwrite your current database.
                    </p>
                    <div className="relative">
                      <input
                        id="settings-backup-import-file"
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full border-2 border-dashed border-border-custom hover:border-text-subtle rounded-2xl py-5 text-center text-xs font-bold text-text-secondary cursor-pointer min-h-[50px] flex items-center justify-center">
                        Click to Browse Backup File
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            )}

            {/* 4. Sub-panel Currency */}
            {activePanel === 'currency' && (
              <section id="settings-currency-panel" aria-labelledby="settings-title" className="bento-card text-left space-y-4">
                <div className="space-y-1">
                  <label htmlFor="settings-currency-select" className="text-[9px] text-text-secondary uppercase font-bold">
                    Choose Currency Symbol
                  </label>
                  <select
                    id="settings-currency-select"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      showToast(`Currency changed to ${e.target.value}`, "success");
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-sm font-medium focus:outline-none focus:border-accent-green"
                  >
                    <option value="₹">₹ INR (Indian Rupee)</option>
                    <option value="$">$ USD (US Dollar)</option>
                    <option value="€">€ EUR (Euro)</option>
                    <option value="£">£ GBP (British Pound)</option>
                    <option value="¥">¥ JPY (Japanese Yen)</option>
                    <option value="₩">₩ KRW (Korean Won)</option>
                    <option value="₦">₦ NGN (Nigerian Naira)</option>
                  </select>
                </div>
              </section>
            )}

            {/* 5. Sub-panel Theme */}
            {activePanel === 'theme' && (
              <section id="settings-theme-panel" aria-labelledby="settings-title" className="bento-card text-left space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      id={`settings-theme-btn-${t}`}
                      onClick={() => {
                        setTheme(t);
                        showToast(`Theme updated to ${t}`, "success");
                      }}
                      className={`py-3.5 min-h-[44px] rounded-2xl text-xs font-bold border transition cursor-pointer ${
                        theme === t
                          ? 'bg-accent-green border-accent-green text-bg-base shadow-sm'
                          : 'bg-bg-base border-border-custom text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Danger zone */}
            <aside aria-labelledby="danger-zone-title" className="glass-panel rounded-3xl p-5 border border-accent-red/20 text-left space-y-3.5 bg-accent-red/5">
              <h2 id="danger-zone-title" className="text-xs font-bold text-accent-red flex items-center space-x-1.5 m-0 font-display">
                <AlertOctagon className="w-4.5 h-4.5" />
                <span>Danger Zone</span>
              </h2>
              <p className="text-[10px] text-text-subtle leading-normal">
                Clicking below will clear the local device SQLite simulation database and remove your login PIN lock codes permanently. This action is irreversible.
              </p>
              <button
                id="settings-danger-wipe-btn"
                onClick={handleWipeData}
                className="w-full min-h-[44px] py-2.5 rounded-xl border border-accent-red/35 hover:bg-accent-red/10 text-accent-red text-xs font-bold transition cursor-pointer"
              >
                Reset App Data & Clear DB
              </button>
            </aside>
          </div>
        )}

        {/* Footer Version Details */}
        <footer className="text-center pt-4">
          <p className="text-[10px] text-text-subtle font-semibold tracking-wider uppercase font-body">
            Pocket Ledger v1.0.0
          </p>
          <p className="text-[9px] text-text-subtle mt-0.5 font-body opacity-80">
            Privacy-First • Completely Offline
          </p>
        </footer>

      </div>
    </div>
  );
};
