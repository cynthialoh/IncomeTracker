# Product Requirements Document: Income Tracker

## 1\. Overview

Product Name: Income Tracker  
Version: 1.0  
Platform: Web (Offline-Native App) Platform Description: Functions offline as a native-like application using localStorage and app shell caching. No PWA infrastructure. Core Requirement: Fully offline-capable using localStorage; behaves like a native app

### 1.1 Purpose

A lightweight, privacy-first income tracking application that allows users to record, categorize, and visualize their income sources without requiring an internet connection or backend infrastructure.

### 1.2 Target Audience

* Freelancers and gig workers tracking multiple income streams  
* Small business owners monitoring revenue sources  
* Individuals wanting simple personal finance tracking  
* Privacy-conscious users who prefer local-only data storage

### 1.3 Design Principles

1. Offline-First — Every feature must work without network connectivity  
2. Privacy by Default — No network requests, no tracking, no analytics  
3. Simplicity — Time to first entry \< 30 seconds  
4. Local Storage — All data persists in localStorage; no backend  
5. Accessibility — WCAG 2.1 AA compliant

### 1.4 Architecture

* SPA using vanilla JavaScript or lightweight framework  
* No backend dependencies — all logic runs client-side  
* Offline-first architecture — behaves like a native app, all functionality works without network  
* localStorage as primary data store (\~5-10MB limit)  
* IndexedDB (future migration path for Phase 4\)

### 1.5 Technical Requirements

#### Data Model

// Income Entry  
{  
  id: "uuid-v4",  
  amount: 1250.00,           // number (cents recommended for precision)  
  currency: "USD",           // ISO 4217 code  
  source: "Upwork",          // string  
  category: "Freelance",     // string (matches category.id)  
  date: "2026-01-15",        // ISO 8601 date string  
  notes: "Website project",  // optional string  
  createdAt: "2026-01-15T10:30:00Z", // ISO 8601 datetime  
  updatedAt: "2026-01-15T10:30:00Z"  // ISO 8601 datetime  
}

// Category  
{  
  id: "freelance",  
  name: "Freelance",  
  color: "\#3B82F6",          // hex color  
  isDefault: true,  
  order: 1  
}

// Settings  
{  
  currency: "USD",  
  dateFormat: "YYYY-MM-DD",  
  theme: "system",           // light | dark | system  
  fiscalYearStart: "01-01"   // MM-DD  
}

#### Storage Keys

* incomeTracker\_entries — Array of income entries  
* incomeTracker\_categories — Array of categories  
* incomeTracker\_settings — Settings object  
* incomeTracker\_version — Schema version for migrations

#### Browser Support

* Chrome 80+, Firefox 75+, Safari 13.1+, Edge 80+  
* localStorage API (primary), Service Worker API (asset caching)  
* IndexedDB (future migration path for Phase 4\)

### 1.6 Non-Functional Requirements

* Performance: Initial load \< 2s on 3G; entry save \< 100ms; chart render \< 500ms for 500 entries; bundle size \< 100KB gzipped  
* Reliability: Data persistence across sessions; graceful degradation if localStorage unavailable; automatic schema migration on version change  
* Privacy: Zero network requests for core functionality; no analytics/tracking; data never leaves user's device  
* Accessibility: WCAG 2.1 AA; keyboard navigation for all actions; screen reader compatible; high contrast mode support

---

## 2\. Phase 1 — MVP (Weeks 1-3)

Goal: Ship a fully functional offline income tracker with core CRUD, categories, currency support, and native-like offline behavior.

### 2.1 Features

#### Income Entry Management

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Add Income | Record amount, source, category, date, notes | P0 |
| Edit Income | Modify existing entries | P0 |
| Delete Income | Remove entries with confirmation | P0 |
| Default Categories | Salary, Freelance, Investment, Gift, Other | P0 |
| Income Sources | Track specific clients/platforms per entry | P0 |

#### Offline & Storage

| Feature | Description | Priority |
| ----- | ----- | ----- |
| localStorage Persistence | All data stored in browser localStorage | P0 |
| Offline-First | Full functionality without network | P0 |
| Schema Migration | Auto-migrate data on version change | P0 |

#### Currency & Localization

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Currency Selection | Multi-currency support (USD, EUR, GBP, etc.) | P0 |
| ISO 4217 Currency Codes | Store amounts with currency identifier | P0 |
| Locale-Aware Formatting | Display currency in browser's locale | P0 |

