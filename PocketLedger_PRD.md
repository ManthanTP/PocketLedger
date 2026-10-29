# Pocket Ledger — Product Requirements Document (PRD v2.0)
## Production-Grade, Offline-First Personal Finance Manager

**Product Name:** Pocket Ledger (PocketLedger PRO)  
**Author:** Manthan Patel  
**Version:** 2.0 (Production Release / APK Compiled)  
**Date:** September 2026  
**Status:** Shipped & Production-Verified  
**Repository:** `ManthanTP/PocketLedger`  
**Distribution:** Android Native APK (`PocketLedgerPRO.apk` — 46.38 MB) & Standalone Web App  

---

## 1. Executive Summary & Product Vision

Most modern personal finance applications force users into cloud ecosystems, demanding mandatory bank account linking, phone numbers, and invasive SMS/storage permissions before allowing a single transaction to be logged. This architecture alienates privacy-focused users, ignores informal peer-to-peer cash transactions, and leaves users vulnerable to third-party data tracking.

**Pocket Ledger** is an ultra-fast, 100% offline personal finance engine and cash ledger. Built on a local-first storage architecture with bank-grade client-side encryption (PBKDF2-HMAC-SHA256, 100,000 iterations), Pocket Ledger requires **zero signup, zero backend servers, zero network permissions, and zero tracking SDKs**. 

The application unifies physical cash, digital UPI wallets (PhonePe, Google Pay, Paytm), bank accounts, credit cards, monthly category budgets, bill reminders, and savings milestones into a unified financial command center. Logging any transaction takes **less than 5 seconds (3 taps or fewer)**.

---

## 2. Key Objectives & Success Metrics

### 2.1 Core Objectives
- **Zero-Knowledge Privacy:** All financial records, security credentials, and balances reside exclusively on the user's physical device in encrypted local storage.
- **Sub-5-Second Transaction Logging:** Optimized bottom-sheet modal with auto-focused keypad, last-used account memory, and smart category suggestions.
- **Holistic Asset Tracking:** Equal-footing management of physical cash (Cash Book), UPI wallets, bank accounts, and credit limits.
- **Proactive Money Governance:** Real-time monthly category budgets with overspend threshold alerts, recurring bill reminders, and visual savings goals.
- **Data Portability:** Human-readable, unencrypted or AES-GCM encrypted JSON database export/import, plus multi-format CSV report downloads.

### 2.2 Success Metrics & Benchmarks
| Metric | Benchmark | Measured Production Result |
|:---|:---|:---|
| **Cold App Launch** | < 2.0 seconds | ~1.1s on mid-range Android (Capacitor 8) |
| **Transaction Add Time** | < 8.0 seconds | ≤ 4.2 seconds (3 taps from dashboard) |
| **Network Footprint** | 0 KB | 0 KB (App operates flawlessly in Airplane mode) |
| **Test Suite Stability** | 100% Pass | 16/16 automated test suites passing |
| **APK Footprint** | < 50 MB | 46.38 MB self-contained native binary |

---

## 3. User Personas & Target Audience

1. **The Cash & UPI Multi-Transactor (Primary):**
   - Handles a hybrid mix of physical paper cash, street vendor UPI transactions (PhonePe/GPay), and bank transfers daily.
   - Struggles to reconcile informal cash outlays with digital account balances.
2. **The Privacy-Centric Individual:**
   - Disapproves of cloud finance trackers reading SMS messages or harvesting transaction history.
   - Demands biometric protection, encrypted local backups, and an air-gapped system.
3. **The Goal-Oriented Saver:**
   - Requires strict category budget limits (e.g., dining, fuel, subscriptions) and visual milestone trackers for recurring savings targets.

---

## 4. System Architecture & High-Level Flow

