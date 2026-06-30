// ============================================
// KIT FORM EMAIL
// Sends personalized invite links to each recipient.
// Menu: Fulfillment Tools → Send Kit Form Emails
// ============================================

const KIT_FORM_BASE_URL = 'https://award.campusready.org/Customize_Your_Kit.html';

function sendKitFormEmails() {
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
    'Send Kit Form Emails?',
    'Ready to send personalized links to ' + toSend.length + ' recipient(s).\n\n' +
    'Each student will receive a unique link that takes them directly into the form.\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let successCount = 0;
  let failCount    = 0;

  toSend.forEach(student => {
    try {
      const personalizedLink = KIT_FORM_BASE_URL + '?id=' + encodeURIComponent(student.applicationId);
      sendKitFormEmail(student.firstName, student.email, personalizedLink);
      successCount++;
      Logger.log('Kit form email sent: ' + student.email + ' → ' + personalizedLink);
    } catch (error) {
      failCount++;
      Logger.log('Failed: ' + student.email + ' — ' + error.message);
    }
  });

  let summary = successCount + ' email(s) sent with personalized links.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

function sendKitFormEmail(firstName, email, personalizedLink) {
  const subject = 'Your Campus Ready kit is ready to customize';

  const htmlBody =
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
'      <p style="font-family:\'Playfair Display\',Georgia,serif;font-size:36px;font-weight:700;color:#ffffff;margin:0 0 8px;letter-spacing:-0.5px;">' + firstName + '!</p>\n' +
'      <p style="font-size:16px;color:rgba(255,255,255,0.88);margin:0;font-weight:400;">It\'s time to customize your kit.</p>\n' +
'    </div>\n' +
'    <div style="padding:32px;font-size:15px;line-height:1.7;color:#231F20;">\n' +
'      <p style="margin:0 0 20px;">Hi ' + firstName + ',</p>\n' +
'      <p style="margin:0 0 20px;">We promised we\'d be back in touch, and here we are. Your Campus Ready Move-In Essentials are ready for you to personalize — colors, sizes, scents, and where you\'d like everything shipped.</p>\n' +
'      <p style="margin:0 0 28px;">Get your <strong>housing confirmation</strong> and <strong>college acceptance letter</strong> handy. You\'ll need to upload them as part of the process.</p>\n' +
'      <div style="background:#f9fafb;border-radius:12px;padding:24px;margin:0 0 28px;">\n' +
'        <p style="font-size:13px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Your 2026 Campus Ready Grant</p>\n' +
'        <p style="font-family:\'Playfair Display\',Georgia,serif;font-size:22px;font-weight:700;color:#231F20;margin:0 0 20px;letter-spacing:-0.3px;">Here\'s everything you\'re getting.</p>\n' +
'        <table style="width:100%;border-collapse:collapse;margin:0 0 12px;">\n' +
'          <tr>\n' +
'            <td style="width:50%;padding-right:6px;vertical-align:top;">\n' +
'              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">\n' +
'                <span style="font-size:22px;display:block;margin-bottom:8px;">&#x1F6CF;</span>\n' +
'                <p style="font-weight:600;font-size:14px;color:#231F20;margin:0 0 4px;">Move-In Essentials</p>\n' +
'                <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">Personalized bedding, towels, toiletries, and more.</p>\n' +
'              </div>\n' +
'            </td>\n' +
'            <td style="width:50%;padding-left:6px;vertical-align:top;">\n' +
'              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">\n' +
'                <span style="font-size:22px;display:block;margin-bottom:8px;">&#x1F697;</span>\n' +
'                <p style="font-weight:600;font-size:14px;color:#231F20;margin:0 0 4px;">Lyft Credits</p>\n' +
'                <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">Rides to the airport or directly to campus.</p>\n' +
'              </div>\n' +
'            </td>\n' +
'          </tr>\n' +
'        </table>\n' +
'        <table style="width:100%;border-collapse:collapse;">\n' +
'          <tr>\n' +
'            <td style="width:50%;padding-right:6px;vertical-align:top;">\n' +
'              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">\n' +
'                <span style="font-size:22px;display:block;margin-bottom:8px;">&#x1F957;</span>\n' +
'                <p style="font-weight:600;font-size:14px;color:#231F20;margin:0 0 4px;">DoorDash Credits</p>\n' +
'                <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">Meal or grocery delivery for your first days on campus.</p>\n' +
'              </div>\n' +
'            </td>\n' +
'            <td style="width:50%;padding-left:6px;vertical-align:top;">\n' +
'              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">\n' +
'                <span style="font-size:22px;display:block;margin-bottom:8px;">&#x1F4B3;</span>\n' +
'                <p style="font-weight:600;font-size:14px;color:#231F20;margin:0 0 4px;">Incidentals Gift Card</p>\n' +
'                <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">For anything that comes up in those first few days.</p>\n' +
'              </div>\n' +
'            </td>\n' +
'          </tr>\n' +
'        </table>\n' +
'      </div>\n' +
'      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px 24px;margin:0 0 28px;">\n' +
'        <p style="margin:0 0 6px;font-weight:600;color:#0f766e;font-size:15px;">&#x1F4C5; Remember to mark your calendars for the July 15th Orientation &amp; Celebration.</p>\n' +
'        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">On July 15 we\'re hosting a celebration for our grant award winners. We\'ll walk through everything you\'re getting, distribute credits and cards, and talk about your first days on campus. You can join us in person or on Zoom. Details coming soon.</p>\n' +
'      </div>\n' +
'      <div style="text-align:center;margin:0 0 28px;">\n' +
'        <a href="' + personalizedLink + '" style="display:inline-block;background:#469E92;color:#ffffff;font-family:\'Inter\',-apple-system,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:8px;letter-spacing:0.01em;">Customize My Kit</a>\n' +
'      </div>\n' +
'      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">\n' +
'        <p style="margin:0 0 4px;color:#374151;font-size:15px;">Can\'t wait to see your kit take shape. See you on the 15th.</p>\n' +
'        <p style="margin:0 0 4px;font-weight:600;">The Campus Ready Foundation Team</p>\n' +
'        <a href="https://campusready.org" style="color:#469E92;text-decoration:none;font-size:14px;">campusready.org</a>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';

  const textBody =
'Hi ' + firstName + ',\n\n' +
'We promised we\'d be back in touch, and here we are. Your Campus Ready Move-In Essentials are ready for you to personalize — colors, sizes, scents, and where you\'d like everything shipped.\n\n' +
'Get your housing confirmation and college acceptance letter handy. You\'ll need to upload them as part of the process.\n\n' +
'Your 2026 Campus Ready Grant includes:\n\n' +
'• Move-In Essentials — Personalized bedding, towels, toiletries, and more.\n' +
'• Lyft Credits — Rides to the airport or directly to campus.\n' +
'• DoorDash Credits — Meal or grocery delivery for your first days on campus.\n' +
'• Incidentals Gift Card — For anything that comes up in those first few days.\n\n' +
'Save the date — July 15\n' +
'On July 15 we\'re hosting a celebration for our grant award winners. Details coming soon.\n\n' +
'Customize your kit here (this link is just for you):\n' +
personalizedLink + '\n\n' +
'Can\'t wait to see your kit take shape. See you on the 15th.\n\n' +
'The Campus Ready Foundation Team\n' +
'hello@campusready.org\n' +
'campusready.org';

  GmailApp.sendEmail(email, subject, textBody, {
    htmlBody: htmlBody,
    name:     'Campus Ready Foundation',
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
}

function testKitFormEmail() {
  _sendTestKitEmail('elilavois@gmail.com');
}

function testKitFormEmailKaren() {
  _sendTestKitEmail('kdantzler@gmail.com');
}

function _sendTestKitEmail(emailAddress) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().toLowerCase() === emailAddress.toLowerCase()) {
      const applicationId    = data[i][0].toString();
      const firstName        = data[i][1].toString().split(' ')[0];
      const personalizedLink = KIT_FORM_BASE_URL + '?id=' + encodeURIComponent(applicationId);
      sendKitFormEmail(firstName, emailAddress, personalizedLink);
      Logger.log('Test kit form email sent to ' + emailAddress + ' with link: ' + personalizedLink);
      return;
    }
  }

  Logger.log('⚠️ ' + emailAddress + ' not found in Grant_Recipients — sending with preview link');
  sendKitFormEmail('there', emailAddress, KIT_FORM_BASE_URL + '?id=CR_TEST_PREVIEW');
}

