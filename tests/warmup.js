// First-time players: the welcome question, the guided warm-up, and "You're ready!".
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
  const coach = () => pg.evaluate(() => window.__pureStrike.coach());
  const shot = name => pg.screenshot({ path: path.join(__dirname, name) });
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);

  check('a brand-new player sees the welcome question, not the menu', await vis('#welcome') && !(await vis('#menu')));
  await shot('warm-welcome.png');
  await pg.tap('#welcome [data-exp="golfer"]'); await pg.waitForTimeout(100);
  check('"I\'m a golfer" asks for a handicap', await vis('#wcGolfer'));
  await pg.fill('#wcHcp', '12'); await pg.tap('#wcGo'); await pg.waitForTimeout(600);
  let c = await coach();
  check('the warm-up starts with a coach card: hold the yellow button', c.tutorial && c.shown && c.text.startsWith('Hold the yellow button'), c.step);
  check('the warm-up is windless, on Short Fuse', (await pg.$eval('#windVal', e => e.textContent)) === '0' && (await pg.$eval('#holeVal', e => e.textContent)).startsWith('Par 4'));
  await shot('warm-coach.png');
  // hold: the coach follows each step
  await pg.evaluate(() => document.querySelector('#swingBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })));
  await pg.waitForTimeout(150); c = await coach();
  check('while holding: let go at the mark', /Let go when the bar reaches the (AIM|PIN) mark/.test(c.text), c.text);
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('#swingBtn').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })));
  await pg.waitForTimeout(150); c = await coach();
  check('after letting go: tap when the rings meet', c.text.startsWith('Tap when the white ring meets'), c.text);
  await shot('warm-ring.png');
  const win = (await pg.evaluate(() => window.__pureStrike.heat())).win;
  check('the warm-up sweet spot is extra forgiving', win >= 0.09, `${win}`);
  await pg.evaluate(() => document.querySelector('#swingBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })));
  await pg.waitForFunction(() => window.__pureStrike.coach().shown, null, { timeout: 15000 });
  c = await coach();
  check('after the drive: the approach coaching', /Shot 2 of 3|Putting/.test(c.step), c.step);
  // put the ball on the green: the putting coach
  await pg.evaluate(() => window.__pureStrike.shotTo(9, 397)); await pg.waitForTimeout(800);
  c = await coach();
  check('on the green: how to putt', c.step === 'Last step · Putting' && c.text.includes('gold circle'), c.text.slice(0, 40));
  await shot('warm-putt.png');
  // a short putt is conceded
  await pg.evaluate(() => window.__pureStrike.shotTo(12.5, 404.5));
  await pg.waitForFunction(() => !document.querySelector('#tutDone').hidden, null, { timeout: 8000 });
  check("inside 3 feet it's a gimme, then: You're ready!", await vis('#tutDone') && (await pg.$eval('#tutList', e => e.textContent)).includes('gimme'));
  await shot('warm-done.png');
  await pg.tap('#tutMenu'); await pg.waitForTimeout(300);
  check('starting handicap is the one entered: 12.0, provisional', (await pg.$eval('#menuHcp', e => e.textContent)).startsWith('Handicap 12.0'), await pg.$eval('#menuHcp', e => e.textContent));
  check('the testing switch is hidden from players', !(await vis('#unlockAll')));
  await pg.reload(); await pg.waitForTimeout(400);
  check('after the warm-up, the game opens on the menu', await vis('#menu') && !(await vis('#welcome')));
  await pg.tap('#howBtn'); await pg.waitForTimeout(500);
  check('How to play replays the warm-up', (await coach()).tutorial);
  await pg.tap('#coachSkip'); await pg.waitForTimeout(300);
  check('Skip warm-up returns to the menu', await vis('#menu') && !(await coach()).tutorial);
  // "Never" starts at 36; skipping the welcome works too
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  await pg.tap('#welcome [data-exp="some"]'); await pg.waitForTimeout(400); await pg.tap('#coachSkip'); await pg.waitForTimeout(300);
  check('"A little" starts at 24.0', (await pg.$eval('#menuHcp', e => e.textContent)).startsWith('Handicap 24.0'));
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  await pg.tap('#wcSkip'); await pg.waitForTimeout(300);
  check('skipping the welcome goes to the menu at 36.0', await vis('#menu') && (await pg.$eval('#menuHcp', e => e.textContent)).startsWith('Handicap 36.0'));
  await pg.goto(PAGE + '#testing'); await pg.waitForTimeout(400);
  check('a #testing link shows the testing switch', await vis('#unlockAll'));
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