#### Offline-First Native App

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Offline-First | Full functionality without network — behaves like a native app | P0 |
| localStorage Persistence | All data stored in browser localStorage | P0 |
| App Shell Caching | Cache all assets for instant offline launch | P0 |
| Offline Indicator | Banner showing offline status | P0 |
| Installable | Works like a native app when saved to home screen | P0 |

### 2.2 User Experience

#### User Flow 1: Quick Income Entry

1. User opens app → sees dashboard with "Add Income" FAB  
2. Taps FAB → modal opens with pre-filled date (today)  
3. Enters amount, selects source/category → saves  
4. Toast confirmation → entry appears in list

#### User Flow 2: Viewing Income History

1. User opens app → sees list of recent entries  
2. Scrolls through entries grouped by date  
3. Taps an entry → sees details  
4. Pulls to refresh (simulated) or manually reloads

#### User Flow 3: Category Overview

1. User navigates to "Categories" view  
2. Sees default categories with icons and counts  
3. Taps a category → sees all entries in that category  
4. Sees total amount per category

#### Responsive Breakpoints

* Mobile: \< 640px (primary target)  
* Tablet: 640px \- 1024px  
* Desktop: \> 1024px

### 2.3 Technical Details

#### Frontend Architecture

* Single HTML file with embedded CSS/JS or modular JS imports  
* Event-driven state management (no framework required)  
* Virtual DOM or direct DOM manipulation for performance  
* CSS custom properties for theming (light/dark via prefers-color-scheme)

#### Data Layer

// Core data access module  
class IncomeStore {  
  constructor() { /\* initialize from localStorage \*/ }  
  addEntry(entry) { /\* validate, persist, return \*/ }  
  updateEntry(id, updates) { /\* merge, update timestamp, persist \*/ }  
  deleteEntry(id) { /\* remove, persist \*/ }  
  getEntries(filter) { /\* query, sort, return \*/ }  
  getCategories() { /\* return default \+ custom \*/ }  
  getSettings() { /\* return settings object \*/ }  
  saveSettings(settings) { /\* persist \*/ }  
}

#### Storage Strategy

* Write to localStorage on every mutation (synchronous for simplicity)  
* Read from localStorage on app initialization  
* Debounce rapid writes to avoid performance issues  
* Catch QuotaExceededError and prompt user to export/delete

#### Service Worker

* Cache app shell (HTML, CSS, JS, fonts) on first install  
* Network-first strategy for API calls (not applicable here, but for future)  
* Cache-first strategy for static assets  
* Offline fallback page if service worker fails

### 2.4 Design System (Phase 1\)

#### Color Palette

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--color-primary-500 | \#3B82F6 | Primary actions, links, focus states |
| \--color-primary-600 | \#2563EB | Button backgrounds |
| \--color-success-500 | \#22C55E | Income amounts, success states |
| \--color-success-600 | \#16A34A | Success buttons |
| \--color-warning-500 | \#F59E0B | Pending states, gift category |
| \--color-error-500 | \#EF4444 | Destructive actions, validation errors |
| \--color-cat-salary | \#10B981 | Salary category badge/chart |
| \--color-cat-freelance | \#3B82F6 | Freelance category badge/chart |
| \--color-cat-investment | \#8B5CF6 | Investment category badge/chart |
| \--color-cat-gift | \#F59E0B | Gift category badge/chart |
| \--color-cat-other | \#6B7280 | Other category badge/chart |
| \--color-neutral-900 | \#0F172A | Primary text |
| \--color-neutral-600 | \#475569 | Secondary text |
| \--color-neutral-400 | \#94A3B8 | Tertiary text, placeholders |
| \--color-neutral-50 | \#F8FAFC | Background |
| \--color-neutral-100 | \#F1F5F9 | Secondary background, borders |
| \--color-neutral-200 | \#E2E8F0 | Borders, dividers |

#### Typography

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--font-sans | 'Inter', system-ui, sans-serif | All UI text, headings, buttons, inputs |
| \--font-mono | 'JetBrains Mono', monospace | Currency amounts, dates, IDs |
| \--text-xs | 0.75rem | Captions, labels, badges |
| \--text-sm | 0.875rem | Body small, timestamps |
| \--text-base | 1rem | Body text, inputs |
| \--text-lg | 1.125rem | Body large |
| \--text-xl | 1.25rem | Section headings |
| \--text-2xl | 1.5rem | Card values, H2 |
| \--text-3xl | 1.875rem | Dashboard totals, H1 |
| \--text-4xl | 2.25rem | App title/hero |
| \--leading-tight | 1.25 | Headings |
| \--leading-normal | 1.5 | Body text |
| \--font-normal | 400 | Body, secondary text |
| \--font-medium | 500 | Labels, buttons |
| \--font-semibold | 600 | Headings, emphasis |
| \--font-bold | 700 | Display, totals |

