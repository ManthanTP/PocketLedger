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
      version: '1.0',
      exportedAt: Date.now(),
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
      <div>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          Pocket Ledger
        </span>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          App Settings
        </h2>
      </div>

      {/* Main Settings Menu */}
      {activePanel === 'none' ? (
        <div className="glass-panel rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/30 overflow-hidden shadow-xs">
          
          {/* Categories Option */}
          <button
            onClick={() => setActivePanel('categories')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150">Manage Categories</h4>
                <p className="text-[10px] text-slate-400">Add or edit transaction categories</p>
              </div>
            </div>
          </button>

          {/* Security Option */}
          <button
            onClick={() => setActivePanel('security')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-400 rounded-xl">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150">App Security</h4>
                <p className="text-[10px] text-slate-400">
                  PIN lock: {pinHash ? 'Enabled' : 'Disabled'} • Auto-lock
                </p>
              </div>
            </div>
          </button>

          {/* Backup Option */}
          <button
            onClick={() => setActivePanel('backup')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded-xl">
                <Database className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150">Backup & Restore</h4>
                <p className="text-[10px] text-slate-400">Export data to JSON file or import records</p>
              </div>
            </div>
          </button>

          {/* Currency Option */}
          <button
            onClick={() => setActivePanel('currency')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
                <CircleDollarSign className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150">Currency Settings</h4>
                <p className="text-[10px] text-slate-400">Selected symbol: {currency}</p>
              </div>
            </div>
          </button>

          {/* Theme Option */}
          <button
            onClick={() => setActivePanel('theme')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-850 text-slate-500 rounded-xl">
                <SettingsIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150">Visual Theme</h4>
                <p className="text-[10px] text-slate-400">Selected: {theme.toUpperCase()}</p>
              </div>
            </div>
          </button>

        </div>
      ) : (
        /* Sub panels */
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => { setActivePanel('none'); setSecError(null); }}
            className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>← Back to Settings</span>
          </button>

          {/* 1. Sub-panel Categories */}
          {activePanel === 'categories' && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">
                Manage Categories
              </h3>

              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-150 dark:bg-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCatType('expense')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    catType === 'expense'
                      ? 'bg-white dark:bg-slate-800 text-rose-500'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setCatType('income')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    catType === 'income'
                      ? 'bg-white dark:bg-slate-800 text-green-500'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Custom category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {/* Categories list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-850 overflow-y-auto max-h-56 no-scrollbar pt-2">
                {categories
                  .filter((c) => c.type === catType)
                  .map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center py-2 text-xs">
                      <span className="text-slate-700 dark:text-slate-200">{cat.name}</span>
                      {cat.isCustom ? (
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-350 dark:text-slate-550 uppercase">
                          System Preset
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 2. Sub-panel Security */}
          {activePanel === 'security' && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                PIN Lock & Security
              </h3>

              {pinHash ? (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-2xl flex flex-col space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-705 dark:text-slate-300">
                      Security PIN Lock is ENABLED
                    </span>
                    <button
                      onClick={disablePIN}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Disable PIN Lock
                    </button>
                  </div>
                  <div className="border-t border-indigo-100/50 dark:border-indigo-950 pt-3">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Active Recovery Question
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mt-0.5">
                      {securityQuestion}
                    </span>
                  </div>
                </div>
              ) : (
                /* Set PIN form */
                <form onSubmit={handleSetPin} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-bold">
                        Set PIN
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={secPin}
                        onChange={(e) => setSecPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="4-6 digits"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-xs text-center font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-bold">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={secConfirmPin}
                        onChange={(e) => setSecConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Repeat PIN"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-xs text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase font-bold">
                      Recovery Question
                    </label>
                    <select
                      value={secQuestion}
                      onChange={(e) => setSecQuestion(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-150 text-xs"
                    >
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was your first car?">What was your first car?</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase font-bold">
                      Recovery Answer
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Case-insensitive answer"
                      value={secAnswer}
                      onChange={(e) => setSecAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-xs"
                    />
                  </div>

                  {secError && (
                    <p className="text-[10px] text-rose-500 font-semibold text-center mt-1">
                      {secError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
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
                    <span className="font-bold text-slate-750 dark:text-slate-250 block">Auto-lock Screen</span>
                    <span className="text-[9px] text-slate-400">Lock app after in background</span>
                  </div>
                  <select
                    value={autoLockTimeout}
                    onChange={(e) => setAutoLockTimeout(parseInt(e.target.value, 10))}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
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
                    <span className="font-bold text-slate-755 dark:text-slate-255 block">Hide Balances</span>
                    <span className="text-[9px] text-slate-400">Blurs amounts by default app-wide</span>
                  </div>
                  <button
                    type="button"
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
            </div>
          )}

          {/* 3. Sub-panel Backup */}
          {activePanel === 'backup' && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-5 text-left">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                Database Backup & Restore
              </h3>
              
              <div className="space-y-4">
                {/* Export Card */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Export Data (JSON)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Downloads a clear-text JSON file containing all categories, accounts, and transactions. You can share this file manually to backup your ledger.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Create & Download Backup</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/40 my-3" />

                {/* Import Card */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-305">
                    Restore Data (JSON)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Select a previously exported JSON backup file to restore. Note that restoring files will completely overwrite your current device ledger.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-350 rounded-2xl py-5 text-center text-xs font-bold text-slate-500 cursor-pointer">
                      Click to Browse Backup File
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Sub-panel Currency */}
          {activePanel === 'currency' && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                Currency Settings
              </h3>
              
              <div className="space-y-1 text-left">
                <label className="text-[9px] text-slate-450 uppercase font-bold">
                  Choose Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none"
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
            </div>
          )}

          {/* 5. Sub-panel Theme */}
          {activePanel === 'theme' && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                Visual Theme
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`py-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                      theme === t
                        ? 'bg-slate-800 dark:bg-slate-100 border-slate-800 dark:border-slate-100 text-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Danger zone (Always displayed at bottom of subpanel settings) */}
          <div className="glass-panel rounded-3xl p-5 border border-rose-200/50 dark:border-rose-950 text-left space-y-3.5 bg-rose-50/20 dark:bg-rose-950/5">
            <h4 className="text-xs font-bold text-rose-500 flex items-center space-x-1.5">
              <AlertOctagon className="w-4.5 h-4.5" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-[10px] text-slate-450 leading-normal">
              Clicking below will clear the local device SQLite simulation database and remove your login PIN lock codes permanently. E.g., to restore or clear records.
            </p>
            <button
              onClick={async () => {
                if (window.confirm("CRITICAL WARNING: This will permanently delete ALL accounts, transactions, custom categories, and security settings on this device. This cannot be undone. Are you absolutely sure?")) {
                  await wipeAllData();
                  setActivePanel('none');
                  alert("Application database successfully reset.");
                }
              }}
              className="w-full py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-455 text-xs font-bold transition cursor-pointer"
            >
              Reset App Data & Clear DB
            </button>
          </div>
        </div>
      )}

      {/* Footer Version Details */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          Pocket Ledger v1.0.0
        </p>
        <p className="text-[9px] text-slate-350 dark:text-slate-600 mt-0.5">
          Privacy-First • Completely Offline
        </p>
      </div>

    </div>
  );
};
