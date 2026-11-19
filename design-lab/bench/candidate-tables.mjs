// Prints the 007B.6 comparison tables (Markdown) from design-lab/results/benchmark.json for the candidate and the
// designs re-run under the same conditions. Usage: node design-lab/bench/candidate-tables.mjs > work/tables.md
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('design-lab/results/benchmark.json', 'utf8'));
const N = { glass: 'Liquid Glass × Linear (light)', 'glass-dark': 'Liquid Glass × Linear (dark)', stayflow: 'Stayflow candidate', ledger: 'Ledger', apple: 'Apple Design', impeccable: 'Impeccable', uxpro: 'UI UX Pro Max', emil: 'Emil Design Eng.' };
const ids = Object.keys(N).filter(d => R[d]);
const t = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map(r => '| ' + r.join(' | ') + ' |').join('\n')}\n`;
const task = (d, n) => R[d].tasks.find(x => x.name === n);
const tm = (d, n) => { const x = task(d, n); return x.ok ? `${x.ms} / ${x.clicks}` : `**failed** (${x.err.slice(0, 40)})`; };
const kb = d => { const k = R[d].quality.keyboard; const v = Object.values(k); return `${v.filter(Boolean).length}/${v.length}`; };
const fails = d => R[d].summary.failures;
const ov = d => { const o = R[d].quality.overflow; const bad = Object.entries(o).filter(([, v]) => v > 0).map(([k]) => k); return bad.length ? bad.join(', ') : `none (${Object.keys(o).length} widths)`; };
const ix = (d, k) => R[d].interaction[k]?.medianMs ?? '–';
console.log('### Workflows (desktop 1280 × 800; ms / clicks counted by the page; includes Playwright driver overhead)\n');
console.log(t(['Design', 'Find guest', 'Check in', 'Validation', 'Add + edit room', 'Switch property', 'Tablet check in', 'Phone check in', 'Failures'], ids.map(d => [N[d], tm(d, 'find'), tm(d, 'checkin'), tm(d, 'validate'), tm(d, 'addedit'), tm(d, 'menu'), `${R[d].devices.tablet[1].ms} / ${R[d].devices.tablet[1].clicks}`, `${R[d].devices.mobile[1].ms} / ${R[d].devices.mobile[1].clicks}`, fails(d)])));
console.log('\n### Load, latency, frames, layout shift\n');
console.log(t(['Design', 'FCP ms', 'Transfer kB', 'Search ms', 'Filter ms', 'Open ms', 'Submit ms', 'Worst panel frame ms', 'Frames over 33 ms', 'CLS', 'Long tasks'], ids.map(d => { const r = R[d]; return [N[d], r.load.fcpMs, r.load.kb, ix(d, 'search'), ix(d, 'filter'), ix(d, 'open'), ix(d, 'submit'), r.frames.length ? Math.max(...r.frames.map(f => f.max)) : 'none sampled', r.frames.reduce((a, f) => a + f.over33, 0), r.cls, r.longTasks]; })));
console.log('\n### Large dataset (60 rooms) and network states\n');
console.log(t(['Design', 'DOM nodes', 'Search ms', 'Filter ms', 'Worst scroll frame ms', 'CLS', 'Skeleton', 'Busy on save', 'Error + Retry', 'Retry succeeds'], ids.map(d => { const l = R[d].large, n = R[d].network; return [N[d], l.dom, l.search?.medianMs ?? '–', l.filter?.medianMs ?? '–', l.scroll.worstMs, l.cls, n.skeletonDuringLoad ? 'yes' : 'no', n.busyStateShown ? 'yes' : 'no', n.errorShownInForm ? 'yes' : 'no', n.retrySucceeds ? 'yes' : 'no']; })));
console.log('\n### Keyboard, touch, overflow, contrast, reduced motion\n');
console.log(t(['Design', 'Keyboard checks', 'Phone targets under 44 px', 'Overflow', 'Min text contrast', 'Contrast failures', 'Reduced motion longest ms', 'Invalid input checks'], ids.map(d => { const q = R[d].quality; const c = q.contrast; return [N[d], kb(d), `${q.touch.under44}/${q.touch.checked}`, ov(d), Math.min(c.list.minRatio, c.detail.minRatio, c.form.minRatio), c.list.failures + c.detail.failures + c.form.failures, q.reducedMotion.longestMs, Object.values(q.invalidInputs).filter(Boolean).length + '/3']; })));
