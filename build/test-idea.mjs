// The "what should I code next?" box: shows once, closes without answering,
// and posts the answer to the configured endpoint. A local server stands in
// for the Apps Script web app and records what it receives.
//   node build/test-idea.mjs
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
    posted.push({ type: req.headers['content-type'] || '', body });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end('{"ok":true}');
  }
  try {
    const file = path === '/' ? 'index.html' : path.slice(1);
    const buf = await readFile(join(D, file));
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

// A page with the box pointed at our stand-in endpoint. The config is applied
// before load so the box behaves exactly as it will in production.
async function open_(opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  if (opts.configure !== false) {
    await page.evaluateOnNewDocument(url => {
      // stand in for the deployed endpoint before the page script runs
      window.__IDEA_URL__ = url;
    }, base + 'collect');
  }
  await page.goto(base, { waitUntil: 'load' });
  if (opts.fresh !== false) {
    // localStorage is shared across pages in this profile — a previous
    // scenario's "sent" flag would suppress the box here
    await page.evaluate(() => localStorage.removeItem('atlasdrill.idea.v1'));
    await page.reload({ waitUntil: 'load' });
  }
  if (opts.configure !== false) {
    await page.evaluate(() => { window.__dbg.idea({ URL: window.__IDEA_URL__ }); });
    await page.evaluate(() => { if (!localStorage.getItem('atlasdrill.idea.v1')) window.__dbg.showAsk(true); });
  }
  await wait(400);
  page.errs = errs;
  return page;
}
const isOpen = p => p.evaluate(() => window.__dbg.askOpen());
const txt = (p, s) => p.evaluate(x => document.querySelector(x).textContent.trim(), s);

console.log('— it shows up, with the question as written —');
let page = await open_();
check('the box is open', await isOpen(page));
const q = await txt(page, '#askQ');
check('asks the right thing', /What else should I code that would help with school/.test(q), q);
check('keeps the sign-off', /Elsa/.test(q) && /❤/.test(q), q);
check('has a place to type', await page.evaluate(() => !!document.getElementById('askText')));
check('no page errors', page.errs.length === 0, page.errs);

console.log('\n— the clock waits while the box is up —');
const t1 = await txt(page, '#sTime');
await wait(1200);
check('clock is frozen behind it', (await txt(page, '#sTime')) === t1, { was: t1, now: await txt(page, '#sTime') });

console.log('\n— the x closes it without answering —');
await page.click('#askX'); await wait(300);
check('box is closed', !(await isOpen(page)));
check('nothing was sent', posted.length === 0, posted);
check('clock starts again', secsAfter(await txt(page, '#sTime'), t1), { was: t1, now: await txt(page, '#sTime') });
function secsAfter(now, before) {
  const n = s => { const m = s.match(/^(\d+):(\d\d)\.(\d)$/); return m ? +m[1] * 60 + +m[2] + +m[3] / 10 : NaN; };
  return n(now) >= n(before);
}
check('a small tab is left to reopen it', await page.evaluate(() => !document.getElementById('askTab').hidden));
await page.click('#askTab'); await wait(250);
check('the tab brings it back', await isOpen(page));

console.log('\n— submitting —');
await page.click('#askX'); await wait(200);
await page.click('#askTab'); await wait(250);
await page.click('#askSend'); await wait(200);
check('empty answers are refused', /type something/i.test(await txt(page, '#askMsg')), await txt(page, '#askMsg'));
check('still nothing sent', posted.length === 0);

await page.type('#askText', 'a flashcard app for spanish verbs');
await page.click('#askSend');
await wait(700);
check('the answer reached the endpoint', posted.length === 1, posted);
if (posted.length) {
  let parsed = null; try { parsed = JSON.parse(posted[0].body); } catch {}
  check('it arrives as JSON Code.gs can read', !!parsed && typeof parsed.idea === 'string', posted[0]);
  check('the text is intact', parsed && parsed.idea === 'a flashcard app for spanish verbs', parsed);
  check('it records which page it came from', !!(parsed && parsed.page), parsed);
  check('sent as text/plain, so no CORS preflight', /text\/plain/.test(posted[0].type), posted[0].type);
}
check('says thank you', /thank you/i.test(await txt(page, '#askMsg')), await txt(page, '#askMsg'));
await wait(1400);
check('closes itself afterwards', !(await isOpen(page)));
check('and the tab is gone for good', await page.evaluate(() => document.getElementById('askTab').hidden));

console.log('\n— it does not nag —');
const before = posted.length;
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => window.__dbg.idea({ URL: window.__IDEA_URL__ }));
await wait(900);
check('does not reappear once answered', !(await isOpen(page)), );
check('no duplicate submission', posted.length === before);
await page.close();

console.log('\n— a visitor who dismissed it is not re-asked —');
page = await open_();
check('box opens for a first-time visitor', await isOpen(page));
await page.click('#askX'); await wait(200);
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => window.__dbg.idea({ URL: window.__IDEA_URL__ }));
await wait(900);
check('stays closed on the next visit', !(await isOpen(page)));
await page.close();

console.log('\n— with no endpoint configured it never appears —');
page = await open_({ configure: false });
await wait(900);
check('no box for visitors', !(await isOpen(page)));
check('no reopen tab either', await page.evaluate(() => document.getElementById('askTab').hidden));
check('the quiz is unaffected', await page.evaluate(() => !!document.querySelector('#landLayer path')));
check('no page errors', page.errs.length === 0, page.errs);
await page.close();

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
