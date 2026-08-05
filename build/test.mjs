// Drives the built index.html in headless Chrome and checks that every one of
// the 76 places can be clicked in Find it and typed in Name it.
//   npm i puppeteer-core && node build/test.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + D + '/index.html', { waitUntil: 'load' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(500);

const ids = await page.evaluate(() => Object.keys(JSON.parse(document.getElementById('mapdata').textContent).quiz));
const nameOf = await page.evaluate(() => {
  const q = JSON.parse(document.getElementById('mapdata').textContent).quiz;
  return Object.fromEntries(Object.keys(q).map(k => [k, q[k].n]));
});

async function screenOf(id) {
  return page.evaluate(id => {
    const D = JSON.parse(document.getElementById('mapdata').textContent);
    const q = D.quiz[id], m = document.getElementById('map'), r = m.getBoundingClientRect();
    const s = Math.min(r.width / D.w, r.height / D.h);
    const ox = (r.width - D.w * s) / 2, oy = (r.height - D.h * s) / 2;
    const t = document.getElementById('root').getAttribute('transform');
    const mm = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
    return [r.left + ox + (q.c[0] * +mm[3] + +mm[1]) * s, r.top + oy + (q.c[1] * +mm[3] + +mm[2]) * s];
  }, id);
}

console.log('— every place is clickable at its own centroid (Find it) —');
await page.click('#mFind'); await wait(300);
const clickFails = [];
for (const id of ids) {
  await page.evaluate(i => window.__dbg.force(i), id);
  const [x, y] = await screenOf(id);
  await page.mouse.click(x, y);
  await wait(45);
  const s = await page.evaluate(() => window.__dbg.state());
  if (!/Correct|Got it/.test(s.verdict)) clickFails.push(`${id}: ${s.verdict}`);
}
console.log(clickFails.length ? '  FAIL ' + clickFails.length + '/' + ids.length + '\n   ' + clickFails.join('\n   ')
                              : `  ok   all ${ids.length} centroids hit their own shape`);

console.log('\n— every place accepts its own name (Name it) —');
await page.click('#mName'); await wait(400);
const typeFails = [];
for (const id of ids) {
  await page.evaluate(i => window.__dbg.force(i), id);
  await wait(25);
  await page.evaluate(t => window.__dbg.answer(t), nameOf[id]);
  await wait(25);
  const s = await page.evaluate(() => window.__dbg.state());
  if (!/Correct|Got it/.test(s.verdict)) typeFails.push(`${id} ("${nameOf[id]}"): ${s.verdict}`);
}
console.log(typeFails.length ? '  FAIL ' + typeFails.length + '\n   ' + typeFails.join('\n   ')
                             : `  ok   all ${ids.length} names accepted`);

console.log('\n— confusable names stay rejected —');
const negatives = [['c_Iceland', 'ireland'], ['c_Iran', 'iraq'], ['c_Austria', 'australia'],
  ['c_Niger', 'nigeria'], ['c_Sweden', 'switzerland'], ['c_Slovakia', 'slovenia'],
  ['w_Black_Sea', 'red sea'], ['c_Chile', 'china'], ['c_Mali', 'malaysia']];
const negFails = [];
for (const [id, txt] of negatives) {
  if (!ids.includes(id)) continue;
  await page.evaluate(i => window.__dbg.force(i), id);
  await wait(25);
  await page.evaluate(t => window.__dbg.answer(t), txt);
  await wait(25);
  const s = await page.evaluate(() => window.__dbg.state());
  if (/Correct|Got it/.test(s.verdict)) negFails.push(`${id} wrongly accepted "${txt}"`);
}
console.log(negFails.length ? '  FAIL\n   ' + negFails.join('\n   ') : '  ok   all rejected');

console.log('\n— a round you keep getting wrong still ends —');
await page.select('#setSel', 'oc'); await wait(300);
let ended = false;
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) { ended = true; break; }
  await page.evaluate(() => window.__dbg.answer('zzzz')); await wait(30);
  await page.evaluate(() => window.__dbg.answer('zzzz')); await wait(30);
  await page.keyboard.press('Enter'); await wait(60);
}
const sh = await page.evaluate(() => ({
  open: document.getElementById('sheet').classList.contains('open'),
  misses: document.querySelectorAll('#missList li').length,
  pct: document.getElementById('tPct').textContent,
}));
console.log(ended && sh.misses ? `  ok   round ended, ${sh.misses} misses listed, ${sh.pct}` : '  FAIL ' + JSON.stringify(sh));


console.log('\nerrors:', errs.length ? errs : 'none');
await browser.close();
