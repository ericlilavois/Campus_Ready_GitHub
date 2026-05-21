// ============================================
// CAMPUS READY FOUNDATION - ADMIN FUNCTIONS
// ============================================
// Last updated: May 19, 2026
// Purpose: Administrative functions for Application Reviews system
//   - Transfer approved recipients to Grant Fulfillment Database
//   - Archive completed cohorts
//   - Send award decision emails (winner and non-winner) to applicants
//
// NOTE: Variable names use ADMIN_ prefix to avoid conflicts with
// the Application Submission script which uses CONFIG.

// ============================================
// CONFIGURATION
// ============================================

const ADMIN_GRANT_FULFILLMENT_DB_ID = '1jOOev4f8w6HzekRNRxMN6nwYfTCJ5dJKrqzK4zfcYVk';
const ADMIN_MASTER_SHEET_NAME = 'Master';
const ADMIN_CONFIG_TAB_NAME = 'Config Tab';
const ADMIN_ARCHIVE_SHEET_NAME = 'Archive';
const ADMIN_FINAL_REVIEW_SHEET_NAME = 'Final_Review';
const ADMIN_BOARD_ESSAYS_SHEET_NAME = 'Board_Essays';

// ============================================
// MENU CREATION
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Grant Fulfillment')
    .addItem('Transfer Winners to Grant Fulfillment', 'transferWinnersToGrantFulfillment')
    .addToUi();

  ui.createMenu('Archive')
    .addItem('Archive Current Cohort', 'archiveCohort')
    .addToUi();

  ui.createMenu('CRF Admin')
    .addItem('Import Board Scores', 'importBoardScores')
    .addItem('Send Award Decision Emails', 'sendAwardDecisionEmails')
    .addToUi();
}

// ============================================
// ARCHIVE FUNCTIONS
// ============================================

/**
 * Main archive function - archives the current cohort to the Archive tab
 * Reads cohort year from Config Tab B1
 */