#### Spacing System (4px base)

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--space-1 | 0.25rem | Tight spacing (4px) |
| \--space-2 | 0.5rem | Small spacing (8px) |
| \--space-3 | 0.75rem | Medium-small (12px) |
| \--space-4 | 1rem | Default spacing (16px) |
| \--space-5 | 1.25rem | Medium (20px) |
| \--space-6 | 1.5rem | Large (24px) |
| \--space-8 | 2rem | Section spacing (32px) |
| \--space-10 | 2.5rem | Large section (40px) |
| \--space-12 | 3rem | Hero spacing (48px) |

#### Border Radius & Shadows

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--radius-sm | 4px | Tags, small elements |
| \--radius-md | 8px | Buttons, inputs, cards |
| \--radius-lg | 12px | Card containers, modals |
| \--radius-xl | 16px | Large cards |
| \--radius-full | 9999px | Pills, badges, FAB |
| \--shadow-sm | 0 1px 2px 0 rgb(0 0 0 / 0.05) | Subtle elevation |
| \--shadow-md | 0 4px 6px \-1px rgb(0 0 0 / 0.1) | Cards, dropdowns |
| \--shadow-lg | 0 10px 15px \-3px rgb(0 0 0 / 0.1) | Modals, popovers |

### 2.5 Success Metrics

| Metric | Target |
| ----- | ----- |
| Time to first entry | \< 30 seconds |
| Offline session duration | Unlimited |
| Entry save speed | \< 100ms |
| Initial load on 3G | \< 2s |
| Offline app launch speed | \< 1s on cached assets |
| Data persistence across sessions | 100% |
| App shell cache hit rate | 100% offline |

### 2.6 Acceptance Criteria

* User can add, edit, and delete income entries offline  
* All data persists after browser refresh and reinstall  
* App launches instantly from cache when offline (like a native app)  
* All app assets cached for offline-first experience  
* App behaves like a native app with no network dependency  
* Currency selection works and displays correctly  
* Default categories are pre-populated and selectable  
* Dashboard shows total income and entry count  
* Entry list is sortable by date  
* Offline banner is visible when no network  
* App loads in \< 2s on 3G connection  
* All interactive elements are keyboard accessible

---

## 3\. Phase 2 — Visualization & Data Management (Weeks 4-5)

Goal: Add rich data visualization, charts, and data import/export capabilities to help users analyze their income patterns.

### 3.1 Features

#### Data Visualization

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Monthly Summary | Total income per month with trend indicator | P0 |
| Category Breakdown | Pie chart / bar chart by category | P0 |
| Source Breakdown | Income by source/client over selected period | P1 |
| Trend Chart | Income over time (6/12 months line chart) | P1 |
| Year-over-Year Comparison | Compare current vs previous year | P2 |

#### Data Export & Import

| Feature | Description | Priority |
| ----- | ----- | ----- |
| JSON Export | Full data export as JSON file | P1 |
| CSV Export | Export entries as CSV for tax/spreadsheet use | P1 |
| Data Import | Restore from exported JSON file | P1 |
| Export Progress | Visual indicator during export | P2 |

#### Advanced Storage

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Storage Quota Handling | Warn at 80% quota, offer export/delete | P1 |
| Data Compression | Compress entries before storing | P1 |
| Backup Reminder | Prompt user to export periodically | P2 |

### 3.2 User Experience

#### User Flow 1: Monthly Review

1. User navigates to "Reports" tab  
2. Selects month → sees summary cards (total, count, avg)  
3. Views category pie chart showing distribution  
4. Sees trend line chart for the last 6-12 months  
5. Taps a category slice → filters list view to that category  
6. Exports CSV for tax purposes

#### User Flow 2: Data Management

1. User navigates to "Settings" → "Data"  
2. Clicks "Export" → downloads JSON/CSV file  
3. Clicks "Import" → uploads previous backup  
4. Sees confirmation toast with entry count  
5. Clicks "Storage Usage" → sees current usage and quota  
6. Receives warning at 80% capacity

#### User Flow 3: Source Analysis

1. User selects date range (default: current month)  
2. Views horizontal bar chart of income by source  
3. Clicks a source → sees all entries from that source  
4. Compares source performance month-over-month

### 3.3 Technical Details

#### Charting Library

