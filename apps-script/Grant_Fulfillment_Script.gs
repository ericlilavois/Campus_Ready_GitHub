// TEST FUNCTION - Run this once to authorize Drive access
function authorizeDrive() {
  try {
    const folder = DriveApp.getFolderById('1ccJ8lg40PTgMFIXdNoXyHU12ySgSnurf');
    Logger.log('Folder name: ' + folder.getName());
    return 'Authorization successful!';
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return error.toString();
  }
}
// === Campus Ready Fulfillment Script v2.1 ===
// Last updated: Nov 3, 2025
// Enhancements: Auto-tagging, Resolver inheritance, Filtered Shopping List, Archive Cohort
// ============================================
// WEB FORM SUBMISSION HANDLER (for HTML Form)
// ============================================
// ============================================
// EMAIL VALIDATION HANDLER
// ============================================

/**
 * Check student status by email
 * Called from Customize Your Kit form via Vercel proxy
 * @param {string} email - Student's email address
 * @returns {Object} Student status and information
 */
function checkStudentStatus(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');

  if (!sheet) {
    return {
      status: 'error',
      message: 'Grant_Recipients sheet not found'
    };
  }

  const data = sheet.getDataRange().getValues();

  // Search for email in column C (index 2)
  for (let i = 1; i < data.length; i++) { // Start at 1 to skip header row
    if (data[i][2] && data[i][2].toString().toLowerCase() === email.toLowerCase()) {
      return {
        status: 'found',
        applicationId: data[i][0],                    // Column A
        studentName: data[i][1],                      // Column B
        email: data[i][2],                            // Column C
        cohortYear: data[i][3],                       // Column D
        housingStatus: data[i][5] || 'Pending',       // Column F
        acceptanceStatus: data[i][7] || 'Pending',    // Column H
        collegeName: data[i][19] || '',               // Column T
        collegeUnitId: data[i][20] ? data[i][20].toString() : ''  // Column U (as text)
      };
    }
  }

  // Email not found
  return {
    status: 'not_found'
  };
}
/**
 * Upload documents to Google Drive and update Grant_Recipients
 * @param {string} email - Student's email
 * @param {string} applicationId - Student's application ID
 * @param {Object} housingFile - Housing document {name, data}
 * @param {Object} acceptanceFile - Acceptance document {name, data}
 * @returns {Object} Upload status and URLs
 */
function uploadDocuments(email, applicationId, housingFile, acceptanceFile) {
  try {
    // === VALIDATION ===
    Logger.log('=== UPLOAD DOCUMENTS CALLED ===');
    Logger.log('Email: ' + email);
    Logger.log('Application ID: ' + applicationId);

    // Validate email and applicationId
    if (!email || !applicationId) {
      Logger.log('ERROR: Missing email or applicationId');
      return {
        status: 'error',
        message: 'Missing required parameters: email or applicationId'
      };
    }

    // Validate housingFile
    if (!housingFile) {
      Logger.log('ERROR: housingFile is null or undefined');
      return {
        status: 'error',
        message: 'Housing file is missing'
      };
    }

    if (!housingFile.name) {
      Logger.log('ERROR: housingFile.name is missing');
      return {
        status: 'error',
        message: 'Housing file name is missing'
      };
    }

    if (!housingFile.data) {
      Logger.log('ERROR: housingFile.data is null or undefined');
      Logger.log('housingFile object: ' + JSON.stringify(housingFile));
      return {
        status: 'error',
        message: 'Housing file data is missing'
      };
    }

    if (typeof housingFile.data !== 'string') {
      Logger.log('ERROR: housingFile.data is not a string, type: ' + typeof housingFile.data);
      return {
        status: 'error',
        message: 'Housing file data is not in correct format'
      };
    }

    if (housingFile.data.length === 0) {
      Logger.log('ERROR: housingFile.data is empty string');
      return {
        status: 'error',
        message: 'Housing file data is empty'
      };
    }

    // Validate acceptanceFile
    if (!acceptanceFile) {
      Logger.log('ERROR: acceptanceFile is null or undefined');
      return {
        status: 'error',
        message: 'Acceptance file is missing'
      };
    }

    if (!acceptanceFile.name) {
      Logger.log('ERROR: acceptanceFile.name is missing');
      return {
        status: 'error',
        message: 'Acceptance file name is missing'
      };
    }

    if (!acceptanceFile.data) {
      Logger.log('ERROR: acceptanceFile.data is null or undefined');
      Logger.log('acceptanceFile object: ' + JSON.stringify(acceptanceFile));
      return {
        status: 'error',
        message: 'Acceptance file data is missing'
      };
    }

    if (typeof acceptanceFile.data !== 'string') {
      Logger.log('ERROR: acceptanceFile.data is not a string, type: ' + typeof acceptanceFile.data);
      return {
        status: 'error',
        message: 'Acceptance file data is not in correct format'
      };
    }

    if (acceptanceFile.data.length === 0) {
      Logger.log('ERROR: acceptanceFile.data is empty string');
      return {
        status: 'error',
        message: 'Acceptance file data is empty'
      };
    }

    Logger.log('Validation passed - proceeding with upload');
    Logger.log('Housing file name: ' + housingFile.name + ', data length: ' + housingFile.data.length);
    Logger.log('Acceptance file name: ' + acceptanceFile.name + ', data length: ' + acceptanceFile.data.length);

    // === UPLOAD TO DRIVE ===
    const DRIVE_FOLDER_ID = '1ccJ8lg40PTgMFIXdNoXyHU12ySgSnurf';
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    Logger.log('Drive folder accessed: ' + folder.getName());

    // Decode base64 and create files
    Logger.log('Decoding housing file...');
    const housingBlob = Utilities.newBlob(
      Utilities.base64Decode(housingFile.data),
      getMimeType(housingFile.name),
      applicationId + '_Housing.pdf'
    );
    Logger.log('Housing blob created');

    Logger.log('Decoding acceptance file...');
    const acceptanceBlob = Utilities.newBlob(
      Utilities.base64Decode(acceptanceFile.data),
      getMimeType(acceptanceFile.name),
      applicationId + '_Acceptance.pdf'
    );
    Logger.log('Acceptance blob created');

    // Upload to Drive
    Logger.log('Uploading housing file to Drive...');
    const housingDriveFile = folder.createFile(housingBlob);
    Logger.log('Housing file uploaded, ID: ' + housingDriveFile.getId());

    Logger.log('Uploading acceptance file to Drive...');
    const acceptanceDriveFile = folder.createFile(acceptanceBlob);
    Logger.log('Acceptance file uploaded, ID: ' + acceptanceDriveFile.getId());

    // Set sharing permissions (try, but don't fail if org restrictions prevent it)
    try {
      housingDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      acceptanceDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      Logger.log('Sharing permissions set to ANYONE_WITH_LINK');
    } catch (sharingError) {
      Logger.log('Warning: Could not set sharing to ANYONE_WITH_LINK: ' + sharingError.message);
      Logger.log('Files are uploaded but may require folder permissions for access');
    }

    // Get shareable URLs
    const housingUrl = housingDriveFile.getUrl();
    const acceptanceUrl = acceptanceDriveFile.getUrl();
    Logger.log('Housing URL: ' + housingUrl);
    Logger.log('Acceptance URL: ' + acceptanceUrl);

    // === UPDATE GRANT_RECIPIENTS ===
    Logger.log('Updating Grant_Recipients spreadsheet...');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Grant_Recipients');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] && data[i][2].toString().toLowerCase() === email.toLowerCase()) {
        Logger.log('Found student at row ' + (i + 1));
        sheet.getRange(i + 1, 6).setValue('Uploaded');  // Housing Status (Column F)
        sheet.getRange(i + 1, 7).setValue(housingUrl);   // Housing Doc URL (Column G)
        sheet.getRange(i + 1, 8).setValue('Uploaded');   // Acceptance Status (Column H)
        sheet.getRange(i + 1, 9).setValue(acceptanceUrl); // Acceptance Doc URL (Column I)
        // Clear rejection tracking on resubmission
        sheet.getRange(i + 1, 12).setValue('');  // Clear Column L (Rejection Email Sent)
        Logger.log('Spreadsheet updated successfully');
        break;
      }
    }

    Logger.log('=== UPLOAD COMPLETE ===');
    return {
      status: 'success',
      housingUrl: housingUrl,
      acceptanceUrl: acceptanceUrl
    };

  } catch (error) {
    Logger.log('=== UPLOAD ERROR ===');
    Logger.log('Error message: ' + error.message);
    Logger.log('Error stack: ' + error.stack);
    Logger.log('Error toString: ' + error.toString());
    return {
      status: 'error',
      message: 'Upload failed: ' + error.message
    };
  }
}

function getMimeType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
/**
 * Receives form submissions from the HTML Customize Your Kit form
 * @param {Object} e - The POST request object
 */
// ============================================
// REJECTION EMAIL SYSTEM - Added Nov 17, 2025
// Version: Option C - Two-Column Tracking
// ============================================

/**
 * Install triggers for automatic tracking
 * Called from onOpen()
 */
function installTriggers() {
  // Remove existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onGrantRecipientsEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Install edit trigger for Grant_Recipients sheet
  ScriptApp.newTrigger('onGrantRecipientsEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}
/**
 * Handle edits to Grant_Recipients sheet
 * Clears Column L when status changes to "Approved"
 */
function onGrantRecipientsEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();

    // Only process edits to Grant_Recipients sheet
    if (sheet.getName() !== 'Grant_Recipients') {
      return;
    }

    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    // Only process edits to columns F (6) or H (8) - the status columns
    if (col !== 6 && col !== 8) {
      return;
    }

    // Get the new value
    const newValue = range.getValue();

    // If status changed to "Approved", clear Column L for this row
    if (newValue === 'Approved') {
      // Check if BOTH statuses are approved before clearing
      const housingStatus = sheet.getRange(row, 6).getValue();
      const acceptanceStatus = sheet.getRange(row, 8).getValue();

      if (housingStatus === 'Approved' && acceptanceStatus === 'Approved') {
        sheet.getRange(row, 12).setValue('');  // Clear Column L
        Logger.log(`Cleared rejection email timestamp for row ${row} - both documents approved`);
      }
    }
  } catch (error) {
    Logger.log('Error in onGrantRecipientsEdit: ' + error);
  }
}
/**
 * Send rejection emails to students whose documents were rejected
 * Shows confirmation dialog before sending
 */
function sendRejectionEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error', 'Grant_Recipients sheet not found', ui.ButtonSet.OK);
    return;
  }

  // Get all data
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find column indices
  const colIndices = {
    studentName: 1,      // Column B
    email: 2,            // Column C
    housingStatus: 5,    // Column F
    acceptanceStatus: 7, // Column H
    emailSent: 11,       // Column L (Rejection Email Sent)
    rejectionCount: 12   // Column M (Rejection Count)
  };

  // Find students who need rejection emails
  const studentsToEmail = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const housingStatus = row[colIndices.housingStatus];
    const acceptanceStatus = row[colIndices.acceptanceStatus];
    const emailSent = row[colIndices.emailSent];

    // Check if either document is rejected AND email not yet sent
    if ((housingStatus === 'Rejected' || acceptanceStatus === 'Rejected') && !emailSent) {
      const currentCount = row[colIndices.rejectionCount] || 0;

      studentsToEmail.push({
        rowIndex: i + 1, // +1 because sheet rows are 1-indexed
        name: row[colIndices.studentName],
        email: row[colIndices.email],
        housingRejected: housingStatus === 'Rejected',
        acceptanceRejected: acceptanceStatus === 'Rejected',
        currentRejectionCount: currentCount
      });
    }
  }

  // If no students need emails, inform and exit
  if (studentsToEmail.length === 0) {
    ui.alert(
      'No Emails to Send',
      'All students with rejected documents have already been emailed.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Build confirmation message
  let confirmMessage = `Ready to send rejection emails to ${studentsToEmail.length} student(s):\n\n`;

  studentsToEmail.forEach(student => {
    let reason = '';
    if (student.housingRejected && student.acceptanceRejected) {
      reason = 'Both documents rejected';
    } else if (student.housingRejected) {
      reason = 'Housing rejected';
    } else {
      reason = 'Acceptance rejected';
    }

    // Show rejection count if > 0
    const countInfo = student.currentRejectionCount > 0
      ? ` [Rejection #${student.currentRejectionCount + 1}]`
      : '';

    confirmMessage += `• ${student.name} (${reason})${countInfo}\n`;
  });

  confirmMessage += '\nDo you want to send these emails?';

  // Show confirmation dialog
  const response = ui.alert(
    'Send Rejection Emails',
    confirmMessage,
    ui.ButtonSet.YES_NO
  );

  // If user cancels, exit
  if (response !== ui.Button.YES) {
    ui.alert('Cancelled', 'No emails were sent.', ui.ButtonSet.OK);
    return;
  }

  // Send emails and track results
  let successCount = 0;
  let failCount = 0;
  const timestamp = new Date();

  studentsToEmail.forEach(student => {
    try {
      sendRejectionEmailToStudent(student);

      // Mark email as sent and increment rejection count
      sheet.getRange(student.rowIndex, colIndices.emailSent + 1).setValue(timestamp);
      sheet.getRange(student.rowIndex, colIndices.rejectionCount + 1).setValue(student.currentRejectionCount + 1);

      successCount++;
    } catch (error) {
      Logger.log(`Failed to send email to ${student.email}: ${error}`);
      failCount++;
    }
  });

  // Show results
  let resultMessage = `Emails sent successfully: ${successCount}`;
  if (failCount > 0) {
    resultMessage += `\nFailed to send: ${failCount}`;
  }

  ui.alert('Email Results', resultMessage, ui.ButtonSet.OK);
}

/**
 * Send rejection email to individual student
 * @param {Object} student - Student object with name, email, and rejection reasons
 */
function sendRejectionEmailToStudent(student) {
  const subject = 'Campus Ready Grant - Quick Document Update Needed';
  const formUrl = 'https://ericlilavois.github.io/Campus_Ready_Grant_Fulfillment/Customize_Your_Kit.html';

  // Build email body based on what was rejected
  let documentSection = '';

  if (student.housingRejected && student.acceptanceRejected) {
    // Both documents rejected
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
    // Only housing rejected
    documentSection = `We need a clearer copy of your housing contract or dorm assignment. This could be:
- Official housing assignment letter from your college
- Signed housing contract
- Dorm assignment confirmation email`;
  } else {
    // Only acceptance rejected
    documentSection = `We need a clearer copy of your college acceptance letter. This could be:
- Official acceptance letter from the admissions office
- Enrollment confirmation letter
- Official email confirming your admission`;
  }

  // Build full email body
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

  // Send email
  GmailApp.sendEmail(
    student.email,
    subject,
    emailBody,
    {
      name: 'Campus Ready Foundation',
      replyTo: 'hello@campusready.com'
    }
  );

  Logger.log(`Rejection email sent to ${student.email} (${student.name})`);
}

// === END REJECTION EMAIL SYSTEM ===
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    // Route based on action type
    if (data.action === 'checkStudentStatus') {
      const result = checkStudentStatus(data.email);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Route uploadDocuments requests
    if (data.action === 'uploadDocuments') {
      const result = uploadDocuments(data.email, data.applicationId, data.housingFile, data.acceptanceFile);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // If no action specified, assume it's a form submission (existing behavior)

    // Get the active spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create the "Student Selections" sheet
    let sheet = ss.getSheetByName('Student_Selections');

    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = ss.insertSheet('Student_Selections');

      // Set up headers
      const headers = [
        'Timestamp',
        'Student Name',
        'Email Address',
        'Shipping Preference (home or college)',
        'Street Address',
        'Street Address 2',
        'City',
        'State',
        'Zip Code',
        'Gender Preference',
        'Scent Preference',
        'Deodorant Type',
        'Style Preference',
        'Bedding Color',
        'Pillow Firmness',
        'Towel Color',
        'Slides Size',
        'data_type',
        'cohort_year',
        'Comforter Cover Color',
        'Slides Color',
        'College Name',
        'College Unit ID'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format header row
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#469E92')
        .setFontColor('#FFFFFF');

      // Freeze header row
      sheet.setFrozenRows(1);
    }

    // Prepare the row data in the exact order of headers
    const rowData = [
(() => {
  const rawDate = new Date();
  return rawDate.getFullYear() + '-' +
    String(rawDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(rawDate.getDate()).padStart(2, '0') + ' ' +
    String(rawDate.getHours()).padStart(2, '0') + ':' +
    String(rawDate.getMinutes()).padStart(2, '0');
})(),
      data.student_name || '',
      data.email || '',
      data.shipping_preference || '',
      data.street_address || '',
      data.street_address_2 || '',
      data.city || '',
      data.state || '',
      data.zip || '',
      data.gender_preference || '',
      data.scent_preference || '',
      data.deodorant_type || '',
      data.style_preference || '',
      data.bedding_color || '',
      data.pillow_firmness || '',
      data.towel_color || '',
      data.slides_size || ''
    ];
// === BEGIN MOD v2.2 - Pull cohort_year from Grant_Recipients Nov 17, 2025 ===
    // Look up student's cohort year from Grant_Recipients (not from timestamp)
    const studentEmail = data.email;
    let cohortYear = new Date().getFullYear(); // Default fallback
    let grantRecipientsRowIndex = null;

    const grantRecipientsSheet = ss.getSheetByName('Grant_Recipients');
    if (grantRecipientsSheet) {
      const grantRecipientsData = grantRecipientsSheet.getDataRange().getValues();

      // Find student by email (Column C, index 2)
      for (let i = 1; i < grantRecipientsData.length; i++) {
        if (grantRecipientsData[i][2] &&
            grantRecipientsData[i][2].toString().toLowerCase() === studentEmail.toLowerCase()) {
          cohortYear = grantRecipientsData[i][3] || cohortYear; // Column D (Cohort Year)
          grantRecipientsRowIndex = i + 1; // Store row number for later update
          Logger.log(`Found student in Grant_Recipients: cohort_year = ${cohortYear}`);
          break;
        }
      }

      if (!grantRecipientsRowIndex) {
        Logger.log(`Warning: Student ${studentEmail} not found in Grant_Recipients. Using default year ${cohortYear}`);
      }
    } else {
      Logger.log('Warning: Grant_Recipients sheet not found. Using default year.');
    }

    // Append tagging and new kit form columns
    rowData.push("Live");                           // data_type
    rowData.push(cohortYear);                       // cohort_year
    // === BEGIN MOD v2.3 - New kit form fields May 2026 ===
    rowData.push(data.comforter_cover_color || ''); // Comforter Cover Color
    rowData.push(data.slides_color || '');          // Slides Color
    rowData.push(data.college_name || '');          // College Name
    rowData.push(data.college_unit_id || '');       // College Unit ID
    // === END MOD v2.3 ===
    // === END MOD v2.2 ===

    // Append the data to the sheet
    sheet.appendRow(rowData);

    // ============================================
    // NEW: Automatically process this submission
    // ============================================
    try {
      processLatestSubmission(ss);
      Logger.log('✅ Resolver processing completed for new submission');
    } catch (resolverError) {
      Logger.log('⚠️ Warning: Resolver failed but form data was saved');
      Logger.log(resolverError.message);
      // Continue - don't fail the form submission if resolver has issues
    }
    // === BEGIN MOD v2.2 - Update Grant_Recipients on form submission Nov 17, 2025 ===
    // Update Grant_Recipients to mark Items Selected = Yes and add Submission Timestamp
    if (grantRecipientsRowIndex && grantRecipientsSheet) {
      try {
        const submissionTimestamp = Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          'yyyy-MM-dd HH:mm:ss'
        );

        grantRecipientsSheet.getRange(grantRecipientsRowIndex, 10).setValue('Yes'); // Column J - Items Selected
        grantRecipientsSheet.getRange(grantRecipientsRowIndex, 11).setValue(submissionTimestamp); // Column K - Submission Timestamp

        Logger.log(`Updated Grant_Recipients row ${grantRecipientsRowIndex}: Items Selected = Yes, Timestamp = ${submissionTimestamp}`);
      } catch (updateError) {
        Logger.log('Warning: Failed to update Grant_Recipients: ' + updateError.message);
        // Don't fail the submission if this update fails
      }
    }
    // === END MOD v2.2 ===
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'message': 'Form submitted successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log the error
    console.error('Error processing form submission:', error);

    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'error',
        'message': error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// NEW FUNCTION: Process Latest Submission
// ============================================

/**
 * Processes the most recent submission from Student Selections
 * and writes resolved products to Resolver sheet
 * @param {Spreadsheet} ss - The active spreadsheet (optional)
 */
function processLatestSubmission(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  Logger.log('=== PROCESSING LATEST SUBMISSION ===');

  // Load Product Logic data
  let logicData;
  try {
    logicData = loadLogicTable(ss);
    Logger.log(`✅ Loaded ${logicData.length} products from Product_Logic sheet`);
  } catch (error) {
    Logger.log(`❌ CRITICAL ERROR: Failed to load Product_Logic sheet`);
    Logger.log(error.message);
    throw error;
  }

  // Get the most recent row from Student Selections
  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet) {
    throw new Error('Student Selections sheet not found');
  }

  const lastRow = selectionsSheet.getLastRow();
  if (lastRow < 2) {
    throw new Error('No data in Student Selections sheet');
  }

  // Get headers and the latest data row
  const headers = selectionsSheet.getRange(1, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];
  const latestRowData = selectionsSheet.getRange(lastRow, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];

  // Create header map
  const headerMap = {};
  headers.forEach((h, i) => headerMap[h] = i);

  // Extract student choices from the latest row
  const studentChoices = {
    Timestamp: latestRowData[headerMap['Timestamp']] || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    StudentName: latestRowData[headerMap['Student Name']] || '',
    Email: latestRowData[headerMap['Email Address']] || '',
    Gender: (latestRowData[headerMap['Gender Preference']] || '').toString().trim(),
    Scent: latestRowData[headerMap['Scent Preference']] || '',
    DeodorantType: latestRowData[headerMap['Deodorant Type']] || '',
    BeddingColor: latestRowData[headerMap['Bedding Color']] || '',
    PillowFirmness: latestRowData[headerMap['Pillow Firmness']] || '',
    TowelColor: latestRowData[headerMap['Towel Color']] || '',
    Style: latestRowData[headerMap['Style Preference']] || '',
    SlidesSize: latestRowData[headerMap['Slides Size']] || '',
    ShippingPref: latestRowData[headerMap['Shipping Preference (home or college)']] || '',
    Street: latestRowData[headerMap['Street Address']] || '',
    City: latestRowData[headerMap['City']] || '',
    State: latestRowData[headerMap['State']] || '',
    Zip: latestRowData[headerMap['Zip Code']] || '',
    DataType: latestRowData[headerMap['data_type']] || 'Live',
    CohortYear: latestRowData[headerMap['cohort_year']] || new Date().getFullYear(),
    // === BEGIN MOD v2.3 ===
    ComforterCoverColor: latestRowData[headerMap['Comforter Cover Color']] || '',
    SlidesColor: latestRowData[headerMap['Slides Color']] || '',
    CollegeName: latestRowData[headerMap['College Name']] || '',
    CollegeUnitId: latestRowData[headerMap['College Unit ID']] || '',
    // === END MOD v2.3 ===
  };

  Logger.log(`Processing submission for: ${studentChoices.StudentName}`);

  // Apply resolver logic to match products
  const resolvedProducts = applyResolverLogic(studentChoices, logicData);

  // Write results to Resolver sheet
  writeResolvedProducts(ss, resolvedProducts);

  Logger.log(`✅ Processed ${resolvedProducts.length} product matches for ${studentChoices.StudentName}`);
}

// ============================================
// REMOVED: Old Google Forms Trigger
// ============================================
// The onFormSubmit(e) function has been removed as it was designed
// for Google Forms event objects. The new processLatestSubmission()
// function handles HTML form submissions instead.

// ============================================
// MENU FUNCTION
// ============================================

function onOpen() {
  SpreadsheetApp.getUi()
  .createMenu('Fulfillment Tools')
  .addItem('Rebuild Product Logic', 'rebuildProductLogic')
  .addSeparator()
  .addItem('Generate Shopping List', 'generateShoppingList')
  .addItem('Send Rejection Emails', 'sendRejectionEmails')
  .addItem('Send Testimonial Invites', 'sendTestimonialInvites')
  .addSeparator()
  .addItem('Preview Archive Cohort', 'previewArchiveCohort')
  .addItem('Archive Cohort', 'archiveCohort')
  .addToUi();
}

// ============================================================
// REBUILD PRODUCT LOGIC
// Reads each PL_* source tab by header name and writes to
// Product_Logic by header name. Column order in source tabs
// doesn't matter — IMAGE URL and any other extra columns are
// simply ignored if they have no matching header in Product_Logic.
//
// Run from: Fulfillment Tools → Rebuild Product Logic
// Run whenever you add or change products in any PL_* tab.
// This replaces the SORT/QUERY formula that was previously
// in Product_Logic cell A2.
// ============================================================
function rebuildProductLogic() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const SOURCE_TABS = [
    'Bedding',
    'Pillows',
    'Towels',
    'Accessories',
    'Universal Products',
    'Personal_Care'
  ];

  // ── Get Product_Logic and its header row ──────────────────
  const plSheet = ss.getSheetByName('Product_Logic');
  if (!plSheet) {
    ui.alert('Error', 'Product_Logic tab not found.', ui.ButtonSet.OK);
    return;
  }

  const plLastCol  = plSheet.getLastColumn();
  const plHeaders  = plSheet.getRange(1, 1, 1, plLastCol).getValues()[0]
                      .map(h => h.toString().trim());
  const numPlCols  = plHeaders.length;

  // ── Collect rows from all source tabs ────────────────────
  const allRows    = [];
  const skipped    = [];
  let   productIdCounter = 1; // Auto-generated sequential Product ID

  for (const tabName of SOURCE_TABS) {
    const src = ss.getSheetByName(tabName);
    if (!src) { skipped.push(tabName); continue; }

    // Use getDataRange() which respects actual data bounds and ignores
    // formula-inflated empty rows that would cause a Service error.
    let dataRange;
    try {
      dataRange = src.getDataRange();
    } catch(e) {
      Logger.log(`Could not read ${tabName}: ${e.message}`);
      skipped.push(tabName + ' (read error)');
      continue;
    }

    if (dataRange.getNumRows() < 2 || dataRange.getNumColumns() < 1) continue;

    const data       = dataRange.getValues();
    const srcHeaders = data[0].map(h => h.toString().trim());

    // Map: header name → column index in this source tab
    const srcIdx = {};
    srcHeaders.forEach((h, i) => { if (h) srcIdx[h] = i; });

    for (let r = 1; r < data.length; r++) {
      const row = data[r];

      // Skip blank rows (PRODUCT TYPE empty)
      const productType = (srcIdx['PRODUCT TYPE'] !== undefined)
        ? row[srcIdx['PRODUCT TYPE']] : '';
      if (!productType || productType.toString().trim() === '') continue;

      // Build a row aligned to Product_Logic's column structure.
      // Product ID is not in the raw source tabs (it was auto-generated by
      // the old PL_* ARRAYFORMULA), so we generate it sequentially here.
      const newRow = plHeaders.map(header => {
        if (!header) return '';
        if (header === 'Product ID') return productIdCounter;
        const i = srcIdx[header];
        return (i !== undefined && row[i] !== undefined) ? row[i] : '';
      });

      allRows.push(newRow);
      productIdCounter++;
    }
  }

  if (allRows.length === 0) {
    ui.alert(
      'Nothing to write',
      'No valid product rows found in source tabs. Product_Logic was not changed.',
      ui.ButtonSet.OK
    );
    return;
  }

  // ── Sort by PRODUCT TYPE ascending ───────────────────────
  const sortCol = plHeaders.indexOf('PRODUCT TYPE');
  allRows.sort((a, b) => {
    const ta = (a[sortCol] || '').toString().toLowerCase();
    const tb = (b[sortCol] || '').toString().toLowerCase();
    return ta.localeCompare(tb);
  });

  // ── Clear existing data in Product_Logic (keep row 1) ────
  const existingRows = plSheet.getLastRow();
  if (existingRows > 1) {
    plSheet.getRange(2, 1, existingRows - 1, numPlCols).clearContent();
  }

  // ── Write to Product_Logic ────────────────────────────────
  plSheet.getRange(2, 1, allRows.length, numPlCols).setValues(allRows);

  // ── Report ────────────────────────────────────────────────
  let msg = `Product_Logic rebuilt with ${allRows.length} product rows from ${SOURCE_TABS.length - skipped.length} tab(s).`;
  if (skipped.length > 0) {
    msg += `\n\nTab(s) not found and skipped:\n• ${skipped.join('\n• ')}`;
  }
  ui.alert('Done', msg, ui.ButtonSet.OK);
  Logger.log(msg);
}

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const Resolver_Logic = 'Resolver';
const LOGIC_SHEET_NAME = 'Product_Logic';
const FORM_RESPONSE_SHEET_NAME = 'Student_Selections';

// Form Headers (from HTML Form submissions)
const FORM_HEADERS = {
  'TIMESTAMP': 'Date Submitted',         // ← Now matches doPost header
  'STUDENT_NAME': 'Student Name',
  'EMAIL': 'Email Address',
  'GENDER': 'Gender Preference',
  'SCENT': 'Scent Preference',
  'DEODORANT_TYPE': 'Deodorant Type',
  'BEDDING_COLOR': 'Bedding Color',
  'PILLOW_FIRMNESS': 'Pillow Firmness',
  'TOWEL_COLOR': 'Towel Color',
  'STYLE': 'Style Preference',
  'SLIDES_SIZE': 'Slides Size',
  'SHIPPING_PREF': 'Shipping Preference',
  'STREET': 'Street Address',
  'CITY': 'City',
  'STATE': 'State',
  'ZIP': 'Zip Code'
};

// Product Logic Sheet Headers (matching actual sheet structure)
const LOGIC_HEADERS = {
  // Criteria columns
  'GENDER_CRIT': 'GENDER',
  'SCENT_CRIT': 'SCENT',
  'CHOICE_FIELD': 'CHOICE FIELD',
  // Output columns
  'PRODUCT_TYPE': 'PRODUCT TYPE',
  'RETAILER': 'PRIMARY RETAILER',
  'SKU': 'PRIMARY SKU',
  'PRODUCT_NAME': 'PRODUCT',
  'URL': 'PRIMARY URL',
  'PRICE': 'PRIMARY PRICE',
  'QTY': 'QTY PER STUDENT',
  'EMAIL_OUT': 'Student Email',
  'NAME_OUT': 'Student Name',
  'PRODUCT_ID': 'Product ID'
};

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

/**
 * Loads and processes the Product Logic table into an array of objects
 * @param {Spreadsheet} ss - The active spreadsheet
 * @returns {Array<Object>} Array of product objects with all criteria fields
 */
function loadLogicTable(ss) {
  const logicSheet = ss.getSheetByName(LOGIC_SHEET_NAME);
  if (!logicSheet) {
    throw new Error(`Sheet '${LOGIC_SHEET_NAME}' not found. Please verify the tab exists.`);
  }

  const lastRow = logicSheet.getLastRow();
  if (lastRow < 2) {
    throw new Error(`Sheet '${LOGIC_SHEET_NAME}' has no data rows.`);
  }

  // Get all data excluding header row
  const dataRange = logicSheet.getRange(2, 1, lastRow - 1, logicSheet.getLastColumn());
  const dataValues = dataRange.getValues();
  const headers = logicSheet.getRange(1, 1, 1, logicSheet.getLastColumn()).getValues()[0];

  // Create header map for column lookups
  const headerMap = {};
  headers.forEach((h, i) => headerMap[h] = i);

  // Validate required headers
const requiredHeaders = ['PRODUCT TYPE', 'Product ID', 'GENDER', 'SCENT', 'CHOICE FIELD'];
requiredHeaders.forEach(h => {
  if (!(h in headerMap)) {
    throw new Error(`Missing required column in Product_Logic: '${h}'`);
  }
});

  // Build product objects
  const logicMap = [];
  for (let i = 0; i < dataValues.length; i++) {
    const row = dataValues[i];
    const product = {};

    // Map all columns
    Object.keys(LOGIC_HEADERS).forEach(key => {
      const colName = LOGIC_HEADERS[key];
      product[key] = row[headerMap[colName]] || '';
    });

    // Only include products with a valid Product ID
    if (product.PRODUCT_ID) {
      logicMap.push(product);
    }
  }

  return logicMap;
}

/**
 * Extracts form data from a Google Form submission event
 * NOTE: This function is kept for backwards compatibility but is no longer used
 * @param {Object} e - The form submission event
 * @returns {Object} Standardized student choices object
 */
function extractFormData(e) {
  // This function is deprecated - use processLatestSubmission instead
  Logger.log('⚠️ extractFormData is deprecated');
  return null;
}

// ============================================
// RESOLVER LOGIC
// ============================================

/**
 * Applies matching logic to find products for a student
 * @param {Object} studentChoices - The student's preferences
 * @param {Array<Object>} logicData - The product logic table
 * @returns {Array<Array>} Array of matched product rows
 */
function applyResolverLogic(studentChoices, logicData) {
  Logger.log('\n=== APPLYING RESOLVER LOGIC ===');
  Logger.log(`Student: ${studentChoices.StudentName}`);
  Logger.log(`Gender: ${studentChoices.Gender}`);
  Logger.log(`Scent: ${studentChoices.Scent}`);

  const outputRows = [];

  // Translate gender values for matching (Male→Men, Female→Women)
  const genderMap = {
    'Male': 'Men',
    'Female': 'Women',
    'Prefer Not to Say (PNS)': 'Unisex',
    'PNS': 'Unisex'
  };
  const normalizedGender = genderMap[studentChoices.Gender] || studentChoices.Gender;

  // Process each product in the logic table
  for (const product of logicData) {
    let isMatch = true;
    const productType = product.PRODUCT_TYPE;

    // GENDER MATCHING
    if (product.GENDER_CRIT && product.GENDER_CRIT !== 'All') {
      if (product.GENDER_CRIT !== normalizedGender) {
        isMatch = false;
      }
    }

    // SCENT MATCHING
    if (isMatch && product.SCENT_CRIT && product.SCENT_CRIT !== 'All') {
      const isPnsPersonalCare = ['Shaving Cream', 'Deodorant', 'Antiperspirant'].includes(productType) && normalizedGender === 'Unisex';

      // Only run the SCENT match check if it is NOT a PNS/Unisex Personal Care item.
      if (!isPnsPersonalCare) {
        if (product.SCENT_CRIT !== studentChoices.Scent) {
          isMatch = false;
        }
      } else {
        Logger.log(`Bypassing SCENT MATCH for PNS Personal Care: ${product.PRODUCT_NAME}`);
        // The logic is bypassed, meaning isMatch remains true for this check.
      }
    }
    // CHOICE FIELD MATCHING
const trimmedChoiceField = (product.CHOICE_FIELD || '').toString().trim();
if (isMatch && trimmedChoiceField && trimmedChoiceField.toLowerCase() !== 'all') {
  const choiceValue = getChoiceValueForProduct(product.PRODUCT_TYPE, studentChoices);

  // Skip choice field check if no student preference exists for this product type
  if (choiceValue === '') {
    Logger.log(`No student choice field for ${product.PRODUCT_TYPE}, skipping choice field check`);
  } else {
    Logger.log(`CHOICE_FIELD: '${trimmedChoiceField}' vs Student Value: '${(choiceValue || '').toString().trim()}'`);
    if (trimmedChoiceField.toLowerCase() !== (choiceValue || '').toString().trim().toLowerCase()) {
      isMatch = false;
    }
  }
}

    // If all criteria match, add to output
    if (isMatch) {
      // === BEGIN MOD v2.1 - Resolver tag inheritance added Nov 3, 2025 ===
const outputRow = [
Utilities.formatDate(new Date(String(studentChoices.Timestamp)), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
  studentChoices.Email,
  studentChoices.StudentName,
  product.PRODUCT_TYPE,
  product.RETAILER,
  product.SKU,
  product.PRODUCT_NAME,
  product.URL,
  product.PRICE,
  product.QTY,
  product.PRODUCT_ID,
  studentChoices.DataType,
  studentChoices.CohortYear,
  false
];
// === END MOD v2.1 ===

      outputRows.push(outputRow);
      Logger.log(`✅ MATCH: ${product.PRODUCT_NAME} (${product.PRODUCT_ID})`);
    }
  }

  // Add blank separator row after each student
  outputRows.push(Array(14).fill(''));

  Logger.log(`Total matches for ${studentChoices.StudentName}: ${outputRows.length - 1}`);
  return outputRows;
}

/**
 * Gets the appropriate choice value based on product type
 * @param {string} productType - The type of product
 * @param {Object} studentChoices - Student's preferences
 * @returns {string} The relevant choice value
 */
function getChoiceValueForProduct(productType, studentChoices) {
  switch (productType) {
    case 'Sheet Set':
      return studentChoices.BeddingColor;
    case 'Duvet Cover':
      // Falls back to BeddingColor for submissions made before the comforter cover color field existed
      return studentChoices.ComforterCoverColor || studentChoices.BeddingColor;
    case 'Pillow':
      return studentChoices.PillowFirmness;
    case 'Shampoo':
    case 'Conditioner':
    case 'Shampoo & Conditioner Set':
      return studentChoices.Scent;
    case 'Towel Set':
      return studentChoices.TowelColor;
    case 'Slides':
      return studentChoices.SlidesSize;
    case 'Deodorant':
    case 'Antiperspirant':
      return studentChoices.DeodorantType;
    case 'Shaving Cream':
  return ''; // No student preference field exists for shaving cream
    case 'Laundry Basket':
    case 'Shower Caddy':
    case 'Storage Bins':
    case 'Hangers':
    case 'Desk Organizer':
    case 'Toiletry Bag':
      return studentChoices.Style;
    default:
      return '';
  }
}

// ============================================
// OUTPUT FUNCTIONS
// ============================================

/**
 * Writes resolved products to the Resolver sheet
 * @param {Spreadsheet} ss - The active spreadsheet
 * @param {Array<Array>} resolvedProducts - Array of product rows to write
 */
function writeResolvedProducts(ss, resolvedProducts) {
  const resolverSheet = ss.getSheetByName(Resolver_Logic) || ss.insertSheet(Resolver_Logic);

  // Set up headers if this is a new sheet
  if (resolverSheet.getLastRow() === 0) {
    // === BEGIN MOD v2.1 - Resolver headers updated Nov 3, 2025 ===
const headers = [
  'Timestamp',
  'Email',
  'Student Name',
  'Product Type',
  'Retailer',
  'SKU',
  'Product Name',
  'URL',
  'Price',
  'Qty',
  'Product ID',
  'data_type',
  'cohort_year',
  'shopping_list_generated'
];
// === END MOD v2.1 ===
    resolverSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    resolverSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    resolverSheet.setFrozenRows(1);
  }

  // Append the resolved products
  if (resolvedProducts.length > 0) {
    const startRow = resolverSheet.getLastRow() + 1;
    resolverSheet.getRange(startRow, 1, resolvedProducts.length, resolvedProducts[0].length)
      .setValues(resolvedProducts);
    Logger.log(`✅ Wrote ${resolvedProducts.length} rows to Resolver sheet`);
  }
}

// ============================================
// SHOPPING LIST GENERATOR
// ============================================
// (Rest of the code remains EXACTLY the same - lines 732-1090)
// Including:
// - generateShoppingList()
// - All helper functions
// - buildProductLookupKey()
// - buildConditionalPreferences()
// - buildProductMap()
// - buildStudentMap()
// - loadSheetData()
// - getHeaderMap()

// ============================================
// SHOPPING LIST GENERATOR - CORRECTED
// ============================================
// Replace lines 500-830 in your script with this

const OUTPUT_TAB_NAME = 'Shopping_List';
const LOG_TAB_NAME = 'Errors';

function generateShoppingList() {
  Logger.log('=== STARTING SHOPPING LIST GENERATION ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Load data
  const resolverData = loadSheetData(ss, 'Resolver');
  const productLogicData = loadSheetData(ss, 'Product_Logic');
  const studentData = loadSheetData(ss, 'Student_Selections');

// === BEGIN PHASE 5 - Grant Recipients Approval Filter Nov 17, 2025 ===
  // Load Grant_Recipients to verify document approval status
  const grantRecipientsSheet = ss.getSheetByName('Grant_Recipients');
  if (!grantRecipientsSheet) {
    SpreadsheetApp.getUi().alert('Error: Grant_Recipients sheet not found. Shopping list cannot be generated without approval verification.');
    return;
  }

  const grantRecipientsData = grantRecipientsSheet.getDataRange().getValues();

  // Build approval lookup map: email -> {housingStatus, acceptanceStatus}
  const approvalMap = {};
  for (let i = 1; i < grantRecipientsData.length; i++) {
    const email = grantRecipientsData[i][2]; // Column C
    const housingStatus = grantRecipientsData[i][5]; // Column F
    const acceptanceStatus = grantRecipientsData[i][7]; // Column H

    if (email) {
      approvalMap[email.toString().toLowerCase()] = {
        housing: housingStatus,
        acceptance: acceptanceStatus,
        approved: housingStatus === 'Approved' && acceptanceStatus === 'Approved'
      };
    }
  }

  Logger.log(`Loaded approval status for ${Object.keys(approvalMap).length} students from Grant_Recipients`);

  // Initialize tracking for skipped students
  const skippedStudents = {
    notFound: [],
    housingNotApproved: [],
    acceptanceNotApproved: [],
    bothNotApproved: []
  };
  // === END PHASE 5 ===

// === BEGIN MOD v2.1 - Filter Resolver rows Nov 3, 2025 ===
const currentYear = Math.max(...studentData.map(row => {
  const year = parseInt(row[getHeaderMap(ss.getSheetByName('Student_Selections'))['cohort_year']]);
  return isNaN(year) ? 0 : year;
}));

const resolverHeaderMap = getHeaderMap(ss.getSheetByName('Resolver'));
const filteredResolverData = [];
const resolverRowNumbers = []; // Track actual sheet row numbers

resolverData.forEach((row, i) => {
  const dataType = row[resolverHeaderMap['data_type']];
  const cohortYear = parseInt(row[resolverHeaderMap['cohort_year']]);
  const generatedFlag = row[resolverHeaderMap['shopping_list_generated']];

  if (dataType === 'Live' && cohortYear === currentYear && generatedFlag !== true) {
    filteredResolverData.push(row);
    resolverRowNumbers.push(i + 2); // +2 accounts for header row and 0-based index
  }
});
// === END MOD v2.1 ===


  if (resolverData.length === 0) {
    SpreadsheetApp.getUi().alert('No data found in Resolver tab. Please run the resolver first.');
    return;
  }

  // Build lookup maps
  const productMap = buildProductMap(productLogicData);
  const studentMap = buildStudentMap(studentData);

  Logger.log(`Loaded ${Object.keys(productMap).length} products from Product_Logic`);
  Logger.log(`Loaded ${Object.keys(studentMap).length} students from Student Selections`);

  // Process resolver rows
  const outputRows = [];
  const errors = [];
  let rowNum = 2;

  for (const row of filteredResolverData) {
    const studentName = row[2];
    const studentEmail = row[1];     // ← Added email from Resolver

// === BEGIN PHASE 5 - Verify Document Approval Nov 17, 2025 ===
    // Check if student has approved documents
    const approval = approvalMap[studentEmail.toLowerCase()];

    if (!approval) {
      Logger.log(`⚠️ Student ${studentName} (${studentEmail}) not found in Grant_Recipients - SKIPPED`);
      skippedStudents.notFound.push(studentName);
      rowNum++;
      continue;
    }

    if (!approval.approved) {
      // Track WHY they were skipped
      const housingApproved = approval.housing === 'Approved';
      const acceptanceApproved = approval.acceptance === 'Approved';

      if (!housingApproved && !acceptanceApproved) {
        skippedStudents.bothNotApproved.push(studentName);
      } else if (!housingApproved) {
        skippedStudents.housingNotApproved.push(studentName);
      } else {
        skippedStudents.acceptanceNotApproved.push(studentName);
      }

      Logger.log(`⚠️ Student ${studentName} (${studentEmail}) documents not approved - SKIPPED (Housing: ${approval.housing}, Acceptance: ${approval.acceptance})`);
      rowNum++;
      continue;
    }

    Logger.log(`✓ Student ${studentName} (${studentEmail}) verified - documents approved`);
    // === END PHASE 5 ===

    const productId = row[10];

    // Skip blank separator rows
    if (!studentName || !productId) {
      rowNum++;
      continue;
    }

    // Look up student and product
    const student = studentMap[studentName];
    const product = productMap[productId];

    if (!student) {
      errors.push([rowNum, studentName, productId, 'Student not found in Student Selections']);
      rowNum++;
      continue;
    }

    if (!product) {
      errors.push([rowNum, studentName, productId, 'Product not found in Product_Logic']);
      rowNum++;
      continue;
    }

    // Build output row
    const prefs = buildConditionalPreferences(product.ProductType, student);
    const productLookup = buildProductLookupKey(product.ProductType, student, product);

    // Calculate total cost - IMPROVED PRICE PARSING
    const qty = parseFloat(product.Qty) || 1;

    // Handle price - remove $ and commas if present
    let unitPrice = 0;
    if (product.Price) {
      const priceStr = product.Price.toString().replace(/[$,]/g, '');
      unitPrice = parseFloat(priceStr) || 0;
    }

    const totalCost = qty * unitPrice;

    // Log if price is still 0 for debugging
    if (unitPrice === 0) {
      Logger.log(`⚠️ Warning: Price is 0 for ${product.ProductName} (${productId})`);
      Logger.log(`Raw price value: ${product.Price}`);
    }

    outputRows.push([
      // GROUP 1: STUDENT INFO (CORRECTED ORDER)
      studentName,
      studentEmail,              // ← ADDED: Student Email
      student.Street1,           // Maps to "Street Address" (not "Street Address 1")
      student.Street2,
      student.City,
      student.State,
      student.Zip,               // Maps to "Zip Code"
      student.ShippingPref,      // Maps to "Shipping Pref"

      // GROUP 2: PRODUCT SELECTION
      productLookup,

      // GROUP 3: PRODUCT DETAILS
      product.ProductType,
      product.Brand || '',
      product.ProductName,
      product.SKU || productId, // This is the SKU
      product.Retailer,
      product.URL,

      // GROUP 4: PRICING
      qty,
      unitPrice,                 // Now properly parsed
      totalCost,                 // Now correctly calculated

      // GROUP 5: STUDENT PREFERENCES
      prefs.gender,
      prefs.scent,
      prefs.deodorantType,
      prefs.style,
      prefs.beddingColor,
      prefs.pillowFirmness,
      prefs.towelColor,
      prefs.slidesSize,
      row[resolverHeaderMap['data_type']],
      row[resolverHeaderMap['cohort_year']]
    ]);

    rowNum++;
  }

  // === BEGIN PHASE 5 - Report Filtering Results Nov 17, 2025 ===
  const totalProcessed = filteredResolverData.length;
  const totalIncluded = outputRows.length;
  const totalSkipped = totalProcessed - totalIncluded;

  Logger.log('=== APPROVAL FILTER RESULTS ===');
  Logger.log(`Total students processed: ${totalProcessed}`);
  Logger.log(`Students included (approved): ${totalIncluded}`);
  Logger.log(`Students skipped (not approved): ${totalSkipped}`);

  // Build summary alert message
  if (totalSkipped > 0) {
    let alertMessage = `Shopping List Generated\n\n`;
    alertMessage += `✓ ${totalIncluded} students included (documents approved)\n`;
    alertMessage += `⚠️ ${totalSkipped} students skipped:\n\n`;

    if (skippedStudents.notFound.length > 0) {
      alertMessage += `• Not found in Grant_Recipients: ${skippedStudents.notFound.length}\n`;
      alertMessage += `  ${skippedStudents.notFound.join(', ')}\n\n`;
    }

    if (skippedStudents.bothNotApproved.length > 0) {
      alertMessage += `• Both documents not approved: ${skippedStudents.bothNotApproved.length}\n`;
      alertMessage += `  ${skippedStudents.bothNotApproved.join(', ')}\n\n`;
    }

    if (skippedStudents.housingNotApproved.length > 0) {
      alertMessage += `• Housing not approved: ${skippedStudents.housingNotApproved.length}\n`;
      alertMessage += `  ${skippedStudents.housingNotApproved.join(', ')}\n\n`;
    }

    if (skippedStudents.acceptanceNotApproved.length > 0) {
      alertMessage += `• Acceptance not approved: ${skippedStudents.acceptanceNotApproved.length}\n`;
      alertMessage += `  ${skippedStudents.acceptanceNotApproved.join(', ')}\n\n`;
    }

    SpreadsheetApp.getUi().alert('Shopping List - Approval Filter Applied', alertMessage, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Shopping List Generated', `All ${totalIncluded} students have approved documents and were included in the shopping list.`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  // === END PHASE 5 ===

  // Write to output sheet
  const outputSheet = ss.getSheetByName(OUTPUT_TAB_NAME) || ss.insertSheet(OUTPUT_TAB_NAME);

  // Set up headers if needed - CORRECTED TO MATCH APPROVED VERSION
  if (outputSheet.getLastRow() < 1) {
    const headers = [
      // GROUP 1: STUDENT INFO
      'Student Name',
      'Student Email',           // ← ADDED
      'Street Address',          // ← CORRECTED: Was "Street Address 1"
      'Street Address 2',
      'City',
      'State',
      'Zip Code',                // ← CORRECTED: Was "Zip"
      'Shipping Pref',           // ← CORRECTED: Was "Shipping Preference"

      // GROUP 2: PRODUCT SELECTION
      'Product Selection',

      // GROUP 3: PRODUCT DETAILS
      'Product Type',
      'Brand',
      'Product Name',
      'SKU',
      'Retailer',
      'URL',

      // GROUP 4: PRICING
      'Quantity',
      'Unit Price',
      'Total Cost',

      // GROUP 5: STUDENT PREFERENCES
      'Gender',
      'Scent',
      'Deodorant Type',
      'Style',
      'Bedding Color',
      'Pillow Firmness',
      'Towel Color',
      'Slides Size'
    ];

    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format headers
    const headerRange = outputSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  } else {
    Logger.log('Headers already exist - preserving your formatting');
  }

  // Write data
  if (outputRows.length > 0) {
    const startRow = 2;
    outputSheet.getRange(startRow, 1, outputRows.length, outputRows[0].length).setValues(outputRows);
    Logger.log(`Wrote ${outputRows.length} rows to Shopping_List`);
  }
// === BEGIN MOD v2.1 - Mark items as generated Nov 3, 2025 ===
  const resolverSheet = ss.getSheetByName('Resolver');
  const generatedColIndex = resolverHeaderMap['shopping_list_generated'];

  resolverRowNumbers.forEach(actualRowNum => {
    resolverSheet.getRange(actualRowNum, generatedColIndex + 1).setValue(true);
  });
  Logger.log(`✅ Marked ${resolverRowNumbers.length} Resolver rows as generated`);
// === END MOD v2.1 ===

// Write errors to log
  if (errors.length > 0) {
    const logSheet = ss.getSheetByName(LOG_TAB_NAME) || ss.insertSheet(LOG_TAB_NAME);
    if (logSheet.getLastRow() < 1) {
      logSheet.getRange(1, 1, 1, 4).setValues([['Row', 'Student', 'SKU', 'Error']]);
    }
    logSheet.getRange(logSheet.getLastRow() + 1, 1, errors.length, errors[0].length).setValues(errors);
    Logger.log(`Logged ${errors.length} errors`);
  }

  Logger.log('=== SHOPPING LIST GENERATION COMPLETE ===');

  // Show completion message
  SpreadsheetApp.getUi().alert(
    'Shopping List Generated',
    `Successfully generated ${outputRows.length} line items.\n\n` +
    `Errors: ${errors.length}\n\n` +
    (errors.length > 0 ? `Check the '${LOG_TAB_NAME}' tab for error details.` : 'No errors found!'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// === BEGIN MOD v2.1 - Preview Archive Cohort added Nov 3, 2025 ===
function previewArchiveCohort() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get the current year from Student Selections
  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet || selectionsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data found in Student Selections to archive.');
    return;
  }

  const selectionsData = selectionsSheet.getDataRange().getValues();
  const selectionsMap = getHeaderMap(selectionsSheet);
  const timestampIndex = selectionsMap['Timestamp'];
  const cohortYearIndex = selectionsMap['cohort_year'];
const validYears = selectionsData.slice(1).map(row => {
    const year = parseInt(row[cohortYearIndex]);
    return isNaN(year) ? 0 : year;
  });
  const currentYear = Math.max(...validYears);

  if (currentYear === 0) {
    SpreadsheetApp.getUi().alert('Error: Could not determine current cohort year from data. Archive cancelled.');
    return;
  }
  // Count rows that would be archived from each tab
  let selectionsCount = 0;
  let resolverCount = 0;
  let shoppingCount = 0;

  // Count Student Selections rows
 selectionsData.slice(1).forEach(row => {
  if (parseInt(row[cohortYearIndex]) === currentYear) {
    const timestampIndex = selectionsMap['Timestamp'];
    row[timestampIndex] = Utilities.formatDate(new Date(row[timestampIndex]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    selectionsCount++;
  }
});

  // Count Resolver rows
  const resolverSheet = ss.getSheetByName('Resolver');
  if (resolverSheet && resolverSheet.getLastRow() > 1) {
    const resolverData = resolverSheet.getDataRange().getValues();
    const resolverMap = getHeaderMap(resolverSheet);
    const resolverYearIndex = resolverMap['cohort_year'];
    resolverData.slice(1).forEach(row => {
      if (parseInt(row[resolverYearIndex]) === currentYear) {
        resolverCount++;
      }
    });
  }

  // Count Shopping List rows
  const shoppingSheet = ss.getSheetByName('Shopping_List');
  if (shoppingSheet && shoppingSheet.getLastRow() > 1) {
    const shoppingData = shoppingSheet.getDataRange().getValues();
    const shoppingMap = getHeaderMap(shoppingSheet);
    const shoppingYearIndex = shoppingMap['cohort_year'];
    shoppingData.slice(1).forEach(row => {
      if (parseInt(row[shoppingYearIndex]) === currentYear) {
        shoppingCount++;
      }
    });
  }

  const totalRows = selectionsCount + resolverCount + shoppingCount;

  SpreadsheetApp.getUi().alert(
    'Archive Preview',
    `The following rows from cohort ${currentYear} would be archived:\n\n` +
    `• Student Selections: ${selectionsCount} rows\n` +
    `• Resolver: ${resolverCount} rows\n` +
    `• Shopping_List: ${shoppingCount} rows\n\n` +
    `Total: ${totalRows} rows\n\n` +
    `These would be moved to the respective Archive tabs and the active tabs would be cleared.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
// === END MOD v2.1 ===

// === BEGIN MOD v2.1 - Archive Cohort added Nov 3, 2025 ===
function archiveCohort() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get current year
  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet || selectionsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data found in Student Selections to archive.');
    return;
  }

  const selectionsData = selectionsSheet.getDataRange().getValues();
  const selectionsMap = getHeaderMap(selectionsSheet);
  const cohortYearIndex = selectionsMap['cohort_year'];
  const currentYear = Math.max(...selectionsData.slice(1).map(row => parseInt(row[cohortYearIndex])));
  const studentsToArchive = selectionsData.slice(1).filter(row => parseInt(row[cohortYearIndex]) === currentYear).length;

  // Confirm with user
  const ui = SpreadsheetApp.getUi();
const response = ui.alert(
  `Archive Confirmation`,
  `You are about to archive ${studentsToArchive} students from cohort ${currentYear}.\n\n` +
  `This will move all matching rows from Student_Selections, Resolver, and Shopping_List to their respective archive tabs and clear them from the active tabs.\n\n` +
  `Do you want to proceed?`,
  ui.ButtonSet.YES_NO
);

if (response !== ui.Button.YES) {
  ui.alert('Archive cancelled.');
  return;
}

  // Process Student Selections Archive
  const selectionsArchiveSheet = ss.getSheetByName('Student_Selections_Archive') || ss.insertSheet('Student_Selections_Archive');
  if (selectionsArchiveSheet.getLastRow() === 0) {
    // Copy headers from Student Selections
    const headers = selectionsSheet.getRange(1, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];
    selectionsArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  let selectionsArchivedCount = 0;
let resolverArchivedCount = 0;
let shoppingArchivedCount = 0;
const selectionsRowsToArchive = [];

// 1. Process Student Selections Archive
selectionsData.slice(1).forEach(row => {
  if (parseInt(row[cohortYearIndex]) === currentYear) {
    selectionsRowsToArchive.push(row);
    selectionsArchivedCount++;
  }
});

if (selectionsRowsToArchive.length > 0) {
    const startRow = selectionsArchiveSheet.getLastRow() + 1;
    selectionsArchiveSheet.getRange(startRow, 1, selectionsRowsToArchive.length, selectionsRowsToArchive[0].length).setValues(selectionsRowsToArchive);
}

// 2. Process Resolver Archive
const resolverSheet = ss.getSheetByName('Resolver');
if (resolverSheet && resolverSheet.getLastRow() > 1) {
    const resolverArchiveSheet = ss.getSheetByName('Resolver_Archive') || ss.insertSheet('Resolver_Archive');
if (resolverArchiveSheet.getLastRow() === 0) {
      const headers = resolverSheet.getRange(1, 1, 1, resolverSheet.getLastColumn()).getValues()[0];
resolverArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const resolverData = resolverSheet.getDataRange().getValues();
    const resolverMap = getHeaderMap(resolverSheet);
const resolverYearIndex = resolverMap['cohort_year'];

    const resolverRowsToArchive = [];
    resolverData.slice(1).forEach(row => {
      if (parseInt(row[resolverYearIndex]) === currentYear) {
        resolverRowsToArchive.push(row);
        resolverArchivedCount++;
      }
    });
if (resolverRowsToArchive.length > 0) {
      const startRow = resolverArchiveSheet.getLastRow() + 1;
      resolverArchiveSheet.getRange(startRow, 1, resolverRowsToArchive.length, resolverRowsToArchive[0].length).setValues(resolverRowsToArchive);
    }
  }

// 3. Process Shopping List Archive
const shoppingSheet = ss.getSheetByName('Shopping_List');
if (shoppingSheet && shoppingSheet.getLastRow() > 1) {
    const shoppingArchiveSheet = ss.getSheetByName('Shopping_List_Archive') || ss.insertSheet('Shopping_List_Archive');
if (shoppingArchiveSheet.getLastRow() === 0) {
      const headers = shoppingSheet.getRange(1, 1, 1, shoppingSheet.getLastColumn()).getValues()[0];
shoppingArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const shoppingData = shoppingSheet.getDataRange().getValues();
    const shoppingMap = getHeaderMap(shoppingSheet);
const shoppingYearIndex = shoppingMap['cohort_year'];

  const shoppingRowsToArchive = [];
    shoppingData.slice(1).forEach(row => {
      if (parseInt(row[shoppingYearIndex]) === currentYear) {
        shoppingRowsToArchive.push(row);
        shoppingArchivedCount++;
      }
    });
if (shoppingRowsToArchive.length > 0) {
      const startRow = shoppingArchiveSheet.getLastRow() + 1;
      shoppingArchiveSheet.getRange(startRow, 1, shoppingRowsToArchive.length, shoppingRowsToArchive[0].length).setValues(shoppingRowsToArchive);
    }
  }

// 4. Clear active tabs (delete all data rows, keep headers)
// Rows were counted above, so we can now safely clear the active tabs.
if (selectionsSheet.getLastRow() > 1) {
    selectionsSheet.deleteRows(2, selectionsSheet.getLastRow() - 1);
}
if (resolverSheet && resolverSheet.getLastRow() > 1) {
    resolverSheet.deleteRows(2, resolverSheet.getLastRow() - 1);
}
if (shoppingSheet && shoppingSheet.getLastRow() > 1) {
    shoppingSheet.deleteRows(2, shoppingSheet.getLastRow() - 1);
}

const totalArchived = selectionsArchivedCount + resolverArchivedCount + shoppingArchivedCount;

ui.alert(
    'Archive Complete',
    `Successfully archived cohort ${currentYear}. Total rows moved: ${totalArchived}.\n\n` +
    `• Student Selections: ${selectionsArchivedCount} rows\n` +
    `• Resolver: ${resolverArchivedCount} rows\n` +
    `• Shopping_List: ${shoppingArchivedCount} rows\n\n` +
    `Active tabs have been cleared and are ready for the next cohort.`,
    ui.ButtonSet.OK
  );
}
// === END MOD v2.1 ===

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildProductLookupKey(productType, student, product) {
  const parts = [];

  const genderMap = {
    'Male': "Men's",
    'Female': "Women's",
    'Prefer Not to Say (PNS)': 'Unisex',
    'PNS': 'Unisex'
  };

  if (student.Gender && ['Razor Handle', 'Razor Refills', 'Slides', 'Deodorant', 'Antiperspirant'].includes(productType)) {
    const genderPrefix = genderMap[student.Gender] || student.Gender;
    if (genderPrefix !== 'Unisex') {
      parts.push(genderPrefix);
    } else {
      parts.push('Unisex');
    }
  }

  if (productType === 'Sheet Set' || productType === 'Duvet Cover') {
    if (student.Color) parts.push(student.Color);
  } else if (productType === 'Pillow') {
    if (student.Firmness) parts.push(student.Firmness);
  } else if (productType === 'Towel Set') {
    if (student.TowelColor) parts.push(student.TowelColor);
  } else if (productType === 'Slides') {
    if (student.SlidesSize) parts.push(student.SlidesSize);
  } else if (['Deodorant', 'Antiperspirant'].includes(productType)) {
    if (student.Scent) parts.push(student.Scent);
  } else if (['Laundry Basket', 'Shower Caddy', 'Storage Bins', 'Hangers', 'Desk Organizer', 'Toiletry Bag'].includes(productType)) {
    if (student.Style) parts.push(student.Style);
  }

  parts.push(productType);

  return parts.join(' ');
}

function buildConditionalPreferences(productType, student) {
  const prefs = {
    gender: '',
    scent: '',
    deodorantType: '',
    style: '',
    beddingColor: '',
    pillowFirmness: '',
    towelColor: '',
    slidesSize: ''
  };

  if (['Razor Handle', 'Razor Refills', 'Slides', 'Deodorant', 'Antiperspirant'].includes(productType)) {
    prefs.gender = student.Gender || '';
  }

  if (['Deodorant', 'Antiperspirant', 'Body Wash', 'Shampoo & Conditioner Set', 'Lotion'].includes(productType)) {
    prefs.scent = student.Scent || '';
  }

  if (['Deodorant', 'Antiperspirant'].includes(productType)) {
    prefs.deodorantType = student.DeodorantType || '';
  }

  if (['Laundry Basket', 'Shower Caddy', 'Storage Bins', 'Hangers', 'Desk Organizer', 'Toiletry Bag'].includes(productType)) {
    prefs.style = student.Style || '';
  }

  if (['Sheet Set', 'Duvet Cover'].includes(productType)) {
    prefs.beddingColor = student.Color || '';
  }

  if (productType === 'Pillow') {
    prefs.pillowFirmness = student.Firmness || '';
  }

  if (productType === 'Towel Set') {
    prefs.towelColor = student.TowelColor || '';
  }

  if (productType === 'Slides') {
    prefs.slidesSize = student.SlidesSize || '';
  }

  return prefs;
}

function buildProductMap(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product_Logic');
  const headerMap = getHeaderMap(sheet);
  const map = {};

  data.forEach(row => {
    const productId = row[headerMap['Product ID']];
    if (productId) {
      map[productId] = {
        ProductType: row[headerMap['PRODUCT TYPE']],
        Brand: row[headerMap['PRIMARY BRAND']],
        ProductName: row[headerMap['PRODUCT']],
        SKU: row[headerMap['PRIMARY SKU']],
        Price: row[headerMap['PRIMARY PRICE']],        // Will be cleaned in generateShoppingList
        Qty: row[headerMap['QTY PER STUDENT']],
        Retailer: row[headerMap['PRIMARY RETAILER']],
        URL: row[headerMap['PRIMARY URL']],
        Gender: row[headerMap['GENDER']],
        Scent: row[headerMap['SCENT']],
        ChoiceField: row[headerMap['CHOICE FIELD']]
      };
    }
  });

  return map;
}

function buildStudentMap(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Student_Selections');
  const headerMap = getHeaderMap(sheet);
  const map = {};

  data.forEach(row => {
    const name = row[headerMap['Student Name']];
    if (name) {
      map[name] = {
        Email: row[headerMap['Email Address']],       // ← ADDED
        Street1: row[headerMap['Street Address']],
        Street2: row[headerMap['Street Address 2']] || '',
        City: row[headerMap['City']],
        State: row[headerMap['State']],
        Zip: row[headerMap['Zip Code']],
        ShippingPref: row[headerMap['Shipping Preference (home or college)']] || row[headerMap['Shipping Preference']] || '',
        Gender: row[headerMap['Gender Preference']],
        Scent: row[headerMap['Scent Preference']],
        DeodorantType: row[headerMap['Deodorant Type']],
        Style: row[headerMap['Style Preference']],
        Color: row[headerMap['Bedding Color']],
        Firmness: row[headerMap['Pillow Firmness']],
        TowelColor: row[headerMap['Towel Color']],
        SlidesSize: row[headerMap['Slides Size']],
        // === BEGIN MOD v2.3 ===
        ComforterCoverColor: row[headerMap['Comforter Cover Color']] || '',
        SlidesColor: row[headerMap['Slides Color']] || '',
        CollegeName: row[headerMap['College Name']] || '',
        CollegeUnitId: row[headerMap['College Unit ID']] || ''
        // === END MOD v2.3 ===
      };
    }
  });

  return map;
}

function loadSheetData(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    throw new Error(`Sheet '${tabName}' not found`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log(`Warning: Sheet '${tabName}' has no data rows`);
    return [];
  }

  const numRows = lastRow - 1;
  const numCols = sheet.getLastColumn();
  return sheet.getRange(2, 1, numRows, numCols).getValues();
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    map[header.trim()] = index;
  });
  return map;
}

// ============================================
// TEST FUNCTIONS (Keep for debugging)
// ============================================

function debugProductLogicForGurn() {
  // Your existing debug function - unchanged
  Logger.log('Debug function preserved');
}
// ============================================
// TEST: Email Validation - Added Nov 15, 2025
// ============================================

function testCheckStudentStatus() {
  // Test with Andrew Santino's email
  const testEmail = 'elilavois@gmail.com';
  const result = checkStudentStatus(testEmail);

  Logger.log('=== EMAIL VALIDATION TEST ===');
  Logger.log('Testing email: ' + testEmail);
  Logger.log('Result:');
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log('===========================');
}

function testDoPostRouting() {
  // Test the doPost routing with checkStudentStatus action
  const mockRequest = {
    postData: {
      contents: JSON.stringify({
        action: 'checkStudentStatus',
        email: 'elilavois@gmail.com'
      })
    }
  };

  const result = doPost(mockRequest);

  Logger.log('=== DOPOST ROUTING TEST ===');
  Logger.log('Response:');
  Logger.log(result.getContent());
  Logger.log('===========================');
}
// ============================================
// TEST: Document Upload - Added Nov 16, 2025
// ============================================

function testUploadDocuments() {
  // This test uses a tiny valid base64-encoded 1x1 pixel PNG image
  // so we can verify the upload process works without large files

  const testEmail = 'elilavois@gmail.com';
  const testApplicationId = 'CR_1758657496058_8l0scy';

  // Tiny 1x1 pixel PNG (68 bytes) - valid base64
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const housingFile = {
    name: 'test_housing.png',
    data: tinyPngBase64
  };

  const acceptanceFile = {
    name: 'test_acceptance.png',
    data: tinyPngBase64
  };

  Logger.log('=== TESTING UPLOAD DOCUMENTS ===');
  Logger.log('Test email: ' + testEmail);
  Logger.log('Test application ID: ' + testApplicationId);

  const result = uploadDocuments(testEmail, testApplicationId, housingFile, acceptanceFile);

  Logger.log('=== TEST RESULT ===');
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log('==================');

  // Also test through doPost to verify the routing
  Logger.log('=== TESTING DOPOST ROUTING ===');
  const mockRequest = {
    postData: {
      contents: JSON.stringify({
        action: 'uploadDocuments',
        email: testEmail,
        applicationId: testApplicationId,
        housingFile: housingFile,
        acceptanceFile: acceptanceFile
      })
    }
  };

  const doPostResult = doPost(mockRequest);
  Logger.log('doPost response:');
  Logger.log(doPostResult.getContent());
  Logger.log('=============================');
}

function testUploadWithMissingData() {
  // Test error handling when data is missing
  Logger.log('=== TESTING ERROR HANDLING ===');

  const testEmail = 'elilavois@gmail.com';
  const testApplicationId = 'CR_1758657496058_8l0scy';

  // Test with null housingFile
  Logger.log('Test 1: Null housing file');
  let result = uploadDocuments(testEmail, testApplicationId, null, {name: 'test.png', data: 'abc'});
  Logger.log('Result: ' + JSON.stringify(result));

  // Test with missing data property
  Logger.log('Test 2: Missing data property');
  result = uploadDocuments(testEmail, testApplicationId, {name: 'test.png'}, {name: 'test.png', data: 'abc'});
  Logger.log('Result: ' + JSON.stringify(result));

  // Test with empty data string
  Logger.log('Test 3: Empty data string');
  result = uploadDocuments(testEmail, testApplicationId, {name: 'test.png', data: ''}, {name: 'test.png', data: 'abc'});
  Logger.log('Result: ' + JSON.stringify(result));

  Logger.log('=============================');
}
// ============================================
// CAMPUS READY FOUNDATION - TESTIMONIAL REMINDERS
// ============================================
// Last updated: December 4, 2025
// Purpose: Weekly digest of students ready for testimonial outreach
//
// Runs automatically every Monday at 8am PT (set up trigger after pasting)
// Sends digest to hello@campusready.org

const TESTIMONIAL_CONFIG = {
  GRANT_RECIPIENTS_SHEET: 'Grant_Recipients',
  NOTIFICATION_EMAIL: 'hello@campusready.org',

  COLS: {
    APPLICATION_ID: 0,    // A
    STUDENT_NAME: 1,      // B
    EMAIL: 2,             // C
    COHORT_YEAR: 3,       // D
    ITEMS_SELECTED: 9,    // J
    START_DATE: 13,       // N
    TESTIMONIAL_INVITED: 14,  // O
    PHONE: 18             // S
  }
};

/**
 * Main function - checks for students ready for testimonial outreach
 * and sends digest email to staff
 */
function sendTestimonialReminder() {
  // Only run between June 15 and September 1
  const today = new Date();
  const month = today.getMonth(); // 0-indexed: Jan=0, Jun=5, Sep=8
  const day = today.getDate();

  const afterJune15 = (month > 5) || (month === 5 && day >= 15);
  const beforeSept1 = (month < 8) || (month === 8 && day < 1);

  if (!(afterJune15 && beforeSept1)) {
    Logger.log('Outside testimonial outreach window (June 15 - September 1). Skipping.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TESTIMONIAL_CONFIG.GRANT_RECIPIENTS_SHEET);

  if (!sheet) {
    Logger.log('Grant_Recipients sheet not found');
    return;
  }

  const readyStudents = [];

  // Get all data (skip header row)
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data in Grant_Recipients');
    return;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  // Check each student
  data.forEach((row, index) => {
    const startDate = row[TESTIMONIAL_CONFIG.COLS.START_DATE];
    const testimonialInvited = row[TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED];
    const itemsSelected = row[TESTIMONIAL_CONFIG.COLS.ITEMS_SELECTED];
    const studentName = row[TESTIMONIAL_CONFIG.COLS.STUDENT_NAME];

    // Skip if no start date, already invited, or no name
    if (!startDate || testimonialInvited || !studentName) {
      return;
    }

    // Skip if they haven't completed kit selection
    if (itemsSelected !== 'Yes') {
      return;
    }

    // Check if start date has passed
    const startDateObj = new Date(startDate);
    if (startDateObj <= today) {
      readyStudents.push({
        name: studentName,
        email: row[TESTIMONIAL_CONFIG.COLS.EMAIL],
        phone: row[TESTIMONIAL_CONFIG.COLS.PHONE] || '',
        startDate: Utilities.formatDate(startDateObj, Session.getScriptTimeZone(), 'MMM d, yyyy'),
        cohort: row[TESTIMONIAL_CONFIG.COLS.COHORT_YEAR],
        rowNumber: index + 2  // For reference (1-indexed, skip header)
      });
    }
  });

  // If no students ready, log and exit
  if (readyStudents.length === 0) {
    Logger.log('No students ready for testimonial outreach');
    return;
  }

  // Build and send digest email
  sendDigestEmail(readyStudents);
  Logger.log('Testimonial reminder sent for ' + readyStudents.length + ' students');
}

/**
 * Builds and sends the digest email
 */
function sendDigestEmail(students) {
  const subject = 'Testimonial Outreach Ready: ' + students.length + ' student' + (students.length > 1 ? 's' : '');

  // Build student list HTML
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
      </tr>
    `;
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
          <tbody>
            ${studentListHTML}
          </tbody>
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
    </div>
  `;

  const textBody = `Testimonial Outreach Ready\n\n` +
    `${students.length} student${students.length > 1 ? 's have' : ' has'} arrived on campus and ${students.length > 1 ? 'are' : 'is'} ready for testimonial outreach:\n\n` +
    students.map(s => `- ${s.name} | ${s.email} | ${s.phone} | Started ${s.startDate}`).join('\n') +
    `\n\nNext steps:\n` +
    `1. Send each student the testimonial invitation email\n` +
    `2. Mark the date in the "Testimonial Invited" column (O) in Grant_Recipients\n` +
    `3. When they submit, add the URL and mark Release Signed / Gift Card Sent`;

  GmailApp.sendEmail(
    TESTIMONIAL_CONFIG.NOTIFICATION_EMAIL,
    subject,
    textBody,
    {
      htmlBody: htmlBody,
      name: 'Campus Ready Foundation'
    }
  );
}
/**
 * Manual test function - run this to test without waiting for schedule
 */
function testTestimonialReminder() {
  sendTestimonialReminder();
}

/**
 * Sets up the weekly trigger - run once after pasting script
 */
function createTestimonialTrigger() {
  // Remove any existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendTestimonialReminder') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new weekly trigger - Mondays at 8am
  ScriptApp.newTrigger('sendTestimonialReminder')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  Logger.log('Trigger created: sendTestimonialReminder will run every Monday at 8am');
}

// ============================================
// TESTIMONIAL INVITE EMAIL SYSTEM
// ============================================

/**
 * Send testimonial invitation emails to eligible students
 * Menu: Fulfillment Tools > Send Testimonial Invites
 */
function sendTestimonialInvites() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');

  if (!sheet) {
    ui.alert('Error', 'Grant_Recipients sheet not found', ui.ButtonSet.OK);
    return;
  }

  const today = new Date();
  const data = sheet.getDataRange().getValues();

  // Find eligible students
  const eligibleStudents = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const studentName = row[TESTIMONIAL_CONFIG.COLS.STUDENT_NAME];
    const email = row[TESTIMONIAL_CONFIG.COLS.EMAIL];
    const startDate = row[TESTIMONIAL_CONFIG.COLS.START_DATE];
    const itemsSelected = row[TESTIMONIAL_CONFIG.COLS.ITEMS_SELECTED];
    const testimonialInvited = row[TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED];

    // Skip if missing required data
    if (!studentName || !email || !startDate) continue;

    // Skip if already invited
    if (testimonialInvited) continue;

    // Skip if haven't completed kit selection
    if (itemsSelected !== 'Yes') continue;

    // Skip if start date hasn't passed
    const startDateObj = new Date(startDate);
    if (startDateObj > today) continue;

    // Extract first name
    const firstName = studentName.split(' ')[0];

    eligibleStudents.push({
      rowIndex: i + 1,
      name: studentName,
      firstName: firstName,
      email: email,
      startDate: Utilities.formatDate(startDateObj, Session.getScriptTimeZone(), 'MMM d, yyyy')
    });
  }

  // If no eligible students, inform and exit
  if (eligibleStudents.length === 0) {
    ui.alert(
      'No Students Ready',
      'No students are currently eligible for testimonial invites.\n\n' +
      'Students need:\n' +
      '• Start date passed\n' +
      '• Items Selected = Yes\n' +
      '• Testimonial Invited = blank',
      ui.ButtonSet.OK
    );
    return;
  }

  // Build confirmation message
  let confirmMessage = `Ready to send testimonial invites to ${eligibleStudents.length} student(s):\n\n`;

  eligibleStudents.forEach(student => {
    confirmMessage += `• ${student.name} (started ${student.startDate})\n`;
  });

  confirmMessage += '\nThis will also send SMS reminders to check email.\n\nSend invites?';

  // Show confirmation dialog
  const response = ui.alert(
    'Send Testimonial Invites',
    confirmMessage,
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Cancelled', 'No invites were sent.', ui.ButtonSet.OK);
    return;
  }

  // Send emails and mark as invited
  let successCount = 0;
  let failCount = 0;
  const timestamp = new Date();

  eligibleStudents.forEach(student => {
    try {
      sendTestimonialEmailToStudent(student);

      // Mark as invited with today's date
      sheet.getRange(student.rowIndex, TESTIMONIAL_CONFIG.COLS.TESTIMONIAL_INVITED + 1)
        .setValue(timestamp);

      successCount++;
    } catch (error) {
      Logger.log(`Failed to send testimonial invite to ${student.email}: ${error}`);
      failCount++;
    }
  });

  // Show results
  let resultMessage = `Testimonial invites sent: ${successCount}`;
  if (failCount > 0) {
    resultMessage += `\nFailed to send: ${failCount}`;
  }
  resultMessage += '\n\nRemember to send SMS messages manually using the template in Testimonial_Templates tab.';

  ui.alert('Invites Sent', resultMessage, ui.ButtonSet.OK);
}

/**
 * Send testimonial invitation email to individual student
 */
function sendTestimonialEmailToStudent(student) {
  const subject = "You made it! How's it going?";

  const textBody = `Hey ${student.firstName}!

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

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #469E92, #3a8178); padding: 32px; text-align: center;">
    <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; margin: 0; font-size: 30px; font-weight: 700;">You Made It!</h1>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
        Hey ${student.firstName}!
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Congratulations, you made it to campus! We hope move-in went smoothly and you're getting settled in.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        We'd love to see how your space is coming together. If you're up for sharing a quick photo or short video of your setup, we'll send you a <strong>$50 Visa gift card</strong> as a thank-you.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        This is completely optional. We may use what you share on our website or social media to show future students what Campus Ready support looks like.
      </p>

      <!-- How to participate -->
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #0f766e; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
          If you'd like to participate:
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
          Reply to this email with a photo or short video attached, and quick caption about your experience.
        </p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        That's it! We'll get your gift card on the way.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Thanks for being part of Campus Ready. We're cheering you on!
      </p>

      <!-- Signature -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px; margin: 0;">Warmly,</p>
        <p style="color: #374151; font-size: 16px; font-weight: 600; margin: 4px 0 0 0;">The Campus Ready Team</p>
      </div>

      <p style="color: #6b7280; font-size: 14px; font-style: italic; margin-top: 24px;">
        P.S. No pressure at all—we're just glad you're there.
      </p>
    </div>

    <!-- Fine Print / Release -->
    <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
        By replying with your photo or video, you grant Campus Ready Foundation permission to use it on our website, social media, and promotional materials. We may include your first name and college. We will never share your contact information.
      </p>
    </div>

  </div>
</body>
</html>`;

  GmailApp.sendEmail(
    student.email,
    subject,
    textBody,
    {
      htmlBody: htmlBody,
      name: 'Campus Ready Foundation',
      replyTo: 'hello@campusready.org'
    }
  );

  Logger.log(`Testimonial invite sent to ${student.email} (${student.name})`);
}
/**
 * Test function - sends testimonial invite to yourself
 */
function testTestimonialEmail() {
  const testStudent = {
    firstName: 'Eric',
    name: 'Eric Lilavois',
    email: 'elilavois@gmail.com'
  };

  sendTestimonialEmailToStudent(testStudent);
  Logger.log('Test email sent to ' + testStudent.email);
}
