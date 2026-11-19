// Design 1: Ledger (Assignments 007B and 007B.1). Uses the real application stylesheet; markup mirrors the React app.
const mark = '<svg width="1.25em" height="1.25em" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 22V10.5C3 5.8 6.9 2 12 2s9 3.8 9 8.5V22z" fill="var(--accent)"/><circle cx="12" cy="9" r="1.8" fill="var(--brass)"/><path d="M7 16.2c1.6-2 3.4-2 5 0s3.4 2 5 0" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
const search = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/></svg>';
export default {
  id: 'ledger', name: 'Ledger', mode: 'modal', filters: ['all', 'vacant', 'occupied', 'oos'], links: ['/ledger-dist/app.css'],
  labels: { vacant: 'Available' },
  css: `.lm{position:absolute;z-index:9;min-width:240px;padding:6px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgb(0 0 0 / .14);transform-origin:top left;animation:lmIn 140ms var(--ease)}
@keyframes lmIn{from{opacity:0;transform:scale(.96)}}.lm-h{margin:6px 10px;font-size:.75rem;color:var(--muted)}.lm-item{display:flex;justify-content:space-between;width:100%;min-height:40px;align-items:center;padding:0 10px;border-radius:8px;text-align:left}.lm-item:hover,.lm-item:focus-visible{background:var(--accent-wash)}.lm-sep{border:0;border-top:1px solid var(--line);margin:6px 0}
#menu{position:fixed;top:52px;left:150px;z-index:9}.switcher-btn{display:flex;align-items:center;gap:4px;font:inherit;text-align:left}
.f-field{display:grid;gap:4px;font-weight:600;font-size:.8125rem}.f-field input,.f-field select{width:100%;font-size:1rem;font-weight:400}.f-help,.opt-t{font-weight:400;color:var(--muted)}.req{color:var(--danger)}.f{display:grid;gap:var(--s4)}.f-error,.f-err{color:var(--danger);background:var(--danger-wash);border-radius:6px;padding:8px 10px;font-size:.8125rem;margin:0}.f-actions{display:flex;justify-content:flex-end;gap:8px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{min-height:36px;padding:0 12px;border:1px solid var(--control);border-radius:99px;font-weight:600;font-size:.8125rem}.chip[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}.f-sum{font-size:.8125rem;color:var(--muted);margin:0}
.d-list{display:grid;grid-template-columns:130px 1fr;gap:8px 12px;margin:0 0 12px}.d-list dt{color:var(--muted)}.d-list dd{margin:0;font-weight:600}.d-note{background:var(--canvas);border-radius:8px;padding:10px;margin:0 0 12px;font-size:.875rem;color:var(--muted)}.d-note.bad{background:var(--danger-wash);color:var(--ink)}.d-actions{display:flex;gap:8px;justify-content:flex-end}.linklike{text-decoration:underline;font-weight:600}
.empty{display:grid;justify-items:center;gap:8px;padding:3rem 1rem;color:var(--muted)}.empty h2{color:var(--ink);font-size:.9375rem}tbody tr[data-room]{cursor:pointer}
dialog .dialog-head h2{font-size:1.125rem}`,
  layout: c => `<a class="skip" href="#workspace">Skip to rooms</a>
<header class="topbar" data-c="header"><a href="#" aria-label="Stayflow rooms"><span class="wordmark">${mark}<span class="wm-text">stay<span>flow</span></span></span></a><span class="crumb" aria-hidden="true">/</span>
<div class="identity"><span class="monogram" aria-hidden="true">HG</span><div class="identity-text"><button type="button" class="switcher-btn property" data-act="menu" aria-haspopup="menu" aria-expanded="false" id="propname">${c.prop.name} ▾</button><span class="role">${c.prop.role}</span></div></div>
<nav aria-label="Main"><a href="#" aria-current="page">Rooms</a></nav><div class="account"><button class="btn btn-quiet" type="button" data-act="signout" aria-label="Sign out"><span>Sign out</span></button></div></header>
<div id="menu" hidden></div>
<main id="workspace" class="workspace" tabindex="-1"><div class="page-head"><div><h1>Rooms</h1><p class="sub" id="sub"></p></div><button class="btn btn-primary" type="button" data-act="open:add">+ Add room</button></div>
<div class="occupancy" id="occ" role="img"></div><div class="notice-slot" id="notice" role="status"></div>
<div class="filters"><div class="segments" id="filters" role="group" aria-label="Filter rooms by status" data-c="filters"></div><label class="search">${search}<span class="sr-only">Search rooms</span><input id="q" type="search" placeholder="Search rooms or guests" autocomplete="off"></label></div>
<section class="register" aria-label="Room register" data-c="list"><div id="list"></div></section><p class="sr-only" role="status" id="count"></p></main><footer class="env">Local demo · synthetic data only</footer>
<dialog id="host" aria-labelledby="dlg-title"></dialog>`,
  filterBtn: (f, on, n, c) => `<button type="button" class="segment" data-act="filter:${f}" aria-pressed="${on}">${c.t(f)}<b>${n}</b></button>`,
  list: (rs, c) => `<table><caption class="sr-only">Rooms, ordered by room identifier</caption><thead><tr><th scope="col">Room</th><th scope="col">Status</th><th scope="col">Guest</th><th scope="col">Departs</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rs.map(r => {
    const k = c.kindOf(r), cls = k === 'oos' ? 'out_of_service' : k === 'vacant' ? 'available' : 'occupied', tone = k === 'overdue' ? 'late' : k === 'today' ? 'soon' : '';
    return `<tr class="${c.state.flash === r.id ? 'flash' : ''}${r.label.length > 8 ? ' long-id' : ''}" data-room="${c.esc(r.id)}" data-act="select:${c.esc(r.id)}" tabindex="0"><th class="room-id" scope="row">${c.esc(r.label)}</th><td class="row-status"><span class="badge ${cls}">${c.t(cls === 'available' ? 'vacant' : k === 'oos' ? 'oos' : 'occupied')}</span></td><td class="guest${r.guest ? '' : ' blank'}">${c.esc(r.guest ?? '')}</td><td class="when${r.dep ? '' : ' blank'}" data-prefix="Departs ">${r.dep ? `<time class="${tone}">${c.whenText(r)}</time>` : ''}</td>
<td class="row-actions">${r.status === 'vacant' ? `<button type="button" class="btn btn-quiet go" aria-label="Check in to ${c.esc(r.label)}" data-act="open:checkin:${c.esc(r.id)}">Check in</button>` : ''}${r.status !== 'occupied' ? `<button type="button" class="btn btn-quiet" aria-label="Edit room ${c.esc(r.label)}" data-act="open:edit:${c.esc(r.id)}">Edit</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table>`,
  frame: (title, body, c, kind) => `<header class="dialog-head"><h2 id="dlg-title">${c.esc(title)}</h2><button type="button" class="btn btn-quiet btn-icon" data-act="close" aria-label="Close dialog">✕</button></header>${body}`,
  notice: (n, c) => n.kind === 'error' ? `<p class="alert" role="alert">${c.esc(n.text)}</p>` : `<p class="notice"><span aria-hidden="true">✓</span>${c.esc(n.text)}<button type="button" class="btn btn-quiet" aria-label="Dismiss message" data-act="dismiss">✕</button></p>`,
  menu: c => c.menuHtml(c),
  after: c => {
    const occ = c.counts.occupied; document.getElementById('sub').innerHTML = `${c.fmt(c.TODAY)} · <b>${occ} of ${c.counts.all}</b> occupied`;
    const o = document.getElementById('occ'); o.setAttribute('aria-label', `${occ} occupied, ${c.counts.vacant} available, ${c.counts.oos} out of service`);
    o.innerHTML = [['occupied', occ], ['available', c.counts.vacant], ['out_of_service', c.counts.oos]].map(([k, n]) => `<i class="${k}" style="flex-grow:${n}"></i>`).join('');
    document.getElementById('propname').textContent = c.prop.name + ' ▾';
  }
};
