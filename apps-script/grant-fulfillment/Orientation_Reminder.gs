// ============================================
// CAMPUS READY — ORIENTATION REMINDER EMAIL
// ============================================
// Event: Orientation & Celebration — Wednesday, July 15, 2026
// Sends to: RSVP_Responses rows with status attending or attending_with_guest
// Last updated: 2026-07-11
//
// Test function:  testOrientationReminderEmail()
// Send function:  sendOrientationReminderEmails()
// ============================================

// ============================================
// CONFIGURATION
// ============================================

const RSVP_SHEET_NAME        = 'RSVP_Responses';
const REMINDER_TEST_EMAIL    = 'elilavois@gmail.com';

const LOGO_URL               = 'https://award.campusready.org/logo-image-1200x630.png';
const LYFT_LOGO_URL          = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/Lyft_Logo_Pink_RGB.png';
const DOORDASH_LOGO_URL      = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/DoorDash.png';

const LYFT_APP_STORE_URL     = 'https://apps.apple.com/us/app/lyft/id529379082';
const DOORDASH_APP_STORE_URL = 'https://apps.apple.com/us/app/doordash-food-delivery/id719972451';

const REMINDER_SUBJECT       = 'To do before Wednesday.';
const REMINDER_SENDER_NAME   = 'Campus Ready Foundation';

// ============================================
// TEST EMAIL
// ============================================

function testOrientationReminderEmail() {
  const html = buildReminderEmailHtml('Eric');
  GmailApp.sendEmail(REMINDER_TEST_EMAIL, '[TEST] ' + REMINDER_SUBJECT, '', {
    htmlBody: html,
    name: REMINDER_SENDER_NAME
  });
  SpreadsheetApp.getUi().alert('Test reminder email sent to ' + REMINDER_TEST_EMAIL);
  Logger.log('Test reminder email sent to ' + REMINDER_TEST_EMAIL);
}

// ============================================
// MAIN SEND FUNCTION
// ============================================

