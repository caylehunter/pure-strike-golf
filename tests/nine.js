// The 9-hole course: a full round, scaled handicap and pops, a 5 & 4 finish,
// water drops on the island green and the creek, and opponent shots on every hole.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');
const PLAYER = h => JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [h, h, h, h, h].map(d => ({ d })) });

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  await pg.goto(PAGE); await pg.evaluate(p => localStorage.setItem('pure-strike-v1', p), PLAYER(15)); await pg.reload(); await pg.waitForTimeout(400);

  const holes = await pg.evaluate(() => window.__pureStrike.holes());
  check('9 holes, par 36, every tee box and pin on the right surface', holes.length === 9 && holes.reduce((x, h) => x + h.par, 0) === 36 && holes.every(h => h.teeOk && h.pinOk), holes.map(h => `${h.name} ${h.par}`).join(', '));

  await pg.tap('#soloBtn'); await pg.waitForTimeout(150);
  check('9 holes is the default length', (await pg.$eval('.len-seg button.on', e => e.dataset.len)) === '9');
  await pg.tap('.tee-card.blue'); await pg.waitForTimeout(500);
  check('the hole banner names the hole', /Pond Carry/i.test(await pg.$eval('#pops', e => e.innerText)) && (await pg.$eval('#holeLbl', e => e.textContent)) === 'Hole 1 of 9');
  for (let i = 0; i < 9; i++) { await pg.evaluate(p => window.__pureStrike.score(p, 2), holes[i].par); await pg.waitForTimeout(120); if (i < 8) { await pg.tap('#againBtn'); await pg.waitForTimeout(350); } }
  check('nine pars: 36, even', (await pg.$eval('#resName', e => e.textContent)) === '36 · E');
  const hcp = await pg.$eval('#resHcp', e => e.textContent);
  check('an even-par 9 from the blue tees rates 0.0 (and is capped against a 15)', hcp.includes('rated 0.0') && hcp.includes('counts as 9.0'), hcp.slice(0, 80));
  check('the scorecard shows 9 holes', (await pg.$$eval('#resCard tr:first-child th', t => t.length)) === 11);
  await pg.screenshot({ path: path.join(__dirname, 'card9.png') });

  // water drops: in front of the island green, and in the creek on Long Haul
  await pg.tap('#resMenu'); await pg.waitForTimeout(250);
  await pg.tap('#soloBtn'); await pg.tap('.tee-card.blue'); await pg.waitForTimeout(400);
  for (let i = 0; i < 4; i++) { await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(100); await pg.tap('#againBtn'); await pg.waitForTimeout(350); }
  let d = await pg.evaluate(() => window.__pureStrike.drop(4, 145));
  check('island green: a ball in the moat drops behind it, not on the green', d.y < 137 && Math.abs(d.x) < 5 && !/water|green|fringe/.test(d.s), `drop at (${d.x.toFixed(0)}, ${d.y.toFixed(0)}) on ${d.s}`);
  await pg.evaluate(() => window.__pureStrike.score(3, 2)); await pg.waitForTimeout(100); await pg.tap('#againBtn'); await pg.waitForTimeout(350);
  d = await pg.evaluate(() => window.__pureStrike.drop(0, 480));
  check('Long Haul: a ball in the creek drops short of it, on the hole', d.y < 474 && Math.abs(d.x) < 25 && !/water/.test(d.s), `drop at (${d.x.toFixed(0)}, ${d.y.toFixed(0)}) on ${d.s}`);

  // 9-hole match vs Dusty (28) for a 15: 7 strokes, on stroke index 1-7
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(250);
  await pg.tap('#matchBtn'); await pg.waitForTimeout(150);
  const myH = (await pg.evaluate(() => window.__pureStrike.state())).hcp, want = Math.round((28 - myH) * 9 / 18);
  check(`setup shows 9-hole strokes: Dusty (28) gets ${want} against a ${myH}`, (await pg.$eval('#oppList button[data-opp="0"]', e => e.innerText)).includes(`Dusty gets ${want} strokes`));
  await pg.tap('#oppList button[data-opp="0"]'); await pg.waitForTimeout(400);
  const m0 = await pg.evaluate(() => window.__pureStrike.match());
  check('the match uses that many pops: half the handicap gap over 9 holes', m0.n === want && !m0.meGets, `${m0.n} pops`);
  const spread = await pg.evaluate(() => window.__pureStrike.popsTotal());
  check('the pops spread over the 9 holes add up to exactly that', spread === want, `${spread} on the card`);
  // win holes 1-5 by a mile: 5 up with 4 to play ends it 5 & 4
  await pg.evaluate(() => window.__pureStrike.setAi([9, 9, 9, 9, 9, 9, 9, 9, 9]));
  for (let i = 0; i < 5; i++) { await pg.evaluate(() => { window.__pureStrike.oppFinish(); window.__pureStrike.score(3, 1); }); await pg.waitForTimeout(120); if (i < 4) { await pg.tap('#againBtn'); await pg.waitForTimeout(350); } }
  check('5 up with 4 to play: you won 5 & 4', (await pg.$eval('#resName', e => e.textContent)) === 'You won 5 & 4', await pg.$eval('#resName', e => e.textContent));
  check('holes 6-9 posted as net par, faded', (await pg.$$eval('#resCard .np', e => e.length)) === 4);
  await pg.screenshot({ path: path.join(__dirname, 'match9.png') });

  // the opponent can play every hole: right shot count, never in water or out of bounds
  await pg.tap('#againBtn'); await pg.waitForTimeout(300);
  let bad = 0, offGreen = 0, miscount = 0;
  for (let k = 0; k < 108; k++) {
    const hole = k % 9, par = holes[hole].par, S = par - 2 + Math.floor(k / 9) % 6;
    const r = await pg.evaluate(([h, S]) => window.__pureStrike.planOn(h, S), [hole, S]);
    if (r.wet) bad++; if (r.putts && r.onGreen !== 'green') offGreen++; if (r.shots !== S) miscount++;
  }
  check('108 planned holes across all 9: shot count equals score', miscount === 0, `${miscount} wrong`);
  check('no computer shot finishes in water or out of bounds', bad === 0, `${bad} bad`);
  check('approaches before putting finish on the green', offGreen === 0, `${offGreen} off`);
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
