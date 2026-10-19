// Cell Division: the third app. Two filmstrips (Mitosis, Meiosis I+II), Find
// it / Name it / Mixed, plus vocabulary terms with no picture.
//   node build/test-cell.mjs
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
    localStorage.setItem('atlasdrill.bionote.v1', 'seen');
    localStorage.setItem('atlasdrill.signup.v1', 'later');
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
async function clickPart(id) {
  const pt = await page.evaluate(i => {
    const g = document.querySelector(`#cellLab .part[data-id="${i}"]`);
    const r = (g.querySelector('.hit') || g.querySelector('.cellbody')).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, id);
  await page.mouse.click(pt[0], pt[1]);
}
// runs a round to completion by always answering correctly (Name it / typing)
async function finishRoundByTyping(maxSteps) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))) return true;
    const st = await state();
    if (st.phase === 'done') { await page.evaluate(() => window.__dbg.next()); await wait(30); continue; }
    const name = (await meta()).n;
    await page.evaluate(n => window.__dbg.answer(n), name);
    await wait(30);
  }
  return false;
}

const MITOSIS = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase', 'Cytokinesis'];
const MEIOSIS_I = ['Prophase I', 'Metaphase I', 'Anaphase I', 'Telophase I', 'Cytokinesis I'];
const MEIOSIS_II = ['Prophase II', 'Metaphase II', 'Anaphase II', 'Telophase II', 'Cytokinesis II'];
const TERMS = ['Chromatid', 'Centromere', 'Centriole', 'Spindle', 'Diploid', 'Haploid',
               'Homologous chromosomes', 'Mitosis', 'Meiosis'];

console.log('— the third app sits in the switcher —');
check('hidden to start (on Atlas Drill)', !(await vis('#cellTabs')));
await page.click('#appCell'); await wait(600);
check('Cell Division is pressed', await page.evaluate(() =>
  document.getElementById('appCell').getAttribute('aria-pressed') === 'true'));
check('the title changes', (await txt('#brand')) === 'Cell Division');
check('the map is gone', !(await vis('#map')));
check('DNA Lab’s diagram is gone too', !(await vis('#lab')));
check('the Mitosis/Meiosis switch appears', await vis('#cellTabs'));
check('Religions is not offered here', !(await vis('#mRel')));
check('nor is Functions', !(await vis('#mFn')));
check('Mitosis is the default', await page.evaluate(() =>
  document.getElementById('ctMitosis').getAttribute('aria-pressed') === 'true'));
check('a Find it round is the 6 mitosis stages', (await state()).left + 1 === 6, (await state()).left + 1);
check('header counts parts', /6 parts/.test(await txt('#setSize')), await txt('#setSize'));

console.log('\n— every mitosis stage exists, unlabelled until answered —');
const cellIds = await page.evaluate(() => window.__dbg.cellIds());
for (const name of MITOSIS) {
  check(`${name} is on the diagram`, await page.evaluate(n =>
    !!document.querySelector(`#cellLab .part[data-name="${n}"]`), name));
}
check('no stage name is readable yet', await page.evaluate(() =>
  [...document.querySelectorAll('#cellLab .plabel')].every(t => +getComputedStyle(t).opacity === 0)));

console.log('\n— Find it: clicking the filmstrip —');
for (const id of cellIds.filter(i => i.startsWith('cm_'))) {
  await force(id); await wait(150);
  const name = (await meta()).n;
  check(`cue names ${name}`, (await txt('#prompt')) === name, await txt('#prompt'));
  check(`description shown up front for ${name}`, (await txt('#desc')).length > 10, await txt('#desc'));
  await clickPart(id); await wait(150);
  const s = await state();
  check(`clicking ${name} scores`, /Correct|Got it/.test(s.verdict), s.verdict);
  check(`${name} is labelled afterwards`, await page.evaluate(i =>
    document.querySelector(`#cellLab .part[data-id="${i}"]`).classList.contains('named'), id));
}

console.log('\n— a wrong click says what you actually hit —');
await force('cm_prophase'); await wait(200);
await clickPart('cm_telophase'); await wait(150);
check('names Telophase, not the right answer', /That.s Telophase/.test((await state()).verdict),
  (await state()).verdict);
check('does not score it', !/Correct|Got it/.test((await state()).verdict));

