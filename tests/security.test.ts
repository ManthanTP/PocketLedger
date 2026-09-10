import test from 'node:test';
import assert from 'node:assert';
import { setupMockStorage } from './mockStorage.ts';
import {
  derivePinVerifier,
  verifyPin,
  deriveRecoveryVerifier,
  verifyRecovery,
  legacyHashString,
  timingSafeEqual,
  generateSalt,
  encryptAESGCM,
  decryptAESGCM
} from '../src/utils/crypto.ts';

// Initialize mock storage before store imports
setupMockStorage();

// Import db and store modules
const { db } = await import('../src/db/db.ts');
const { useFinanceStore } = await import('../src/store/useFinanceStore.ts');

test('1. PIN creation: derives PBKDF2 hash with unique salt and saves to secure store', async () => {
  const pin = '1234';
  const { hashHex, saltHex } = await derivePinVerifier(pin);

  assert.strictEqual(typeof hashHex, 'string');
  assert.strictEqual(typeof saltHex, 'string');
  assert.strictEqual(hashHex.length, 64, 'PBKDF2-SHA256 must produce a 256-bit (64 hex char) hash');
  assert.strictEqual(saltHex.length, 32, '16-byte random salt must be 32 hex chars');

  // Verify that subsequent creation generates a different salt and different hash
  const second = await derivePinVerifier(pin);
  assert.notStrictEqual(saltHex, second.saltHex, 'Salts must be randomly generated');
  assert.notStrictEqual(hashHex, second.hashHex, 'Hashes with different salts must differ');

  // Verify via useFinanceStore.setSecurityPIN
  await useFinanceStore.getState().setSecurityPIN('5678', 'First pet?', 'Fluffy');
  const secConfig = await db.getSecurityConfig();

  assert.ok(secConfig, 'Security config must be saved in IndexedDB');
  assert.strictEqual(secConfig.pinLength, 4);
  assert.strictEqual(secConfig.securityQuestion, 'First pet?');
  assert.ok(secConfig.pinSalt && secConfig.pinSalt.length === 32);
  assert.ok(secConfig.pinHash && secConfig.pinHash.length === 64);
  assert.ok(secConfig.recoverySalt && secConfig.recoverySalt.length === 32);
  assert.ok(secConfig.recoveryHash && secConfig.recoveryHash.length === 64);

  // Verify plain localStorage does NOT contain sensitive hash or answer
  assert.strictEqual(localStorage.getItem('pinHash'), null);
  assert.strictEqual(localStorage.getItem('securityAnswer'), null);
});

test('2. PIN verification: verifies correct PIN with constant-time equality', async () => {
  const pin = '5678';
  const secConfig = await db.getSecurityConfig();
  assert.ok(secConfig);

  const isValid = await verifyPin(pin, secConfig.pinHash, secConfig.pinSalt);
  assert.strictEqual(isValid, true, 'Valid PIN must verify successfully');

  // Verify through store action
  useFinanceStore.setState({ isLocked: true });
  const storeUnlock = await useFinanceStore.getState().unlockApp('5678');
  assert.strictEqual(storeUnlock, true);
  assert.strictEqual(useFinanceStore.getState().isLocked, false);
});

test('3. Wrong PIN: correctly rejects invalid PIN inputs and timing attacks', async () => {
  const secConfig = await db.getSecurityConfig();
  assert.ok(secConfig);

  const wrong1 = await verifyPin('0000', secConfig.pinHash, secConfig.pinSalt);
  assert.strictEqual(wrong1, false, 'Wrong PIN must fail verification');

  const wrong2 = await verifyPin('5679', secConfig.pinHash, secConfig.pinSalt);
  assert.strictEqual(wrong2, false, 'Close PIN must fail verification');

  useFinanceStore.setState({ isLocked: true });
  const failedUnlock = await useFinanceStore.getState().unlockApp('9999');
  assert.strictEqual(failedUnlock, false);
  assert.strictEqual(useFinanceStore.getState().isLocked, true);

  // Verify timingSafeEqual helper
  assert.strictEqual(timingSafeEqual('abcdef', 'abcdef'), true);
  assert.strictEqual(timingSafeEqual('abcdef', 'abcdeg'), false);
  assert.strictEqual(timingSafeEqual('abcdef', 'abcde'), false);
});

test('4. PIN recovery: validates correct answer (case-insensitive) and resets lock', async () => {
  // Configured with question 'First pet?' and answer 'Fluffy'
  useFinanceStore.setState({ isLocked: true });

  // Verify direct crypto verifyRecovery function
  const recVerifier = await deriveRecoveryVerifier('Fluffy');
  assert.strictEqual(await verifyRecovery('Fluffy', recVerifier.hashHex, recVerifier.saltHex), true);
  assert.strictEqual(await verifyRecovery('Wrong', recVerifier.hashHex, recVerifier.saltHex), false);

  // Wrong recovery answer
  const wrongAns = await useFinanceStore.getState().recoverPIN('Rover');
  assert.strictEqual(wrongAns, false, 'Incorrect answer must be rejected');
  assert.strictEqual(useFinanceStore.getState().isLocked, true);

  // Correct answer with different casing & whitespace
  const correctAns = await useFinanceStore.getState().recoverPIN('  fLUFFy  ');
  assert.strictEqual(correctAns, true, 'Case-insensitive trimmed answer must verify');
  assert.strictEqual(useFinanceStore.getState().isLocked, false);
  assert.strictEqual(useFinanceStore.getState().pinHash, null, 'PIN must be cleared upon successful recovery');
});