// Runs daily at 7am America/Los_Angeles, July 1 – September 15.
function sendKitFormDailyDigest() {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const day    = now.getDate();
  const inSeason = (month === 7) || (month === 8) || (month === 9 && day <= 15);
  if (!inSeason) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = 'America/Los_Angeles';

  const recipientsSheet = ss.getSheetByName('Grant_Recipients');
  if (!recipientsSheet) { Logger.log('sendKitFormDailyDigest: Grant_Recipients not found'); return; }

  const recipientsData = recipientsSheet.getDataRange().getValues();
  const totalCohort    = recipientsData.length - 1;
  const collegeMap     = {};
  let outstanding      = 0;

  for (let i = 1; i < recipientsData.length; i++) {
    const row     = recipientsData[i];
    const email   = row[2] ? row[2].toString().toLowerCase() : '';
    const college = row[19] ? row[19].toString() : '';
    if (email) collegeMap[email] = college;
    if (row[9] !== 'Yes') outstanding++;
  }

  const selectionsSheet  = ss.getSheetByName('Student_Selections');
  const cutoff           = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todaySubmissions = [];

  if (selectionsSheet && selectionsSheet.getLastRow() > 1) {
    const selData = selectionsSheet.getDataRange().getValues();
    const headers = selData[0];
    const colIdx  = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    const tsCol   = colIdx['Timestamp'] !== undefined ? colIdx['Timestamp'] : colIdx['Date Submitted'];
    const nameCol  = colIdx['Student Name'];
    const emailCol = colIdx['Email Address'];
    const shipCol  = colIdx['Shipping Preference'];

    for (let i = 1; i < selData.length; i++) {
      const row = selData[i];
      const ts  = row[tsCol];
      if (!(ts instanceof Date) || ts < cutoff) continue;
      const emailKey = row[emailCol] ? row[emailCol].toString().toLowerCase() : '';
      todaySubmissions.push({
        name:     row[nameCol]  || '',
        email:    row[emailCol] || '',
        college:  collegeMap[emailKey] || '—',
        shipping: row[shipCol]  || '—',
        time:     Utilities.formatDate(ts, tz, 'h:mm a')
      });
    }
    todaySubmissions.sort(function(a, b) { return a.name.localeCompare(b.name); });
  }

  const count   = todaySubmissions.length;
  const dateStr = Utilities.formatDate(now, tz, 'EEEE, MMMM d, yyyy');
  const subject = 'Campus Ready — Daily Kit Form Digest (' + count + ' new)';

  const statsHtml =
    '<div style="display:flex;gap:12px;margin-bottom:24px;">' +
      _digestStatCard('Total cohort',    totalCohort, '#374151') +
      _digestStatCard('Submitted today', count,       '#469E92') +
      _digestStatCard('Outstanding',     outstanding, '#e24b4a') +
    '</div>';

  let bodyHtml;
  if (count === 0) {
    bodyHtml = '<p style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:13px;color:#6b7280;margin:0;">' +
      'No submissions today — ' + outstanding + ' student' + (outstanding === 1 ? '' : 's') + ' still outstanding.</p>';
  } else {
    let rows = '';
    todaySubmissions.forEach(function(s) {
      rows +=
        '<tr>' +
        '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">'  + s.name     + '</td>' +
        '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">'  + s.email    + '</td>' +
        '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">'  + s.college  + '</td>' +
        '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">'  + s.shipping + '</td>' +
        '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:right;">' + s.time + '</td>' +
        '</tr>';
    });
    bodyHtml =
      '<p style="font-size:13px;color:#6b7280;margin:0 0 12px;">' + count + ' student' + (count === 1 ? '' : 's') + ' submitted in the last 24 hours:</p>' +
      '<table style="border-collapse:collapse;width:100%;font-size:13px;">' +
      '<thead><tr style="background:#f9fafb;text-align:left;">' +
      '<th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:500;">Student</th>' +
      '<th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:500;">Email</th>' +
      '<th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:500;">School</th>' +
      '<th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:500;">Shipping</th>' +
      '<th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:500;text-align:right;">Time</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId();
  const htmlBody =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;max-width:860px;color:#374151;">' +
    '<h2 style="color:#469E92;margin:0 0 4px;font-size:20px;font-weight:500;">Campus Ready — Daily Kit Form Digest</h2>' +
    '<p style="color:#6b7280;margin:0 0 20px;font-size:14px;">' + dateStr + '</p>' +
    statsHtml + bodyHtml +
    '<div style="margin-top:20px;"><a href="' + sheetUrl + '" style="color:#469E92;font-size:14px;text-decoration:none;">Open Student Selections sheet →</a></div>' +
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px;">' +
    '<p style="color:#9ca3af;font-size:12px;margin:0;">Automated daily digest · Runs July 1 – September 15</p>' +
    '</div>';

  const textBody =
    'Campus Ready — Daily Kit Form Digest\n' + dateStr + '\n\n' +
    'Total cohort: ' + totalCohort + ' | Submitted today: ' + count + ' | Outstanding: ' + outstanding + '\n\n' +
    (count === 0 ? 'No submissions today.' : todaySubmissions.map(s => s.name + ' (' + s.email + ') — ' + s.college + ' — ' + s.time).join('\n'));

  GmailApp.sendEmail('hello@campusready.org', subject, textBody, {
    htmlBody: htmlBody,
    name:     'Campus Ready Foundation',
    from:     'hello@campusready.org'
  });

  Logger.log('Kit form digest sent: ' + count + ' submissions, ' + outstanding + ' outstanding of ' + totalCohort);
}

function _digestStatCard(label, value, color) {
  return '<div style="flex:1;background:#f9fafb;border-radius:8px;padding:14px 16px;">' +
    '<div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">' + label + '</div>' +
    '<div style="font-size:28px;font-weight:500;color:' + color + ';">' + value + '</div>' +
    '</div>';
}

function testKitFormDailyDigest() {
  sendKitFormDailyDigest();
}
