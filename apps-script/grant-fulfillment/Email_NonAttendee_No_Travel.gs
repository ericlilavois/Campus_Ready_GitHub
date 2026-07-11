// ============================================
// CAMPUS READY — NON-ATTENDEE NO-TRAVEL EMAIL
// ============================================
// For students NOT attending July 15 event with no travel support.
// Only sends to students with Housing Status = Approved AND
// Acceptance Status = Approved in Grant_Recipients.
// Tracks sends in Grant_Recipients "Non-Attendee Email Sent" column.
//
// Recipients: Alice Baxter, Cristian Fonseca Nunez,
//             Diego Perez Herrera, Fernanda Contreras Alcaraz,
//             Xadani Ramirez Herrera
// ============================================

const NAL_LOGO_URL          = 'https://campusready.org/assets/img/brand/CRF_logo.lockup.GRN.png';
const NAL_LYFT_LOGO_URL     = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/Lyft_Logo_Pink_RGB.png';
const NAL_DOORDASH_LOGO_URL = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/DoorDash.png';

const NAL_LYFT_APP_URL      = 'https://apps.apple.com/us/app/lyft/id529379082';
const NAL_DOORDASH_APP_URL  = 'https://apps.apple.com/us/app/doordash-food-delivery/id719972451';

const NAL_SUBJECT           = 'What we have for you.';
const NAL_SENDER_NAME       = 'Campus Ready Foundation';
const NAL_TEST_EMAIL        = 'elilavois@gmail.com';

// ============================================
// STUDENT ROSTER
// ============================================
// docsApproved is NOT hardcoded — read live from Grant_Recipients.

const NON_ATTENDEE_LYFT_STUDENTS = [
  { firstName: 'Alice',    email: 'alicebaxter2008@gmail.com',      college: 'UC Santa Cruz' },
  { firstName: 'Cristian', email: 'cris022881@gmail.com',           college: 'UC Davis' },
  { firstName: 'Diego',    email: 'perez.diegop443@gmail.com',      college: 'San Jose State University' },
  { firstName: 'Fernanda', email: 'fernanda.gca.2008@gmail.com',    college: 'UC Davis' },
  { firstName: 'Xadani',   email: 'xadaniherrera073@gmail.com',     college: 'University of San Francisco' }
];

// ============================================
// GRANT_RECIPIENTS LOOKUP
// ============================================

function _getNALGrantData() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Grant_Recipients');
  if (!sheet) throw new Error('Grant_Recipients sheet not found');

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];

  var emailCol      = headers.indexOf('Email Address');
  var housingCol    = headers.indexOf('Housing Status');
  var acceptanceCol = headers.indexOf('Acceptance Status');

  var sentColName = 'Non-Attendee Email Sent';
  var sentCol     = headers.indexOf(sentColName);
  if (sentCol === -1) {
    sentCol = headers.length;
    sheet.getRange(1, sentCol + 1).setValue(sentColName);
  }

  var lookup = {};
  for (var i = 1; i < data.length; i++) {
    var email = data[i][emailCol];
    if (email) {
      lookup[email.toLowerCase().trim()] = {
        rowIndex:      i + 1,
        housingStatus: data[i][housingCol],
        acceptStatus:  data[i][acceptanceCol],
        alreadySent:   data[i][sentCol]
      };
    }
  }

  return { sheet: sheet, sentCol: sentCol, lookup: lookup };
}

// ============================================
// TEST — sends all variants to test address
// ============================================

function testNonAttendeeLyftEmails() {
  NON_ATTENDEE_LYFT_STUDENTS.forEach(function(student) {
    var testStudent = Object.assign({}, student, { email: NAL_TEST_EMAIL });
    _sendNALEmail(testStudent);
    Logger.log('Test sent to ' + NAL_TEST_EMAIL + ' for ' + student.firstName);
    Utilities.sleep(300);
  });
  Logger.log('Done — ' + NON_ATTENDEE_LYFT_STUDENTS.length + ' test variants sent to ' + NAL_TEST_EMAIL);
}

