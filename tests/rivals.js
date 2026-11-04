// Rivals with personality: each plays in their own style, talks, and gets a Punch-Out style intro card.
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
  await pg.goto(PAGE);
  await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, allUnlocked: true, putt: { att: [0, 0, 0], made: [0, 0, 0] }, rounds: [15, 15, 15, 15, 15].map(d => ({ d })) })));
  await pg.reload(); await pg.waitForTimeout(400);

  // their games match their personalities: over nine holes they score to their handicap, in very different ways
  const names = ['Tank', 'Marge', 'Benny', 'Doc', 'Kenzie', 'Hal'], hcp = [28, 14, 9, 4, 1, -3];
  const st = await pg.evaluate(() => [0, 1, 2, 3, 4, 5].map(i => window.__pureStrike.simStats(i, 250)));
  const sum = (a, k) => a.reduce((x, h) => x + h[k], 0), avg = (a, k) => { const v = a.filter(h => h[k] != null); return v.reduce((x, h) => x + h[k], 0) / v.length; };
  const over = st.map(s => sum(s, 'over'));
  st.forEach((s, i) => check(`${names[i]} (${hcp[i]}) scores to their handicap over nine`, Math.abs(over[i] - (hcp[i] / 2 + 1.5)) < 2, over[i].toFixed(1)));
  check('the ladder gets tougher every step', over.every((x, i) => i === 0 || x < over[i - 1]), over.map(x => x.toFixed(1)).join(' > '));
  const drv = st.map(s => avg(s, 'drive')), three = st.map(s => avg(s, 'threePutt'));
  check('Tank and Kenzie bomb it past 300; Marge and Benny under 220', drv[0] > 300 && drv[4] > 300 && drv[1] < 220 && drv[2] < 220, drv.map(Math.round).join(' / '));
  check('Tank cannot putt: far more three-putts than anyone', three[0] > 2 * Math.max(...three.slice(1)), three.map(x => x.toFixed(2)).join(' / '));
  check("Kenzie's weakness is the putter: more three-putts than Marge, Benny, Doc or Hal", three[4] > Math.max(three[1], three[2], three[3], three[5]), three.map(x => x.toFixed(2)).join(' / '));
  check('Benny putts like a kid with no fear: fewest three-putts', three[2] <= Math.min(...three.filter((x, i) => i !== 2)) + 0.02, three.map(x => x.toFixed(2)).join(' / '));

  // the opponent list shows who they are
  await pg.tap('#matchBtn'); await pg.waitForTimeout(200);
  const list = await pg.$$eval('#oppList button', b => b.map(x => x.innerText.replace(/\s+/g, ' ')));
  check('list shows each rival with a nickname', /tank/i.test(list[0]) && /long ball/i.test(list[0]) && /grandma marge/i.test(list[1]) && /prodigy/i.test(list[2]) && /spin doctor/i.test(list[3]) && /sky ball/i.test(list[4]) && /the stick/i.test(list[5]) && /\+3 handicap/.test(list[5]) && list.length === 6, list.join(' | '));
  await shot('rivals-list.png');

  // picking one brings up the VS card, not the match
  await pg.tap('#oppList button[data-opp="3"]'); await pg.waitForTimeout(800);
  const vs = await pg.evaluate(() => ({ shown: !document.querySelector('#vsCard').hidden, name: document.querySelector('#vsName').textContent, nick: document.querySelector('#vsNick').textContent, quote: document.querySelector('#vsQuote').textContent, bars: document.querySelectorAll('#vsStats .vs-bar').length, on: document.querySelectorAll('#vsStats i.on').length, tell: document.querySelector('#vsTell').textContent, mode: window.__pureStrike.state().mode }));
  check('VS card: name, nickname, quote, four stat bars', vs.shown && vs.name === 'Doc' && /spin doctor/i.test(vs.nick) && vs.quote.length > 10 && vs.bars === 4 && vs.on === 5 + 8 + 10 + 7, JSON.stringify(vs));
  check('VS card says how to beat him and the strokes', /How to beat Doc/.test(vs.tell) && /strokes?/.test(vs.tell), vs.tell);
  await shot('rivals-vs.png');
  await pg.tap('#vsBack'); await pg.waitForTimeout(150);
  check('Back returns to the list', await pg.evaluate(() => document.querySelector('#vsCard').hidden && !document.querySelector('#matchSetup').hidden));
  await pg.evaluate(() => window.__pureStrike.setLen(3));
  await pg.tap('#oppList button[data-opp="3"]'); await pg.tap('#vsGo'); await pg.waitForTimeout(300);
  check('Tee it up starts the match vs Doc', await pg.evaluate(() => !!window.__pureStrike.match() && document.querySelector('#vsCard').hidden));

  // talk: lines in a bubble under the match bar, from their own script
  const said = await pg.evaluate(() => window.__pureStrike.say('loseHole'));
  const sb = await pg.evaluate(() => ({ ...window.__pureStrike.oppSay(), bar: document.querySelector('#matchBar').getBoundingClientRect().bottom }));
  check('Doc talks: a bubble with his line, under the match bar', !sb.hidden && sb.who === 'Doc' && sb.text === said && said.length > 3 && sb.top >= sb.bar, JSON.stringify(sb));
  await shot('rivals-say.png');
  check('lines are rate-limited unless forced', (await pg.evaluate(() => window.__pureStrike.say('winHole', false))) === '');

  // Doc's wedge: lands past the flag and spins back
  let found = null;
  for (let k = 0; k < 40 && !found; k++) {
    found = await pg.evaluate(() => { window.__pureStrike.honor('opp'); window.__pureStrike.replan(); window.__pureStrike.goHole(1); const o = window.__pureStrike.oppShots(); const i = o.shots.findIndex(s => s.spin); return i >= 0 ? { i, sh: o.shots[i] } : null; });
  }
  check('Doc plans spin-back wedges', !!found);
  if (found) {
    const { i, sh } = found, seen = { nearLand: false, popped: false };
    for (let t = 0; t < 400; t++) {
      const s = await pg.evaluate(() => { const o = window.__pureStrike.oppShots(); return { k: o.k, ball: o.ball, mode: window.__pureStrike.state().mode, pops: document.querySelector('#pops').innerText }; });
      if (s.mode !== 'opp' && s.mode !== 'rest' && s.k <= i) { await pg.evaluate(() => window.__pureStrike.sink()); await pg.waitForTimeout(100); continue; }
      if (s.k === i && Math.hypot(s.ball.x - sh.land.x, s.ball.y - sh.land.y) < 0.6) seen.nearLand = true;
      if (/SPIN BACK/.test(s.pops)) { seen.popped = true; if (seen.nearLand) { await shot('rivals-spin.png'); } }
      if (s.k > i) { seen.end = Math.hypot(s.ball.x - sh.to.x, s.ball.y - sh.to.y); break; }
      await pg.waitForTimeout(25);
    }
    check('the ball lands past the flag first, then spins back to its spot', seen.nearLand && seen.end < 0.1, JSON.stringify(seen));
    check('SPIN BACK call-out', seen.popped);
  }

  // Tank's blunders get called out
  await pg.evaluate(() => window.__pureStrike.say('oppFlub'));
  const tk = await pg.evaluate(() => window.__pureStrike.oppSay());
  check('Doc has no flub lines (he does not flub)', tk.ev !== 'oppFlub' || tk.who !== 'Doc');
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  await br.close();
  if (checks.includes(false)) process.exit(1);
})();
