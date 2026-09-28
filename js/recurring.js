/* IncomeTracker recurring engine — pure functions over rules + entries.
 * Phase F slice 1 (PRD Phase 4: Recurring Income, P1).
 * Rule shape: { id, amount:number, source, category, frequency, startDate:'YYYY-MM-DD', lastGenerated:'YYYY-MM-DD'|null }.
 * frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'.
 */
'use strict';

const RecurringEngine = (() => {
  const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseLocal(dateStr) {
    return new Date(dateStr + 'T12:00:00');
  }

  function todayLocal() {
    const d = new Date();
    return iso(d);
  }

  function addMonths(date, n) {
    const day = date.getDate();
    const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  }

  function nextAfter(dateStr, frequency) {
    const d = parseLocal(dateStr);
    switch (frequency) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': return iso(addMonths(d, 1));
      case 'yearly': return iso(new Date(d.getFullYear() + 1, d.getMonth(), Math.min(d.getDate(), 28)));
      default: return null;
    }
    return iso(d);
  }

  function nextOccurrence(rule) {
    if (!rule || !FREQUENCIES.includes(rule.frequency)) return null;
    const base = rule.lastGenerated || rule.startDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(base || '')) return null;
    return nextAfter(base, rule.frequency);
  }

  function validateRule(data, knownCategoryIds) {
    const amount = parseFloat(data.amount);
    if (!isFinite(amount) || amount <= 0) return 'Please enter a valid amount';
    if (!data.source || !data.source.trim()) return 'Please enter a source';
    if (!FREQUENCIES.includes(data.frequency)) return 'Please select a valid frequency';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate || '') || isNaN(parseLocal(data.startDate).getTime())) return 'Please select a valid start date';
    if (knownCategoryIds && !knownCategoryIds.includes(data.category)) return 'Please select a valid category';
    return null;
  }

  function dueDates(rule, todayStr, cap) {
    // All occurrence dates after the anchor (lastGenerated|startDate) up to today.
    const out = [];
    let next = nextOccurrence(rule);
    const limit = Math.max(cap || 24, 1);
    while (next && next <= todayStr && out.length < limit) {
      out.push(next);
      next = nextAfter(next, rule.frequency);
    }
    return out;
  }

  function checkAndGenerate(rules, entries, todayStr, newIdFn, currency) {
    // Returns { entries, rules, generated } with new entry objects appended.
    const today = todayStr || todayLocal();
    let generated = 0;
    const nextRules = rules.map((rule) => {
      const dues = dueDates(rule, today, 24);
      dues.forEach((date) => {
        entries.push({
          id: newIdFn ? newIdFn() : 'rec-' + Date.now().toString(36) + '-' + generated,
          amount: rule.amount,
          currency: currency || 'USD',
          source: rule.source,
          category: rule.category,
          date,
          notes: 'Auto-generated recurring income',
          recurringId: rule.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        generated++;
      });
      if (dues.length > 0) return Object.assign({}, rule, { lastGenerated: dues[dues.length - 1] });
      return rule;
    });
    return { entries, rules: nextRules, generated };
  }

  return { FREQUENCIES, iso, parseLocal, todayLocal, nextAfter, nextOccurrence, validateRule, dueDates, checkAndGenerate };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = RecurringEngine;
