// ============================================
// ORIENTATION EMAIL — July 15, 2026
// Includes RSVP handler served via doGet().
// Menu: Fulfillment Tools → Send Orientation Emails
// ============================================

const SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxG1W2xFhc4z2-JfVydTdlfZPoOhDSpnRi78gEcPlumD7s-QYXeQR9rcw_eBKRzG-2T/exec';

// Called by doGet() when action=rsvp
function handleRsvp(applicationId, responseCode) {
  const LABELS = {
    'attending':            "I'll be there!",
    'attending_with_guest': "I'll be attending with a parent or guardian.",
    'not_attending':        "Sorry, I can't make it."
  };
  const responseLabel = LABELS[responseCode] || responseCode;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let rsvpSheet = ss.getSheetByName('RSVP_Responses');

    if (!rsvpSheet) {
      rsvpSheet = ss.insertSheet('RSVP_Responses');
      const headers = ['Timestamp', 'Application ID', 'Student Name', 'Email', 'RSVP Response', 'Response Code'];
      rsvpSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      rsvpSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold').setBackground('#469E92').setFontColor('#FFFFFF');
      rsvpSheet.setFrozenRows(1);
    }

    const recipientsSheet = ss.getSheetByName('Grant_Recipients');
    let studentName  = '';
    let studentEmail = '';
    if (recipientsSheet && applicationId) {
      const data = recipientsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim() === applicationId.toString().trim()) {
          studentName  = data[i][1] || '';
          studentEmail = data[i][2] || '';
          break;
        }
      }
    }

    const rsvpData = rsvpSheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < rsvpData.length; i++) {
      if (rsvpData[i][1] && rsvpData[i][1].toString().trim() === applicationId.toString().trim()) {
        existingRow = i + 1;
        break;
      }
    }

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const row = [timestamp, applicationId, studentName, studentEmail, responseLabel, responseCode];
    if (existingRow > 0) {
      rsvpSheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      rsvpSheet.appendRow(row);
    }

    Logger.log('RSVP recorded: ' + applicationId + ' → ' + responseCode);
  } catch (err) {
    Logger.log('RSVP error: ' + err.message);
  }

  const isAttending = (responseCode === 'attending' || responseCode === 'attending_with_guest');
  return HtmlService.createHtmlOutput(buildRsvpThankYouHtml(isAttending, responseLabel))
    .setTitle('Campus Ready — RSVP Confirmed');
}

function buildRsvpThankYouHtml(isAttending, responseLabel) {
  const icon    = isAttending ? '🙌' : '💙';
  const heading = isAttending ? "You're on the list!" : "Got it — thanks for letting us know.";
  const message = isAttending
    ? '<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">See you on the 15th.</p>' +
      '<p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">Keep an eye on your inbox for updates and your kit form!</p>'
    : '<p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">We\'ll miss you this time, but we\'ll make sure you have everything you need. Keep an eye out for more from us soon.</p>';

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">' +
    '</head><body style="margin:0;padding:24px;background:#f9fafb;font-family:\'Inter\',-apple-system,sans-serif;">' +
    '<div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px 32px;text-align:center;">' +
    '<p style="font-size:40px;margin:0 0 16px;">' + icon + '</p>' +
    '<h1 style="font-family:\'Playfair Display\',Georgia,serif;font-size:26px;font-weight:700;color:#231F20;margin:0 0 20px;">' + heading + '</h1>' +
    message +
    '</div></body></html>';
}

function testOrientationEmail() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');

  if (!sheet) { Logger.log('Grant_Recipients sheet not found.'); return; }

  const data = sheet.getDataRange().getValues();
  let applicationId = 'CR_TEST';
  let firstName     = 'there';

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) {
      applicationId = data[i][0].toString().trim();
      firstName     = data[i][1].toString().trim().split(' ')[0];
      break;
    }
  }

  _sendOrientationEmail(firstName, 'elilavois@gmail.com', applicationId);
  Logger.log('Test orientation email sent to elilavois@gmail.com.');
}

