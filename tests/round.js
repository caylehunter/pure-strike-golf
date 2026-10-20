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
  // a short shot beside the green: the preview must land on the pin, not at the club's full carry
  const chip = await pg.evaluate(() => { window.__pureStrike.place(-12, 190); return window.__pureStrike.aim(); });
  const miss = Math.hypot(chip.x - chip.pin.x, chip.y - chip.pin.y);
  check('chip preview lands on the pin', miss < 1.5, `${chip.club}, lands ${miss.toFixed(1)} yd from pin, mark ${chip.mark}`);
  check('meter mark says PIN', chip.mark === 'PIN');
  await pg.waitForTimeout(800); await shot('chip.png');
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
  // an established 15-handicap shoots 9 (-3): rated +18.0 but counts only 6 strokes better
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [15, 15, 15, 15, 15].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);
  check('menu shows an established handicap', (await pg.$eval('#menuHcp', e => e.textContent)) === 'Handicap 15.0 · 5 rounds played');
  await pg.tap('.tee-card.blue'); await pg.waitForTimeout(500);
  for (const [sc, pu] of [[2, 1], [3, 1], [4, 1]]) { await pg.evaluate(([a, b]) => window.__pureStrike.score(a, b), [sc, pu]); await pg.waitForTimeout(150); if (sc !== 4) { await pg.tap('#againBtn'); await pg.waitForTimeout(400); } }
  const capped = await pg.$eval('#resHcp', e => e.textContent);
  check('one hot round is capped: 15.0 → 12.0', capped.includes('Handicap 15.0 → 12.0') && capped.includes('counts as 9.0'), capped.slice(0, 90));
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