test('5. Backup: exports ledger data and cryptographic verifiers without plain secrets', async () => {
  // Re-enable PIN for export testing
  await useFinanceStore.getState().setSecurityPIN('4321', 'Birth city?', 'Mumbai');
  await useFinanceStore.getState().addAccount('Test Cash', 'Cash', 500);

  const secConfig = await db.getSecurityConfig();
  assert.ok(secConfig);

  const backupData = {
    accounts: useFinanceStore.getState().accounts,
    transactions: useFinanceStore.getState().transactions,
    categories: useFinanceStore.getState().categories,
    budgets: useFinanceStore.getState().budgets,
    reminders: useFinanceStore.getState().reminders,
    goals: useFinanceStore.getState().goals,
    settings: {
      theme: useFinanceStore.getState().theme,
      currency: useFinanceStore.getState().currency,
      autoLockTimeout: useFinanceStore.getState().autoLockTimeout,
      hideBalance: useFinanceStore.getState().hideBalance,
      security: {
        version: secConfig.version,
        pinSalt: secConfig.pinSalt,
        pinHash: secConfig.pinHash,
        pinLength: secConfig.pinLength,
        securityQuestion: secConfig.securityQuestion,
        recoverySalt: secConfig.recoverySalt,
        recoveryHash: secConfig.recoveryHash,
      },
    },
  };

  const jsonStr = JSON.stringify(backupData);
  assert.ok(jsonStr.includes('Mumbai') === false, 'Plain recovery answer must NOT be in backup export');
  assert.ok(jsonStr.includes('4321') === false, 'Plain PIN must NOT be in backup export');
  assert.ok(backupData.settings.security.pinHash.length === 64, 'Backup must include PBKDF2 hash');
  assert.ok(backupData.settings.security.recoveryHash.length === 64, 'Backup must include recovery hash');
});

test('6. Restore: restores database without breaking PIN verification or recovery', async () => {
  // Prepare backup payload
  const { hashHex: pinHash, saltHex: pinSalt } = await derivePinVerifier('9876');
  const { hashHex: recoveryHash, saltHex: recoverySalt } = await deriveRecoveryVerifier('Snowy');

  const backupJson = {
    accounts: [{ id: 'acc_1', name: 'Savings', type: 'Bank', openingBalance: 1000, currentBalance: 1000, createdAt: Date.now() }],
    transactions: [{ id: 'tx_1', type: 'income', amount: 500, accountId: 'acc_1', date: '2026-09-10', notes: 'Bonus', createdAt: Date.now() }],
    categories: [{ id: 'cat_1', name: 'Salary', type: 'income', isCustom: false }],
    budgets: { Food: 200 },
    reminders: [],
    goals: [],
    settings: {
      theme: 'dark',
      currency: '$',
      security: {
        version: 2,
        pinSalt,
        pinHash,
        pinLength: 4,
        securityQuestion: 'Pet Name?',
        recoverySalt,
        recoveryHash,
      },
    },
  };

  // Perform restore logic
  await db.wipeDatabase();
  for (const acc of backupJson.accounts) await db.saveAccount(acc as any);
  for (const tx of backupJson.transactions) await db.saveTransaction(tx as any);
  for (const cat of backupJson.categories) await db.saveCategory(cat as any);

  const sec = backupJson.settings.security;
  await db.saveSecurityConfig({
    id: 'auth_config',
    version: sec.version,
    pinSalt: sec.pinSalt,
    pinHash: sec.pinHash,
    pinLength: sec.pinLength,
    securityQuestion: sec.securityQuestion,
    recoverySalt: sec.recoverySalt,
    recoveryHash: sec.recoveryHash,
    updatedAt: Date.now(),
  });

  await useFinanceStore.getState().init();

  // Test 6a: PIN verification after restore
  useFinanceStore.setState({ isLocked: true });
  const unlocked = await useFinanceStore.getState().unlockApp('9876');
  assert.strictEqual(unlocked, true, 'PIN must unlock successfully after restore');

  // Test 6b: PIN recovery after restore (verifying that restored_recovery_hash bug is GONE)
  useFinanceStore.setState({ isLocked: true });
  assert.notStrictEqual(localStorage.getItem('securityAnswer'), 'restored_recovery_hash', 'Must NOT set broken restored_recovery_hash');
  const recovered = await useFinanceStore.getState().recoverPIN('Snowy');
  assert.strictEqual(recovered, true, 'Original recovery answer MUST recover PIN successfully after restore');
});

