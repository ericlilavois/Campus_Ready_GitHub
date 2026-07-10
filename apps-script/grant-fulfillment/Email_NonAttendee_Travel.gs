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
      '<p style="font-size:13px;color:#374151;line-height:1.65;margin:0 0 10px;">We\'re setting up a Ramp virtual card to cover your flight to ' + student.college + '. It\'s a secure digital card number you\'ll use to book your ticket directly — not a physical card. We\'ll share the details once we\'ve confirmed your plans.</p>' +
      '<p style="font-size:12px;color:#6b7280;margin:0;">Based on your application: flight from <strong>' + student.departure + '</strong> to <strong>' + student.destination + '</strong>. Let us know if your plans have changed.</p>',
    text:
      'YOUR TRAVEL CARD\n\n' +
      'We\'re setting up a Ramp virtual card to cover your flight to ' + student.college + '. It\'s a secure digital card number you\'ll use to book your ticket directly — not a physical card. We\'ll share the details once we\'ve confirmed your plans.\n\n' +
      'Based on your application: flight from ' + student.departure + ' to ' + student.destination + '. Let us know if your plans have changed.\n\n'
  };
}

function _nonAttendeeTravelSection_Drive(student) {
  return {
    html:
      '<p style="font-size:13px;color:#374151;line-height:1.65;margin:0 0 10px;">We\'re setting up a Ramp virtual card to cover gas for your drive to ' + student.college + ', plus one night of hotel if you need it along the way. It\'s a secure digital card number — no physical card. We\'ll share the details once we\'ve confirmed your plans.</p>' +
      '<p style="font-size:12px;color:#6b7280;margin:0;">Based on your application: drive from <strong>' + student.departure + '</strong> to <strong>' + student.destination + '</strong>' + (student.companion ? ' with ' + student.companion : '') + '. Let us know if your plans have changed.</p>',
    text:
      'YOUR GAS & HOTEL CARD\n\n' +
      'We\'re setting up a Ramp virtual card to cover gas for your drive to ' + student.college + ', plus one night of hotel if you need it along the way. It\'s a secure digital card number — no physical card. We\'ll share the details once we\'ve confirmed your plans.\n\n' +
      'Based on your application: drive from ' + student.departure + ' to ' + student.destination + (student.companion ? ' with ' + student.companion : '') + '. Let us know if your plans have changed.\n\n'
  };
}

// ============================================
// HTML + TEXT BUILDERS
// ============================================

