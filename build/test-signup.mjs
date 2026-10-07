// The update-list popup: shown first, posts a name to the sheet's Email list
// column, and hands over to the notes behind it.
//   node build/test-signup.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const posted = [];
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/collect' && req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    posted.push(body);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end('{"ok":true}');
  }
  let html = await readFile(join(D, 'index.html'), 'utf8');
  html = html.replace(/URL:'https:\/\/script\.google\.com[^']*'/, `URL:'/collect'`);
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

async function open_(viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await wait(1100);
  page.errs = errs;
  return page;
}
const up = p => p.evaluate(() => window.__dbg.signupOpen());
const noticeUp = p => p.evaluate(() => {
  const n = document.getElementById('notice');
  return !n.hidden && getComputedStyle(n).display !== 'none';
});
const txt = (p, s) => p.evaluate(x => document.querySelector(x).textContent.replace(/\s+/g, ' ').trim(), s);

console.log('— it greets a first-time visitor, before anything else —');
let page = await open_();
check('the signup is open', await up(page));
check('the notes are waiting', !(await noticeUp(page)));
check('so is the idea box', !(await page.evaluate(() => window.__dbg.askOpen())));

const body = (await txt(page, '#signupQ')) + ' ' + (await txt(page, '.signoff'));
check('says the quiz is this week', /Map Quiz is this week/i.test(body), body);
check('promises to keep making materials', /keep making\s+study materials/i.test(body), body);
check('asks for a name for Schoology', /leave your name/i.test(body) && /Schoology/i.test(body), body);
check('wishes them luck', /Good luck on your APHG Map Quiz/i.test(body), body);
check('thanks them', /thank you for using\s+my website/i.test(body), body);
check('signed with a heart', /❤/.test(body) && /Elsa/.test(body), body);
check('there is a name field', await page.evaluate(() => !!document.getElementById('signupName')));

console.log('\n— the clock waits for it —');
const t0 = await txt(page, '#sTime');
await wait(1200);
check('frozen behind the popup', (await txt(page, '#sTime')) === t0, { t0, now: await txt(page, '#sTime') });

console.log('\n— signing up —');
await page.click('#signupSend'); await wait(200);
check('an empty name is refused', /name in first/i.test(await txt(page, '#signupMsg')), await txt(page, '#signupMsg'));
check('nothing was sent', posted.length === 0, posted);

await page.type('#signupName', 'Jordan Pike');
await page.click('#signupSend');
await wait(700);
check('the name reached the endpoint', posted.length === 1, posted);
let parsed = null; try { parsed = JSON.parse(posted[0]); } catch {}
check('sent as a list signup, not an idea', !!parsed && parsed.list === 'Jordan Pike' && !parsed.idea, parsed);
check('it says they are on the list', /on the list/i.test(await txt(page, '#signupMsg')), await txt(page, '#signupMsg'));

await wait(1600);
check('the popup closes itself', !(await up(page)));
check('and the notes follow', await noticeUp(page), await txt(page, '#noticeText'));
check('starting with the bio one', /bio section/i.test(await txt(page, '#noticeText')));
check('no page errors', page.errs.length === 0, page.errs);
await page.close();

console.log('\n— it does not ask twice —');
page = await open_();
await page.type('#signupName', 'Sam');
await page.click('#signupSend'); await wait(1800);
const n = posted.length;
await page.reload({ waitUntil: 'load' }); await wait(1200);
check('gone on the next visit', !(await up(page)));
check('no duplicate signup', posted.length === n, posted.length);
check('the notes still come up', await noticeUp(page));
await page.close();

console.log('\n— closing without signing up —');
page = await open_();
const before = posted.length;
await page.click('#signupX'); await wait(700);
check('the popup closes', !(await up(page)));
check('nothing sent', posted.length === before, posted.length);
check('the notes come next', await noticeUp(page));
await page.reload({ waitUntil: 'load' }); await wait(1200);
check('and it is not asked again', !(await up(page)));
await page.close();

console.log('\n— on a phone —');
page = await open_({ width: 390, height: 844, isMobile: true, hasTouch: true });
check('the popup shows', await up(page));
check('it fits the screen', await page.evaluate(() => {
  const c = document.querySelector('#signup .askcard').getBoundingClientRect();
  return c.left >= 0 && c.right <= window.innerWidth && c.height < window.innerHeight;
}));
check('no sideways scroll', await page.evaluate(() =>
  document.documentElement.scrollWidth - window.innerWidth <= 1));
await page.close();

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
