// Highlights lab (testing): every button drops you into its moment, and the moment actually happens.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const ps = (fn, ...a) => pg.evaluate(([f, a]) => window.__pureStrike[f](...a), [fn, a]);
  const watch = async ms => { const seen = new Set(); let cine = null, walk = false, slow = 0; for (let i = 0; i < ms / 100; i++) { await pg.waitForTimeout(100); const t = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); if (t) seen.add(t); const c = await ps('cine'); if (c) cine = c.kind; if (await ps('walkIn')) walk = true; const s = await ps('slow'); if (s) slow = Math.min(slow || 1, s.s); } return { text: [...seen].join(' | '), cine, walk, slow }; };

  await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [12, 12, 12, 12, 12].map(d => ({ d })), onboarded: true })));
  await pg.reload(); await pg.waitForTimeout(300);
  check('players don\'t see the lab', !(await ps('hl')).btn);
  await pg.evaluate(() => { location.hash = '#testing'; }); await pg.waitForTimeout(200);
  check('the tester does (owner or #testing)', (await ps('hl')).btn);
  await pg.tap('#hlBtn'); await pg.waitForTimeout(200);
  const items = await pg.$$eval('.hl-item b', e => e.map(x => x.textContent));
  check('the lab lists the moments', items.length === 10, items.join(', '));
  check('"Hit it for me" is the default', /Hit it for me/.test(await pg.$eval('#hlMode .on', e => e.textContent)));
  const rounds0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('pure-strike-v1')).rounds.length);

  const expect = {
    drive: r => r.slow && r.slow < 0.5 && /\d{3} YDS/.test(r.text),
    nuke: r => r.cine === 'nuke' && /NUCLEAR/.test(r.text),
    stinger: r => r.cine === 'stinger',
    viaduct: r => r.cine === 'stinger' && /THREADED IT/.test(r.text),
    iron: r => /PURE/.test(r.text),
    locked: r => /STARTING TO FEEL IT/.test(r.text),
    putt: r => r.walk && /DRAINED IT/.test(r.text),
    chip: r => r.walk && /CHIP-IN|BIRDIE|EAGLE|PAR/.test(r.text),
    dunk: r => /SLAM DUNK/.test(r.text),
    pu: r => true
  };
  for (const id of Object.keys(expect)) {
    await pg.tap('#hlBtn').catch(() => {}); await pg.evaluate(() => document.querySelector('#hlLab').hidden || 0);
    if (await pg.$eval('#hlLab', e => e.hidden)) { await pg.tap('#hlToLab').catch(() => {}); await pg.waitForTimeout(200); }
    await pg.tap(`[data-hl="${id}"]`); await pg.waitForTimeout(200);
    const r = await watch(id === 'putt' || id === 'chip' ? 9000 : 6000);
    const ok = expect[id](r);
    if (id === 'pu') { const p = await ps('pu'); check('All four power-ups: four in hand, ready to try', p.slots.length === 4, p.slots.join()); }
    else check(`${id}: the moment happens`, ok, `${r.cine ? 'cine ' + r.cine + ', ' : ''}${r.walk ? 'walk-in, ' : ''}${r.slow ? 'slow ' + r.slow + ', ' : ''}${r.text.slice(-110)}`);
    check(`${id}: the Replay / Lab bar is up`, (await ps('hl')).bar);
    if (id === 'drive' || id === 'stinger') await pg.screenshot({ path: path.join(__dirname, `hl-${id}.png`) });
    await pg.tap('#hlToLab'); await pg.waitForTimeout(200);
  }
  const rounds1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('pure-strike-v1')).rounds.length);
  check('nothing in the lab touches the handicap', rounds1 === rounds0);

  // "Let me hit it": set up, no auto swing
  await pg.tap('#hlMode [data-auto="0"]'); await pg.waitForTimeout(100);
  await pg.tap('[data-hl="stinger"]'); await pg.waitForTimeout(2500);
  const b = await ps('ball');
  check('"Let me hit it" drops you on the tee with the stinger selected, ready to swing', b.mode === 'aim' && b.strokes === 0 && /on/.test(await pg.$eval('#shapeSeg [data-shape="stinger"]', e => e.className)));
  await pg.tap('#hlToLab'); await pg.tap('[data-hl="putt"]'); await pg.waitForTimeout(1800);
  check('"Let me hit it" on the putt hands you Read to sink it', (await ps('ball')).mode === 'putt' && (await ps('pu')).slots.includes('read'));
  await pg.tap('#hlReplay'); await pg.waitForTimeout(1500);
  check('Replay sets the same moment up again', (await ps('ball')).mode === 'putt' && (await ps('hl')).lab === 'putt');
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(200);
  check('quitting to the menu leaves the lab', !(await ps('hl')).bar && !(await ps('hl')).lab);

  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
