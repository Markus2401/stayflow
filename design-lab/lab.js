// Design Lab shell: switching, device modes, data and network conditions, owner tasks, ratings and comparison. Loopback only.
const DESIGNS = [
  ['glass', 'Stayflow light (revision)', 'approved direction, light-first', 'Light-first revision of the approved Liquid Glass × Linear direction: white workspace, slim chrome, floating inspector.'],
  ['glass-620dc89', 'Baseline 620dc89', 'approved baseline (D060)', 'The approved Liquid Glass × Linear candidate, frozen at commit 620dc89 for comparison.'],
  ['stayflow', 'Stayflow candidate', 'stayflow-design', 'PROVISIONAL synthesis: pine top bar, stay line, persistent inspector, native sheet on phones.'],
  ['ledger', 'Ledger', 'Real app styles', 'The current working app: warm paper, pine accent, table, dialog.'],
  ['apple', 'Apple Design', 'apple-design', 'Inset grouped list, translucent toolbar, sheets.'],
  ['impeccable', 'Impeccable', 'impeccable-shape', 'Night rail, Today briefing, week-rail table, drawer.'],
  ['uxpro', 'UI UX Pro Max', 'ui-ux-pro-max', 'Sidebar, triage groups, inline inspector, mobile detail screen.'],
  ['emil', 'Emil Eng.', 'emil-design-eng', 'Monochrome, tactile; origin-aware popover, sliding tabs, no motion on keyboard.'],
  ['frontend', 'Frontend UI', 'frontend-ui-engineering', 'Sortable, paginated table; explicit states; dialog; toasts.'],
  ['unslop', 'Unslop', 'unslop', 'Type-led, no cards or pills; details and forms expand in the row.']];
const DEV = { desktop: [1280, 800], tablet: [820, 1100], mobile: [390, 800] };
const CATS = [['ux', 'User experience and navigation', 25], ['visual', 'Visual design (brand, type, colour, hierarchy)', 20], ['motion', 'Animations and micro-interactions', 20], ['perf', 'Performance and smoothness', 15], ['resp', 'Responsiveness', 10], ['a11y', 'Accessibility', 10]];
const COMPS = [['header', 'Header and navigation'], ['filters', 'Filters'], ['list', 'Room list'], ['detail', 'Room details'], ['form', 'Check-in form'], ['notice', 'Success notice']];
const TASKS = [
  ['t1', 'Search for "Daniel" and open that room\'s details.'],
  ['t2', 'Show only available rooms, then check "Test Guest" into one, leaving in 3 nights (use the quick choice or the date field).'],
  ['t3', 'Try to check in with no guest name, then with a departure date in the past. Do the messages help?'],
  ['t4', 'Add a room called "B1", then edit it to Out of service.'],
  ['t5', 'Open the property menu, switch to Hillview Annex, then back to Hillview Guesthouse.'],
  ['t6', 'Switch Device to Mobile 390 and repeat task 2. Note any tap that was hard to hit.'],
  ['t7', 'Set Network to "Slow", then to "Flaky", and check a guest in. Is progress and failure clear?'],
  ['t8', 'Set Data to "Large" and scroll or page through the rooms. Does it stay quick?'],
  ['t9', 'Use only the keyboard: Tab to a room, open it, fill the form, submit, and close with Escape.']];
const $ = s => document.querySelector(s), K = 'stayflow-design-lab-v1';
const st = { design: localStorage.getItem(K + ':d') || 'glass', dev: 'desktop', size: 'standard', net: '0', tab: 'tasks', cmp: false, other: 'apple', comp: 'list' };
const db = JSON.parse(localStorage.getItem(K) || '{}'); const save = () => localStorage.setItem(K, JSON.stringify(db));
const mine = id => db[id] ??= { rate: {}, tasks: {}, times: {}, comp: {}, notes: '' };
let results = null, assessor = null, timer = null;
const j = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);