```
                      ┌──────────────────────────────────────────────┐
                      │             Application Launch               │
                      └──────────────────────┬───────────────────────┘
                                             │
                                  Is Security PIN Enabled?
                                     ├── YES ──► [ PIN Lock Screen (PBKDF2) ]
                                     │              │ (Success / Biometric)
                                     └── NO  ───────┤
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   POCKET LEDGER CORE                                   │
├─────────────────┬───────────────────┬──────────────────┬─────────────────┬─────────────┤
│   DASHBOARD     │     ACCOUNTS      │    CASH BOOK     │  TRANSACTIONS   │   REPORTS   │
│ - Net Balance   │ - Cash / Bank     │ - Physical Cash  │ - Filter / Sort │ - Weekly    │
│ - Monthly Flow  │ - UPI / Cards     │ - Day Opening    │ - Category View │ - Monthly   │
│ - Expense Donut │ - Inter-Transfer  │ - Day Closing    │ - Search Notes  │ - Yearly    │
│ - Bar Analysis  │ - History Roster  │ - Net In/Outflow │ - Edit / Delete │ - CSV/PDF   │
└────────┬────────┴─────────┬─────────┴────────┬─────────┴────────┬────────┴──────┬──────┘
         │                  │                  │                  │               │
         └──────────────────┴──────────────────┼──────────────────┴───────────────┘
                                               ▼
                              ┌──────────────────────────────────┐
                              │     Persistent Bottom Nav (+)    │
                              │     [ Add Transaction Modal ]    │
                              │    Income | Expense | Transfer   │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │          SETTINGS HUB            │
                              │ - Category Manager (Cascade)     │
                              │ - Budgets & Savings Goals        │
                              │ - Bill Reminders & Notification  │
                              │ - Multi-Currency & Dark Mode     │
                              │ - Encrypted Backup & Restore     │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │     Dual Storage Engine          │
                              │ - IndexedDB: PocketLedgerDB v2   │
                              │ - Capacitor Native Filesystem    │
                              └──────────────────────────────────┘
```

---

## 5. Detailed Functional Specifications

### 5.1 Authentication & Security Engine
- **PBKDF2-HMAC-SHA256 Derivation:** User PINs are salted with a cryptographically secure 32-byte random salt (`crypto.getRandomValues`) and derived through 100,000 iterations into a 256-bit verifier hash. Plaintext PINs are never stored.
- **Timing-Attack Resistance:** Verification employs constant-time buffer comparison (`timingSafeEqual`) to eliminate side-channel timing analysis.
- **Security Question Recovery:** Zero-server password recovery using a normalized, case-insensitive secret answer verified via a secondary salted PBKDF2 hash.
- **Legacy Migration Subsystem:** Automatically detects legacy 32-bit hashes on successful unlock and silently upgrades credentials to the PBKDF2 standard without user friction.
- **Biometric Integration:** Hardware fingerprint/face unlock via `@capacitor/biometrics` with instant fallback to numeric keypad.
- **Privacy "Hide Balance" Mode:** One-tap toggle that blurs all financial values across the UI with CSS backdrop masks for discreet public usage.
- **Configurable Auto-Lock:** Background timer (Immediate, 1 min, 5 min, 15 min, Never) triggering lock screen when the app loses focus.

### 5.2 Dynamic Dashboard
- **Aggregate Metric Cards:** Real-time computation of Net Balance, Monthly Inflow, Monthly Outflow, and Cash in Hand.
- **Income vs Expense Analysis:** Interactive dual-bar chart showing month-to-date income versus expenses.
- **Category Spending Donut:** Segmented expense distribution highlighting top spending drains with dynamic color tokens.
- **Recent Transaction Stream:** Chronological feed of the 5 latest transactions across all accounts with tap-to-edit capability.
- **Quick Action Triggers:** Direct shortcuts for fast expense logging, account transfers, and cash book auditing.

### 5.3 Accounts & Inter-Account Transfers
- **Supported Account Types:** `Cash`, `Bank`, `UPI Wallet` (PhonePe, GPay, Paytm), `Credit Card`, and custom `Other`.
- **Real-Time Balance Synchronizer:** Instant balance recalculation on transaction creation, editing, or deletion.
- **Inter-Account Transfers:** Atomic debit from source account and credit to destination account without artificial "expense" inflation.
- **Account Detail Drill-Down:** Dedicated roster for individual accounts featuring running balance trails and isolated transaction filters.

### 5.4 Cash Book (Dedicated Physical Cash Module)
- **Single-Asset Discipline:** Dedicated ledger filtered exclusively to physical cash movements.
- **Opening & Closing Balances:** Automatic reconciliation of daily opening cash, daily cash spent, daily cash received, and evening closing balance.
- **Cash Velocity Indicator:** Highlights daily burn rate to prevent cash depletion.

### 5.5 Universal Transaction Ledger
- **Multi-Dimensional Filters:** Filter by Transaction Type (All, Income, Expense, Transfer), Account, Category, and Custom Date Range.
- **Fuzzy Search:** Live search across transaction notes, categories, and merchant names.
- **Full CRUD Support:** Complete inline edit and delete capabilities with immediate balance rollback.

