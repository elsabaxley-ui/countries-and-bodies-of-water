// Proves the "one refresh is enough" claim against a server that mimics GitHub
// Pages' `cache-control: max-age=600`. Without the service worker the second
// load would come from the HTTP cache and show the old build.
//   node build/test-refresh.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let marker = 'BUILD-ONE';
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  try {
    if (path === '/' || path === '/index.html') {
      let html = await readFile(join(D, 'index.html'), 'utf8');
      html = html.replace('<title>Atlas Drill</title>',
        `<title>Atlas Drill</title><meta name="build" content="${marker}">`);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'max-age=600' });
      return res.end(html);
    }
    if (path === '/sw.js') {
      res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'max-age=600' });
      return res.end(await readFile(join(D, 'sw.js'), 'utf8'));
    }
    res.writeHead(404); res.end('nope');
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
const buildSeen = () => page.evaluate(() =>
  document.querySelector('meta[name="build"]')?.getAttribute('content'));

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

console.log('— first visit —');
await page.goto(base, { waitUntil: 'load' });
await wait(300);
check('page loads', (await buildSeen()) === 'BUILD-ONE');
const reg = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return !!r;
});
check('service worker registers', reg);

// wait for it to take control, then deploy a "new build"
await page.evaluate(() => navigator.serviceWorker.ready);
await wait(400);
marker = 'BUILD-TWO';

console.log('\n— a new build is deployed, user hits refresh once —');
await page.reload({ waitUntil: 'load' });
await wait(400);
const after = await buildSeen();
check('one plain refresh shows the new build', after === 'BUILD-TWO', { saw: after });

console.log('\n— offline fallback —');
marker = 'BUILD-THREE';
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'load' }).catch(() => {});
await wait(400);
const offline = await page.evaluate(() => !!document.getElementById('nextBtn'));
check('still usable with no network', offline);
await page.setOfflineMode(false);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