function url(d) { const p = new URLSearchParams({ design: d, size: st.size === 'stress' ? 'standard' : st.size }); if (st.size === 'stress') p.set('stress', '1'); if (st.net === '700') p.set('latency', '700'); if (st.net === 'flaky') { p.set('latency', '400'); p.set('fail', '1'); } return 'frame.html?' + p; }
function mount() {
  const v = $('#view'); v.innerHTML = ''; const ids = st.cmp ? [st.design, st.other] : [st.design]; const [w, h] = DEV[st.dev];
  const avail = v.clientWidth - 32, per = ids.length, scale = Math.min(1, (avail - (per - 1) * 16) / per / w);
  for (const id of ids) {
    const wrap = document.createElement('div'); wrap.className = 'fw'; const name = DESIGNS.find(x => x[0] === id)[1];
    wrap.innerHTML = `<span class="fl">${name} · ${w}×${h}${scale < 1 ? ` · scaled ${Math.round(scale * 100)}%` : ''}</span><div class="frame" style="width:${w * scale}px;height:${h * scale}px"><iframe title="${name} preview" src="${url(id)}" data-id="${id}" style="width:${w}px;height:${h}px;transform:scale(${scale})"></iframe></div>`;
    v.append(wrap);
  }
  $('#newtab').href = url(st.design);
}
function nav() {
  $('#designs').innerHTML = DESIGNS.map(([id, n, s]) => `<button data-d="${id}" aria-pressed="${st.design === id}" title="${s}">${n}<small>${s}</small></button>`).join('');
}
function frames() { return [...document.querySelectorAll('#view iframe')]; }
function livePoll() {
  clearInterval(timer); timer = setInterval(() => { const f = frames()[0]; const L = f?.contentWindow?.__lab; if (!L) return; const last = L.metrics.at(-1), fr = L.frames.at(-1);
    $('#live').textContent = `clicks ${L.clicks} · keys ${L.keys} · last ${last ? last.act + ' ' + Math.round(last.ms) + ' ms' : '–'} · CLS ${L.cls.toFixed(3)}${fr ? ` · ${fr.ev} worst frame ${fr.max} ms` : ''}`; }, 700);
}

// ---------- Panels ----------
const stars = (cur, attr) => [1, 2, 3, 4, 5].map(n => `<button type="button" data-${attr} data-n="${n}" aria-pressed="${cur === n}" aria-label="${n} of 5">${n}</button>`).join('');
const weighted = r => { const v = CATS.filter(([k]) => r[k]); if (!v.length) return null; const w = v.reduce((a, [, , x]) => a + x, 0); return v.reduce((a, [k, , x]) => a + r[k] * x, 0) / w / 5 * 100; };
function panel() {
  const p = $('#panel'), d = st.design, m = mine(d), name = DESIGNS.find(x => x[0] === d)[1];
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === st.tab));
  if (st.tab === 'tasks') {
    p.innerHTML = `<h2>Guided tasks · ${name}</h2><p class="m">Do each task in this design, tick it, and use Start/Stop to record your own time. Your times are saved in this browser only and are human measurements, unlike the automated benchmark.</p>` +
      TASKS.map(([id, t]) => `<div class="card task"><input type="checkbox" id="c-${id}" data-task="${id}" ${m.tasks[id] ? 'checked' : ''}><label for="c-${id}">${t}</label><span><button data-time="${id}">${running === d + id ? 'Stop' : 'Start'}</button></span><small class="tm">Your time: ${m.times[id] ? m.times[id] + ' s' : '–'}</small></div>`).join('');
  } else if (st.tab === 'rate') {
    const sc = weighted(m.rate);
    p.innerHTML = `<h2>Rate · ${name}</h2><p class="m">1 = poor, 5 = excellent. These are your subjective ratings; the weighted score uses the assignment's weights.</p>` + CATS.map(([k, l, w]) => `<div class="rate"><label>${l} <span class="w">${w}%</span></label><div class="stars" data-cat="${k}">${stars(m.rate[k], 'rt')}</div></div>`).join('') +
      `<div class="score">${sc === null ? 'No score yet' : sc.toFixed(0) + ' / 100'}</div><label>Notes<textarea id="notes" placeholder="What felt good or bad?">${m.notes}</textarea></label><p class="m"><button id="exp" style="padding:5px 10px">Copy all my ratings as Markdown</button></p>`;
  } else if (st.tab === 'parts') {
    const c = st.comp; p.innerHTML = `<h2>Components</h2><p class="m">Compare one component across all designs and rate or star the best versions. Images are real captures from the live designs (desktop, standard data).</p><div class="sub">${COMPS.map(([k, l]) => `<button data-comp="${k}" aria-pressed="${c === k}">${l}</button>`).join('')}</div><div class="gal">${DESIGNS.map(([id, n]) => { const r = mine(id).comp[c]; return `<figure><figcaption><b>${n}</b><span class="stars" data-cc="${id}">${stars(r, 'cr')}</span></figcaption><img src="gallery/components/${id}-${c}.png" alt="${n} ${c}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'m',textContent:'Not captured for this design'}))"></figure>`; }).join('')}</div>`;
  } else if (st.tab === 'scores') {
    const rows = DESIGNS.map(([id, n]) => { const o = weighted(mine(id).rate), a = assessor?.[id]?.total; const b = results?.[id]; return `<tr><td>${n}</td><td>${o === null ? '–' : o.toFixed(0)}</td><td>${a ?? '–'}</td><td>${b ? b.summary.checkInMs + ' ms' : '–'}</td><td>${b ? b.summary.clicksCheckIn : '–'}</td><td>${b ? b.summary.worstFrame + ' ms' : '–'}</td></tr>`; }).join('');
    p.innerHTML = `<h2>Scoreboard</h2><p class="m">Owner = your weighted rating (subjective). Assessor = my rating from the report (subjective, partly informed by measurements). The last three columns are automated measurements (headless Chromium on this machine, not human or physical-device timing).</p><table><tr><th>Design</th><th>You /100</th><th>Assessor /100</th><th>Check-in</th><th>Clicks</th><th>Worst frame</th></tr>${rows}</table><p class="m">Full matrix, quality results and recommended components: DESIGN_BENCHMARK_REPORT.md.</p>`;
  } else {
    const mo = results?.[d]?.motion;
    p.innerHTML = `<h2>Motion · ${name}</h2><video controls preload="none" src="gallery/video/${d}.webm" aria-label="Recording of the check-in task"></video><p class="m">Short recording of the scripted check-in task (headless Chromium).</p>${mo ? `<div class="card"><b>Observed animations and transitions</b><br>${mo.map(x => `<span class="tag">${x}</span>`).join(' ')}</div>` : '<p class="m">Run the benchmark to see the motion inventory.</p>'}`;
  }
}
let running = null, t0 = 0;
function onPanel(e) {
  const d = st.design, m = mine(d);
  const t = e.target.closest('button,input'); if (!t) return;
  if (t.dataset.task) { m.tasks[t.dataset.task] = t.checked; save(); }
  else if (t.dataset.time) { const id = t.dataset.time; if (running === d + id) { m.times[id] = ((performance.now() - t0) / 1000).toFixed(1); running = null; } else { running = d + id; t0 = performance.now(); } save(); panel(); }
  else if ('rt' in t.dataset) { m.rate[t.parentElement.dataset.cat] = +t.dataset.n; save(); panel(); }
  else if ('cr' in t.dataset) { mine(t.parentElement.dataset.cc).comp[st.comp] = +t.dataset.n; save(); panel(); }
  else if (t.dataset.comp) { st.comp = t.dataset.comp; panel(); }
  else if (t.id === 'exp') { const md = DESIGNS.map(([id, n]) => { const x = mine(id), s = weighted(x.rate); return `### ${n}\nScore: ${s === null ? '–' : s.toFixed(0)}/100 · ` + CATS.map(([k, l]) => `${l}: ${x.rate[k] ?? '–'}`).join(' · ') + `\nTask times (s): ${TASKS.map(([i]) => i + '=' + (x.times[i] ?? '–')).join(', ')}\nComponent ratings: ${COMPS.map(([k]) => k + '=' + (x.comp[k] ?? '–')).join(', ')}\nNotes: ${x.notes || '–'}\n`; }).join('\n'); navigator.clipboard?.writeText(md); t.textContent = 'Copied'; }
}

