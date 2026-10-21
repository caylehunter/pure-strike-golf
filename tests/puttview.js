// Putting view: nothing on screen (coach card, match bar, the PUTT/HOLE pill, pop-ups) ever covers the hole.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');
const PILL = 8 + 38; // the PUTT/HOLE pill sits this far below the lowest top overlay

(async () => {
  const br = await chromium.launch();
  const errs = [];
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const clear = v => v.hole.y > v.clearTop + PILL + 6 && v.hole.y < v.ball.y && v.pops.every(p => v.hole.y < p.top - 4 || v.hole.y > p.bottom + 4);
  const info = v => `hole at ${Math.round(v.hole.y)}px, top overlays end at ${Math.round(v.clearTop)}px, ball at ${Math.round(v.ball.y)}px`;
  for (const vp of [{ width: 390, height: 844, name: 'iPhone 15' }, { width: 375, height: 667, name: 'iPhone SE' }]) {
    const pg = await br.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, deviceScaleFactor: 2 });
    pg.on('pageerror', e => errs.push(e.message));
    const view = () => pg.evaluate(() => window.__pureStrike.puttView());
    const toPutt = async () => { for (let i = 0; i < 30 && (await pg.evaluate(() => window.__pureStrike.state().mode)) !== 'putt'; i++) await pg.waitForTimeout(150); await pg.waitForTimeout(1600); };

    // the warm-up: the coach card explains putting at the top of the screen
    await pg.goto(PAGE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
    await pg.tap('#welcome [data-exp="golfer"]'); await pg.fill('#wcHcp', '12'); await pg.tap('#wcGo'); await pg.waitForTimeout(600);
    await pg.evaluate(() => window.__pureStrike.shotTo(9, 397)); await toPutt();
    let v = await view();
    check(`${vp.name} warm-up: the coach card is up and the hole sits below it`, (await pg.evaluate(() => window.__pureStrike.state().mode)) === 'putt' && !!v.coach && clear(v), info(v));
    await pg.screenshot({ path: path.join(__dirname, `puttview-warm-${vp.height}.png`) });

    // a match: the match bar plus the pill
    await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [10, 10, 10, 10, 10].map(d => ({ d })), onboarded: true, allUnlocked: true })));
    await pg.reload(); await pg.waitForTimeout(300);
    await pg.evaluate(() => window.__pureStrike.setLen(3));
    await pg.tap('#matchBtn'); await pg.waitForTimeout(150); await pg.tap('#oppList button[data-opp="1"]'); await pg.waitForTimeout(400);
    await pg.evaluate(() => window.__pureStrike.oppFinish()); await pg.waitForTimeout(300);
    const pin = await pg.evaluate(() => window.__pureStrike.aim().pin);
    for (const yds of [3, 9, 13]) {
      await pg.evaluate(([x, y]) => window.__pureStrike.shotTo(x, y), [pin.x + 1, pin.y - yds]); await toPutt();
      v = await view(); const putting = (await pg.evaluate(() => window.__pureStrike.state().mode)) === 'putt';
      check(`${vp.name} match, ${yds * 3} ft putt: the hole sits below the match bar and the pill`, putting && !!v.matchBar && clear(v), info(v));
      if (yds === 13) await pg.screenshot({ path: path.join(__dirname, `puttview-match-${vp.height}.png`) });
    }
    await pg.close();
  }
  // laptops and phones alike: pulling from the ball to the bottom of the window reaches a full-strength putt
  for (const vp of [{ width: 390, height: 844, name: 'iPhone 15' }, { width: 375, height: 667, name: 'iPhone SE' }, { width: 1440, height: 800, name: 'laptop 1440x800' }, { width: 1366, height: 650, name: 'short laptop window 1366x650' }]) {
    const pg = await br.newPage({ viewport: { width: vp.width, height: vp.height } });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, onboarded: true }))); await pg.reload(); await pg.waitForTimeout(300);
    await pg.evaluate(() => window.__pureStrike.setLen(3)); await pg.click('#soloBtn'); await pg.click('.tee-card.blue'); await pg.waitForTimeout(500);
    const pin = await pg.evaluate(() => window.__pureStrike.aim().pin);
    await pg.evaluate(([x, y]) => window.__pureStrike.shotTo(x, y), [pin.x + 1, pin.y - 13]); await pg.waitForTimeout(2000);
    const v = await pg.evaluate(() => window.__pureStrike.puttView()), full = +(await pg.$eval('#puttSub', e => e.textContent)).match(/full pull ≈ (\d+)/)[1];
    await pg.mouse.move(v.ball.x, v.ball.y); await pg.mouse.down(); await pg.mouse.move(v.ball.x, vp.height - 2, { steps: 8 });
    const got = +(await pg.$eval('#puttMain', e => e.textContent)).match(/(\d+) ft/)[1];
    await pg.mouse.up();
    check(`${vp.name}: pulling from the ball to the bottom edge reaches a full putt`, got >= full, `${got} of ${full} ft`);
    await pg.close();
  }
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