function _nonAttendeeTravelHtml(firstName, giftCardLine, travelSection, travelMode) {
  var travelBg    = travelMode === 'drive' ? '#ECFDF5' : '#EEF2FF';
  var travelColor = travelMode === 'drive' ? '#065F46' : '#3730A3';
  var travelLabel = travelMode === 'drive' ? 'Gas & Hotel Card' : 'Travel Card';

  return '<!DOCTYPE html>' +
'<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' +
'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">' +
'<tr><td align="center" style="padding:20px 12px;">' +
'<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">' +

// Header
'<tr><td style="background:#469E92;padding:32px 24px;text-align:center;">' +
  '<p style="font-size:11px;color:rgba(255,255,255,.7);margin:0 0 6px;text-transform:uppercase;letter-spacing:.1em;font-weight:500;">For</p>' +
  '<p style="font-size:38px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-.5px;font-family:Georgia,serif;">' + firstName + '</p>' +
'</td></tr>' +

// Intro
'<tr><td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;line-height:1.65;">' +
  '<p style="margin:0 0 8px;">We\'re sorry you won\'t be with us on Wednesday, but rest assured — we\'re going to make sure you get everything we promised.</p>' +
  '<p style="margin:0;color:#6b7280;">Here\'s what we planned to disburse at the event.</p>' +
'</td></tr>' +

// Lyft + DoorDash — logos via Clearbit, brand-color buttons
'<tr><td style="padding:0;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb;">' +
    '<tr><td style="padding:16px 24px 12px;">' +
      '<table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">' +
        '<tr>' +
          '<td style="padding-right:10px;vertical-align:middle;">' +
            '<img src="https://logo.clearbit.com/lyft.com?size=64" width="32" height="32" style="border-radius:6px;display:block;" alt="Lyft">' +
          '</td>' +
          '<td style="padding-right:24px;vertical-align:middle;">' +
            '<div style="font-size:13px;font-weight:600;color:#111827;">Lyft</div>' +
          '</td>' +
          '<td style="padding-right:10px;vertical-align:middle;">' +
            '<img src="https://logo.clearbit.com/doordash.com?size=64" width="32" height="32" style="border-radius:6px;display:block;" alt="DoorDash">' +
          '</td>' +
          '<td style="vertical-align:middle;">' +
            '<div style="font-size:13px;font-weight:600;color:#111827;">DoorDash</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +
      '<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Download Lyft and DoorDash Apps</div>' +
      '<p style="font-size:13px;color:#374151;line-height:1.65;margin:0 0 8px;">We set up a <strong>Lyft credit ($150)</strong> for you to use to get to school, get to and from the airport, or get around town. We also set up a <strong>DoorDash credit ($100)</strong> for meals during your first days on campus.</p>' +
      '<p style="font-size:13px;color:#374151;line-height:1.65;margin:0 0 16px;">Download both apps, then text us at <strong>(707) 595-8281</strong> to let us know you have them. Once we have your confirmation, we\'ll text you your dedicated codes and you\'ll get the credit.</p>' +
    '</td></tr>' +
    '<tr><td style="padding:0 24px 16px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0">' +
        '<tr>' +
          '<td width="50%" style="padding-right:6px;">' +
            '<a href="https://lyft.com/app" style="display:block;background:#EA0B8C;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 16px;border-radius:6px;text-align:center;">Download Lyft</a>' +
          '</td>' +
          '<td width="50%" style="padding-left:6px;">' +
            '<a href="https://doordash.com" style="display:block;background:#FF3008;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 16px;border-radius:6px;text-align:center;">Download DoorDash</a>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</td></tr>' +
  '</table>' +
'</td></tr>' +

// Target gift card
'<tr><td style="padding:0;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb;">' +
    '<tr><td style="padding:16px 24px;">' +
      '<table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">' +
        '<tr>' +
          '<td style="padding-right:10px;vertical-align:middle;">' +
            '<img src="https://logo.clearbit.com/target.com?size=64" width="32" height="32" style="border-radius:6px;display:block;" alt="Target">' +
          '</td>' +
          '<td style="vertical-align:middle;">' +
            '<div style="font-size:13px;font-weight:600;color:#111827;">Target</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +
      '<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">$100 Target Gift Card</div>' +
      '<p style="font-size:13px;color:#374151;line-height:1.65;margin:0;">' + giftCardLine + ' Use it for whatever helps most with your move-in.</p>' +
    '</td></tr>' +
  '</table>' +
'</td></tr>' +

// Travel card — colored background row
'<tr><td style="padding:0;background:' + travelBg + ';">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb;">' +
    '<tr><td style="padding:16px 24px;">' +
      '<div style="font-size:11px;font-weight:600;color:' + travelColor + ';text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">' + travelLabel + '</div>' +
      travelSection.html +
    '</td></tr>' +
  '</table>' +
'</td></tr>' +

// Footer
'<tr><td style="padding:16px 24px 20px;background:#f9fafb;">' +
  '<p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;">You\'ve worked hard to get here. We\'re glad to be a small part of your start.</p>' +
  '<p style="font-size:12px;color:#6b7280;line-height:1.6;margin:8px 0 0;">Questions? <a href="mailto:hello@campusready.org" style="color:#469E92;text-decoration:none;font-weight:500;">hello@campusready.org</a></p>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
}

function _nonAttendeeTravelText(firstName, giftCardLine, student) {
  const travelSection = student.travelMode === 'drive'
    ? _nonAttendeeTravelSection_Drive(student).text
    : _nonAttendeeTravelSection_Flight(student).text;

  return 'Hi ' + firstName + ',\n\n' +
'We\'re sorry you won\'t be with us on Wednesday, but rest assured — we\'re going to make sure you get everything we promised.\n\n' +
'Here\'s what we planned to disburse at the event.\n\n' +
'DOWNLOAD LYFT AND DOORDASH APPS\n\n' +
'We set up a Lyft credit ($150) for you to use to get to school, get to and from the airport, or get around town. We also set up a DoorDash credit ($100) for meals during your first days on campus.\n\n' +
'Download both apps, then text us at (707) 595-8281 to let us know you have them. Once we have your confirmation, we\'ll text you your dedicated codes and you\'ll get the credit.\n\n' +
'Download Lyft: https://lyft.com/app\n' +
'Download DoorDash: https://doordash.com\n\n' +
'$100 TARGET GIFT CARD\n\n' +
giftCardLine + ' Use it for whatever helps most with your move-in.\n\n' +
travelSection +
'You\'ve worked hard to get here. We\'re glad to be a small part of your start.\n\n' +
'The Campus Ready team\n' +
'hello@campusready.org\n' +
'campusready.org';
}
