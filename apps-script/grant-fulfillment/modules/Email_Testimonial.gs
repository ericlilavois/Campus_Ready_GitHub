// ============================================
// TESTIMONIAL EMAIL SYSTEM
// Weekly digest runs every Monday at 8am PT (set via createTestimonialTrigger).
// Invite emails sent from menu: Fulfillment Tools → Send Testimonial Invites
// ============================================

const TESTIMONIAL_CONFIG = {
  GRANT_RECIPIENTS_SHEET: 'Grant_Recipients',
  NOTIFICATION_EMAIL:     'hello@campusready.org',
  COLS: {
    APPLICATION_ID:      0,
    STUDENT_NAME:        1,
    EMAIL:               2,
    COHORT_YEAR:         3,
    ITEMS_SELECTED:      9,
    START_DATE:          13,
    TESTIMONIAL_INVITED: 14,
    PHONE:               18
  }
};

function sendTestimonialReminder() {
  const today = new Date();
  const month = today.getMonth();
  const day   = today.getDate();
  const afterJune15 = (month > 5) || (month === 5 && day >= 15);
  const beforeSept1 = (month < 8) || (month === 8 && day < 1);
  if (!(afterJune15 && beforeSept1)) {
    Logger.log('Outside testimonial outreach window (June 15 – September 1). Skipping.');
    return;
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TESTIMONIAL_CONFIG.GRANT_RECIPIENTS_SHEET);
  if (!sheet) { Logger.log('Grant_Recipients sheet not found'); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('No data in Grant_Recipients'); return; }

  const data          = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const readyStudents = [];

  data.forEach((row, index) => {
    const startDate          = row[TESTIMONIAL_CONFIG.COLS.START_DATE];
    const testimonialInvited = row[TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED];
    const itemsSelected      = row[TESTIMONIAL_CONFIG.COLS.ITEMS_SELECTED];
    const studentName        = row[TESTIMONIAL_CONFIG.COLS.STUDENT_NAME];

    if (!startDate || testimonialInvited || !studentName) return;
    if (itemsSelected !== 'Yes') return;

    const startDateObj = new Date(startDate);
    if (startDateObj <= today) {
      readyStudents.push({
        name:      studentName,
        email:     row[TESTIMONIAL_CONFIG.COLS.EMAIL],
        phone:     row[TESTIMONIAL_CONFIG.COLS.PHONE] || '',
        startDate: Utilities.formatDate(startDateObj, Session.getScriptTimeZone(), 'MMM d, yyyy'),
        cohort:    row[TESTIMONIAL_CONFIG.COLS.COHORT_YEAR],
        rowNumber: index + 2
      });
    }
  });

  if (readyStudents.length === 0) {
    Logger.log('No students ready for testimonial outreach');
    return;
  }

  sendDigestEmail(readyStudents);
  Logger.log('Testimonial reminder sent for ' + readyStudents.length + ' students');
}

