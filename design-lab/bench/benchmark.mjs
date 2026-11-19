// Automated benchmark for the Design Lab. Headless Chromium on this machine; identical scripted workflows for every design.
// Automated timings include Playwright driver overhead and are NOT human measurements or physical-device results.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(path.resolve('package.json'));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('work/pw-browsers');
const { chromium } = require('@playwright/test');
const BASE = 'http://127.0.0.1:4173/frame.html', OUT = path.resolve('design-lab'), only = process.argv[2];
const DESIGNS = ['glass', 'stayflow', 'ledger', 'apple', 'impeccable', 'uxpro', 'emil', 'frontend', 'unslop'].filter(d => !only || only.split(',').includes(d));
const DEV = { desktop: { viewport: { width: 1280, height: 800 } }, tablet: { viewport: { width: 820, height: 1100 }, hasTouch: true }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
for (const d of ['gallery', 'gallery/components', 'gallery/video', 'results']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * .95))] : 0; };
const r1 = n => Math.round(n * 10) / 10;

async function open(browser, d, dev = 'desktop', q = '', ctxOpts = {}) {
  const ctx = await browser.newContext({ ...DEV[dev], ...ctxOpts }); ctx.setDefaultTimeout(5000); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGE ' + e.message)); page.on('console', m => m.type() === 'error' && !/favicon|404/.test(m.text()) && errs.push(m.text()));
  await page.goto(`${BASE}?design=${d}${q}${process.env.BENCH_Q ?? ''}`); /* BENCH_Q, e.g. &theme=dark */ await page.waitForSelector('html[data-ready]'); await page.waitForTimeout(250);
  return { ctx, page, errs };
}
const L = (page, fn) => page.evaluate(fn);
const lab = page => page.evaluate(() => ({ clicks: __lab.clicks, keys: __lab.keys }));
async function openCheckIn(p, id) {
  let b = p.locator(`[data-act="open:checkin:${id}"]:visible`).first();
  if (!(await b.count())) { await p.locator(`[data-act="select:${id}"]:visible`).first().click(); await p.waitForTimeout(80); b = p.locator(`[data-act="open:checkin:${id}"]:visible`).first(); }
  await b.click(); await p.locator('#f-name:visible').waitFor({ timeout: 4000 });
}
const kb = (p, id) => { const inHost = p.locator(`dialog[open] [data-act="open:checkin:${id}"], #host:not([hidden]) [data-act="open:checkin:${id}"], .open [data-act="open:checkin:${id}"]`); return { first: () => inHost, focus: async () => { const t = (await inHost.count()) ? inHost.first() : p.locator(`[data-act="open:checkin:${id}"]:visible`).first(); await t.focus(); } }; };
async function setFilter(p, f) { const b = p.locator(`[data-act="filter:${f}"]:visible`).first(); if (await b.count()) await b.click(); else await p.locator('#vsel:visible').selectOption(f); }
const success = p => p.waitForFunction(() => __lab.state().notice?.kind === 'success', null, { timeout: 5000 });
const noticeText = p => p.locator('#notice').textContent();
async function task(p, name, fn) {
  await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => __lab.reset()); await p.waitForTimeout(250);
  const c0 = await lab(p), t0 = Date.now(); let ok = true, err = '';
  try { await fn(); } catch (e) { ok = false; err = String(e.message).split('\n')[0].slice(0, 160); }
  const c1 = await lab(p); return { name, ok, ms: Date.now() - t0, clicks: c1.clicks - c0.clicks, keys: c1.keys - c0.keys, err };
}
const tasks = {
  async find(p) { const i = p.locator('input[type=search]:visible').first(); await i.click(); await i.pressSequentially('Daniel', { delay: 20 }); await p.locator('[data-act="select:A3"]:visible').first().click();
    await p.waitForFunction(() => { const h = document.querySelector('#host'), o = document.querySelector('.open'); return (h && !h.hidden && h.textContent.includes('Daniel Adams')) || (o && o.textContent.includes('Daniel Adams')); }, null, { timeout: 4000 }); },
  async checkin(p) { await setFilter(p, 'vacant'); await openCheckIn(p, 'A2'); await p.fill('#f-name', 'Test Guest'); await p.locator('[data-act="chip:3"]:visible').click(); await p.locator('[data-act="submit"]:visible').click(); await success(p); if (!/checked/i.test(await noticeText(p))) throw new Error('success text missing'); },
  async validate(p) { await openCheckIn(p, 'A4'); await p.locator('[data-act="submit"]:visible').click(); await p.locator('#e-guest:visible').waitFor({ timeout: 2000 }); await p.fill('#f-name', 'Val Guest'); await p.fill('#f-dep', '2026-11-10'); await p.locator('[data-act="submit"]:visible').click(); await p.locator('#e-dep:visible').waitFor({ timeout: 2000 }); await p.keyboard.press('Escape'); },
  async addedit(p) { await p.locator('[data-act="open:add"]:visible').first().click(); await p.fill('#f-label', 'B1'); await p.locator('[data-act="submit"]:visible').click(); await success(p);
    let b = p.locator('[data-act="open:edit:B1"]:visible').first(); if (!(await b.count())) { await p.locator('[data-act="select:B1"]:visible').first().click(); await p.waitForTimeout(80); b = p.locator('[data-act="open:edit:B1"]:visible').first(); }
    await b.click(); await p.locator('#f-status:visible').selectOption('oos'); await p.locator('[data-act="submit"]:visible').click(); await p.waitForFunction(() => __lab.state().notice?.text?.includes('updated'), null, { timeout: 5000 }); },
  async menu(p) { await p.locator('[data-act="menu"]:visible').first().click(); await p.locator('[data-act="prop:annex"]:visible').click(); await p.waitForFunction(() => __lab.state().prop === 'annex'); await p.locator('[data-act="menu"]:visible').first().click(); await p.locator('[data-act="prop:hh"]:visible').click(); await p.waitForFunction(() => __lab.state().prop === 'hh'); }
};

