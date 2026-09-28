/* IncomeTracker app - Phase B split (was inline in index.html) */

/* --- section 1: service worker + offline status (shell cached per sw.js) --- */
    if ('serviceWorker' in navigator) {
      // File-based registration — blob URLs are rejected by the SW spec.
      // Fails silently on file:// or insecure contexts; app still works.
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // Detect offline/online
    function updateOnlineStatus() {
      const banner = document.getElementById('offlineBanner');
      if (!navigator.onLine) {
        banner.classList.add('visible');
      } else {
        banner.classList.remove('visible');
      }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

/* --- section 2: app logic --- */
// === CONSTANTS ===
    const STORAGE_KEYS = {
      entries: 'incomeTracker_entries',
      categories: 'incomeTracker_categories',
      settings: 'incomeTracker_settings',
      version: 'incomeTracker_version'
    };
    const DEFAULT_CATEGORIES = [
      { id: 'salary', name: 'Salary', color: '#10B981', icon: '💼', isDefault: true, order: 1 },
      { id: 'freelance', name: 'Freelance', color: '#3B82F6', icon: '💻', isDefault: true, order: 2 },
      { id: 'investment', name: 'Investment', color: '#8B5CF6', icon: '📈', isDefault: true, order: 3 },
      { id: 'gift', name: 'Gift', color: '#F59E0B', icon: '🎁', isDefault: true, order: 4 },
      { id: 'other', name: 'Other', color: '#6B7280', icon: '📋', isDefault: true, order: 5 }
    ];
    const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'];
    function newId() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    // === STATE ===
    let entries = [];
    let categories = [];
    let settings = {};
    let currentTab = 'dashboard';
    let currentCurrency = 'USD';
    let sortDesc = true;
    let entriesLimit = 100;
    let storageWarned = false;
    let editingId = null;
    let confirmCallback = null;
    let lastFocused = null;

    // === STORAGE (Phase B: read-validate-migrate, never wipe entries) ===
    const SCHEMA_VERSION = '2';
    function loadData() {
      try {
        const version = localStorage.getItem(STORAGE_KEYS.version);
        const stored = localStorage.getItem(STORAGE_KEYS.entries);
        const parsedEntries = stored ? JSON.parse(stored) : null;
        entries = Array.isArray(parsedEntries) ? parsedEntries.filter(isValidEntry) : [];
        const cats = localStorage.getItem(STORAGE_KEYS.categories);
        const parsedCats = cats ? JSON.parse(cats) : null;
        categories = Array.isArray(parsedCats) && parsedCats.length > 0 ? parsedCats : [...DEFAULT_CATEGORIES];
        const set = localStorage.getItem(STORAGE_KEYS.settings);
        const parsedSettings = set ? JSON.parse(set) : null;
        settings = Object.assign({ currency: 'USD', theme: 'system', dateFormat: 'mdy', fiscalYearStart: '01-01' }, parsedSettings || {});
        currentCurrency = settings.currency || 'USD';
        if (version !== SCHEMA_VERSION) {
          // Migrate forward without touching entries: backfill new keys, stamp version
          localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
          localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
          localStorage.setItem(STORAGE_KEYS.version, SCHEMA_VERSION);
        }
        applyTheme(settings.theme || 'system', true);
      } catch (e) {
        showToast('Error loading data. Starting fresh.', 'error');
        entries = [];
        categories = [...DEFAULT_CATEGORIES];
        settings = { currency: 'USD', theme: 'system', dateFormat: 'mdy', fiscalYearStart: '01-01' };
      }
    }

    function isValidEntry(e) {
      return e && typeof e.id === 'string' && isFinite(parseFloat(e.amount)) && typeof e.date === 'string';
    }

    function saveEntries() {
      try {
        localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
      } catch (e) {
        showToast('Storage full! Export your data to free space.', 'error');
      }
    }

    function saveCategories() {
      try {
        localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
      } catch (e) {
        showToast('Storage full! Export your data to free space.', 'error');
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      } catch (e) {
        showToast('Storage full! Export your data to free space.', 'error');
      }
    }

    // === VALIDATION (Phase C) ===
    function validateEntryData(data) {
      const amount = parseFloat(data.amount);
      if (!isFinite(amount) || amount <= 0) return 'Please enter a valid amount';
      if (!data.source || !data.source.trim()) return 'Please enter a source';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '') || isNaN(new Date(data.date + 'T12:00:00').getTime())) return 'Please select a valid date';
      if (!categories.some(c => c.id === data.category)) return 'Please select a valid category';
      return null;
    }

    // === CRUD ===
    function addEntry(data) {
      const entry = {
        id: newId(),
        amount: parseFloat(data.amount),
        currency: currentCurrency,
        source: data.source.trim(),
        category: data.category,
        date: data.date,
        notes: (data.notes || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      entries.unshift(entry);
      saveEntries();
      return entry;
    }

    function updateEntry(id, data) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return null;
      entry.amount = parseFloat(data.amount);
      entry.source = data.source.trim();
      entry.category = data.category;
      entry.date = data.date;
      entry.notes = (data.notes || '').trim();
      entry.updatedAt = new Date().toISOString();
      saveEntries();
      return entry;
    }

    function deleteEntry(id) {
      entries = entries.filter(e => e.id !== id);
      saveEntries();
    }

    // === FORMATTING (Phase C: locale-aware via Intl, PRD 2.1) ===
    function formatCurrency(amount, currency) {
      const code = CURRENCIES.includes(currency) ? currency : 'USD';
      try {
        return new Intl.NumberFormat(navigator.language || 'en-US', { style: 'currency', currency: code }).format(amount);
      } catch (e) {
        return code + ' ' + Number(amount).toFixed(2);
      }
    }

    function getCurrencySymbol(code) {
      try {
        const part = new Intl.NumberFormat(navigator.language || 'en-US', { style: 'currency', currency: code }).formatToParts(0).find(p => p.type === 'currency');
        if (part) return part.value;
      } catch (e) { /* fall through */ }
      return code;
    }

    function formatDate(dateStr) {
      const d = new Date(dateStr + 'T12:00:00');
      const fmt = (settings && settings.dateFormat) || 'mdy';
      if (fmt === 'ymd') return dateStr;
      if (fmt === 'locale') return d.toLocaleDateString();
      const parts = { month: 'short', day: 'numeric', year: 'numeric' };
      if (fmt === 'dmy') return d.toLocaleDateString('en-GB', parts);
      return d.toLocaleDateString('en-US', parts);
    }

    function formatMonthYear(dateStr) {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // === GET CATEGORY ===
    function getCategory(id) {
      return categories.find(c => c.id === id) || DEFAULT_CATEGORIES.find(c => c.id === 'other');
    }

    // === DASHBOARD ===
    function renderDashboard() {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const total = monthEntries.reduce((s, e) => s + e.amount, 0);
      const avg = monthEntries.length > 0 ? total / monthEntries.length : 0;
      const lastMonthEntries = entries.filter(e => {
        const d = new Date(e.date);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d >= lm && d < new Date(now.getFullYear(), now.getMonth(), 1);
      });
      const lastMonthTotal = lastMonthEntries.reduce((s, e) => s + e.amount, 0);
      const changePct = lastMonthTotal > 0 ? ((total - lastMonthTotal) / lastMonthTotal * 100) : 0;
      const isUp = changePct >= 0;

      // Summary cards
      document.getElementById('summaryGrid').innerHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Income</div>
          <div class="summary-value" style="color: var(--color-success-500);">${formatCurrency(total, currentCurrency)}</div>
          <div class="summary-sub">${isUp ? '↑' : '↓'} ${Math.abs(changePct).toFixed(1)}% vs last month</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Entries This Month</div>
          <div class="summary-value">${monthEntries.length}</div>
          <div class="summary-sub">Avg ${formatCurrency(avg, currentCurrency)} per entry</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Top Category</div>
          ${getTopCategory(monthEntries)}
        </div>
      `;

      // Recent entries (dashboard)
      const recentContainer = document.getElementById('dashboardEntries');
      const recent = monthEntries.slice(0, 5);
      if (recent.length === 0) {
        recentContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-title">No income yet this month</div>
            <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-3);">Tap the + button to add your first income entry</p>
            <button class="btn btn-primary" onclick="openAddModal()">Add Income</button>
          </div>`;
      } else {
        recentContainer.innerHTML = renderEntryList(recent, false);
      }
    }

    function getTopCategory(monthEntries) {
      if (monthEntries.length === 0) {
        return `<div style="font-family: var(--font-mono); font-size: var(--text-xl); color: var(--text-tertiary);">—</div><div style="font-size: var(--text-sm); color: var(--text-secondary);">Add entries to see this</div>`;
      }
      const catTotals = {};
      monthEntries.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0][0];
      const cat = getCategory(topCat);
      const total = catTotals[topCat];
      const pct = (total / monthEntries.reduce((s, e) => s + e.amount, 0) * 100).toFixed(0);
      return `<div style="display: flex; align-items: center; gap: var(--space-2); justify-content: center;">
        <span style="font-size: 20px;">${cat.icon}</span>
        <span class="badge badge-${cat.id}">${cat.name}</span>
      </div>
      <div style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-bold); margin-top: var(--space-1);">${formatCurrency(total, currentCurrency)}</div>
      <div style="font-size: var(--text-sm); color: var(--text-secondary);">${pct}% of total</div>`;
    }

    // === ENTRIES LIST ===
    function renderEntryList(list, showCategory) {
      if (list.length === 0) {
        return `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-title">No entries found</div><p style="font-size: var(--text-sm); color: var(--text-secondary);">Add your first income entry</p></div>`;
      }
      return list.map(e => {
        const cat = getCategory(e.category);
        return `<div class="entry-item" data-id="${e.id}">
          <div class="entry-icon" style="background: ${cat.color}20; color: ${cat.color};">${cat.icon}</div>
          <div class="entry-details">
            <div class="entry-source">${escapeHtml(e.source)}</div>
            <div class="entry-meta">
              <span class="badge badge-${cat.id}">${cat.name}</span>
              <span>${formatDate(e.date)}</span>
              ${showCategory && e.notes ? `<span>${escapeHtml(e.notes)}</span>` : ''}
            </div>
          </div>
          <div class="entry-amount" style="color: var(--color-success-500);">${formatCurrency(e.amount, e.currency)}</div>
          <div class="entry-actions">
            <button onclick="openEditModal('${e.id}')" title="Edit" aria-label="Edit entry ${escapeHtml(e.source)}">✏️</button>
            <button onclick="confirmDelete('${e.id}')" title="Delete" aria-label="Delete entry ${escapeHtml(e.source)}">🗑️</button>
          </div>
        </div>`;
      }).join('');
    }

    function renderEntries() {
      let filtered = [...entries];
      const query = (document.getElementById('filterSearch').value || '').trim().toLowerCase();
      const fromDate = document.getElementById('filterDateFrom').value;
      const toDate = document.getElementById('filterDateTo').value;
      const catFilter = document.getElementById('filterCategory').value;

      if (query) filtered = filtered.filter(e => ((e.source || '') + ' ' + (e.notes || '')).toLowerCase().includes(query));
      if (fromDate) filtered = filtered.filter(e => e.date >= fromDate);
      if (toDate) filtered = filtered.filter(e => e.date <= toDate);
      if (catFilter) filtered = filtered.filter(e => e.category === catFilter);

      filtered.sort((a, b) => sortDesc
        ? (b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        : (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));

      document.getElementById('entriesCount').textContent = `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`;
      const visible = filtered.slice(0, entriesLimit);
      document.getElementById('entriesList').innerHTML = renderEntryList(visible, true);
      const more = document.getElementById('showMore');
      if (filtered.length > visible.length) {
        more.style.display = '';
        more.textContent = `Show more (${filtered.length - visible.length} remaining)`;
      } else {
        more.style.display = 'none';
      }
    }

    // === CATEGORIES ===
    function renderCategories() {
      const grid = document.getElementById('categoryGrid');
      const monthEntries = getMonthEntries();
      grid.innerHTML = categories.map(cat => {
        const catEntries = monthEntries.filter(e => e.category === cat.id);
        const total = catEntries.reduce((s, e) => s + e.amount, 0);
        return `<div class="category-card" onclick="filterByCategory('${cat.id}')">
          <div class="category-icon">${cat.icon}</div>
          <div class="category-name">${cat.name}</div>
          <div class="category-total" style="color: ${cat.color};">${formatCurrency(total, currentCurrency)}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${catEntries.length} entr${catEntries.length === 1 ? 'y' : 'ies'}</div>
        </div>`;
      }).join('');
    }

    function getMonthEntries() {
      const now = new Date();
      return entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    function filterByCategory(catId) {
      switchTab('entries');
      document.getElementById('filterCategory').value = catId;
      renderEntries();
    }

    // === SETTINGS ===
    // === REPORTS (Phase D: PRD Phase 2 visualization) ===
    function currentReportPeriod() {
      const val = document.getElementById('reportMonth').value;
      if (/^\d{4}-\d{2}$/.test(val)) {
        return { year: parseInt(val.slice(0, 4), 10), month: parseInt(val.slice(5, 7), 10) - 1 };
      }
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }

    function renderReports() {
      if (typeof IncomeReport === 'undefined' || typeof IncomeCharts === 'undefined') return;
      const monthInput = document.getElementById('reportMonth');
      if (!monthInput.value) {
        const now = new Date();
        monthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      }
      const { year, month } = currentReportPeriod();
      const trendMonths = parseInt(document.getElementById('trendRange').value, 10) || 6;

      const summary = IncomeReport.monthlyTotal(entries, year, month);
      const chg = IncomeReport.changeVsPrev(entries, year, month);
      const isUp = chg.pct >= 0;
      document.getElementById('reportSummary').innerHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Income</div>
          <div class="summary-value" style="color: var(--color-success-500);">${formatCurrency(summary.total, currentCurrency)}</div>
          <div class="summary-sub">${isUp ? '↑' : '↓'} ${Math.abs(chg.pct).toFixed(1)}% vs previous month</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Entries</div>
          <div class="summary-value">${summary.count}</div>
          <div class="summary-sub">Avg ${formatCurrency(summary.avg, currentCurrency)} per entry</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Previous Month</div>
          <div class="summary-value">${formatCurrency(chg.previous, currentCurrency)}</div>
          <div class="summary-sub">${IncomeReport.prevMonth(year, month).month + 1}/${IncomeReport.prevMonth(year, month).year}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Fiscal YTD</div>
          <div class="summary-value">${formatCurrency(IncomeReport.fiscalYearTotal(entries, year, month, settings.fiscalYearStart), currentCurrency)}</div>
          <div class="summary-sub">Since FY start ${settings.fiscalYearStart || '01-01'}</div>
        </div>`;

      const cats = IncomeReport.categoryBreakdown(entries, year, month, categories);
      document.getElementById('reportCategories').innerHTML =
        IncomeCharts.donut(cats, currentCurrency, { label: 'Income by category' }) +
        IncomeCharts.legend(cats, currentCurrency) +
        IncomeCharts.dataTable('Income by category',
          ['Category', 'Total', 'Share'],
          cats.map(c => [c.name, formatCurrency(c.total, currentCurrency), c.pct.toFixed(1) + '%']));

      const trend = IncomeReport.trendData(entries, trendMonths, new Date(year, month, 1));
      document.getElementById('reportTrend').innerHTML =
        IncomeCharts.line(trend, currentCurrency, { label: 'Income trend' }) +
        IncomeCharts.dataTable('Income trend',
          ['Month', 'Total'],
          trend.map(t => [t.key, formatCurrency(t.total, currentCurrency)]));

      const srcs = IncomeReport.sourceBreakdown(entries, year, month);
      document.getElementById('reportSources').innerHTML =
        IncomeCharts.bars(srcs, currentCurrency, 'Income by source') +
        IncomeCharts.dataTable('Income by source',
          ['Source', 'Total'],
          srcs.map(s => [s.source, formatCurrency(s.total, currentCurrency)]));

      document.querySelectorAll('#reportCategories .legend-item').forEach(btn => {
        btn.addEventListener('click', () => filterByCategory(btn.dataset.cat));
      });
    }

    function renderSettings() {
      // Currency selector
      const cc = document.getElementById('settingsCurrencies');
      cc.innerHTML = CURRENCIES.map(c =>
        `<button class="currency-btn ${c === currentCurrency ? 'active' : ''}" onclick="setCurrency('${c}')">${c}</button>`
      ).join('');

      // Theme buttons
      document.querySelectorAll('[data-theme-select]').forEach(btn => {
        const t = btn.dataset.themeSelect;
        const isActive = settings.theme === t || (settings.theme === 'system' && t === 'system');
        btn.className = `btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm`;
      });

      // Storage info (Phase D: correct key iteration + 80% warning, PRD 3.1)
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        totalSize += (k.length + (v ? v.length : 0)) * 2; // approx UTF-16 bytes
      }
      const quota = 5 * 1024 * 1024;
      const pct = Math.min((totalSize / quota) * 100, 100);
      const info = document.getElementById('storageInfo');
      info.innerHTML = `Local storage usage: ~${(totalSize / 1024).toFixed(1)} KB of ~5,000 KB (${pct.toFixed(0)}%)` +
        (pct >= 80 ? ' — <span class="storage-warn">over 80% full: export a backup, then delete old entries.</span>' : '');
      if (pct >= 80 && !storageWarned) {
        storageWarned = true;
        showToast('Storage over 80% full — export a backup soon.', 'error');
      } else if (pct < 80) {
        storageWarned = false;
      }

      // Locale & fiscal year (Phase E)
      document.getElementById('dateFormat').value = settings.dateFormat || 'mdy';
      document.getElementById('fiscalYearStart').value = settings.fiscalYearStart || '01-01';
    }

    function setCurrency(currency) {
      currentCurrency = currency;
      settings.currency = currency;
      saveSettings();
      renderAll();
      showToast(`Currency set to ${currency}`, 'success');
    }

    function applyTheme(theme, silent) {
      if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
      updateThemeIcon();
      if (!silent) {
        renderAll();
        showToast(`Theme: ${theme}`, 'success');
      }
    }

    function setTheme(theme) {
      settings.theme = theme;
      saveSettings();
      applyTheme(theme);
    }

    function updateThemeIcon() {
      const icon = document.getElementById('themeIcon');
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const isDark = currentTheme === 'dark' || (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      icon.textContent = isDark ? '☀️' : '🌙';
    }

    // === MODAL ===
    // === FOCUS MANAGEMENT (Phase E: trap + restore for dialogs) ===
    function todayLocal() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function trapTab(overlayId, e) {
      const overlay = document.getElementById(overlayId);
      const focusables = overlay.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])');
      const visible = Array.from(focusables).filter(el => !el.disabled && el.offsetParent !== null);
      if (visible.length === 0) return;
      const first = visible[0], last = visible[visible.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function openAddModal() {
      lastFocused = document.activeElement;
      editingId = null;
      document.getElementById('modalTitle').textContent = 'Add Income';
      document.getElementById('editId').value = '';
      document.getElementById('entryAmount').value = '';
      document.getElementById('entrySource').value = '';
      document.getElementById('entryNotes').value = '';
      document.getElementById('entryDate').value = todayLocal();
      populateCategorySelect();
      document.getElementById('entryModal').classList.add('active');
      setTimeout(() => document.getElementById('entryAmount').focus(), 100);
    }

    function openEditModal(id) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      lastFocused = document.activeElement;
      editingId = id;
      document.getElementById('modalTitle').textContent = 'Edit Income';
      document.getElementById('editId').value = id;
      document.getElementById('entryAmount').value = entry.amount;
      document.getElementById('entrySource').value = entry.source;
      document.getElementById('entryDate').value = entry.date;
      document.getElementById('entryNotes').value = entry.notes || '';
      populateCategorySelect(entry.category);
      document.getElementById('entryModal').classList.add('active');
      setTimeout(() => document.getElementById('entryAmount').focus(), 100);
    }

    function closeModal() {
      document.getElementById('entryModal').classList.remove('active');
      editingId = null;
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
      lastFocused = null;
    }

    function populateCategorySelect(selected) {
      const sel = document.getElementById('entryCategory');
      sel.innerHTML = categories.map(c =>
        `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon} ${c.name}</option>`
      ).join('');
    }

    function saveEntry() {
      const amount = document.getElementById('entryAmount').value;
      const source = document.getElementById('entrySource').value;
      const category = document.getElementById('entryCategory').value;
      const date = document.getElementById('entryDate').value;
      const notes = document.getElementById('entryNotes').value;

      const data = { amount, source, category, date, notes };
      const error = validateEntryData(data);
      if (error) { showToast(error, 'error'); return; }
      if (editingId) {
        updateEntry(editingId, data);
        showToast('Entry updated', 'success');
      } else {
        addEntry(data);
        showToast('Income added! 💰', 'success');
      }
      closeModal();
      renderAll();
    }

    // === DELETE ===
    function confirmDelete(id) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      lastFocused = document.activeElement;
      document.getElementById('confirmTitle').textContent = 'Delete Entry?';
      document.getElementById('confirmMessage').textContent = `This will permanently delete ${entry.source} (${formatCurrency(entry.amount, entry.currency)}). This cannot be undone.`;
      confirmCallback = () => {
        deleteEntry(id);
        showToast('Entry deleted', 'success');
        renderAll();
        closeConfirm();
      };
      document.getElementById('confirmDialog').classList.add('active');
      setTimeout(() => document.getElementById('confirmOk').focus(), 100);
    }

    function closeConfirm() {
      document.getElementById('confirmDialog').classList.remove('active');
      confirmCallback = null;
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
      lastFocused = null;
    }

    // === EXPORT/IMPORT ===
    function exportJSON() {
      const data = JSON.stringify({ entries, categories, settings, exportedAt: new Date().toISOString() }, null, 2);
      downloadFile(data, `income-tracker-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      showToast('JSON exported!', 'success');
    }

    // === CSV (Phase C: RFC-4180 quoting; commas/quotes/newlines safe) ===
    function csvEscape(field) {
      const s = String(field == null ? '' : field);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function parseCSVLine(line) {
      const fields = [];
      let cur = '', inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = false; }
          } else { cur += ch; }
        } else {
          if (ch === '"') { inQuotes = true; }
          else if (ch === ',') { fields.push(cur); cur = ''; }
          else { cur += ch; }
        }
      }
      fields.push(cur);
      return fields;
    }

    function exportCSV() {
      let csv = 'Date,Source,Category,Amount,Currency,Notes\n';
      entries.forEach(e => {
        csv += [e.date, e.source, e.category, e.amount, e.currency, e.notes || ''].map(csvEscape).join(',') + '\n';
      });
      downloadFile(csv, `income-tracker-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      showToast('CSV exported!', 'success');
    }

    function downloadFile(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function importData() {
      document.getElementById('hiddenImport').click();
    }

    function handleImport(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target.result;
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(content);
            if (data.entries && Array.isArray(data.entries)) {
              const valid = data.entries.filter(isValidEntry);
              const skipped = data.entries.length - valid.length;
              entries = valid;
              if (data.categories) { categories = data.categories; saveCategories(); }
              if (data.settings) { settings = data.settings; currentCurrency = settings.currency || 'USD'; saveSettings(); }
              saveEntries();
              showToast(skipped > 0 ? `Imported ${valid.length} entries (${skipped} invalid skipped)!` : `Imported ${valid.length} entries!`, 'success');
              renderAll();
            } else {
              showToast('Invalid JSON format', 'error');
            }
          } else if (file.name.endsWith('.csv')) {
            const lines = content.replace(/\r\n/g, '\n').trim().split('\n').slice(1);
            let count = 0, skipped = 0;
            lines.forEach(line => {
              if (!line.trim()) return;
              const parts = parseCSVLine(line);
              if (parts.length < 4) { skipped++; return; }
              const candidate = {
                id: newId(),
                amount: parseFloat(parts[3]),
                currency: CURRENCIES.includes(parts[4]) ? parts[4] : currentCurrency,
                source: (parts[1] || '').trim(),
                category: categories.some(c => c.id === parts[2]) ? parts[2] : 'other',
                date: parts[0],
                notes: parts[5] || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              if (validateEntryData({ amount: candidate.amount, source: candidate.source, category: candidate.category, date: candidate.date })) { skipped++; return; }
              entries.push(candidate);
              count++;
            });
            saveEntries();
            showToast(skipped > 0 ? `Imported ${count} entries (${skipped} rows skipped)` : `Imported ${count} entries!`, skipped > 0 ? '' : 'success');
            renderAll();
          }
        } catch (err) {
          showToast('Failed to import file', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    // === TABS ===
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
      if (tab === 'entries') { entriesLimit = 100; renderEntries(); }
      if (tab === 'categories') renderCategories();
      if (tab === 'reports') renderReports();
      if (tab === 'settings') renderSettings();
      if (tab === 'dashboard') renderDashboard();
    }

    // === TOAST ===
    function showToast(message, type) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = `toast visible ${type || ''}`;
      setTimeout(() => { toast.className = 'toast'; }, 3000);
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // === RENDER ALL ===
    function renderAll() {
      renderDashboard();
      renderCategories();
      renderEntries();
      renderSettings();
      // Update filter category dropdown
      const sel = document.getElementById('filterCategory');
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">All Categories</option>' + categories.map(c =>
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
      ).join('');
      sel.value = currentVal;
      updateThemeIcon();
      // Update currency display
      document.getElementById('currencySelector').innerHTML = getCurrencySymbol(currentCurrency);
    }

    // === INIT ===
    function init() {
      loadData();

      // Tabs
      document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
      });

      // FAB
      document.getElementById('fabAdd').addEventListener('click', openAddModal);

      // Modal
      document.getElementById('modalClose').addEventListener('click', closeModal);
      document.getElementById('modalCancel').addEventListener('click', closeModal);
      document.getElementById('modalSave').addEventListener('click', saveEntry);
      document.getElementById('entryModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('entryModal')) closeModal();
      });

      // Confirm
      document.getElementById('confirmCancel').addEventListener('click', closeConfirm);
      document.getElementById('confirmOk').addEventListener('click', () => { if (confirmCallback) confirmCallback(); });
      document.getElementById('confirmDialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirmDialog')) closeConfirm();
      });

      // Filters
      const resetLimitAndRender = () => { entriesLimit = 100; renderEntries(); };
      document.getElementById('filterSearch').addEventListener('input', resetLimitAndRender);
      document.getElementById('filterDateFrom').addEventListener('change', resetLimitAndRender);
      document.getElementById('filterDateTo').addEventListener('change', resetLimitAndRender);
      document.getElementById('filterCategory').addEventListener('change', resetLimitAndRender);
      document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterCategory').value = '';
        renderEntries();
      });
      document.getElementById('sortToggle').addEventListener('click', (e) => {
        sortDesc = !sortDesc;
        e.currentTarget.textContent = sortDesc ? '↓ Newest' : '↑ Oldest';
        renderEntries();
      });
      document.getElementById('showMore').addEventListener('click', () => {
        entriesLimit += 100;
        renderEntries();
      });

      // Reports
      document.getElementById('reportMonth').addEventListener('change', renderReports);
      document.getElementById('trendRange').addEventListener('change', renderReports);

      // Locale & fiscal year (Phase E)
      document.getElementById('dateFormat').addEventListener('change', (e) => {
        settings.dateFormat = e.target.value;
        saveSettings();
        renderAll();
        showToast('Date format updated', 'success');
      });
      document.getElementById('fiscalYearStart').addEventListener('change', (e) => {
        settings.fiscalYearStart = e.target.value;
        saveSettings();
        renderAll();
        showToast('Fiscal year updated', 'success');
      });

      // Theme toggle
      document.getElementById('themeToggle').addEventListener('click', () => {
        const themes = ['light', 'dark', 'system'];
        const current = document.documentElement.getAttribute('data-theme') || 'system';
        const idx = (themes.indexOf(current) + 1) % 3;
        setTheme(themes[idx]);
      });
      document.querySelectorAll('[data-theme-select]').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.themeSelect));
      });

      // Export/Import
      document.getElementById('exportJson').addEventListener('click', exportJSON);
      document.getElementById('exportCsv').addEventListener('click', exportCSV);
      document.getElementById('importData').addEventListener('click', importData);
      document.getElementById('hiddenImport').addEventListener('change', handleImport);

      // Keyboard (Phase E: see docs/keyboard-map.md)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); closeConfirm(); return; }
        if (e.key === 'Tab') {
          if (document.getElementById('entryModal').classList.contains('active')) { trapTab('entryModal', e); return; }
          if (document.getElementById('confirmDialog').classList.contains('active')) { trapTab('confirmDialog', e); return; }
        }
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName || '');
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          switchTab('entries');
          setTimeout(() => document.getElementById('filterSearch').focus(), 50);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); exportJSON(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); switchTab('settings'); return; }
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); openAddModal(); }
      });

      // Render
      renderAll();
    }

    document.addEventListener('DOMContentLoaded', init);

