// Design 8: Stayflow candidate (Assignment 007B.6). PROVISIONAL synthesis built with the stayflow-design skill.
// Markup only; styles live in /stayflow/stayflow.css (shared with the family concepts). Business logic is core.js.
// One top bar at every width (D047). Desktop ≥75em: persistent inspector beside the list. Below: the same content in a sheet (right, or bottom on phones).
// Load the stylesheet and font before the engine boots (top-level await): no unstyled first frame and no font-swap shift.
await Promise.all([
  new Promise(res => { const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/stayflow/stayflow.css', onload: res, onerror: res }); document.head.append(l); }),
  (() => { const f = new FontFace('Geist', 'url(/fonts/geist.ttf)', { weight: '100 900' }); document.fonts.add(f); return f.load().catch(() => {}); })()
]);
const wide = () => matchMedia('(min-width: 75em)').matches;
const phone = () => matchMedia('(max-width: 47.99em)').matches;
const sv = (p, s = 18, extra = '') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const I = { bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 18h20"/>', search: '<path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7.5"/>', plus: '<path d="M12 5v14"/><path d="M5 12h14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>', chev: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>' };
// Status glyphs: a distinct shape per state so colour is never the only cue.
const G = {
  occupied: '<circle cx="5" cy="5" r="4.5" fill="currentColor"/>',
  vacant: '<circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  today: '<circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 1.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor"/>',
  overdue: '<path d="M5 .6 9.6 9H.4z" fill="currentColor"/>',
  oos: '<circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m2.4 7.6 5.2-5.2" stroke="currentColor" stroke-width="1.6"/>' };
const glyph = k => `<svg class="glyph" viewBox="0 0 10 10" aria-hidden="true">${G[k]}</svg>`;
const MARK = `<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 22V10.5C3 5.8 6.9 2 12 2s9 3.8 9 8.5V22z" fill="var(--on-deep)"/><circle cx="12" cy="9" r="1.8" fill="var(--brass)"/><path d="M7 16.2c1.6-2 3.4-2 5 0s3.4 2 5 0" fill="none" stroke="var(--deep)" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const STATUS = { occupied: 'In house', vacant: 'Available', today: 'Leaves today', overdue: 'Overdue', oos: 'Out of service' };
const mono = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function line(r, c) { // the stay line: width to the departure day's centre; beyond the week it runs out with an arrow
  const k = c.kindOf(r); if (k === 'vacant' || k === 'oos') return '';
  if (!r.dep) return '<span class="ln nodep" style="--w:100%"></span>';
  const n = c.dayDiff(r.dep);
  if (n > 6) return '<span class="ln open" style="--w:calc(100% - 7px)"></span>';
  return `<span class="ln" style="--w:calc(100% * ${(Math.max(0, n) + .5).toFixed(1)} / 7)"></span>`;
}
function sub(r, c) {
  const k = c.kindOf(r), w = c.whenText(r);
  const text = k === 'occupied' ? (r.dep ? `Leaves ${w === 'Tomorrow' ? 'tomorrow' : w}` : 'No departure set') : k === 'overdue' ? w : STATUS[k];
  return `<span class="status">${glyph(k)}${c.esc(text)}</span>`;
}
function row(r, c) {
  const k = c.kindOf(r), e = c.esc, cls = `row k-${k}${c.state.flash === r.id ? ' flash' : ''}${c.state.sel === r.id ? ' sel' : ''}`;
  const name = r.guest ? `<span class="gn" title="${e(r.guest)}">${e(r.guest)}</span>` : `<span class="gn none">${k === 'oos' ? 'Not in use' : 'No guest'}</span>`;
  return `<li class="${cls}"><button type="button" class="rb${r.label.length > 7 ? ' long' : ''}" data-room="${e(r.id)}" data-act="select:${e(r.id)}" ${c.state.sel === r.id ? 'aria-current="true"' : ''}><span class="rid">${e(r.label)}</span><span class="who">${name}${sub(r, c)}</span></button>
    <div class="wk" aria-hidden="true">${line(r, c)}</div><span class="ra">${r.status === 'vacant' ? `<button type="button" class="btn btn-row" data-act="open:checkin:${e(r.id)}" aria-label="Check in to ${e(r.label)}">Check in</button>` : ''}</span></li>`;
}
const days = c => Array.from({ length: 7 }, (_, i) => { const d = c.fmt(c.addDays(c.TODAY, i)).split(' '); return `<span>${d[0].slice(0, 2)}<br>${d[1]}</span>`; }).join('');
const today = c => { const n = c.counts, k = x => c.all.filter(r => c.kindOf(r) === x).length; return [['In house', n.occupied], ['Leaving today', k('today')], ['Overdue', k('overdue')], ['Available now', n.vacant], ['Out of service', n.oos]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''); };
const GROUPS = [['attention', 'Needs attention', (r, c) => c.needsAttention(r)], ['house', 'In house', (r, c) => r.status === 'occupied' && !c.needsAttention(r)], ['vacant', 'Available', r => r.status === 'vacant'], ['oos', 'Out of service', r => r.status === 'oos']];

let bound = false;
function bindOnce(c) {
  if (bound) return; bound = true;
  // Keyboard-initiated opens get no motion (motion.md). Pointer input restores it.
  addEventListener('keydown', e => { if (!e.isComposing && /^(Tab|Enter| |Escape|Arrow|\/)/.test(e.key)) document.body.dataset.input = 'kbd'; }, true);
  addEventListener('pointerdown', () => { document.body.dataset.input = 'ptr'; }, true);
  // Phone sheet: drag down to dismiss, 1:1 with pointer capture, flick or 30% distance.
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const h = document.getElementById('host');
    if (drag || !phone() || !h.classList.contains('open') || !e.target.closest('#host .grab, #host .ih') || e.target.closest('button,input,select,a')) return;
    drag = { id: e.pointerId, y0: e.clientY, t0: performance.now(), last: [[e.clientY, performance.now()]], h };
    h.setPointerCapture(e.pointerId); h.style.transition = 'none';
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0, t = dy >= 0 ? dy : -(Math.abs(dy) * 40) / (40 + Math.abs(dy)); // resistance when pulled up
    drag.h.style.transform = `translateY(${t}px)`; drag.last.push([e.clientY, performance.now()]); if (drag.last.length > 5) drag.last.shift();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return; const { h, y0, last } = drag; drag = null;
    const dy = e.clientY - y0, [[ya, ta]] = last, v = (e.clientY - ya) / Math.max(1, performance.now() - ta);
    h.style.transition = '';
    if (dy > h.offsetHeight * .3 || (v > .11 && dy > 10)) { h.style.transform = 'translateY(100%)'; h.querySelector('[data-act="close"]')?.click(); }
    else h.style.transform = '';
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  // Crossing the inspector breakpoint re-renders through the current filter (no state change).
  matchMedia('(min-width: 75em)').addEventListener('change', () => document.querySelector('#filters [aria-pressed="true"]')?.click());
}

export default {
  id: 'stayflow', name: 'Stayflow candidate', closeMs: 200, escapeClears: true, selectOnOpen: true,
  get mode() { return wide() ? 'inline' : 'panel'; },
  filters: ['all', 'attention', 'occupied', 'vacant', 'oos'],
  labels: { all: 'All', vacant: 'Available', occupied: 'In house', oos: 'Out of service', attention: 'Needs attention', overdue: 'Overdue', today: 'Leaves today', vacantNote: 'Available now. Stayflow does not track future arrivals yet, so this does not mean the room is free to sell.' },
  layout: c => `<div class="sf">
<header class="bar" data-c="header"><span class="wordmark">${MARK}<span aria-hidden="true"><b>stay</b><span>flow</span></span><span class="sr-only">Stayflow</span></span><span class="slash" aria-hidden="true">/</span>
  <button class="prop" type="button" data-act="menu" aria-haspopup="menu" aria-expanded="false"><span class="mono" aria-hidden="true">${c.esc(mono(c.prop.name))}</span><span><b class="pn">${c.esc(c.prop.name)}</b><small>${c.prop.role}</small></span>${sv(I.chev, 16)}</button>
  <nav aria-label="Main"><a href="#" aria-current="page">Rooms</a></nav><span class="spacer"></span><button class="icon-btn add-ico" type="button" data-act="open:add" aria-label="Add room">${sv(I.plus, 22)}</button></header>
<main class="main"><div class="head"><div><h1>Rooms</h1><p class="facts" id="facts"></p></div>
  <div class="tools"><label class="search">${sv(I.search, 18)}<span class="sr-only">Search rooms and guests</span><input id="q" type="search" placeholder="Search rooms or guests" autocomplete="off" enterkeyhint="search"><kbd aria-hidden="true">/</kbd></label><button class="btn btn-secondary add" type="button" data-act="open:add">${sv(I.plus, 16)}Add room</button></div></div>
  <div id="notice" role="status" aria-live="polite"></div>
  <div class="seg" id="filters" role="group" aria-label="Show rooms" data-c="filters"></div>
  <div class="work"><section class="board" aria-label="Rooms" data-c="list"><div class="cols" aria-hidden="true"><span class="c1"><span>Room</span><span>Guest and status</span></span><span class="days" id="days"></span><span></span></div><div id="list"></div><p class="cap">The week view shows current stays only. Stayflow does not track future arrivals yet.</p></section>
  <div class="scrim" data-act="close"></div><section id="host" class="insp" aria-labelledby="ih-t" ${wide() ? '' : 'hidden'}></section></div>
  <p class="foot">Design Lab · synthetic data only</p><p class="sr-only" role="status" id="count"></p></main></div><div id="menu" hidden></div>`,
  filterBtn: (f, on, n, c) => `<button type="button" data-act="filter:${f}" aria-pressed="${on}">${c.t(f)}<span class="n">${n}</span></button>`,
  list: (rs, c) => GROUPS.map(([id, label, f]) => { const g = rs.filter(r => f(r, c)); return g.length ? `<h2 class="gh" id="g-${id}">${label}<span class="n">${g.length}</span></h2><ul class="rows" aria-labelledby="g-${id}">${g.map(r => row(r, c)).join('')}</ul>` : ''; }).join(''),
  skeleton: () => `<div class="skel" role="status" aria-label="Loading rooms">${'<i></i>'.repeat(6)}</div>`,
  empty: c => c.all.length ? `<div class="empty"><h2>No matching rooms</h2><p>Nothing matches this search and filter.</p><button type="button" class="btn btn-secondary" data-act="clearfilters">Clear search and filter</button></div>` : `<div class="empty"><h2>No rooms yet</h2><p>Add the property's rooms to start the register.</p><button type="button" class="btn btn-primary" data-act="open:add">Add room</button></div>`,
  idle: c => `<div class="idle"><h2 id="ih-t">Today at a glance</h2><dl class="today" id="today">${today(c)}</dl><p class="hint">Select a room to see its stay or check a guest in. Press <kbd>/</kbd> to search.</p><p class="d-note">Arrivals and bookings are not tracked yet, so nothing here forecasts availability.</p></div>`,
  frame: (title, body, c, kind) => {
    const f = c.state.form, r = f ? (f.id ? c.room(f.id) : null) : c.sel, k = r ? c.kindOf(r) : 'vacant';
    const sub = f ? { checkin: 'Check in a guest', edit: 'Edit room', add: '' }[f.type] : '';
    return `<div class="k-${k}"><div class="ih"><div class="grab" aria-hidden="true"></div><div class="ih-top"><div><h2 id="ih-t">${r ? c.esc(r.label) : 'Add room'}</h2>${r ? `<span class="badge">${glyph(k)}${STATUS[k]}</span>` : ''}</div><button type="button" class="icon-btn x" data-act="close" aria-label="${f ? 'Cancel and close' : 'Close room details'}">${sv(I.x, 20)}</button></div>${sub ? `<h3>${sub}</h3>` : ''}</div><div class="ib">${!f && r?.guest ? `<div class="stay" aria-hidden="true"><div class="days">${days(c)}</div><div class="wk">${line(r, c)}</div></div>` : ''}${body}</div></div>`;
  },
  notice: (n, c) => n.kind === 'error' ? `<p class="f-err" role="alert">${c.esc(n.text)}</p>` : `<div class="notice">${sv(I.check, 20)}<p>${c.esc(n.text)}</p><button type="button" class="icon-btn" data-act="dismiss" aria-label="Dismiss message">${sv(I.x, 18)}</button></div>`,
  menu: c => c.menuHtml(c),
  after: c => {
    bindOnce(c);
    const n = c.counts, $ = id => document.getElementById(id);
    $('facts').innerHTML = `${c.fmt(c.TODAY)} · <b>${n.occupied}</b> of ${n.all} in house${n.attention ? ` · <span class="att">${n.attention} need${n.attention === 1 ? 's' : ''} attention</span>` : ''}`;
    $('days').innerHTML = days(c);
    document.querySelectorAll('.pn').forEach(e => { e.textContent = c.prop.name; e.title = c.prop.name; });
    document.querySelectorAll('.mono').forEach(e => { e.textContent = mono(c.prop.name); });
    const t = $('today'); if (t) t.innerHTML = today(c);
    const h = $('host'), open = !!(c.state.form || c.sel);
    if (wide()) { h.hidden = false; h.setAttribute('role', 'region'); h.removeAttribute('aria-modal'); }
    else { h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); if (h.hidden || !open) { h.style.transform = ''; h.style.transition = ''; } if (!open && !h.classList.contains('open') && !h.classList.contains('closing')) h.hidden = true; }
    if (c.state.menu) { const tr = [...document.querySelectorAll('[data-act="menu"]')].find(b => b.offsetParent), m = $('menu'); if (tr) { const a = tr.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(a.left, innerWidth - 260)) + 'px'; m.style.top = (a.bottom + 6) + 'px'; } }
  }
};
