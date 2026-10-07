// DNA Lab: a second quiz over the replication-fork diagram, with no map.
//   node build/test-dna.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('atlasdrill.idea.v1', 'later');
    localStorage.setItem('atlasdrill.relnote.v1', 'seen');
  } catch (e) {}
});
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + D + '/index.html', { waitUntil: 'load' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(500);

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));
const state = () => page.evaluate(() => window.__dbg.state());
const meta = id => page.evaluate(i => window.__dbg.meta(i), id);
const force = id => page.evaluate(i => window.__dbg.force(i), id);
const txt = s => page.evaluate(x => document.querySelector(x).textContent.trim(), s);
const vis = s => page.evaluate(x => {
  const e = document.querySelector(x);
  if (!e) return false;
  if (e.hasAttribute('hidden')) return false;
  const st = getComputedStyle(e);
  return st.display !== 'none' && st.visibility !== 'hidden';
}, s);

const PARTS = ['DNA polymerase', 'Helicase', 'Primase', 'Ligase', 'Nucleotide',
               'Leading strand', 'Lagging strand'];

console.log('— the switch sits next to the title —');
check('Atlas Drill is the starting quiz', await page.evaluate(() =>
  document.getElementById('appAtlas').getAttribute('aria-pressed') === 'true'));
check('a DNA Lab button is there', await vis('#appDna'));
check('the diagram is hidden to begin with', !(await vis('#lab')));

await page.click('#appDna'); await wait(600);
check('DNA Lab takes over', await page.evaluate(() =>
  document.getElementById('appDna').getAttribute('aria-pressed') === 'true'));
check('the title changes', (await txt('#brand')) === 'DNA Lab');
check('the diagram is showing', await vis('#lab'));
check('the map is gone', !(await vis('#map')));
check('so are the zoom buttons', !(await vis('.mapbtns')));
check('and the place filter', !(await vis('#setSel')));
check('Religions is not offered here', !(await vis('#mRel')));
check('the round is every part', (await state()).left + 1 === PARTS.length, (await state()).left + 1);
check('header counts parts, not places', /7 parts/.test(await txt('#setSize')), await txt('#setSize'));

console.log('\n— the diagram has the parts, unlabelled until answered —');
const ids = await page.evaluate(() => window.__dbg.dnaIds());
check('every part is quizzable', ids.length === PARTS.length, ids);
for (const p of PARTS) {
  const has = await page.evaluate(n =>
    !!document.querySelector(`#lab .part[data-name="${n}"]`), p);
  check(`${p} is on the diagram`, has);
}
check('no enzyme name is readable yet', await page.evaluate(() =>
  [...document.querySelectorAll('#lab .plabel')].every(t => +getComputedStyle(t).opacity === 0)));
check('no words at all on the drawing', await page.evaluate(() => {
  const vis = [...document.querySelectorAll('#lab text')]
    .filter(t => +getComputedStyle(t).opacity > 0)
    .map(t => t.textContent.trim());
  return vis.length === 0;
}), await page.evaluate(() => [...document.querySelectorAll('#lab text')]
  .filter(t => +getComputedStyle(t).opacity > 0).map(t => t.textContent.trim())));
check('and no caption under it', !(await page.evaluate(() =>
  !!document.querySelector('#lab figcaption'))));

console.log('\n— Find it: clicking the diagram —');
await page.click('#mFind'); await wait(400);
for (const id of ids) {
  await force(id); await wait(150);
  const name = (await meta()).n;
  check(`cue names ${name}`, (await txt('#prompt')) === name, await txt('#prompt'));
  // click the biggest clear target in the part — the first hit rect of the
  // lagging strand sits under the polymerase clamp, which is a real overlap
  // a person would just click past
  const pt = await page.evaluate(i => {
    const g = document.querySelector(`#lab .part[data-id="${i}"]`);
    const shapes = [...g.querySelectorAll('.hit, .enz, .nt circle')];
    const best = shapes.map(s => s.getBoundingClientRect())
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return [best.left + best.width / 2, best.top + best.height / 2];
  }, id);
  await page.mouse.click(pt[0], pt[1]);
  await wait(150);
  const s = await state();
  check(`clicking ${name} scores`, /Correct|Got it/.test(s.verdict), s.verdict);
  check(`${name} is labelled afterwards`, await page.evaluate(i =>
    document.querySelector(`#lab .part[data-id="${i}"]`).classList.contains('named'), id));
}

console.log('\n— a wrong click says what you hit —');
await force('d_ligase'); await wait(200);
await page.click('#lab .part[data-id="d_helicase"] .enz'); await wait(150);
check('names the part you actually clicked', /That.s Helicase/.test((await state()).verdict),
  (await state()).verdict);
check('and does not count it', !/Correct|Got it/.test((await state()).verdict));

