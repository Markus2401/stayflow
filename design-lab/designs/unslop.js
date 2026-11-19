// Design 7: Unslop. Built by applying the signs-of-slop checklist: no cards, pills, gradients, glows, uppercase labels or icons-as-decoration;
// weights 400 and 500; one accent used once; sentence case; plain "Search"; hairlines; one row height; details and forms expand inside the row.
export default {
  id: 'unslop', name: 'Unslop', mode: 'row', filters: ['all', 'vacant', 'occupied', 'oos'], closeMs: 0,
  labels: { vacant: 'Available' },
  css: `@font-face{font-family:"Source Sans 3";src:url("/fonts/source-sans-3.ttf");font-weight:200 900}
:root{--bg:#fff;--text:#161616;--text2:#595959;--text3:#767676;--hair:rgb(0 0 0 / .1);--hair2:rgb(0 0 0 / .45);--accent:#b3261e;font:16px/1.5 "Source Sans 3",system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}body{margin:0}h1,h2,p,dl,dd{margin:0;font-weight:500}button,input,select{font:inherit;color:inherit}button{cursor:pointer;border:0;background:none;padding:0}:focus-visible{outline:2px solid var(--text);outline-offset:2px}
.wrap{max-width:760px;margin:0 auto;padding:0 20px 96px}.top{display:flex;align-items:baseline;gap:16px;padding:20px 0;border-bottom:1px solid var(--hair)}.brand{font-weight:500;font-size:18px}.top button{color:var(--text2);text-decoration:underline;text-underline-offset:3px;min-height:44px}.top .r{margin-left:auto}
h1{font-size:32px;line-height:1.2;font-weight:500;margin-top:32px}.sub{color:var(--text2);margin-top:4px;font-variant-numeric:tabular-nums}
.bar{display:flex;gap:24px;align-items:baseline;flex-wrap:wrap;margin:24px 0 8px}.filters{display:flex;gap:20px}.filters button{min-height:44px;color:var(--text2);border-bottom:2px solid transparent}.filters button[aria-pressed=true]{color:var(--text);border-bottom-color:var(--text);font-weight:500}.filters b{font-weight:400;color:var(--text3);margin-left:6px;font-variant-numeric:tabular-nums}
.search{margin-left:auto}.search input{width:200px;height:44px;border:0;border-bottom:1px solid var(--hair2);border-radius:0;background:none;padding:0}.search input:focus-visible{outline:0;border-bottom:2px solid var(--text)}
.add{min-height:44px;text-decoration:underline;text-underline-offset:3px;font-weight:500}
.item{border-bottom:1px solid var(--hair)}.line{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:16px;align-items:center;min-height:56px;cursor:pointer}.line:hover{background:rgb(0 0 0 / .025)}.rl{font-weight:500;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.who{overflow-wrap:anywhere}.who span{color:var(--text2)}.when{color:var(--text2);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.over .when,.over .who b{color:var(--accent)}.who b{font-weight:500}.flash{animation:fl 1.4s}@keyframes fl{from{background:rgb(0 0 0 / .06)}}
.open{padding:0 0 20px 88px;animation:in 160ms cubic-bezier(.23,1,.32,1)}@keyframes in{from{opacity:0;translate:0 -4px}}
.d-list{display:grid;grid-template-columns:140px 1fr;gap:6px 12px;margin:4px 0 12px}.d-list dt{color:var(--text2)}.d-list dd{font-weight:500}.d-note{margin:0 0 12px;color:var(--text2)}.d-actions,.f-actions{display:flex;gap:16px;align-items:center}
.btn{min-height:44px;padding:0 16px;border-radius:6px;font-weight:500;white-space:nowrap}.btn-primary{background:var(--text);color:#fff}.btn-secondary{border:1px solid var(--hair2)}.btn[disabled]{opacity:.55;cursor:progress}
.f{display:grid;gap:16px;max-width:420px}.f-field{display:grid;gap:4px}.f-field label{font-weight:500}.f-field input,.f-field select{height:44px;border:1px solid var(--hair2);border-radius:6px;padding:0 12px;background:#fff;width:100%}.f-field input[aria-invalid=true]{border-color:var(--accent)}.f-help,.opt-t{color:var(--text2);font-size:14px;font-weight:400}.req{color:var(--accent)}.f-error,.f-err{margin:0;color:var(--accent);font-size:14px}
.chips{display:flex;flex-wrap:wrap;gap:8px 16px}.chip{min-height:44px;text-decoration:underline;text-underline-offset:3px;color:var(--text2)}.chip[aria-pressed=true]{color:var(--text);font-weight:500;text-decoration-thickness:2px}.f-sum{margin:0;color:var(--text2)}
.notice{margin:16px 0 0;padding:12px 0;border-top:1px solid var(--text);border-bottom:1px solid var(--hair);display:flex;gap:16px}.notice button{margin-left:auto;text-decoration:underline;min-height:44px}.notice.err{color:var(--accent);border-top-color:var(--accent)}
.lm{position:absolute;z-index:9;min-width:240px;background:#fff;border:1px solid var(--hair2);border-radius:6px;padding:4px}.lm-h{margin:6px 10px;color:var(--text3);font-size:14px}.lm-item{display:flex;justify-content:space-between;width:100%;min-height:44px;align-items:center;padding:0 10px;text-align:left}.lm-item:hover,.lm-item:focus-visible{background:rgb(0 0 0 / .05)}.lm-sep{border:0;border-top:1px solid var(--hair);margin:4px 0}#menu{position:fixed;top:60px;left:calc(50% - 360px);z-index:9}
.empty{padding:48px 0;color:var(--text2)}.empty h2{color:var(--text)}.empty .btn{margin-top:12px}.addbox{padding:16px 0 20px;border-bottom:1px solid var(--hair)}.foot{margin-top:32px;color:var(--text3);font-size:14px}
@media(max-width:40em){.wrap{padding:0 14px 80px}.line{grid-template-columns:56px minmax(0,1fr);row-gap:0;padding:8px 0}.when{grid-column:2;text-align:left}.open{padding-left:0}.search{margin:0;flex:1 1 100%}.search input{width:100%}#menu{left:14px}.bar{gap:8px}.filters{gap:12px;overflow:auto;max-width:100%}}
@media(prefers-reduced-motion:reduce){.open,.flash{animation:none}}`,
  layout: c => `<div class="wrap"><div class="top" data-c="header"><span class="brand">stayflow</span><button type="button" data-act="menu" aria-haspopup="menu" aria-expanded="false"><span id="propname">${c.prop.name}</span></button><button type="button" class="r" data-act="signout">Sign out</button></div><div id="menu" hidden></div>
<h1>Rooms</h1><p class="sub" id="sub"></p><div id="notice" role="status"></div>
<div class="bar"><div class="filters" id="filters" role="group" aria-label="Filter rooms by status" data-c="filters"></div><label class="search"><span class="sr-only">Search rooms and guests</span><input id="q" type="search" placeholder="Search" autocomplete="off"></label><button class="add" type="button" data-act="open:add">Add room</button></div>
<section id="list" aria-label="Room register" data-c="list"></section><p class="foot">Local demo, synthetic data only</p><p class="sr-only" role="status" id="count"></p></div>`,
  filterBtn: (f, on, n, c) => `<button type="button" data-act="filter:${f}" aria-pressed="${on}">${c.t(f)}<b>${n}</b></button>`,
  list: (rs, c) => { const e = c.esc, f = c.state.form;
    const addBox = f && f.type === 'add' ? `<div class="addbox open"><h2>Add room</h2>${c.formHtml()}</div>` : '';
    return addBox + rs.map(r => { const k = c.kindOf(r), st = { vacant: 'Available', occupied: 'Occupied', today: 'Occupied, leaves today', overdue: 'Occupied, overdue', oos: 'Out of service' }[k];
      const expanded = (f && f.id === r.id && f.type !== 'add') ? `<div class="open"><h2>${f.type === 'checkin' ? 'Check in to ' + e(r.label) : 'Edit room ' + e(r.label)}</h2>${c.formHtml()}</div>` : (c.state.sel === r.id && !f) ? `<div class="open">${c.detailHtml(r)}</div>` : '';
      return `<div class="item${k === 'overdue' ? ' over' : ''}"><div class="line${c.state.flash === r.id ? ' flash' : ''}" role="button" tabindex="0" data-room="${e(r.id)}" data-act="select:${e(r.id)}" aria-expanded="${c.state.sel === r.id}"><span class="rl">${e(r.label)}</span><span class="who"><b>${st}</b>${r.guest ? `<span> · ${e(r.guest)}</span>` : ''}</span><span class="when">${c.whenText(r)}</span></div>${expanded}</div>`; }).join(''); },
  notice: (n, c) => `<p class="notice${n.kind === 'error' ? ' err' : ''}" role="${n.kind === 'error' ? 'alert' : 'status'}">${c.esc(n.text)}<button type="button" data-act="dismiss">Dismiss</button></p>`,
  menu: c => c.menuHtml(c),
  after: c => {
    document.getElementById('sub').textContent = `${c.fmt(c.TODAY)}, ${c.counts.occupied} of ${c.counts.all} occupied`; document.getElementById('propname').textContent = c.prop.name;
    const f = document.getElementById('f'), a = document.activeElement;
    if (f && !f.contains(a) && !a?.matches?.('#q,[data-act="menu"]')) f.querySelector('[data-autofocus]')?.focus({ preventScroll: true });
    else if (!f && c.state.sel && (a === document.body || !a)) document.querySelector(`[data-room="${CSS.escape(c.state.sel)}"]`)?.focus({ preventScroll: true });
  }
};