console.log('\n— Name it: typing, with the description as the clue —');
await page.click('#mName'); await wait(500);
check('a Name it round adds the 9 vocab terms', (await state()).left + 1 === 15, (await state()).left + 1);
const typed = async (id, text) => {
  await force(id); await wait(100);
  await page.evaluate(t => window.__dbg.answer(t), text);
  await wait(100);
  return (await state()).verdict;
};
const cases = [
  ['cm_anaphase', 'anaphase', true], ['cm_anaphase', 'Anaphase', true],
  ['cm_anaphase', 'metaphase', false],
  ['cm_cytokinesis', 'cytokinesis', true],
  ['cv_homologous', 'homologous chromosomes', true], ['cv_homologous', 'homologous', true],
  ['cv_homologous', 'homolog', true],
  ['cv_mitosis', 'mitosis', true], ['cv_meiosis', 'meiosis', true],
  ['cv_mitosis', 'meiosis', false], ['cv_meiosis', 'mitosis', false],
  ['cv_diploid', 'diploid', true], ['cv_haploid', 'haploid', true],
  ['cv_diploid', 'haploid', false],
  ['cv_chromatid', 'chromatid', true], ['cv_chromatid', 'chromatids', true],
  ['cv_centromere', 'centromere', true], ['cv_centriole', 'centriole', true],
  ['cv_spindle', 'spindle', true],
];
for (const [id, text, want] of cases) {
  const v = await typed(id, text);
  check(`"${text}" ${want ? 'accepted' : 'rejected'} for ${id.slice(3)}`,
    /Correct|Got it/.test(v) === want, v);
}

console.log('\n— no description leaks the word it describes —');
for (const id of cellIds) {
  await force(id); await wait(80);
  const d = (await txt('#desc')).toLowerCase();
  const name = (await meta()).n.toLowerCase();
  const leaks = name.split(/[\s–]+/).filter(w => w.length > 4 && d.includes(w));
  check(`${name}: description does not say it`, leaks.length === 0, leaks);
}

console.log('\n— vocab terms have no picture, so Find it skips them —');
await page.click('#mFind'); await wait(400);
check('round is back to 6 (drawn parts only)', (await state()).left + 1 === 6, (await state()).left + 1);
{
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    seen.add((await state()).current);
    await page.evaluate(() => window.__dbg.next());
    await wait(20);
  }
  check('no vocab term ever asked to be clicked',
    ![...seen].some(id => id.startsWith('cv_')), [...seen].filter(id => id.startsWith('cv_')));
}

console.log('\n— switching to Meiosis —');
await page.click('#ctMeiosis'); await wait(500);
check('Meiosis is pressed', await page.evaluate(() =>
  document.getElementById('ctMeiosis').getAttribute('aria-pressed') === 'true'));
check('Mitosis figure is hidden', await page.evaluate(() =>
  document.getElementById('cellMitosisFig').hidden));
check('Meiosis figure shows', await page.evaluate(() =>
  !document.getElementById('cellMeiosisFig').hidden));
check('a Find it round is 10 stages (5 + 5, no bare interphase)',
  (await state()).left + 1 === 10, (await state()).left + 1);
for (const name of [...MEIOSIS_I, ...MEIOSIS_II]) {
  check(`${name} is on the diagram`, await page.evaluate(n =>
    !!document.querySelector(`#cellLab .part[data-name="${n}"]`), name));
}
check('the shared pre-meiosis interphase is not its own quiz item (just 10, not 11)',
  cellIds.filter(i => i === 'c1_interphase').length === 0);

console.log('\n— Anaphase I and Anaphase II are genuinely different questions —');
await force('c1_anaphase'); await wait(200);
await clickPart('c1_anaphase'); await wait(150);
check('Anaphase I accepted on its own frame', /Correct|Got it/.test((await state()).verdict),
  (await state()).verdict);
await force('c2_anaphase'); await wait(200);
await clickPart('c1_anaphase'); await wait(150);
check('clicking Anaphase I’s frame does not answer Anaphase II',
  !/Correct|Got it/.test((await state()).verdict), (await state()).verdict);
check('and says which one was actually clicked', /Anaphase I\b/.test((await state()).verdict),
  (await state()).verdict);

console.log('\n— the descriptions carry the actual distinction asked for —');
await page.click('#mFind'); await wait(300);
await force('c1_anaphase'); await wait(150);
check('Anaphase I: whole chromosomes, chromatids stay joined',
  /chromatids stay joined/i.test(await txt('#desc')), await txt('#desc'));
