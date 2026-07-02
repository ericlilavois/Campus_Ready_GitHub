// ============================================
// WEB APP ENTRY POINTS
// doGet  → RSVP link handler (orientation email)
// doPost → kit form submissions + API routing
// ============================================

// TEST FUNCTION - Run once to authorize Drive access
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

// Handles RSVP link clicks from the orientation email.
// Routes all other GET requests to a plain fallback page.
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'rsvp') {
    return handleRsvp(params.id, params.response);
  }
  return HtmlService.createHtmlOutput('<p>Campus Ready</p>').setTitle('Campus Ready');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'checkStudentStatus') {
      const result = checkStudentStatus(data.email);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'checkStudentStatusById') {
      const result = checkStudentStatusById(data.applicationId);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'uploadDocuments') {
      const result = uploadDocuments(data.email, data.applicationId, data.housingFile, data.acceptanceFile);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // No action specified → kit form submission
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let sheet = ss.getSheetByName('Student_Selections');
    if (!sheet) {
      sheet = ss.insertSheet('Student_Selections');
      const headers = [
        'Timestamp', 'Student Name', 'Email Address',
        'Shipping Preference (home or college)', 'Street Address', 'Street Address 2',
        'City', 'State', 'Zip Code', 'Gender Preference', 'Scent Preference',
        'Deodorant Type', 'Style Preference', 'Bedding Color', 'Comforter Cover Color',
        'Pillow Firmness', 'Towel Color', 'Slides Size', 'Slides Color',
        'data_type', 'cohort_year', 'College Name', 'College Unit ID'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#469E92')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

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
      data.comforter_cover_color || '',
      data.pillow_firmness || '',
      data.towel_color || '',
      data.slides_size || '',
      data.slides_color || ''
    ];

    // Look up cohort year from Grant_Recipients
    const studentEmail = data.email;
    let cohortYear = new Date().getFullYear();
    let grantRecipientsRowIndex = null;

    const grantRecipientsSheet = ss.getSheetByName('Grant_Recipients');
    if (grantRecipientsSheet) {
      const grantRecipientsData = grantRecipientsSheet.getDataRange().getValues();
      for (let i = 1; i < grantRecipientsData.length; i++) {
        if (grantRecipientsData[i][2] &&
            grantRecipientsData[i][2].toString().toLowerCase() === studentEmail.toLowerCase()) {
          cohortYear = grantRecipientsData[i][3] || cohortYear;
          grantRecipientsRowIndex = i + 1;
          Logger.log(`Found student in Grant_Recipients: cohort_year = ${cohortYear}`);
          break;
        }
      }
      if (!grantRecipientsRowIndex) {
        Logger.log(`Rejected: ${studentEmail} not found in Grant_Recipients`);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'not_authorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    rowData.push('Live');                       // data_type
    rowData.push(cohortYear);                   // cohort_year
    rowData.push(data.college_name || '');      // College Name
    rowData.push(data.college_unit_id || '');   // College Unit ID

    // Upsert
    let existingRowIndex = -1;
    if (sheet.getLastRow() > 1) {
      const existingData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i][2] && existingData[i][2].toString().toLowerCase() === studentEmail.toLowerCase()) {
          existingRowIndex = i + 2;
          break;
        }
      }
    }
    if (existingRowIndex > 0) {
      sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
      Logger.log(`Updated existing submission for ${studentEmail} at row ${existingRowIndex}`);
      deleteStudentFromResolver(ss, studentEmail);
    } else {
      sheet.appendRow(rowData);
    }

    // Auto-resolve products
    try {
      processLatestSubmission(ss);
      Logger.log('✅ Resolver processing completed for new submission');
    } catch (resolverError) {
      Logger.log('⚠️ Warning: Resolver failed but form data was saved');
      Logger.log(resolverError.message);
    }

    // Kit confirmation email
    try {
      sendKitConfirmationEmail(ss, Object.assign({}, data, { cohort_year: cohortYear }));
      Logger.log('✅ Kit confirmation email sent to ' + data.email);
    } catch (emailErr) {
      Logger.log('⚠️ Confirmation email (non-fatal): ' + emailErr.message);
    }

    // Update Grant_Recipients: Items Selected + Submission Timestamp
    if (grantRecipientsRowIndex && grantRecipientsSheet) {
      try {
        const submissionTimestamp = Utilities.formatDate(
          new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
        );
        grantRecipientsSheet.getRange(grantRecipientsRowIndex, 10).setValue('Yes');
        grantRecipientsSheet.getRange(grantRecipientsRowIndex, 11).setValue(submissionTimestamp);
        Logger.log(`Updated Grant_Recipients row ${grantRecipientsRowIndex}: Items Selected = Yes`);
      } catch (updateError) {
        Logger.log('Warning: Failed to update Grant_Recipients: ' + updateError.message);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Form submitted successfully' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error processing form submission:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
