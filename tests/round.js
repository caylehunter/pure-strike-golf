// A full 3-hole round: scorecard, handicap update, and unlocks for a new player.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };

  check('black tees locked for a new player', await pg.$eval('.tee-card.black', e => e.disabled), await pg.$eval('#blackInfo', e => e.textContent));
  await pg.tap('.tee-card.blue'); await pg.waitForTimeout(600);
  check('round starts on hole 1, par 3', (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 3'), await pg.$eval('#holeLbl', e => e.textContent));
  const shot = name => pg.screenshot({ path: path.join(__dirname, name) });
  await shot('hole1.png');
  // hole 1: birdie 2 with one putt
  await pg.evaluate(() => window.__pureStrike.score(2, 1)); await pg.waitForTimeout(200);
  check('hole card shows birdie', (await pg.$eval('#resName', e => e.textContent)) === 'Birdie');
  check('birdie unlocks Swing tempo Lv 2', (await pg.$eval('#resUnlock', e => e.textContent)).includes('Swing tempo Lv 2'));
  await shot('card1.png');
  await pg.tap('#againBtn'); await pg.waitForTimeout(600);
  check('hole 2 is a par 4', (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 4'), await pg.$eval('#holeLbl', e => e.textContent));
  await shot('hole2.png');
  await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(200);
  await pg.tap('#againBtn'); await pg.waitForTimeout(600);
  check('hole 3 is a par 5', (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 5'));
  await shot('hole3.png');
  await pg.evaluate(() => window.__pureStrike.score(5, 2)); await pg.waitForTimeout(200);
  const name = await pg.$eval('#resName', e => e.textContent), hcp = await pg.$eval('#resHcp', e => e.textContent);
  check('round total 11, one under', name === '11 · -1', name);
  check('handicap drops from 36.0', /Handicap 36\.0 → (\S+)/.test(hcp) && !hcp.includes('→ 36.0'), hcp.split('.')[0] + '.' + hcp.split('.')[1]);
  check('black tees unlocked', (await pg.$eval('#resUnlock', e => e.textContent)).includes('Black tees'));
  await shot('card-final.png');
  await pg.tap('#resMenu'); await pg.waitForTimeout(400);
  check('menu: black tees playable', !(await pg.$eval('.tee-card.black', e => e.disabled)));
  await shot('menu.png');
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
