// Menu flow and getting out: mode first, Back buttons, pause, quit, concede a match hole.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const vis = q => pg.$eval(q, e => !e.hidden);
  const shot = name => pg.screenshot({ path: path.join(__dirname, name) });
  await pg.goto(PAGE);
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [15, 15, 15, 15, 15].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);
  await shot('nav-menu.png');

  check('menu offers modes, not tees', await vis('#soloBtn') && await vis('#matchBtn') && !(await pg.$eval('.tee-card.blue', e => e.offsetParent !== null)));
  await pg.tap('#soloBtn'); await pg.waitForTimeout(150);
  check('stroke play opens the tee screen, nothing starts', await vis('#soloSetup') && (await pg.evaluate(() => window.__pureStrike.state().mode)) === 'menu');
  await shot('nav-tees.png');
  await pg.tap('#soloBack'); await pg.waitForTimeout(150);
  check('Back returns to the menu', await vis('#menu') && !(await vis('#soloSetup')));
  await pg.tap('#matchBtn'); await pg.waitForTimeout(150);
  await pg.tap('#msBack'); await pg.waitForTimeout(150);
  check('match setup Back returns to the menu', await vis('#menu'));

  // start a stroke round, pause, resume, then quit
  await pg.tap('#soloBtn'); await pg.tap('.tee-card.blue'); await pg.waitForTimeout(500);
  await pg.tap('#pauseBtn'); await pg.waitForTimeout(150);
  check('pause opens during a round', await vis('#pause'));
  check('no concede outside match play', !(await vis('#pzConcede')));
  await shot('nav-pause.png');
  await pg.tap('#pzResume'); await pg.waitForTimeout(150);
  check('resume returns to play', !(await vis('#pause')) && (await pg.evaluate(() => window.__pureStrike.state().mode)) === 'aim');
  await pg.evaluate(() => window.__pureStrike.score(3, 2)); await pg.tap('#againBtn'); await pg.waitForTimeout(400);
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => window.__pureStrike.state());
  check('quit goes to the menu and the round does not count', st.mode === 'menu' && await vis('#menu') && st.rounds === 5, `rounds ${st.rounds}`);

  // match: concede hole 1
  await pg.tap('#matchBtn'); await pg.tap('#oppList button[data-opp="0"]'); await pg.waitForTimeout(400);
  await pg.tap('#pauseBtn'); await pg.waitForTimeout(150);
  check('concede offered in match play', await vis('#pzConcede'));
  await shot('nav-pause-match.png');
  await pg.tap('#pzConcede'); await pg.waitForTimeout(250);
  const sub = await pg.$eval('#resSub', e => e.textContent), m = await pg.evaluate(() => window.__pureStrike.match());
  check('conceding loses the hole: 1 DOWN', sub.includes('Hole conceded · 1 DOWN') && m.res[0] === -1, sub);
  await pg.tap('#againBtn'); await pg.waitForTimeout(400);
  check('next hole starts with the opponent playing', (await pg.evaluate(() => window.__pureStrike.opp().mode)) === 'opp' && (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 4'));
  await pg.tap('#pauseBtn'); await pg.tap('#pzQuit'); await pg.waitForTimeout(300);
  await pg.tap('#matchBtn'); await pg.waitForTimeout(150);
  check('quitting a match leaves the record unchanged', (await pg.$eval('#oppList button[data-opp="0"] .tag', e => e.textContent)) === '0–0');
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