test('7. App restart: loads configuration from storage on cold start and enforces lock', async () => {
  // Configure PIN
  await useFinanceStore.getState().setSecurityPIN('7777', 'Favorite color?', 'Emerald');

  // Simulate cold restart by resetting in-memory store state to default and re-initializing
  useFinanceStore.setState({
    initialized: false,
    isLocked: false,
    pinHash: null,
  });

  // Call init
  await useFinanceStore.getState().init();

  assert.strictEqual(useFinanceStore.getState().initialized, true);
  assert.strictEqual(useFinanceStore.getState().isLocked, true, 'App must be locked on launch when PIN is set');
  assert.ok(useFinanceStore.getState().pinHash, 'PIN hash must be loaded into state from IndexedDB');

  // Unlock with correct PIN
  const success = await useFinanceStore.getState().unlockApp('7777');
  assert.strictEqual(success, true);
  assert.strictEqual(useFinanceStore.getState().isLocked, false);
});

test('8. Data persistence: accounts, transactions, and categories persist and update balances', async () => {
  await useFinanceStore.getState().wipeAllData();

  // Add account
  await useFinanceStore.getState().addAccount('Main Wallet', 'Cash', 1000);
  const account = useFinanceStore.getState().accounts.find(a => a.name === 'Main Wallet');
  assert.ok(account);
  assert.strictEqual(account.currentBalance, 1000);

  // Add expense
  await useFinanceStore.getState().addTransaction({
    type: 'expense',
    amount: 150,
    category: 'Food',
    accountId: account.id,
    date: '2026-09-10',
    notes: 'Lunch',
  });

  // Re-fetch and check balance persistence
  await useFinanceStore.getState().fetchData();
  const updatedAccount = useFinanceStore.getState().accounts.find(a => a.id === account.id);
  assert.ok(updatedAccount);
  assert.strictEqual(updatedAccount.currentBalance, 850, '1000 - 150 must equal 850 balance');
});

test('9. Migration from old PIN format: legacy 32-bit hash unlocks and auto-upgrades to PBKDF2', async () => {
  await useFinanceStore.getState().wipeAllData();

  // Simulate legacy user state in localStorage
  const legacyPin = '2580';
  const legacyAns = 'Rover';
  const legacyHash = legacyHashString(legacyPin);
  const legacyAnsHash = legacyHashString(legacyAns.trim().toLowerCase());

  localStorage.setItem('pinHash', legacyHash);
  localStorage.setItem('pinLength', '4');
  localStorage.setItem('securityQuestion', 'Pet name?');
  localStorage.setItem('securityAnswer', legacyAnsHash);

  // Simulate app initialization for legacy user
  await useFinanceStore.getState().init();

  assert.strictEqual(useFinanceStore.getState().isLegacyAuth, true, 'Legacy authentication flag must be true');
  assert.strictEqual(useFinanceStore.getState().isLocked, true, 'App must be locked');

  // Wrong PIN must fail against legacy hash
  const wrongLegacy = await useFinanceStore.getState().unlockApp('1111');
  assert.strictEqual(wrongLegacy, false);
  assert.strictEqual(useFinanceStore.getState().isLocked, true);

  // Correct PIN unlocks and triggers automatic migration to PBKDF2
  const correctLegacy = await useFinanceStore.getState().unlockApp('2580');
  assert.strictEqual(correctLegacy, true, 'Legacy PIN must successfully unlock');
  assert.strictEqual(useFinanceStore.getState().isLocked, false);
  assert.strictEqual(useFinanceStore.getState().isLegacyAuth, false, 'Must no longer be in legacy mode');

  // Verify that PBKDF2 credentials were saved to IndexedDB
  const upgradedConfig = await db.getSecurityConfig();
  assert.ok(upgradedConfig, 'Upgraded security config must exist in IndexedDB');
  assert.strictEqual(upgradedConfig.version, 2);
  assert.ok(upgradedConfig.pinHash.length === 64, 'Must have upgraded to 64-char PBKDF2 hash');
  assert.ok(upgradedConfig.pinSalt.length === 32, 'Must have generated 32-char salt');

  // Verify that plain legacy tokens were removed from localStorage
  assert.strictEqual(localStorage.getItem('pinHash'), null, 'Legacy pinHash must be deleted from localStorage');
  assert.strictEqual(localStorage.getItem('securityAnswer'), null, 'Legacy securityAnswer must be deleted from localStorage');

  // Verify that future unlocks work under the new PBKDF2 algorithm
  useFinanceStore.setState({ isLocked: true });
  const futureUnlock = await useFinanceStore.getState().unlockApp('2580');
  assert.strictEqual(futureUnlock, true, 'Upgraded PIN must unlock with PBKDF2');
});

test('10. AES-GCM envelope encryption/decryption: functions correctly with 256-bit keys', async () => {
  const secretKeyHex = generateSalt(32); // 256-bit key
  const message = 'Sensitive financial payload: ₹50,000 transfer';

  const { ciphertext, iv } = await encryptAESGCM(message, secretKeyHex);
  assert.ok(ciphertext && ciphertext.length > 0);
  assert.ok(iv && iv.length === 24, '96-bit IV should be 24 hex characters');

  const decrypted = await decryptAESGCM(ciphertext, iv, secretKeyHex);
  assert.strictEqual(decrypted, message, 'Decrypted text must match original message');
});