await force('c2_anaphase'); await wait(150);
check('Anaphase II: chromatids finally separate',
  /chromatids finally separate/i.test(await txt('#desc')), await txt('#desc'));
await force('c2_prophase'); await wait(150);
check('Prophase II notes there is no new DNA copying first',
  /no new round of DNA copying/i.test(await txt('#desc')), await txt('#desc'));
await force('c1_prophase'); await wait(150);
check('Prophase I is the one that mentions crossing over',
  /crossing over/i.test(await txt('#desc')), await txt('#desc'));

console.log('\n— a full Meiosis Name it round finishes —');
await page.click('#mName'); await wait(400);
check('round is 10 stages + 9 shared vocab terms', (await state()).left + 1 === 19, (await state()).left + 1);
const done = await finishRoundByTyping(90);
check('the round reaches the results card', done);
check('it was timed', /\d:\d\d\.\d/.test(await txt('#tTime')), await txt('#tTime'));
await page.click('#closeBtn'); await wait(200);

console.log('\n— pause covers the diagram here too —');
await page.click('#mFind'); await wait(300);
await page.click('#pauseBtn'); await wait(200);
check('the veil opens', await page.evaluate(() => document.getElementById('veil').classList.contains('open')));
await page.click('#resumeBtn'); await wait(300);
check('and clears', !(await page.evaluate(() => document.getElementById('veil').classList.contains('open'))));

console.log('\n— Mixed shuffles find and name, never breaking a term —');
await page.click('#mMix'); await wait(400);
{
  const seenModes = new Set();
  for (let i = 0; i < 40; i++) {
    const s = await state();
    seenModes.add(s.curMode);
    if (s.current && s.current.startsWith('cv_')) {
      check(`vocab term ${s.current} is never dealt as find`, s.curMode !== 'find', s);
    }
    await page.evaluate(() => window.__dbg.next());
    await wait(15);
  }
  check('both find and name show up', seenModes.has('find') && seenModes.has('name'), [...seenModes]);
}

console.log('\n— leaving Cell Division resets cleanly —');
await page.click('#appAtlas'); await wait(600);
check('title is back to Atlas Drill', (await txt('#brand')) === 'Atlas Drill');
check('the map is back', await vis('#map'));
check('Cell Division’s figures are gone', !(await vis('#cellLab')));
check('the mitosis/meiosis switch is hidden', !(await vis('#cellTabs')));
check('Religions is offered again', await vis('#mRel'));
await force('c_Brazil'); await wait(200);
check('map questions still work', (await meta()).n === 'Brazil');

console.log('\n— DNA Lab is unaffected by any of this —');
await page.click('#appDna'); await wait(600);
check('Functions is offered, Religions and the cell switch are not',
  (await vis('#mFn')) && !(await vis('#mRel')) && !(await vis('#cellTabs')));
check('old mitosis/meiosis DNA-Lab terms are gone (moved to Cell Division)',
  await page.evaluate(() => !window.__dbg.dnaIds().includes('d_mitosis') &&
                             !window.__dbg.dnaIds().includes('d_meiosis')));
await force('d_helicase'); await wait(150);
check('DNA Lab questions still work', (await meta()).n === 'Helicase');

console.log('\n— best times are kept separately from the other two apps —');
await page.evaluate(() => localStorage.removeItem('atlasdrill.best.v1'));
await page.reload({ waitUntil: 'load' }); await wait(600);
await page.evaluate(() => window.__dbg.app('cell'));
await page.click('#mName'); await wait(400);
check('no best yet for Cell Division', (await txt('#sBest')) === '—', await txt('#sBest'));
await finishRoundByTyping(90);
const cellBest = await txt('#tBest');
check('Cell Division now has a best', cellBest !== '—', cellBest);
await page.click('#closeBtn'); await wait(200);
await page.evaluate(() => window.__dbg.app('dna'));
await wait(400);
check('DNA Lab’s best is unaffected (separate key)', (await txt('#sBest')) === '—', await txt('#sBest'));

console.log('\n— nothing overflows on a phone —');
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.evaluate(() => window.__dbg.app('cell'));
await wait(600);
check('fits without horizontal scroll', await page.evaluate(() =>
  document.documentElement.scrollWidth - window.innerWidth <= 1));
check('the diagram is visible', await vis('#cellLab'));

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
