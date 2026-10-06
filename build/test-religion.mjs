// The Religions tab: majority-by-country and hearth questions.
//   node build/test-religion.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const REL = JSON.parse(readFileSync(join(D, 'build', 'religions.json'), 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('atlasdrill.idea.v1', 'later'); } catch (e) {}
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

console.log('— the tab exists and switches the question set —');
await page.click('#mRel'); await wait(500);
check('Religions tab is pressed', await page.evaluate(() =>
  document.getElementById('mRel').getAttribute('aria-pressed') === 'true'));
const sets = await page.evaluate(() =>
  [...document.querySelectorAll('#setSel option')].map(o => o.value));
check('set menu offers majority and hearths', sets.includes('maj') && sets.includes('hearth'), sets);
check('and a filter per religion', REL.rel.every(([k]) => sets.includes(k)), sets);

const ids = await page.evaluate(() => window.__dbg.relIds());
check('one majority question per country', ids.maj.length === Object.keys(REL.maj).length,
  { got: ids.maj.length, want: Object.keys(REL.maj).length });
check('one hearth question per religion', ids.hearth.length === REL.rel.length,
  { got: ids.hearth.length, want: REL.rel.length });

console.log('\n— every majority question is answerable and correctly keyed —');
{
  const wrong = [];
  for (const [country, key] of Object.entries(REL.maj)) {
    const id = 'rm_c_' + country.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const m = await meta(id);
    if (!m) { wrong.push(`${country}: no question`); continue; }
    if (m.ans !== key) wrong.push(`${country}: keyed ${m.ans} not ${key}`);
    if (m.n !== country) wrong.push(`${country}: labelled ${m.n}`);
  }
  check(`all ${Object.keys(REL.maj).length} countries keyed to the right religion`,
    wrong.length === 0, wrong.slice(0, 6));
}

console.log('\n— regions are the default round —');
check('one question per region', ids.region.length === REL.reg.length,
  { got: ids.region.length, want: REL.reg.length });
check('a default round is regions plus hearths',
  (await state()).left + 1 === REL.reg.length + REL.rel.length,
  { left: (await state()).left + 1, want: REL.reg.length + REL.rel.length });
{
  const bad = [];
  for (const [key, label, primary, alts] of REL.reg) {
    const m = await meta('rr_' + key);
    if (!m) { bad.push(`${label}: missing`); continue; }
    if (m.ans !== primary) bad.push(`${label}: ${m.ans} not ${primary}`);
    if (!m.targets || !m.targets.length) bad.push(`${label}: no countries`);
    if (JSON.stringify(m.alts) !== JSON.stringify(alts)) bad.push(`${label}: alts off`);
  }
  check(`all ${REL.reg.length} regions keyed and populated`, bad.length === 0, bad.slice(0, 5));
}
await force('rr_weurope'); await wait(500);
check('the region is named', (await txt('#prompt')) === 'Western Europe');
check('cue reads "Majority religion of"', /majority religion of/i.test(await txt('#cue')), await txt('#cue'));
check('every member country is highlighted', await page.evaluate(() =>
  document.querySelectorAll('#targetLayer path.is-target').length > 15));
check('framed on the region', (await state()).view.k > 1.8, (await state()).view.k);
await page.evaluate(() => window.__dbg.pick('protestant')); await wait(200);
check('a split region accepts the second answer',
  /Correct|Got it/.test((await state()).verdict), (await state()).verdict);
check('and says the other one counts too', /counts too/i.test((await state()).verdict),
  (await state()).verdict);
check('while still naming the primary', /Roman Catholic/.test((await state()).verdict),
  (await state()).verdict);
await force('rr_nafrica'); await wait(400);
await page.evaluate(() => window.__dbg.pick('buddhism')); await wait(150);
check('a plain wrong answer is still wrong', !/Correct|Got it/.test((await state()).verdict),
  (await state()).verdict);
await force('rr_polynesia'); await wait(500);
check('scattered island regions still frame sanely',
  (await state()).view.k > 1 && (await state()).view.k < 14, (await state()).view.k);
await force('rr_micronesia'); await wait(500);
check('Micronesia is not stretched around the date line',
  (await state()).view.k > 1.3, (await state()).view.k);

console.log('\n— answering by chip —');
await page.select('#setSel', 'maj'); await wait(400);
const FR = 'rm_c_France';
await force(FR); await wait(400);
check('cue asks for the majority religion', /majority religion/i.test(await txt('#cue')), await txt('#cue'));
check('the country is named', (await txt('#prompt')) === 'France');
check('chips are showing', await page.evaluate(() =>
  getComputedStyle(document.getElementById('chips')).display !== 'none'));
check('nine of them, labelled', await page.evaluate(() => {
  const b = [...document.querySelectorAll('#chips button')];
  return b.length === 9 && b.every(x => x.textContent.trim().length > 2);
}));
check('the country is highlighted', await page.evaluate(() =>
  document.querySelectorAll('#targetLayer path.is-target').length === 1));
check('the map is framed on it, not the whole world', (await state()).view.k > 1.5, (await state()).view.k);

