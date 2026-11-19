// Shared mock business logic and controller for every Design Lab variant.
// Synthetic data only, held in memory inside the preview frame. Never connected to the real database or API.
export const TODAY = '2026-11-18';
const DAY = 864e5, WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayDiff = d => Math.round((Date.parse(d) - Date.parse(TODAY)) / DAY);
export const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
export const fmt = d => { const t = new Date(d + 'T00:00:00Z'); return `${WD[t.getUTCDay()]} ${t.getUTCDate()} ${MO[t.getUTCMonth()]}`; };
export const fmtShort = d => { const t = new Date(d + 'T00:00:00Z'); return `${t.getUTCDate()} ${MO[t.getUTCMonth()]}`; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kindOf = r => r.status === 'oos' ? 'oos' : r.status === 'vacant' ? 'vacant' : !r.dep ? 'occupied' : dayDiff(r.dep) < 0 ? 'overdue' : dayDiff(r.dep) === 0 ? 'today' : 'occupied';
export const whenText = r => { if (!r.dep) return r.status === 'occupied' ? 'No departure set' : ''; const n = dayDiff(r.dep); return n < 0 ? `${-n} day${n === -1 ? '' : 's'} overdue` : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmt(r.dep); };
export const needsAttention = r => ['overdue', 'today'].includes(kindOf(r));
const nights = n => `${n} night${n === 1 ? '' : 's'}`;
export const stayText = dep => dep ? `${fmt(TODAY)} → ${fmt(dep)} · ${nights(dayDiff(dep))}` : 'No departure date set';

// ---------- Synthetic data ----------
const NAMES = ['Thandi Mokoena', 'Daniel Adams', 'Naledi Dlamini', 'James van Wyk', 'Aisha Khumalo', 'Pieter Botha', 'Lerato Molefe', 'Sipho Nkosi', 'Emma Fourie', 'Kabelo Sithole', 'Zanele Mthembu', 'Johan Pretorius'];
const LONG = ['Aleksandra Wiśniewska-Kowalczyk Montgomery-Fitzgerald the Third of Northwind Industries Hold', '李小龍 🌿 Chen-Whitfield', 'Jo', 'Pieter van der Westhuizen-Naidoo'];
function seed(prop, size, stress) {
  if (prop === 'annex') return [{ id: 'C1', label: 'C1', status: 'vacant' }, { id: 'C2', label: 'C2', status: 'occupied', guest: 'Sipho Nkosi', dep: addDays(TODAY, 3) }, { id: 'C3', label: 'C3', status: 'oos' }];
  const r = [['A1', 'occupied', 'Thandi Mokoena', 2], ['A2', 'vacant'], ['A3', 'occupied', 'Daniel Adams', 1], ['A4', 'vacant'], ['A7', 'occupied', 'Naledi Dlamini', -1], ['A9', 'vacant'], ['A10', 'occupied', 'James van Wyk', 0], ['A14', 'vacant'], ['A15', 'oos']]
    .map(([label, status, guest, d]) => ({ id: label, label, status, guest, dep: d === undefined ? undefined : addDays(TODAY, d) }));
  if (size === 'large') for (let i = 1; i <= 51; i++) {
    const s = i % 7 === 0 ? 'oos' : i % 3 === 0 ? 'vacant' : i % 3 === 1 ? 'occupied' : 'vacant';
    r.push({ id: 'B' + i, label: 'B' + i, status: s, guest: s === 'occupied' ? NAMES[i % NAMES.length] : undefined, dep: s === 'occupied' ? addDays(TODAY, (i % 6) - 1) : undefined });
  }
  if (stress) {
    r.push({ id: 'Presidential-Suite-Garden-Wing12', label: 'Presidential-Suite-Garden-Wing12', status: 'occupied', guest: LONG[0], dep: addDays(TODAY, 4) },
      { id: '山景-1', label: '山景-1', status: 'occupied', guest: LONG[1], dep: TODAY }, { id: 'WC-J', label: 'WC-J', status: 'occupied', guest: LONG[2], dep: addDays(TODAY, 1) },
      { id: 'E2E-mwm32x7fk3v', label: 'E2E-mwm32x7fk3v', status: 'vacant' });
  }
  return r;
}
const sortLabel = (a, b) => a.label.localeCompare(b.label, 'en', { numeric: true, sensitivity: 'base' });

// ---------- Boot ----------
export async function boot(design) {
  const q = new URLSearchParams(location.search);
  const cfg = { size: q.get('size') || 'standard', stress: q.get('stress') === '1', latency: Number(q.get('latency') || 0), fail: q.get('fail') === '1' };
  const props = { hh: { name: 'Hillview Guesthouse', role: 'Manager' }, annex: { name: 'Hillview Annex', role: 'Manager' } };
  let data, state, writes = 0, lastTrigger = null, lastKey = '', flashTimer, noticeTimer;
  const $ = s => document.querySelector(s);
  const lab = window.__lab = { design: design.id, cfg, metrics: [], frames: [], clicks: 0, keys: 0, cls: 0, longTasks: 0, marks: {}, errors: [], log: [] };
  const t = k => design.labels?.[k] ?? { all: 'All', vacant: 'Available', occupied: 'Occupied', oos: 'Out of service', attention: 'Needs attention', overdue: 'Overdue', today: 'Leaves today', vacantNote: 'Stayflow does not track future arrivals yet, so this does not mean the room is free to sell.' }[k] ?? k;

  function reset() {
    data = { hh: seed('hh', cfg.size, cfg.stress), annex: seed('annex') };
    state = { prop: 'hh', q: '', filter: 'all', sel: null, form: null, notice: null, loading: false, menu: false, flash: null, sort: { k: 'label', dir: 1 }, page: 1 };
    writes = 0; lab.log.push({ ev: 'reset', t: performance.now() });
  }
  const rooms = () => data[state.prop];
  const room = id => rooms().find(r => r.id === id);
  const counts = () => { const rs = rooms(); return { all: rs.length, vacant: rs.filter(r => r.status === 'vacant').length, occupied: rs.filter(r => r.status === 'occupied').length, oos: rs.filter(r => r.status === 'oos').length, attention: rs.filter(needsAttention).length }; };
  const matches = r => { const n = state.q.trim().toLowerCase(); return !n || (r.label + ' ' + (r.guest ?? '')).toLowerCase().includes(n); };
  const passes = r => state.filter === 'all' || (state.filter === 'attention' ? needsAttention(r) : r.status === state.filter);
  function visible() {
    let rs = rooms().filter(r => passes(r) && matches(r));
    const { k, dir } = state.sort;
    rs = [...rs].sort((a, b) => (k === 'label' ? sortLabel(a, b) : k === 'status' ? kindOf(a).localeCompare(kindOf(b)) || sortLabel(a, b) : ((a.dep ?? '9') < (b.dep ?? '9') ? -1 : (a.dep ?? '9') > (b.dep ?? '9') ? 1 : sortLabel(a, b))) * dir);
    return rs;
  }
  const ctx = () => ({ state, t, cfg, counts: counts(), props, prop: props[state.prop], sel: state.sel ? room(state.sel) : null, room, kindOf, whenText, needsAttention, esc, fmt, fmtShort, stayText, dayDiff, addDays, TODAY, formHtml, detailHtml, menuHtml, visible: visible(), all: rooms(), pageSize: design.pageSize ?? 0 });

  // ---------- Operations (async, with optional latency and failure injection) ----------
  class ApiError extends Error {}
  async function write(fn) {
    await new Promise(r => setTimeout(r, cfg.latency));
    writes++;
    if (cfg.fail && writes % 3 === 0) throw new ApiError('The service is temporarily unavailable. Try again.');
    return fn();
  }
  function validate(type, v, id) {
    const e = {};
    if (type === 'checkin') {
      if (!v.guest.trim()) e.guest = 'Enter the guest name.'; else if (v.guest.trim().length > 100) e.guest = 'Guest name must be 100 characters or fewer.';
      if (v.dep && v.dep < TODAY) e.dep = 'Expected departure cannot be in the past.';
    } else {
      const l = v.label.trim();
      if (!l) e.label = 'Enter a room identifier.'; else if (l.length > 32) e.label = 'Use 32 characters or fewer.';
      else if (rooms().some(r => r.id !== id && r.label.toLowerCase() === l.toLowerCase())) e.label = 'That room identifier is already in use.';
    }
    return e;
  }

  // ---------- Shared markup helpers ----------
  const ico = { x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>', warn: '<path d="m10.3 3.9-8.4 14.6A2 2 0 0 0 3.6 21.5h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' };
  const svg = (p, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  function formHtml() {
    const f = state.form, rm = f.id ? room(f.id) : null, c = 'f-', v = f.values;
    const err = k => `<p class="f-error" id="e-${k}" role="alert" hidden></p>`;
    const status = t2 => `<option value="vacant" ${v.status === 'vacant' ? 'selected' : ''}>${t(t2)}</option><option value="oos" ${v.status === 'oos' ? 'selected' : ''}>${t('oos')}</option>`;
    const chips = [1, 2, 3, 7].map(n => `<button type="button" class="chip" data-act="chip:${n}" aria-pressed="${v.dep === addDays(TODAY, n)}">${n === 1 ? 'Tomorrow' : n === 7 ? 'A week' : n + ' nights'}</button>`).join('');
    const body = f.type === 'checkin'
      ? `<div class="f-field"><label for="f-name">Guest name <span class="req" aria-hidden="true">*</span></label><input id="f-name" name="guest" value="${esc(v.guest)}" maxlength="120" autocomplete="off" required aria-describedby="h-name e-guest" data-autofocus><span class="f-help" id="h-name">As it should appear on the stay.</span>${err('guest')}</div>
         <div class="f-field"><label for="f-dep">Expected departure <span class="opt-t">Optional</span></label><div class="chips" role="group" aria-label="Quick departure choices">${chips}</div><input id="f-dep" name="dep" type="date" value="${esc(v.dep)}" aria-describedby="h-dep e-dep"><span class="f-help" id="h-dep">Leave empty if the departure is not known yet.</span>${err('dep')}</div>
         <p class="f-sum" id="f-sum" aria-live="polite">${esc(stayText(v.dep))}</p>`
      : `<div class="f-field"><label for="f-label">Room identifier <span class="req" aria-hidden="true">*</span></label><input id="f-label" name="label" value="${esc(v.label)}" maxlength="40" autocomplete="off" required aria-describedby="e-label" data-autofocus>${err('label')}</div>
         <div class="f-field"><label for="f-status">Status</label><select id="f-status" name="status">${status('vacant')}</select></div>`;
    const submit = { checkin: 'Check in guest', add: 'Add room', edit: 'Save room' }[f.type];
    return `<form id="f" class="f" novalidate data-type="${f.type}"><div class="f-err" id="f-err" role="alert" hidden></div>${body}
      <div class="f-actions"><button type="button" class="btn btn-secondary" data-act="close">Cancel</button><button class="btn btn-primary" data-act="submit" type="submit" data-label="${submit}">${submit}</button></div></form>`;
  }
  function detailHtml(r) {
    const k = kindOf(r), canIn = r.status === 'vacant', canEdit = r.status !== 'occupied';
    const note = r.status === 'vacant' ? `<p class="d-note">${t('vacantNote')}</p>` : r.status === 'oos' ? '<p class="d-note">This room is out of service and cannot be checked in to.</p>' : k === 'overdue' ? `<p class="d-note bad">Past its expected departure by ${whenText(r).split(' ')[0]} day(s).</p>` : '';
    return `<dl class="d-list"><dt>Room</dt><dd>${esc(r.label)}</dd><dt>Status</dt><dd>${esc(t(k === 'overdue' || k === 'today' ? 'occupied' : k))}${k === 'overdue' || k === 'today' ? ' · ' + esc(t(k)) : ''}</dd>${r.guest ? `<dt>Guest</dt><dd>${esc(r.guest)}</dd><dt>Expected departure</dt><dd>${r.dep ? esc(fmt(r.dep)) + (whenText(r) !== fmt(r.dep) ? ' · ' + esc(whenText(r)) : '') : 'Not set'}</dd>` : ''}</dl>${note}
      <div class="d-actions">${canIn ? `<button class="btn btn-primary" data-act="open:checkin:${esc(r.id)}">Check in</button>` : ''}${canEdit ? `<button class="btn btn-secondary" data-act="open:edit:${esc(r.id)}">Edit room</button>` : ''}</div>`;
  }
  function menuHtml() { const items = Object.entries(props).map(([id, p]) => `<button type="button" role="menuitemradio" aria-checked="${state.prop === id}" class="lm-item" data-act="prop:${id}"><span>${esc(p.name)}</span>${state.prop === id ? '<span class="lm-tick">✓</span>' : ''}</button>`).join(''); return `<div class="lm" role="menu" aria-label="Property and account"><p class="lm-h">Property</p>${items}<hr class="lm-sep"><button type="button" role="menuitem" class="lm-item" data-act="signout">Sign out</button></div>`; }

  // ---------- Rendering ----------
  function listHtml(c) {
    if (state.loading) return design.skeleton ? design.skeleton(c) : '<div class="lab-skel" role="status" aria-label="Loading rooms">' + '<i></i>'.repeat(6) + '</div>';
    if (!c.visible.length) return design.empty ? design.empty(c) : `<div class="empty"><h2>${c.all.length ? 'No matching rooms' : 'No rooms yet'}</h2>${c.all.length ? '<button class="btn btn-secondary" data-act="clearfilters">Clear filters</button>' : '<p>Add a room to begin.</p>'}</div>`;
    let rs = c.visible;
    if (c.pageSize) { const pages = Math.max(1, Math.ceil(rs.length / c.pageSize)); state.page = Math.min(state.page, pages); rs = rs.slice((state.page - 1) * c.pageSize, state.page * c.pageSize); c.pages = pages; }
    return design.list ? design.list(rs, c) : rs.map(r => design.row(r, c)).join('');
  }
  function hostContent(c) {
    const f = state.form;
    if (f) { const title = { checkin: `Check in to ${room(f.id)?.label ?? ''}`, add: 'Add room', edit: `Edit room ${room(f.id)?.label ?? ''}` }[f.type]; return design.frame(title, formHtml(), c, 'form'); }
    if (c.sel) return design.frame(`Room ${c.sel.label}`, detailHtml(c.sel), c, 'detail');
    return design.idle ? design.idle(c) : '';
  }
  function draw(light) {
    const c = ctx();
    if (light) { $('#notice') && ($('#notice').innerHTML = state.notice ? design.notice(state.notice, c) : ''); document.querySelectorAll('.flash').forEach(e => { if (!state.flash) e.classList.remove('flash'); }); return; }
    $('#filters') && ($('#filters').innerHTML = design.filters.map(f => design.filterBtn(f, state.filter === f, c.counts[f], c)).join(''));
    const fk = document.activeElement?.closest?.('#list [data-act]')?.dataset.act;
    $('#list').innerHTML = listHtml(c);
    if (fk && (document.activeElement === document.body || !document.activeElement)) document.querySelector(`#list [data-act="${CSS.escape(fk)}"]`)?.focus({ preventScroll: true });
    if ($('#count')) $('#count').textContent = `${c.visible.length} of ${c.all.length} rooms shown`;
    $('#notice') && ($('#notice').innerHTML = state.notice ? design.notice(state.notice, c) : '');
    if ($('#menu')) { $('#menu').innerHTML = state.menu ? design.menu(c) : ''; $('#menu').hidden = !state.menu; document.querySelectorAll('[data-act="menu"]').forEach(b => b.setAttribute('aria-expanded', state.menu)); }
    design.after?.(c);
    syncHost(c);
  }
  let hostOpen = false, hostKey = '', nonce = 0;
  function syncHost(c) {
    const h = $('#host'); if (!h || design.mode === 'row') return;
    const want = !!(state.form || c.sel) || design.mode === 'inline';
    const prevKey = hostKey;
    const key = state.form ? `f:${state.form.type}:${state.form.id}:${state.form.nonce}` : c.sel ? 's:' + JSON.stringify(c.sel) : design.mode === 'inline' ? 'idle' : '';
    if (want && key !== hostKey) { h.innerHTML = hostContent(c); hostKey = key; }
    if (design.mode === 'inline') { h.classList.toggle('has-sel', !!(state.form || c.sel)); if (state.form && key !== prevKey) focusIn(h); return; }
    if (want && !hostOpen) {
      hostOpen = true; h.hidden = false; h.classList.remove('closing');
      if (h.tagName === 'DIALOG' && !h.open) h.showModal();
      if (design.mode === 'popover') place(h);
      requestAnimationFrame(() => { if (!hostOpen) return; /* closed or reset before this frame: never re-add the scrim */ h.classList.add('open'); document.body.classList.add('host-open'); focusIn(h); });
      sampleFrames('open-' + design.mode);
    } else if (want) { place(h); if (!h.contains(document.activeElement)) focusIn(h); }
    else if (!want && hostOpen) closeHost(h);
  }
  const trig = () => lastTrigger?.isConnected ? lastTrigger : (lastKey ? document.querySelector(`[data-act="${CSS.escape(lastKey)}"]`) : null);
  function place(h) { const tr = trig(); if (design.mode !== 'popover' || !tr) return; const a = tr.getBoundingClientRect(), W = innerWidth; if (W <= 640) return; const w = Math.min(380, W - 24); const left = Math.max(12, Math.min(a.left + a.width / 2 - w / 2, W - w - 12)); const hh = h.offsetHeight; let top = a.bottom + 10, up = false; if (top + hh > innerHeight - 12) { top = a.top - hh - 10; up = true; } if (top < 12) { top = Math.max(12, innerHeight - hh - 12); up = false; } h.style.setProperty('--px', left + 'px'); h.style.setProperty('--py', top + 'px'); h.style.setProperty('--oy', up ? '100%' : '0'); h.style.setProperty('--ox', (a.left + a.width / 2 - left) + 'px'); }
  function focusIn(h) { (h.querySelector('[data-autofocus]') ?? h.querySelector('input,select,button:not([data-act="close"]),[data-act="close"]'))?.focus({ preventScroll: true }); }
  function closeHost(h) {
    hostOpen = false; hostKey = ''; h.classList.remove('open'); h.classList.add('closing'); document.body.classList.remove('host-open');
    sampleFrames('close-' + design.mode);
    const done = () => { if (hostOpen) return; h.classList.remove('closing'); if (h.tagName === 'DIALOG') h.close(); else h.hidden = true; h.innerHTML = ''; trig()?.focus({ preventScroll: true }); };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(done, reduced ? 0 : (design.closeMs ?? 180));
    trig()?.focus({ preventScroll: true });
  }

  // ---------- Actions ----------
  const dialogOnly = () => (design.mode === 'modal' || design.mode === 'panel' || design.mode === 'popover');
  function notify(kind, text, id) {
    state.notice = { kind, text, id }; clearTimeout(noticeTimer);
    if (kind === 'success') noticeTimer = setTimeout(() => { state.notice = null; draw(true); }, 5000);
    if (id) { state.flash = id; clearTimeout(flashTimer); flashTimer = setTimeout(() => { state.flash = null; draw(true); }, 1800); }
  }
  function setErr(k, msg) {
    const el = $('#e-' + k), input = $(k === 'guest' ? '#f-name' : k === 'dep' ? '#f-dep' : '#f-label');
    if (!el) return; el.hidden = !msg; el.textContent = msg || '';
    input?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function readForm() { const f = $('#f'); const v = state.form.values; if (!f) return v; for (const el of f.elements) if (el.name) v[el.name] = el.value; return v; }
  async function submit() {
    const f = state.form; if (!f || f.pending) return; const v = readForm(), id = f.id;
    const errs = validate(f.type, v, id);
    ['guest', 'dep', 'label'].forEach(k => setErr(k, errs[k]));
    const summary = $('#f-err'); if (summary) { summary.hidden = true; }
    const first = Object.keys(errs)[0];
    if (first) { $(first === 'guest' ? '#f-name' : first === 'dep' ? '#f-dep' : '#f-label')?.focus(); lab.marks.lastValidation = Object.values(errs); return; }
    f.pending = true; const btn = $('[data-act="submit"]'); if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = f.type === 'checkin' ? 'Checking in…' : 'Saving…'; }
    const t0 = performance.now();
    try {
      let msg, target = id;
      await write(() => {
        if (f.type === 'checkin') { const r = room(id); if (!r || r.status !== 'vacant') throw new ApiError('That room is no longer available.'); r.status = 'occupied'; r.guest = v.guest.trim(); r.dep = v.dep || undefined; msg = `Guest checked into ${r.label}.`; }
        else if (f.type === 'add') { const label = v.label.trim(); const r = { id: label, label, status: v.status }; rooms().push(r); target = r.id; msg = `Room ${label} added.`; }
        else { const r = room(id); const label = v.label.trim(); r.label = label; r.status = v.status; msg = `Room ${label} updated.`; }
      });
      lab.metrics.push({ act: 'write-' + f.type, ms: performance.now() - t0 });
      const from = f.from; state.form = null; if (from === 'row' || f.type === 'add') state.sel = null; notify('success', msg, target); draw();
    } catch (e) {
      f.pending = false; if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btn.dataset.label; }
      const s = $('#f-err'); if (s) { s.hidden = false; s.innerHTML = `${esc(e.message)} <button type="button" class="linklike" data-act="submit">Retry</button>`; }
      lab.errors.push(e.message);
    }
  }
  function act(name, arg, ev) {
    const [a, b, c] = [name, ...String(arg ?? '').split(':')].slice(0, 3);
    if (!['close', 'submit', 'chip', 'dismiss'].includes(name)) { lastTrigger = ev?.target?.closest?.('[data-act]') ?? lastTrigger; lastKey = lastTrigger?.dataset?.act ?? lastKey; }
    switch (name) {
      case 'filter': state.filter = arg; state.page = 1; state.sel = dialogOnly() && design.mode !== 'inline' ? state.sel : state.sel; draw(); break;
      case 'select': { const id = arg; if (state.sel === id && design.toggleSelect) state.sel = null; else state.sel = id; state.form = null; draw(); break; }
      case 'open': { const [type, id] = arg.split(':'); const r = id ? room(id) : null; state.form = { type, id, nonce: ++nonce, from: state.sel ? 'detail' : 'row', values: type === 'checkin' ? { guest: '', dep: '' } : { label: type === 'edit' ? r.label : '', status: type === 'edit' ? r.status : 'vacant' } }; if ((design.mode === 'row' || design.selectOnOpen) && id) state.sel = id; draw(); break; }
      case 'close': { if (design.mode === 'inline' || design.mode === 'row') requestAnimationFrame(() => trig()?.focus({ preventScroll: true })); const f = state.form; if (f) { state.form = null; if (f.from === 'row' || f.type === 'add') state.sel = f.from === 'row' ? null : state.sel; } else state.sel = null; draw(); break; }
      case 'submit': submit(); break;
      case 'chip': { const d = addDays(TODAY, Number(arg)); const i = $('#f-dep'); if (i) { i.value = d; state.form.values.dep = d; setErr('dep', ''); $('#f-sum').textContent = stayText(d); document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.act === 'chip:' + arg)); } break; }
      case 'menu': state.menu = !state.menu; draw(); if (state.menu) { sampleFrames('menu'); $('#menu [role^=menuitem]')?.focus(); } break;
      case 'prop': state.prop = arg; state.sel = null; state.form = null; state.menu = false; state.filter = 'all'; state.q = ''; if ($('#q')) $('#q').value = ''; notify('success', `Switched to ${props[arg].name}.`); draw(); break;
      case 'signout': state.menu = false; notify('success', 'Demo only: signing out is disabled in the Design Lab.'); draw(); break;
      case 'dismiss': state.notice = null; draw(); break;
      case 'clearfilters': state.filter = 'all'; state.q = ''; if ($('#q')) $('#q').value = ''; draw(); break;
      case 'sort': state.sort = { k: arg, dir: state.sort.k === arg ? -state.sort.dir : 1 }; draw(); break;
      case 'page': state.page = Number(arg); draw(); break;
      case 'noop': break;
    }
  }

  // ---------- Events ----------
  function onAct(e) {
    const el = e.target.closest('[data-act]'); if (!el || el.closest('[inert]')) return;
    if (el.tagName === 'FORM') return;
    const t0 = e.timeStamp || performance.now(); const [name, ...rest] = el.dataset.act.split(':');
    if (e.target.closest('#menu') === null && state.menu && name !== 'menu') { state.menu = false; }
    act(name, rest.join(':'), e);
    after(name, t0);
  }
  function after(name, t0) { requestAnimationFrame(() => requestAnimationFrame(() => lab.metrics.push({ act: name, ms: +(performance.now() - t0).toFixed(1) }))); }
  document.addEventListener('click', e => { if (e.isTrusted) lab.clicks++; if (e.target.closest('dialog') === e.target && e.target.id === 'host') { act('close', '', e); return; } onAct(e); if (state.menu && !e.target.closest('#menu,[data-act="menu"]')) { state.menu = false; draw(); } });
  document.addEventListener('submit', e => { e.preventDefault(); submit(); });
  document.addEventListener('change', e => { if (e.target.id === 'vsel') lab.clicks++; });
  document.addEventListener('input', e => {
    const t0 = e.timeStamp;
    if (e.target.id === 'q') { state.q = e.target.value; state.page = 1; draw(); after('search', t0); }
    else if (state.form && e.target.closest('#f')) { readForm(); if (e.target.id === 'f-dep') { $('#f-sum').textContent = stayText(state.form.values.dep); document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', false)); } }
  });
  document.addEventListener('focusout', e => { if (state.form && e.target.closest?.('#f') && e.target.name && e.relatedTarget && !e.relatedTarget.closest?.('[data-act="close"]')) { const v = readForm(); const errs = validate(state.form.type, v, state.form.id); const k = e.target.name; setErr(k, errs[k]); } });
  document.addEventListener('keydown', e => {
    if (e.isTrusted) lab.keys++;
    const inField = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === 'Escape') { if (state.menu) { state.menu = false; draw(); lastTrigger?.focus(); } else if ((state.form && !state.form.pending) || (state.sel && ((design.mode !== 'inline' && design.mode !== 'row') || design.escapeClears))) { act('close', '', e); after('close-key', e.timeStamp); } else if (state.sel && design.mode === 'row') { state.sel = null; state.form = null; draw(); } return; }
    if (e.key === '/' && !inField) { e.preventDefault(); $('#q')?.focus(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-act]:not(button):not(a):not(input):not(select)')) { e.preventDefault(); onAct(e); return; }
    if (['ArrowDown', 'ArrowUp'].includes(e.key) && e.target.closest?.('[data-room]')) { const all = [...document.querySelectorAll('#list [data-room]')]; const i = all.indexOf(e.target.closest('[data-room]')); const n = all[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (n) { e.preventDefault(); n.focus(); } return; }
    if (e.key === 'Tab' && hostOpen && (design.mode === 'panel' || design.mode === 'popover')) { const h = $('#host'); const f = [...h.querySelectorAll('input,select,button,[href],[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent); if (f.length) { const first = f[0], last = f.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } else if (!h.contains(document.activeElement)) { e.preventDefault(); first.focus(); } } }
    if (state.menu && ['ArrowDown', 'ArrowUp'].includes(e.key)) { const items = [...document.querySelectorAll('#menu [role^=menuitem]')]; const i = items.indexOf(document.activeElement); e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
  });
  addEventListener('resize', () => { if (hostOpen) place($('#host')); });

  // ---------- Instrumentation ----------
  function sampleFrames(ev) { const ts = []; const start = performance.now(); const tick = n => { ts.push(n); if (n - start < 700) requestAnimationFrame(tick); else { const d = ts.slice(1).map((x, i) => x - ts[i]); const s = [...d].sort((a, b) => a - b); lab.frames.push({ ev, n: d.length, max: +Math.max(0, ...d).toFixed(1), p95: +(s[Math.floor(s.length * .95)] ?? 0).toFixed(1), over33: d.filter(x => x > 33.4).length, over50: d.filter(x => x > 50).length }); } }; requestAnimationFrame(tick); }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) lab.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { }
  try { new PerformanceObserver(l => { lab.longTasks += l.getEntries().length; }).observe({ type: 'longtask', buffered: true }); } catch { }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') lab.marks.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch { }
  addEventListener('error', e => lab.errors.push(String(e.message)));

  // ---------- Start ----------
  document.title = `${design.name} · Stayflow Design Lab`;
  if (design.css) { const s = document.createElement('style'); s.id = 'design-css'; s.textContent = design.css; document.head.append(s); }
  for (const href of design.links ?? []) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l); }
  reset();
  const app = document.getElementById('app'); app.dataset.design = design.id;
  const first = ctx(); app.innerHTML = design.layout(first);
  state.loading = cfg.latency > 0; draw(); lab.marks.firstDraw = performance.now();
  if (state.loading) setTimeout(() => { state.loading = false; draw(); lab.marks.ready = performance.now(); }, cfg.latency); else lab.marks.ready = performance.now();
  lab.reset = () => { reset(); hostOpen = false; hostKey = ''; const h = $('#host'); if (h) { h.hidden = design.mode !== 'inline'; if (h.tagName === 'DIALOG' && h.open) h.close(); h.innerHTML = ''; h.classList.remove('open'); } $('#q') && ($('#q').value = ''); document.body.classList.remove('host-open'); draw(); };
  lab.state = () => ({ ...state, counts: counts() });
  window.parent !== window && window.parent.postMessage({ type: 'lab-ready', design: design.id }, '*');
  document.documentElement.dataset.ready = '1';
}
