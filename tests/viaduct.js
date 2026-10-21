// The Viaduct (hole 8): only a pure Stinger fits through the arch; the tee cam says so before you swing.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  // a 10-handicap without the Stinger reward (that needs 9.0), black tees open
  await pg.goto(PAGE);
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [10, 10, 10, 10, 10].map(d => ({ d })), onboarded: true })));
  await pg.reload(); await pg.waitForTimeout(300);
  const toHole8 = async tee => {
    await pg.evaluate(() => window.__pureStrike.setLen(9));
    await pg.tap('#soloBtn'); await pg.tap('.tee-card.' + tee); await pg.waitForTimeout(400);
    for (let i = 0; i < 7; i++) { await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(80); await pg.tap('#againBtn'); await pg.waitForTimeout(300); }
  };
  const tryShot = async (shape, n) => {
    await pg.evaluate(() => window.__pureStrike.restartHole());
    await pg.evaluate(sh => window.__pureStrike.setShape(sh), shape);
    await pg.evaluate(n => window.__pureStrike.strikeP(1, n), n);
    let through = false, clang = false;
    for (let k = 0; k < 60; k++) { await pg.waitForTimeout(100); if ((await pg.evaluate(() => window.__pureStrike.ballY())) > 102) through = true; if (/CLANG/.test(await pg.$eval('#pops', e => e.innerText))) clang = true; if (through || clang) break; }
    return { through, clang };
  };
  for (const tee of ['blue', 'black']) {
    await toHole8(tee);
    const r = await pg.evaluate(() => window.__pureStrike.bridge());
    check(`${tee}: hole 8 is The Viaduct, Stinger selected even though it isn't unlocked yet`, r.hole === 'The Viaduct' && r.shape === 'stinger');
    check(`${tee}: the tee cam shows, and the planned Stinger fits the arch`, r.cam && r.cross && r.cross.ok, `${r.cross.z.toFixed(1)} yds high at the arch`);
    await pg.evaluate(() => window.__pureStrike.setShape('straight'));
    const s = await pg.evaluate(() => window.__pureStrike.bridge());
    check(`${tee}: a normal drive would be too high, and the tee cam says so`, s.cross && !s.cross.ok && s.cross.high, `${s.cross.z.toFixed(0)} yds high at the arch`);
    let t = await tryShot('stinger', 0);
    check(`${tee}: a pure full-power Stinger flies through the arch`, t.through && !t.clang);
    t = await tryShot('straight', 0);
    check(`${tee}: a pure normal drive hits the viaduct: CLANG`, t.clang && !t.through);
    if (tee === 'black') { t = await tryShot('stinger', 0.06); check('black: a slightly mistimed Stinger balloons into the arch', t.clang && !t.through); }
    await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(250);
  }
  // the tee cam can be hidden
  await toHole8('blue');
  await pg.tap('#camBtn'); await pg.waitForTimeout(100);
  check('Hide tee cam hides it', !(await pg.evaluate(() => window.__pureStrike.bridge())).cam && (await pg.$eval('#camBtn', e => e.textContent)) === 'Show tee cam');
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
