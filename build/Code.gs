/**
 * Apps Script for the "what should I code next?" box on Atlas Drill.
 *
 * The target sheet is named by id rather than taken from whatever the script
 * happens to be bound to — a standalone project has no bound sheet, and a
 * bound one may not be the sheet you meant.
 *
 * Setup:
 *   Extensions > Apps Script (or script.google.com), paste this in, Save.
 *   Deploy > New deployment > type "Web app"
 *     Execute as:       Me
 *     Who has access:   Anyone            <- must be Anyone, not "Anyone with Google account"
 *   Copy the /exec URL and put it in IDEA.URL in build/app.html, then rebuild.
 *
 * After editing later: Deploy > Manage deployments > pencil > New version.
 * "New deployment" would mint a different /exec URL and the site would keep
 * posting to the old one.
 *
 * The page posts JSON as text/plain on purpose: it avoids a CORS preflight
 * that Apps Script would not answer. e.parameter is handled too, so a plain
 * form post works as well.
 */
var SPREADSHEET_ID = '1fPKaT55492A9S9lTargmMc1n-4UpVVZPfT8J_yr0CzY';
var SHEET_NAME = 'Ideas';
var HEADER = ['When', 'Name', 'Idea', 'Email list'];

function doPost(e) {
  var idea = '', name = '', list = '';
  try {
    if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      idea = body.idea || '';
      name = body.name || '';
      list = body.list || '';
    }
  } catch (err) {
    // not JSON — fall through to form fields
  }
  if (!idea && !list && e && e.parameter) {
    idea = e.parameter.idea || '';
    name = e.parameter.name || '';
    list = e.parameter.list || '';
  }

  idea = String(idea).trim().slice(0, 5000);
  list = String(list).trim().slice(0, 80);
  if (!idea && !list) return reply({ ok: false, error: 'empty' });

  var lock = LockService.getScriptLock();       // two people submitting at once
  lock.waitLock(10000);
  try {
    // a signup is a name in the Email list column and nothing else; an idea
    // is a name and the idea. Both are rows in the same sheet.
    sheet().appendRow(list
      ? [new Date(), '', '', list]
      : [new Date(), String(name).trim().slice(0, 80), idea, '']);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// Visiting the /exec URL in a browser should say something useful — including
// which sheet it is actually writing to, which is the thing you want to know
// when answers seem to vanish.
function doGet() {
  var sh = sheet();
  return reply({
    ok: true,
    note: 'Atlas Drill idea box is live. POST to submit.',
    writingTo: sh.getParent().getName() + ' / ' + sh.getName(),
    rows: Math.max(0, sh.getLastRow() - 1)
  });
}

function sheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  migrate_(sh);
  return sh;
}

/**
 * The columns started as When | Idea | Page, became When | Name | Idea, and
 * now end with an Email list column. Brings a sheet written under either
 * older shape up to date, and does nothing once it is already current.
 */
function migrate_(sh) {
  var last = sh.getLastRow();
  if (last === 0) {
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
    return;
  }
  var width = Math.max(sh.getLastColumn(), 3);
  var head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (v) {
    return String(v).trim();
  });
  var current = head[0] === 'When' && head[1] === 'Name' && head[2] === 'Idea';
  if (current && head[3] === 'Email list') return;      // nothing to do
  if (current) {                                        // just the new column
    sh.getRange(1, 4).setValue('Email list');
    return;
  }

  // the original When | Idea | Page [ | Name ] shape: rows have to move
  var rows = sh.getRange(1, 1, last, width).getValues();
  var out = [HEADER];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] && !r[1] && !r[2]) continue;              // skip blank filler rows
    out.push([r[0], width >= 4 ? r[3] : '', r[1], '']); // When, Name, Idea, (no signup)
  }
  sh.clear();
  sh.getRange(1, 1, out.length, HEADER.length).setValues(out);
  sh.setFrozenRows(1);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
