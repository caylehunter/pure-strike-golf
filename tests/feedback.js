// The feedback button: easy to find on the menu, and never loses a note.
// Locally there is no platform store, so this exercises the copy fallback.
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
  await pg.goto(PAGE); await pg.evaluate(() => localStorage.setItem('pure-strike-v1', JSON.stringify({ best: {}, putt: { att: [0, 0, 0], made: [0, 0, 0] }, onboarded: true }))); await pg.reload(); await pg.waitForTimeout(400);
  const btn = await pg.$('#fbBtn'); const box = await btn.boundingBox();
  const last = await pg.$$eval('#menu .card > *', els => els[els.length - 1].id);
  check('feedback button is the last thing on the menu, big, and on screen without scrolling', last === 'fbBtn' && box.height >= 56 && box.y + box.height <= 844, `height ${Math.round(box.height)}px, bottom at ${Math.round(box.y + box.height)}px of 844`);
  await pg.screenshot({ path: path.join(__dirname, 'fb-menu.png'), fullPage: false });
  await pg.tap('#fbBtn'); await pg.waitForTimeout(200);
  check('it opens the feedback screen', await pg.$eval('#feedback', e => !e.hidden));
  await pg.tap('#fbSend'); await pg.waitForTimeout(100);
  check('sending an empty note asks for something', (await pg.$eval('#fbStatus', e => e.textContent)).includes('Type a note'));
  await pg.tap('#fbChips button[data-tag="Loved it"]');
  await pg.fill('#fbText', 'Nuke on hole 2 was awesome.'); await pg.fill('#fbName', 'Sam');
  await pg.tap('#fbSend'); await pg.waitForTimeout(11500);
  check('without a store it offers Copy instead of failing', await pg.$eval('#fbCopy', e => !e.hidden) && (await pg.$eval('#fbStatus', e => e.textContent)).includes('Tap Copy'));
  await pg.screenshot({ path: path.join(__dirname, 'fb-screen.png') });
  await pg.tap('#fbCopy'); await pg.waitForTimeout(200);
  const clip = await pg.evaluate(() => navigator.clipboard.readText());
  check('Copy puts the whole note on the clipboard', clip.includes('from Sam') && clip.includes('[Loved it]') && clip.includes('Nuke on hole 2'), clip.replace(/\n/g, ' / '));
  await pg.tap('#fbBack'); await pg.waitForTimeout(150);
  check('Back returns to the menu', await pg.$eval('#menu', e => !e.hidden));
  await br.close();
  if (errs.length) { console.log('ERRORS', errs.join('; ')); checks.push(false); }
  if (checks.includes(false)) process.exit(1);
})();