* Option A: Chart.js (lightweight, supports pie/bar/line)  
* Option B: Custom SVG charts (smaller bundle, more control)  
* Bundle budget: Charts must not add \> 30KB gzipped  
* Accessibility: Charts must have aria-label descriptions and data tables as fallback  
* Responsive: Charts resize with viewport; touch-friendly on mobile

#### Chart Specifications

Monthly Summary Card:

┌─────────────────────────────┐  
│  Total Income       \$12,450  │  
│  ─────────────────────────  │  
│  ↑ 12.5% vs last month      │  
│  24 entries · \$518.75 avg   │  
└─────────────────────────────┘

Category Breakdown (Pie Chart):

* Donut chart with category colors  
* Center shows total amount  
* Legend below with percentages  
* Tap/click slices to filter

Trend Chart (Line Chart):

* X-axis: Months (last 6-12)  
* Y-axis: Income amount  
* Line color: \--color-success-500  
* Area fill: \--color-success-100  
* Dot on each data point

Export/Import:

* Export generates file named income-tracker-YYYY-MM-DD.json (or .csv)  
* Import validates JSON structure before applying  
* Import shows conflict resolution (merge vs replace)  
* Export includes all entries, categories, and settings

#### Data Layer Additions

// Reporting module  
class IncomeReport {  
  getMonthlyTotal(year, month) { /\* sum entries \*/ }  
  getCategoryBreakdown(year, month) { /\* group by category \*/ }  
  getTrendData(months) { /\* array of {month, total} \*/ }  
  getSourceBreakdown(year, month) { /\* group by source \*/ }  
  getYearOverYear() { /\* compare two years \*/ }  
}

// Export module  
class DataExporter {  
  exportJSON() { /\* serialize all data \*/ }  
  exportCSV() { /\* convert to CSV string \*/ }  
  importJSON(file) { /\* parse, validate, merge \*/ }  
}

// Storage monitor  
class StorageMonitor {  
  getUsage() { /\* current bytes used \*/ }  
  getQuota() { /\* total bytes available \*/ }  
  getPercentage() { /\* usage / quota \* 100 \*/ }  
  warnIfOverThreshold() { /\* 80% threshold \*/ }  
}

#### Performance Considerations

* Charts rendered via requestAnimationFrame  
* Virtual scrolling for entry lists \> 500 items  
* Debounced resize handlers for chart redraws  
* CSV/JSON generation done in Web Worker to avoid UI blocking  
* Chart data sampled for \> 1000 entries

### 3.4 Design System Additions

#### New Color Tokens for Charts

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--chart-bg | var(--color-neutral-50) | Chart background (light) |
| \--chart-grid | var(--color-neutral-200) | Grid lines |
| \--chart-text | var(--color-neutral-600) | Chart labels |
| \--chart-tooltip-bg | var(--color-neutral-900) | Tooltip background |
| \--chart-tooltip-text | \#FFFFFF | Tooltip text |
| \--color-success-100 | \#DCFCE7 | Area fill under trend line |

#### New Typography for Reports

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--text-3xl | 1.875rem | Report total amounts |
| \--text-xl | 1.25rem | Report section titles |
| \--text-sm | 0.875rem | Chart legends, percentages |

#### New Components

* ChartContainer — Responsive wrapper with loading/error states  
* SummaryCard — Metric card with title, value, trend indicator  
* DataTable — Sortable table with pagination for export preview  
* ExportModal — Choose format, preview data, trigger download

### 3.5 Success Metrics

| Metric | Target |
| ----- | ----- |
| Chart render time | \< 500ms for 500 entries |
| CSV export time | \< 2s for 1000 entries |
| Chart accessibility | aria-labels on all charts |
| Data import success rate | 100% on valid files |
| Storage warning accuracy | Triggers at 80% quota |
| Bundle size increase (charts) | \< 30KB gzipped |

### 3.6 Acceptance Criteria

* Monthly summary shows total, count, average  
* Category pie chart renders with correct proportions  
* Trend line chart shows 6-12 months of data  
* Charts are responsive and touch-friendly  
* CSV export produces valid spreadsheet file  
* JSON export/import preserves all data  
* Storage warning appears at 80% quota  
* Import validates data before applying changes  
* All charts have accessible descriptions  
* Charts load in \< 500ms for 500 entries

---

## 4\. Phase 3 — Polish & Settings (Weeks 6-7)

Goal: Add comprehensive settings, customization, accessibility improvements, and keyboard shortcuts for power users.

### 4.1 Features

