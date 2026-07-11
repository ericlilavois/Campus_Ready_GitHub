// ============================================
// CAMPUS READY — NON-ATTENDEE LYFT EMAIL
// ============================================
// For students who are NOT attending the July 15 event
// and whose only travel support is a Lyft credit.
// No Ramp virtual card, no flight or drive section.
//
// Recipients: Alice Baxter, Cristian Fonseca Nunez,
//             Diego Perez Herrera, Fernanda Contreras Alcaraz,
//             Xadani Ramirez Herrera
//
// docsApproved: controls gift card line — verify before send.
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

const NON_ATTENDEE_LYFT_STUDENTS = [
  {
    firstName:    'Alice',
    email:        'alicebaxter2008@gmail.com',
    college:      'UC Santa Cruz',
    docsApproved: false   // Docs pending as of July 11, 2026
  },
  {
    firstName:    'Cristian',
    email:        'cris022881@gmail.com',
    college:      'UC Davis',
    docsApproved: true    // Not in pending list as of July 11 — verify before send
  },
  {
    firstName:    'Diego',
    email:        'perez.diegop443@gmail.com',
    college:      'San Jose State University',
    docsApproved: true    // Not in pending list as of July 11 — verify before send
  },
  {
    firstName:    'Fernanda',
    email:        'fernanda.gca.2008@gmail.com',
    college:      'UC Davis',
    docsApproved: true    // Not in pending list as of July 11 — verify before send
  },
  {
    firstName:    'Xadani',
    email:        'xadaniherrera073@gmail.com',
    college:      'University of San Francisco',
    docsApproved: false   // Docs pending as of July 11, 2026
  }
];

// ============================================
// TEST — sends all variants to test address
// ============================================

function testNonAttendeeLyftEmails() {
  NON_ATTENDEE_LYFT_STUDENTS.forEach(function(student) {
    var testStudent = Object.assign({}, student, { email: NAL_TEST_EMAIL });
    _sendNonAttendeeLyftEmail(testStudent);
    Logger.log('Test sent to ' + NAL_TEST_EMAIL + ' for ' + student.firstName);
    Utilities.sleep(300);
  });
  Logger.log('Done — ' + NON_ATTENDEE_LYFT_STUDENTS.length + ' test variants sent to ' + NAL_TEST_EMAIL);
}

// ============================================
// MAIN SEND
// ============================================

