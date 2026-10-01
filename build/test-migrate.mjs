// Runs the real Code.gs against a stand-in Sheets API, because migrate_()
// rewrites rows that already exist in the live sheet.
//   node build/test-migrate.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const D = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(D, 'build', 'Code.gs'), 'utf8');

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
                             : (fail++, console.log('  FAIL ' + n + (x ? '  → ' + JSON.stringify(x) : '')));

// Minimal stand-in for a Sheet: a rectangular grid plus the handful of calls
// Code.gs makes against it.
function FakeSheet(grid) {
  const pad = rows => {
    const w = Math.max(0, ...rows.map(r => r.length));
    return rows.map(r => r.concat(Array(w - r.length).fill('')));
  };
  let data = pad(grid.map(r => r.slice()));
  const lastRow = () => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i].some(c => c !== '' && c != null)) return i + 1;
    return 0;
  };
  return {
    _dump: () => data.map(r => r.slice()),
    getLastRow: lastRow,
    getLastColumn: () => {
      let w = 0;
      for (const r of data) for (let c = 0; c < r.length; c++) if (r[c] !== '' && r[c] != null) w = Math.max(w, c + 1);
      return w;
    },
    getRange(row, col, nRows = 1, nCols = 1) {
      return {
        getValues: () => Array.from({ length: nRows }, (_, i) =>
          Array.from({ length: nCols }, (_, j) => (data[row - 1 + i] || [])[col - 1 + j] ?? '')),
        getValue: () => (data[row - 1] || [])[col - 1] ?? '',
        setValues: v => {
          v.forEach((r, i) => {
            const y = row - 1 + i;
            while (data.length <= y) data.push([]);
            r.forEach((cell, j) => { data[y][col - 1 + j] = cell; });
          });
          data = pad(data);
        },
        setValue: v => { data[row - 1][col - 1] = v; },
      };
    },
    // Sheets appends after the last row with content, not after trailing blanks
    appendRow: r => {
      const at = lastRow();
      while (data.length <= at) data.push([]);
      data[at] = r.slice();
      data = pad(data);
    },
    clear: () => { data = []; },
    setFrozenRows: () => {},
    getName: () => 'Ideas',
    getParent: () => ({ getName: () => 'Atlas Drill feedback' }),
  };
}

function run(grid, fn = 'migrate_') {
  const sheet = FakeSheet(grid);
  const ctx = {
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType: () => t }) },
    Date,
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  if (fn === 'migrate_') ctx.migrate_(sheet);
  else ctx[fn]();
  return { sheet, ctx };
}

const OLD = [
  ['When', 'Idea', 'Page'],
  ['2026-09-30T22:33', 'like math stuff -elsa', 'https://elsabaxley-ui.github.io/countries-and-bodies-of-water/'],
  ['2026-09-30T22:45', 'a flashcard app', 'https://example.com/'],
];

console.log('— the sheet as it exists today (When | Idea | Page) —');
{
  const { sheet } = run(OLD);
  const out = sheet._dump();
  check('header is When | Name | Idea', JSON.stringify(out[0]) === JSON.stringify(['When', 'Name', 'Idea']), out[0]);
  check('no Page column survives', !out[0].includes('Page'), out[0]);
  check('ideas keep their text', out[1][2] === 'like math stuff -elsa' && out[2][2] === 'a flashcard app', out);
  check('timestamps stay put', out[1][0] === '2026-09-30T22:33', out[1]);
  check('name is blank, not undefined', out[1][1] === '', JSON.stringify(out[1]));
  check('no rows lost', out.length === 3, out.length);
}

console.log('\n— a sheet that already took the 4-column version —');
{
  const { sheet } = run([
    ['When', 'Idea', 'Page', 'Name'],
    ['t1', 'idea one', 'p', 'Jamie'],
    ['t2', 'idea two', 'p', ''],
  ]);
  const out = sheet._dump();
  check('names move into column B', out[1][1] === 'Jamie' && out[2][1] === '', out);
  check('ideas move into column C', out[1][2] === 'idea one' && out[2][2] === 'idea two', out);
}

console.log('\n— running it again changes nothing —');
{
  const { sheet } = run(OLD);
  const once = JSON.stringify(sheet._dump());
  const again = run(JSON.parse(once));
  check('second pass is a no-op', JSON.stringify(again.sheet._dump()) === once, again.sheet._dump());
}

console.log('\n— an empty sheet just gets the header —');
{
  const { sheet } = run([[]]);
  check('header written', JSON.stringify(sheet._dump()[0]) === JSON.stringify(['When', 'Name', 'Idea']), sheet._dump());
}

console.log('\n— blank filler rows are dropped —');
{
  const { sheet } = run([['When', 'Idea', 'Page'], ['t', 'real idea', 'p'], ['', '', ''], ['', '', '']]);
  check('only the real row remains', sheet._dump().length === 2, sheet._dump());
}

console.log('\n— a new submission lands in the right columns —');
{
  const sheet = FakeSheet([['When', 'Name', 'Idea'], ['t', 'Jamie', 'idea one']]);
  const ctx = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType: () => t }) },
    Date, console,
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const res = ctx.doPost({ postData: { contents: JSON.stringify({ idea: 'spanish verbs', name: 'Sam' }) } });
  const row = sheet._dump().pop();
  check('accepted', JSON.parse(res).ok === true, res);
  check('name in column B', row[1] === 'Sam', row);
  check('idea in column C', row[2] === 'spanish verbs', row);
  check('three columns only', row.length === 3, row);

  const anon = ctx.doPost({ postData: { contents: JSON.stringify({ idea: 'no name here' }) } });
  const row2 = sheet._dump().pop();
  check('an unnamed idea still saves', JSON.parse(anon).ok === true && row2[2] === 'no name here', row2);
  check('its name cell is empty', row2[1] === '', row2);

  const empty = ctx.doPost({ postData: { contents: JSON.stringify({ idea: '   ' }) } });
  check('an empty idea is refused', JSON.parse(empty).ok === false, empty);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