#### Settings & Preferences

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Settings Page | Centralized settings UI | P0 |
| Currency Selection | Multi-currency with symbol display | P0 |
| Date Format | Locale-aware date formatting options | P1 |
| Theme Toggle | Light/Dark/System preference | P1 |
| Fiscal Year Start | Custom fiscal year configuration | P2 |
| Language Selection | Multi-language support (en, es, fr, de) | P2 |

#### Accessibility

| Feature | Description | Priority |
| ----- | ----- | ----- |
| WCAG 2.1 AA Compliance | Full audit and remediation | P0 |
| Keyboard Navigation | All actions accessible via keyboard | P0 |
| Screen Reader Support | ARIA labels, roles, live regions | P0 |
| High Contrast Mode | Enhanced contrast for readability | P1 |
| Focus Indicators | Visible focus rings on all interactive elements | P0 |
| Reduced Motion | Respect prefers-reduced-motion | P1 |

#### Keyboard Shortcuts

| Shortcut | Action | Priority |
| ----- | ----- | ----- |
| N | New income entry | P1 |
| Ctrl+K | Quick search | P1 |
| Ctrl+E | Export data | P2 |
| Ctrl+, | Open settings | P2 |
| Esc | Close modal / Cancel | P1 |
| ↑/↓ | Navigate entries | P2 |
| Delete | Delete selected entry | P2 |

#### Passcode Lock

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Passcode/PIN | Optional app lock | P2 |
| Biometric Prompt | Face ID / Touch ID on supported devices | P2 |
| Auto-lock Timer | Lock after configurable inactivity | P2 |
| Trusted Devices | Remember lock on trusted devices | P3 |

### 4.2 User Experience

#### User Flow 1: Settings Management

1. User taps settings icon (top right)  
2. Settings page slides up with tabs: General, Display, Data, About  
3. General tab: Currency selector, date format, fiscal year start  
4. Display tab: Theme toggle (light/dark/system), high contrast toggle  
5. Data tab: Export, import, storage usage, backup reminders  
6. About tab: Version, changelog, privacy policy, support link  
7. Changes save automatically with toast confirmation

#### User Flow 2: Theme Switching

1. User toggles theme to "Dark" in settings  
2. All surfaces instantly transition to dark palette  
3. Chart colors adjust for contrast on dark backgrounds  
4. Preference persisted in localStorage  
5. On next visit, dark theme is active  
6. System theme changes also trigger update when set to "System"

#### User Flow 3: Keyboard Navigation

1. User presses N → quick-add modal opens  
2. Enters amount, presses Tab through fields  
3. Presses Enter to save  
4. Presses Ctrl+K → search overlay opens  
5. Types query → entries filter in real-time  
6. Presses Esc → overlay closes, focus returns to previous element  
7. User presses Delete on an entry → confirmation dialog appears

#### User Flow 4: Accessibility

1. Screen reader user navigates to dashboard  
2. Hears: "Income Tracker Dashboard, Total Income, Twelve Thousand Four Hundred Fifty Dollars"  
3. Tabs through entries with arrow keys  
4. Each entry announced with amount, category, date, source  
5. Chart has data table alternative for screen readers  
6. High contrast mode increases text weight and color contrast

### 4.3 Technical Details

#### Theme Engine

// Theme manager  
class ThemeManager {  
  constructor() { /\* read from localStorage or system \*/ }  
  setTheme(theme) { /\* apply CSS class, persist \*/ }  
  getTheme() { /\* return current theme \*/ }  
  toggle() { /\* cycle light/dark/system \*/ }  
  onSystemChange() { /\* listen to prefers-color-scheme \*/ }  
}

#### CSS Architecture

* CSS custom properties drive all theming (\--bg-primary, \--text-primary, etc.)  
* Dark mode uses @media (prefers-color-scheme: dark) as default  
* Manual override via \[data-theme="light"\] / \[data-theme="dark"\]  
* All components reference semantic tokens, never direct colors  
* High contrast mode uses enhanced values in \--color-neutral scale

#### Keyboard Manager

