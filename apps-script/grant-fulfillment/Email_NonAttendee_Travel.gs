// ============================================
// NON-ATTENDEE TRAVEL EMAIL
// Group 2: Non-attendees with travel support (no July 15 event)
// Menu: Fulfillment Tools → Send Non-Attendee Travel Emails
// ============================================

// Student roster for this send.
// docsApproved drives the gift card line — verify before sending.
// travelMode: 'flight' or 'drive'
// For drive: companion field used in the travel card section.
const NON_ATTENDEE_TRAVEL_STUDENTS = [
  {
    firstName:    'Arianna',
    email:        'deibertarianna@gmail.com',
    college:      'San Diego State University',
    travelMode:   'flight',
    departure:    'SFO',
    destination:  'San Diego',
    docsApproved: false   // Housing + Acceptance still Pending as of July 10, 2026
  },
  {
    firstName:    'Gabrielle',
    email:        'gabriellemonteiro938@gmail.com',
    college:      'Whittier College',
    travelMode:   'flight',
    departure:    'Boston',
    destination:  'Los Angeles',
    docsApproved: true
  },
  {
    firstName:    'Lilian',
    email:        'barrientoslilian367@gmail.com',
    college:      'University of Chicago',
    travelMode:   'flight',
    departure:    'SFO',
    destination:  'Chicago',
    docsApproved: true
  },
  {
    firstName:    'Anastasia',
    email:        'guerrieranastasia511@gmail.com',
    college:      'College of Saint Benedict',
    travelMode:   'drive',
    departure:    'Miami',
    destination:  'Saint Joseph, Minnesota',
    companion:    'your mom',
    docsApproved: true
  }
];

