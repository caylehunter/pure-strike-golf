// Daily challenge: the same hole and wind for everyone each day, one counted try, a streak, and a Wordle-style share.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const day = d => pg.clock.setFixedTime(new Date(`2026-11-${String(d).padStart(2, '0')}T15:00:00`));
  const daily = () => pg.evaluate(() => window.__pureStrike.daily());
  const settle = async () => { for (let k = 0; k < 90; k++) { await pg.waitForTimeout(100); const m = (await pg.evaluate(() => window.__pureStrike.ball())).mode; if (!/flight|roll|rest/.test(m)) break; } await pg.waitForTimeout(300); };

  await day(3);
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [12, 12, 12, 12, 12].map(d => ({ d })), onboarded: true })));
  await pg.reload(); await pg.waitForTimeout(300);
  let d = await daily();
  check('Nov 3 is Daily #7 (Daily #1 was Oct 28)', d.n === 7, `#${d.n}`);
  const title = await pg.$eval('#dailyTitle', e => e.textContent);
  check('the menu names today\'s hole', title.startsWith('Daily challenge #7 · '), title);
  // the same plan on every device: a second page computes the same hole and wind
  const pg2 = await ctx.newPage(); await pg2.goto(PAGE); await pg2.waitForTimeout(200);
  const d2 = await pg2.evaluate(() => window.__pureStrike.daily()); await pg2.close();
  check('every phone gets the same hole and wind for the day', d2.plan.hole === d.plan.hole && d2.plan.wind.mph === d.plan.wind.mph, `hole ${d.plan.hole + 1}, ${d.plan.wind.mph.toFixed(1)} mph`);
  const holes = new Set(); for (let n = 1; n <= 40; n++) holes.add(await pg.evaluate(n => window.__pureStrike.dailyPlanFor(n).hole, n));
  check('over 40 days it visits every hole', holes.size === 9, `${holes.size} different holes`);

  // play it: one shot, then hole out
  await pg.tap('#dailyBtn'); await pg.waitForTimeout(500);
  const hud = await pg.$eval('#holeLbl', e => e.textContent), wind = await pg.$eval('#windVal', e => e.textContent);
  check('the HUD says Daily #7 and the wind is the day\'s wind', hud === 'Daily #7' && +wind === Math.round(d.plan.wind.mph), `${hud}, ${wind} mph`);
  check('no power-ups in the daily (pure skill)', !(await pg.evaluate(() => window.__pureStrike.pu())).on);
  await pg.evaluate(() => window.__pureStrike.strikeP(0.7, 0)); await settle();
  await pg.evaluate(() => window.__pureStrike.sink());
  await pg.waitForFunction(() => !document.querySelector('#dailyDone').hidden, null, { timeout: 8000 }).catch(() => {});
  check('finishing shows the daily card', !(await pg.$eval('#dailyDone', e => e.hidden)));
  const grid = await pg.$eval('#ddGrid', e => e.textContent), share = await pg.$eval('#ddShare', e => e.textContent);
  check('the grid has one emoji per stroke, ending in ⛳', [...grid].filter(c => c !== '️').length >= 2 && grid.endsWith('⛳') && /🟡|⚪|🟠|💥|💧|🚫/.test(grid), grid);
  check('the share text: number, hole, score and grid', /^Pure Strike Daily #7 ⛳\n.+ · Par \d · .+\n/.test(share) && share.includes(grid), share.replace(/\n/g, ' / '));
  await pg.tap('#ddShareBtn'); await pg.waitForTimeout(300);
  const clip = await pg.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  check('Share copies it, ready to paste into a group chat', clip === share && /Copied/.test(await pg.$eval('#ddStatus', e => e.textContent)), await pg.$eval('#ddStatus', e => e.textContent));
  const rounds = await pg.evaluate(() => JSON.parse(localStorage.getItem('pure-strike-v1')).rounds.length);
  check("the daily doesn't touch the handicap", rounds === 5);

  // same day again: the counted score stays; practice is allowed
  await pg.tap('#ddMenu'); await pg.waitForTimeout(200);
  check('back on the menu, the card shows today\'s result', /Today: .+⛳/.test(await pg.$eval('#dailySub', e => e.textContent)), await pg.$eval('#dailySub', e => e.textContent));
  await pg.tap('#dailyBtn'); await pg.waitForTimeout(200);
  check('tapping it again shows the result to share, not a new try', !(await pg.$eval('#dailyDone', e => e.hidden)) && !(await pg.$eval('#ddPractice', e => e.hidden)));
  await pg.tap('#ddPractice'); await pg.waitForTimeout(500);
  check('a practice run is labeled as one', (await pg.$eval('#holeLbl', e => e.textContent)) === 'Daily #7 · practice');
  await pg.evaluate(() => window.__pureStrike.score(9, 3)); await pg.waitForTimeout(300);
  d = await daily();
  check("a practice run doesn't change today's score", d.store.results[7].strokes !== 9 && /Practice run/.test(await pg.$eval('#ddSub', e => e.textContent)));

  // streaks: tomorrow continues it, a skipped day resets it
  await day(4); await pg.reload(); await pg.waitForTimeout(300);
  await pg.tap('#dailyBtn'); await pg.waitForTimeout(400); await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(300);
  check('playing the next day makes a 2-day streak', (await daily()).store.streak === 2 && /2-day streak/.test(await pg.$eval('#ddShare', e => e.textContent)), (await daily()).store.streak + '');
  await day(6); await pg.reload(); await pg.waitForTimeout(300);
  await pg.tap('#dailyBtn'); await pg.waitForTimeout(400); await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(300);
  d = await daily();
  check('skipping a day starts the streak over (best is kept)', d.store.streak === 1 && d.store.best === 2, `streak ${d.store.streak}, best ${d.store.best}`);
  await pg.screenshot({ path: path.join(__dirname, 'daily-done.png') });

  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
