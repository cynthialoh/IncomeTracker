# Accessibility Audit — IncomeTracker (Phase E, static pass)

Target: WCAG 2.1 AA. Automated axe-core run is still TODO (no runner in repo);
below is the manual/static checklist verified against the source.

## Passes

- **Skip navigation:** `.skip-link` in `index.html` → `#main`, visible on focus (`css/app.css`).
- **Landmarks/roles:** tabs use `role=tablist/tab` + `aria-selected` (synced in `switchTab`);
  panels use `role=tabpanel` + `aria-label`; entry modal `role=dialog`,
  delete confirm `role=alertdialog` with `aria-labelledby/describedby`.
- **Live regions:** toast has `role=status` + `aria-live=polite`; dynamic
  add/update/delete/import messages are announced.
- **Form labels:** every input/select has an associated `<label>` or `aria-label`
  (filters, report controls, modal fields, settings selects).
- **Focus:** `:focus-visible` ring on all elements (`css/tokens.css` + `index.html`
  inline); modal/confirm trap `Tab` cycling (`trapTab`) and restore focus to
  the opener on close; destructive confirm auto-focuses Delete.
- **Charts:** every SVG has `role=img` + `<title>`/`<desc>` and per-point `<title>`
  tooltips; each chart ships with a visually-hidden (`.sr-only`) data table
  (`IncomeCharts.dataTable`).
- **Motion:** `prefers-reduced-motion` disables transitions/animations globally.
- **Contrast intent:** high-contrast OS preference strengthens
  `--text-secondary`/`--border-primary` via `prefers-contrast` rules.

## Known gaps (deferred)

1. No automated axe-core/pa11y run in CI — recommend adding before calling AA complete.
2. No manual screen-reader session (NVDA/VoiceOver) recorded yet.
3. Chart center text and axis labels inherit theme tokens; spot-check contrast
   in dark mode during the SR session.
4. `prefers-contrast` support varies by browser; a manual in-app High Contrast
   toggle is a possible follow-up.