function sendNonAttendeeTravelEmails() {
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    'Send Non-Attendee Travel Emails?',
    'Ready to send to ' + NON_ATTENDEE_TRAVEL_STUDENTS.length + ' students:\n\n' +
    NON_ATTENDEE_TRAVEL_STUDENTS.map(s => s.firstName + ' — ' + s.email).join('\n') +
    '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let successCount = 0;
  let failCount    = 0;

  NON_ATTENDEE_TRAVEL_STUDENTS.forEach(student => {
    try {
      sendNonAttendeeTravelEmail(student);
      successCount++;
      Logger.log('Non-attendee travel email sent: ' + student.email);
    } catch (error) {
      failCount++;
      Logger.log('Failed: ' + student.email + ' — ' + error.message);
    }
  });

  let summary = successCount + ' email(s) sent.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

// Sends to a single student object. Used by bulk send and test functions.
function sendNonAttendeeTravelEmail(student) {
  const subject = 'What we have for you.';

  const giftCardLine = student.docsApproved
    ? 'A $100 Target gift card will be sent to your email address in the coming days.'
    : 'A $100 Target gift card will be sent to your email address once your housing and college acceptance documents are approved.';

  const travelSection = student.travelMode === 'drive'
    ? _nonAttendeeTravelSection_Drive(student)
    : _nonAttendeeTravelSection_Flight(student);

  const htmlBody = _nonAttendeeTravelHtml(student.firstName, giftCardLine, travelSection, student.travelMode);
  const textBody = _nonAttendeeTravelText(student.firstName, giftCardLine, student);

  GmailApp.sendEmail(student.email, subject, textBody, {
    htmlBody: htmlBody,
    name:     'Campus Ready Foundation',
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
}

// Test: sends all four variations to elilavois@gmail.com
function testNonAttendeeTravelEmails() {
  const TEST_EMAIL = 'elilavois@gmail.com';
  NON_ATTENDEE_TRAVEL_STUDENTS.forEach(student => {
    const testStudent = Object.assign({}, student, { email: TEST_EMAIL });
    sendNonAttendeeTravelEmail(testStudent);
    Logger.log('Test sent to ' + TEST_EMAIL + ' for ' + student.firstName);
  });
  Logger.log('All 4 test variants sent to ' + TEST_EMAIL);
}

// ============================================
// TRAVEL SECTION BUILDERS
// ============================================

function _nonAttendeeTravelSection_Flight(student) {
  return {
    html:
      '<p style="margin:0 0 12px;">We\'re also setting up a Ramp virtual card to cover your flight to ' + student.college + '. It\'s a secure digital card number you\'ll use to book your ticket directly — not a physical card. We\'ll share the details once we\'ve confirmed your plans.</p>' +
      '<div style="background:#EEF2FF;border-left:4px solid #4F46E5;border-radius:0 8px 8px 0;padding:16px;font-size:14px;color:#1e1b4b;">Based on your application, we\'re planning to cover a flight from <strong>' + student.departure + '</strong> to <strong>' + student.destination + '</strong>. Let us know if you\'re planning to get to school a different way.</div>',
    text:
      'YOUR TRAVEL CARD\n\n' +
      'We\'re also setting up a Ramp virtual card to cover your flight to ' + student.college + '. It\'s a secure digital card number you\'ll use to book your ticket directly — not a physical card. We\'ll share the details once we\'ve confirmed your plans.\n\n' +
      'Based on your application, we\'re planning to cover a flight from ' + student.departure + ' to ' + student.destination + '. Let us know if you\'re planning to get to school a different way.\n\n'
  };
}

function _nonAttendeeTravelSection_Drive(student) {
  return {
    html:
      '<p style="margin:0 0 12px;">We\'re also setting up a Ramp virtual card to cover gas for your drive to ' + student.college + ', plus one night of hotel if you need it along the way. It\'s a secure digital card number — no physical card. We\'ll share the details once we\'ve confirmed your plans.</p>' +
      '<div style="background:#ECFDF5;border-left:4px solid #059669;border-radius:0 8px 8px 0;padding:16px;font-size:14px;color:#064E3B;">Based on your application, we\'re planning to cover gas and a hotel stop for your drive from <strong>' + student.departure + '</strong> to <strong>' + student.destination + '</strong>' + (student.companion ? ' with ' + student.companion : '') + '. Let us know if your plans have changed.</div>',
    text:
      'YOUR TRAVEL CARD\n\n' +
      'We\'re also setting up a Ramp virtual card to cover gas for your drive to ' + student.college + ', plus one night of hotel if you need it along the way. It\'s a secure digital card number — no physical card. We\'ll share the details once we\'ve confirmed your plans.\n\n' +
      'Based on your application, we\'re planning to cover gas and a hotel stop for your drive from ' + student.departure + ' to ' + student.destination + (student.companion ? ' with ' + student.companion : '') + '. Let us know if your plans have changed.\n\n'
  };
}

// ============================================
// HTML + TEXT BUILDERS
// ============================================

// Lyft logo SVG (inline, pink wordmark-style)
var LYFT_LOGO =
  '<svg width="48" height="22" viewBox="0 0 120 54" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="120" height="54" rx="8" fill="#EA0B8C"/>' +
  '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="32" fill="#ffffff" letter-spacing="-1">Lyft</text>' +
  '</svg>';

// DoorDash logo SVG (inline, red wordmark-style)
var DOORDASH_LOGO =
  '<svg width="80" height="22" viewBox="0 0 200 54" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="200" height="54" rx="8" fill="#FF3008"/>' +
  '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="26" fill="#ffffff" letter-spacing="-0.5">DoorDash</text>' +
  '</svg>';

// Target bullseye SVG
var TARGET_LOGO =
  '<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">' +
  '<circle cx="14" cy="14" r="14" fill="#CC0000"/>' +
  '<circle cx="14" cy="14" r="9" fill="#ffffff"/>' +
  '<circle cx="14" cy="14" r="4.5" fill="#CC0000"/>' +
  '</svg>';

function _nonAttendeeTravelHtml(firstName, giftCardLine, travelSection, travelMode) {
  var travelAccentBg    = travelMode === 'drive' ? '#ECFDF5' : '#EEF2FF';
  var travelAccentColor = travelMode === 'drive' ? '#059669' : '#4F46E5';
  var travelEmoji       = travelMode === 'drive' ? '⛽' : '✈️';
  var travelLabel       = travelMode === 'drive' ? 'Your gas &amp; hotel card' : 'Your travel card';

  return '<!DOCTYPE html>\n' +
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
'    </div>\n' +

'    <div style="padding:32px;font-size:15px;line-height:1.7;color:#231F20;">\n' +

'      <p style="margin:0 0 24px;">We\'re sorry you won\'t be with us on Wednesday but rest assured, we\'re going to get you all the support we promised.</p>\n' +
'      <p style="margin:0 0 28px;font-weight:500;">Here\'s what we planned to disburse at the event.</p>\n' +

'      <!-- Lyft + DoorDash -->\n' +
'      <div style="background:#f9fafb;border-radius:12px;padding:24px;margin:0 0 16px;">\n' +
'        <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">\n' +
'          <tr>\n' +
'            <td style="vertical-align:middle;">' + LYFT_LOGO + '</td>\n' +
'            <td style="vertical-align:middle;padding-left:12px;">' + DOORDASH_LOGO + '</td>\n' +
'          </tr>\n' +
'        </table>\n' +
'        <p style="font-weight:700;font-size:16px;color:#231F20;margin:0 0 10px;font-family:\'Playfair Display\',Georgia,serif;">Download Lyft and DoorDash Apps</p>\n' +
'        <p style="margin:0 0 12px;font-size:14px;color:#374151;">We set up a <strong>Lyft credit ($150)</strong> for you to use to get to school, get to and from the airport, or get around town. We also set up a <strong>DoorDash credit ($100)</strong> for meals during those first days on campus.</p>\n' +
'        <p style="margin:0 0 20px;font-size:14px;color:#374151;">Download both apps, then text us at <strong>(707) 595-8281</strong> to let us know you\'ve got them. Once we have your confirmation, we\'ll text you your dedicated codes and you\'ll get the credit.</p>\n' +
'        <table style="width:100%;border-collapse:collapse;">\n' +
'          <tr>\n' +
'            <td style="width:50%;padding-right:6px;">\n' +
'              <a href="https://lyft.com/app" style="display:block;background:#EA0B8C;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 16px;border-radius:8px;text-align:center;">🚗 Download Lyft</a>\n' +
'            </td>\n' +
'            <td style="width:50%;padding-left:6px;">\n' +
'              <a href="https://doordash.com" style="display:block;background:#FF3008;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 16px;border-radius:8px;text-align:center;">🍔 Download DoorDash</a>\n' +
'            </td>\n' +
'          </tr>\n' +
'        </table>\n' +
'      </div>\n' +

'      <!-- Target gift card -->\n' +
'      <div style="background:#FFF5F5;border-radius:12px;padding:24px;margin:0 0 16px;">\n' +
'        <table style="border-collapse:collapse;margin:0 0 12px;">\n' +
'          <tr>\n' +
'            <td style="vertical-align:middle;padding-right:10px;">' + TARGET_LOGO + '</td>\n' +
'            <td style="vertical-align:middle;font-weight:700;font-size:16px;color:#CC0000;font-family:\'Playfair Display\',Georgia,serif;">🎁 A $100 Target gift card</td>\n' +
'          </tr>\n' +
'        </table>\n' +
'        <p style="margin:0;font-size:14px;color:#374151;">' + giftCardLine + ' You can use it for whatever helps most with move-in before or after your arrival.</p>\n' +
'      </div>\n' +

'      <!-- Travel card -->\n' +
'      <div style="background:' + travelAccentBg + ';border-radius:12px;padding:24px;margin:0 0 28px;">\n' +
'        <p style="font-weight:700;font-size:16px;color:' + travelAccentColor + ';margin:0 0 12px;font-family:\'Playfair Display\',Georgia,serif;">' + travelEmoji + ' ' + travelLabel + '</p>\n' +
        travelSection.html +
'      </div>\n' +

'      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">\n' +
'        <p style="margin:0 0 4px;color:#374151;font-size:15px;">You\'ve worked hard to get here. We\'re glad to be a small part of your start.</p>\n' +
'        <p style="margin:8px 0 4px;font-weight:600;">The Campus Ready team</p>\n' +
'        <a href="https://campusready.org" style="color:#469E92;text-decoration:none;font-size:14px;">campusready.org</a>\n' +
'      </div>\n' +

'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';
}

function _nonAttendeeTravelText(firstName, giftCardLine, student) {
  const travelSection = student.travelMode === 'drive'
    ? _nonAttendeeTravelSection_Drive(student).text
    : _nonAttendeeTravelSection_Flight(student).text;

  return 'Hi ' + firstName + ',\n\n' +
'We\'re sorry you won\'t be with us on Wednesday but rest assured, we\'re going to get you all the support we promised.\n\n' +
'Here\'s what we planned to disburse at the event.\n\n' +
'DOWNLOAD LYFT AND DOORDASH APPS\n\n' +
'We set up a Lyft credit ($150) for you to use to get to school, get to and from the airport, or get around town. We also set up a DoorDash credit ($100) for meals during those first days on campus.\n\n' +
'Download both apps, then text us at (707) 595-8281 to let us know you\'ve got them. Once we have your confirmation, we\'ll text you your dedicated codes and you\'ll get the credit.\n\n' +
'Download Lyft: https://lyft.com/app\n' +
'Download DoorDash: https://doordash.com\n\n' +
'A $100 TARGET GIFT CARD\n\n' +
giftCardLine + ' You can use it for whatever helps most with move-in before or after your arrival.\n\n' +
travelSection +
'You\'ve worked hard to get here. We\'re glad to be a small part of your start.\n\n' +
'The Campus Ready team\n' +
'hello@campusready.org\n' +
'campusready.org';
}
