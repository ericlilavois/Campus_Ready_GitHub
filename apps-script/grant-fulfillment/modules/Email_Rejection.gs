// ============================================
// REJECTION EMAIL SYSTEM
// Menu: Fulfillment Tools → Send Rejection Emails
// ============================================

function sendRejectionEmails() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');
  const ui    = SpreadsheetApp.getUi();

  if (!sheet) { ui.alert('Error', 'Grant_Recipients sheet not found', ui.ButtonSet.OK); return; }

  const data    = sheet.getDataRange().getValues();
  const colIndices = {
    studentName:     1,
    email:           2,
    housingStatus:   5,
    acceptanceStatus:7,
    emailSent:       11,
    rejectionCount:  12
  };

  const studentsToEmail = [];
  for (let i = 1; i < data.length; i++) {
    const row              = data[i];
    const housingStatus    = row[colIndices.housingStatus];
    const acceptanceStatus = row[colIndices.acceptanceStatus];
    const emailSent        = row[colIndices.emailSent];

    if ((housingStatus === 'Rejected' || acceptanceStatus === 'Rejected') && !emailSent) {
      studentsToEmail.push({
        rowIndex:             i + 1,
        name:                 row[colIndices.studentName],
        email:                row[colIndices.email],
        housingRejected:      housingStatus === 'Rejected',
        acceptanceRejected:   acceptanceStatus === 'Rejected',
        currentRejectionCount:row[colIndices.rejectionCount] || 0
      });
    }
  }

  if (studentsToEmail.length === 0) {
    ui.alert('No Emails to Send', 'All students with rejected documents have already been emailed.', ui.ButtonSet.OK);
    return;
  }

  let confirmMessage = `Ready to send rejection emails to ${studentsToEmail.length} student(s):\n\n`;
  studentsToEmail.forEach(student => {
    let reason = student.housingRejected && student.acceptanceRejected
      ? 'Both documents rejected'
      : student.housingRejected ? 'Housing rejected' : 'Acceptance rejected';
    const countInfo = student.currentRejectionCount > 0 ? ` [Rejection #${student.currentRejectionCount + 1}]` : '';
    confirmMessage += `• ${student.name} (${reason})${countInfo}\n`;
  });
  confirmMessage += '\nDo you want to send these emails?';

  const response = ui.alert('Send Rejection Emails', confirmMessage, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) { ui.alert('Cancelled', 'No emails were sent.', ui.ButtonSet.OK); return; }

  let successCount = 0;
  let failCount    = 0;
  const timestamp  = new Date();

  studentsToEmail.forEach(student => {
    try {
      sendRejectionEmailToStudent(student);
      sheet.getRange(student.rowIndex, colIndices.emailSent + 1).setValue(timestamp);
      sheet.getRange(student.rowIndex, colIndices.rejectionCount + 1).setValue(student.currentRejectionCount + 1);
      successCount++;
    } catch (error) {
      Logger.log(`Failed to send email to ${student.email}: ${error}`);
      failCount++;
    }
  });

  let resultMessage = `Emails sent successfully: ${successCount}`;
  if (failCount > 0) resultMessage += `\nFailed to send: ${failCount}`;
  ui.alert('Email Results', resultMessage, ui.ButtonSet.OK);
}

function sendRejectionEmailToStudent(student) {
  const formUrl = 'https://ericlilavois.github.io/Campus_Ready_Grant_Fulfillment/Customize_Your_Kit.html';

  let documentSection = '';
  if (student.housingRejected && student.acceptanceRejected) {
    documentSection = `We need clearer copies of both your housing verification and college acceptance letter.

For your housing verification, this could be:
- Official housing assignment letter from your college
- Signed housing contract
- Dorm assignment confirmation email

For your acceptance letter, this could be:
- Official acceptance letter from the admissions office
- Enrollment confirmation letter
- Official email confirming your admission`;
  } else if (student.housingRejected) {
    documentSection = `We need a clearer copy of your housing contract or dorm assignment. This could be:
- Official housing assignment letter from your college
- Signed housing contract
- Dorm assignment confirmation email`;
  } else {
    documentSection = `We need a clearer copy of your college acceptance letter. This could be:
- Official acceptance letter from the admissions office
- Enrollment confirmation letter
- Official email confirming your admission`;
  }

  const emailBody = `Hi ${student.name},

We've reviewed the documents you submitted for your Campus Ready grant, and we need just a bit more from you to move forward.

${documentSection}

Please make sure your document:
✓ Is a clear, readable PDF or photo
✓ Shows your name and the college name clearly
✓ Includes the specific confirmation we need (housing assignment or acceptance)

No worries if you don't have the perfect document yet - many students are still waiting on official paperwork. You can come back to the form anytime with updated documents.

Your grant is still reserved for you. We just need this verification to move forward with customizing and delivering your kit.

Ready to resubmit? Use the same link: ${formUrl}

Questions or need help? We're here:
hello@campusready.com

You've got this!

The Campus Ready Team`;

  GmailApp.sendEmail(student.email, 'Campus Ready Grant - Quick Document Update Needed', emailBody, {
    name:    'Campus Ready Foundation',
    from:    'hello@campusready.org',
    replyTo: 'hello@campusready.org'
  });

  Logger.log(`Rejection email sent to ${student.email} (${student.name})`);
}