function sendOrientationEmails() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');
  const ui    = SpreadsheetApp.getUi();

  if (!sheet) { ui.alert('Error', 'Grant_Recipients sheet not found.', ui.ButtonSet.OK); return; }

  const data   = sheet.getDataRange().getValues();
  const toSend = [];

  for (let i = 1; i < data.length; i++) {
    const applicationId = data[i][0] ? data[i][0].toString().trim() : '';
    const name          = data[i][1] ? data[i][1].toString().trim() : '';
    const email         = data[i][2] ? data[i][2].toString().trim() : '';
    if (!applicationId || !name || !email) continue;
    toSend.push({ applicationId, firstName: name.split(' ')[0], email });
  }

  if (toSend.length === 0) {
    ui.alert('Nothing to Send', 'No recipients found in Grant_Recipients.', ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    'Send Orientation Emails?',
    'Ready to send the July 15 Orientation & Celebration invite to ' + toSend.length + ' recipient(s).\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let successCount = 0;
  let failCount    = 0;

  toSend.forEach(function(student) {
    try {
      _sendOrientationEmail(student.firstName, student.email, student.applicationId);
      successCount++;
      Logger.log('Orientation email sent: ' + student.email);
    } catch (err) {
      failCount++;
      Logger.log('Failed: ' + student.email + ' — ' + err.message);
    }
  });

  var summary = successCount + ' orientation email(s) sent.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

function _sendOrientationEmail(firstName, email, applicationId) {
  const subject          = "You're invited — Campus Ready Orientation & Celebration, July 15";
  const base             = SCRIPT_WEBAPP_URL + '?action=rsvp&id=' + encodeURIComponent(applicationId) + '&response=';
  const rsvpAttending    = base + 'attending';
  const rsvpWithGuest    = base + 'attending_with_guest';
  const rsvpNotAttending = base + 'not_attending';

  GmailApp.sendEmail(
    email,
    subject,
    _buildOrientationEmailText(firstName, rsvpAttending, rsvpWithGuest, rsvpNotAttending),
    {
      htmlBody:  _buildOrientationEmailHtml(firstName, rsvpAttending, rsvpWithGuest, rsvpNotAttending),
      name:      'Campus Ready Foundation',
      from:      'hello@campusready.org',
      replyTo:   'hello@campusready.org'
    }
  );
}

function _buildOrientationEmailHtml(firstName, rsvpAttending, rsvpWithGuest, rsvpNotAttending) {
  return (
'<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n' +
'</head>\n' +
'<body style="margin:0;padding:0;background:#f9fafb;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">\n' +
'    <div style="background:#469E92;padding:40px 32px;text-align:center;">\n' +
'      <div style="display:inline-block;background:rgba(249,115,22,0.5);border-radius:20px;padding:5px 14px;margin:0 0 14px;">\n' +
'        <span style="font-size:12px;font-weight:600;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;">July 15, 2026</span>\n' +
'      </div>\n' +
'      <p style="font-family:\'Playfair Display\',Georgia,serif;font-size:28px;font-weight:700;color:#ffffff;margin:0 0 6px;letter-spacing:-0.3px;">Orientation &amp; Celebration</p>\n' +
'      <p style="font-size:14px;color:rgba(255,255,255,0.82);margin:0;font-weight:400;">An evening for 2026 Campus Ready grant recipients</p>\n' +
'    </div>\n' +
'    <div style="padding:32px;font-size:15px;line-height:1.7;color:#231F20;">\n' +
'      <p style="margin:0 0 18px;">Hi ' + firstName + ',</p>\n' +
'      <p style="margin:0 0 24px;">On July 15, we\'re hosting our first-ever Orientation &amp; Celebration for the 2026 Campus Ready grant recipients — an evening designed to make sure you arrive on campus confident, prepared, and ready for everything ahead.</p>\n' +
'      <div style="background:#f9fafb;border-radius:12px;padding:20px 20px 14px;margin:0 0 24px;">\n' +
'        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">\n' +
'          <tr>\n' +
'            <td width="30" valign="top" style="font-size:22px;padding-top:2px;">&#x1F4C5;</td>\n' +
'            <td valign="top" style="padding-left:12px;">\n' +
'              <p style="font-weight:600;font-size:13px;color:#6b7280;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.05em;">When</p>\n' +
'              <p style="font-size:15px;color:#231F20;margin:0;font-weight:500;">Wednesday, July 15 &nbsp;&middot;&nbsp; 6:00&ndash;8:00 PM</p>\n' +
'            </td>\n' +
'          </tr>\n' +
'        </table>\n' +
'        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">\n' +
'          <tr>\n' +
'            <td width="30" valign="top" style="font-size:22px;padding-top:2px;">&#x1F4CD;</td>\n' +
'            <td valign="top" style="padding-left:12px;">\n' +
'              <p style="font-weight:600;font-size:13px;color:#6b7280;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.05em;">Where</p>\n' +
'              <p style="font-size:15px;color:#231F20;margin:0;font-weight:500;">Napa Valley Community Foundation</p>\n' +
'              <p style="font-size:13px;color:#6b7280;margin:2px 0 0;">3299 Claremont Way, Suite 4, Napa, CA</p>\n' +
'            </td>\n' +
'          </tr>\n' +
'        </table>\n' +
'        <div style="border-top:1px solid #e5e7eb;padding-top:12px;">\n' +
'          <table width="100%" cellpadding="0" cellspacing="0">\n' +
'            <tr>\n' +
'              <td width="28" style="font-size:17px;">&#x1F32F;</td>\n' +
'              <td style="padding-left:10px;font-size:13px;color:#6b7280;">Snacks &amp; beverages provided &middot; Service from 6:00&ndash;6:30 PM</td>\n' +
'            </tr>\n' +
'          </table>\n' +
'        </div>\n' +
'      </div>\n' +
'      <p style="margin:0 0 14px;font-weight:600;color:#231F20;">Here\'s what we\'ll cover together:</p>\n' +
'      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;">\n' +
'        <table width="100%" cellpadding="0" cellspacing="0">\n' +
'          <tr>\n' +
'            <td width="32" valign="top" style="font-size:24px;padding-top:2px;padding-bottom:14px;">&#x1F393;</td>\n' +
'            <td valign="top" style="padding-left:14px;padding-bottom:14px;font-size:14px;color:#374151;line-height:1.6;">Hear from a first-generation college grad and experts who\'ll talk about what move-in day is actually like, and what to expect in your first weeks.</td>\n' +
'          </tr>\n' +
'          <tr>\n' +
'            <td width="32" valign="top" style="font-size:24px;padding-top:2px;padding-bottom:14px;">&#x1F4CB;</td>\n' +
'            <td valign="top" style="padding-left:14px;padding-bottom:14px;font-size:14px;color:#374151;line-height:1.6;">Walk through your move-in essentials, travel, and get your questions answered about the preference form arriving July 1.</td>\n' +
'          </tr>\n' +
'          <tr>\n' +
'            <td width="32" valign="top" style="font-size:24px;padding-top:2px;">&#x1F4B3;</td>\n' +
'            <td valign="top" style="padding-left:14px;font-size:14px;color:#374151;line-height:1.6;">Close out the evening by picking up your Lyft and DoorDash credits, a Target gift card, and anything else you need before you head out.</td>\n' +
'          </tr>\n' +
'        </table>\n' +
'      </div>\n' +
'      <p style="margin:0 0 24px;">If you can\'t join us in person, we\'ll have a Zoom option available. Details to follow.</p>\n' +
'      <div style="background:#f0fdfa;border:1px solid #a7f3d0;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">\n' +
'        <p style="font-weight:600;font-size:15px;color:#065f46;margin:0 0 16px;">We\'d love to know if you\'re coming.</p>\n' +
'        <table width="100%" cellpadding="0" cellspacing="0">\n' +
'          <tr><td style="padding-bottom:10px;"><a href="' + rsvpAttending + '" style="display:block;background:#469E92;color:#ffffff;font-family:\'Inter\',-apple-system,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;">I\'ll be there!</a></td></tr>\n' +
'          <tr><td style="padding-bottom:10px;"><a href="' + rsvpWithGuest + '" style="display:block;background:#ffffff;color:#469E92;font-family:\'Inter\',-apple-system,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;border:2px solid #469E92;">I\'ll be attending with a parent or guardian.</a></td></tr>\n' +
'          <tr><td><a href="' + rsvpNotAttending + '" style="display:block;background:#FFF0E6;color:#C2622A;font-family:\'Inter\',-apple-system,sans-serif;font-size:14px;font-weight:500;text-decoration:none;padding:12px 24px;border-radius:8px;border:1px solid #F4A875;">Sorry, I can\'t make it.</a></td></tr>\n' +
'        </table>\n' +
'      </div>\n' +
'      <div style="border-top:1px solid #e5e7eb;padding-top:22px;">\n' +
'        <p style="margin:0 0 12px;color:#374151;font-size:14px;">Questions? <a href="mailto:hello@campusready.org" style="color:#469E92;text-decoration:none;">hello@campusready.org</a> &nbsp;&middot;&nbsp; <a href="tel:+17075958281" style="color:#469E92;text-decoration:none;">(707) 595-8281</a></p>\n' +
'        <p style="margin:0;font-weight:600;font-size:15px;color:#231F20;">The Campus Ready Foundation Team</p>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>'
  );
}

function _buildOrientationEmailText(firstName, rsvpAttending, rsvpWithGuest, rsvpNotAttending) {
  return (
'Hi ' + firstName + ',\n\n' +
'On July 15, we\'re hosting our first-ever Orientation & Celebration for the 2026 Campus Ready grant recipients — an evening designed to make sure you arrive on campus confident, prepared, and ready for everything ahead.\n\n' +
'When: Wednesday, July 15, 6:00–8:00 PM\n' +
'Where: Napa Valley Community Foundation, 3299 Claremont Way, Suite 4, Napa, CA\n\n' +
'Snacks & beverages provided. Service from 6:00–6:30 PM.\n\n' +
"Here's what we'll cover together:\n\n" +
'🎓  Hear from a first-generation college grad who\'ll talk about what move-in day is actually like and what to expect in your first weeks.\n\n' +
'📋  Walk through your move-in essentials and get your questions answered about the preference form arriving July 1.\n\n' +
'💳  Close out the evening by picking up your Lyft and DoorDash credits, your Target gift card, and anything else you need before you head out.\n\n' +
"If you can't join us in person, we'll have a Zoom option available. Details to follow.\n\n" +
"We'd love to know if you're coming:\n\n" +
"  I'll be there! → " + rsvpAttending + '\n' +
"  I'll be attending with a parent or guardian → " + rsvpWithGuest + '\n' +
"  Sorry, I can't make it → " + rsvpNotAttending + '\n\n' +
'Questions? hello@campusready.org · (707) 595-8281\n\n' +
'The Campus Ready Foundation Team'
  );
}
