# IncomeTracker — Implementation Plan

Source: `PRD.md` v1.0 (Offline-Native App, Phases 1-4) + review of `index.html` (1409 lines) and `design.html` (820 lines).
Date: 2026-09-28

## 1. PRD Review Summary

### What is solid
- Clear personas (freelancers, small biz, privacy-conscious), offline-first principles.
- Storage keys defined: `incomeTracker_entries`, `incomeTracker_categories`, `incomeTracker_settings`, `incomeTracker_version`.
- Data models for Entry / Category / Settings, acceptance criteria per phase.
- Design tokens (colors, type, spacing, radius, shadows) + Appendix B changelog.

### Gaps / conflicts (must resolve before build)
1. **Duplicate spec:** `Untitled document.md` duplicates `PRD.md`. Keep `PRD.md` as source of truth, delete duplicate.
2. **Pink indecision (Change 2):** `--color-cat-pink: #EC4899` and `.badge-pink` exist in `design.html` + `index.html:24-32,290`, but `DEFAULT_CATEGORIES` (`index.html:818-824`) and PRD Appendix 7.1 still list 5 categories. Decide: 6th default vs custom-only accent.
3. **Privacy contradiction:** PRD 1.5/1.6 requires zero network requests, but `index.html:8-10` loads Google Fonts. Breaks offline + privacy.
4. **Offline claim vs impl:** PRD 2.1 requires app-shell caching, but `index.html:774-794` registers a Service Worker from a `Blob` URL — rejected by browsers. No real caching.
5. **Destructive migration:** PRD requires auto-migrate, but `index.html:841-848` does `entries = []` when `version !== '1'`.
6. **Theme broken:** No `:root[data-theme="dark"]` rule (`index.html:80-102`), `init()` never applies saved `settings.theme`, missing vars `--font-bold/medium/semibold`, `--space-16`, `--shadow-xl`.
7. **Currency:** Only 9 codes (`index.html:825`) vs 20 required (PRD 7.2); manual symbols + hardcoded `en-US` (`index.html:919-922`) instead of locale-aware `Intl.NumberFormat`; dashboard sums mixed currencies as-is.
8. **CSV fragile:** Export does not escape quotes/commas (`index.html:1225-1232`); import uses naive `split(',')` (`index.html:1267-1270`); JSON import replaces all data with no merge/replace confirm (PRD 3.3 requires choice).
9. **Dates/TZ:** Today via `toISOString().split('T')[0]` is UTC (off-by-one locally); `new Date('YYYY-MM-DD')` parses as UTC midnight, `formatDate()` can shift day in US TZs.
10. **IDs:** `Date.now()+Math.random` instead of PRD `uuid-v4`.
11. **A11y:** No `role=dialog`, focus trap, `aria-live` toast, `role=tablist`, `:focus-visible`, `prefers-reduced-motion`, skip link. Only `Esc` shortcut; `N/Ctrl+K/Ctrl+E` missing.
12. **Phase 3 overloaded:** Settings + i18n + keyboard + passcode/biometric in one phase — split, defer passcode.

## 2. Phase A — Design System Freeze (2-3 days)

Goal: single source of truth before code.

- Audit `design.html` vs `index.html:13-78` vs PRD 2.4/7.3. Port full scales to app.
- Resolve pink decision, update PRD 7.1 + category grid (`design.html:484-491`) + app defaults together.
- Freeze `tokens.css`: light + `[data-theme="light"]` / `[data-theme="dark"]` + system fallback via `prefers-color-scheme`, high-contrast overrides, `prefers-reduced-motion`, `:focus-visible` rings.
- Spec components: Button, Input, Select, Badge (incl. pink), Card, SummaryCard, Modal, Confirm, Toast (`aria-live`), Tabs (`role=tablist`), CategoryCard, EntryRow, ChartContainer, EmptyState, OfflineBanner, FilterBar.
- Delete `Untitled document.md`.

Outputs:
- `tokens.css`, `components.css`, updated `design.html`, PRD 7.1 fixed.
- Accept: no undefined `var()` in DevTools, light/dark identical structure, contrast 4.5:1 for text.

## 3. Phase B — Architectural Decisions