function archiveCohort() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Get cohort year from Config Tab
  const cohortYear = getCohortYearFromConfig(ss);
  if (!cohortYear) {
    ui.alert(
      'Cannot Determine Cohort Year',
      'Could not read the cohort year from Config Tab cell B1.\n\n' +
      'Please ensure Config Tab exists and B1 contains a valid year (e.g., 2026).',
      ui.ButtonSet.OK
    );
    return;
  }

  // 2. Pre-flight checks
  const masterSheet = ss.getSheetByName(ADMIN_MASTER_SHEET_NAME);
  if (!masterSheet) {
    ui.alert('Error', 'Master sheet not found.', ui.ButtonSet.OK);
    return;
  }

  const finalReviewSheet = ss.getSheetByName(ADMIN_FINAL_REVIEW_SHEET_NAME);
  if (!finalReviewSheet) {
    ui.alert(
      'Final_Review Tab Not Found',
      'Cannot find the Final_Review tab.\n\n' +
      'Please ensure the tab exists and is named exactly "Final_Review".',
      ui.ButtonSet.OK
    );
    return;
  }

  // 3. Ensure Archive tab exists (create if not)
  let archiveSheet = ss.getSheetByName(ADMIN_ARCHIVE_SHEET_NAME);
  if (!archiveSheet) {
    archiveSheet = createArchiveTab(ss, masterSheet);
    if (!archiveSheet) {
      ui.alert('Error', 'Failed to create Archive tab.', ui.ButtonSet.OK);
      return;
    }
  }

  // 4. Check for Waitlist records
  const waitlistCheck = checkForWaitlist(finalReviewSheet);
  if (waitlistCheck.hasWaitlist) {
    ui.alert(
      'Cannot Archive: Waitlist Records Found',
      'The following ' + waitlistCheck.count + ' student(s) are still on Waitlist:\n\n' +
      waitlistCheck.names.join('\n') + '\n\n' +
      'Please resolve all Waitlist records (change to Awarded or Denied) before archiving.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 5. Count records to archive
  const recordsToArchive = getRecordsToArchive(masterSheet, cohortYear);
  if (recordsToArchive.length === 0) {
    ui.alert(
      'No Records Found',
      'No records found for the ' + cohortYear + ' cohort in the Master sheet.\n\n' +
      'Verify Config Tab B1 contains the correct year.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 6. Build Award Status map from Final_Review
  const awardStatusMap = buildAwardStatusMap(finalReviewSheet);

  // 7. Check for missing Award Status
  const missingStatus = [];
  recordsToArchive.forEach(record => {
    const appId = record.data[0]; // Column A = Application ID
    if (!awardStatusMap[appId]) {
      missingStatus.push(appId);
    }
  });

  if (missingStatus.length > 0) {
    ui.alert(
      'Missing Award Status',
      'The following Application IDs do not have an Award Status in Final_Review:\n\n' +
      missingStatus.slice(0, 10).join('\n') +
      (missingStatus.length > 10 ? '\n... and ' + (missingStatus.length - 10) + ' more' : '') +
      '\n\nPlease ensure all applications have an Award Status (Awarded or Denied) before archiving.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 8. Confirmation dialog
  const confirmation = ui.alert(
    'Archive ' + recordsToArchive.length + ' Records?',
    'You are about to archive ' + recordsToArchive.length + ' records from the ' + cohortYear + ' cohort.\n\n' +
    'This will:\n' +
    '• Move all application data to the Archive tab\n' +
    '• Add Award Status (Awarded/Denied) to each record\n' +
    '• Clear data from working tabs (Final_Review, Board_Essays)\n' +
    '• Delete archived rows from Master\n' +
    '• Preserve all formulas and headers\n\n' +
    'This cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    return;
  }

  // 9. Execute archive
  try {
    const result = executeArchive(ss, masterSheet, archiveSheet, recordsToArchive, awardStatusMap, cohortYear);

    // 10. Success message
    ui.alert(
      'Archive Complete!',
      result.archivedCount + ' records archived for the ' + cohortYear + ' cohort.\n\n' +
      'Award breakdown:\n' +
      '• Awarded: ' + result.awardedCount + '\n' +
      '• Denied: ' + result.deniedCount + '\n\n' +
      'Working tabs cleared and ready for next cohort.\n\n' +
      'Next step: Update Config Tab B1 to ' + (cohortYear + 1) + ' when ready to begin the new cycle.',
      ui.ButtonSet.OK
    );

    Logger.log('Archive complete: ' + result.archivedCount + ' records for cohort ' + cohortYear);

  } catch (error) {
    ui.alert(
      'Archive Error',
      'An error occurred during archiving:\n\n' + error.message + '\n\n' +
      'Some data may have been partially archived. Please check the Archive tab and Master sheet.',
      ui.ButtonSet.OK
    );
    Logger.log('Archive error: ' + error.message);
  }
}

/**
 * Creates the Archive tab with headers matching Master plus Award Status
 */
function createArchiveTab(ss, masterSheet) {
  const archiveSheet = ss.insertSheet(ADMIN_ARCHIVE_SHEET_NAME);

  // Get headers from Master (row 1)
  const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];

  // Add "Award Status" as the final column
  const archiveHeaders = [...masterHeaders, 'Award Status'];

  // Write headers to Archive
  archiveSheet.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);

  // Format header row
  const headerRange = archiveSheet.getRange(1, 1, 1, archiveHeaders.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');

  // Freeze header row
  archiveSheet.setFrozenRows(1);

  // Hide the sheet (Archive should be hidden by default)
  archiveSheet.hideSheet();

  Logger.log('Created Archive tab with ' + archiveHeaders.length + ' columns');
  return archiveSheet;
}

/**
 * Checks Final_Review for any Waitlist records
 * Returns object with hasWaitlist, count, and names array
 */
function checkForWaitlist(finalReviewSheet) {
  const result = { hasWaitlist: false, count: 0, names: [] };

  // Final_Review: headers in row 3, data starts row 4
  // Need to find Award Status column and Student Name column
  const headerRow = 3;
  const headers = finalReviewSheet.getRange(headerRow, 1, 1, finalReviewSheet.getLastColumn()).getValues()[0];

  let awardStatusCol = -1;
  let studentNameCol = -1;

  headers.forEach((header, index) => {
    if (header === 'Award Status') awardStatusCol = index;
    if (header === 'Student Name') studentNameCol = index;
  });

  if (awardStatusCol === -1) {
    Logger.log('Award Status column not found in Final_Review');
    return result;
  }

  // Get all data rows
  const lastRow = finalReviewSheet.getLastRow();
  if (lastRow < 4) return result; // No data rows

  const dataRange = finalReviewSheet.getRange(4, 1, lastRow - 3, finalReviewSheet.getLastColumn());
  const data = dataRange.getValues();

  data.forEach(row => {
    if (row[awardStatusCol] === 'Waitlist') {
      result.hasWaitlist = true;
      result.count++;
      if (studentNameCol !== -1 && row[studentNameCol]) {
        result.names.push(row[studentNameCol]);
      }
    }
  });

  return result;
}

/**
 * Gets all records from Master that match the cohort year
 * Returns array of objects with rowNumber and data array
 */
function getRecordsToArchive(masterSheet, cohortYear) {
  const records = [];
  const lastRow = masterSheet.getLastRow();

  if (lastRow < 2) return records; // No data rows

  // Get all data (excluding header row 1)
  const dataRange = masterSheet.getRange(2, 1, lastRow - 1, masterSheet.getLastColumn());
  const data = dataRange.getValues();

  // Column C (index 2) is Cycle Year
  data.forEach((row, index) => {
    const rowCycleYear = row[2]; // Column C = Cycle Year
    if (rowCycleYear === cohortYear || rowCycleYear === String(cohortYear)) {
      records.push({
        rowNumber: index + 2, // +2 because index is 0-based and we skip header
        data: row
      });
    }
  });

  return records;
}

/**
 * Builds a map of Application ID -> Award Status from Final_Review
 */
function buildAwardStatusMap(finalReviewSheet) {
  const statusMap = {};

  // Final_Review: headers in row 3, data starts row 4
  const headerRow = 3;
  const headers = finalReviewSheet.getRange(headerRow, 1, 1, finalReviewSheet.getLastColumn()).getValues()[0];

  let appIdCol = -1;
  let awardStatusCol = -1;

  headers.forEach((header, index) => {
    if (header === 'Application ID') appIdCol = index;
    if (header === 'Award Status') awardStatusCol = index;
  });

  if (appIdCol === -1 || awardStatusCol === -1) {
    Logger.log('Required columns not found in Final_Review');
    return statusMap;
  }

  const lastRow = finalReviewSheet.getLastRow();
  if (lastRow < 4) return statusMap;

  const dataRange = finalReviewSheet.getRange(4, 1, lastRow - 3, finalReviewSheet.getLastColumn());
  const data = dataRange.getValues();

  data.forEach(row => {
    const appId = row[appIdCol];
    const status = row[awardStatusCol];
    if (appId && status) {
      statusMap[appId] = status;
    }
  });

  return statusMap;
}

/**
 * Executes the archive operation
 * Returns object with archivedCount, awardedCount, deniedCount
 */
function executeArchive(ss, masterSheet, archiveSheet, recordsToArchive, awardStatusMap, cohortYear) {
  let awardedCount = 0;
  let deniedCount = 0;

  // 1. Prepare rows for Archive (add Award Status column)
  const archiveRows = recordsToArchive.map(record => {
    const appId = record.data[0]; // Column A = Application ID
    const awardStatus = awardStatusMap[appId] || 'Unknown';

    if (awardStatus === 'Awarded') awardedCount++;
    else if (awardStatus === 'Denied') deniedCount++;

    return [...record.data, awardStatus];
  });

  // 2. Append to Archive tab
  const archiveStartRow = archiveSheet.getLastRow() + 1;
  if (archiveRows.length > 0) {
    archiveSheet.getRange(archiveStartRow, 1, archiveRows.length, archiveRows[0].length)
      .setValues(archiveRows);
  }

  // 3. Delete from Master (in reverse order to preserve row numbers)
  const rowsToDelete = recordsToArchive.map(r => r.rowNumber).sort((a, b) => b - a);
  rowsToDelete.forEach(rowNum => {
    masterSheet.deleteRow(rowNum);
  });

  // 4. Clear subsidiary tabs
  clearFinalReview(ss);
  clearBoardEssays(ss);

  return {
    archivedCount: recordsToArchive.length,
    awardedCount: awardedCount,
    deniedCount: deniedCount
  };
}

/**
 * Clears Final_Review data rows (preserves headers in row 3)
 */
function clearFinalReview(ss) {
  const sheet = ss.getSheetByName(ADMIN_FINAL_REVIEW_SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return; // No data to clear

  const lastCol = sheet.getLastColumn();

  // Clear rows 4 and below (data rows)
  sheet.getRange(4, 1, lastRow - 3, lastCol).clearContent();

  Logger.log('Cleared Final_Review data rows');
}

/**
 * Clears Board_Essays score entry columns only (preserves formulas and FILTER)
 * Surgical approach: clears only manual entry columns
 */
function clearBoardEssays(ss) {
  const sheet = ss.getSheetByName(ADMIN_BOARD_ESSAYS_SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return; // No data to clear (header row + formula rows)

  // Get headers to identify score columns
  // Board_Essays has headers - need to find columns that are score entry columns
  // These are typically named like "Eric Lilavois Essay 1 Score", etc.
  // We want to preserve: Application ID (FILTER formula), and Average columns (formulas)

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Identify columns to clear (score entry columns contain "Score" but not "Avg")
  const columnsToClear = [];
  headerRow.forEach((header, index) => {
    const headerStr = String(header);
    // Clear columns that are individual scorer columns (contain "Essay" and "Score" but not "Avg")
    if (headerStr.includes('Essay') && headerStr.includes('Score') && !headerStr.includes('Avg')) {
      columnsToClear.push(index + 1); // 1-indexed
    }
  });

  // Clear each score column (data rows only, starting at row 4)
  // Row 3 typically has the FILTER formula, data starts row 4
  const dataStartRow = 4;
  const numDataRows = lastRow - dataStartRow + 1;

  if (numDataRows > 0) {
    columnsToClear.forEach(col => {
      sheet.getRange(dataStartRow, col, numDataRows, 1).clearContent();
    });
  }

  Logger.log('Cleared ' + columnsToClear.length + ' score columns in Board_Essays');
}

/**
 * Gets the cohort year from Config Tab cell B1
 */
function getCohortYearFromConfig(ss) {
  const configSheet = ss.getSheetByName(ADMIN_CONFIG_TAB_NAME);
  if (!configSheet) {
    Logger.log('Config Tab not found');
    return null;
  }

  const yearValue = configSheet.getRange('B1').getValue();
  if (yearValue && !isNaN(yearValue)) {
    return parseInt(yearValue);
  }

  return null;
}

// ============================================
// GRANT FULFILLMENT FUNCTIONS
// ============================================

/**
 * Transfers awarded recipients from Final_Review to Grant Fulfillment Database
 */
function transferWinnersToGrantFulfillment() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();

  // 1. Verify we're on a Final Review tab
  if (!sheetName.includes('Final Review') && !sheetName.includes('Final_Review')) {
    ui.alert(
      'Wrong Sheet',
      'Please run this from the Final_Review tab.\n\n' +
      'Current sheet: ' + sheetName,
      ui.ButtonSet.OK
    );
    return;
  }

  // 2. Get cohort year from Config Tab
  const cohortYear = getCohortYearFromConfig(ss);
  if (!cohortYear) {
    ui.alert(
      'Cannot Determine Cohort Year',
      'Could not read the cohort year from Config Tab cell B1.\n\n' +
      'Please ensure Config Tab exists and B1 contains a valid year.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 3. Get all data from current sheet
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) {
    ui.alert(
      'No Data Found',
      'This sheet appears to be empty. Please add approved recipients first.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 4. Get column headers (Final Review has headers in row 3)
  const headerRow = 3;
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });

  // 5. Verify required columns exist
  const requiredColumns = ['Student Name', 'Application ID', 'Award Status'];
  const missingColumns = requiredColumns.filter(col => headerMap[col] === undefined);

  if (missingColumns.length > 0) {
    ui.alert(
      'Missing Required Columns',
      'Cannot find these required columns:\n' + missingColumns.join('\n') + '\n\n' +
      'Please ensure your sheet has "Student Name", "Application ID", and "Award Status" columns.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Try to find email column (could be "Email Address" or just "Email")
  let emailCol = headerMap['Email Address'];
  if (emailCol === undefined) {
    emailCol = headerMap['Email'];
  }

  if (emailCol === undefined) {
    ui.alert(
      'Missing Email Column',
      'Cannot find email column.\n\n' +
      'Please ensure your sheet has either "Email Address" or "Email" column.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 6. Check if "Transferred" column exists
  const transferredCol = headerMap['Transferred'];

  // 7. Get all recipient data (data starts at row 4)
  const dataStartRow = 4;
  const dataRange = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, sheet.getLastColumn());
  const data = dataRange.getValues();

  // 8. Filter for recipients that haven't been transferred yet
  const newRecipients = [];
  data.forEach((row, index) => {
    const studentName = row[headerMap['Student Name']];
    const applicationId = row[headerMap['Application ID']];
    const email = row[emailCol];
    const awardStatus = row[headerMap['Award Status']];

    // Skip empty rows
    if (!studentName || !applicationId || !email) {
      return;
    }

    // Only transfer students with Award Status = "Awarded"
    if (awardStatus !== 'Awarded') {
      return;
    }

    // Check if already transferred (if column exists)
    if (transferredCol !== undefined && row[transferredCol] === 'Yes') {
      return;
    }

    newRecipients.push({
      applicationId: applicationId,
      studentName: studentName,
      email: email,
      rowIndex: index + dataStartRow
    });
  });

  if (newRecipients.length === 0) {
    ui.alert(
      'No New Recipients',
      'All recipients in this sheet have already been transferred.\n\n' +
      'If you need to add more recipients, add them to this sheet first.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 9. Confirm with user
  const confirmation = ui.alert(
    'Transfer ' + newRecipients.length + ' Recipients?',
    'You are about to transfer ' + newRecipients.length + ' approved recipients from the ' +
    cohortYear + ' cohort to Grant Fulfillment Database.\n\n' +
    'These students will be able to access the kit customization form.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    return;
  }

  // 10. Open Grant Fulfillment Database
  let gfDatabase;
  try {
    gfDatabase = SpreadsheetApp.openById(ADMIN_GRANT_FULFILLMENT_DB_ID);
  } catch (error) {
    ui.alert(
      'Cannot Access Grant Fulfillment Database',
      'Error: ' + error.message + '\n\n' +
      'Please verify:\n' +
      '1. The ADMIN_GRANT_FULFILLMENT_DB_ID is correct in the script\n' +
      '2. You have edit access to the Grant Fulfillment Database\n' +
      '3. The file has not been deleted or moved',
      ui.ButtonSet.OK
    );
    return;
  }

  // 11. Get Grant_Recipients sheet
  let grantRecipientsSheet = gfDatabase.getSheetByName('Grant_Recipients');

  if (!grantRecipientsSheet) {
    ui.alert(
      'Grant_Recipients Tab Not Found',
      'The Grant_Recipients tab does not exist in the Grant Fulfillment Database.\n\n' +
      'Please create it first following the setup instructions.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 12. Get Start Dates from Master sheet
  const masterSheet = ss.getSheetByName(ADMIN_MASTER_SHEET_NAME);
  const startDateMap = {};
  const phoneMap = {};

  if (masterSheet) {
    const masterData = masterSheet.getDataRange().getValues();
    const masterHeaders = masterData[0];
    const appIdCol = masterHeaders.indexOf('Application ID');
    const startDateCol = masterHeaders.indexOf('Expected Start Date');

    const phoneCol = masterHeaders.indexOf('Student Phone');

    if (appIdCol !== -1 && startDateCol !== -1) {
      for (let i = 1; i < masterData.length; i++) {
        const appId = masterData[i][appIdCol];
        const startDate = masterData[i][startDateCol];
        if (appId && startDate) {
          startDateMap[appId] = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        if (appId && phoneCol !== -1 && masterData[i][phoneCol]) {
          phoneMap[appId] = masterData[i][phoneCol];
        }
      }
    }
  }

  // 13. Prepare data for Grant_Recipients
  const today = new Date();
  const transferDate = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const rowsToAdd = newRecipients.map(recipient => [
    recipient.applicationId,                          // A: Application ID
    recipient.studentName,                            // B: Student Name
    recipient.email,                                  // C: Email Address
    cohortYear,                                       // D: Cohort Year
    transferDate,                                     // E: Transfer Date
    'Pending',                                        // F: Housing Status
    '',                                               // G: Housing Doc URL
    'Pending',                                        // H: Acceptance Status
    '',                                               // I: Acceptance Doc URL
    'No',                                             // J: Items Selected
    '',                                               // K: Submission Timestamp
    '',                                               // L: Rejection Email Sent
    '',                                               // M: Rejection Count
    startDateMap[recipient.applicationId] || '',      // N: Start Date
    '',                                               // O: Testimonial Invited
    '',                                               // P: Submission URL
    '',                                               // Q: Release Signed
    '',                                               // R: Gift Card Sent
    phoneMap[recipient.applicationId] || ''           // S: Phone
  ]);

  // 14. Append to Grant_Recipients
  try {
    const startRow = grantRecipientsSheet.getLastRow() + 1;
grantRecipientsSheet.getRange(startRow, 1, rowsToAdd.length, 19).setValues(rowsToAdd);
  } catch (error) {
    ui.alert(
      'Error Writing to Grant_Recipients',
      'Error: ' + error.message + '\n\n' +
      'The transfer was not completed. No data was changed.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 15. Mark as transferred
  if (transferredCol !== undefined) {
    newRecipients.forEach(recipient => {
      sheet.getRange(recipient.rowIndex, transferredCol + 1).setValue('Yes');
    });
  } else {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(headerRow, lastCol + 1).setValue('Transferred');
    newRecipients.forEach(recipient => {
      sheet.getRange(recipient.rowIndex, lastCol + 1).setValue('Yes');
    });
  }

  // 16. Success message
  ui.alert(
    'Transfer Complete!',
    newRecipients.length + ' recipients successfully transferred to Grant Fulfillment Database.\n\n' +
    'Cohort: ' + cohortYear + '\n' +
    'Date: ' + transferDate + '\n\n' +
    'These students can now access the kit customization form once they receive their notification email.',
    ui.ButtonSet.OK
  );

  Logger.log('Transfer complete: ' + newRecipients.length + ' recipients transferred for cohort ' + cohortYear);
}

// ============================================
// AWARD DECISION EMAILS
// ============================================

function sendAwardDecisionEmails() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Final_Review');

  if (!sheet) {
    ui.alert('Error', 'Final_Review tab not found.', ui.ButtonSet.OK);
    return;
  }

  const headerRow = 3;
  const dataStartRow = 4;
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h] = i; });

  // Locate required columns
  const nameCol = headerMap['Student Name'];
  const emailCol = headerMap['Email Address'] !== undefined ? headerMap['Email Address'] : headerMap['Email'];
  const awardStatusCol = headerMap['Award Status'];
  let emailSentCol = headerMap['Award Email Sent'];

  // Create Award Email Sent column if it doesn't exist
  if (emailSentCol === undefined) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(headerRow, newCol).setValue('Award Email Sent');
    emailSentCol = newCol - 1; // convert to 0-based index
  }

  if (nameCol === undefined || emailCol === undefined || awardStatusCol === undefined) {
    ui.alert('Missing Columns', 'Could not find required columns: Student Name, Email, Award Status.', ui.ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < dataStartRow) {
    ui.alert('No Data', 'No student records found in Final_Review.', ui.ButtonSet.OK);
    return;
  }

  const data = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, sheet.getLastColumn()).getValues();

  // Build send list
  const toSend = [];
  data.forEach((row, i) => {
    const name = row[nameCol];
    const email = row[emailCol];
    const status = row[awardStatusCol];
    const alreadySent = row[emailSentCol];

    if (!name || !email) return;
    if (status !== 'Awarded' && status !== 'Denied') return;
    if (alreadySent === 'Yes') return;

    toSend.push({
      rowIndex: i + dataStartRow,
      firstName: name.toString().split(' ')[0],
      email: email.toString(),
      status: status
    });
  });

  if (toSend.length === 0) {
    ui.alert('Nothing to Send', 'No eligible students found. All may have already been notified, or no Award Status has been set.', ui.ButtonSet.OK);
    return;
  }

  const winners = toSend.filter(s => s.status === 'Awarded').length;
  const nonWinners = toSend.filter(s => s.status === 'Denied').length;

  const confirm = ui.alert(
    'Send Award Decision Emails?',
    'Ready to send ' + toSend.length + ' email(s):\n\n• Winner emails: ' + winners + '\n• Non-winner emails: ' + nonWinners + '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  let successCount = 0;
  let failCount = 0;
  const timestamp = new Date();

  toSend.forEach(student => {
    try {
      if (student.status === 'Awarded') {
        sendWinnerEmail(student.firstName, student.email);
      } else {
        sendNonWinnerEmail(student.firstName, student.email);
      }
      // Mark as sent
      sheet.getRange(student.rowIndex, emailSentCol + 1).setValue('Yes');
      sheet.getRange(student.rowIndex, emailSentCol + 2).setValue(timestamp);
      successCount++;
      Logger.log('Award email sent (' + student.status + '): ' + student.email);
    } catch (error) {
      failCount++;
      Logger.log('Failed to send to ' + student.email + ': ' + error.message);
    }
  });

  let summary = successCount + ' email(s) sent successfully.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';

  ui.alert('Done', summary, ui.ButtonSet.OK);
}

function sendWinnerEmail(firstName, email) {
  const subject = 'Congratulations from Campus Ready Foundation';

  const htmlBody = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n' +
'</head>\n' +
'<body style="margin:0;padding:0;background:#f9fafb;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">\n' +
'\n' +
'    <div style="background:#469E92;padding:40px 32px;text-align:center;">\n' +
'      <p style="font-family:\'Playfair Display\',Georgia,serif;font-size:32px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.5px;">You\'re in!</p>\n' +
'    </div>\n' +
'\n' +
'    <div style="padding:32px;font-size:15px;line-height:1.7;color:#231F20;">\n' +
'      <p style="margin:0 0 20px;">Congratulations ' + firstName + ',</p>\n' +
'      <p style="margin:0 0 24px;">You\'ve earned a Campus Ready Foundation grant.</p>\n' +
'\n' +
'      <p style="font-weight:600;margin:0 0 12px;font-size:17px;">Here\'s what you\'ll be receiving</p>\n' +
'\n' +
'      <table style="width:100%;margin:0 0 28px;border-collapse:collapse;">\n' +
'        <tr><td style="padding:6px 0;vertical-align:top;width:12px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#469E92;margin-top:7px;"></span></td><td style="padding:6px 0 6px 10px;"><strong>Move-in essentials, personalized for you:</strong> bedding, towels, personal care items, and room basics, chosen around your style and preferences and delivered before move-in</td></tr>\n' +
'        <tr><td style="padding:6px 0;vertical-align:top;width:12px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#469E92;margin-top:7px;"></span></td><td style="padding:6px 0 6px 10px;"><strong>Travel support</strong> to help cover the cost of getting to campus</td></tr>\n' +
'        <tr><td style="padding:6px 0;vertical-align:top;width:12px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#469E92;margin-top:7px;"></span></td><td style="padding:6px 0 6px 10px;"><strong>DoorDash credits</strong> for your first days: meals and groceries while you\'re getting settled</td></tr>\n' +
'        <tr><td style="padding:6px 0;vertical-align:top;width:12px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#469E92;margin-top:7px;"></span></td><td style="padding:6px 0 6px 10px;"><strong>A gift card for incidentals:</strong> because there\'s always something else you need</td></tr>\n' +
'      </table>\n' +
'\n' +
'      <p style="font-weight:600;margin:0 0 16px;font-size:17px;">Here\'s what happens next</p>\n' +
'\n' +
'      <table style="width:100%;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;border-spacing:0;margin:0 0 28px;overflow:hidden;">\n' +
'        <tr>\n' +
'          <td style="padding:16px 20px;vertical-align:top;border-bottom:1px solid #e5e7eb;width:80px;font-weight:600;font-size:13px;color:#469E92;white-space:nowrap;">July 1</td>\n' +
'          <td style="padding:16px 20px;font-size:14px;border-bottom:1px solid #e5e7eb;">We\'ll send you a link to upload two documents: your housing confirmation and your college acceptance letter. Once we\'ve approved them, we\'ll send you a preferences form to help us personalize your products.</td>\n' +
'        </tr>\n' +
'        <tr>\n' +
'          <td style="padding:16px 20px;vertical-align:top;border-bottom:1px solid #e5e7eb;width:80px;font-weight:600;font-size:13px;color:#469E92;white-space:nowrap;">July 15</td>\n' +
'          <td style="padding:16px 20px;font-size:14px;border-bottom:1px solid #e5e7eb;">Join us for our Orientation &amp; Celebration, where you\'ll meet the team, finalize your award details, and hear everything you need to know about move-in. You can attend in person or on Zoom. Details coming soon. Save the date.</td>\n' +
'        </tr>\n' +
'        <tr>\n' +
'          <td style="padding:16px 20px;vertical-align:top;width:80px;font-weight:600;font-size:13px;color:#469E92;line-height:1.4;">2 weeks before move-in</td>\n' +
'          <td style="padding:16px 20px;font-size:14px;">Your items arrive.</td>\n' +
'        </tr>\n' +
'      </table>\n' +
'\n' +
'      <p style="margin:0 0 20px;">Questions before then? Reach us at <a href="mailto:hello@campusready.org" style="color:#469E92;text-decoration:none;">hello@campusready.org</a>.</p>\n' +
'      <p style="margin:0 0 32px;">We\'re proud of you, and we\'ll be in touch. Now, have a great summer!</p>\n' +
'\n' +
'      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">\n' +
'        <p style="margin:0 0 4px;font-weight:600;">The Campus Ready Foundation Team</p>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';

  const textBody = 'Congratulations ' + firstName + ',\n\n' +
'You\'ve earned a Campus Ready Foundation grant.\n\n' +
'Here\'s what you\'ll be receiving:\n' +
'• Move-in essentials, personalized for you: bedding, towels, personal care items, and room basics\n' +
'• Travel support to help cover the cost of getting to campus\n' +
'• DoorDash credits for your first days\n' +
'• A gift card for incidentals\n\n' +
'Here\'s what happens next:\n\n' +
'July 1 — We\'ll send you a link to upload your housing confirmation and college acceptance letter. Once approved, we\'ll send you a preferences form.\n\n' +
'July 15 — Join us for our Orientation & Celebration. In person or Zoom. Details coming soon.\n\n' +
'2 weeks before move-in — Your items arrive.\n\n' +
'Questions? hello@campusready.org\n\n' +
'We\'re proud of you, and we\'ll be in touch. Now, have a great summer!\n\n' +
'The Campus Ready Foundation Team';

  GmailApp.sendEmail(email, subject, textBody, {
    htmlBody: htmlBody,
    name: 'Campus Ready Foundation',
    from: 'hello@campusready.org',
    replyTo: 'hello@campusready.org'
  });
}

function sendNonWinnerEmail(firstName, email) {
  const subject = 'Campus Ready Foundation';

  const htmlBody = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n' +
'</head>\n' +
'<body style="margin:0;padding:0;background:#f9fafb;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' +
'  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">\n' +
'\n' +
'    <div style="background:#469E92;padding:40px 32px;text-align:center;">\n' +
'      <p style="font-family:\'Playfair Display\',Georgia,serif;font-size:32px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.5px;">Thank you for applying.</p>\n' +
'    </div>\n' +
'\n' +
'    <div style="padding:32px;font-size:15px;line-height:1.7;color:#231F20;">\n' +
'      <p style="margin:0 0 20px;">Hi ' + firstName + ',</p>\n' +
'      <p style="margin:0 0 20px;">After a careful review of all applications, we are not able to offer you a grant this cycle.</p>\n' +
'      <p style="margin:0 0 20px;">This was not an easy decision. Every application we received represented a real student with real needs, and yours was no exception. We\'re grateful you trusted us with your story.</p>\n' +
'      <p style="margin:0 0 32px;">We\'re rooting for you. College is a big step, and we hope your first year is everything you worked for.</p>\n' +
'\n' +
'      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">\n' +
'        <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Have a great summer,</p>\n' +
'        <p style="margin:0 0 4px;font-weight:600;">The Campus Ready Foundation Team</p>\n' +
'        <a href="https://campusready.org" style="color:#469E92;text-decoration:none;font-size:14px;">campusready.org</a>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';

  const textBody = 'Hi ' + firstName + ',\n\n' +
'After a careful review of all applications, we are not able to offer you a grant this cycle.\n\n' +
'This was not an easy decision. Every application we received represented a real student with real needs, and yours was no exception. We\'re grateful you trusted us with your story.\n\n' +
'We\'re rooting for you. College is a big step, and we hope your first year is everything you worked for.\n\n' +
'Have a great summer,\n' +
'The Campus Ready Foundation Team\n' +
'campusready.org';

  GmailApp.sendEmail(email, subject, textBody, {
    htmlBody: htmlBody,
    name: 'Campus Ready Foundation',
    from: 'hello@campusready.org',
    replyTo: 'hello@campusready.org'
  });
}

function testWinnerEmail() {
  sendWinnerEmail('Eric', 'eric@campusready.org');
  Logger.log('Test winner email sent to eric@campusready.org');
}

function testNonWinnerEmail() {
  sendNonWinnerEmail('Eric', 'eric@campusready.org');
  Logger.log('Test non-winner email sent to eric@campusready.org');
}

// ============================================
// END OF SCRIPT
// ============================================
