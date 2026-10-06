// The one-time note pointing at the Religions tab.
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

console.log('— it greets a first-time visitor —');
let page = await open_();
check('the note is showing', await shown(page));
const text = await page.evaluate(() => document.querySelector('#notice p').textContent.replace(/\s+/g, ' ').trim());
check('says it is still being worked on', /Still working on it, might not be accurate!/.test(text), text);
check('thanks people for suggestions', /Thank you for all the suggestions!/.test(text), text);
check('signed with a heart', /❤/.test(text) && /Elsa\s*$/.test(text), text);

console.log('\n— it points at the Religions tab —');
const geo = await page.evaluate(() => {
  const n = document.getElementById('notice').getBoundingClientRect();
  const t = document.getElementById('mRel').getBoundingClientRect();
  const arrow = parseFloat(getComputedStyle(document.getElementById('notice')).getPropertyValue('--arrow'));
  return { n: { l: n.left, r: n.right, t: n.top, b: n.bottom }, t: { l: t.left, r: t.right, b: t.bottom, c: t.left + t.width / 2 }, arrow };
});
check('sits just below the tab', geo.n.t > geo.t.b && geo.n.t - geo.t.b < 20, geo);
check('its arrow lands on the tab',
  geo.n.l + geo.arrow >= geo.t.l - 2 && geo.n.l + geo.arrow <= geo.t.r + 2, geo);
check('stays inside the window', geo.n.l >= 0 && geo.n.r <= 1280, geo);
check('the tab itself is marked', await page.evaluate(() =>
  document.getElementById('mRel').classList.contains('nudge')));

console.log('\n— the clock waits for it —');
const t0 = await page.evaluate(() => document.getElementById('sTime').textContent);
await wait(1200);
check('clock is frozen behind the note',
  (await page.evaluate(() => document.getElementById('sTime').textContent)) === t0,
  { was: t0, now: await page.evaluate(() => document.getElementById('sTime').textContent) });

console.log('\n— dismissing hands over to the idea box —');
check('idea box waits its turn', !(await page.evaluate(() => window.__dbg.askOpen())));
await page.click('#noticeOk');
await wait(900);
check('the note is gone', !(await shown(page)));
check('the tab mark is cleared', !(await page.evaluate(() =>
  document.getElementById('mRel').classList.contains('nudge'))));
check('the idea box comes up next', await page.evaluate(() => window.__dbg.askOpen()));
check('the clock is still held by the idea box',
  !(await page.evaluate(() => document.querySelector('.stat.clock').classList.contains('running'))));
await page.click('#askX'); await wait(400);
check('and runs once both are closed',
  await page.evaluate(() => document.querySelector('.stat.clock').classList.contains('running')));
check('no page errors', page.errs.length === 0, page.errs);
await page.close();

console.log('\n— it only appears once —');
page = await open_();
await page.click('#noticeOk'); await wait(300);
await page.reload({ waitUntil: 'load' }); await wait(1100);
check('not shown again on the next visit', !(await shown(page)));
await page.close();

console.log('\n— with no idea endpoint, the note still works alone —');
page = await open_(base + 'no-idea');
check('note shows', await shown(page));
await page.click('#noticeOk'); await wait(600);
check('note closes', !(await shown(page)));
check('no idea box appears', !(await page.evaluate(() => window.__dbg.askOpen())));
check('the clock resumes', await page.evaluate(() =>
  document.querySelector('.stat.clock').classList.contains('running')));
await page.close();

console.log('\n— on a phone —');
page = await open_(base, { width: 390, height: 844, isMobile: true, hasTouch: true });
check('note shows', await shown(page));
const m = await page.evaluate(() => {
  const n = document.getElementById('notice').getBoundingClientRect();
  const t = document.getElementById('mRel').getBoundingClientRect();
  const arrow = parseFloat(getComputedStyle(document.getElementById('notice')).getPropertyValue('--arrow'));
  return { nl: n.left, nr: n.right, nt: n.top, tb: t.bottom, tl: t.left, tr: t.right, arrow };
});
check('fits the screen', m.nl >= 0 && m.nr <= 390, m);
check('still points at the tab', m.nl + m.arrow >= m.tl - 2 && m.nl + m.arrow <= m.tr + 2, m);
check('still below the tab', m.nt > m.tb, m);
await page.close();

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
