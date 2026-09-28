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
    const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'BRL'];
    const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', CHF: 'Fr', INR: '₹', BRL: 'R$' };

    // === STATE ===
    let entries = [];
    let categories = [];
    let settings = {};
    let currentTab = 'dashboard';
    let currentCurrency = 'USD';
    let editingId = null;
    let confirmCallback = null;

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
        settings = Object.assign({ currency: 'USD', theme: 'system' }, parsedSettings || {});
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
        settings = { currency: 'USD', theme: 'system' };
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
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
    }

    function saveSettings() {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    }

    // === CRUD ===
    function addEntry(data) {
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
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

    // === FORMATTING ===
    function formatCurrency(amount, currency) {
      const symbol = CURRENCY_SYMBOLS[currency] || '$';
      return symbol + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatMonthYear(dateStr) {
      const d = new Date(dateStr);
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
            <button onclick="openEditModal('${e.id}')" title="Edit">✏️</button>
            <button onclick="confirmDelete('${e.id}')" title="Delete">🗑️</button>
          </div>
        </div>`;
      }).join('');
    }

    function renderEntries() {
      let filtered = [...entries];
      const fromDate = document.getElementById('filterDateFrom').value;
      const toDate = document.getElementById('filterDateTo').value;
      const catFilter = document.getElementById('filterCategory').value;

      if (fromDate) filtered = filtered.filter(e => e.date >= fromDate);
      if (toDate) filtered = filtered.filter(e => e.date <= toDate);
      if (catFilter) filtered = filtered.filter(e => e.category === catFilter);

      filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

      document.getElementById('entriesCount').textContent = `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`;
      document.getElementById('entriesList').innerHTML = renderEntryList(filtered, true);
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

      // Storage info
      let totalSize = 0;
      for (let key in localStorage) {
        totalSize += localStorage.getItem(key).length * 2; // approximate bytes
      }
      document.getElementById('storageInfo').textContent = `Local storage usage: ~${(totalSize / 1024).toFixed(1)} KB of ~5,000 KB available`;
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
    function openAddModal() {
      editingId = null;
      document.getElementById('modalTitle').textContent = 'Add Income';
      document.getElementById('editId').value = '';
      document.getElementById('entryAmount').value = '';
      document.getElementById('entrySource').value = '';
      document.getElementById('entryNotes').value = '';
      document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
      populateCategorySelect();
      document.getElementById('entryModal').classList.add('active');
      setTimeout(() => document.getElementById('entryAmount').focus(), 100);
    }

    function openEditModal(id) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
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

      if (!amount || parseFloat(amount) <= 0) { showToast('Please enter a valid amount', 'error'); return; }
      if (!source.trim()) { showToast('Please enter a source', 'error'); return; }
      if (!date) { showToast('Please select a date', 'error'); return; }

      const data = { amount, source, category, date, notes };
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
      document.getElementById('confirmTitle').textContent = 'Delete Entry?';
      document.getElementById('confirmMessage').textContent = `This will permanently delete ${entry.source} (${formatCurrency(entry.amount, entry.currency)}). This cannot be undone.`;
      confirmCallback = () => {
        deleteEntry(id);
        showToast('Entry deleted', 'success');
        renderAll();
        closeConfirm();
      };
      document.getElementById('confirmDialog').classList.add('active');
    }

    function closeConfirm() {
      document.getElementById('confirmDialog').classList.remove('active');
      confirmCallback = null;
    }

    // === EXPORT/IMPORT ===
    function exportJSON() {
      const data = JSON.stringify({ entries, categories, settings, exportedAt: new Date().toISOString() }, null, 2);
      downloadFile(data, `income-tracker-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      showToast('JSON exported!', 'success');
    }

    function exportCSV() {
      let csv = 'Date,Source,Category,Amount,Currency,Notes\n';
      entries.forEach(e => {
        csv += `${e.date},"${e.source}","${e.category}",${e.amount},${e.currency},"${e.notes}"\n`;
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
              entries = data.entries;
              if (data.categories) { categories = data.categories; saveCategories(); }
              if (data.settings) { settings = data.settings; currentCurrency = settings.currency || 'USD'; saveSettings(); }
              saveEntries();
              showToast(`Imported ${data.entries.length} entries!`, 'success');
              renderAll();
            } else {
              showToast('Invalid JSON format', 'error');
            }
          } else if (file.name.endsWith('.csv')) {
            const lines = content.trim().split('\n').slice(1);
            let count = 0;
            lines.forEach(line => {
              const parts = line.split(',');
              if (parts.length >= 4) {
                const entry = {
                  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + count,
                  amount: parseFloat(parts[3]),
                  currency: parts[4] || currentCurrency,
                  source: parts[1].replace(/"/g, ''),
                  category: parts[2].replace(/"/g, ''),
                  date: parts[0],
                  notes: parts[5] ? parts[5].replace(/"/g, '') : '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                entries.push(entry);
                count++;
              }
            });
            saveEntries();
            showToast(`Imported ${count} entries!`, 'success');
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
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
      if (tab === 'entries') renderEntries();
      if (tab === 'categories') renderCategories();
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
      document.getElementById('currencySelector').innerHTML = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
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
      document.getElementById('filterDateFrom').addEventListener('change', renderEntries);
      document.getElementById('filterDateTo').addEventListener('change', renderEntries);
      document.getElementById('filterCategory').addEventListener('change', renderEntries);
      document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterCategory').value = '';
        renderEntries();
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

      // Keyboard
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); closeConfirm(); }
      });

      // Render
      renderAll();
    }

    document.addEventListener('DOMContentLoaded', init);

