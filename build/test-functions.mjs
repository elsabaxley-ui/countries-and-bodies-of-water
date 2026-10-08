// DNA Lab's Functions mode: the part is lit and named, you type what it does,
// and an inline suggestion completes a phrase on Enter.
//   node build/test-functions.mjs
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
const ghost = () => page.evaluate(() => window.__dbg.ghost());
const val = () => page.evaluate(() => document.getElementById('answer').value);
const type = async t => { await page.click('#answer'); await page.type('#answer', t); await wait(120); };

console.log('— the tab belongs to the lab only —');
check('not offered on the map', await page.evaluate(() => document.getElementById('mFn').hidden));
await page.click('#appDna'); await wait(600);
check('offered in the lab', !(await page.evaluate(() => document.getElementById('mFn').hidden)));
check('Religions is not', await page.evaluate(() => document.getElementById('mRel').hidden));

console.log('\n— it shows the part lit AND named —');
await page.click('#mFn'); await wait(500);
await force('d_ligase'); await wait(250);
check('the name is given', (await txt('#prompt')) === 'Ligase', await txt('#prompt'));
check('the part is lit on the diagram', await page.evaluate(() =>
  document.querySelector('#lab .part[data-id="d_ligase"]').classList.contains('is-target')));
check('the cue asks for the job', /what does this one do/i.test(await txt('#cue')), await txt('#cue'));
check('there is a box to type in', await page.evaluate(() =>
  getComputedStyle(document.getElementById('answerRow')).display !== 'none'));

console.log('\n— the answer is not sitting there in plain sight —');
check('no description while the question is open', (await txt('#desc')) === '', await txt('#desc'));

console.log('\n— the suggestion —');
check('nothing suggested on one letter', (await type('S'), !(await ghost()).shown), await ghost());
await page.evaluate(() => { document.getElementById('answer').value = ''; });
await type('Seals');
let g = await ghost();
check('three letters in, a completion appears', g.shown, g);
check('it completes to a real phrase', /^Seals the nick/.test(g.text), g.text);
check('only the untyped part is grey', g.rest === g.text.slice('Seals'.length), g);
check('the box itself is untouched', (await val()) === 'Seals', await val());

await page.keyboard.press('Enter'); await wait(150);
check('Enter takes the suggestion', (await val()) === g.text, await val());
check('and it is no longer pending', !(await ghost()).shown);
check('nothing was answered yet', (await state()).phase === 'ask');
await page.keyboard.press('Enter'); await wait(200);
check('a second Enter answers it', /Correct|Got it/.test((await state()).verdict), (await state()).verdict);
check('and now the description appears', /seals the nick/i.test(await txt('#desc')), await txt('#desc'));
check('the suggestion stays inside the field', await page.evaluate(() => {
  const g = document.getElementById('ghostWrap').getBoundingClientRect();
  const i = document.getElementById('answer').getBoundingClientRect();
  return g.right <= i.right + 1;
}));

console.log('\n— the suggestions are pooled, not the answer key —');
await force('d_ligase'); await wait(200);
await type('Bui');
g = await ghost();
check('typing a different verb suggests another part’s phrase',
  /^Builds the new strand/.test(g.text), g.text);
check('so the pool cannot hand you the answer', !/nick/i.test(g.text), g.text);

console.log('\n— grading accepts real wording —');
const cases = [
  ['d_helicase', 'unzips the dna', true],
  ['d_helicase', 'it separates the two strands', true],
  ['d_helicase', 'breaks the hydrogen bonds between bases', true],
  ['d_helicase', 'it helps', false],
  ['d_helicase', 'seals the fragments', false],
  ['d_polymerase', 'adds nucleotides', true],
  ['d_polymerase', 'builds the new strand', true],
  ['d_polymerase', 'unzips the strands', false],
  ['d_primase', 'makes the rna primer', true],
  ['d_primase', 'starts it off', true],
  ['d_ligase', 'glues the fragments together', true],
  ['d_ligase', 'seals the gap', true],
  ['d_ligase', 'glues strands together', true],
  ['d_ligase', 'glues dna', true],
  ['d_ligase', 'sticks the dna back together', true],
  ['d_ligase', 'seals', false],
  ['d_ligase', 'glues', false],
  ['d_nucleotide', 'its the building block of dna', true],
  ['d_nucleotide', 'a phosphate a sugar and a base', true],
  ['d_leading', 'made continuously', true],
  ['d_leading', 'built in one piece', true],
  ['d_leading', 'built in fragments', false],
  ['d_lagging', 'built in okazaki fragments', true],
  ['d_lagging', 'made backwards in pieces', true],
  // the imageless terms
  ['d_enzyme', 'speeds up a reaction', true],
  ['d_enzyme', 'a protein', false],
  ['d_mitosis', 'makes two identical cells', true],
  ['d_mitosis', 'makes four sex cells', false],
  ['d_meiosis', 'cell division that makes four gametes', true],
  ['d_meiosis', 'makes two identical body cells', false],
  ['d_chromosome', 'coiled up dna', true],
  ['d_chromosome', 'a cell', false],
  ['d_at', 'a pairs with t', true],
  ['d_at', 'adenine and thymine', true],
  ['d_at', 'a pairs with g', false],
  ['d_cg', 'c pairs with g', true],
  ['d_cg', 'cytosine and guanine', true],
  ['d_cg', 'c pairs with t', false],
  // the three parts of a nucleotide, from Quick Check 1
  ['d_phosphate', 'makes the sides of the ladder', true],
  ['d_phosphate', 'with the sugar it makes the backbone', true],
  ['d_phosphate', 'in the middle of the molecule', false],
  ['d_sugar', 'part of the backbone', true],
  ['d_sugar', 'forms the sides', true],
  ['d_base', 'pairs in the middle', true],
  ['d_base', 'they bond across the rungs', true],
  ['d_base', 'makes the sides', false],
];
for (const [id, text, want] of cases) {
  await force(id); await wait(80);
  await page.evaluate(t => { document.getElementById('answer').value = t; window.__dbg.answer(t); }, text);
  await wait(90);
  const v = (await state()).verdict;
  check(`"${text}" ${want ? 'accepted' : 'rejected'}`, /Correct|Got it/.test(v) === want, v);
}

