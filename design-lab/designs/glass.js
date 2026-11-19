// Stayflow light (revision of the approved Liquid Glass × Linear direction, D060). Light-first, Linear-precise chrome.
// The approved baseline is frozen as glass-620dc89.js.
// Same engine and workflows as the Stayflow candidate; new visual system in /glass/glass.css: a solid content layer and a
// floating glass control layer (bar, phone dock, menus, sheet edge). Light and dark themes; "Reduce transparency" toggle.
// URL options: ?theme=light|dark (else saved choice, else the OS) and ?glass=reduced.
// The stylesheet loads before boot (no unstyled first frame). Text uses the platform's own UI font, so nothing else loads.
const fontChoice = new URLSearchParams(location.search).get('font') === 'system' ? 'system' : 'geist'; // Geist chosen by the owner; ?font=system keeps the comparison
document.documentElement.dataset.font = fontChoice;
await Promise.all([
  new Promise(res => { const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/glass/glass.css', onload: res, onerror: res }); document.head.append(l); }),
  fontChoice === 'geist' ? (() => { const f = new FontFace('Geist', 'url(/fonts/geist.ttf)', { weight: '100 900' }); document.fonts.add(f); return f.load().catch(() => {}); })() : null
]);
const store = { get: k => { try { return localStorage.getItem('sf-glass:' + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem('sf-glass:' + k, v); } catch { } } };
const q0 = new URLSearchParams(location.search), root = document.documentElement;
root.dataset.theme = q0.get('theme') || store.get('theme') || 'light'; // light-first; dark stays available
root.dataset.glass = q0.get('glass') || store.get('glass') || 'full';
const wide = () => matchMedia('(min-width: 75em)').matches;
const phone = () => matchMedia('(max-width: 47.99em)').matches;
const sv = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = { search: '<path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7"/>', plus: '<path d="M12 5v14"/><path d="M5 12h14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>', chev: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>' };
// Status glyphs: one 16 px family, distinct shapes (never colour alone).
const G = { vacant: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/>', occupied: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="3" fill="currentColor"/>',
  today: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.6a3.4 3.4 0 0 1 0 6.8z" fill="currentColor"/>', overdue: '<path d="M8 2.2 14.2 13H1.8z" fill="currentColor"/><path d="M8 6.4v3" stroke="var(--surface)" stroke-width="1.5" stroke-linecap="round"/>',
  oos: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m4.3 11.7 7.4-7.4" stroke="currentColor" stroke-width="1.6"/>' };
const glyph = k => `<svg class="st" viewBox="0 0 16 16" aria-hidden="true">${G[k]}</svg>`;
const TILE = '<span class="tile" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 21V10.5C5 6.4 8.1 3 12 3s7 3.4 7 7.5V21" fill="none" stroke="#E4E4EC" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="10" r="2" fill="#A3A4FF"/></svg></span>';
const STATUS = { occupied: 'In house', vacant: 'Available', today: 'Leaves today', overdue: 'Overdue', oos: 'Out of service' };
const mono = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function line(r, c) {
  const k = c.kindOf(r); if (k === 'vacant' || k === 'oos') return '';
  if (!r.dep) return '<span class="ln nodep" style="--w:100%" data-end="No date"></span>';
  const n = c.dayDiff(r.dep);
  if (n > 6) return `<span class="ln open" style="--w:100%" data-end="7+ nights"></span>`;
  return `<span class="ln" style="--w:calc(100% * ${(Math.max(0, n) + .5).toFixed(1)} / 7)" data-end="${n} night${n === 1 ? '' : 's'}"></span>`;
}
function when(r, c) { const k = c.kindOf(r), w = c.whenText(r); return k === 'occupied' ? (r.dep ? `Leaves ${w === 'Tomorrow' ? 'tomorrow' : w}` : 'No departure set') : k === 'overdue' ? w : STATUS[k]; }
function row(r, c) {
  const k = c.kindOf(r), e = c.esc, cls = `row k-${k}${c.state.flash === r.id ? ' flash' : ''}${c.state.sel === r.id ? ' sel' : ''}`;
  const name = r.guest ? `<span class="gn" title="${e(r.guest)}">${e(r.guest)}</span>` : `<span class="gn none">${k === 'oos' ? 'Not in use' : 'No guest'}</span>`;
  return `<li class="${cls}"><button type="button" class="rb${r.label.length > 7 ? ' long' : ''}" data-room="${e(r.id)}" data-act="select:${e(r.id)}" ${c.state.sel === r.id ? 'aria-current="true"' : ''}>${glyph(k)}<span class="rid">${e(r.label)}</span><span class="who">${name}</span><span class="when">${e(when(r, c))}</span></button>
    <div class="wk" aria-hidden="true">${line(r, c)}</div><span class="ra">${r.status === 'vacant' ? `<button type="button" class="btn btn-row" data-act="open:checkin:${e(r.id)}" aria-label="Check in to ${e(r.label)}">Check in</button>` : ''}</span></li>`;
}
const days = c => Array.from({ length: 7 }, (_, i) => { const d = c.fmt(c.addDays(c.TODAY, i)).split(' '); return `<span>${d[0].slice(0, 2)} ${d[1]}</span>`; }).join('');
const today = c => { const n = c.counts, k = x => c.all.filter(r => c.kindOf(r) === x).length; return [['In house', n.occupied], ['Leaving today', k('today')], ['Overdue', k('overdue')], ['Available now', n.vacant], ['Out of service', n.oos]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''); };
const GROUPS = [['attention', 'Needs attention', (r, c) => c.needsAttention(r)], ['house', 'On schedule', (r, c) => r.status === 'occupied' && !c.needsAttention(r)], ['vacant', 'Available', r => r.status === 'vacant'], ['oos', 'Out of service', r => r.status === 'oos']];
const uiState = () => { const dark = root.dataset.theme === 'dark', reduced = root.dataset.glass === 'reduced'; document.querySelectorAll('.icon-btn[data-ui=theme]').forEach(b => { b.setAttribute('aria-pressed', dark); b.innerHTML = sv(dark ? I.moon : I.sun, 17); }); document.querySelectorAll('.icon-btn[data-ui=glass]').forEach(b => b.setAttribute('aria-pressed', reduced)); document.querySelectorAll('.lm-item[data-ui]').forEach(b => b.setAttribute('aria-checked', b.dataset.ui === 'theme' ? dark : reduced)); };

let bound = false, lastShown = '';
function bindOnce() {
  if (bound) return; bound = true;
  addEventListener('keydown', e => { if (!e.isComposing && /^(Tab|Enter| |Escape|Arrow|\/)/.test(e.key)) document.body.dataset.input = 'kbd'; }, true);
  addEventListener('pointerdown', () => { document.body.dataset.input = 'ptr'; }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ui]'); if (!b) return;
    if (b.dataset.ui === 'theme') { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('theme', root.dataset.theme); }
    else { root.dataset.glass = root.dataset.glass === 'reduced' ? 'full' : 'reduced'; store.set('glass', root.dataset.glass); }
    uiState();
  });
  // Light follows the pointer on the hovered glass control only (one element's custom properties, rAF-throttled).
  let raf = 0;
  document.addEventListener('pointermove', e => { const g = e.pointerType === 'mouse' && e.target.closest?.('.glass.lit'); if (!g || raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = g.getBoundingClientRect(); g.style.setProperty('--lx', `${e.clientX - r.left}px`); g.style.setProperty('--ly', `${e.clientY - r.top}px`); }); }, { passive: true });
  // The phone dock's search field mirrors the main one, so the engine sees one input.
  document.addEventListener('input', e => { if (e.target.id === 'q2') { const q = document.getElementById('q'); q.value = e.target.value; q.dispatchEvent(new Event('input', { bubbles: true })); } });
  // Phone sheet: drag down to dismiss (pointer capture, 30% distance or a flick).
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const h = document.getElementById('host'); if (drag || !phone() || !h.classList.contains('open') || !e.target.closest('#host .grab, #host .ih') || e.target.closest('button,input,select,a')) return;
    const base = Math.max(0, new DOMMatrix(getComputedStyle(h).transform).m42); // grabbed mid-settle: start from where it is, not where it was heading
    drag = { id: e.pointerId, y0: e.clientY, base, pts: [[e.clientY, performance.now()]], h }; h.setPointerCapture(e.pointerId); h.style.transition = 'none'; h.style.transform = `translateY(${base}px)`;
  });
  const pos = (d, y) => { const t = d.base + y - d.y0; return t >= 0 ? t : -(Math.abs(t) * 40) / (40 + Math.abs(t)); }; // resistance above the resting position
  document.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; drag.h.style.transform = `translateY(${pos(drag, e.clientY)}px)`; drag.pts.push([e.clientY, performance.now()]); if (drag.pts.length > 8) drag.pts.shift(); });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; const now = performance.now(), t = pos(d, e.clientY);
    const recent = d.pts.filter(([, ts]) => now - ts <= 100); const v = recent.length > 1 ? (e.clientY - recent[0][0]) / Math.max(1, now - recent[0][1]) : 0; // a pause before release is not a flick
    d.h.style.transition = '';
    if (t > d.h.offsetHeight * .3 || (v > .11 && t > 10)) { d.h.style.transform = 'translateY(100%)'; d.h.querySelector('[data-act="close"]')?.click(); } else d.h.style.transform = '';
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  matchMedia('(min-width: 75em)').addEventListener('change', () => document.querySelector('#filters [aria-pressed="true"]')?.click());
}

