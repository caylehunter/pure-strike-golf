// Drives full swings frame-accurately: hold Swing, let go at a chosen moment, then tap the strike ring.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

// release: 'band' (inside nuke band), 'early' (fill past 70%, before band), 'late' (after leaving band), 'never' (hold until drained)
// tapAfter: ms after release to tap the ring (ring meets the circle at 0.9 / speed seconds)
const CASES = [
  { name: 'nuke, on time', tee: 'black', nuke: true, release: 'band', tapAfter: 1200, expect: 'NUCLEAR PURE CONTACT' },
  { name: 'nuke, early strike', tee: 'black', nuke: true, release: 'band', tapAfter: 600, expect: 'MELTDOWN' },
  { name: 'nuke armed, let go early', tee: 'black', nuke: true, release: 'early', tapAfter: 1286, expect: 'TOO EARLY' },
  { name: 'nuke armed, let go late', tee: 'black', nuke: true, release: 'late', tapAfter: 1286, expect: 'TOO LATE' },
  { name: 'held until drained', tee: 'black', nuke: true, release: 'never', expect: 'SWING CANCELLED' },
  { name: 'normal drive, on time', tee: 'black', nuke: false, release: 'early', tapAfter: 1286, expect: 'PURE' },
  { name: 'blue tees, tapped late', tee: 'blue', nuke: false, release: 'early', tapAfter: 2000, expect: 'LATE' }
];

async function run(c) {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(PAGE); await pg.waitForTimeout(400);
  // a player with five level rounds: black tees unlocked, every swing upgrade still at Lv 1
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [0, 0, 0, 0, 0].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);
  await pg.tap('.tee-card.' + c.tee); await pg.waitForTimeout(700);
  // hole 1 is a par 3 (irons, no nuke); score it and play from the par-4 tee
  await pg.evaluate(() => window.__pureStrike.score(3, 2)); await pg.waitForTimeout(200);
  await pg.tap('#againBtn'); await pg.waitForTimeout(900);
  if (c.nuke) { await pg.tap('#nukeBtn'); await pg.waitForTimeout(300); }
  await pg.evaluate(({ release, tapAfter }) => new Promise(res => {
    const btn = document.querySelector('#swingBtn'), ev = t => btn.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1 }));
    const band = document.querySelector('#mNuke'), fill = () => parseFloat(document.querySelector('#mFill').style.width || 0);
    let stage = 0, tRel = 0, seenBand = false; const t0 = performance.now();
    ev('pointerdown');
    const loop = now => {
      if (now - t0 > 8000) return res();
      const inBand = band.classList.contains('in'); if (inBand) seenBand = true;
      if (stage === 0) {
        const go = release === 'band' ? inBand : release === 'early' ? fill() > 70 && !inBand : release === 'late' ? seenBand && !inBand : false;
        if (go) { ev('pointerup'); stage = 1; tRel = now; }
        if (release === 'never' && document.querySelector('#swingBtn').textContent.startsWith('Hold')) return res();
      } else if (stage === 1 && now - tRel >= tapAfter) { ev('pointerdown'); ev('pointerup'); return res(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }), c);
  const seen = new Set();
  for (let i = 0; i < 25; i++) { await pg.waitForTimeout(100); const t = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); if (t) seen.add(t); }
  await br.close();
  const text = [...seen].join(' | ');
  const ok = text.includes(c.expect) && !errs.length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: ${text || '(no message)'}${errs.length ? ' ERRORS ' + errs.join('; ') : ''}`);
  return ok;
}

(async () => {
  let fails = 0;
  for (const c of CASES) if (!(await run(c))) fails++;
  if (fails) { console.log(`${fails} swing test(s) failed`); process.exit(1); }
})();
