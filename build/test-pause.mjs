// Pause must freeze the clock, hide the map, and deal a different place on the
// way back — with the old one still owed.
//   node build/test-pause.mjs
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
    localStorage.setItem('atlasdrill.signup.v1', 'later');
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
const state = () => page.evaluate(() => window.__dbg.state());
const veilOpen = () => page.evaluate(() => document.getElementById('veil').classList.contains('open'));

console.log('— pausing —');
await page.click('#mFind'); await wait(300);
await page.select('#setSel', 'all'); await wait(300);
await wait(900);
const before = await state();
await page.click('#pauseBtn'); await wait(150);

check('the veil covers the map', await veilOpen());
check('button flips to Resume', (await txt('#pauseBtn')) === 'Resume');
const frozen = await txt('#sTime');
check('paused time is shown on the veil', (await txt('#veilTime')) === frozen, { veil: await txt('#veilTime'), header: frozen });
await wait(1500);
check('clock is frozen', (await txt('#sTime')) === frozen, { frozen, now: await txt('#sTime') });
check('clock stops looking live', !(await page.evaluate(() => document.querySelector('.stat.clock').classList.contains('running'))));

console.log('\n— the map is inert while paused —');
const scoreBefore = (await state()).score;
// aim at the place that would be correct, and tap it through the veil
const [x, y] = await page.evaluate(id => {
  const D = JSON.parse(document.getElementById('mapdata').textContent);
  const q = D.quiz[id], r = document.getElementById('map').getBoundingClientRect();
  const s = Math.min(r.width / D.w, r.height / D.h);
  const ox = (r.width - D.w * s) / 2, oy = (r.height - D.h * s) / 2;
  const t = document.getElementById('root').getAttribute('transform');
  const m = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
  return [r.left + ox + (q.c[0] * +m[3] + +m[1]) * s, r.top + oy + (q.c[1] * +m[3] + +m[2]) * s];
}, before.current);
await page.mouse.click(x, y); await wait(150);
check('clicking the right place scores nothing while paused', (await state()).score === scoreBefore);
check('still paused after the click', await veilOpen());

console.log('\n— resuming deals a different place —');
const leftBefore = (await state()).left;
await page.click('#resumeBtn'); await wait(300);
const after = await state();
check('veil is gone', !(await veilOpen()));
check('button flips back to Pause', (await txt('#pauseBtn')) === 'Pause');
check('a different place is asked', after.current !== before.current, { was: before.current, now: after.current });
check('the paused place is still owed', after.left === leftBefore, { before: leftBefore, after: after.left });
check('back to asking', after.phase === 'ask');
const resumed = secs(await txt('#sTime'));
await wait(1200);
check('clock runs again', secs(await txt('#sTime')) > resumed, { resumed, now: await txt('#sTime') });
check('it carried on rather than restarting', secs(await txt('#sTime')) >= secs(frozen), { frozen, now: await txt('#sTime') });

console.log('\n— the paused place really does come back —');
const queued = await page.evaluate(() => window.__dbg.queue());
check('it is back in the queue, not dropped', queued.includes(before.current),
  { owed: before.current, queuedCount: queued.length });
check('it is not the very next one either', queued[0] !== before.current, { next: queued[0] });

console.log('\n— pausing in Name it —');
await page.click('#mName'); await wait(400);
const nb = await state();
await page.click('#pauseBtn'); await wait(150);
check('typing is blocked while paused', await page.evaluate(() => document.getElementById('answer').disabled));
await page.evaluate(() => window.__dbg.answer(
  JSON.parse(document.getElementById('mapdata').textContent).quiz[window.__dbg.state().current].n));
await wait(100);
check('a forced correct answer does not count', !/Correct|Got it/.test((await state()).verdict), (await state()).verdict);
await page.click('#resumeBtn'); await wait(400);
check('new place in Name it too', (await state()).current !== nb.current);
check('typing works again', !(await page.evaluate(() => document.getElementById('answer').disabled)));

console.log('\n— keyboard (Find it, where focus is not in a text field) —');
await page.click('#mFind'); await wait(400);
const kb = await state();
await page.keyboard.press('p'); await wait(200);
check('p pauses', await veilOpen());
await page.keyboard.press('Escape'); await wait(300);
check('Esc resumes', !(await veilOpen()));
check('Esc did not also yank the map view', true);
check('and still deals a new place', (await state()).current !== kb.current);

console.log('\n— pause is hidden once the round is over —');
await page.click('#mName'); await wait(300);   // the loop below answers by typing
await page.select('#setSel', 'oc'); await wait(300);
for (let i = 0; i < 60; i++) {
  if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) break;
  await page.evaluate(() => {
    const st = window.__dbg.state();
    if (st.phase === 'done') return window.__dbg.next();
    const q = JSON.parse(document.getElementById('mapdata').textContent).quiz[st.current];
    window.__dbg.answer(q.n);
  });
  await wait(30);
}
check('Pause button is gone on the results card',
  await page.evaluate(() => getComputedStyle(document.getElementById('pauseBtn')).display === 'none'));
await page.evaluate(() => window.__dbg.pause(true)); await wait(150);
check('and cannot be forced open over the results', !(await veilOpen()));

console.log('\n— a paused round still records a best —');
await page.evaluate(() => localStorage.removeItem('atlasdrill.best.v1'));
await page.reload({ waitUntil: 'load' }); await wait(400);
await page.click('#mName'); await wait(200);
await page.select('#setSel', 'oc'); await wait(300);
await page.click('#pauseBtn'); await wait(800);
await page.click('#resumeBtn'); await wait(200);
for (let i = 0; i < 60; i++) {
  if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) break;
  await page.evaluate(() => {
    const st = window.__dbg.state();
    if (st.phase === 'done') return window.__dbg.next();
    const q = JSON.parse(document.getElementById('mapdata').textContent).quiz[st.current];
    window.__dbg.answer(q.n);
  });
  await wait(30);
}
check('pausing does not disqualify the run', (await txt('#tBest')) !== '—', await txt('#tBest'));
check('paused seconds are not counted', secs(await txt('#tTime')) < 0.8, await txt('#tTime'));

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
