import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Settings as SettingsIcon, Shield, Database, Palette, CircleDollarSign, Plus, Trash2, AlertOctagon, Save } from 'lucide-react';
import type { Category } from '../db/db';

type SubPanel = 'none' | 'categories' | 'security' | 'backup' | 'currency' | 'theme';

export const Settings: React.FC = () => {
  const {
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

  // --- BACKUP ACTIONS ---
  const handleExportBackup = () => {
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
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!json.accounts || !json.transactions || !json.categories) {
          alert("Invalid backup file format. Missing data arrays.");
          return;
        }

        if (window.confirm("WARNING: Restoring this backup will completely overwrite your current database. This action cannot be undone. Are you sure you want to proceed?")) {
          // Import procedure: clear database, and import all items
          const dbInstance = await import('../db/db').then(m => m.db); // import to write directly
          
          // Clear DB first
          await useFinanceStore.getState().wipeAllData();

          // Write accounts
          for (const acc of json.accounts) {
            await dbInstance.saveAccount(acc);
          }
          // Write transactions
          for (const tx of json.transactions) {
            await dbInstance.saveTransaction(tx);
          }
          // Write categories
          for (const cat of json.categories) {
            await dbInstance.saveCategory(cat);
          }

          // Restore settings in LocalStorage & Store
          if (json.settings) {
            if (json.settings.currency) useFinanceStore.getState().setCurrency(json.settings.currency);
            if (json.settings.theme) useFinanceStore.getState().setTheme(json.settings.theme);
            if (json.settings.autoLockTimeout !== undefined) useFinanceStore.getState().setAutoLockTimeout(json.settings.autoLockTimeout);
            if (json.settings.hideBalance !== undefined) useFinanceStore.getState().setHideBalance(json.settings.hideBalance);
            
            if (json.settings.pinHash) {
              localStorage.setItem('pinHash', json.settings.pinHash);
              if (json.settings.securityQuestion) localStorage.setItem('securityQuestion', json.settings.securityQuestion);
              if (json.settings.securityAnswer) localStorage.setItem('securityAnswer', 'restored_recovery_hash'); // set dummy or keep original
              
              useFinanceStore.setState({
                pinHash: json.settings.pinHash,
                securityQuestion: json.settings.securityQuestion,
                isLocked: false
              });
            }
          }

          // Reload data
          await useFinanceStore.getState().fetchData();
          alert("Backup successfully restored!");
          setActivePanel('none');
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), catType);
    setNewCatName('');
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
    alert("Security PIN successfully set.");
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Header */}
      <header className="text-left">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wide">
          Pocket Ledger
        </span>
        <h1 id="settings-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          {activePanel === 'none' && 'App Settings'}
          {activePanel === 'categories' && 'Manage Categories'}
          {activePanel === 'security' && 'PIN Lock & Security'}
          {activePanel === 'backup' && 'Database Backup'}
          {activePanel === 'currency' && 'Currency Settings'}
          {activePanel === 'theme' && 'Visual Theme'}
        </h1>
      </header>

      {/* Main Settings Menu */}
      {activePanel === 'none' ? (
        <nav aria-label="Settings navigation menu" className="glass-panel rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/30 overflow-hidden shadow-xs">
          
          {/* Categories Option */}
          <button
            id="settings-menu-categories"
            onClick={() => setActivePanel('categories')}
            className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl" aria-hidden="true">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Manage Categories</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Add or edit transaction categories</span>
              </div>
            </div>
          </button>

          {/* Security Option */}
          <button
            id="settings-menu-security"
            onClick={() => setActivePanel('security')}
            className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 rounded-xl" aria-hidden="true">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-155 block">App Security</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  PIN lock: {pinHash ? 'Enabled' : 'Disabled'} • Auto-lock
                </span>
              </div>
            </div>
          </button>

          {/* Backup Option */}
          <button
            id="settings-menu-backup"
            onClick={() => setActivePanel('backup')}
            className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded-xl" aria-hidden="true">
                <Database className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Backup & Restore</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Export data to JSON file or import records</span>
              </div>
            </div>
          </button>

          {/* Currency Option */}
          <button
            id="settings-menu-currency"
            onClick={() => setActivePanel('currency')}
            className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl" aria-hidden="true">
                <CircleDollarSign className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Currency Settings</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Selected symbol: {currency}</span>
              </div>
            </div>
          </button>

          {/* Theme Option */}
          <button
            id="settings-menu-theme"
            onClick={() => setActivePanel('theme')}
            className="w-full flex items-center justify-between p-4 min-h-[48px] hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl" aria-hidden="true">
                <SettingsIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Visual Theme</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Selected: {theme.toUpperCase()}</span>
              </div>
            </div>
          </button>

        </nav>
      ) : (
        /* Sub panels */
        <div className="space-y-4">
          {/* Back button */}
          <button
            id="settings-subpanel-back-btn"
            onClick={() => { setActivePanel('none'); setSecError(null); }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer min-h-[44px] px-2"
          >
            <span>← Back to Settings</span>
          </button>

          {/* 1. Sub-panel Categories */}
          {activePanel === 'categories' && (
            <section id="settings-categories-panel" aria-labelledby="settings-title" className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-200 dark:bg-slate-900 rounded-xl" role="tablist" aria-label="Category type selector">
                <button
                  type="button"
                  role="tab"
                  aria-selected={catType === 'expense'}
                  onClick={() => setCatType('expense')}
                  className={`flex-1 py-2.5 min-h-[40px] rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    catType === 'expense'
                      ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={catType === 'income'}
                  onClick={() => setCatType('income')}
                  className={`flex-1 py-2.5 min-h-[40px] rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    catType === 'income'
                      ? 'bg-white dark:bg-slate-800 text-green-500 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
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
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                />
                <button
                  id="settings-cat-submit-btn"
                  type="submit"
                  className="px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </form>

              {/* Categories list */}
              <div id="settings-cat-list" className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-56 no-scrollbar pt-2" aria-label="Available categories">
                {categories
                  .filter((c) => c.type === catType)
                  .map((cat) => (
                    <article key={cat.id} className="flex justify-between items-center py-2.5 min-h-[44px] text-xs">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{cat.name}</span>
                      {cat.isCustom ? (
                        <button
                          id={`settings-cat-delete-${cat.name}`}
                          onClick={() => deleteCategory(cat.id)}
                          aria-label={`Delete custom category ${cat.name}`}
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          System Preset
                        </span>
                      )}
                    </article>
                  ))}
              </div>
            </section>
          )}

          {/* 2. Sub-panel Security */}
          {activePanel === 'security' && (
            <section id="settings-security-panel" aria-labelledby="settings-title" className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              
              {pinHash ? (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-2xl flex flex-col space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Security PIN Lock is ENABLED
                    </span>
                    <button
                      id="settings-security-disable-btn"
                      onClick={disablePIN}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Disable PIN
                    </button>
                  </div>
                  <div className="border-t border-indigo-100/50 dark:border-indigo-950 pt-3 text-left">
                    <span className="text-[9px] Y2K-style uppercase font-bold text-slate-400 block">
                      Active Recovery Question
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mt-0.5">
                      {securityQuestion}
                    </span>
                  </div>
                </div>
              ) : (
                /* Set PIN form */
                <form onSubmit={handleSetPin} className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="settings-security-pin-input" className="text-[9px] text-slate-400 uppercase font-bold">
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
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs text-center font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="settings-security-confirm-pin-input" className="text-[9px] text-slate-400 uppercase font-bold">
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
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="settings-security-question-select" className="text-[9px] text-slate-400 uppercase font-bold">
                      Recovery Question
                    </label>
                    <select
                      id="settings-security-question-select"
                      value={secQuestion}
                      onChange={(e) => setSecQuestion(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was your first car?">What was your first car?</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="settings-security-answer-input" className="text-[9px] text-slate-400 uppercase font-bold">
                      Recovery Answer
                    </label>
                    <input
                      id="settings-security-answer-input"
                      type="text"
                      required
                      placeholder="Case-insensitive answer"
                      value={secAnswer}
                      onChange={(e) => setSecAnswer(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    />
                  </div>

                  {secError && (
                    <p className="text-[10px] text-rose-500 font-semibold text-center mt-1">
                      {secError}
                    </p>
                  )}

                  <button
                    id="settings-security-submit-btn"
                    type="submit"
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    Set PIN Lock
                  </button>
                </form>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800/40 my-4" />

              {/* Security parameters toggles */}
              <div className="space-y-3.5 text-xs text-left">
                {/* Auto Lock Timeout */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">Auto-lock Screen</span>
                    <span className="text-[9px] text-slate-400">Lock app after in background</span>
                  </div>
                  <select
                    id="settings-security-lock-select"
                    value={autoLockTimeout}
                    onChange={(e) => setAutoLockTimeout(parseInt(e.target.value, 10))}
                    aria-label="Set auto-lock inactivity delay"
                    className="px-2 py-1 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
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
                    <span className="font-bold text-slate-800 dark:text-slate-300 block">Hide Balances</span>
                    <span className="text-[9px] text-slate-400">Blurs amounts by default app-wide</span>
                  </div>
                  <button
                    id="settings-security-blur-toggle-btn"
                    type="button"
                    aria-label="Toggle Hide Balances option"
                    onClick={() => setHideBalance(!hideBalance)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      hideBalance ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
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
            <section id="settings-backup-panel" aria-labelledby="settings-title" className="glass-panel rounded-3xl p-5 shadow-xs space-y-5 text-left">
              <div className="space-y-4">
                {/* Export Card */}
                <article className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Export Data (JSON)
                  </h2>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Downloads a clear-text JSON file containing all categories, accounts, and transactions. You can share this file manually to backup your ledger.
                  </p>
                  <button
                    id="settings-backup-export-btn"
                    onClick={handleExportBackup}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>Create & Download Backup</span>
                  </button>
                </article>

                <div className="border-t border-slate-100 dark:border-slate-800/40 my-3" />

                {/* Import Card */}
                <article className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Restore Data (JSON)
                  </h2>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Select a previously exported JSON backup file to restore. Note that restoring files will completely overwrite your current device ledger.
                  </p>
                  <div className="relative">
                    <input
                      id="settings-backup-import-file"
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      aria-label="Upload JSON backup file to restore"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400 rounded-2xl py-5 text-center text-xs font-bold text-slate-500 cursor-pointer min-h-[50px] flex items-center justify-center">
                      Click to Browse Backup File
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}

          {/* 4. Sub-panel Currency */}
          {activePanel === 'currency' && (
            <section id="settings-currency-panel" aria-labelledby="settings-title" className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <div className="space-y-1 text-left">
                <label htmlFor="settings-currency-select" className="text-[9px] text-slate-400 uppercase font-bold">
                  Choose Currency Symbol
                </label>
                <select
                  id="settings-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none"
                >
                  <option value="₹">₹ INR (Indian Rupee)</option>
                  <option value="$">$ USD (US Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                  <option value="£">£ GBP (British Pound)</option>
                  <option value="¥">¥ JPY (Japanese Yen)</option>
                  <option value="₩">₩ KRW (Korean Won)</option>
                  <option value="₦">₦ NGN (Nigerian Naira)</option>
                  <option value="custom">Custom (Setup custom in settings)</option>
                </select>
              </div>
            </section>
          )}

          {/* 5. Sub-panel Theme */}
          {activePanel === 'theme' && (
            <section id="settings-theme-panel" aria-labelledby="settings-title" className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    id={`settings-theme-btn-${t}`}
                    onClick={() => setTheme(t)}
                    className={`py-3.5 min-h-[44px] rounded-2xl text-xs font-bold border transition cursor-pointer ${
                      theme === t
                        ? 'bg-slate-800 dark:bg-slate-100 border-slate-800 dark:border-slate-100 text-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Danger zone (Always displayed at bottom of subpanel settings) */}
          <aside aria-labelledby="danger-zone-title" className="glass-panel rounded-3xl p-5 border border-rose-200/50 dark:border-rose-950 text-left space-y-3.5 bg-rose-50/20 dark:bg-rose-950/5">
            <h2 id="danger-zone-title" className="text-xs font-bold text-rose-500 flex items-center space-x-1.5 m-0">
              <AlertOctagon className="w-4.5 h-4.5" aria-hidden="true" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-[10px] text-slate-400 leading-normal">
              Clicking below will clear the local device SQLite simulation database and remove your login PIN lock codes permanently. E.g., to restore or clear records.
            </p>
            <button
              id="settings-danger-wipe-btn"
              onClick={async () => {
                if (window.confirm("CRITICAL WARNING: This will permanently delete ALL accounts, transactions, custom categories, and security settings on this device. This cannot be undone. Are you absolutely sure?")) {
                  await wipeAllData();
                  setActivePanel('none');
                  alert("Application database successfully reset.");
                }
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
            >
              Reset App Data & Clear DB
            </button>
          </aside>
        </div>
      )}

      {/* Footer Version Details */}
      <footer className="text-center pt-4">
        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          Pocket Ledger v1.0.0
        </p>
        <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">
          Privacy-First • Completely Offline
        </p>
      </footer>

    </div>
  );
};
