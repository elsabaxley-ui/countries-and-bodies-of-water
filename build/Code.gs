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

function doPost(e) {
  var idea = '', page = '', name = '';
  try {
    if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      idea = body.idea || '';
      name = body.name || '';
      page = body.page || '';
    }
  } catch (err) {
    // not JSON — fall through to form fields
  }
  if (!idea && e && e.parameter) {
    idea = e.parameter.idea || '';
    name = e.parameter.name || '';
    page = e.parameter.page || '';
  }

  idea = String(idea).trim().slice(0, 5000);
  if (!idea) return reply({ ok: false, error: 'empty' });

  var lock = LockService.getScriptLock();       // two people submitting at once
  lock.waitLock(10000);
  try {
    sheet().appendRow([new Date(), idea, String(page).slice(0, 500),
                       String(name).trim().slice(0, 80)]);
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
  if (sh.getLastRow() === 0) {
    sh.appendRow(['When', 'Idea', 'Page', 'Name']);
    sh.setFrozenRows(1);
  } else if (!sh.getRange(1, 4).getValue()) {
    sh.getRange(1, 4).setValue('Name');   // added later; rows already here keep their columns
  }
  return sh;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