// ---------- Wiring ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.d) { st.design = b.dataset.d; if (st.cmp && st.other === st.design) { st.other = DESIGNS.find(x => x[0] !== st.design)[0]; $('#other').value = st.other; } localStorage.setItem(K + ':d', st.design); $('#other').innerHTML = DESIGNS.map(([id, n]) => `<option value="${id}">${n}</option>`).join(''); $('#other').value = st.other; $('#other').onchange = e => { st.other = e.target.value; mount(); };
nav(); mount(); panel(); livePoll(); }
  else if (b.dataset.dev) { st.dev = b.dataset.dev; document.querySelectorAll('[data-dev]').forEach(x => x.setAttribute('aria-pressed', x === b)); mount(); }
  else if (b.dataset.t) { st.tab = b.dataset.t; panel(); }
  else if (b.id === 'reset') frames().forEach(f => f.contentWindow.__lab?.reset());
  else if (b.id === 'full') frames()[0]?.requestFullscreen?.();
  else if (b.id === 'cmp') { st.cmp = !st.cmp; $('#otherwrap').hidden = !st.cmp; if (st.cmp && st.other === st.design) st.other = DESIGNS.find(x => x[0] !== st.design)[0]; b.setAttribute('aria-pressed', st.cmp); b.textContent = st.cmp ? 'Single design' : 'Compare two designs'; mount(); }
});
$('#panel').addEventListener('click', onPanel); $('#panel').addEventListener('change', onPanel);
$('#panel').addEventListener('input', e => { if (e.target.id === 'notes') { mine(st.design).notes = e.target.value; save(); } });
$('#size').onchange = e => { st.size = e.target.value; mount(); }; $('#net').onchange = e => { st.net = e.target.value; mount(); };
document.addEventListener('fullscreenchange', () => { const f = frames()[0]; if (!f) return; if (document.fullscreenElement === f) { f.style.cssText = 'width:100vw;height:100vh;border:0'; } else mount(); });
addEventListener('resize', () => mount());
nav(); mount(); panel(); livePoll();
j('results/benchmark.json').then(r => { results = r; panel(); }); j('results/assessor.json').then(r => { assessor = r; panel(); });
