// The one-time notes: bio first, then religions, then the idea box.
//   node build/test-notice.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// serve locally with the idea endpoint stripped, so the two popups can be
// tested together and apart without posting anything to the real sheet
const posted = [];
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/collect') { posted.push(1); res.writeHead(200); return res.end('{}'); }
  let html = await readFile(join(D, 'index.html'), 'utf8');
  html = html.replace(/URL:'https:\/\/script\.google\.com[^']*'/,
    path === '/no-idea' ? "URL:''" : `URL:'/collect'`);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

async function open_(url = base, viewport = { width: 1280, height: 860 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'load' });
  await wait(1100);
  page.errs = errs;
  return page;
}
const shown = p => p.evaluate(() => {
  const n = document.getElementById('notice');
  return !n.hidden && getComputedStyle(n).display !== 'none';
});

const anchorCheck = async (page, anchorId) => page.evaluate(id => {
  const n = document.getElementById('notice').getBoundingClientRect();
  const t = document.getElementById(id).getBoundingClientRect();
  const arrow = parseFloat(getComputedStyle(document.getElementById('notice'))
    .getPropertyValue('--arrow'));
  return {
    below: n.top > t.bottom && n.top - t.bottom < 22,
    pointsAt: n.left + arrow >= t.left - 2 && n.left + arrow <= t.right + 2,
    onScreen: n.left >= 0 && n.right <= window.innerWidth,
    nudged: document.getElementById(id).classList.contains('nudge'),
  };
}, anchorId);
const noticeText = p => p.evaluate(() =>
  document.getElementById('noticeText').textContent.replace(/\s+/g, ' ').trim());

console.log('— the bio note comes first —');
let page = await open_();
check('a note is showing', await shown(page));
let t = await noticeText(page);
check('it is the bio one', /Working on a bio section/.test(t), t);
check('with the full wording', /Still a work in progress, I.m open to any suggestions!/.test(t), t);
check('signed with a heart', /❤/.test(t) && /Elsa\s*$/.test(t), t);
let geo = await anchorCheck(page, 'appDna');
check('pinned under the DNA Lab button', geo.below, geo);
check('its arrow lands on that button', geo.pointsAt, geo);
check('and the button is marked', geo.nudged, geo);
check('stays inside the window', geo.onScreen, geo);
check('the religions tab is not marked yet', !(await page.evaluate(() =>
  document.getElementById('mRel').classList.contains('nudge'))));

console.log('\n— the clock waits for it —');
const t0 = await page.evaluate(() => document.getElementById('sTime').textContent);
await wait(1200);
check('clock is frozen behind the note',
  (await page.evaluate(() => document.getElementById('sTime').textContent)) === t0);

console.log('\n— Got it hands over to the religions note —');
check('idea box waits its turn', !(await page.evaluate(() => window.__dbg.askOpen())));
await page.click('#noticeOk'); await wait(700);
check('a note is still showing', await shown(page));
t = await noticeText(page);
check('now the religions one', /might not be accurate/.test(t), t);
geo = await anchorCheck(page, 'mRel');
check('pinned under the Religions tab', geo.below, geo);
check('its arrow lands on that tab', geo.pointsAt, geo);
check('the DNA button is no longer marked', !(await page.evaluate(() =>
  document.getElementById('appDna').classList.contains('nudge'))));
check('still no idea box', !(await page.evaluate(() => window.__dbg.askOpen())));

console.log('\n— then the idea box —');
await page.click('#noticeOk'); await wait(900);
check('the notes are done', !(await shown(page)));
check('the idea box comes up', await page.evaluate(() => window.__dbg.askOpen()));
check('the clock is still held', !(await page.evaluate(() =>
  document.querySelector('.stat.clock').classList.contains('running'))));
await page.click('#askX'); await wait(400);
check('and runs once everything is closed', await page.evaluate(() =>
  document.querySelector('.stat.clock').classList.contains('running')));
check('no page errors', page.errs.length === 0, page.errs);
await page.close();

console.log('\n— neither note comes back —');
page = await open_();
await page.click('#noticeOk'); await wait(500);
await page.click('#noticeOk'); await wait(500);
await page.reload({ waitUntil: 'load' }); await wait(1100);
check('nothing on the next visit', !(await shown(page)));
await page.close();

console.log('\n— dismissing only the first still shows the second next time —');
page = await open_();
await page.click('#noticeOk'); await wait(500);          // bio only
await page.reload({ waitUntil: 'load' }); await wait(1200);
check('the religions note is waiting', await shown(page));
check('and it is the religions one', /might not be accurate/.test(await noticeText(page)));
await page.close();

console.log('\n— on a phone —');
page = await open_(base, { width: 390, height: 844, isMobile: true, hasTouch: true });
check('note shows', await shown(page));
let m = await anchorCheck(page, 'appDna');
check('fits the screen', m.onScreen, m);
check('still points at the button', m.pointsAt, m);
check('still below it', m.below, m);
await page.click('#noticeOk'); await wait(700);
m = await anchorCheck(page, 'mRel');
check('the second one points at its tab too', m.pointsAt && m.below && m.onScreen, m);
await page.close();

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
