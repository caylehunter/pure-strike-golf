// Power-ups and Arcade mode: earned (never sold), four kinds, and they never touch the handicap.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const pu = () => pg.evaluate(() => window.__pureStrike.pu());
  const pops = async ms => { const seen = new Set(); for (let i = 0; i < ms / 100; i++) { await pg.waitForTimeout(100); const t = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); if (t) seen.add(t); } return [...seen].join(' | '); };
  const settle = async () => { for (let k = 0; k < 90; k++) { await pg.waitForTimeout(100); const m = (await pg.evaluate(() => window.__pureStrike.ball())).mode; if (!/flight|roll|rest/.test(m)) break; } await pg.waitForTimeout(300); };
  const fresh = async (extra = {}) => {
    await pg.goto(PAGE); await pg.evaluate(x => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [12, 12, 12, 12, 12].map(d => ({ d })), onboarded: true, ...x })), extra);
    await pg.reload(); await pg.waitForTimeout(300); await pg.evaluate(() => window.__pureStrike.setLen(3));
  };
  const next = async () => { await pg.tap('#againBtn'); await pg.waitForTimeout(400); };

  // 1. a normal round: no power-ups, even after a hole-in-one
  await fresh();
  await pg.tap('#soloBtn'); await pg.waitForTimeout(100);
  check('stroke play counts for the handicap by default', (await pg.$eval('#soloMode .on', e => e.textContent)) === 'Counts for handicap');
  await pg.tap('.tee-card.blue'); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.__pureStrike.sink()); await pg.waitForTimeout(1800);
  let p = await pu();
  check('a handicap round has no power-ups, even after an ace', !p.on && p.slots.length === 0 && await pg.$eval('#puBar', e => e.hidden));

  // 2. Arcade: earn one with a birdie (an ace here)
  await fresh();
  await pg.tap('#soloBtn'); await pg.tap('#soloMode [data-arcade="1"]');
  check('Arcade explains itself before you tee off', /Power-ups on.*don't count toward your handicap/.test(await pg.$eval('#soloNote', e => e.textContent)), await pg.$eval('#soloNote', e => e.textContent));
  await pg.tap('.tee-card.blue'); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.__pureStrike.sink());
  await pg.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 8000 });
  await next();
  const seen = await pops(2000);
  p = await pu();
  check('Arcade: a hole-in-one earns a power-up, announced on the next tee with what it does', p.on && p.slots.length === 1 && /POWER-UP!.*FOR YOUR HOLE IN ONE/.test(seen), `${p.slots.join()} | ${seen.slice(-90)}`);
  check('the power-up shows in a slot above the controls', !(await pg.$eval('#puBar', e => e.hidden)) && (await pg.$$eval('#puBar .pu', b => b.length)) === 1);

  // 3. Dead Calm: no wind for one shot, then the wind is back
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(200);
  await pg.evaluate(() => { window.__pureStrike.clearPU(); window.__pureStrike.setWind(9); window.__pureStrike.givePU('calm'); });
  const before = (await pu()).slots.length;
  await pg.evaluate(n => window.__pureStrike.usePU(n - 1), before);
  p = await pu();
  check('Dead Calm: the wind drops to 0 and the slot shows it is on', p.wind === 0 && p.slots.includes('calm*') && (await pg.$eval('#windVal', e => e.textContent)) === '0', `wind ${p.wind}, ${p.slots.join()}`);
  await pg.evaluate(() => window.__pureStrike.strikeP(0.5, 0.2)); await settle();
  p = await pu();
  check('Dead Calm: after that shot the wind is back and the power-up is spent', p.wind === 9 && !p.slots.some(x => x.startsWith('calm')), `wind ${p.wind}, ${p.slots.join()}`);

  // 4. Sweet Spot: the pure window doubles for one swing
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(200);
  const w0 = (await pu()).win;
  await pg.evaluate(() => { window.__pureStrike.givePU('sweet'); window.__pureStrike.usePU(window.__pureStrike.pu().slots.length - 1); });
  const w1 = (await pu()).win;
  await pg.evaluate(() => window.__pureStrike.strikeP(0.5, 0.2)); await settle();
  const w2 = (await pu()).win;
  check('Sweet Spot: the pure window doubles for the next swing only', Math.abs(w1 - 2 * w0) < 1e-9 && Math.abs(w2 - w0) < 1e-9, `${w0} → ${w1} → ${w2}`);

  // 5. Mulligan: the last shot never happened
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(200);
  const tee = await pg.evaluate(() => window.__pureStrike.ball());
  await pg.evaluate(() => window.__pureStrike.strikeP(0.9, 0.3)); await settle();
  const after = await pg.evaluate(() => window.__pureStrike.ball());
  await pg.evaluate(() => { window.__pureStrike.givePU('mull'); window.__pureStrike.usePU(window.__pureStrike.pu().slots.length - 1); }); await pg.waitForTimeout(300);
  const back = await pg.evaluate(() => window.__pureStrike.ball());
  check('Mulligan: back to where the last shot was played, with the stroke (and any penalty) taken back', after.strokes >= 1 && back.strokes === 0 && Math.abs(back.x - tee.x) < 0.01 && Math.abs(back.y - tee.y) < 0.01 && back.mode === 'aim', `strokes ${after.strokes} → ${back.strokes}`);

  // 6. Read: the exact line on the next putt
  await pg.evaluate(() => window.__pureStrike.clearPU());
  const pin = await pg.evaluate(() => window.__pureStrike.aim().pin);
  await pg.evaluate(([x, y]) => window.__pureStrike.shotTo(x, y), [pin.x + 1, pin.y - 6]); await pg.waitForTimeout(1800);
  const v = await pg.evaluate(() => window.__pureStrike.puttView());
  await pg.mouse.move(v.ball.x, v.ball.y); await pg.mouse.down(); await pg.mouse.move(v.ball.x, v.ball.y + 60, { steps: 4 });
  const noLine = (await pu()).pred; await pg.mouse.move(v.ball.x, v.ball.y, { steps: 2 }); await pg.mouse.up();
  await pg.evaluate(() => { window.__pureStrike.givePU('read'); window.__pureStrike.usePU(window.__pureStrike.pu().slots.length - 1); });
  await pg.mouse.move(v.ball.x, v.ball.y); await pg.mouse.down(); await pg.mouse.move(v.ball.x, v.ball.y + 60, { steps: 4 });
  const line = (await pu()).pred;
  await pg.screenshot({ path: path.join(__dirname, 'powerup-read.png') });
  await pg.mouse.up(); await settle();
  check('Read: the putt line shows only with Read on, and it is spent on that putt', !noLine && line && !(await pu()).slots.some(x => x.startsWith('read')));

  // 7. full slots: a third one is missed
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(200);
  await pg.evaluate(() => { window.__pureStrike.clearPU(); window.__pureStrike.givePU('calm'); window.__pureStrike.givePU('sweet'); });
  await pg.screenshot({ path: path.join(__dirname, 'powerup-slots.png') });
  await pg.evaluate(() => window.__pureStrike.sink());
  await pg.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 8000 });
  await next(); const missed = await pops(2500);
  check('with both slots full, a birdie\'s power-up is not added, and it says why on the next tee', (await pu()).slots.length === 2 && /SLOTS FULL/.test(missed), missed.slice(-100));

  // 7b. an earned power-up waits until the ball is at rest (never talks over the shot)
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__pureStrike.clearPU());
  await pg.evaluate(() => window.__pureStrike.setWind(0));
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window.__pureStrike.strikeP(0.6, 0); window.__pureStrike.earnNow('test'); });
  await pg.waitForTimeout(300);
  const midFlight = await pg.$eval('#pops', e => e.innerText), q = await pg.evaluate(() => window.__pureStrike.puQueue());
  check('an earned power-up is not announced mid-shot', !/POWER-UP|SLOTS FULL/.test(midFlight) && q === 1, `queue ${q} | ${midFlight.replace(/\s+/g, ' ').slice(0, 80)}`);
  const atRest = await pops(5000);
  check('…it arrives once the ball is at rest', /POWER-UP!/.test(atRest) && (await pu()).slots.length === 1, atRest.slice(-80));
  await pg.evaluate(() => { window.__pureStrike.givePU('calm'); window.__pureStrike.restartHole(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__pureStrike.strikeP(0.6, 0)); await pg.evaluate(() => window.__pureStrike.earnNow('nuclear drive'));
  const full = await pops(5000);
  check("with both slots full it says so plainly, once, after the shot", /SLOTS FULL.*use one to make room/i.test(full) && !/POWER-UP MISSED/.test(full), full.slice(-120));

  // 8. an arcade round never posts to the handicap
  const rounds0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('pure-strike-v1')).rounds.length);
  // finish the round from wherever it stands
  for (let i = 0; i < 3; i++) {
    if (await pg.$eval('#result', e => e.hidden)) { await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(250); }
    if (!(await pg.$eval('#againBtn', e => e.textContent)).startsWith('Next')) break;
    await next();
  }
  const hcpTxt = await pg.$eval('#resHcp', e => e.innerText);
  const rounds1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('pure-strike-v1')).rounds.length);
  check("Arcade round: the result says it doesn't count, and the handicap is untouched", /Arcade round/.test(hcpTxt) && rounds1 === rounds0, hcpTxt.replace(/\n/g, ' '));

  // 9. match play: power-ups on for both sides; using one keeps the match off your handicap
  await fresh({ allUnlocked: true });
  await pg.tap('#matchBtn'); await pg.waitForTimeout(150); await pg.tap('#oppList button[data-opp="0"]'); await pg.waitForTimeout(400);
  check('match play has power-ups on', (await pu()).on);
  await pg.evaluate(() => { Math.random = () => 0.1; window.__pureStrike.oppPU(1); window.__pureStrike.oppFinish(); window.__pureStrike.score(4, 2); });
  await pg.waitForTimeout(200); await pg.tap('#againBtn');
  const oppSeen = await pops(2200);
  check('the computer plays a power-up it earned, and you see it', /DUSTY USES/.test(oppSeen), oppSeen.slice(0, 120));
  // your turn (whoever won the toss), then play one
  await pg.evaluate(() => window.__pureStrike.oppFinish()); await pg.waitForTimeout(200);
  await pg.evaluate(() => { window.__pureStrike.givePU('calm'); window.__pureStrike.usePU(0); });
  check('you can play a power-up in a match', (await pu()).used === 1, `used ${(await pu()).used}`);
  await pg.evaluate(() => window.__pureStrike.setAi([9, 9, 9]));
  // play out the match (it may end early, 2 & 1)
  for (let i = 0; i < 2; i++) {
    await pg.evaluate(() => { window.__pureStrike.oppFinish(); window.__pureStrike.score(3, 1); }); await pg.waitForTimeout(250);
    if (!(await pg.$eval('#againBtn', e => e.textContent)).startsWith('Next')) break;
    await next();
  }
  const mt = await pg.$eval('#resHcp', e => e.innerText);
  check("a match where you used a power-up doesn't count toward your handicap", /power-up.*doesn't count/.test(mt), mt.replace(/\n/g, ' '));

  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