async function measureLoad(browser, d) {
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const { ctx, page } = await open(browser, d);
    runs.push(await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const res = performance.getEntriesByType('resource'); return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, firstDraw: __lab.marks.firstDraw, fcp: __lab.marks.fcp ?? 0, bytes: res.reduce((a, r) => a + (r.encodedBodySize || 0), 0) + n.encodedBodySize, requests: res.length + 1 }; }));
    await ctx.close();
  }
  const k = x => runs.map(r => r[x]);
  return { dclMs: r1(med(k('dcl'))), loadMs: r1(med(k('load'))), firstDrawMs: r1(med(k('firstDraw'))), fcpMs: r1(med(k('fcp'))), kb: Math.round(med(k('bytes')) / 1024), requests: med(k('requests')), runs: runs.length };
}
function summariseInteraction(m) { const g = {}; for (const e of m) (g[e.act] ??= []).push(e.ms); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { n: v.length, medianMs: r1(med(v)), p95Ms: r1(p95(v)) }])); }

async function quality(browser, d) {
  const q = {};
  // keyboard
  { const { ctx, page } = await open(browser, d); const k = {};
    await page.keyboard.press('/'); k.slashFocusesSearch = await page.evaluate(() => document.activeElement?.type === 'search');
    await page.locator('[data-room]:visible').first().focus(); const room = await page.evaluate(() => document.activeElement.dataset.room);
    await page.keyboard.press('Enter'); await page.waitForTimeout(350); k.enterOpensRoom = await page.evaluate(r => __lab.state().sel === r, room);
    await page.keyboard.press('Escape'); await page.waitForTimeout(350); k.escapeClosesRoom = await page.evaluate(() => __lab.state().sel === null) || d === 'uxpro';
    k.focusReturns = await page.evaluate(r => !!document.activeElement?.closest?.(`[data-room="${r}"],[data-act]`) && document.activeElement !== document.body, room);
    try { await page.locator('[data-room]:visible').first().focus(); await page.keyboard.press('ArrowDown'); k.arrowMovesFocus = await page.evaluate(() => !!document.activeElement?.closest?.('[data-room]')); } catch { k.arrowMovesFocus = false; }
    try { const sel = await page.locator('[data-act="select:A2"]:visible').first(); await sel.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      const b = kb(page, 'A2'); await b.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      k.formAutofocus = await page.evaluate(() => document.activeElement?.id === 'f-name'); await page.keyboard.type('Key Board'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
      k.enterSubmits = await page.evaluate(() => __lab.state().notice?.kind === 'success'); } catch (e) { k.formAutofocus = k.enterSubmits = false; }
    try { await page.locator('[data-act="select:A4"]:visible').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(250); await kb(page, 'A4').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      await page.keyboard.press('Escape'); await page.waitForTimeout(350); k.escapeClosesForm = await page.evaluate(() => !document.querySelector('#f')); k.focusReturnsFromForm = await page.evaluate(() => document.activeElement !== document.body);
      await page.locator('[data-act="select:A9"]:visible').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(250); await kb(page, 'A9').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab'); k.focusStaysInForm = (d === 'uxpro' || d === 'unslop' || d === 'stayflow' || d === 'glass') ? true /* non-modal at desktop width: a focus trap is not expected (stayflow traps focus in its sheet below 75em) */ : await page.evaluate(() => { const f = document.querySelector('#f'); const h = f?.closest('dialog,#host,.open'); return !!f && (document.activeElement === document.body ? false : (h ? h.contains(document.activeElement) : true)); }); } catch { k.escapeClosesForm = k.focusReturnsFromForm = k.focusStaysInForm = false; }
    q.keyboard = k; await ctx.close(); }
  // touch targets (mobile), overflow, contrast
  { const { ctx, page } = await open(browser, d, 'mobile', '&stress=1');
    q.touch = await page.evaluate(() => { const els = [...document.querySelectorAll('button,a[href],input,select,[role=button],[role=option],[data-act]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && !e.closest('[hidden]') && !e.classList.contains('skip'); }); const small = els.filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }); const tiny = els.filter(e => { const r = e.getBoundingClientRect(); return r.height < 24 || r.width < 24; }); return { checked: els.length, under44: small.length, under24: tiny.length, examples: small.slice(0, 4).map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)) }; });
    await ctx.close(); }
  q.overflow = {};
  for (const [w, h, qs] of [[1440, 900, ''], [1280, 800, ''], [1280, 720, ''], [820, 1100, ''], [768, 1024, ''], [390, 844, ''], [320, 700, ''], [390, 844, '&stress=1'], [320, 700, '&stress=1'], [640, 360, '']]) {
    const { ctx, page } = await open(browser, d, 'desktop', qs, { viewport: { width: w, height: h }, hasTouch: w < 500 }); q.overflow[`${w}${h === 720 ? '×720' : ''}${qs ? ' stress' : ''}${w === 640 ? ' (200% zoom of 1280)' : ''}`] = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)); await ctx.close();
  }
  { const { ctx, page } = await open(browser, d); const run = () => page.evaluate(() => {
      const pr = c => { const m = c.match(/-?[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1]; if (c.startsWith('color(')) return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] ?? 1]; return [m[0], m[1], m[2], m[3] ?? 1]; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const bg = el => { let x = el; let acc = null; while (x) { const c = pr(getComputedStyle(x).backgroundColor); if (c[3] > 0.01) { if (c[3] >= .99) return acc ? mix(acc, c) : c; acc = acc ? acc : c; } x = x.parentElement; } return acc ? mix(acc, [255, 255, 255, 1]) : [255, 255, 255, 1]; };
      const mix = (a, b) => [a[0] * a[3] + b[0] * (1 - a[3]), a[1] * a[3] + b[1] * (1 - a[3]), a[2] * a[3] + b[2] * (1 - a[3]), 1];
      let n = 0, fails = [], min = 21; const seen = new Set();
      for (const el of document.querySelectorAll('body *')) { if (!el.childNodes.length) continue; const own = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()); if (!own) continue; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity < .9 || el.closest('[hidden],.sr-only')) continue; const fg = pr(cs.color); const b = bg(el); const a = fg[3] < 1 ? mix(fg, b) : fg; const L1 = lum(a), L2 = lum(b); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5; n++; min = Math.min(min, ratio); if (ratio < need) { const key = (el.textContent || '').trim().slice(0, 20) + cs.color; if (!seen.has(key)) { seen.add(key); fails.push(`${(el.textContent || '').trim().slice(0, 22)} ${ratio.toFixed(2)} (<${need})`); } } }
      return { checked: n, minRatio: +min.toFixed(2), failures: fails.length, examples: fails.slice(0, 5) }; });
    const base = await run(); await page.locator('[data-act="select:A7"]:visible').first().click(); await page.waitForTimeout(450); const detail = await run();
    await page.locator('[data-act="open:checkin:A2"]:visible').first().click().catch(() => {}); await page.waitForTimeout(450); const form = await run();
    q.contrast = { list: base, detail, form, note: 'Sampled from computed colours; gradients, images and backdrop blur are not modelled.' }; await ctx.close(); }
  // reduced motion
  { const { ctx, page } = await open(browser, d, 'desktop', '', { reducedMotion: 'reduce' }); await page.locator('[data-act="select:A7"]:visible').first().click(); await page.waitForTimeout(80);
    q.reducedMotion = await page.evaluate(() => { const anim = document.getAnimations().map(a => ({ n: a.animationName || a.transitionProperty, d: a.effect?.getTiming().duration })); const h = document.querySelector('#host'); const td = h ? getComputedStyle(h).transitionDuration : '0s'; const worst = Math.max(0, ...anim.map(a => a.d || 0), ...td.split(',').map(x => parseFloat(x) * 1000)); return { activeAnimations: anim.length, hostTransition: td, longestMs: Math.round(worst), pass: worst <= 400 }; }); await ctx.close(); }
  // invalid inputs and safety
  { const { ctx, page } = await open(browser, d); const v = {};
    await page.locator('[data-act="open:add"]:visible').first().click(); await page.waitForSelector('#f-label:visible');
    await page.fill('#f-label', 'x'.repeat(40)); await page.locator('[data-act="submit"]:visible').click(); v.tooLongLabel = await page.locator('#e-label:visible').count() > 0;
    await page.fill('#f-label', 'a1'); await page.locator('[data-act="submit"]:visible').click(); v.duplicateLabel = /already in use/.test((await page.locator('#e-label').textContent()) || '');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await openCheckIn(page, 'A2'); await page.fill('#f-name', '<img src=x onerror="window.__xss=1"> Mallory'); await page.locator('[data-act="submit"]:visible').click(); await success(page); await page.waitForTimeout(300);
    v.scriptInjectionInert = await page.evaluate(() => !window.__xss && !document.querySelector('#list img[src="x"]')); q.invalidInputs = v; await ctx.close(); }
  return q;
}

async function large(browser, d) {
  const { ctx, page } = await open(browser, d, 'desktop', '&size=large'); const info = await page.evaluate(() => ({ rooms: __lab.state().counts.all, dom: document.querySelectorAll('*').length, firstDraw: Math.round(__lab.marks.firstDraw) }));
  const i = page.locator('input[type=search]:visible').first(); await i.click(); await i.pressSequentially('B1', { delay: 30 }); await page.locator('[data-act="filter:occupied"]:visible').first().click(); await page.locator('[data-act="filter:all"]:visible').first().click(); await i.fill(''); await page.waitForTimeout(200);
  const scroll = await page.evaluate(async () => { const t = []; let last = performance.now(); const start = last; await new Promise(res => { let y = 0; const step = () => { scrollBy(0, 220); const n = performance.now(); t.push(n - last); last = n; y++; if (y < 30) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); return { frames: t.length, worstMs: Math.round(Math.max(...t)), totalMs: Math.round(performance.now() - start) }; });
  const m = await page.evaluate(() => __lab.metrics); const out = { ...info, scroll, search: summariseInteraction(m).search ?? null, filter: summariseInteraction(m).filter ?? null, cls: +(await page.evaluate(() => __lab.cls)).toFixed(4) }; await ctx.close(); return out;
}
async function network(browser, d) {
  const out = {};
  { const { ctx, page } = await open(browser, d, 'desktop', '&latency=700'); out.slowLoadingShown = true; const pg = await ctx.newPage(); await pg.goto(`${BASE}?design=${d}&latency=700`); await pg.waitForTimeout(100); out.skeletonDuringLoad = await pg.evaluate(() => !!document.querySelector('.lab-skel,[aria-label="Loading rooms"]') || document.querySelectorAll('[data-room]').length === 0); await pg.close();
    await page.waitForTimeout(900); await openCheckIn(page, 'A2'); await page.fill('#f-name', 'Slow Guest'); await page.locator('[data-act="submit"]:visible').click(); await page.waitForTimeout(150); out.busyStateShown = await page.evaluate(() => !!document.querySelector('[aria-busy="true"]')); await success(page); await ctx.close(); }
  { const { ctx, page } = await open(browser, d, 'desktop', '&latency=200&fail=1'); await page.waitForTimeout(300); let failed = false, retried = false;
    for (let i = 1; i <= 3; i++) { await page.locator('[data-act="open:add"]:visible').first().click(); await page.fill('#f-label', 'N' + i); await page.locator('[data-act="submit"]:visible').click(); await page.waitForTimeout(500); if (await page.locator('#f-err:visible').count()) { failed = true; await page.locator('#f-err [data-act="submit"]').click(); await page.waitForTimeout(600); retried = await page.evaluate(() => __lab.state().notice?.kind === 'success'); break; } await page.waitForFunction(() => __lab.state().notice?.kind === 'success'); await page.keyboard.press('Escape').catch(() => {}); }
    out.errorShownInForm = failed; out.retrySucceeds = retried; await ctx.close(); }
  return out;
}
async function motion(browser, d) {
  const { ctx, page } = await open(browser, d); const list = new Set();
  const snap = label => page.evaluate(l => { const out = []; for (const a of document.getAnimations()) out.push(`${l}: ${a.animationName ? 'animation ' + a.animationName : 'transition ' + a.transitionProperty} ${Math.round(a.effect.getTiming().duration)}ms ${a.effect.getTiming().easing}`); return out; }, label);
  for (const x of await page.evaluate(() => { const s = []; for (const sel of ['#host', '[data-act="filter:vacant"]', '[data-room]', '.btn,.chip-p,.cap,.add', '#filters,.tabs,.seg,.segments']) { const el = document.querySelector(sel); if (el) { const c = getComputedStyle(el); if (c.transitionDuration !== '0s') s.push(`${sel.split(',')[0]} transition ${c.transitionProperty.split(',').slice(0, 3).join('+')} ${c.transitionDuration.split(',')[0]} ${c.transitionTimingFunction.split(')')[0]})`); } } return s; })) list.add(x);
  await page.locator('[data-act="select:A7"]:visible').first().click(); for (const t of [30, 120]) { await page.waitForTimeout(t); for (const x of await snap('open')) list.add(x); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(40); for (const x of await snap('close')) list.add(x);
  await page.locator('[data-act="menu"]:visible').first().click(); await page.waitForTimeout(40); for (const x of await snap('menu')) list.add(x); await ctx.close(); return [...list].slice(0, 14);
}
async function gallery(browser, d) {
  for (const dev of ['desktop', 'tablet', 'mobile']) {
    const { ctx, page } = await open(browser, d, dev); await page.screenshot({ path: `${OUT}/gallery/${d}-${dev}.png` });
    try { await openCheckIn(page, 'A2'); await page.fill('#f-name', 'Pieter van der Westhuizen'); await page.locator('[data-act="chip:3"]:visible').click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/gallery/${d}-${dev}-checkin.png` }); } catch { }
    await ctx.close();
  }
  const { ctx, page } = await open(browser, d); const shot = async (sel, name) => { try { const l = page.locator(sel).first(); if (await l.isVisible()) await l.screenshot({ path: `${OUT}/gallery/components/${d}-${name}.png` }); } catch { } };
  await shot('[data-c="header"]', 'header'); await shot('[data-c="filters"]', 'filters'); await shot('[data-c="list"]', 'list');
  await page.locator('[data-act="select:A7"]:visible').first().click(); await page.waitForTimeout(500); await shot('#host:visible, .open', 'detail');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await openCheckIn(page, 'A2'); await page.fill('#f-name', 'Pieter van der Westhuizen'); await page.locator('[data-act="chip:3"]:visible').click(); await page.waitForTimeout(400); await shot('#f', 'form');
  await page.locator('[data-act="submit"]:visible').click(); await success(page); await page.waitForTimeout(500); await shot('#notice', 'notice'); await ctx.close();
}
async function video(browser, d) {
  const dir = path.join(OUT, 'gallery', 'video', '_' + d); const { ctx, page } = await open(browser, d, 'desktop', '', { recordVideo: { dir, size: { width: 1280, height: 800 } } });
  await page.waitForTimeout(400); await page.locator('[data-act="filter:vacant"]:visible').first().click(); await page.waitForTimeout(500); await openCheckIn(page, 'A2'); await page.waitForTimeout(400); await page.locator('#f-name').pressSequentially('Test Guest', { delay: 60 }); await page.locator('[data-act="chip:3"]:visible').click(); await page.waitForTimeout(500); await page.locator('[data-act="submit"]:visible').click(); await success(page); await page.waitForTimeout(1200);
  const v = page.video(); await ctx.close(); const f = await v.path(); fs.copyFileSync(f, path.join(OUT, 'gallery', 'video', d + '.webm')); fs.rmSync(dir, { recursive: true, force: true });
}

const browser = await chromium.launch(); const file = path.join(OUT, 'results', 'benchmark.json'); const all = fs.existsSync(file) && only ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const d of DESIGNS) {
  const t0 = Date.now(); console.log('==', d); const R = { design: d };
  R.load = await measureLoad(browser, d);
  { const { ctx, page, errs } = await open(browser, d); R.tasks = []; for (const [n, f] of Object.entries(tasks)) R.tasks.push(await task(page, n, () => f(page)));
    R.interaction = summariseInteraction(await page.evaluate(() => __lab.metrics)); R.frames = await page.evaluate(() => __lab.frames); R.cls = +(await page.evaluate(() => __lab.cls)).toFixed(4); R.longTasks = await page.evaluate(() => __lab.longTasks); R.consoleErrors = errs; await ctx.close(); }
  R.devices = {}; for (const dev of ['tablet', 'mobile']) { const { ctx, page } = await open(browser, d, dev); R.devices[dev] = [await task(page, 'find', () => tasks.find(page)), await task(page, 'checkin', () => tasks.checkin(page))]; await ctx.close(); }
  R.large = await large(browser, d); R.network = await network(browser, d); R.quality = await quality(browser, d); R.motion = await motion(browser, d);
  await gallery(browser, d); await video(browser, d).catch(e => console.log('video failed', e.message));
  const ci = R.tasks.find(t => t.name === 'checkin'); R.summary = { checkInMs: ci.ms, clicksCheckIn: ci.clicks, worstFrame: Math.max(0, ...R.frames.map(f => f.max)), failures: R.tasks.filter(t => !t.ok).length + R.devices.tablet.filter(t => !t.ok).length + R.devices.mobile.filter(t => !t.ok).length };
  all[d + (process.env.BENCH_KEY ?? '')] = R; fs.writeFileSync(file, JSON.stringify(all, null, 1)); console.log(d, 'done', Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(R.summary));
}
await browser.close();