const prop = c => `<button class="prop" type="button" data-act="menu" aria-haspopup="menu" aria-expanded="false"><span class="mono" aria-hidden="true">${c.esc(mono(c.prop.name))}</span><b class="pn">${c.esc(c.prop.name)}</b><small>${c.prop.role}</small>${sv(I.chev, 14)}</button>`;
const search = id => `<label class="search">${sv(I.search, 15)}<span class="sr-only">Search rooms and guests</span><input id="${id}" type="search" placeholder="${id === 'q' ? 'Search rooms or guests' : 'Search'}" autocomplete="off" enterkeyhint="search">${id === 'q' ? '<kbd aria-hidden="true">/</kbd>' : ''}</label>`;
export default {
  id: 'glass', name: 'Stayflow light', closeMs: 200, escapeClears: true, selectOnOpen: true,
  get mode() { return wide() ? 'inline' : 'panel'; },
  filters: ['all', 'attention', 'occupied', 'vacant', 'oos'],
  labels: { all: 'All', vacant: 'Available', occupied: 'In house', oos: 'Out of service', attention: 'Needs attention', overdue: 'Overdue', today: 'Leaves today', vacantNote: 'Available now. Stayflow does not track future arrivals yet, so this does not mean the room is free to sell.' },
  layout: c => `<header class="bar" data-c="header"><span class="brand">${TILE}<span>Stayflow</span></span><span class="sep" aria-hidden="true"></span>${prop(c)}
  <nav aria-label="Main"><a href="#" aria-current="page">Rooms</a></nav><span class="spacer"></span>${search('q')}
  <button class="icon-btn" type="button" data-ui="glass" aria-label="Reduce transparency" aria-pressed="false" title="Reduce transparency">${sv(I.layers, 17)}</button>
  <button class="icon-btn" type="button" data-ui="theme" aria-label="Dark theme" aria-pressed="false" title="Dark theme"></button>
  <button class="btn btn-primary add" type="button" data-act="open:add">${sv(I.plus, 14)}Add room</button></header>
<main class="main"><div class="head"><div><h1>Rooms</h1><p class="facts" id="facts"></p></div><div class="seg" id="filters" role="group" aria-label="Show rooms" data-c="filters"></div></div>
  <div id="notice" role="status" aria-live="polite"></div>
  <div class="work"><section class="pane" aria-label="Rooms" data-c="list"><div class="cols" aria-hidden="true"><span class="c1"><span></span><span>Room</span><span>Guest</span><span>Departure</span></span><span class="days" id="days"></span><span></span></div><div id="list"></div><p class="cap">The week view shows current stays only. Stayflow does not track future arrivals yet. Design Lab · synthetic data only.</p></section>
  <div class="scrim" data-act="close"></div><div class="rightcol"><aside class="side" aria-label="Today and guest requests"><section class="card" aria-labelledby="t-h"><h2 id="t-h">Today</h2><dl class="today" id="today2">${today(c)}</dl></section>
  <section class="card" aria-labelledby="q-h"><div class="card-h"><h2 id="q-h">Guest requests</h2><span class="sample">Sample</span></div><ul class="queue"><li><span class="q-room">A4</span><span class="q-text">Extra towels</span><span class="q-meta">08:12 · New</span></li><li><span class="q-room">A3</span><span class="q-text">Kettle not working</span><span class="q-meta">07:55 · With maintenance</span></li><li><span class="q-room">A1</span><span class="q-text">Late checkout, 12:00</span><span class="q-meta">09:40 · Awaiting reply</span></li></ul><p class="hint">Sample only; requests are not built yet.</p></section></aside>
  <section id="host" class="insp" aria-labelledby="ih-t" ${wide() ? '' : 'hidden'}></section></div></div>
  <p class="sr-only" role="status" id="count"></p></main>
<div class="dock" role="toolbar" aria-label="Rooms toolbar"><div class="search-cap glass">${search('q2')}</div><div class="add-cap glass"><button class="icon-btn" type="button" data-act="open:add" aria-label="Add room">${sv(I.plus, 20)}</button></div></div>
<div id="menu" hidden></div>`,
  filterBtn: (f, on, n, c) => `<button type="button" data-act="filter:${f}" aria-pressed="${on}">${c.t(f)}<span class="n">${n}</span></button>`,
  list: (rs, c) => GROUPS.map(([id, label, f]) => { const g = rs.filter(r => f(r, c)); return g.length ? `<h2 class="gh" id="g-${id}">${label}<span class="n">${g.length}</span></h2><ul class="rows" aria-labelledby="g-${id}">${g.map(r => row(r, c)).join('')}</ul>` : ''; }).join(''),
  skeleton: () => `<div class="skel" role="status" aria-label="Loading rooms">${'<i></i>'.repeat(6)}</div>`,
  empty: c => c.all.length ? `<div class="empty"><h2>No matching rooms</h2><p>Nothing matches this search and filter.</p><button type="button" class="btn btn-secondary" data-act="clearfilters">Clear search and filter</button></div>` : `<div class="empty"><h2>No rooms yet</h2><p>Add the property's rooms to start the register.</p><button type="button" class="btn btn-primary" data-act="open:add">Add room</button></div>`,
  idle: c => `<div class="idle"><h2 id="ih-t">Today</h2><dl class="today" id="today">${today(c)}</dl><p class="hint">Select a room to see its stay or check a guest in. Press <kbd>/</kbd> to search.</p><p class="d-note">Arrivals and bookings are not tracked yet, so nothing here forecasts availability.</p></div>`,
  frame: (title, body, c, kind) => {
    const f = c.state.form, r = f ? (f.id ? c.room(f.id) : null) : c.sel, k = r ? c.kindOf(r) : 'vacant';
    const sub = f ? { checkin: 'Check in a guest', edit: 'Edit room', add: '' }[f.type] : '';
    return `<div class="k-${k}"><div class="ih"><div class="grab" aria-hidden="true"></div><div class="ih-top"><div><h2 id="ih-t">${r ? c.esc(r.label) : 'Add room'}</h2>${r ? `<span class="badge">${glyph(k)}${STATUS[k]}</span>` : ''}</div><button type="button" class="icon-btn x" data-act="close" aria-label="${f ? 'Cancel and close' : 'Close room details'}">${sv(I.x, 17)}</button></div>${sub ? `<h3>${sub}</h3>` : ''}</div><div class="ib">${!f && r?.guest ? `<div class="stay" aria-hidden="true"><div class="days">${days(c)}</div><div class="wk">${line(r, c)}</div></div>` : ''}${body}</div></div>`;
  },
  notice: (n, c) => n.kind === 'error' ? `<p class="f-err" role="alert">${c.esc(n.text)}</p>` : `<div class="notice">${sv(I.check, 17)}<p>${c.esc(n.text)}</p><button type="button" class="icon-btn" data-act="dismiss" aria-label="Dismiss message">${sv(I.x, 15)}</button></div>`,
  menu: c => c.menuHtml(c).replace('class="lm"', 'class="lm glass thick"').replace('<hr class="lm-sep">', '<hr class="lm-sep"><p class="lm-h">Display</p><button type="button" role="menuitemcheckbox" class="lm-item" data-ui="theme" aria-checked="false">Dark theme</button><button type="button" role="menuitemcheckbox" class="lm-item" data-ui="glass" aria-checked="false">Reduce transparency</button><hr class="lm-sep">'),
  after: c => {
    bindOnce(); uiState();
    const n = c.counts, $ = id => document.getElementById(id);
    $('facts').innerHTML = `${c.fmt(c.TODAY)} · <b>${n.occupied}</b> of ${n.all} in house${n.attention ? ` · <span class="att">${n.attention} need${n.attention === 1 ? 's' : ''} attention</span>` : ''}`;
    $('days').innerHTML = days(c);
    document.querySelectorAll('.pn').forEach(e => { e.textContent = c.prop.name; e.title = c.prop.name; });
    document.querySelectorAll('.mono').forEach(e => { e.textContent = mono(c.prop.name); });
    for (const id of ['today', 'today2']) { const t = $(id); if (t) t.innerHTML = today(c); }
    const q2 = $('q2'); if (q2 && document.activeElement !== q2) q2.value = c.state.q;
    const h = $('host'), open = !!(c.state.form || c.sel);
    const key = c.state.form ? 'f' + c.state.form.nonce : c.sel?.id ?? ''; if (wide() && open && key !== lastShown) requestAnimationFrame(() => { const col = h.parentElement, r = h.getBoundingClientRect(), cr = col.getBoundingClientRect(); if (r.bottom > cr.bottom) col.scrollTop += r.bottom - cr.bottom + 12; }); lastShown = key; // scroll the right column only, never the page
    if (wide()) { h.hidden = false; h.setAttribute('role', 'region'); h.removeAttribute('aria-modal'); }
    else { h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); if (h.hidden || !open) { h.style.transform = ''; h.style.transition = ''; } if (!open && !h.classList.contains('open') && !h.classList.contains('closing')) h.hidden = true; }
    if (c.state.menu) { const tr = [...document.querySelectorAll('[data-act="menu"]')].find(b => b.offsetParent), m = $('menu'); if (tr) { const a = tr.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(a.left, innerWidth - 252)) + 'px'; m.style.top = (a.bottom + 8) + 'px'; } }
  }
};
