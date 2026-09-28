/* IncomeTracker reporting — pure functions over an entries array.
 * Phase D (PRD Phase 2). No DOM, no storage access: easy to test, no deps.
 * Entry shape: { id, amount:number, currency, source, category, date:'YYYY-MM-DD', notes }.
 */
'use strict';

const IncomeReport = (() => {
  function parseLocal(dateStr) {
    // Noon-parse avoids UTC-midnight TZ shifts for 'YYYY-MM-DD'.
    return new Date(dateStr + 'T12:00:00');
  }

  function monthEntries(all, year, month) {
    // month: 0-based (Date convention)
    return all.filter((e) => {
      const d = parseLocal(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function monthlyTotal(all, year, month) {
    const list = monthEntries(all, year, month);
    const total = list.reduce((s, e) => s + e.amount, 0);
    return { total, count: list.length, avg: list.length > 0 ? total / list.length : 0 };
  }

  function prevMonth(year, month) {
    const d = new Date(year, month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  function changeVsPrev(all, year, month) {
    const cur = monthlyTotal(all, year, month).total;
    const p = prevMonth(year, month);
    const prev = monthlyTotal(all, p.year, p.month).total;
    const pct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    return { current: cur, previous: prev, pct };
  }

  function categoryBreakdown(all, year, month, categories) {
    const list = monthEntries(all, year, month);
    const total = list.reduce((s, e) => s + e.amount, 0);
    const byCat = {};
    list.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    return categories
      .map((c) => {
        const t = byCat[c.id] || 0;
        return { id: c.id, name: c.name, color: c.color, icon: c.icon || '', total: t, pct: total > 0 ? (t / total) * 100 : 0 };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  function sourceBreakdown(all, year, month) {
    const list = monthEntries(all, year, month);
    const bySrc = {};
    list.forEach((e) => {
      const key = (e.source || 'Unknown').trim() || 'Unknown';
      bySrc[key] = (bySrc[key] || 0) + e.amount;
    });
    return Object.entries(bySrc)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }

  function trendData(all, months, ref) {
    const end = ref ? new Date(ref.getFullYear(), ref.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      out.push({
        key: y + '-' + String(m + 1).padStart(2, '0'),
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        year: y,
        month: m,
        total: monthlyTotal(all, y, m).total
      });
    }
    return out;
  }

  function yearTotal(all, year) {
    return all
      .filter((e) => parseLocal(e.date).getFullYear() === year)
      .reduce((s, e) => s + e.amount, 0);
  }

  return { parseLocal, monthEntries, monthlyTotal, prevMonth, changeVsPrev, categoryBreakdown, sourceBreakdown, trendData, yearTotal };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = IncomeReport;