class KeyboardManager {  
  constructor() { /\* register global shortcuts \*/ }  
  register(shortcut, handler) { /\* add shortcut \*/ }  
  unregister(shortcut) { /\* remove shortcut \*/ }  
  handleEvent(event) { /\* process keydown \*/ }  
  isInputFocused() { /\* don't trigger shortcuts when typing \*/ }  
}

#### Accessibility Implementation

* All interactive elements have aria-label or aria-labelledby  
* Charts have \<table\> fallback with aria-hidden on visual  
* Live regions (aria-live="polite") for dynamic updates (new entry, save confirmation)  
* Focus management: modal opens → focus trapped in modal; modal closes → focus restored  
* prefers-reduced-motion media query disables animations  
* Color contrast ratios verified with automated testing (axe-core or similar)  
* Skip navigation link for keyboard users

#### Passcode Implementation

class PasscodeManager {  
  constructor() { /\* init from settings \*/ }  
  setPasscode(hash) { /\* store hashed pin \*/ }  
  verify(pin) { /\* compare hash \*/ }  
  generateBiometricChallenge() { /\* WebAuthn / Credential Management \*/ }  
  startTimer() { /\* auto-lock countdown \*/ }  
  resetTimer() { /\* reset on activity \*/ }  
}

### 4.4 Design System Additions

#### New Tokens for Settings & Accessibility

| Token | Value | Usage |
| ----- | ----- | ----- |
| \--theme-light | data-theme="light" | Force light mode |
| \--theme-dark | data-theme="dark" | Force dark mode |
| \--color-high-contrast-text | \#000000 / \#FFFFFF | High contrast mode text |
| \--color-focus-ring | var(--color-primary-500) | Focus indicator outline |
| \--transition-theme | background-color 300ms ease, color 300ms ease | Theme transition |

#### New Components

* SettingsPage — Tabbed settings interface  
* ThemeToggle — Toggle switch with system option  
* CurrencySelector — Dropdown with flags and symbols  
* PasscodeModal — PIN entry with biometric option  
* QuickSearch — Overlay with keyboard shortcut Ctrl+K  
* KeyboardShortcutsHelp — Modal listing all shortcuts  
* DataTable — Accessible sortable table (for reports)

### 4.5 Success Metrics

| Metric | Target |
| ----- | ----- |
| WCAG 2.1 AA compliance | 100% |
| Keyboard-only task completion | All core tasks |
| Screen reader task completion | All core tasks |
| Theme switch time | \< 100ms |
| Settings save time | \< 50ms |
| Keyboard shortcut response | \< 50ms |
| Passcode verification | \< 1s |

### 4.6 Acceptance Criteria

* Settings page has General, Display, Data, About tabs  
* Theme toggle works (light/dark/system) with instant transition  
* All colors meet WCAG 2.1 AA contrast ratios (4.5:1)  
* All interactive elements are keyboard accessible  
* Focus is managed correctly in modals and overlays  
* Screen reader announces dynamic updates  
* prefers-reduced-motion is respected  
* Keyboard shortcuts work for all core actions  
* Passcode lock works with optional biometric  
* Settings persist across sessions

---

## 5\. Phase 4 — Future Enhancements

Goal: Expand the app with recurring income, budgeting, and optional sync capabilities.

### 5.1 Features

#### Recurring Income

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Recurring Entries | Salary, subscriptions, monthly income | P1 |
| Recurrence Rules | Daily, weekly, bi-weekly, monthly, yearly | P1 |
| Next Occurrence | Predict next payment date | P1 |
| Past Missed Entries | Flag missed recurring income | P2 |
| Auto-Generate | Create entries from recurring rules | P1 |

#### Budget & Goals

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Income Goals | Monthly/quarterly income targets | P2 |
| Progress Indicator | Visual progress bar toward goal | P2 |
| Goal Breakdown | By category or source | P2 |
| Notifications | Alert when goal is reached or approaching | P2 |
| Historical Comparison | Goal vs actual over time | P3 |

#### Multi-Device Sync

| Feature | Description | Priority |
| ----- | ----- | ----- |
| User-Hosted Sync | Sync via user's own server (optional) | P2 |
| Export/Import Sync | Share data files between devices | P1 |
| Conflict Resolution | Handle duplicate entries across devices | P3 |
| Device Management | List connected devices, revoke access | P3 |

#### Receipts & Attachments

| Feature | Description | Priority |
| ----- | ----- | ----- |
| Image Attachment | Attach receipt photos to entries | P2 |
| Storage (IndexedDB) | Migrate from localStorage to IndexedDB | P2 |
| Image Compression | Auto-compress images before storage | P3 |
| OCR Receipt Scanning | Extract amounts from receipt images | P3 |

### 5.2 Technical Details

#### Recurring Engine

class RecurringEngine {  
  createRule(amount, category, source, frequency, startDate) { /\* store rule \*/ }  
  generateNext(rule) { /\* calculate next occurrence \*/ }  
  checkAndGenerate() { /\* run on app open / daily \*/ }  
  getUpcoming(months) { /\* list next occurrences \*/ }  
  handleMissed() { /\* flag missed entries \*/ }  
}

#### IndexedDB Migration Path

* Phase 4 introduces IndexedDB as optional storage backend  
* localStorage remains default for backward compatibility  
* incomeTracker\_version schema triggers migration  
* Data validation and transformation during migration  
* Graceful fallback to localStorage if IndexedDB fails

#### Sync Architecture (Optional)

* Users host their own server or use a sync service  
* Data encrypted before transmission  
* Conflict resolution: last-write-wins with user override  
* Sync triggered on connectivity or manual refresh  
* Device IDs stored per installation

### 5.3 Acceptance Criteria (Phase 4\)

* Recurring entries auto-generate on schedule  
* Budget goals show progress bars  
* Export/import sync works between devices  
* IndexedDB storage option is available and reliable  
* Receipt images attach to entries without data loss  
* App performance remains \< 2s with 1000+ entries

---

## 6\. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Phase |
| ----- | ----- | ----- | ----- | ----- |
| localStorage quota exceeded | Medium | High | Implement compression, warn at 80%, offer export | 1 |
| Browser clears storage | Low | High | Prompt regular exports, document backup | 1 |
| Data corruption | Low | High | Schema validation, versioning, migration logic | 1 |
| Chart library bloat | Medium | Medium | Use lightweight chart (Chart.js/Chartist) or custom SVG | 2 |
| IndexedDB compatibility | Low | High | Fallback to localStorage, feature detection | 4 |
| Sync conflicts | Medium | High | Last-write-wins with user override | 4 |
| Image storage bloat | Medium | Medium | Auto-compress, size limits, IndexedDB migration | 4 |
| Accessibility gaps | Medium | High | Automated testing with axe-core, manual audits | 3 |

---

## 7\. Appendix

### 7.1 Default Categories

| ID | Name | Color | Order |
| ----- | ----- | ----- | ----- |
| salary | Salary | \#10B981 | 1 |
| freelance | Freelance | \#3B82F6 | 2 |
| investment | Investment | \#8B5CF6 | 3 |
| gift | Gift | \#F59E0B | 4 |
| other | Other | \#6B7280 | 5 |

### 7.2 Supported Currencies (ISO 4217\)

USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL, MXN, KRW, SGD, HKD, NZD, SEK, NOK, DKK, PLN, CZK

### 7.3 Complete CSS Variables Reference

:root {  
  /\* Primary \- Blue \*/  
  \--color-primary-50: \#EFF6FF;  
  \--color-primary-100: \#DBEAFE;  
  \--color-primary-200: \#BFDBFE;  
  \--color-primary-300: \#93C5FD;  
  \--color-primary-400: \#60A5FA;  
  \--color-primary-500: \#3B82F6;  
  \--color-primary-600: \#2563EB;  
  \--color-primary-700: \#1D4ED8;  
  \--color-primary-800: \#1E40AF;  
  \--color-primary-900: \#1E3A8A;  
  \--color-primary-950: \#172554;

  /\* Success \- Green \*/  
  \--color-success-50: \#F0FDF4;  
  \--color-success-100: \#DCFCE7;  
  \--color-success-200: \#BBF7D0;  
  \--color-success-300: \#86EFAC;  
  \--color-success-400: \#4ADE80;  
  \--color-success-500: \#22C55E;  
  \--color-success-600: \#16A34A;  
  \--color-success-700: \#15803D;  
  \--color-success-800: \#166534;  
  \--color-success-900: \#14532D;

  /\* Warning \- Amber \*/  
  \--color-warning-500: \#F59E0B;  
  \--color-warning-600: \#D97706;

  /\* Error \- Red \*/  
  \--color-error-500: \#EF4444;  
  \--color-error-600: \#DC2626;

  /\* Neutral \- Slate \*/  
  \--color-neutral-50: \#F8FAFC;  
  \--color-neutral-100: \#F1F5F9;  
  \--color-neutral-200: \#E2E8F0;  
  \--color-neutral-300: \#CBD5E1;  
  \--color-neutral-400: \#94A3B8;  
  \--color-neutral-500: \#64748B;  
  \--color-neutral-600: \#475569;  
  \--color-neutral-700: \#334155;  
  \--color-neutral-800: \#1E293B;  
  \--color-neutral-900: \#0F172A;  
  \--color-neutral-950: \#020617;

  /\* Category Colors \*/  
  \--color-cat-salary: \#10B981;  
  \--color-cat-freelance: \#3B82F6;  
  \--color-cat-investment: \#8B5CF6;  
  \--color-cat-gift: \#F59E0B;  
  \--color-cat-other: \#6B7280;

  /\* Semantic (auto-switches for dark mode) \*/  
  \--bg-primary: var(--color-neutral-50);  
  \--bg-secondary: \#FFFFFF;  
  \--bg-tertiary: var(--color-neutral-100);  
  \--text-primary: var(--color-neutral-900);  
  \--text-secondary: var(--color-neutral-600);  
  \--border-primary: var(--color-neutral-200);  
  \--border-focus: var(--color-primary-500);

  /\* Typography \*/  
  \--font-sans: 'Inter', system-ui, sans-serif;  
  \--font-mono: 'JetBrains Mono', monospace;  
  \--text-base: 1rem;  
  \--leading-normal: 1.5;

  /\* Spacing (4px base) \*/  
  \--space-1: 0.25rem;  
  \--space-2: 0.5rem;  
  \--space-3: 0.75rem;  
  \--space-4: 1rem;  
  \--space-6: 1.5rem;  
  \--space-8: 2rem;

  /\* Radius \*/  
  \--radius-sm: 4px;  
  \--radius-md: 8px;  
  \--radius-lg: 12px;  
  \--radius-full: 9999px;

  /\* Shadows \*/  
   \--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);  
   \--shadow-md: 0 4px 6px \-1px rgb(0 0 0 / 0.1);  
   \--shadow-lg: 0 10px 15px \-3px rgb(0 0 0 / 0.1);  
}