### 5.6 Category Management & Cascading Synchronization
- **Preset & Custom Categories:** Comprehensive presets (Food, Fuel, Grocery, Salary, Bills, Freelance, Shopping, etc.) plus user-defined custom categories.
- **Cascading Category Rename:** Renaming a category automatically cascades and updates all historical transactions and active category budgets in an atomic transaction, preventing orphaned records.
- **Category Deletion Guard:** Prevents accidental deletion of categories currently tied to historical records without a user re-assignment prompt.

### 5.7 Budgets & Savings Goals
- **Category Monthly Caps:** Users can set spending limits per category with visual progress meters (Green < 75%, Amber 75-99%, Red ≥ 100%).
- **Overspend Notifications:** In-app warning banners when monthly spending approaches or exceeds assigned limits.
- **Savings Milestones:** Goal tracker (`SavingsGoal`) recording target amount, current savings, target date, and automated progress percentage calculation.

### 5.8 Bill Reminders & Notification System
- **Notification Channels:** Dedicated local notification channels for `Bill Reminders`, `Loan Repayments`, `Budget Alerts`, and `Backup Reminders`.
- **Recurring Schedule:** Day-of-month scheduling with persistent in-app notifications and Android system status bar alerts.

### 5.9 Reports & Analytical Exports
- **Time Horizons:** Weekly, Monthly, Yearly, and Custom Date Range analysis.
- **Financial Statements:** Total Inflow, Total Outflow, Net Savings, Savings Rate (%), and Top Spending Categories.
- **Native File Export:** Export customized account statements to standardized CSV format via `@capacitor/filesystem` and native OS share sheet.

### 5.10 Landing Page & Distribution Ecosystem
- **Official Web Landing Page (`LandingPage.tsx` / `download.html`):** Modern, high-conversion showcase featuring interactive demo preview, video showcase, APK release specs, security highlights, and FAQ.
- **External Browser Redirection (`externalOpener.ts`):** Automatically routes external web links to the system's default browser on Android rather than trapping users in internal webviews.

---

## 6. Data Model & Database Architecture

Pocket Ledger uses a client-side **IndexedDB (`PocketLedgerDB` v2)** as its primary local database, providing high throughput, asynchronous execution, and zero UI thread blocking.

### 6.1 Entity Schemas

```typescript
// Account Entity
export interface Account {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'UPI Wallet' | 'Credit Card' | 'Other';
  openingBalance: number;
  currentBalance: number;
  createdAt: number;
}

// Transaction Entity
export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category?: string;       // Present for income & expense
  accountId: string;       // Primary account or Transfer "From" account
  toAccountId?: string;    // Transfer "To" account
  date: string;            // ISO YYYY-MM-DD
  notes: string;
  createdAt: number;
}

// Category Entity
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isCustom: boolean;
}

// Security Configuration (Stored in auth_config store)
export interface SecurityConfig {
  id: 'auth_config';
  version: number;
  pinSalt: string;         // Hex-encoded 32-byte salt
  pinHash: string;         // PBKDF2 derived 256-bit hash
  pinLength: number;
  securityQuestion: string;
  recoverySalt: string;    // Hex-encoded 32-byte salt
  recoveryHash: string;    // PBKDF2 derived recovery hash
  updatedAt: number;
}

// Savings Goal Entity
export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string;
}

// Bill Reminder Entity
export interface ReminderItem {
  id: string;
  title: string;
  body: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  channel: 'Bill Reminders' | 'Loan Repayments' | 'Budget Alerts' | 'Backup Reminders';
}
```

---

## 7. Technology Stack & Tooling

| Layer | Technology | Specification / Role |
|:---|:---|:---|
| **Core Framework** | React 19 + TypeScript | Component architecture with strict typing |
| **Build & Tooling** | Vite 6 | Sub-second HMR and optimized production bundling |
| **Mobile Runtime** | Capacitor 8 | Native Android bridge, Filesystem, Biometrics, Share |
| **State Management**| Zustand 5 | Synchronous in-memory store synchronized with IndexedDB |
| **Local Database** | IndexedDB (`PocketLedgerDB` v2) | High-performance asynchronous client-side store |
| **Styling & Theme** | Tailwind CSS 4 | Glassmorphism, tailored dark/light tokens, responsive layout |
| **Data Visualization**| Recharts 2.15 | Responsive SVG charts (Income vs Expense, Category Donut) |
| **Icons & Micro-UI** | Lucide React | High-legibility UI iconography |
| **Testing** | Node.js Test Runner | Automated tests (`tests/**/*.test.ts`) with zero test dependencies |

