const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const SHEET_NAME = 'Contact submissions';

function setupSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Submitted at', 'Name', 'Email', 'Company', 'Topic', 'Message']);
  }
  return sheet.getName();
}

function doPost(e) {
  const fields = e && e.parameter ? e.parameter : {};
  if (fields.website) return response_(true, 'Thanks for reaching out. Your message has been received.');

  const name = cell_(fields.name, 100);
  const email = cell_(fields.email, 254);
  const company = cell_(fields.company, 120);
  const topic = cell_(fields.topic, 120);
  const message = cell_(fields.message, 5000);

  if (!name || !email || !topic || !message) {
    return response_(false, 'Please complete all required fields and try again.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response_(false, 'Please enter a valid email address.');
  }
  if (!SPREADSHEET_ID) {
    return response_(false, 'The contact form is not configured yet.');
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Submitted at', 'Name', 'Email', 'Company', 'Topic', 'Message']);
    }
    sheet.appendRow([new Date(), name, email, company, topic, message]);
    return response_(true, 'Thanks for reaching out. Your message has been received.');
  } catch (error) {
    console.error(error);
    return response_(false, 'We could not save your message. Please try again or email me directly.');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function cell_(value, maxLength) {
  const text = String(value || '').trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function response_(ok, message) {
  const payload = JSON.stringify({ type: 'portfolio-contact-result', ok: ok, message: message });
  const html = '<!doctype html><html><body><script>top.postMessage(' + payload + ', "*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
