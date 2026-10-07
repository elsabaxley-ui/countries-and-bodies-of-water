// The stopwatch and the personal-best record.
//   node build/test-timer.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
// a returning visitor who already dismissed the idea box — these suites are
// about the quiz, and test-idea.mjs covers the box itself
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('atlasdrill.idea.v1', 'later');
    localStorage.setItem('atlasdrill.relnote.v1', 'seen');
    localStorage.setItem('atlasdrill.bionote.v1', 'seen');
  } catch (e) {}
});
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + D + '/index.html', { waitUntil: 'load' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(400);

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

const txt = sel => page.evaluate(s => document.querySelector(s).textContent.trim(), sel);
const secs = t => { const m = t.match(/^(\d+):(\d\d)\.(\d)$/); return m ? +m[1] * 60 + +m[2] + +m[3] / 10 : NaN; };

// Answer the current place correctly, whatever the mode.
async function answerRight() {
  await page.evaluate(() => {
    const s = window.__dbg.state();
    const q = JSON.parse(document.getElementById('mapdata').textContent).quiz[s.current];
    window.__dbg.answer(q.n);
  });
  await wait(40);
}
// Clearing the stored bests needs a reload — the page keeps its own copy in
// memory, and wiping only localStorage would leave that copy standing.
async function resetBests(mode, set) {
  await page.evaluate(() => localStorage.removeItem('atlasdrill.best.v1'));
  await page.reload({ waitUntil: 'load' });
  await wait(400);
  await page.click(mode); await wait(250);
  await page.select('#setSel', set); await wait(300);
}
// Walk a whole round to completion.
async function playRound(fn) {
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) return true;
    await fn();
    await page.evaluate(() => { if (window.__dbg.state().phase === 'done') window.__dbg.next(); });
    await wait(30);
  }
  return false;
}

console.log('— the clock runs —');
await page.click('#mName'); await wait(300);
await page.select('#setSel', 'oc'); await wait(300);
const t0 = await txt('#sTime');
check('starts near zero', secs(t0) < 1, t0);
check('is marked as running', await page.evaluate(() => document.querySelector('.stat.clock').classList.contains('running')));
await wait(1200);
const t1 = await txt('#sTime');
check('counts up', secs(t1) > secs(t0) + 0.8, { t0, t1 });
check('reads as a stopwatch (m:ss.t)', /^\d+:\d\d\.\d$/.test(t1), t1);

console.log('\n— finishing a round records a best —');
await resetBests('#mName', 'oc');                        // fresh round, no stored best
check('best shows an em dash before any record', (await txt('#sBest')) === '—', await txt('#sBest'));
await playRound(answerRight);
const stopped = await txt('#sTime');
await wait(500);
check('clock stops at the end', (await txt('#sTime')) === stopped, { stopped, now: await txt('#sTime') });
check('clock stops being marked running', !(await page.evaluate(() => document.querySelector('.stat.clock').classList.contains('running'))));
check('round time appears in the results', secs(await txt('#tTime')) > 0, await txt('#tTime'));
check('it becomes the best', (await txt('#tBest')) === (await txt('#tTime')));
check('first-run note explains it', /time to beat/i.test(await txt('#bestNote')), await txt('#bestNote'));
const firstBest = secs(await txt('#tBest'));

console.log('\n— a slower run does not overwrite it —');
await page.click('#againBtn'); await wait(300);
await wait(2500);                                        // deliberately dawdle
await playRound(answerRight);
check('best is unchanged by a slower round', Math.abs(secs(await txt('#tBest')) - firstBest) < 0.2,
  { was: firstBest, now: secs(await txt('#tBest')) });
check('it says how far off you were', /off your best/i.test(await txt('#bestNote')), await txt('#bestNote'));
check('header shows the best to beat', secs(await txt('#sBest')) === firstBest);

console.log('\n— skipping cannot buy a record —');
await resetBests('#mName', 'oc');
await playRound(async () => { await page.click('#skipBtn'); });
check('a skipped round is still timed', secs(await txt('#tTime')) > 0, await txt('#tTime'));
check('but sets no record', (await txt('#tBest')) === '—', await txt('#tBest'));
check('and says why', /not recorded/i.test(await txt('#bestNote')), await txt('#bestNote'));

console.log('\n— bests are per mode and per set —');
await resetBests('#mName', 'oc');
await playRound(answerRight);
const ocBest = await txt('#tBest');
await page.select('#setSel', 'sa'); await wait(400);
check('a different set starts with no best', (await txt('#sBest')) === '—', await txt('#sBest'));
await page.select('#setSel', 'oc'); await wait(400);
check('coming back restores the right best', (await txt('#sBest')) === ocBest, { ocBest, now: await txt('#sBest') });
await page.click('#mFind'); await wait(400);
check('switching mode uses a separate best', (await txt('#sBest')) === '—', await txt('#sBest'));

console.log('\n— it survives a reload —');
await page.click('#mName'); await wait(300);
await page.select('#setSel', 'oc'); await wait(300);
await page.reload({ waitUntil: 'load' }); await wait(500);
await page.click('#mName'); await wait(200);
await page.select('#setSel', 'oc'); await wait(400);
check('best time is remembered', (await txt('#sBest')) === ocBest, { want: ocBest, got: await txt('#sBest') });

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
