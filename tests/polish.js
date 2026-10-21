// Look and sound: the swing hum, sound and announcer switches, fire glow, the big-moment callouts and confetti.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, onboarded: true }))); await pg.reload(); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.__pureStrike.setLen(3));
  await pg.tap('#soloBtn'); await pg.tap('.tee-card.blue'); await pg.waitForTimeout(500);
  const snd = () => pg.evaluate(() => window.__pureStrike.sound());

  // holding the swing button hums, letting go stops it
  const box = await pg.$eval('#swingBtn', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await pg.mouse.move(box.x, box.y); await pg.mouse.down(); await pg.waitForTimeout(500);
  const held = await snd();
  check('holding the swing starts audio and the power hum', held.ctx && held.charging);
  await pg.mouse.up(); await pg.waitForTimeout(100);
  check('letting go stops the hum', !(await snd()).charging);
  // sound really comes out: the output meter moves during a pure strike, and stays silent with Sound off
  const loudest = async ms => { let m = 0; for (let i = 0; i < ms / 20; i++) { m = Math.max(m, await pg.evaluate(() => window.__pureStrike.level())); await pg.waitForTimeout(20); } return m; };
  await pg.waitForTimeout(2500); await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(300);
  check('the audio engine is running after the first tap', (await snd()).state === 'running', (await snd()).state);
  await pg.evaluate(() => window.__pureStrike.strikeP(0.6, 0.3)); // a mishit, so the pure streak below starts from zero
  const lvl = await loudest(400);
  check('a strike is audible (the output level moves)', lvl > 0.05, `peak ${lvl.toFixed(3)}`);
  await pg.waitForTimeout(3000);
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(200);

  // four pure swings in a row: the screen edge heats up, then burns
  for (let i = 0; i < 4; i++) {
    await pg.evaluate(() => window.__pureStrike.strikeP(0.6, 0)); await pg.waitForTimeout(150);
    if (i === 2) check('three pure: the screen edge glows (heating up)', (await snd()).fireEdge === 'heat');
    await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(150);
  }
  check('four pure: the screen edge is on fire', (await snd()).fireEdge === 'fire');
  await pg.waitForTimeout(300); await pg.screenshot({ path: path.join(__dirname, 'polish-fire.png') });
  await pg.evaluate(() => window.__pureStrike.strikeP(0.6, 0.2)); await pg.waitForTimeout(150);
  check('a miss puts the glow out', (await snd()).fireEdge === '');
  await pg.evaluate(() => window.__pureStrike.restartHole()); await pg.waitForTimeout(150);

  // a hole-in-one: the big callout with a starburst, and confetti
  await pg.evaluate(() => window.__pureStrike.sink()); await pg.waitForTimeout(450);
  const big = await pg.$$eval('#pops .pop.score.big', els => els.map(e => e.innerText.split('\n')[0]));
  check('holing out under par gets the big slam callout', big.includes('HOLE IN ONE'), big.join(','));
  check('and confetti', (await snd()).confetti > 20, `${(await snd()).confetti} pieces`);
  await pg.screenshot({ path: path.join(__dirname, 'polish-ace.png') });
  await pg.waitForTimeout(2500);

  // sound and announcer switches in the pause menu, remembered
  await pg.tap('#againBtn').catch(() => {}); await pg.waitForTimeout(400);
  await pg.tap('#pauseBtn'); await pg.waitForTimeout(150);
  await pg.screenshot({ path: path.join(__dirname, 'polish-pause.png') });
  await pg.tap('#pause [data-voice]');
  check('Announcer switches off', !(await snd()).voice && (await pg.$eval('#pause [data-voice]', e => e.textContent)) === 'Announcer: Off');
  await pg.tap('#pause [data-sound]');
  check('Sound switches off, and the announcer button goes inactive with it', !(await snd()).on && (await pg.$eval('#pause [data-voice]', e => e.disabled)));
  await pg.tap('#pzResume'); await pg.waitForTimeout(200); await pg.waitForTimeout(1500);
  await pg.evaluate(() => window.__pureStrike.strikeP(0.6, 0));
  const quiet = await loudest(400);
  check('with Sound off, a strike makes no sound', quiet < 0.001, `peak ${quiet.toFixed(4)}`);
  await pg.reload(); await pg.waitForTimeout(300);
  const after = await snd();
  check('both stay off after a reload', !after.on && !after.voice && (await pg.$eval('[data-sound]', e => e.textContent)) === 'Sound: Off');
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