function sendNonAttendeeLyftEmails() {
  var ui = SpreadsheetApp.getUi();

  var confirm = ui.alert(
    'Send Non-Attendee Lyft Emails?',
    'Ready to send to ' + NON_ATTENDEE_LYFT_STUDENTS.length + ' students:\n\n' +
    NON_ATTENDEE_LYFT_STUDENTS.map(function(s) { return s.firstName + ' — ' + s.email; }).join('\n') +
    '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var successCount = 0;
  var failCount    = 0;

  NON_ATTENDEE_LYFT_STUDENTS.forEach(function(student) {
    try {
      _sendNonAttendeeLyftEmail(student);
      successCount++;
      Logger.log('Sent: ' + student.email);
      Utilities.sleep(200);
    } catch (e) {
      failCount++;
      Logger.log('Failed: ' + student.email + ' — ' + e.message);
    }
  });

  var summary = successCount + ' email(s) sent.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

// ============================================
// INTERNAL SENDER
// ============================================

function _sendNonAttendeeLyftEmail(student) {
  var html = _buildNonAttendeeLyftHtml(student);
  var text = _buildNonAttendeeLyftText(student);

  GmailApp.sendEmail(student.email, NAL_SUBJECT, text, {
    htmlBody: html,
    name:     NAL_SENDER_NAME,
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
}

// ============================================
// HTML BUILDER
// ============================================

function _buildNonAttendeeLyftHtml(student) {
  var giftCardLine = student.docsApproved
    ? 'A $100 Target gift card will be sent to your email address in the coming days.'
    : 'A $100 Target gift card will be sent to your email address once your housing and college acceptance documents are approved.';

  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n' +
'<body style="margin:0;padding:0;background:#f1f5f9;">\n' +
'\n' +
'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">\n' +
'  <tr>\n' +
'    <td align="center">\n' +
'      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">\n' +
'\n' +
'        <!-- HEADER -->\n' +
'        <tr>\n' +
'          <td align="center" style="background:#ffffff;padding:28px 32px 24px;border-bottom:1px solid #e2e8f0;">\n' +
'            <img src="' + NAL_LOGO_URL + '" alt="Campus Ready Foundation" style="height:110px;width:auto;display:block;margin:0 auto;">\n' +
'          </td>\n' +
'        </tr>\n' +
'\n' +
'        <!-- BODY -->\n' +
'        <tr>\n' +
'          <td style="padding:40px 40px 32px;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'\n' +
'            <!-- Greeting -->\n' +
'            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.4;">Hi ' + student.firstName + ',</p>\n' +
'            <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#374151;">Though you won\'t be at Wednesday\'s event, everything we promised is still yours. Here\'s what we have waiting for you:</p>\n' +
'\n' +
'            <!-- CARD 1: Lyft + DoorDash -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 16px;">\n' +
'              <tr>\n' +
'                <td style="padding:24px;">\n' +
'                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0d9488;">Before you head to campus</p>\n' +
'                  <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;line-height:1.4;">Download Lyft and DoorDash.</p>\n' +
'                  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#374151;">We set up a <strong>Lyft credit ($150)</strong> to help you get to campus, the airport, or around town — and a <strong>DoorDash credit ($100)</strong> for meals during your first days. Download both apps, then text us at <strong>(707) 595-8281</strong>. Once we hear from you, we\'ll send your codes.</p>\n' +
'\n' +
'                  <!-- App buttons -->\n' +
'                  <table width="100%" cellpadding="0" cellspacing="0">\n' +
'                    <tr>\n' +
'                      <td width="50%" style="padding-right:8px;">\n' +
'                        <a href="' + NAL_LYFT_APP_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                          <img src="' + NAL_LYFT_LOGO_URL + '" alt="Lyft" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:\'Inter\',sans-serif;">Download Lyft</span>\n' +
'                        </a>\n' +
'                      </td>\n' +
'                      <td width="50%" style="padding-left:8px;">\n' +
'                        <a href="' + NAL_DOORDASH_APP_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                          <img src="' + NAL_DOORDASH_LOGO_URL + '" alt="DoorDash" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:\'Inter\',sans-serif;">Download DoorDash</span>\n' +
'                        </a>\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'            <!-- CARD 2: Target gift card -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin:0 0 28px;">\n' +
'              <tr>\n' +
'                <td style="padding:20px 24px;">\n' +
'                  <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">\n' +
'                    <tr>\n' +
'                      <td style="vertical-align:middle;padding-right:10px;">\n' +
'                        <img src="https://campusready.org/assets/Partners/Target_Bullseye-Logo_Red.jpg" alt="Target" style="width:28px;height:28px;display:block;border-radius:4px;">\n' +
'                      </td>\n' +
'                      <td style="vertical-align:middle;">\n' +
'                        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#b45309;">$100 Target gift card</p>\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                  <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">' + giftCardLine + ' Use it for whatever helps most with move-in.</p>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'            <!-- Sign-off -->\n' +
'            <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">We\'re rooting for you.</p>\n' +
'            <p style="margin:0 0 32px;font-size:15px;font-weight:600;color:#0f172a;">Team Campus Ready</p>\n' +
'\n' +
'            <!-- Footer -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0">\n' +
'              <tr>\n' +
'                <td style="border-top:1px solid #e2e8f0;padding-top:20px;">\n' +
'                  <p style="margin:0;font-size:14px;color:#64748b;">\n' +
'                    Questions? <a href="mailto:hello@campusready.org" style="color:#14b8a6;text-decoration:none;font-weight:500;">hello@campusready.org</a>\n' +
'                    &nbsp;&middot;&nbsp;\n' +
'                    <a href="tel:+17075958281" style="color:#14b8a6;text-decoration:none;font-weight:500;">(707) 595-8281</a>\n' +
'                  </p>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'          </td>\n' +
'        </tr>\n' +
'\n' +
'      </table>\n' +
'    </td>\n' +
'  </tr>\n' +
'</table>\n' +
'\n' +
'</body>\n' +
'</html>';
}

// ============================================
// PLAIN TEXT FALLBACK
// ============================================

function _buildNonAttendeeLyftText(student) {
  var giftCardLine = student.docsApproved
    ? 'A $100 Target gift card will be sent to your email address in the coming days.'
    : 'A $100 Target gift card will be sent to your email address once your housing and college acceptance documents are approved.';

  return 'Hi ' + student.firstName + ',\n\n' +
    "You won't be at Wednesday's event — but everything we promised is still yours. Here's what's on the way.\n\n" +
    'BEFORE YOU HEAD TO CAMPUS\n\n' +
    'Download Lyft and DoorDash.\n\n' +
    "We set up a Lyft credit ($150) to help you get to campus, the airport, or around town — and a DoorDash credit ($100) for meals during your first days. Download both apps, then text us at (707) 595-8281. Once we hear from you, we'll send your codes.\n\n" +
    'Download Lyft: ' + NAL_LYFT_APP_URL + '\n' +
    'Download DoorDash: ' + NAL_DOORDASH_APP_URL + '\n\n' +
    '$100 TARGET GIFT CARD\n\n' +
    giftCardLine + ' Use it for whatever helps most with move-in.\n\n' +
    "We're rooting for you.\n" +
    'Team Campus Ready\n\n' +
    'hello@campusready.org\n' +
    '(707) 595-8281';
}