| # | Decision | Options Considered | Chosen | Rationale |
|---|----------|--------------------|--------|-----------|
| 1 | Packaging | A) Single `index.html` B) `index.html` + `css/` + `js/` + `sw.js` | B, `design.html` stays standalone | Blob-SW cannot work; split enables real SW, caching, tests |
| 2 | Offline caching | A) Blob-URL SW (current) B) File `sw.js` cache-first | B, `CACHE_NAME=income-tracker-v1` | Only file SW gives <1s offline launch |
| 3 | Fonts / privacy | A) Google Fonts CDN B) System stack | B for app (`system-ui`, `ui-monospace`) | Zero requests, instant, satisfies privacy |
| 4 | State | A) Globals B) `IncomeStore` class (PRD 2.3) | B + `ThemeManager`, `StorageMonitor` | Central validation, migration, quota; seam for IndexedDB |
| 5 | Migration | A) Wipe on version mismatch B) Read-validate-migrate | B, schema `1 -> 2` | Current `loadData()` loses data |
| 6 | Theming | A) Media-query only B) `data-theme` override + system fallback | B | Fixes persistence bug, explicit dark mode |
| 7 | Currency | A) Manual symbols + `en-US` B) `Intl.NumberFormat(locale, { style:'currency', currency })` | B, full 20 ISO-4217 codes | Locale-aware, correct JPY decimals; warn on mixed-currency totals |
| 8 | IDs | A) `Date.now()+random` B) `crypto.randomUUID()` | B + fallback | PRD uuid-v4, collision-safe |
| 9 | CSV | A) `split(',')` B) RFC-4180 parser/serializer | B hand-rolled ~40 lines, no dep | Handles quoted commas/quotes, keeps bundle <100KB |
| 10 | Charts (Phase D) | A) Chart.js (~60KB) B) Custom SVG (~5KB) | B | PRD budget <30KB gzipped; SVG + `<table>` fallback = a11y |
| 11 | A11y base | A) Ad-hoc B) WAI patterns: dialog/tablist/focus-trap/live-regions | B | Required for WCAG 2.1 AA |

Outputs: `index.html` (shell), `css/`, `js/store.js,format.js,theme.js,csv.js`, `sw.js`, `docs/architecture.md`.

## 4. Phase C — App Shell + MVP (Week 1, maps to PRD Phase 1)

- Shell: header, tabs, FAB, add/edit modal (`role=dialog aria-modal`), confirm, toast (`aria-live=polite`), responsive <640px.
- `IncomeStore`: `add/update/delete/get`, validation (amount>0, ISO date, category exists), debounced writes, `QuotaExceededError` handling on all saves.
- Dashboard: monthly total/count/avg, % vs last month, top category, recent 5 sorted desc.
- Entries: date-from/to + category filter, sort toggle, count, grouping by date, detail view, source tracking.
- Categories: grid with monthly totals, click-to-filter.
- Offline banner on `online`/`offline`, `sw.js` precache of shell.
- Currency selector (20 codes), theme light/dark/system persisted and applied on `init()`.

Accept (PRD 2.6): CRUD offline, persist after refresh, banner visible offline, load <2s, save <100ms, all actions Tab-reachable.

## 5. Phase D — Reports & Data (Week 2, maps to PRD Phase 2)

- `IncomeReport`: `getMonthlyTotal`, `getCategoryBreakdown`, `getSourceBreakdown`, `getTrendData(6/12)`, YoY stub.
- Custom SVG donut (categories), line (trend), hbars (sources); tooltips, click-to-filter, `<table>` fallback, `aria-label`.
- Summary cards reuse report module.
- Export `income-tracker-YYYY-MM-DD.{json,csv}`; import validates schema, shows preview + merge-vs-replace choice.
- Storage meter via `localStorage.key(i)` (not `for...in`), 80% warning + backup nudge. Virtualized list for >500 entries, `requestAnimationFrame` charts.

Accept (PRD 3.6): charts <500ms/500 entries, CSV opens in Sheets/Excel, JSON round-trip lossless, import validates before apply.

## 6. Phase E — Settings, A11y, Keyboard (Week 3, maps to PRD Phase 3 scoped)

- Settings tabs: General (currency, dateFormat, fiscalYearStart), Display (theme, contrast, motion), Data (export/import/usage), About (version, privacy note).
- Keyboard: `N` new, `Esc` close, `Ctrl+K` search overlay, `Ctrl+E` export, `Ctrl+,` settings; focus trap + restore, skip link, `:focus-visible`.
- Audit with axe-core; fix contrast, focus management, SR announcements; `docs/a11y-audit.md` + `docs/keyboard-map.md`.
- Defer to Phase F: multi-language (en/es/fr/de), passcode/PIN/biometric, auto-lock.

Accept (PRD 3.6 minus deferred): keyboard-only full flow works, SR announces add/update/delete, theme switch <100ms, settings persist.

## 7. Phase F — Future (maps to PRD Phase 4, deferred)

Recurring engine (`createRule/generateNext/checkAndGenerate`), goals/progress bars, IndexedDB adapter behind `IncomeStore` interface (localStorage fallback), optional encrypted file sync, receipt attachments with compression. Entry criteria: Phases A-E green, perf <2s with 1000 entries.

## 8. Verification (every phase)

- Airplane-mode reload works, DevTools Network shows 0 requests for core use.
- Refresh preserves entries; version bump migrates (never wipes).
- Round-trip: export → import preserves count; edge CSV `a,"b,c",d` handled.
- Perf: save <100ms, charts <500ms/500 entries, shell <2s on 3G emulation.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Quota exceeded | 80% warning, export/delete prompt, no silent fail |
| Browser wipe | Backup reminder, export docs |
| SW update stuck | Versioned cache + `skipWaiting` + `clients.claim` |
| Chart bloat | Custom SVG, no dep |
| A11y gaps | axe-core + manual keyboard/SR pass in Phase E |