function sendDigestEmail(students) {
  const subject = 'Testimonial Outreach Ready: ' + students.length + ' student' + (students.length > 1 ? 's' : '');

  let studentListHTML = '';
  students.forEach(student => {
    studentListHTML += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${student.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <a href="mailto:${student.email}" style="color: #469E92;">${student.email}</a>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${student.phone}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${student.startDate}</td>
      </tr>`;
  });

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #469E92, #3a8178); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Testimonial Outreach Ready</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
          The following <strong>${students.length}</strong> student${students.length > 1 ? 's have' : ' has'} arrived on campus and ${students.length > 1 ? 'are' : 'is'} ready for testimonial outreach:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Name</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Email</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Phone</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Start Date</th>
            </tr>
          </thead>
          <tbody>${studentListHTML}</tbody>
        </table>
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin-top: 20px;">
          <p style="margin: 0; color: #0f766e; font-size: 14px; line-height: 1.5;">
            <strong>Next steps:</strong><br>
            1. Send each student the testimonial invitation email<br>
            2. Mark the date in the "Testimonial Invited" column (O) in Grant_Recipients<br>
            3. When they submit, add the URL and mark Release Signed / Gift Card Sent
          </p>
        </div>
      </div>
    </div>`;

  const textBody =
    `Testimonial Outreach Ready\n\n${students.length} student${students.length > 1 ? 's' : ''} ready for outreach:\n\n` +
    students.map(s => `- ${s.name} | ${s.email} | ${s.phone} | Started ${s.startDate}`).join('\n') +
    `\n\nNext steps:\n1. Send testimonial invitation email\n2. Mark Testimonial Invited column (O)\n3. Mark Release Signed / Gift Card Sent`;

  GmailApp.sendEmail(TESTIMONIAL_CONFIG.NOTIFICATION_EMAIL, subject, textBody, {
    htmlBody: htmlBody,
    name:     'Campus Ready Foundation'
  });
}

function sendTestimonialInvites() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');

  if (!sheet) { ui.alert('Error', 'Grant_Recipients sheet not found', ui.ButtonSet.OK); return; }

  const today            = new Date();
  const data             = sheet.getDataRange().getValues();
  const eligibleStudents = [];

  for (let i = 1; i < data.length; i++) {
    const row                = data[i];
    const studentName        = row[TESTIMONIAL_CONFIG.COLS.STUDENT_NAME];
    const email              = row[TESTIMONIAL_CONFIG.COLS.EMAIL];
    const startDate          = row[TESTIMONIAL_CONFIG.COLS.START_DATE];
    const itemsSelected      = row[TESTIMONIAL_CONFIG.COLS.ITEMS_SELECTED];
    const testimonialInvited = row[TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED];

    if (!studentName || !email || !startDate) continue;
    if (testimonialInvited) continue;
    if (itemsSelected !== 'Yes') continue;

    const startDateObj = new Date(startDate);
    if (startDateObj > today) continue;

    eligibleStudents.push({
      rowIndex:  i + 1,
      name:      studentName,
      firstName: studentName.split(' ')[0],
      email:     email,
      startDate: Utilities.formatDate(startDateObj, Session.getScriptTimeZone(), 'MMM d, yyyy')
    });
  }

  if (eligibleStudents.length === 0) {
    ui.alert('No Students Ready',
      'No students are currently eligible for testimonial invites.\n\n' +
      'Students need:\n• Start date passed\n• Items Selected = Yes\n• Testimonial Invited = blank',
      ui.ButtonSet.OK);
    return;
  }

  let confirmMessage = `Ready to send testimonial invites to ${eligibleStudents.length} student(s):\n\n`;
  eligibleStudents.forEach(s => { confirmMessage += `• ${s.name} (started ${s.startDate})\n`; });
  confirmMessage += '\nSend invites?';

  const response = ui.alert('Send Testimonial Invites', confirmMessage, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) { ui.alert('Cancelled', 'No invites were sent.', ui.ButtonSet.OK); return; }

  let successCount = 0;
  let failCount    = 0;
  const timestamp  = new Date();

  eligibleStudents.forEach(student => {
    try {
      sendTestimonialEmailToStudent(student);
      sheet.getRange(student.rowIndex, TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED + 1).setValue(timestamp);
      successCount++;
    } catch (error) {
      Logger.log(`Failed to send testimonial invite to ${student.email}: ${error}`);
      failCount++;
    }
  });

  let resultMessage = `Testimonial invites sent: ${successCount}`;
  if (failCount > 0) resultMessage += `\nFailed to send: ${failCount}`;
  resultMessage += '\n\nRemember to send SMS messages manually using the template in Testimonial_Templates tab.';
  ui.alert('Invites Sent', resultMessage, ui.ButtonSet.OK);
}

function sendTestimonialEmailToStudent(student) {
  const subject  = "You made it! How's it going?";
  const textBody =
`Hey ${student.firstName}!

Congratulations, you made it to campus! We hope move-in went smoothly and you're getting settled in.

We'd love to see how your space is coming together. If you're up for sharing a quick photo or short video of your setup, we'll send you a $50 Visa gift card as a thank-you.

This is completely optional. We may use what you share on our website or social media to show future students what Campus Ready support looks like.

If you'd like to participate:
- Reply to this email with a photo or short video attached
- A quick caption about your experience is welcome but not required

That's it! We'll get your gift card on the way.

Thanks for being part of Campus Ready. We're cheering you on!

Warmly,
The Campus Ready Team

P.S. No pressure at all—we're just glad you're there.

---
By replying with your photo or video, you grant Campus Ready Foundation permission to use it on our website, social media, and promotional materials. We may include your first name and college. We will never share your contact information.`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #469E92, #3a8178); padding: 32px; text-align: center;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; margin: 0; font-size: 30px; font-weight: 700;">You Made It!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">Hey ${student.firstName}!</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">Congratulations, you made it to campus! We hope move-in went smoothly and you're getting settled in.</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">We'd love to see how your space is coming together. If you're up for sharing a quick photo or short video of your setup, we'll send you a <strong>$50 Visa gift card</strong> as a thank-you.</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">This is completely optional. We may use what you share on our website or social media to show future students what Campus Ready support looks like.</p>
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #0f766e; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">If you'd like to participate:</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">Reply to this email with a photo or short video attached, and quick caption about your experience.</p>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">That's it! We'll get your gift card on the way.</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thanks for being part of Campus Ready. We're cheering you on!</p>
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px; margin: 0;">Warmly,</p>
        <p style="color: #374151; font-size: 16px; font-weight: 600; margin: 4px 0 0 0;">The Campus Ready Team</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; font-style: italic; margin-top: 24px;">P.S. No pressure at all—we're just glad you're there.</p>
    </div>
    <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">By replying with your photo or video, you grant Campus Ready Foundation permission to use it on our website, social media, and promotional materials. We may include your first name and college. We will never share your contact information.</p>
    </div>
  </div>
</body>
</html>`;

  GmailApp.sendEmail(student.email, subject, textBody, {
    htmlBody: htmlBody,
    name:     'Campus Ready Foundation',
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
  Logger.log(`Testimonial invite sent to ${student.email} (${student.name})`);
}

function testTestimonialEmail() {
  sendTestimonialEmailToStudent({ firstName: 'Eric', name: 'Eric Lilavois', email: 'elilavois@gmail.com' });
  Logger.log('Test email sent to elilavois@gmail.com');
}

function testTestimonialReminder() {
  sendTestimonialReminder();
}

function createTestimonialTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendTestimonialReminder') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('sendTestimonialReminder')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
  Logger.log('Trigger created: sendTestimonialReminder every Monday at 8am');
}
