# Keyboard Map — IncomeTracker (Phase E)

All shortcuts are global except where noted. Shortcuts that type text are
disabled while focus is in an input, textarea, or select.

| Keys | Action | Notes |
|------|--------|-------|
| `N` | New income entry | Opens the add modal; focus moves to Amount |
| `Ctrl/⌘ + K` | Quick search | Switches to Entries, focuses the search box; filters source + notes live |
| `Ctrl/⌘ + E` | Export JSON | Downloads `income-tracker-YYYY-MM-DD.json` immediately |
| `Ctrl/⌘ + ,` | Open Settings | Switches to the Settings tab |
| `Esc` | Close dialog | Closes entry modal / delete confirm; focus returns to the opener |
| `Tab` / `Shift+Tab` | Move within dialog | Trapped inside open modal/confirm until it closes |
| `Tab` (page) | Skip link first | “Skip to content” jumps to `#main` |

Modal lifecycle: opener element is remembered (`lastFocused` in `js/app.js`);
on close, focus is restored if the opener is still in the document.
