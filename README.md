# Income Tracker

Offline-first, privacy-first income tracking. No backend, no network requests —
all data stays in your browser's `localStorage`.

## Run it

Service workers require `http(s)`, so for full offline support serve the folder:

```bash
cd IncomeTracker
python -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly via `file://` also works (all features except
service-worker precaching).

## Features (v1.0)

- **Dashboard** — monthly total, entry count, average, trend vs previous month
- **Entries** — add/edit/delete with validation, search, date + category filters,
  newest/oldest sort, incremental loading for large lists
- **Categories** — 5 defaults (pink reserved for your custom categories), tap to filter
- **Reports** — month picker, 6/12-month trend, dependency-free SVG donut / line /
  source bars, each with a screen-reader data table
- **Recurring** — daily/weekly/biweekly/monthly/yearly rules; due entries
  auto-generate on launch (capped backfill)
- **Settings** — 20 ISO-4217 currencies (locale-aware formatting), light/dark/system
  theme, date format, fiscal-year start (with Fiscal YTD card), JSON/CSV
  export + validated import, storage usage meter with 80% warning
- **Offline** — app-shell caching via `sw.js`, offline banner, installable to
  home screen; inline favicon so there are zero network requests

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `N` | New entry |
| `Ctrl/⌘ + K` | Quick search |
| `Ctrl/⌘ + E` | Export JSON |
| `Ctrl/⌘ + ,` | Settings |
| `Esc` | Close dialog |

Full map: `docs/keyboard-map.md`. Accessibility notes: `docs/a11y-audit.md`.

## Project layout

```
index.html      app shell (markup only)
css/            tokens.css (design tokens) + app.css (components)
js/             report.js, charts.js, recurring.js (pure, dependency-free)
                app.js (state, storage, rendering, wiring)
sw.js           app-shell cache (versioned)
design.html     living style guide
PRD.md          product requirements + spec decisions
docs/           keyboard map, a11y audit
IMPLEMENTATION_PLAN.md  phased build history
```

Storage keys: `incomeTracker_entries`, `incomeTracker_categories`,
`incomeTracker_settings`, `incomeTracker_recurring`, `incomeTracker_version`
(schema v2, migrates forward without wiping entries).
