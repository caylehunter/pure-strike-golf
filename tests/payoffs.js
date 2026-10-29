// Payoff moments: slow motion, a camera punch, speed lines and an arena tail on the shots that deserve them.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');

(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ': ' + info : ''}`); };
  const ps = (fn, ...a) => pg.evaluate(([f, a]) => window.__pureStrike[f](...a), [fn, a]);
  const pops = async ms => { const seen = new Set(); for (let i = 0; i < ms / 100; i++) { await pg.waitForTimeout(100); const t = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); if (t) seen.add(t); } return [...seen].join(' | '); };
  const start = async (tee, hole) => {
    await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [10, 10, 10, 10, 10].map(d => ({ d })), onboarded: true, allUnlocked: true })));
    await pg.reload(); await pg.waitForTimeout(300); await ps('setLen', 9);
    await pg.tap('#soloBtn'); await pg.tap('#soloMode [data-arcade="0"]'); await pg.tap('.tee-card.' + tee); await pg.waitForTimeout(400);
    for (let i = 1; i < hole; i++) { await ps('score', 4, 2); await pg.waitForTimeout(60); await pg.tap('#againBtn'); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(1800); await ps('calm');
  };

  // a pure drive: time stretches for a beat, the camera leans in, speed lines, the arena opens
  await start('blue', 2);
  const s0 = (await ps('fx')).camS;
  await ps('strikeP', 0.95, 0); await pg.waitForTimeout(120);
  let sl = await ps('slow'), fx = await ps('fx');
  check('pure drive: slow motion kicks in', sl && sl.s <= 0.4, JSON.stringify(sl));
  check('pure drive: the camera punches in and speed lines burst out', fx.camS > s0 * 1.05 && fx.lines, `zoom ${s0.toFixed(2)} → ${fx.camS.toFixed(2)}`);
  check('pure drive: the arena reverb opens', fx.verb > 0.15, `send ${fx.verb.toFixed(2)}`);
  await pg.waitForTimeout(1500);
  check('then time is back to normal speed', !(await ps('slow')));
  const drive = await pops(5000);
  check('a long drive counts its yardage up', /\d{3} YDS/.test(drive), drive.slice(-60));

  // an ordinary swing gets none of it
  await ps('restartHole'); await pg.waitForTimeout(300); await ps('calm');
  await ps('strikeP', 0.9, 0.3); await pg.waitForTimeout(120);
  check('a mishit gets no slow motion', !(await ps('slow')));

  // the nuke: the biggest slow motion
  await start('black', 2);
  await pg.tap('#nukeBtn'); await ps('strikeP', 1.05, 0); await pg.waitForTimeout(120);
  sl = await ps('slow');
  check('NUCLEAR: deep slow motion', sl && sl.s <= 0.2, JSON.stringify(sl));
  const nc = await ps('cine');
  check('NUCLEAR: the tracer cam cuts in, from behind the ball', nc && nc.kind === 'nuke', JSON.stringify(nc));
  const nk = await pops(6000);
  check('NUCLEAR: the yardage counts up to a nuclear drive', /\d{3} YDS NUCLEAR DRIVE/.test(nk), nk.slice(-50));


  // a pure stinger: the down-the-line tracer cam, held through the landing, then back to the course
  await start('blue', 9);
  await ps('setShape', 'stinger'); await ps('setClub', 'D'); await ps('strikeP', 1, 0); await pg.waitForTimeout(600);
  let c = await ps('cine');
  check('pure stinger: the tracer cam cuts in and draws the tracer', c && c.kind === 'stinger' && c.fade > 0.9 && c.trail > 5, JSON.stringify(c));
  await pg.screenshot({ path: path.join(__dirname, 'payoff-stinger.png') });
  let gone = false; for (let i = 0; i < 80; i++) { await pg.waitForTimeout(100); if (!(await ps('cine'))) { gone = true; break; } }
  check('…and cuts back to the course after the ball lands', gone && !/flight/.test((await ps('ball')).mode));
  await ps('restartHole'); await pg.waitForTimeout(300); await ps('calm');
  await ps('setShape', 'stinger'); await ps('setClub', 'D'); await ps('strikeP', 1, 0.3); await pg.waitForTimeout(400);
  check('a mishit stinger stays on the normal view', !(await ps('cine')));

  // threading the Viaduct with a pure stinger
  await start('blue', 8);
  await ps('strikeP', 1, 0);
  const th = await pops(2500);
  check('THREADED IT! when a pure stinger passes through the arch', /THREADED IT!/.test(th), th.slice(0, 80));

  // a long putt that's going in: the walk-in
  await start('blue', 1);
  const pin = await pg.evaluate(() => window.__pureStrike.aim().pin);
  await ps('shotTo', pin.x - 2, pin.y - 9); await pg.waitForTimeout(1800);
  const v = await ps('holingPutt'); await ps('rollPutt', v.vx, v.vy);
  let walked = false, slowWalk = false, zoomed = false;
  for (let i = 0; i < 100; i++) {
    await pg.waitForTimeout(80);
    if (await ps('walkIn')) { walked = true; const s2 = await ps('slow'); if (s2 && s2.s < 0.4) slowWalk = true; if ((await ps('fx')).camTS >= 80) zoomed = true; }
    if (/holed|done/.test((await ps('ball')).mode)) break;
  }
  check('a 28 ft putt tracking in gets the walk-in: slow motion, camera on the cup', walked && slowWalk && zoomed, `walk-in ${walked}, slow ${slowWalk}, zoom ${zoomed}`);
  await pg.waitForTimeout(150);
  fx = await ps('fx');
  const after = await ps('slow');
  check('when it drops, time snaps back and the arena opens for the roar', (!after || after.t > 0) && fx.verb > 0.3, `send ${fx.verb.toFixed(2)}`);

  // a short putt doesn't get it
  await ps('restartHole'); await pg.waitForTimeout(200);
  await ps('shotTo', pin.x, pin.y - 2); await pg.waitForTimeout(1800);
  const v2 = await ps('holingPutt'); await ps('rollPutt', v2.vx, v2.vy);
  let w2 = false; for (let i = 0; i < 40; i++) { await pg.waitForTimeout(80); if (await ps('walkIn')) w2 = true; if (/holed|done/.test((await ps('ball')).mode)) break; }
  check('a 6 ft putt drops without the slow motion (saved for the big ones)', !w2);

  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
