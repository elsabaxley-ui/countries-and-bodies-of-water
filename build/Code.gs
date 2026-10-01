/**
 * Apps Script for the "what should I code next?" box on Atlas Drill.
 *
 * Setup, from the Google Sheet that should hold the answers:
 *   Extensions > Apps Script, paste this over whatever is there, Save.
 *   Deploy > New deployment > type "Web app"
 *     Execute as:       Me
 *     Who has access:   Anyone            <- must be Anyone, not "Anyone with Google account"
 *   Copy the /exec URL and put it in IDEA.URL in build/app.html, then rebuild.
 *
 * The page posts JSON as text/plain on purpose: it avoids a CORS preflight
 * that Apps Script would not answer. e.parameter is handled too, so a plain
 * form post works as well.
 */
var SHEET_NAME = 'Ideas';

function doPost(e) {
  var idea = '', page = '';
  try {
    if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      idea = body.idea || '';
      page = body.page || '';
    }
  } catch (err) {
    // not JSON — fall through to form fields
  }
  if (!idea && e && e.parameter) {
    idea = e.parameter.idea || '';
    page = e.parameter.page || '';
  }

  idea = String(idea).trim().slice(0, 5000);
  if (!idea) return reply({ ok: false, error: 'empty' });

  var lock = LockService.getScriptLock();       // two people submitting at once
  lock.waitLock(10000);
  try {
    sheet().appendRow([new Date(), idea, String(page).slice(0, 500)]);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// Visiting the /exec URL in a browser should say something useful.
function doGet() {
  return reply({ ok: true, note: 'Atlas Drill idea box is live. POST to submit.' });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['When', 'Idea', 'Page']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
