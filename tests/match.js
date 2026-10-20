// Match play vs the computer: pops, the per-hole target, early finish, ladder unlocks.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const shot = name => pg.screenshot({ path: path.join(__dirname, name) });
  // a 15-handicap player (five rounds rated 15)
  await pg.goto(PAGE);
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [15, 15, 15, 15, 15].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);

  await pg.tap('#matchBtn'); await pg.waitForTimeout(200);
  const opps = await pg.$$eval('#oppList button', b => b.map(x => ({ t: x.innerText.replace(/\s+/g, ' '), off: x.disabled })));
  check('Dusty open; against a 15 he gets 2 strokes', !opps[0].off && opps[0].t.includes('Dusty gets 2 strokes'), opps[0].t);
  check('Marge locked until Dusty is beaten', opps[1].off && opps[1].t.includes('beat Dusty'), opps[1].t);
  await shot('match-setup.png');

  // match 1: Dusty pars every hole; his 2 pops fall on hole 2 (hardest) and hole 1
  await pg.tap('#oppList button[data-opp="0"]'); await pg.waitForTimeout(600);
  await pg.evaluate(() => window.__pureStrike.setAi([3, 4, 5])); await pg.waitForTimeout(100);
  let m = await pg.evaluate(() => window.__pureStrike.match());
  check('match bar states the target', m.bar.includes('Dusty made par (3)') && m.bar.includes('Dusty gets a stroke') && m.bar.includes('an ace wins, 2 halves'), m.bar.replace(/\n/g, ' / '));
  await shot('match-hole1.png');
  await pg.evaluate(() => window.__pureStrike.score(2, 1)); await pg.waitForTimeout(150);
  check('birdie 2 vs Dusty net 2 halves the hole', (await pg.$eval('#resSub', e => e.textContent)).includes('Hole halved · ALL SQUARE'));
  await pg.tap('#againBtn'); await pg.waitForTimeout(500);
  await pg.evaluate(() => window.__pureStrike.score(3, 1)); await pg.waitForTimeout(150);
  await pg.tap('#againBtn'); await pg.waitForTimeout(500);
  m = await pg.evaluate(() => window.__pureStrike.match());
  check('hole 3 has no pops: 4 wins, 5 halves', m.bar.includes('4 wins, 5 halves') && !m.bar.includes('gets'), m.bar.replace(/\n/g, ' / '));
  await pg.evaluate(() => window.__pureStrike.score(4, 1)); await pg.waitForTimeout(150);
  check('final: you won 1 up', (await pg.$eval('#resName', e => e.textContent)) === 'You won 1 up', await pg.$eval('#resName', e => e.textContent));
  check('beating Dusty unlocks Marge', (await pg.$eval('#resUnlock', e => e.textContent)).includes('New opponent: Marge'));
  await shot('match-final.png');

  // match 2: an early finish, 2 & 1
  await pg.tap('#againBtn'); await pg.waitForTimeout(600);
  await pg.evaluate(() => window.__pureStrike.setAi([6, 7, 8]));
  await pg.evaluate(() => window.__pureStrike.score(3, 1)); await pg.waitForTimeout(150);
  await pg.tap('#againBtn'); await pg.waitForTimeout(500);
  await pg.evaluate(() => window.__pureStrike.score(4, 1)); await pg.waitForTimeout(150);
  check('2 up with 1 to play ends the match 2 & 1', (await pg.$eval('#resSub', e => e.textContent)).includes('match won 2 & 1'), await pg.$eval('#resSub', e => e.textContent));
  await pg.tap('#againBtn'); await pg.waitForTimeout(500);
  m = await pg.evaluate(() => window.__pureStrike.match());
  check('hole 3 bar says finish for your handicap', m.bar.includes('finish for your handicap'), m.bar.replace(/\n/g, ' / '));
  await pg.evaluate(() => window.__pureStrike.score(9, 3)); await pg.waitForTimeout(150);
  check('result stays won 2 & 1', (await pg.$eval('#resName', e => e.textContent)) === 'You won 2 & 1');
  await pg.tap('#resMenu'); await pg.waitForTimeout(300); await pg.tap('#matchBtn'); await pg.waitForTimeout(200);
  check('Dusty record shows 2–0', (await pg.$eval('#oppList button[data-opp="0"] .tag', e => e.textContent)) === '2–0');
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