---

## 8. Quality Assurance & Automated Test Suite

Pocket Ledger incorporates an automated test suite executed with Node's native test runner (`node --experimental-strip-types --test tests/**/*.test.ts`):

```
✔ Account Detail Balance Update & External Browser Opener Tests
  ✔ 1. Account creation and selectedAccount balance synchronization
  ✔ 2. openLandingPageInExternalBrowser opens official landing page URL in external browser
  ✔ 3. Rename existing category updates transactions, budgets, and prevents duplicates
✔ Report Generator Tests
  ✔ computes correct date range for this-month and custom
  ✔ compiles specific account report accurately
  ✔ compiles all accounts report accurately
✔ Security & Cryptography Tests
  ✔ 1. PIN creation: derives PBKDF2 hash with unique salt and saves to secure store
  ✔ 2. PIN verification: verifies correct PIN with constant-time equality
  ✔ 3. Wrong PIN: correctly rejects invalid PIN inputs and timing attacks
  ✔ 4. PIN recovery: validates correct answer (case-insensitive) and resets lock
  ✔ 5. Backup: exports ledger data and cryptographic verifiers without plain secrets
  ✔ 6. Restore: restores database without breaking PIN verification or recovery
  ✔ 7. App restart: loads configuration from storage on cold start and enforces lock
  ✔ 8. Data persistence: accounts, transactions, and categories persist and update balances
  ✔ 9. Migration from old PIN format: legacy 32-bit hash unlocks and auto-upgrades to PBKDF2
  ✔ 10. AES-GCM envelope encryption/decryption: functions correctly with 256-bit keys

Total: 16 Tests Passed | 0 Failed | Duration: ~11.8s
```

---

## 9. Non-Functional Requirements (NFR)

1. **Air-Gap Operational Guarantee:** The application must remain 100% functional with zero degraded features in airplane mode.
2. **Deterministic Data Integrity:** Account current balances must be mathematically equivalent to:  
   $$\text{Current Balance} = \text{Opening Balance} + \sum \text{Inflow} - \sum \text{Outflow}$$
3. **Android Hardware Back Button:** Hardware back button events must smoothly dismiss open bottom sheets, modals, and sub-pages before triggering app exit.
4. **Export Standard Compliance:** JSON backups must be cleanly parseable and formatted with human-readable keys; CSV exports must comply with RFC 4180.
5. **Cold-Start Performance:** Time from launcher icon tap to interactive Dashboard must remain under 1.5 seconds on quad-core Android devices.

---

## 10. Product Roadmap & Future Milestones

### Released in v2.0 (Current Production)
- [x] Multi-account support (Cash, Bank, UPI, Credit Card)
- [x] Cash Book dedicated ledger view
- [x] PBKDF2-HMAC-SHA256 Security + Security Question Recovery
- [x] Biometric unlock and auto-lock timeouts
- [x] Category monthly budgets with over-budget alerts
- [x] Savings goals milestone tracking
- [x] Bill reminders & recurring notification scheduling
- [x] Weekly / Monthly / Yearly reports with CSV export
- [x] Cascading category rename synchronization
- [x] Product Landing Page with interactive demo and APK distribution
- [x] 16/16 Automated security, data integrity, and reporting tests

### Planned for v2.5
- [ ] **Lending & Borrowing Ledger (Udhar / Khata):** Dedicated peer-to-peer debt tracking with partial repayments and contact integration.
- [ ] **Receipt & Bill Attachments:** Local image storage for invoice photos attached directly to transaction records.
- [ ] **Multi-Currency Live Rates (Offline Cache):** Currency conversion tables with cached exchange rates.

### Planned for v3.0
- [ ] **On-Device OCR Receipt Scanner:** Offline client-side OCR parsing to extract amounts, dates, and merchant names.
- [ ] **Android Home Screen Widgets:** Glanceable Cash in Hand balance and 1-tap quick add widget.
- [ ] **Encrypted P2P Sync:** Local Wi-Fi / Bluetooth peer-to-peer sync between devices without cloud servers.

---

**© 2026 Pocket Ledger. Developed by Manthan Patel.**  
*100% Offline. Zero Knowledge. Built for Total Financial Freedom.*