---

## Appendix B: Change Log

### Change 1: Replaced PWA Foundation with Offline-Native Architecture

Date: 2026-09-26  
Requested by: Product Owner  
Reason: The app should function offline and behave like a native application, rather than relying on PWA-specific infrastructure (Web App Manifest, service worker installation prompts).

Changes Made:

* Removed "PWA Foundation" feature section from Phase 1  
* Removed references to Web App Manifest, PWA installation, and PWA-specific service worker usage  
* Replaced with Offline-First Native App approach — all functionality works without network  
* Added App Shell Caching for instant offline launch (caching all assets for native-like behavior)  
* Added Installable feature — works like a native app when saved to home screen  
* Removed "PWA install rate" success metric; replaced with "Offline app launch speed" and "App shell cache hit rate"  
* Updated acceptance criteria: "App launches instantly from cache when offline (like a native app)" instead of "App installs as PWA"  
* Updated architecture section: Offline-first architecture — behaves like a native app, all functionality works without network  
* Updated storage key documentation to include Service Worker API for asset caching only (not PWA installation)  
* Implementation note: Service worker is used solely for app shell caching (offline-first asset delivery), not for PWA installation prompts

Impact on Phase 1:

* Features: App shell caching replaces PWA manifest and installation flow  
* Technical: Service worker simplified to cache-only mode  
* UX: App feels like a native app launched from home screen with instant offline loading  
* Success metrics shifted from install-rate focus to offline-launch-speed focus