// ============================================
// MAIN SEND
// ============================================

function sendNonAttendeeLyftEmails() {
  var ui        = SpreadsheetApp.getUi();
  var grantData = _getNALGrantData();
  var lookup    = grantData.lookup;
  var sheet     = grantData.sheet;
  var sentCol   = grantData.sentCol;

  var eligible = NON_ATTENDEE_LYFT_STUDENTS.filter(function(student) {
    var record = lookup[student.email.toLowerCase()];
    if (!record) {
      Logger.log('Not found in Grant_Recipients: ' + student.email);
      return false;
    }
    if (record.housingStatus !== 'Approved' || record.acceptStatus !== 'Approved') {
      Logger.log('Docs not approved — skipping: ' + student.firstName +
        ' (Housing: ' + record.housingStatus + ', Acceptance: ' + record.acceptStatus + ')');
      return false;
    }
    if (record.alreadySent === 'Yes') {
      Logger.log('Already sent — skipping: ' + student.firstName);
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    ui.alert('No Eligible Recipients',
      'No students are ready to receive this email.\n\nEither their documents are not yet approved or they have already been sent this email.',
      ui.ButtonSet.OK);
    return;
  }

  var skipped  = NON_ATTENDEE_LYFT_STUDENTS.length - eligible.length;
  var skipNote = skipped > 0 ? '\n\n' + skipped + ' student(s) skipped — docs not approved or already sent.' : '';

  var confirm = ui.alert(
    'Send ' + eligible.length + ' No-Travel Email(s)?',
    'Ready to send to:\n\n' +
    eligible.map(function(s) { return s.firstName + ' — ' + s.email; }).join('\n') +
    skipNote + '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var successCount = 0;
  var errors       = [];

  eligible.forEach(function(student) {
    try {
      _sendNALEmail(student);
      var record = lookup[student.email.toLowerCase()];
      sheet.getRange(record.rowIndex, sentCol + 1).setValue('Yes');
      successCount++;
      Logger.log('Sent: ' + student.email);
      Utilities.sleep(200);
    } catch (e) {
      errors.push(student.firstName + ' (' + student.email + '): ' + e.message);
      Logger.log('Failed: ' + student.email + ' — ' + e.message);
    }
  });

  var summary = successCount + ' email(s) sent.';
  if (errors.length > 0) summary += '\n\nErrors:\n' + errors.join('\n');
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

// ============================================
// INTERNAL SENDER
// ============================================

function _sendNALEmail(student) {
  GmailApp.sendEmail(student.email, NAL_SUBJECT, _buildNALText(student), {
    htmlBody: _buildNALHtml(student),
    name:     NAL_SENDER_NAME,
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
}

// ============================================
// HTML BUILDER
// ============================================

function _buildNALHtml(student) {
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n' +
'<body style="margin:0;padding:0;background:#f1f5f9;">\n' +
'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">\n' +
'  <tr><td align="center">\n' +
'    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">\n' +
'      <tr><td align="center" style="background:#ffffff;padding:28px 32px 24px;border-bottom:1px solid #e2e8f0;">\n' +
'        <img src="' + NAL_LOGO_URL + '" alt="Campus Ready Foundation" style="height:110px;width:auto;display:block;margin:0 auto;">\n' +
'      </td></tr>\n' +
'      <tr><td style="padding:40px 40px 32px;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'\n' +
'        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0f172a;">Hi ' + student.firstName + ',</p>\n' +
'        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#374151;">Though you won\'t be at Wednesday\'s event, everything we promised is still yours. Here\'s what we have waiting for you:</p>\n' +
'\n' +
'        <!-- Lyft + DoorDash card -->\n' +
'        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 16px;">\n' +
'          <tr><td style="padding:24px;">\n' +
'            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0d9488;">Before you head to campus</p>\n' +
'            <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">Download Lyft and DoorDash.</p>\n' +
'            <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#374151;">We set up a <strong>Lyft credit ($150)</strong> to help you get to campus, the airport, or around town — and a <strong>DoorDash credit ($100)</strong> for meals during your first days. Download both apps, then text us at <strong>(707) 595-8281</strong>. Once we hear from you, we\'ll send your codes.</p>\n' +
'            <table width="100%" cellpadding="0" cellspacing="0"><tr>\n' +
'              <td width="50%" style="padding-right:8px;">\n' +
'                <a href="' + NAL_LYFT_APP_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                  <img src="' + NAL_LYFT_LOGO_URL + '" alt="Lyft" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                  <span style="font-size:12px;font-weight:600;color:#475569;">Download Lyft</span>\n' +
'                </a>\n' +
'              </td>\n' +
'              <td width="50%" style="padding-left:8px;">\n' +
'                <a href="' + NAL_DOORDASH_APP_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                  <img src="' + NAL_DOORDASH_LOGO_URL + '" alt="DoorDash" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                  <span style="font-size:12px;font-weight:600;color:#475569;">Download DoorDash</span>\n' +
'                </a>\n' +
'              </td>\n' +
'            </tr></table>\n' +
'          </td></tr>\n' +
'        </table>\n' +
'\n' +
'        <!-- Target gift card -->\n' +
'        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin:0 0 28px;">\n' +
'          <tr><td style="padding:20px 24px;">\n' +
'            <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr>\n' +
'              <td style="vertical-align:middle;padding-right:10px;">\n' +
'                <img src="https://campusready.org/assets/Partners/Target_Bullseye-Logo_Red.jpg" alt="Target" style="width:28px;height:28px;display:block;border-radius:4px;">\n' +
'              </td>\n' +
'              <td style="vertical-align:middle;">\n' +
'                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#b45309;">$100 Target gift card</p>\n' +
'              </td>\n' +
'            </tr></table>\n' +
'            <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">A $100 Target gift card will be sent to your email address in the coming days. Use it for whatever helps most with move-in.</p>\n' +
'          </td></tr>\n' +
'        </table>\n' +
'\n' +
'        <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">We\'re rooting for you.</p>\n' +
'        <p style="margin:0 0 32px;font-size:15px;font-weight:600;color:#0f172a;">Team Campus Ready</p>\n' +
'\n' +
'        <table width="100%" cellpadding="0" cellspacing="0"><tr>\n' +
'          <td style="border-top:1px solid #e2e8f0;padding-top:20px;">\n' +
'            <p style="margin:0;font-size:14px;color:#64748b;">\n' +
'              Questions? <a href="mailto:hello@campusready.org" style="color:#14b8a6;text-decoration:none;font-weight:500;">hello@campusready.org</a>\n' +
'              &nbsp;&middot;&nbsp;\n' +
'              <a href="tel:+17075958281" style="color:#14b8a6;text-decoration:none;font-weight:500;">(707) 595-8281</a>\n' +
'            </p>\n' +
'          </td>\n' +
'        </tr></table>\n' +
'\n' +
'      </td></tr>\n' +
'    </table>\n' +
'  </td></tr>\n' +
'</table>\n' +
'</body>\n' +
'</html>';
}

// ============================================
// PLAIN TEXT FALLBACK
// ============================================

function _buildNALText(student) {
  return 'Hi ' + student.firstName + ',\n\n' +
    "You won't be at Wednesday's event — but everything we promised is still yours.\n\n" +
    'BEFORE YOU HEAD TO CAMPUS\n\n' +
    "We set up a Lyft credit ($150) to help you get to campus, the airport, or around town — and a DoorDash credit ($100) for meals during your first days. Download both apps, then text us at (707) 595-8281 and we'll send your codes.\n\n" +
    'Download Lyft: ' + NAL_LYFT_APP_URL + '\n' +
    'Download DoorDash: ' + NAL_DOORDASH_APP_URL + '\n\n' +
    '$100 TARGET GIFT CARD\n\n' +
    'A $100 Target gift card will be sent to your email address in the coming days. Use it for whatever helps most with move-in.\n\n' +
    "We're rooting for you.\n" +
    'Team Campus Ready\n\n' +
    'hello@campusready.org | (707) 595-8281';
}