await page.evaluate(() => window.__dbg.pick('buddhism')); await wait(150);
let s = await state();
check('a wrong chip is rejected', !/Correct|Got it/.test(s.verdict), s.verdict);
check('it says what you picked', /Not Buddhism/.test(s.verdict), s.verdict);
check('that chip is struck out', await page.evaluate(() =>
  document.querySelector('[data-rel="buddhism"]').disabled));
await page.evaluate(() => window.__dbg.pick('catholic')); await wait(200);
s = await state();
check('the right chip is accepted', /Correct|Got it/.test(s.verdict), s.verdict);
check('the answer is named', /Roman Catholic/.test(s.verdict), s.verdict);
check('the other Catholic countries light up', await page.evaluate(() =>
  document.querySelectorAll('#targetLayer path.is-peer').length > 10));

console.log('\n— the United States carries the Judaism note —');
await force('rm_c_United_States'); await wait(300);
await page.evaluate(() => window.__dbg.pick('protestant')); await wait(200);
check('answered Protestant', /Correct|Got it/.test((await state()).verdict));
check('and mentions the Judaism stripes', /striped for Judaism/i.test((await state()).verdict),
  (await state()).verdict);

console.log('\n— hearths are clicked on the map —');
for (const [key, label, hearth, note] of REL.rel) {
  await force('rh_' + key); await wait(250);
  const m = await meta();
  const cue = await txt('#cue');
  if (!/hearth/i.test(cue)) { check(`${label}: cue mentions the hearth`, false, cue); continue; }
  // click the hearth country at its label point
  const [x, y] = await page.evaluate(id => {
    const D = JSON.parse(document.getElementById('mapdata').textContent);
    const q = D.quiz[id], r = document.getElementById('map').getBoundingClientRect();
    const sc = Math.min(r.width / D.w, r.height / D.h);
    const ox = (r.width - D.w * sc) / 2, oy = (r.height - D.h * sc) / 2;
    const t = document.getElementById('root').getAttribute('transform');
    const mm = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
    return [r.left + ox + (q.c[0] * +mm[3] + +mm[1]) * sc, r.top + oy + (q.c[1] * +mm[3] + +mm[2]) * sc];
  }, m.target);
  await page.mouse.click(x, y); await wait(120);
  const st = await state();
  check(`${label} → ${hearth}`, /Correct|Got it/.test(st.verdict) && st.verdict.includes(hearth), st.verdict);
}

console.log('\n— a wrong hearth click names what you hit —');
await force('rh_buddhism'); await wait(250);
{
  const [x, y] = await page.evaluate(() => {
    const D = JSON.parse(document.getElementById('mapdata').textContent);
    const q = D.quiz['c_Brazil'], r = document.getElementById('map').getBoundingClientRect();
    const sc = Math.min(r.width / D.w, r.height / D.h);
    const ox = (r.width - D.w * sc) / 2, oy = (r.height - D.h * sc) / 2;
    const t = document.getElementById('root').getAttribute('transform');
    const mm = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
    return [r.left + ox + (q.c[0] * +mm[3] + +mm[1]) * sc, r.top + oy + (q.c[1] * +mm[3] + +mm[2]) * sc];
  });
  await page.mouse.click(x, y); await wait(150);
  check('says you hit Brazil', /Brazil/.test((await state()).verdict), (await state()).verdict);
}

console.log('\n— the clock and the results card still work here —');
await page.select('#setSel', 'judaism'); await wait(400);
check('a one-religion round is short', (await state()).left <= 2, (await state()).left);
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) break;
  const st = await state();
  if (st.phase === 'done') { await page.evaluate(() => window.__dbg.next()); await wait(60); continue; }
  const m = await meta();
  if (m.kind === 'maj') {
    await page.evaluate(a => window.__dbg.pick(a), m.ans);
  } else {
    const [x, y] = await page.evaluate(id => {
      const D = JSON.parse(document.getElementById('mapdata').textContent);
      const q = D.quiz[id], r = document.getElementById('map').getBoundingClientRect();
      const sc = Math.min(r.width / D.w, r.height / D.h);
      const ox = (r.width - D.w * sc) / 2, oy = (r.height - D.h * sc) / 2;
      const t = document.getElementById('root').getAttribute('transform');
      const mm = t.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
      return [r.left + ox + (q.c[0] * +mm[3] + +mm[1]) * sc, r.top + oy + (q.c[1] * +mm[3] + +mm[2]) * sc];
    }, m.target);
    await page.mouse.click(x, y);
  }
  await wait(80);
}
check('round reaches the results card', await page.evaluate(() =>
  document.getElementById('sheet').classList.contains('open')));
check('it was timed', /\d:\d\d\.\d/.test(await txt('#tTime')), await txt('#tTime'));

console.log('\n— switching back to geography restores the old sets —');
await page.click('#mFind'); await wait(400);
const geoSets = await page.evaluate(() =>
  [...document.querySelectorAll('#setSel option')].map(o => o.value));
check('geography sets are back', geoSets.includes('countries') && geoSets.includes('water'), geoSets);
check('chips are hidden again', await page.evaluate(() =>
  getComputedStyle(document.getElementById('chips')).display === 'none'));
await force('c_Brazil'); await wait(200);
check('and geography questions still work', (await meta()).n === 'Brazil');

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