---

### Change 2: Added Pink to Color Design System

Date: 2026-09-26  
Requested by: Product Owner  
Reason: Add pink as an accent color to the app's design system.

Changes Made in design.html:

* Added complete Pink — Rose color scale (50–950) with values:  
  * \--color-pink-50: \#FDF2F8 through \--color-pink-950: \#500724  
  * Primary: \--color-pink-500: \#EC4899, \--color-pink-600: \#DB2777  
* Added \--color-cat-pink: \#EC4899 as a category color token  
* Added .badge-pink CSS class for light and dark modes  
* Added pink section visualization in the Color Palette section  
* Updated category colors grid from 5 columns to 6 columns to include Pink  
* Added pink to the CSS Variables Reference appendix (\--color-cat-pink: \#EC4899)

Changes in index.html (Phase 1 App):

* Added \--color-pink-500: \#EC4899 and \--color-pink-100: \#FCE7F3 to design tokens  
* Added .badge-pink class with light/dark mode support

Usage Guidelines:

* Pink (\#EC4899) is designated as an accent/highlight color for:  
  * Promotional elements and call-to-action highlights  
  * New feature indicators  
  * Optional user-selected category (beyond the 5 defaults)  
  * Badge styling for custom categories users create

Impact on Design System:

* Total color scales: 6 color families (Primary, Success, Warning, Error, Pink, Neutral)  
* Total category colors: 6 (Salary, Freelance, Investment, Gift, Other, Pink)  
* All badges, card components, and category grids updated to support pink