function sendOrientationReminderEmails() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(RSVP_SHEET_NAME);

  if (!sheet) {
    ui.alert('Sheet Not Found', 'Could not find a tab named "' + RSVP_SHEET_NAME + '".', ui.ButtonSet.OK);
    return;
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const nameCol   = headers.indexOf('Name');
  const emailCol  = headers.indexOf('Email');
  const statusCol = headers.indexOf('Status');
  const sentCol   = findOrCreateSentColumn(sheet, headers);

  if (nameCol === -1 || emailCol === -1 || statusCol === -1) {
    ui.alert('Missing Columns', 'Could not find Name, Email, or Status columns.', ui.ButtonSet.OK);
    return;
  }

  const recipients = [];
  for (let i = 1; i < data.length; i++) {
    const row        = data[i];
    const name       = row[nameCol];
    const email      = row[emailCol];
    const status     = row[statusCol];
    const alreadySent = row[sentCol];

    if (!email || !name)                                                  continue;
    if (status !== 'attending' && status !== 'attending_with_guest')      continue;
    if (alreadySent === 'Yes')                                            continue;

    recipients.push({ name: name, email: email, rowIndex: i + 1 });
  }

  if (recipients.length === 0) {
    ui.alert('No Recipients', 'No eligible recipients found (attending and not yet emailed).', ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    'Send ' + recipients.length + ' Reminder Emails?',
    'Ready to send the orientation reminder to:\n\n' +
    recipients.map(function(r) { return r.name + ' — ' + r.email; }).join('\n') +
    '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let sent   = 0;
  const errors = [];

  recipients.forEach(function(r) {
    try {
      const firstName = r.name.split(' ')[0];
      const html      = buildReminderEmailHtml(firstName);
      GmailApp.sendEmail(r.email, REMINDER_SUBJECT, '', {
        htmlBody: html,
        name:     REMINDER_SENDER_NAME,
        from:     'hello@campusready.org',
        replyTo:  'hello@campusready.org'
      });
      sheet.getRange(r.rowIndex, sentCol + 1).setValue('Yes');
      sent++;
      Utilities.sleep(200);
    } catch (e) {
      errors.push(r.name + ' (' + r.email + '): ' + e.message);
      Logger.log('Error sending to ' + r.email + ': ' + e.message);
    }
  });

  let summary = sent + ' reminder email(s) sent.';
  if (errors.length > 0) summary += '\n\nErrors (' + errors.length + '):\n' + errors.join('\n');
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

// ============================================
// HELPER: find or create "Email Sent" column
// ============================================

function findOrCreateSentColumn(sheet, headers) {
  let col = headers.indexOf('Email Sent');
  if (col === -1) {
    col = headers.length;
    sheet.getRange(1, col + 1).setValue('Email Sent');
  }
  return col;
}

// ============================================
// EMAIL HTML BUILDER
// ============================================

function buildReminderEmailHtml(firstName) {
  return '<!DOCTYPE html>\n' +
'<html>\n' +
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
'            <img src="' + LOGO_URL + '" alt="Campus Ready Foundation" style="height:80px;width:auto;display:block;margin:0 auto;">\n' +
'          </td>\n' +
'        </tr>\n' +
'\n' +
'        <!-- BODY -->\n' +
'        <tr>\n' +
'          <td style="padding:40px 40px 32px;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'\n' +
'            <!-- Eyebrow + Headline -->\n' +
'            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#14b8a6;">Orientation &amp; Celebration</p>\n' +
'            <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:30px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;line-height:1.2;">We\'re less than a week away.</p>\n' +
'\n' +
'            <!-- Event Snapshot Card -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 28px;">\n' +
'              <tr>\n' +
'                <td style="padding:20px 24px;">\n' +
'                  <table width="100%" cellpadding="0" cellspacing="0">\n' +
'                    <tr>\n' +
'                      <td style="padding-bottom:14px;vertical-align:top;">\n' +
'                        <p style="margin:0;font-size:13px;font-weight:500;color:#0f172a;line-height:1.4;">&#x1F4C5;&nbsp; Wednesday, July 15</p>\n' +
'                        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">Doors open 6:00 PM &middot; Program begins 6:30 PM</p>\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                    <tr>\n' +
'                      <td style="vertical-align:top;">\n' +
'                        <p style="margin:0;font-size:13px;font-weight:500;color:#0f172a;line-height:1.4;">&#x1F4CD;&nbsp; Napa Valley Community Foundation</p>\n' +
'                        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">3299 Claremont Way, Suite 4, Napa, CA</p>\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'            <!-- Greeting -->\n' +
'            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">Hi ' + firstName + ',</p>\n' +
'\n' +
'            <!-- App Download Card -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 28px;">\n' +
'              <tr>\n' +
'                <td style="padding:24px;">\n' +
'                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0d9488;">Before Wednesday</p>\n' +
'                  <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;line-height:1.4;">Download the Lyft and DoorDash apps.</p>\n' +
'                  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#374151;">We\'re going to walk you through activating your credits. Having the apps installed means we can get that done quickly.</p>\n' +
'                  <table width="100%" cellpadding="0" cellspacing="0">\n' +
'                    <tr>\n' +
'                      <td style="width:50%;padding-right:8px;">\n' +
'                        <a href="' + LYFT_APP_STORE_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                          <img src="' + LYFT_LOGO_URL + '" alt="Lyft" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:\'Inter\',sans-serif;">Download Lyft</span>\n' +
'                        </a>\n' +
'                      </td>\n' +
'                      <td style="width:50%;padding-left:8px;">\n' +
'                        <a href="' + DOORDASH_APP_STORE_URL + '" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">\n' +
'                          <img src="' + DOORDASH_LOGO_URL + '" alt="DoorDash" style="height:22px;width:auto;display:block;margin:0 auto 6px;">\n' +
'                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:\'Inter\',sans-serif;">Download DoorDash</span>\n' +
'                        </a>\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'            <!-- School Colors Card -->\n' +
'            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin:0 0 28px;">\n' +
'              <tr>\n' +
'                <td style="padding:20px 24px;text-align:center;">\n' +
'                  <p style="margin:0 0 4px;font-size:22px;">&#x1F4E3;</p>\n' +
'                  <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;line-height:1.6;">Wear your school colors or bring some swag.<br><span style="font-weight:400;color:#374151;">Let\'s see some college pride in the room!</span></p>\n' +
'                </td>\n' +
'              </tr>\n' +
'            </table>\n' +
'\n' +
'            <!-- Sign-off -->\n' +
'            <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">See you soon,</p>\n' +
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
