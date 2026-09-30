// The GA4 tag must fire on the real host and stay quiet everywhere else.
// Chrome is started with a host-resolver rule so a made-up public hostname
// points at the local server; requests to Google are aborted, so running this
// never sends real hits to the property.
//   node build/test-analytics.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ID = 'G-9RE1BS622W';

const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const file = path === '/' ? 'index.html' : path.slice(1);
  try {
    const body = await readFile(join(D, file));
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', `--host-resolver-rules=MAP atlas.test 127.0.0.1`],
});
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

// Load a URL and report which Google endpoints the page tried to reach.
async function visit(url) {
  const page = await browser.newPage();
  const hits = [];
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(u)) {
      hits.push(u);
      return r.abort();          // never send a real hit from a test
    }
    r.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  await wait(900);
  const hasGtag = await page.evaluate(() => typeof window.gtag === 'function');
  const queued = await page.evaluate(() => (window.dataLayer || []).length);
  const works = await page.evaluate(() => !!document.querySelector('#landLayer path'));
  await page.close();
  return { hits, hasGtag, queued, works, errs };
}

console.log('— on a real host —');
const real = await visit(`http://atlas.test:${port}/`);
check('requests the gtag script', real.hits.some(u => u.includes('googletagmanager.com/gtag/js')), real.hits);
check('uses the right measurement id', real.hits.some(u => u.includes(ID)), real.hits);
check('gtag() is defined', real.hasGtag);
check('config is queued for gtag', real.queued >= 2, { queued: real.queued });
check('the quiz still renders', real.works);
check('no page errors', real.errs.length === 0, real.errs);

console.log('— with the tag blocked (ad blocker / offline) —');
check('page is unaffected when the script never loads', real.works && real.errs.length === 0);

console.log('\n— on localhost, which should not count as traffic —');
const local = await visit(`http://127.0.0.1:${port}/`);
check('no analytics request', local.hits.length === 0, local.hits);
check('gtag is not even defined', !local.hasGtag);
check('the quiz still renders', local.works);

console.log('\n— opened straight off disk —');
const disk = await visit('file://' + D + '/index.html');
check('no analytics request', disk.hits.length === 0, disk.hits);
check('the quiz still renders', disk.works);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
