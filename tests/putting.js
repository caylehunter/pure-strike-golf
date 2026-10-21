// Practice-green putts pulled straight at the hole for ~1.5 ft past on flat ground.
// Distance control should leave every putt close even without reading the slope.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.join(__dirname, 'page.html');
const PUTTS = 8, MAX_LEFT_FT = 8;

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, onboarded: true }))); await pg.reload(); await pg.waitForTimeout(400);
  await pg.click('#practiceBtn');
  let fails = 0;
  for (let k = 0; k < PUTTS; k++) {
    await pg.waitForFunction(() => document.querySelector('#puttMain').textContent.startsWith('Pull') && !document.querySelector('#pops').innerText.trim(), null, { timeout: 15000 });
    await pg.waitForTimeout(500);
    const ft = parseInt(await pg.$eval('#pinVal', e => e.textContent)), yd = ft / 3;
    const range = Math.min(25, Math.max(4, yd * 2.2 + 1.5)), Lmax = Math.max(220, 0.42 * 844 * 0.7);
    const L = (yd + 0.5) / range * Lmax;
    await pg.mouse.move(195, 400); await pg.mouse.down(); await pg.mouse.move(195, 400 + L, { steps: 6 }); await pg.mouse.up();
    let res = '';
    for (let i = 0; i < 80 && !res; i++) { await pg.waitForTimeout(100); res = await pg.$eval('#pops', e => e.innerText.replace(/\s+/g, ' ').trim()); }
    const left = /([\d.]+) FT LEFT/.exec(res);
    const ok = res && (!left || parseFloat(left[1]) <= MAX_LEFT_FT);
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${ft} ft putt: ${res || '(no result)'}`);
  }
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); fails++; }
  if (fails) { console.log(`${fails} putting check(s) failed`); process.exit(1); }
})();
