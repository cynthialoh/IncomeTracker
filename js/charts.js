/* IncomeTracker charts — dependency-free SVG builders (strings).
 * Phase D (PRD Phase 2, bundle budget <30KB). Callers pass precomputed data;
 * currency formatting uses the global formatCurrency(id) from js/app.js.
 * All user-controlled text is escaped. Each visual gets role="img" +
 * <title>/<desc>; js/app.js adds a visually-hidden data table alongside.
 */
'use strict';

const IncomeCharts = (() => {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /* Donut: rows = [{ id, name, color, total, pct }] */
  function donut(rows, currency, opts) {
    const o = Object.assign({ size: 180, thickness: 28, label: 'Income by category' }, opts || {});
    const total = rows.reduce((s, r) => s + r.total, 0);
    if (rows.length === 0 || total <= 0) {
      return '<div class="chart-empty" role="img" aria-label="' + esc(o.label) + ': no data">No data for this period</div>';
    }
    const r = (o.size - o.thickness) / 2;
    const c = o.size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const segs = rows.map((row) => {
      const frac = row.total / total;
      const dash = Math.max(frac * circ - 1.5, 0.5); // small gap between slices
      const s = '<circle cx="' + c + '" cy="' + c + '" r="' + r.toFixed(1) + '" fill="none" stroke="' +
        esc(row.color) + '" stroke-width="' + o.thickness + '" stroke-dasharray="' + dash.toFixed(1) + ' ' +
        (circ - dash).toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')">' +
        '<title>' + esc(row.name) + ': ' + esc(formatCurrency(row.total, currency)) + ' (' + row.pct.toFixed(1) + '%)</title></circle>';
      offset += frac * circ;
      return s;
    }).join('');
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + o.size + ' ' + o.size + '" class="chart-donut" role="img" aria-label="' +
      esc(o.label) + ': total ' + esc(formatCurrency(total, currency)) + '">' +
      '<title>' + esc(o.label) + '</title><desc>Total ' + esc(formatCurrency(total, currency)) + ' across ' + rows.length + ' categories.</desc>' +
      segs +
      '<text x="' + c + '" y="' + (c - 2) + '" text-anchor="middle" class="chart-center-label">Total</text>' +
      '<text x="' + c + '" y="' + (c + 18) + '" text-anchor="middle" class="chart-center-value">' + esc(formatCurrency(total, currency)) + '</text>' +
      '</svg></div>';
  }

  function legend(rows, currency) {
    return '<div class="chart-legend">' + rows.map((row) =>
      '<button class="legend-item" data-cat="' + esc(row.id) + '" title="Filter entries">' +
      '<span class="legend-dot" style="background:' + esc(row.color) + '"></span>' +
      '<span class="legend-name">' + esc(row.name) + '</span>' +
      '<span class="legend-val">' + esc(formatCurrency(row.total, currency)) + ' · ' + row.pct.toFixed(0) + '%</span>' +
      '</button>').join('') + '</div>';
  }

  /* Line: points = [{ label, total }] oldest -> newest */
  function line(points, currency, opts) {
    const o = Object.assign({ w: 560, h: 220, pad: 34, label: 'Income trend' }, opts || {});
    const max = Math.max.apply(null, points.map((p) => p.total).concat([0]));
    const top = max > 0 ? max * 1.15 : 1;
    const n = points.length;
    const x = (i) => n === 1 ? o.w / 2 : o.pad + (i * (o.w - o.pad * 2)) / (n - 1);
    const y = (v) => o.h - o.pad - (v / top) * (o.h - o.pad * 2);
    const linePts = points.map((p, i) => x(i).toFixed(1) + ',' + y(p.total).toFixed(1)).join(' ');
    const area = o.pad + ',' + (o.h - o.pad) + ' ' + linePts + ' ' + x(n - 1).toFixed(1) + ',' + (o.h - o.pad);
    const dots = points.map((p, i) =>
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.total).toFixed(1) + '" r="4" class="chart-dot">' +
      '<title>' + esc(p.label) + ': ' + esc(formatCurrency(p.total, currency)) + '</title></circle>').join('');
    const labels = points.map((p, i) =>
      '<text x="' + x(i).toFixed(1) + '" y="' + (o.h - 10) + '" text-anchor="middle" class="chart-axis">' + esc(p.label) + '</text>').join('');
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + o.w + ' ' + o.h + '" class="chart-line" role="img" aria-label="' +
      esc(o.label) + ', ' + n + ' months">' +
      '<title>' + esc(o.label) + '</title><desc>Monthly totals from ' + esc(points[0].label) + ' to ' + esc(points[n - 1].label) +
      '. Peak ' + esc(formatCurrency(max, currency)) + '.</desc>' +
      '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + linePts + '" class="chart-path"/>' + dots + labels + '</svg></div>';
  }

  /* Horizontal bars (HTML, no lib): rows = [{ source, total }] */
  function bars(rows, currency, label) {
    if (rows.length === 0) {
      return '<div class="chart-empty" role="img" aria-label="' + esc(label || 'Income by source') + ': no data">No data for this period</div>';
    }
    const max = Math.max.apply(null, rows.map((r) => r.total).concat([1]));
    return '<div class="chart-bars" role="img" aria-label="' + esc(label || 'Income by source') + ', ' + rows.length + ' sources">' +
      rows.slice(0, 12).map((r) => {
        const pct = Math.max((r.total / max) * 100, 2);
        return '<div class="bar-row"><span class="bar-name">' + esc(r.source) + '</span>' +
          '<span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(1) + '%"></span></span>' +
          '<span class="bar-val">' + esc(formatCurrency(r.total, currency)) + '</span></div>';
      }).join('') + '</div>';
  }

  /* Visually-hidden data table for screen readers (PRD chart a11y). */
  function dataTable(caption, headers, rows) {
    return '<table class="sr-only"><caption>' + esc(caption) + '</caption><thead><tr>' +
      headers.map((h) => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }

  return { esc, donut, legend, line, bars, dataTable };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = IncomeCharts;
