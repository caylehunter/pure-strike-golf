// NBA Jam heat: 3 pure swings in a row heats you up, 4 sets you on fire; a miss puts it out.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  await pg.tap('#soloBtn'); await pg.tap('.tee-card.blue'); await pg.waitForTimeout(500);
  const heat = () => pg.evaluate(() => window.__pureStrike.heat());
  const popsText = async ms => { const seen = new Set(); for (let i = 0; i < ms / 100; i++) { await pg.waitForTimeout(100); const t = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); if (t) seen.add(t); } return [...seen].join(' | '); };
  // one swing per hole, then move on (putts never touch the streak)
  const swing = async n => { await pg.evaluate(n => window.__pureStrike.strikeAt(n), n); };
  const nextHole = async () => { await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(120); await pg.tap('#againBtn'); await pg.waitForTimeout(500); };

  await swing(0); check('a pure swing starts a streak', (await heat()).streak === 1);
  await nextHole();
  check('the streak badge shows it', (await heat()).badge === 'Pure ×1', (await heat()).badge);
  await swing(0); await nextHole();
  const cold = await heat();
  await swing(0);
  let seen = await popsText(900);
  check('three in a row: HEATING UP!', (await heat()).streak === 3 && /HEATING UP/i.test(seen), seen);
  await nextHole();
  check('badge: Heating up · pure ×3', (await heat()).badge === 'Heating up · pure ×3');
  await pg.waitForTimeout(400); await pg.screenshot({ path: path.join(__dirname, 'fire-heat.png') });
  await swing(0);
  seen = await popsText(900);
  const hot = await heat();
  check('four in a row: ON FIRE!', hot.fire && /ON FIRE/i.test(seen), seen);
  check('on fire the sweet spot is 60% bigger', Math.abs(hot.win - cold.win * 1.6) < 1e-9, `${cold.win} → ${hot.win}`);
  await nextHole();
  // a strike a touch off the line still counts as pure while on fire
  await swing(0.06);
  check('on fire, a swing slightly off the line still counts as PURE', (await heat()).streak === 5 && (await heat()).fireShot, `streak ${(await heat()).streak}`);
  await pg.waitForTimeout(700); await pg.screenshot({ path: path.join(__dirname, 'fire-flight.png') });
  await nextHole();
  await swing(0.1);
  seen = await popsText(900);
  check("a miss puts the fire out", (await heat()).streak === 0 && !(await heat()).fire && /FIRE'S OUT/i.test(seen), seen);
  // a new round starts cold
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(250);
  await pg.tap('#soloBtn'); await pg.tap('.tee-card.blue'); await pg.waitForTimeout(400);
  check('a new round starts cold', (await heat()).streak === 0);
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
