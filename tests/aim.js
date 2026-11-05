// Aiming you can trust: a pure strike released on the power marker carries to the aim point, wind included,
// and the game never aims you into water (the Pond Carry par 3, from both tees, in every wind).
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  await pg.goto(PAGE);
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, allUnlocked: true, seenTut: true, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [10, 10, 10, 10, 10].map(d => ({ d })) })));
  for (const tee of ['blue', 'black']) {
    const res = [];
    for (const wind of [-15, -10, -5, 0, 5, 10]) {
      await pg.reload(); await pg.waitForTimeout(250);
      await pg.tap('#soloBtn'); await pg.waitForTimeout(100); await pg.tap(`#soloSetup [data-tee="${tee}"]`); await pg.waitForTimeout(500);
      const pre = await pg.evaluate(w => {
        document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
        const P = window.__pureStrike; P.setWind(w); const B = P.ball(); P.place(B.x, B.y);
        const A = P.aim(), t = P.aimTarget(); return { club: A.club, land: { x: A.x, y: A.y }, target: t, wet: P.surface(t.x, t.y), power: P.aimPower() };
      }, wind);
      await pg.evaluate(p => window.__pureStrike.strikeP(p, 0), pre.power);
      await pg.waitForFunction(() => !['flight', 'roll', 'power', 'accuracy'].includes(window.__pureStrike.ball().mode), null, { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(200);
      const B = await pg.evaluate(() => window.__pureStrike.ball());
      res.push({ wind, club: pre.club, aimWet: pre.wet, previewMiss: pre.power < 1 ? Math.hypot(pre.land.x - pre.target.x, pre.land.y - pre.target.y) : 0, lie: B.lie, strokes: B.strokes });
    }
    const s = res.map(r => `${r.wind}mph ${r.club} → ${r.lie}`).join(', ');
    check(`${tee}: the aim point is never in the water`, res.every(r => !/water/.test(r.aimWet)), s);
    check(`${tee}: the preview line lands on the aim point, wind included`, res.every(r => r.previewMiss < 1.5), res.map(r => r.previewMiss.toFixed(1)).join(' '));
    check(`${tee}: a pure strike on the marker stays dry in every wind`, res.every(r => r.strokes === 1 && !/water/.test(r.lie)), s);
    check(`${tee}: and finishes on the green or fringe (calm to 10 mph)`, res.filter(r => Math.abs(r.wind) <= 10).every(r => /green|fringe/.test(r.lie)), s);
  }
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  await br.close();
  if (checks.includes(false)) process.exit(1);
})();
