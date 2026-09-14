// Phone-shaped, touch-emulated pass: advancing between places must work by
// tapping, with no keyboard involved.
//   node build/test-touch.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.emulate({
  name: 'iPhone',
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + D + '/index.html', { waitUntil: 'load' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(500);

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

const state = () => page.evaluate(() => window.__dbg.state());
const vis = sel => page.evaluate(s => {
  const e = document.querySelector(s);
  const r = e.getBoundingClientRect();
  return { shown: getComputedStyle(e).display !== 'none', w: Math.round(r.width), h: Math.round(r.height) };
}, sel);

console.log('— touch build —');
check('detected as touch (no Enter hints)', await page.evaluate(() => matchMedia('(hover:none)').matches));

console.log('\n— Next button lifecycle —');
let n = await vis('#nextBtn'), s = await vis('#skipBtn');
check('Next hidden while the question is live', !n.shown, n);
check('Skip shown while the question is live', s.shown, s);

// answer one correctly by tapping it on the map
const tapPlace = async id => {
  const [x, y] = await page.evaluate(id => {
    const D = JSON.parse(document.getElementById('mapdata').textContent);
    const q = D.quiz[id], r = document.getElementById('map').getBoundingClientRect();
    const sc = Math.min(r.width / D.w, r.height / D.h);
    const ox = (r.width - D.w * sc) / 2, oy = (r.height - D.h * sc) / 2;
    const t = document.getElementById('root').getAttribute('transform');
    const m = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
    return [r.left + ox + (q.c[0] * +m[3] + +m[1]) * sc, r.top + oy + (q.c[1] * +m[3] + +m[2]) * sc];
  }, id);
  await page.touchscreen.tap(x, y);
  await wait(150);
};

await page.evaluate(() => window.__dbg.force('c_Brazil'));
await tapPlace('c_Brazil');
s = await state();
check('tapping the map answers Find it', /Correct|Got it/.test(s.verdict), s.verdict);

n = await vis('#nextBtn');
const sk = await vis('#skipBtn');
check('Next appears once answered', n.shown, n);
check('Skip goes away once answered', !sk.shown, sk);
check('Next is a thumb-sized target (>=44px tall)', n.h >= 44, n);
check('Next spans the console on a phone', n.w > 300, n);
check('verdict has no Enter hint on touch',
  !/Enter/.test(await page.evaluate(() => document.getElementById('verdict').textContent)));

const before = s.current;
await page.tap('#nextBtn');
await wait(300);
const after = await state();
check('tapping Next advances to a new place', after.current !== before && after.phase === 'ask',
  { before, after: after.current, phase: after.phase });
check('Next hides again on the new question', !(await vis('#nextBtn')).shown);

console.log('\n— Name it on touch —');
await page.tap('#mName');
await wait(600);
check('Check button is reachable', (await vis('#submitBtn')).shown);
check('no Enter hint in the typing prompt',
  !/Enter/.test(await page.evaluate(() => document.getElementById('verdict').textContent)));
const cur = (await state()).current;
await page.evaluate(() => window.__dbg.answer('zzzz'));
await wait(100);
await page.evaluate(() => window.__dbg.answer('zzzz'));
await wait(150);
check('Next appears after the answer is revealed', (await vis('#nextBtn')).shown);
await page.tap('#nextBtn');
await wait(300);
check('Next advances in Name it too', (await state()).current !== cur);

console.log('\n— nothing overflows sideways —');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('no horizontal page scroll', overflow <= 1, { overflow });

await page.evaluate(() => window.__dbg.force('c_Japan'));
await wait(200);
await page.screenshot({ path: D + '/build/shot-touch-ask.png' });
await tapPlace('c_Japan');
await wait(400);
await page.screenshot({ path: D + '/build/shot-touch-answered.png' });

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