console.log('\n— revealing gives the model answer —');
await force('d_primase'); await wait(150);
await page.click('#skipBtn'); await wait(250);
check('the proper wording is shown', /RNA primer/i.test(await txt('#desc')), await txt('#desc'));

console.log('\n— terms with no picture —');
const TERMS = ['d_enzyme', 'd_mitosis', 'd_meiosis', 'd_chromosome', 'd_at', 'd_cg'];
check('they are in the question set', await page.evaluate(t =>
  t.every(id => window.__dbg.dnaIds().includes(id)), TERMS));
check('nothing on the diagram claims to be one', await page.evaluate(t =>
  t.every(id => !document.querySelector(`#lab .part[data-id="${id}"]`)), TERMS));

await page.click('#mFn'); await wait(300);
await force('d_meiosis'); await wait(200);
check('Functions asks what it is, not what it does',
  /what is this/i.test(await txt('#cue')), await txt('#cue'));
check('the word is given', (await txt('#prompt')) === 'Meiosis', await txt('#prompt'));
check('nothing is lit up', await page.evaluate(() =>
  document.querySelectorAll('#lab .part.is-target').length === 0));
check('and the answer is not shown', (await txt('#desc')) === '', await txt('#desc'));

await page.click('#mName'); await wait(400);
await force('d_chromosome'); await wait(250);
check('Name it gives the definition as the clue',
  /coiled/i.test(await txt('#desc')), await txt('#desc'));
check('the word itself is hidden', (await txt('#prompt')) === '· · ·', await txt('#prompt'));
check('the cue says so', /from the description/i.test(await txt('#cue')), await txt('#cue'));
await page.evaluate(() => window.__dbg.answer('chromosome')); await wait(150);
check('typing the word answers it', /Correct|Got it/.test((await state()).verdict),
  (await state()).verdict);
await force('d_meiosis'); await wait(150);
await page.evaluate(() => window.__dbg.answer('mitosis')); await wait(150);
check('mitosis is not accepted for meiosis', !/Correct|Got it/.test((await state()).verdict),
  (await state()).verdict);

console.log('\n— the three parts of a nucleotide are on the picture —');
for (const [id, name] of [['d_phosphate', 'Phosphate group'], ['d_sugar', 'Sugar'],
                          ['d_base', 'Nitrogenous base']]) {
  check(`${name} is drawn`, await page.evaluate(i =>
    !!document.querySelector(`#lab .part[data-id="${i}"] .unit`), id));
}
check('the inset is tied back to the fork', await page.evaluate(() =>
  !!document.querySelector('#lab .leader')));
await page.click('#mName'); await wait(400);
await force('d_sugar'); await wait(250);
check('naming the sugar works from its clue', await (async () => {
  await page.evaluate(() => window.__dbg.answer('deoxyribose'));
  await wait(120);
  return /Correct|Got it/.test((await state()).verdict);
})(), (await state()).verdict);

console.log('\n— Find it only asks about things on the picture —');
await page.click('#mFind'); await wait(500);
check('the round is only the drawn parts', (await state()).left + 1 === 10, (await state()).left + 1);
{
  const asked = new Set();
  for (let i = 0; i < 25; i++) {
    asked.add((await state()).current);
    await page.evaluate(() => window.__dbg.next());
    await wait(25);
  }
  check('no term is ever asked to be clicked',
    ![...asked].some(id => TERMS.includes(id)), [...asked].filter(id => TERMS.includes(id)));
}

console.log('\n— Mixed includes it in the lab —');
await page.click('#mName'); await wait(300);
await page.click('#mMix'); await wait(400);
const seen = new Set();
for (let i = 0; i < 40; i++) {
  seen.add((await state()).curMode);
  await page.evaluate(() => window.__dbg.next());
  await wait(30);
}
check('find, name and function all come up',
  ['find', 'name', 'fn'].every(m => seen.has(m)), [...seen]);
check('and a term is never dealt as Find it', await page.evaluate(async t => {
  for (let i = 0; i < 60; i++) {
    const s = window.__dbg.state();
    if (t.includes(s.current) && s.curMode === 'find') return false;
    window.__dbg.next();
    await new Promise(r => setTimeout(r, 5));
  }
  return true;
}, TERMS));

console.log('\n— leaving the lab drops the mode —');
await page.click('#mFn'); await wait(300);
await page.click('#appAtlas'); await wait(600);
check('the tab is hidden again', await page.evaluate(() => document.getElementById('mFn').hidden));
check('and the map is back on a map mode', ['find', 'name', 'mix', 'rel']
  .includes(await page.evaluate(() => window.__dbg.state().curMode === 'fn' ? 'fn' : 'ok')) === false
  || (await state()).curMode !== 'fn');
await force('c_Brazil'); await wait(200);
check('map questions still work', (await meta()).n === 'Brazil');

console.log('\nerrors:', errs.length ? errs : 'none');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
