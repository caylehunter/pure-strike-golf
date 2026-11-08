// Long Drive vs Tank: the grid, Tank's mark, six balls, only balls in the grid count, the nuke decides it.
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
  const P = (f, a) => pg.evaluate(f, a);
  await pg.goto(PAGE);
  // a new-ish player: black tees not unlocked, but the contest still hands them the nuke
  await P(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, seenTut: true, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [25, 25, 25, 25, 25].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);

  const smp = await P(() => window.__pureStrike.ldSample(4000));
  check('Tank bombs it about 470 and about one in five leaves the grid', Math.abs(smp.mean - 468) < 4 && smp.out > 0.12 && smp.out < 0.3, `${smp.mean.toFixed(0)} yds, ${(smp.out * 100).toFixed(0)}% out`);

  check('menu has Long Drive vs Tank', /long drive vs tank/i.test(await pg.$eval('#ldBtn', e => e.innerText)));
  await pg.tap('#ldBtn'); await pg.waitForTimeout(3300);
  let L = await P(() => window.__pureStrike.ld());
  check('Tank goes first on The Grid', L && L.hole === 'The Grid' && L.mode === 'opp' && /LONG DRIVE VS TANK/.test(L.bar) && /Tank: ball 1 of 3/.test(L.bar), L && L.bar.replace(/\n/g, ' / '));
  await shot('ld-tank.png');
  await pg.waitForFunction(() => { window.__pureStrike.ldSkip(); return window.__pureStrike.ld().mode === 'aim'; }, null, { timeout: 40000, polling: 250 });
  L = await P(() => window.__pureStrike.ld());
  const best = Math.max(0, ...L.their.filter(x => x.in).map(x => x.d));
  check('three balls, and his mark is his best in the grid', L.their.length === 3 && Math.abs(L.tb - best) < 0.01, L.their.map(x => `${Math.round(x.d)}${x.in ? '' : ' out'}`).join(', '));
  check('your turn: driver, the nuke is on even without black tees, ball 1 of 6', L.canNuke && L.ball.y === 0 && /ball 1 of 6/.test(L.bar), L.bar.replace(/\n/g, ' / '));
  const hud = await P(() => [document.querySelector('#holeLbl').textContent, document.querySelector('#pinLbl').textContent, document.querySelector('#strokeVal').textContent]);
  check('HUD shows the contest, the mark and the ball count', hud[0] === 'Long Drive vs Tank' && hud[1] === 'Mark' && hud[2] === '1/6', hud.join(' | '));

  const hit = async (p, n, nuke) => {
    await pg.waitForFunction(() => window.__pureStrike.ld().mode === 'aim', null, { timeout: 30000 });
    if (nuke) await P(() => document.querySelector('#nukeBtn').click());
    const k = (await P(() => window.__pureStrike.ld())).my.length;
    await P(([p, n]) => window.__pureStrike.strikeP(p, n), [p, n]);
    await pg.waitForFunction(k => window.__pureStrike.ld().my.length > k, k, { timeout: 30000 });
    return (await P(() => window.__pureStrike.ld())).my[k];
  };
  // 1: a wild nuke: long, and off into the trees: doesn't count
  const wild = await hit(1.03, 0.12, true);
  check('a wild nuke flies out of the grid and does not count', !wild.in, `${Math.round(wild.d)} yds`);
  const pops = await pg.$eval('#pops', e => e.innerText);
  check("the call-out says it doesn't count", /doesn't count/i.test(pops), pops.replace(/\s+/g, ' ').slice(0, 80));
  // 2: a smooth driver: in the grid, nowhere near Tank
  const smooth = await hit(1.0, 0, false);
  check('a pure driver without the nuke stays in the grid but is about 300', smooth.in && smooth.d > 270 && smooth.d < 340, `${Math.round(smooth.d)} yds`);
  await shot('ld-mine.png');
  // 3: a pure nuke down the middle
  const bomb = await hit(1.03, 0, true);
  check('a pure nuke down the middle goes 470+', bomb.in && bomb.d > 465, `${Math.round(bomb.d)} yds vs mark ${Math.round(L.tb)}`);
  await shot('ld-bomb.png');
  // pause mid-contest
  await pg.waitForFunction(() => window.__pureStrike.ld().mode === 'aim', null, { timeout: 30000 });
  await pg.tap('#pauseBtn'); await pg.waitForTimeout(150);
  check('pause names the contest and has no concede', (await pg.$eval('#pzEyebrow', e => e.textContent)) === 'Long Drive vs Tank' && await P(() => document.querySelector('#pzConcede').hidden));
  await pg.tap('#pzResume');
  for (let k = 0; k < 3; k++) await hit(0.6, 0, false);
  await pg.waitForFunction(() => window.__pureStrike.ld().done, null, { timeout: 15000 });
  L = await P(() => window.__pureStrike.ld());
  const won = L.mb > L.tb, name = await pg.$eval('#ldName', e => e.textContent), rows = await pg.$eval('#ldRows', e => e.innerText.replace(/\s+/g, ' '));
  check('after 6 balls the result: winner, both rows of balls', L.my.length === 6 && (won ? /out-bombed/.test(name) : /Tank wins/.test(name)) && /tank/i.test(rows) && /you/i.test(rows), `${name} · ${rows}`);
  const rec = await P(() => window.__pureStrike.ldRec());
  check('record and longest drive saved', rec.dusty && rec.dusty.w + rec.dusty.l === 1 && Math.abs(rec.dusty.best - L.mb) < 0.01, JSON.stringify(rec));
  await shot('ld-done.png');
  await pg.tap('#ldAgain'); await pg.waitForTimeout(400);
  L = await P(() => window.__pureStrike.ld());
  check('Rematch starts a fresh contest', L && L.their.length === 0 && L.my.length === 0);
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(300);
  check('quitting leaves the contest and the course is back', (await P(() => window.__pureStrike.ld())) === null && (await P(() => window.__pureStrike.ldRec())).dusty.w + (await P(() => window.__pureStrike.ldRec())).dusty.l === 1);
  await pg.tap('#soloBtn'); await pg.waitForTimeout(100); await pg.tap('#soloSetup [data-tee="blue"]'); await pg.waitForTimeout(500);
  check('a round after it plays the real hole 1', (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 3'), await pg.$eval('#holeVal', e => e.textContent));
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  await br.close();
  if (checks.includes(false)) process.exit(1);
})();
