// Signature holes: each is built around one decision, and the numbers back it up (no wind, blue tees unless noted).
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const H = () => pg.evaluate(() => window.__pureStrike);
  const toHole = async (tee, n) => {
    await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [10, 10, 10, 10, 10].map(d => ({ d })), onboarded: true, allUnlocked: true })));
    await pg.reload(); await pg.waitForTimeout(300); await pg.evaluate(() => window.__pureStrike.setLen(9));
    await pg.click('#soloBtn'); await pg.click('.tee-card.' + tee); await pg.waitForTimeout(400);
    for (let i = 1; i < n; i++) { await pg.evaluate(() => window.__pureStrike.score(4, 2)); await pg.waitForTimeout(60); await pg.click('#againBtn'); await pg.waitForTimeout(250); }
  };
  const settle = async () => { let r; for (let k = 0; k < 90; k++) { await pg.waitForTimeout(100); r = await pg.evaluate(() => window.__pureStrike.ball()); if (!/flight|roll|rest/.test(r.mode)) break; } await pg.waitForTimeout(300); return pg.evaluate(() => window.__pureStrike.ball()); };
  const drive = async ({ club, target, p, n = 0 }) => {
    await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(150);
    await pg.evaluate(() => window.__pureStrike.calm());
    if (club) await pg.evaluate(c => window.__pureStrike.setClub(c), club);
    if (target) await pg.evaluate(t => window.__pureStrike.aimAt(t[0], t[1]), target);
    const aim = await pg.$eval('#lblPin', e => e.textContent);
    await pg.evaluate(([p, n]) => window.__pureStrike.strikeP(p, n), [p, n]);
    const r = await settle(); r.aim = aim; r.wet = r.strokes > 1; return r;
  };
  const pin = () => pg.evaluate(() => window.__pureStrike.aim().pin);
  const toPin = (r, P) => Math.round(Math.hypot(r.x - P.x, r.y - P.y));
  const intro = () => pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' '));

  // 2 · The Cape: the safe line stays dry; carrying the lake leaves a much shorter approach
  await toHole('blue', 2);
  check('The Cape is hole 2 and its intro says what to do', /THE CAPE.*CUT THE CORNER OVER THE LAKE/i.test(await intro()), await intro());
  let P = await pin();
  const safe = await drive({ p: 0.89 }), safeShort = await drive({ p: 0.8 });
  check('The Cape: the default (safe) line finds the fairway and stays dry, even a little short', !safe.wet && !safeShort.wet && safe.lie === 'fairway', `${safe.aim} → ${safe.lie}, ${toPin(safe, P)} to go`);
  const hero = await drive({ club: 'D', target: [40, 330], p: 1 });
  check('The Cape: a full drive over the lake leaves 30+ yards less', !hero.wet && toPin(safe, P) - toPin(hero, P) >= 30, `${toPin(hero, P)} vs ${toPin(safe, P)} yds in`);
  const heroShort = await drive({ club: 'D', target: [40, 330], p: 0.9 }), hero3w = await drive({ club: '3W', target: [40, 330], p: 1 });
  check('The Cape: coming up short on that line, or a 3 wood, finds the lake', heroShort.wet && hero3w.wet);

  // 4 · The Gamble: lay up by default; a pure driver carries the pond onto the green; anything soft splashes
  await toHole('blue', 4);
  check('The Gamble is hole 4 and its intro says what to do', /THE GAMBLE.*CARRY THE POND/i.test(await intro()), await intro());
  P = await pin();
  const lay = await drive({ p: 0.64 });
  check('The Gamble: the default aim is a layup short of the pond', parseInt(lay.aim.replace(/\D/g, '')) < 210 && lay.lie === 'fairway', `${lay.aim} → ${lay.lie}, ${toPin(lay, P)} to go`);
  const go = await drive({ club: 'D', target: [P.x, P.y], p: 1 });
  check('The Gamble: a pure driver at the flag finishes on the green', !go.wet && /green|fringe/.test(go.lie), `${go.lie}, ${toPin(go, P)} yds from the pin`);
  const soft = await drive({ club: 'D', target: [P.x, P.y], p: 0.9 });
  check('The Gamble: a driver at 90% splashes in the pond', soft.wet);

  // 7 · The Ridge: a putt that doesn't clear the ridge rolls back down
  await toHole('blue', 7);
  check('The Ridge is hole 7 and its intro says what to do', /THE RIDGE.*TOP TIER/i.test(await intro()), await intro());
  const putt = async frac => {
    await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(100);
    await pg.evaluate(() => window.__pureStrike.shotTo(-3, 206)); await pg.waitForTimeout(2000);
    const v = await pg.evaluate(() => window.__pureStrike.puttView());
    await pg.mouse.move(v.ball.x, v.ball.y); await pg.mouse.down(); await pg.mouse.move(v.ball.x, v.ball.y + frac * 354, { steps: 6 });
    const flat = +(await pg.$eval('#puttMain', e => e.textContent)).match(/(\d+) ft/)[1];
    await pg.mouse.up(); const r = await settle(); r.flat = flat; return r;
  };
  const weak = await putt(0.35), firm = await putt(0.75);
  check('The Ridge: a 45 ft putt hit for ~35 ft rolls back off the ridge to the lower tier', weak.y < 213.5, `${weak.flat} ft flat roll, finished at y ${weak.y.toFixed(1)} (ridge at 214)`);
  check('The Ridge: hit firmly enough, it climbs onto the top tier', firm.y > 215 || firm.mode !== 'putt', `${firm.flat} ft flat roll, finished at y ${firm.y.toFixed(1)}`);

  // the warm-up keeps its own easy hole
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.click('#welcome [data-exp="golfer"]');
  await pg.fill('#wcHcp', '12'); await pg.click('#wcGo'); await pg.waitForTimeout(500);
  check('the warm-up still plays Short Fuse, off the course', /SHORT FUSE/i.test(await intro()), await intro());

  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