console.log('\n— Name it: typing —');
await page.click('#mName'); await wait(500);
check('the typing box is back', await vis('#answerRow'));
const typed = async (id, text) => {
  await force(id); await wait(80);
  await page.evaluate(t => window.__dbg.answer(t), text);
  await wait(80);
  return (await state()).verdict;
};
const cases = [
  ['d_helicase', 'helicase', true], ['d_helicase', 'Helicase', true],
  ['d_helicase', 'helicaise', true],
  ['d_helicase', 'ligase', false],
  ['d_polymerase', 'dna polymerase', true], ['d_polymerase', 'polymerase', true],
  ['d_polymerase', 'DNA Polymerase III', true],
  ['d_primase', 'primase', true], ['d_primase', 'polymerase', false],
  ['d_ligase', 'ligase', true], ['d_ligase', 'dna ligase', true],
  ['d_nucleotide', 'nucleotide', true], ['d_nucleotide', 'nucleotides', true],
  ['d_nucleotide', 'helicase', false],
  ['d_leading', 'leading strand', true], ['d_leading', 'leading', true],
  ['d_leading', 'lagging strand', false],
  ['d_lagging', 'lagging strand', true], ['d_lagging', 'lagging', true],
  ['d_lagging', 'leading strand', false],
];
for (const [id, t, want] of cases) {
  const v = await typed(id, t);
  check(`"${t}" ${want ? 'accepted' : 'rejected'} for ${id.slice(2)}`,
    /Correct|Got it/.test(v) === want, v);
}
check('the part is highlighted while you think', await page.evaluate(async () => {
  window.__dbg.force('d_primase');
  await new Promise(r => setTimeout(r, 100));
  return document.querySelector('#lab .part[data-id="d_primase"]').classList.contains('is-target');
}));

console.log('\n— the description is shown up front, under the word —');
await page.click('#mFind'); await wait(400);
await force('d_ligase'); await wait(250);
check('explained before you answer', /seals the nick/i.test(await txt('#desc')), await txt('#desc'));
check('it sits under the word, at the bottom', await page.evaluate(() => {
  const w = document.getElementById('prompt').getBoundingClientRect();
  const d = document.getElementById('desc').getBoundingClientRect();
  const c = document.getElementById('console').getBoundingClientRect();
  return d.top >= w.bottom - 2 && d.bottom <= c.bottom + 2 && d.left < 400;
}));
check('there is no toggle any more', !(await page.evaluate(() =>
  !!document.getElementById('descBtn'))));

const ligaseDesc = await txt('#desc');
await page.click('#lab .part[data-id="d_ligase"] .enz'); await wait(200);
check('it stays put after a correct answer', (await txt('#desc')) === ligaseDesc);

await force('d_helicase'); await wait(250);
check('the next part swaps in its own', /unzipping/i.test(await txt('#desc')), await txt('#desc'));
check('and the old one is gone', !/seals the nick/i.test(await txt('#desc')));

console.log('\n— in Name it the description is the clue, never the answer —');
await page.click('#mName'); await wait(500);
for (const id of ids) {
  await force(id); await wait(120);
  const d = (await txt('#desc')).toLowerCase();
  const name = (await meta()).n.toLowerCase();
  check(`${name}: described`, d.length > 20, d);
  const leaks = name.split(' ').filter(w => w.length > 4 && d.includes(w));
  check(`${name}: the description does not say it`, leaks.length === 0, leaks);
}

console.log('\n— the map has no descriptions —');
await page.click('#appAtlas'); await wait(500);
await force('c_Brazil'); await wait(200);
check('nothing under the country name', (await txt('#desc')) === '', await txt('#desc'));
await page.click('#appDna'); await wait(500);

console.log('\n— the clock, pause and results still work —');
await page.click('#mName'); await wait(300);   // the loop below answers by typing
await page.click('#appDna'); await wait(400);
const t0 = await txt('#sTime');
await wait(1100);
check('clock runs', (await txt('#sTime')) !== t0, { t0, now: await txt('#sTime') });
await page.click('#pauseBtn'); await wait(200);
check('pause covers the diagram', await page.evaluate(() =>
  document.getElementById('veil').classList.contains('open')));
await page.click('#resumeBtn'); await wait(300);
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) break;
  const s = await state();
  if (s.phase === 'done') { await page.evaluate(() => window.__dbg.next()); await wait(60); continue; }
  const m = await meta();
  await page.evaluate(n => window.__dbg.answer(n), m.n);
  await wait(70);
}
check('a round finishes', await page.evaluate(() =>
  document.getElementById('sheet').classList.contains('open')));
check('and it was timed', /\d:\d\d\.\d/.test(await txt('#tTime')), await txt('#tTime'));

console.log('\n— going back to the map —');
await page.click('#closeBtn'); await wait(200);
await page.click('#appAtlas'); await wait(600);
check('the title is back', (await txt('#brand')) === 'Atlas Drill');
check('the map is back', await vis('#map'));
check('the diagram is gone', !(await vis('#lab')));
check('Religions is offered again', await vis('#mRel'));
check('the place filter is back', await vis('#setSel'));
await force('c_Brazil'); await wait(200);
check('map questions still work', (await meta()).n === 'Brazil');

console.log('\n— nothing overflows on a phone —');
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.click('#appDna'); await wait(600);
check('diagram fits', await page.evaluate(() =>
  document.documentElement.scrollWidth - window.innerWidth <= 1));
check('diagram is visible', await vis('#lab'));

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
