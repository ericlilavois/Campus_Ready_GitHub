// === CAMPUS READY FOUNDATION - APPLICATION SUBMISSION SCRIPT ===
// Version 3.0 - Sync/Async Refactor
// Changes from 2.1:
//   - doPost now returns in <3 seconds (no PDF, Maps, or email during submission)
//   - Background trigger generates PDF, calculates distance, sends confirmation email
//   - Duplicate detection: one application per email per cycle year
//   - Daily staff digest replaces per-submission staff notifications
//   - Rate-limited error alerts to apply@campusready.org
//   - Stuck-row sweeper recovers background failures
//
// Before using: run installTriggers() once from the editor to install the
// three time-driven triggers (queue processor, stuck-row sweeper, daily digest).

// === CONFIGURATION ===
const CONFIG = {
  SPREADSHEET_ID: '1utgR5xiHElarYMAj-jg_ReY7ZQMrzqFYb6wKOCPWB4s',
  STAFF_EMAILS: ['apply@campusready.org', 'kdantzler@gmail.com', 'jg4art@aol.com'],
  REDIRECT_URL: 'https://campusready.org',
  PDF_FOLDER_ID: '1H7EQRF29pNp5r8NKJqDoz1HK92FyE1xW',
  MASTER_SHEET_NAME: 'Master',
  PENDING_DATA_SHEET_NAME: 'PendingData',
  GOOGLE_MAPS_API_KEY: 'AIzaSyCYL-tBCsyCGplPy2Dmrk27Ro-RiXR1r3Y',
  // v3.0 additions:
  ALERT_EMAIL: 'eric@campusready.org',
  BATCH_SIZE: 15,                         // Max rows processed per background run
  BATCH_WALL_CLOCK_MS: 270000,            // 4.5 min safety under 6 min Apps Script cap
  STUCK_ROW_MINUTES: 15,                  // Rows stuck in Processing longer than this get recovered
  SYNC_LOCK_TIMEOUT_MS: 10000,            // doPost lock wait ceiling
  CLAIM_LOCK_TIMEOUT_MS: 5000,            // Background claim lock wait ceiling
  ALERT_RATE_LIMIT_MS: 3600000,           // 1 hour per unique alert signature
  EMAIL_RETRY_ATTEMPTS: 3,                // Exponential backoff on confirmation email
  DIGEST_TIMEZONE: 'America/Los_Angeles',
  DIGEST_HOUR: 7                          // 7am Pacific
};

// === COLUMN POSITIONS (Master sheet, 1-indexed) ===
// These are constants for clarity. Master column order is fixed - do not change.
const COL = {
  APP_ID: 1,              // A
  TIMESTAMP: 2,           // B
  CYCLE_YEAR: 3,          // C
  STUDENT_NAME: 10,       // J
  STUDENT_EMAIL: 11,      // K
  COLLEGE: 18,            // R
  HOUSEHOLD_MEMBERS: 24,  // X
  HOUSEHOLD_INCOME: 25,   // Y
  PDF_URL: 35,            // AI
  PDF_FILE_ID: 36,        // AJ
  STATUS: 37,             // AK
  PROCESSING_STARTED: 38, // AL - timestamp when row was claimed by background worker
  DISTANCE: 39,           // AM
  // Columns AN (40) through AW (49) are scoring/derived data managed by
  // staff, formulas, and Board_Score_Import — the row writer does NOT touch
  // them. Distance Points, Circumstances Points, Financial Needs Points,
  // Essay 1/2 Scores, Housing Verified, Total Score, New Rank, Income Per
  // Person, Avg Essay Score.
  COLLEGE_ID: 50          // AX - IPEDS UNITID from the college picker (Phase 2)
};

// === MAIN ENTRY POINT (SYNC PATH) ===
// Target runtime: under 3 seconds.
// Responsibilities: parse, lock, dedup check, write Master + PendingData, return success.
// Everything else (PDF, distance, email) runs in processBackgroundQueue().
function doPost(e) {
  const t0 = Date.now();
  try {
    console.log('=== NEW APPLICATION SUBMISSION ===');

    const data = parseFormData(e);
    console.log('Parsed data for:', data.student_name);

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(CONFIG.SYNC_LOCK_TIMEOUT_MS)) {
      console.error('Could not acquire script lock within ' + CONFIG.SYNC_LOCK_TIMEOUT_MS + 'ms');
      return createErrorPage(new Error('The system is experiencing heavy load. Please wait a moment and try again.'));
    }

    let applicationId = null;
    let existingAppId = null;

    try {
      const cycleYear = computeCycleYear(new Date());
      existingAppId = checkForDuplicate(data.student_email, cycleYear);

      if (!existingAppId) {
        applicationId = generateApplicationId();
        console.log('Generated ID:', applicationId);

        const rowNumber = writeMasterRowPending(data, applicationId);
        console.log('Written to Master row:', rowNumber);

        writePendingData(applicationId, data);
        console.log('Pending data stored');
      }
    } finally {
      lock.releaseLock();
    }

    const elapsed = Date.now() - t0;
    console.log('PERF doPost total(ms): ' + elapsed);

    if (existingAppId) {
      console.log('Duplicate detected. Existing App ID:', existingAppId);
      return createAlreadySubmittedPage(existingAppId, data);
    }

    return createSuccessPage(data, applicationId);

  } catch (error) {
    console.error('doPost error:', error);
    return createErrorPage(error);
  }
}

// === DUPLICATE DETECTION ===
// Returns existing App ID if this email has already submitted for this cycle year.
// Returns null otherwise. Called inside the LockService block.
function checkForDuplicate(email, cycleYear) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized) return null;

  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  // Read columns A through K in a single range get (App ID + Cycle Year + Email)
  const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  for (let i = 0; i < values.length; i++) {
    const rowAppId = values[i][0];
    const rowCycleYear = values[i][2];
    const rowEmail = String(values[i][10] || '').trim().toLowerCase();

    if (!rowEmail) continue;

    const yearMatches = rowCycleYear === cycleYear || rowCycleYear === String(cycleYear);
    if (yearMatches && rowEmail === normalized) {
      return rowAppId;
    }
  }
  return null;
}

// === MASTER SHEET WRITING (SYNC) ===
// Writes the row with Status="Pending Processing" and empty PDF URL/Distance.
// Background processor fills those in later.
function writeMasterRowPending(data, applicationId) {
  const sheet = getMasterSheet();
  const targetRow = findNextAvailableRow(sheet);
  const submissionTs = new Date();
  const cycleYear = computeCycleYear(submissionTs);

  const rowData = [
    applicationId,                                     // A: Application ID
    submissionTs,                                      // B: Submission Timestamp
    cycleYear,                                         // C: Cycle Year
    data.applicant_typed_name || '',                   // D: Applicant Typed Name
    toBool(data.applicantSignature),                   // E: Applicant Signed
    isGuardianRequired(data),                          // F: Guardian Required
    data.guardian_typed_name || '',                    // G: Guardian Typed Name
    toBool(data.guardianSignature),                    // H: Guardian Signed
    getConsentSentence(data),                          // I: Consent Sentence
    data.student_name || '',                           // J: Student Full Name
    data.student_email || '',                          // K: Student Email
    data.student_phone || '',                          // L: Student Phone
    data.student_dob || '',                            // M: Date of Birth
    data.student_address || '',                        // N: Home Address
    data.student_city_name || '',                      // O: Home City
    data.student_state || '',                          // P: Home State
    data.student_zip || '',                            // Q: Home ZIP
    data.college || '',                                // R: College Name
    data.college_address || '',                        // S: College Address — empty for 2027+ (field removed in Phase 2)
    data.college_city_name || '',                      // T: College City
    data.college_state || '',                          // U: College State
    data.college_zip || '',                            // V: College ZIP
    data.start_date || '',                             // W: Expected Start Date
    parseInt(data.household_members) || 0,             // X: Household Members
    cleanIncomeValue(data.household_income),           // Y: Household Income
    data.fafsa || '',                                  // Z: FAFSA Completed
    parseFloat(data.sai) || 0,                         // AA: SAI
    buildHouseholdCircumstances(data),                 // AB: Circumstances
    data.accompany || '',                              // AC: Will Accompany to Campus
    buildAffordabilityConcerns(data),                  // AD: Concerns
    data.other_concern_text || '',                     // AE: Other Concern Text
    truncateText(data.essay1, 75),                     // AF: Essay 1 Snippet
    truncateText(data.essay2, 75),                     // AG: Essay 2 Snippet
    countWords(data.essay2),                           // AH: Essay 2 Word Count
    '',                                                // AI: PDF URL (filled by background)
    '',                                                // AJ: PDF File ID (filled by background)
    'Pending Processing',                              // AK: Status
    '',                                                // AL: Processing Started timestamp (set by claimRow)
    ''                                                 // AM: Distance (filled by background)
  ];
  sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);

  // Columns AN (40) through AW (49) are scoring/derived data — do not touch.
  // College UNITID lives at AX (50), past the scoring block, written as a
  // separate single-cell update so the main row array stays at 39 columns
  // and cannot accidentally overwrite a scoring formula or staff entry.
  if (data.college_id) {
    sheet.getRange(targetRow, COL.COLLEGE_ID).setValue(data.college_id);
  }

  return targetRow;
}

// === PENDING DATA STORAGE ===
// A hidden "PendingData" tab stores the full raw form JSON keyed by App ID.
// The background processor reads it, generates the PDF (which needs full essays),
// then deletes the row. Signatures are stripped because they're not used in the PDF.
function getPendingDataSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.PENDING_DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PENDING_DATA_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Application ID', 'Raw Data JSON']]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
    console.log('Created PendingData sheet');
  }
  return sheet;
}

function writePendingData(applicationId, data) {
  const sheet = getPendingDataSheet();
  // Strip heavy signature data (never used in PDF, blows cell size budget if kept)
  const slim = Object.assign({}, data);
  delete slim.applicantSignature;
  delete slim.guardianSignature;

  const json = JSON.stringify(slim);
  if (json.length > 45000) {
    console.warn('PendingData JSON unusually large: ' + json.length + ' chars for ' + applicationId);
  }
  sheet.appendRow([applicationId, json]);
}

function readPendingData(applicationId) {
  const sheet = getPendingDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === applicationId) {
      try {
        return { rowNumber: i + 2, data: JSON.parse(values[i][1]) };
      } catch (err) {
        console.error('Failed to parse PendingData for ' + applicationId + ': ' + err.message);
        return null;
      }
    }
  }
  return null;
}

function deletePendingData(applicationId) {
  const sheet = getPendingDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  // Walk from the bottom so deleteRow doesn't shift indexes we still need
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === applicationId) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

// === BACKGROUND QUEUE PROCESSOR ===
// Trigger: every 1 minute.
// Picks up "Pending Processing" rows, claims them atomically, does PDF + Maps + email,
// then flips Status to "Submitted". Failures mark Status="Failed: <reason>" and alert Eric.
function processBackgroundQueue() {
  const startTime = Date.now();
  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const appIds = sheet.getRange(2, COL.APP_ID, lastRow - 1, 1).getValues();
  const statuses = sheet.getRange(2, COL.STATUS, lastRow - 1, 1).getValues();

  const pendingRows = [];
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i][0] === 'Pending Processing') {
      pendingRows.push({ rowNumber: i + 2, applicationId: appIds[i][0] });
    }
  }

  if (pendingRows.length === 0) return;
  console.log('Background queue: ' + pendingRows.length + ' pending rows');

  let processed = 0, failed = 0;

  for (let i = 0; i < Math.min(pendingRows.length, CONFIG.BATCH_SIZE); i++) {
    // Wall-clock safety: leave margin under the 6-min execution limit
    if (Date.now() - startTime > CONFIG.BATCH_WALL_CLOCK_MS) {
      console.log('Wall-clock limit approaching, stopping after ' + processed + ' processed');
      break;
    }

    const row = pendingRows[i];
    if (!claimRow(sheet, row.rowNumber)) {
      console.log('Row ' + row.rowNumber + ' not claimable (already taken)');
      continue;
    }

    try {
      processPendingRow(sheet, row.rowNumber, row.applicationId);
      processed++;
    } catch (error) {
      console.error('Failed to process ' + row.applicationId + ': ' + error.message);
      markRowFailed(sheet, row.rowNumber, error.message);
      alertEric(
        'Background processing failed: ' + row.applicationId,
        'App ID: ' + row.applicationId + '\n' +
        'Row: ' + row.rowNumber + '\n' +
        'Error: ' + error.message + '\n\n' +
        'Stack:\n' + (error.stack || '(not available)')
      );
      failed++;
    }
  }

  console.log('Background run complete: ' + processed + ' processed, ' + failed + ' failed');
}

// Atomic status flip inside a short script lock. Ensures two trigger runs can't
// both grab the same row. Also stamps PROCESSING_STARTED so the sweeper can
// distinguish "just claimed" from "genuinely stuck."
function claimRow(sheet, rowNumber) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) return false;
  try {
    const currentStatus = sheet.getRange(rowNumber, COL.STATUS).getValue();
    if (currentStatus !== 'Pending Processing') return false;
    sheet.getRange(rowNumber, COL.STATUS).setValue('Processing');
    sheet.getRange(rowNumber, COL.PROCESSING_STARTED).setValue(new Date());
    SpreadsheetApp.flush();
    return true;
  } finally {
    lock.releaseLock();
  }
}

function processPendingRow(sheet, rowNumber, applicationId) {
  const pending = readPendingData(applicationId);
  if (!pending) {
    throw new Error('PendingData row not found for ' + applicationId);
  }
  const data = pending.data;

  // 1. Check if a PDF already exists from a prior attempt (retry case).
  //    If yes, reuse it. If the File ID is invalid (file deleted, etc.), regenerate.
  const existingPdfUrl = sheet.getRange(rowNumber, COL.PDF_URL).getValue();
  const existingPdfFileId = sheet.getRange(rowNumber, COL.PDF_FILE_ID).getValue();

  let pdfFile;
  if (existingPdfUrl && existingPdfFileId) {
    try {
      pdfFile = DriveApp.getFileById(existingPdfFileId);
      console.log('Reusing existing PDF for ' + applicationId);
    } catch (err) {
      console.warn('Existing PDF File ID invalid, regenerating: ' + err.message);
      pdfFile = createApplicationPDF(data, applicationId);
    }
  } else {
    pdfFile = createApplicationPDF(data, applicationId);
  }

  // 2. Calculate distance (~1-3s)
  const distance = calculateDistance(data);

  // 3. Write PDF URL, PDF File ID, and Distance to the Master row IMMEDIATELY.
  //    This must happen before the email send so an email failure doesn't
  //    orphan the PDF in Drive with no link from the sheet.
  sheet.getRange(rowNumber, COL.PDF_URL).setValue(pdfFile.getUrl());
  sheet.getRange(rowNumber, COL.PDF_FILE_ID).setValue(pdfFile.getId());
  sheet.getRange(rowNumber, COL.DISTANCE).setValue(distance);
  SpreadsheetApp.flush();

  // 4. Send applicant confirmation with retry. If this throws after all
  //    retries, processBackgroundQueue will catch it and mark the row Failed,
  //    but the PDF reference written above is preserved. retryFailedRow will
  //    pick the row back up and the PDF will be reused, not regenerated.
  sendApplicantConfirmationWithRetry(data, applicationId);

  // 5. Email succeeded. Flip status to Submitted and clear PROCESSING_STARTED.
  sheet.getRange(rowNumber, COL.STATUS).setValue('Submitted');
  sheet.getRange(rowNumber, COL.PROCESSING_STARTED).setValue('');

  // 6. Clean up PendingData (only after the row is fully Submitted so a
  //    failed-and-retried row still has its source data).
  deletePendingData(applicationId);

  console.log('Successfully processed ' + applicationId);
}

function markRowFailed(sheet, rowNumber, errorMessage) {
  const truncated = String(errorMessage).substring(0, 200);
  sheet.getRange(rowNumber, COL.STATUS).setValue('Failed: ' + truncated);
  sheet.getRange(rowNumber, COL.PROCESSING_STARTED).setValue('');
}

// === STUCK ROW SWEEPER ===
// Trigger: every 15 minutes.
// Any row in "Processing" whose PROCESSING_STARTED timestamp is older than
// STUCK_ROW_MINUTES gets reset to "Pending Processing" and Eric gets one
// rate-limited alert. This measures time-IN-Processing, not time-since-submission,
// so a long queue backlog on surge day does not trigger false recoveries.
function checkForStuckRows() {
  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const cutoff = new Date(Date.now() - CONFIG.STUCK_ROW_MINUTES * 60 * 1000);
  const data = sheet.getRange(2, 1, lastRow - 1, COL.PROCESSING_STARTED).getValues();

  let recovered = 0;
  const stuckIds = [];

  for (let i = 0; i < data.length; i++) {
    const status = data[i][COL.STATUS - 1];
    const processingStarted = data[i][COL.PROCESSING_STARTED - 1];
    const appId = data[i][COL.APP_ID - 1];

    if (status !== 'Processing') continue;

    // Only recover if we have a valid PROCESSING_STARTED timestamp older than the cutoff.
    // If the column is empty or non-Date for a Processing row, that's a manually-edited
    // row or a pre-v3.0 legacy state. Skip it rather than guess - if truly stuck, it will
    // be caught on a subsequent sweep after a human flips it back manually.
    if (!(processingStarted instanceof Date)) continue;
    if (processingStarted >= cutoff) continue;

    sheet.getRange(i + 2, COL.STATUS).setValue('Pending Processing');
    sheet.getRange(i + 2, COL.PROCESSING_STARTED).setValue('');
    stuckIds.push(appId);
    recovered++;
  }

  if (recovered > 0) {
    console.warn('Recovered ' + recovered + ' stuck rows');
    alertEric(
      'Stuck rows recovered (' + recovered + ')',
      recovered + ' row(s) were stuck in Processing for more than ' + CONFIG.STUCK_ROW_MINUTES + ' minutes ' +
      'and have been reset to Pending Processing.\n\n' +
      'Affected App IDs:\n' + stuckIds.join('\n') + '\n\n' +
      'They will be retried on the next background queue run.'
    );
  }
}

// === DAILY DIGEST ===
// Trigger: daily at 7am America/Los_Angeles.
// Summarizes yesterday's Submitted applications to staff in a single email.
// Replaces the old per-submission staff notification (which blew Gmail quota on surge days).
function sendDailyDigest() {
  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log('Digest: sheet empty, skipping');
    return;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allData = sheet.getRange(2, 1, lastRow - 1, COL.STATUS).getValues();

  const submissions = [];
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const timestamp = row[COL.TIMESTAMP - 1];
    const status = row[COL.STATUS - 1];

    if (status !== 'Submitted') continue;
    if (!(timestamp instanceof Date) || timestamp < cutoff) continue;

    const income = Number(row[COL.HOUSEHOLD_INCOME - 1]) || 0;
    const members = Number(row[COL.HOUSEHOLD_MEMBERS - 1]) || 1;

    submissions.push({
      applicationId: row[COL.APP_ID - 1],
      timestamp: timestamp,
      name: row[COL.STUDENT_NAME - 1],
      email: row[COL.STUDENT_EMAIL - 1],
      college: row[COL.COLLEGE - 1],
      income: income,
      members: members,
      incomePerPerson: Math.round(income / (members || 1)),
      pdfUrl: row[COL.PDF_URL - 1]
    });
  }

  if (submissions.length === 0) {
    console.log('Digest: no new submissions in last 24 hours, skipping send');
    return;
  }

  submissions.sort(function(a, b) { return a.timestamp - b.timestamp; });

  const dateStr = Utilities.formatDate(new Date(), CONFIG.DIGEST_TIMEZONE, 'EEEE, MMMM d, yyyy');
  const subject = 'Campus Ready — Daily Applications Digest (' + submissions.length + ' new)';

  let tableRows = '';
  submissions.forEach(function(s) {
    const timeStr = Utilities.formatDate(s.timestamp, CONFIG.DIGEST_TIMEZONE, 'MMM d, h:mm a');
    tableRows += '<tr>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;">' + escapeHtml(s.name) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;">' + escapeHtml(s.email) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;">' + escapeHtml(s.college) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$' + s.incomePerPerson.toLocaleString() + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;">' + escapeHtml(s.applicationId) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;">' + (s.pdfUrl ? '<a href="' + escapeHtml(s.pdfUrl) + '">PDF</a>' : '—') + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;">' + timeStr + '</td>' +
      '</tr>';
  });

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID;

  const htmlBody =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:900px;color:#374151;">' +
    '<h2 style="color:#14b8a6;margin-bottom:4px;">Campus Ready — Daily Applications Digest</h2>' +
    '<p style="color:#6b7280;margin-top:0;">' + dateStr + '</p>' +
    '<p><strong>' + submissions.length + ' new application' + (submissions.length === 1 ? '' : 's') + '</strong> received in the last 24 hours.</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:20px 0;font-size:14px;">' +
    '<thead><tr style="background:#f9fafb;text-align:left;">' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">Student</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">Email</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">College</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;text-align:right;">Income/Person</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">App ID</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">PDF</th>' +
    '<th style="padding:8px;border-bottom:2px solid #e5e7eb;">Received</th>' +
    '</tr></thead><tbody>' + tableRows + '</tbody></table>' +
    '<p><a href="' + sheetUrl + '" style="color:#14b8a6;">Open Master sheet →</a></p>' +
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">' +
    '<p style="color:#6b7280;font-size:12px;">This is an automated digest. To stop receiving it, contact Eric.</p>' +
    '</div>';

  GmailApp.sendEmail(
    CONFIG.STAFF_EMAILS.join(','),
    subject,
    submissions.length + ' new applications in the last 24 hours. Please view the HTML version.',
    { htmlBody: htmlBody, name: 'Campus Ready Foundation' }
  );

  console.log('Digest sent: ' + submissions.length + ' submissions');
}

// === ERROR ALERTING ===
// Rate-limited: max one email per unique subject hash per ALERT_RATE_LIMIT_MS.
// Uses Script Properties to persist lastSent timestamps across trigger runs.
function alertEric(subject, body) {
  try {
    const props = PropertiesService.getScriptProperties();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, subject);
    const sig = 'alert_' + Utilities.base64Encode(digest).substring(0, 16).replace(/[^A-Za-z0-9]/g, '');

    const lastSentStr = props.getProperty(sig);
    const now = Date.now();

    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr);
      if (now - lastSent < CONFIG.ALERT_RATE_LIMIT_MS) {
        console.log('Alert rate-limited (within 1 hour): ' + subject);
        return;
      }
    }

    GmailApp.sendEmail(
      CONFIG.ALERT_EMAIL,
      '[CRF Alert] ' + subject,
      body,
      { name: 'Campus Ready Foundation — System Alert' }
    );
    props.setProperty(sig, String(now));
    console.log('Alert sent: ' + subject);
  } catch (err) {
    console.error('alertEric failed: ' + err.message);
  }
}

// === TRIGGER INSTALLATION ===
// Run this ONCE from the editor after deploying v3.0.
// Idempotent: clears old copies of its own triggers before creating new ones.
function installTriggers() {
  const managed = ['processBackgroundQueue', 'checkForStuckRows', 'sendDailyDigest'];
  const existing = ScriptApp.getProjectTriggers();

  existing.forEach(function(t) {
    if (managed.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      console.log('Removed existing trigger for ' + t.getHandlerFunction());
    }
  });

  ScriptApp.newTrigger('processBackgroundQueue').timeBased().everyMinutes(1).create();
  console.log('Installed: processBackgroundQueue every 1 minute');

  ScriptApp.newTrigger('checkForStuckRows').timeBased().everyMinutes(15).create();
  console.log('Installed: checkForStuckRows every 15 minutes');

  ScriptApp.newTrigger('sendDailyDigest')
    .timeBased()
    .atHour(CONFIG.DIGEST_HOUR)
    .everyDays(1)
    .inTimezone(CONFIG.DIGEST_TIMEZONE)
    .create();
  console.log('Installed: sendDailyDigest daily at ' + CONFIG.DIGEST_HOUR + ':00 ' + CONFIG.DIGEST_TIMEZONE);

  return 'Triggers installed. Check the Triggers panel — you should see 3 time-driven triggers.';
}

// Helper to remove the three v3.0 triggers (rollback utility).
// Symmetrical to installTriggers - only removes the managed set, never touches
// other triggers that may exist in the project.
function uninstallTriggers() {
  const managed = ['processBackgroundQueue', 'checkForStuckRows', 'sendDailyDigest'];
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function(t) {
    if (managed.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  return 'Removed ' + removed + ' v3.0 trigger(s). Other project triggers (if any) untouched.';
}

// === ADMIN HELPER: RETRY A FAILED ROW ===
// Call from the script editor when a student emails in with a corrected address
// or when you've fixed whatever caused a Failed row.
// Usage: retryFailedRow('CR_1234567890_abcdef', 'correctedemail@example.com')
//   - correctedEmail is optional. If provided, updates both the Master row AND
//     the PendingData row before re-queuing.
function retryFailedRow(applicationId, correctedEmail) {
  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Sheet empty';

  const appIds = sheet.getRange(2, COL.APP_ID, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < appIds.length; i++) {
    if (appIds[i][0] === applicationId) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) return 'Application ID not found: ' + applicationId;

  const status = sheet.getRange(targetRow, COL.STATUS).getValue();
  if (String(status).indexOf('Failed') !== 0) {
    return 'Row is not in Failed state (current status: ' + status + '). Refusing to re-queue.';
  }

  // Update email on both Master and PendingData if provided
  if (correctedEmail) {
    sheet.getRange(targetRow, COL.STUDENT_EMAIL).setValue(correctedEmail);
    const pending = readPendingData(applicationId);
    if (pending) {
      pending.data.student_email = correctedEmail;
      // Rewrite the PendingData row
      const pdSheet = getPendingDataSheet();
      pdSheet.getRange(pending.rowNumber, 2).setValue(JSON.stringify(pending.data));
    } else {
      return 'Warning: Master email updated but PendingData row not found for ' + applicationId +
             '. Row cannot be re-queued (PDF generation needs full form data). Manual intervention required.';
    }
  }

  // Flip status back so the next background run picks it up
  sheet.getRange(targetRow, COL.STATUS).setValue('Pending Processing');
  sheet.getRange(targetRow, COL.PROCESSING_STARTED).setValue('');

  return 'Row ' + targetRow + ' (' + applicationId + ') re-queued. Background trigger will pick it up within 1 minute.';
}

// === ADMIN HELPER: RECALCULATE DISTANCE FOR ONE ROW ===
// Re-runs distance calculation for a single row using the current logic.
// Use this to fix rows whose Distance was written by the old address-based
// version of calculateDistance and is now known to be wrong.
//
// Usage from the script editor:
//   recalculateDistance('CR_1768584895995_mpoqr2')
function recalculateDistance(applicationId) {
  const COL_HOME_ZIP    = 17; // Q
  const COL_COLLEGE_ZIP = 22; // V

  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Sheet empty';

  const appIds = sheet.getRange(2, COL.APP_ID, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < appIds.length; i++) {
    if (appIds[i][0] === applicationId) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) return 'Application ID not found: ' + applicationId;

  const homeZip    = sheet.getRange(targetRow, COL_HOME_ZIP).getValue();
  const collegeZip = sheet.getRange(targetRow, COL_COLLEGE_ZIP).getValue();
  const oldValue   = sheet.getRange(targetRow, COL.DISTANCE).getValue();

  const newValue = calculateDistance({
    student_zip: homeZip,
    college_zip: collegeZip
  });
  sheet.getRange(targetRow, COL.DISTANCE).setValue(newValue);

  return 'Row ' + targetRow + ' (' + applicationId + '): old=' + oldValue + '  →  new=' + newValue;
}

// === ADMIN HELPER: RECALCULATE DISTANCE FOR ALL SUBMITTED ROWS ===
// One-shot bulk cleanup. Re-runs distance for every row whose Status is
// "Submitted". Safe to re-run; idempotent. Logs the old/new value for every
// row so you can audit the changes in the Apps Script execution log.
function recalculateAllSubmittedDistances() {
  const COL_HOME_ZIP    = 17; // Q (0-indexed in row array: 16)
  const COL_COLLEGE_ZIP = 22; // V (0-indexed: 21)

  const sheet = getMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Sheet empty';

  const data = sheet.getRange(2, 1, lastRow - 1, COL.DISTANCE).getValues();
  let updated = 0, skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[COL.STATUS - 1] !== 'Submitted') { skipped++; continue; }

    const appId = row[COL.APP_ID - 1];
    const oldVal = row[COL.DISTANCE - 1];
    const newVal = calculateDistance({
      student_zip: row[COL_HOME_ZIP - 1],
      college_zip: row[COL_COLLEGE_ZIP - 1]
    });
    sheet.getRange(i + 2, COL.DISTANCE).setValue(newVal);
    console.log(appId + ': ' + oldVal + ' → ' + newVal);
    updated++;
  }

  return 'Done. Recalculated ' + updated + ' submitted rows, skipped ' + skipped + ' non-submitted rows. See log for per-row diff.';
}

// === FORM DATA PARSING ===
function parseFormData(e) {
  let data = {};

  if (e.postData && e.postData.contents) {
    const contents = e.postData.contents;
    const pairs = contents.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        const decodedKey = decodeURIComponent(key);
        const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));

        // Handle multi-value form fields (checkbox groups)
        if (data[decodedKey] !== undefined) {
          if (Array.isArray(data[decodedKey])) {
            data[decodedKey].push(decodedValue);
          } else {
            data[decodedKey] = [data[decodedKey], decodedValue];
          }
        } else {
          data[decodedKey] = decodedValue;
        }
      }
    }
  } else if (e.parameter) {
    data = Object.assign({}, e.parameter);
  } else if (e.postData && e.postData.type === 'application/json') {
    data = JSON.parse(e.postData.contents || '{}');
  } else {
    throw new Error('No form data received');
  }

  if (data._honeypot) throw new Error('Spam detected');
  return data;
}

// === DISTANCE CALCULATION ===
// Geocodes from ZIP codes only (not full address strings) to avoid the
// typo-induced mis-geocoding seen in the 2026 cohort, where five short
// Bay Area trips returned as 800-940 mile routes because Google's geocoder
// picked similarly-named places in other states.
//
// Calls two Google Maps APIs:
//   1. Distance Matrix - driving distance ZIP-to-ZIP
//   2. Geocoding       - lat/lng of each ZIP for the sanity-check denominator
//
// If driving distance is more than 2.5x the straight-line distance between
// the two ZIP centroids, the result is flagged for human review rather than
// written as a (possibly bogus) number. 2.5x accounts for California's
// mountain and water routing while still catching the 10-17x errors seen
// in the 2026 cohort.
function calculateDistance(data) {
  const homeZip    = _normalizeZip(data.student_zip);
  const collegeZip = _normalizeZip(data.college_zip);

  if (!/^\d{5}$/.test(homeZip))    return 'Invalid home ZIP: ' + (homeZip || '(empty)');
  if (!/^\d{5}$/.test(collegeZip)) return 'Invalid college ZIP: ' + (collegeZip || '(empty)');

  try {
    // --- Driving distance via Distance Matrix API ---
    const dmUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json?' +
      'origins='      + encodeURIComponent(homeZip    + ', USA') +
      '&destinations='+ encodeURIComponent(collegeZip + ', USA') +
      '&units=imperial' +
      '&key=' + CONFIG.GOOGLE_MAPS_API_KEY;

    const dmResp = UrlFetchApp.fetch(dmUrl, { method: 'GET', muteHttpExceptions: true });
    if (dmResp.getResponseCode() !== 200) return 'API Error - will retry later';

    const dmData = JSON.parse(dmResp.getContentText());
    if (dmData.status !== 'OK' || !dmData.rows || !dmData.rows[0] ||
        !dmData.rows[0].elements || !dmData.rows[0].elements[0]) {
      return 'Route not found';
    }
    const element = dmData.rows[0].elements[0];
    if (element.status !== 'OK' || !element.distance) return 'Distance unavailable';

    // Use raw meters from the API (always correct, regardless of text formatting).
    // Old code parsed element.distance.text, which silently broke decimals like "1.5 mi".
    const drivingMiles = Math.round(element.distance.value / 1609.34);

    // --- Sanity check via Geocoding API ---
    const homeLatLng    = _geocodeZipToLatLng(homeZip);
    const collegeLatLng = _geocodeZipToLatLng(collegeZip);

    // If geocoding fails for either ZIP, accept the driving distance unchecked
    // and log the limitation. Better to record a likely-correct value than
    // refuse one because the secondary check couldn't run.
    if (!homeLatLng || !collegeLatLng) {
      console.warn('Sanity check skipped: geocoding failed for ZIPs ' +
        homeZip + ' / ' + collegeZip + '. Returning driving distance unchecked.');
      return drivingMiles;
    }

    const straightMiles = _haversineMiles(
      homeLatLng.lat, homeLatLng.lng,
      collegeLatLng.lat, collegeLatLng.lng
    );

    if (straightMiles > 1 && drivingMiles > straightMiles * 2.5) {
      return 'Needs Review: driving ' + drivingMiles +
        ' mi vs straight-line ' + Math.round(straightMiles) +
        ' mi (ratio ' + (drivingMiles / straightMiles).toFixed(1) + 'x)';
    }

    return drivingMiles;
  } catch (err) {
    console.error('Distance calculation error: ' + err.message);
    return 'Error - will retry later';
  }
}

// Returns {lat, lng} for a 5-digit US ZIP, or null on failure.
function _geocodeZipToLatLng(zip) {
  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json?' +
      'address=' + encodeURIComponent(zip + ', USA') +
      '&key=' + CONFIG.GOOGLE_MAPS_API_KEY;
    const resp = UrlFetchApp.fetch(url, { method: 'GET', muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return null;
    const data = JSON.parse(resp.getContentText());
    if (data.status !== 'OK' || !data.results || !data.results[0]) return null;
    const loc = data.results[0].geometry && data.results[0].geometry.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.warn('Geocode failed for ZIP ' + zip + ': ' + err.message);
    return null;
  }
}

// Great-circle distance between two lat/lng points, in miles.
function _haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = function(deg) { return deg * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Normalizes a ZIP code value, padding leading zeros if Google Sheets stripped
// them. Sheets stores numeric-looking strings (like "02302") as numbers, which
// drops the leading zero. This fixes that for MA, CT, NJ, PR, and any other
// area whose ZIPs start with 0.
function _normalizeZip(raw) {
  let zip = String(raw || '').trim().substring(0, 5);
  if (/^\d{1,4}$/.test(zip)) zip = zip.padStart(5, '0');
  return zip;
}

// === PDF GENERATION ===
function createApplicationPDF(data, applicationId) {
  const htmlContent = buildPDFHTML(data, applicationId);
  const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
  const pdfBlob = htmlBlob.getAs('application/pdf');

  const filename = buildPdfFilename(data.student_name);
  pdfBlob.setName(filename);

  const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
  return folder.createFile(pdfBlob);
}

// Builds a filename in the format "LastName_FirstName.pdf" so PDFs sort
// alphabetically by last name in Drive and are easy to search by name.
function buildPdfFilename(studentName) {
  const raw = String(studentName || 'Unnamed_Applicant').trim();
  const cleaned = raw
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = cleaned.split(' ');
  if (parts.length === 1) return parts[0] + '.pdf';

  const last = parts[parts.length - 1];
  const rest = parts.slice(0, parts.length - 1).join('_');
  return last + '_' + rest + '.pdf';
}

// === REPLACEMENT FUNCTION: buildPDFHTML (final) ===
// Drop-in replacement for buildPDFHTML() in Application_Main_Script.gs.
// Paste this entire function, replacing the old one. Nothing else changes.
//
// Typography:
//   Playfair Display 700 — org name, document title, section headers (loaded via Google Fonts)
//   Arial — all field labels, values, and body text (server-safe fallback if Playfair fails)
//
// What's new vs the original:
//   - Branded header with logo (fetched from Drive, embedded as base64)
//   - Playfair Display via Google Fonts @import
//   - All fields now present: pg_name, pg_phone, pg_email, accompany, gender, student_income
//   - Income per person computed and shown
//   - Raw form keys mapped to human-readable labels (including the "applicances" typo)
//   - Font sizes calibrated for Apps Script's HTML-to-PDF renderer (~1.25x inflation)
//   - Explicit 33% column widths prevent label wrapping
//   - Footer uses a two-cell table (flexbox not reliable in this renderer)

// === REPLACEMENT FUNCTION: buildPDFHTML (final) ===
// Drop-in replacement for buildPDFHTML() in Application_Main_Script.gs.
// Paste this entire function, replacing the old one. Nothing else changes.
//
// Typography:
//   Playfair Display 700 — org name, document title, section headers (loaded via Google Fonts)
//   Arial — all field labels, values, and body text (server-safe fallback if Playfair fails)
//
// What's new vs the original:
//   - Branded header with logo (fetched from Drive, embedded as base64)
//   - Playfair Display via Google Fonts @import
//   - All fields now present: pg_name, pg_phone, pg_email, accompany, gender, student_income
//   - Income per person computed and shown
//   - Raw form keys mapped to human-readable labels (including the "applicances" typo)
//   - Font sizes calibrated for Apps Script's HTML-to-PDF renderer (~1.25x inflation)
//   - Explicit 33% column widths prevent label wrapping
//   - Footer uses a two-cell table (flexbox not reliable in this renderer)

function buildPDFHTML(data, applicationId) {

  // === LOGO ===
  // The logo PNG is stored in the CRF Drive folder referenced by PDF_FOLDER_ID.
  // We fetch it by file ID and embed as base64 so no external URL dependency.
  // Falls back to text-only org name if the fetch fails for any reason.
  //
  // TO SET UP: find the logo file in Drive, copy its file ID, paste below.
  var LOGO_FILE_ID = '1LHq8wqjMIdvDp5cNYW5ZwppY1WiGYZjD';

  var logoHtml = '';
  if (LOGO_FILE_ID) {
    try {
      var logoFile = DriveApp.getFileById(LOGO_FILE_ID);
      var blob     = logoFile.getBlob();
      var b64      = Utilities.base64Encode(blob.getBytes());
      var mime     = blob.getContentType() || 'image/png';
      logoHtml = '<img src="data:' + mime + ';base64,' + b64 + '" ' +
                 'style="height:48px;width:auto;display:block;" ' +
                 'alt="Campus Ready Foundation">';
    } catch (e) {
      console.warn('Logo fetch failed: ' + e.message);
    }
  }

  // === LABEL MAPS ===
  // Maps raw form submission values to display strings.
  // "applicances" is an intentional match for the misspelled form field value.
  var CIRCUMSTANCE_LABELS = {
    'SNAP/WIC/free_meals':      'Receives SNAP, WIC, or free/reduced school meals',
    'housing_instability':      'Housing instability or transitional housing',
    'no_internet_computer':     'No internet or computer access at home',
    'unemployed_underemployed': 'Parent(s)/guardian(s) unemployed or underemployed',
    'financial_contributor':    'Contributes financially to the household'
  };

  var CONCERN_LABELS = {
    'dorm_supplies':  'Dorm supplies',
    'applicances':    'Appliances',
    'hygiene_items':  'Hygiene items',
    'transportation': 'Transportation',
    'meals_food':     'Meals and food'
  };

  // === HELPERS ===

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  function formatDate(raw) {
    if (!raw) return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return esc(String(raw));
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatCurrency(val) {
    var n = parseFloat(String(val || '').replace(/[$,\s]/g, ''));
    if (isNaN(n)) return '';
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function formatNumber(val) {
    var n = parseFloat(val);
    if (isNaN(n)) return '';
    return Math.round(n).toLocaleString('en-US');
  }

  function incomePerPerson(income, members) {
    var inc = parseFloat(String(income || '').replace(/[$,\s]/g, ''));
    var mem = parseInt(members);
    if (isNaN(inc) || isNaN(mem) || mem < 1) return '';
    return '$' + Math.round(inc / mem).toLocaleString('en-US');
  }

  function mapList(raw, labelMap) {
    var items = Array.isArray(raw) ? raw : (raw ? [String(raw)] : []);
    return items
      .map(function(k) { return labelMap[k] || esc(k); })
      .filter(Boolean);
  }

  // === COMPONENT BUILDERS ===

  // Single data field — label above value.
  // opts.colspan: number of columns to span (default 1 of 3)
  // opts.accent:  render value in teal (used for Yes/positive answers)
  // opts.raw:     pre-rendered HTML for the value cell (tags, multi-line, etc.)
  function field(label, value, opts) {
    opts = opts || {};
    var span      = opts.colspan || 1;
    var colAttr   = span > 1 ? ' colspan="' + span + '"' : '';
    var pct       = (span * 33) + '%';
    var empty     = (!value || value === '');
    var color     = (opts.accent && !empty) ? '#0F6E56' : '#1a1a1a';
    var valStyle  = empty
      ? 'font-size:8pt;font-family:Arial,sans-serif;font-weight:400;color:#9CA3AF;font-style:italic;margin-top:2px;line-height:1.35;'
      : 'font-size:8pt;font-family:Arial,sans-serif;font-weight:700;color:' + color + ';margin-top:2px;line-height:1.35;';
    var display   = empty ? 'Not provided' : (opts.raw ? opts.raw : esc(String(value)));

    return '<td' + colAttr + ' style="width:' + pct + ';' +
           'padding:5px 24px 6px 0;border-bottom:0.5px solid #E5E7EB;vertical-align:top;">' +
      '<div style="font-size:6.5pt;font-family:Arial,sans-serif;font-weight:400;' +
           'text-transform:uppercase;letter-spacing:0.07em;color:#6B7280;">' +
           esc(label) + '</div>' +
      '<div style="' + valStyle + '">' + display + '</div>' +
    '</td>';
  }

  // Full-width field spanning all three columns — used for addresses and multi-line values.
  function fieldFull(label, value, opts) {
    opts = opts || {};
    var empty    = (!value || value === '');
    var valStyle = empty
      ? 'font-size:8pt;font-family:Arial,sans-serif;font-weight:400;color:#9CA3AF;font-style:italic;margin-top:2px;'
      : 'font-size:8pt;font-family:Arial,sans-serif;font-weight:700;color:#1a1a1a;margin-top:2px;';
    var display  = empty ? 'Not provided' : (opts.raw ? opts.raw : esc(String(value)));

    return '<tr><td colspan="3" style="padding:5px 0 6px 0;border-bottom:0.5px solid #E5E7EB;">' +
      '<div style="font-size:6.5pt;font-family:Arial,sans-serif;font-weight:400;' +
           'text-transform:uppercase;letter-spacing:0.07em;color:#6B7280;">' +
           esc(label) + '</div>' +
      '<div style="' + valStyle + '">' + display + '</div>' +
    '</td></tr>';
  }

  // Section divider — Playfair Display, teal, with teal underline rule.
  function sectionHeader(title) {
    return '<tr><td colspan="3" style="padding:14px 0 5px 0;">' +
      '<div style="font-size:8.5pt;font-family:\'Playfair Display\',Georgia,serif;font-weight:700;' +
           'text-transform:uppercase;letter-spacing:0.09em;color:#469E92;' +
           'padding-bottom:4px;border-bottom:1px solid #469E92;">' +
           esc(title) + '</div>' +
    '</td></tr>';
  }

  // Essay block with teal left border.
  function essayBlock(question, text, wordCount) {
    var wcHtml = wordCount
      ? '<div style="font-size:6.5pt;font-family:Arial,sans-serif;' +
        'color:#9CA3AF;text-align:right;margin-top:4px;">' + wordCount + ' words</div>'
      : '';
    return '<tr><td colspan="3" style="padding:5px 0 8px 0;">' +
      '<div style="border-left:2.5px solid #469E92;padding:8px 11px;background:#F9FAFB;">' +
        '<div style="font-size:6.5pt;font-family:Arial,sans-serif;font-weight:700;' +
             'text-transform:uppercase;letter-spacing:0.07em;color:#469E92;margin-bottom:5px;">' +
             esc(question) + '</div>' +
        '<div style="font-size:8pt;font-family:Arial,sans-serif;font-weight:400;' +
             'color:#374151;line-height:1.6;white-space:pre-wrap;">' +
             esc(text || 'No response provided') + '</div>' +
        wcHtml +
      '</div>' +
    '</td></tr>';
  }

  // Pill tag for affordability concerns.
  function tag(label) {
    return '<span style="display:inline-block;font-size:7pt;font-family:Arial,sans-serif;' +
           'font-weight:700;background:#EAF4F3;color:#0F6E56;border-radius:3px;' +
           'padding:2px 6px;margin:2px 3px 0 0;">' + esc(label) + '</span>';
  }

  // === DATA ASSEMBLY ===

  var submissionDate = formatDate(new Date());

  // Student
  var studentName   = data.student_name   || '';
  var studentEmail  = data.student_email  || '';
  var studentPhone  = data.student_phone  || '';
  var studentDob    = formatDate(data.student_dob);
  var gender        = data.gender         || '';
  var studentIncome = formatCurrency(data.student_income);
  var homeAddress   = [
    data.student_address,
    data.student_city_name,
    data.student_state,
    data.student_zip
  ].filter(Boolean).join(', ');

  // Parent / Guardian
  var pgName    = data.pg_name   || '';
  var pgPhone   = data.pg_phone  || '';
  var pgEmail   = data.pg_email  || '';
  var accompany = data.accompany || '';

  // College
  var college     = data.college || '';
  var startDate   = formatDate(data.start_date);
  var collegeAddr = [
    data.college_address,
    data.college_city_name,
    data.college_state,
    data.college_zip
  ].filter(Boolean).join(', ');

  // Financial
  var hhIncome  = formatCurrency(data.household_income);
  var hhMembers = data.household_members ? String(data.household_members) : '';
  var ipp       = incomePerPerson(data.household_income, data.household_members);
  var fafsa     = data.fafsa || '';
  var sai       = (data.sai !== undefined && data.sai !== '') ? formatNumber(data.sai) : '';

  // Circumstances — one line each
  var circumItems = mapList(data.household_circumstances, CIRCUMSTANCE_LABELS);
  var circumHtml  = circumItems.length
    ? circumItems.map(function(l) {
        return '<div style="font-size:8pt;font-family:Arial,sans-serif;' +
               'font-weight:700;color:#1a1a1a;padding:1px 0;">' + esc(l) + '</div>';
      }).join('')
    : '<span style="font-size:8pt;font-family:Arial,sans-serif;' +
      'font-weight:400;color:#9CA3AF;font-style:italic;">None selected</span>';

  // Concerns — pill tags
  var concernItems = mapList(data.affordability_concerns, CONCERN_LABELS);
  if (data.other_concern_text) {
    concernItems.push('Other: ' + data.other_concern_text);
  }
  var concernHtml = concernItems.length
    ? concernItems.map(tag).join('')
    : '<span style="font-size:8pt;font-family:Arial,sans-serif;' +
      'font-weight:400;color:#9CA3AF;font-style:italic;">None selected</span>';

  // Essays — countWords() is the existing helper already in the script
  var essay1   = data.essay1 || '';
  var essay2   = data.essay2 || '';
  var essay2Wc = countWords(essay2);

  // === HTML OUTPUT ===
  return '<!DOCTYPE html>\n' +
  '<html><head><meta charset="UTF-8">\n' +
  '<style>\n' +
  '@import url(\'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap\');\n' +
  'body{font-family:Arial,sans-serif;margin:32px 40px 28px;color:#1a1a1a;}\n' +
  'table{border-collapse:collapse;width:100%;}\n' +
  'td{vertical-align:top;}\n' +
  '</style>\n' +
  '</head><body>\n' +

  // ── HEADER ────────────────────────────────────────────────────────
  // Two-cell table: logo + identity left, app ID + date right.
  '<table style="width:100%;margin-bottom:0;">' +
  '<tr>' +
    '<td style="vertical-align:bottom;padding-bottom:8px;">' +
      (logoHtml || '') +
      // If no logo, show org name in Playfair as fallback
      (!logoHtml
        ? '<div style="font-size:12pt;font-family:\'Playfair Display\',Georgia,serif;' +
          'font-weight:700;color:#1a1a1a;letter-spacing:0.02em;">Campus Ready Foundation</div>'
        : '') +
      '<div style="font-size:13pt;font-family:\'Playfair Display\',Georgia,serif;' +
           'font-weight:700;color:#1a1a1a;margin-top:6px;">Grant Application</div>' +
    '</td>' +
    '<td style="text-align:right;vertical-align:top;padding-bottom:8px;">' +
      '<div style="font-size:7.5pt;font-family:\'Courier New\',monospace;color:#6B7280;">' +
           esc(applicationId) + '</div>' +
      '<div style="font-size:7.5pt;font-family:Arial,sans-serif;color:#6B7280;margin-top:2px;">' +
           'Submitted ' + submissionDate + '</div>' +
    '</td>' +
  '</tr>' +
  '</table>' +
  '<hr style="border:none;border-top:2.5px solid #469E92;margin:0 0 14px;">' +

  // ── CONTENT TABLE ─────────────────────────────────────────────────
  '<table>' +

  // Student
  sectionHeader('Student') +
  '<tr>' +
    field('Full name',         studentName) +
    field('Date of birth',     studentDob) +
    field('Gender',            gender) +
  '</tr>' +
  '<tr>' +
    field('Email',             studentEmail) +
    field('Phone',             studentPhone) +
    field('Individual income', studentIncome) +
  '</tr>' +
  fieldFull('Home address', homeAddress) +

  // Parent / Guardian
  sectionHeader('Parent / Guardian') +
  '<tr>' +
    field('Name(s)',                pgName,    { colspan: 2 }) +
    field('Accompanying to campus', accompany, { accent: accompany === 'Yes' }) +
  '</tr>' +
  '<tr>' +
    field('Phone', pgPhone) +
    field('Email', pgEmail, { colspan: 2 }) +
  '</tr>' +

  // College
  sectionHeader('College') +
  '<tr>' +
    field('Institution',    college) +
    field('Expected start', startDate) +
    field('College Location', collegeAddr) +
  '</tr>' +

  // Financial
  sectionHeader('Financial') +
  '<tr>' +
    field('Household income',  hhIncome) +
    field('Household members', hhMembers) +
    field('Income per person', ipp) +
  '</tr>' +
  '<tr>' +
    field('Aid application',   fafsa) +
    field('Student Aid Index', sai, { colspan: 2 }) +
  '</tr>' +
  '<tr>' +
    '<td colspan="3" style="padding:5px 0 6px 0;border-bottom:0.5px solid #E5E7EB;">' +
      '<div style="font-size:6.5pt;font-family:Arial,sans-serif;font-weight:400;' +
           'text-transform:uppercase;letter-spacing:0.07em;color:#6B7280;">' +
           'Household circumstances</div>' +
      '<div style="margin-top:3px;">' + circumHtml + '</div>' +
    '</td>' +
  '</tr>' +
  '<tr>' +
    '<td colspan="3" style="padding:5px 0 8px 0;">' +
      '<div style="font-size:6.5pt;font-family:Arial,sans-serif;font-weight:400;' +
           'text-transform:uppercase;letter-spacing:0.07em;color:#6B7280;">' +
           'Affordability concerns</div>' +
      '<div style="margin-top:4px;">' + concernHtml + '</div>' +
    '</td>' +
  '</tr>' +

  // Essays
  sectionHeader('Essays') +
  essayBlock('Essay 1 — Why is this award meaningful to you?', essay1, null) +
  essayBlock('Essay 2 — Describe a challenge', essay2, essay2Wc) +

  '</table>' +

  // ── FOOTER ────────────────────────────────────────────────────────
  // Two-cell table: tagline + URL left, app ID right.
  '<table style="width:100%;margin-top:14px;border-top:0.5px solid #E5E7EB;">' +
  '<tr>' +
    '<td style="padding-top:7px;">' +
      '<span style="font-size:7pt;font-family:Arial,sans-serif;' +
            'color:#9CA3AF;font-style:italic;">' +
            'Campus Ready Foundation &middot; campusready.org &middot; Submitted ' +
            submissionDate + '</span>' +
    '</td>' +
    '<td style="text-align:right;padding-top:7px;">' +
      '<span style="font-size:7pt;font-family:\'Courier New\',monospace;color:#9CA3AF;">' +
            esc(applicationId) + '</span>' +
    '</td>' +
  '</tr>' +
  '</table>' +

  '</body></html>';
}

// === APPLICANT CONFIRMATION EMAIL (unchanged template, called from background) ===
function sendApplicantConfirmationWithRetry(data, applicationId) {
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.EMAIL_RETRY_ATTEMPTS; attempt++) {
    try {
      sendApplicantConfirmation(data, applicationId);
      return;
    } catch (err) {
      lastError = err;
      console.warn('Confirmation email attempt ' + attempt + ' failed: ' + err.message);
      if (attempt < CONFIG.EMAIL_RETRY_ATTEMPTS) {
        Utilities.sleep(Math.pow(2, attempt) * 1000);  // 2s, 4s
      }
    }
  }
  throw new Error('Confirmation email failed after ' + CONFIG.EMAIL_RETRY_ATTEMPTS + ' attempts: ' + lastError.message);
}

function sendApplicantConfirmation(data, applicationId) {
  if (!data.student_email) return;

  const firstName = data.student_name ? data.student_name.split(' ')[0] : 'Future Leader';
  const subject = 'Your Campus Ready Application is Confirmed!';

  const textBody =
'Dear ' + firstName + ',\n\n' +
'Congratulations on taking this important step toward your college journey!\n\n' +
'We\'ve successfully received your Campus Ready Foundation grant application, and we\'re genuinely excited to learn more about your story and aspirations.\n\n' +
'YOUR APPLICATION DETAILS\n' +
'━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
'Application ID: ' + applicationId + '\n' +
'Submitted: ' + new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) + '\n' +
'College: ' + (data.college || 'Not specified') + '\n\n' +
'WHAT\'S NEXT?\n' +
'━━━━━━━━━━━━━\n' +
'✓ This confirmation email (check your spam folder if needed)\n' +
'• Our board will thoughtfully review all applications after May 15\n' +
'• Decision notifications will be sent by June 1\n' +
'• If selected, we\'ll reach out about your Campus Ready Essentials Kit and ongoing support\n\n' +
'We know how challenging the college application and funding process can be. You\'ve already shown incredible determination by applying for this grant, and we want you to know that regardless of the outcome, we\'re rooting for your success.\n\n' +
'Questions? We\'re here to help at apply@campusready.org\n\n' +
'Respectfully,\n' +
'The Campus Ready Foundation Team\n\n' +
'P.S. Save this email and your Application ID (' + applicationId + ') for your records!';

  const htmlBody = buildConfirmationHTML(firstName, applicationId, data);

  GmailApp.sendEmail(
    data.student_email,
    subject,
    textBody,
    { htmlBody: htmlBody, name: 'Campus Ready Foundation', replyTo: 'apply@campusready.org' }
  );
  console.log('Applicant confirmation sent to ' + data.student_email);
}

function buildConfirmationHTML(firstName, applicationId, data) {
  const submittedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' +
'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; line-height: 1.6; color: #374151; }' +
'.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }' +
'.header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: white; padding: 48px; text-align: center; }' +
'.success-icon { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; display: block; text-align: center; line-height: 80px; margin: 0 auto 24px; border: 2px solid rgba(255,255,255,0.3); }'+
  '.checkmark { color: white; font-size: 40px; font-weight: bold; line-height: 80px; }' +
'.header h1 { margin: 0 0 8px; font-size: 32px; font-weight: 700; }' +
'.header p { margin: 0; font-size: 18px; opacity: 0.9; }' +
'.content { padding: 48px; }' +
'.greeting { font-size: 24px; color: #1f2937; margin-bottom: 24px; font-weight: 600; }' +
'.intro-text { font-size: 18px; line-height: 1.6; margin-bottom: 32px; }' +
'.details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin: 32px 0; }' +
'.details-box h3 { margin: 0 0 20px; color: #14b8a6; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }' +
'.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }' +
'.detail-row:last-child { border-bottom: none; }' +
'.detail-label { font-weight: 600; color: #374151; }' +
'.detail-value { color: #6b7280; font-family: Monaco, monospace; font-size: 14px; }' +
'.next-steps { background: #f0fdfa; border: 2px solid #99f6e4; border-radius: 12px; padding: 32px; margin: 32px 0; }' +
'.next-steps h3 { color: #14b8a6; margin: 0 0 20px; font-size: 20px; font-weight: 700; }' +
'.step-item { margin-bottom: 16px; padding-left: 32px; position: relative; }' +
'.step-item:before { content: "•"; position: absolute; left: 0; top: 0; color: #14b8a6; font-size: 24px; font-weight: bold; line-height: 1; }' +
'.step-title { font-weight: 600; color: #0f766e; margin-bottom: 4px; }' +
'.step-desc { color: #374151; line-height: 1.5; }' +
'.encouragement { background: #ecfdf5; border: 2px solid #86efac; border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center; }' +
'.encouragement p { margin: 0; color: #065f46; font-style: italic; font-size: 18px; line-height: 1.6; }' +
'.closing-text { font-size: 16px; line-height: 1.6; margin: 32px 0; }' +
'.signature { margin-top: 40px; padding-top: 32px; border-top: 2px solid #e5e7eb; }' +
'.signature-line { color: #374151; font-weight: 600; margin-bottom: 4px; font-size: 16px; }' +
'.signature-title { color: #6b7280; font-size: 14px; }' +
'.footer { background: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }' +
'.footer h4 { margin: 0 0 8px; color: #374151; font-size: 16px; font-weight: 600; }' +
'.footer p { margin: 0 0 16px; color: #6b7280; font-size: 14px; }' +
'.contact-link { color: #14b8a6; text-decoration: none; font-weight: 600; }' +
'.important-note { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 16px; }' +
'.important-note strong { color: #92400e; }' +
'@media (max-width: 640px) { .container { margin: 10px; border-radius: 12px; } .header, .content { padding: 32px 24px; } .details-box, .next-steps, .encouragement { padding: 24px; } .header h1 { font-size: 24px; } .greeting { font-size: 20px; } .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; } }' +
'</style></head><body>' +
'<div class="container">' +
'<div class="header"><div class="success-icon"><div class="checkmark">✓</div></div>' +
'<h1>Application Confirmed!</h1><p>Your journey to college success starts here</p></div>' +
'<div class="content">' +
'<div class="greeting">Dear ' + firstName + ',</div>' +
'<p class="intro-text">Congratulations on taking this important step toward your college journey! We\'ve successfully received your Campus Ready Foundation grant application, and we\'re genuinely excited to learn more about your story and aspirations.</p>' +
'<div class="details-box"><h3>Your Application Details</h3>' +
'<div class="detail-row"><span class="detail-label">Application ID:</span><span class="detail-value">' + applicationId + '</span></div>' +
'<div class="detail-row"><span class="detail-label">Submitted:</span><span class="detail-value">' + submittedDate + '</span></div>' +
'<div class="detail-row"><span class="detail-label">College:</span><span class="detail-value">' + (data.college || 'Not specified') + '</span></div>' +
'</div>' +
'<div class="next-steps"><h3>What Happens Next</h3>' +
'<div class="step-item"><div class="step-title">Email Confirmation</div><div class="step-desc">You\'re reading it right now! Save this for your records.</div></div>' +
'<div class="step-item"><div class="step-title">Application Review</div><div class="step-desc">Our board will thoughtfully review all applications after the May 15 deadline</div></div>' +
'<div class="step-item"><div class="step-title">Decision Notification</div><div class="step-desc">All applicants will be notified of decisions by <strong>June 1</strong></div></div>' +
'<div class="step-item"><div class="step-title">If Selected</div><div class="step-desc">We\'ll contact you about your Campus Ready Essentials Kit and ongoing support</div></div>' +
'</div>' +
'<div class="encouragement"><p>We know how challenging the college application and funding process can be. You\'ve already shown incredible determination by applying for this grant, and we want you to know that regardless of the outcome, we\'re rooting for your success.</p></div>' +
'<p class="closing-text">Keep moving forward, and remember that this is just one step in your educational journey. Your dedication to pursuing higher education is already something to be proud of.</p>' +
'<div class="signature"><div class="signature-line">Respectfully,</div><div class="signature-line">The Campus Ready Foundation Team</div><div class="signature-title">Supporting students on their path to success</div></div>' +
'</div>' +
'<div class="footer"><h4>Questions? We\'re here to help!</h4>' +
'<p>Email us at <a href="mailto:apply@campusready.org" class="contact-link">apply@campusready.org</a></p>' +
'<div class="important-note"><strong>Important:</strong> Save your Application ID (<strong>' + applicationId + '</strong>) for future reference</div>' +
'</div></div></body></html>';
}

// === HTML PAGES ===
function createSuccessPage(data, applicationId) {
  const firstName = data.student_name ? data.student_name.split(' ')[0] : 'Student';
  const submittedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const gclid = data.gclid || '';

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>Application Submitted - Campus Ready Foundation</title>' +
'<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17798681592"></script>' +
'<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
'gtag("js",new Date());gtag("config","AW-17798681592");' +
'gtag("event","conversion",{"send_to":"AW-17798681592/64eLCKSSwdAbEPiniadC","value":1.0,"currency":"USD","transaction_id":"' + applicationId + '","gclid":"' + gclid + '"});' +
'</script>' +
'<style>' +
'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }' +
'.container { background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); padding: 48px; max-width: 600px; width: 100%; text-align: center; }' +
'.success-icon { width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }' +
'.checkmark { width: 40px; height: 40px; color: white; font-size: 30px; font-weight: bold; }' +
'h1 { color: #1f2937; font-size: 32px; font-weight: 700; margin: 0 0 16px; }' +
'.subtitle { color: #6b7280; font-size: 18px; margin-bottom: 32px; line-height: 1.6; }' +
'.details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: left; }' +
'.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }' +
'.detail-row:last-child { border-bottom: none; }' +
'.detail-label { font-weight: 600; color: #374151; }' +
'.detail-value { color: #6b7280; font-family: Monaco, monospace; }' +
'.next-steps { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: left; }' +
'.next-steps h3 { color: #1e40af; margin: 0 0 16px; font-size: 18px; }' +
'.next-steps ol { margin: 0; padding-left: 20px; color: #374151; }' +
'.next-steps li { margin-bottom: 8px; line-height: 1.5; }' +
'.email-notice { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; color: #92400e; text-align: left; line-height: 1.5; }' +
'.actions { display: flex; gap: 16px; justify-content: center; margin-top: 32px; flex-wrap: wrap; }' +
'.btn { padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; font-size: 16px; }' +
'.btn-primary { background: #14b8a6; color: white; }' +
'.btn-primary:hover { background: #0d9488; }' +
'.btn-secondary { background: white; color: #374151; border: 2px solid #d1d5db; }' +
'.contact-info { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }' +
'@media (max-width: 640px) { .container { padding: 32px 24px; } h1 { font-size: 24px; } .actions { flex-direction: column; } .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; } }' +
'</style></head><body>' +
'<div class="container">' +
'<div class="success-icon"><div class="checkmark">✓</div></div>' +
'<h1>Application Successfully Submitted!</h1>' +
'<p class="subtitle">Thank you, <strong>' + firstName + '</strong>! We\'ve received your Campus Ready Foundation grant application and will begin our review process.</p>' +
'<div class="details-box">' +
'<div class="detail-row"><span class="detail-label">Application ID:</span><span class="detail-value">' + applicationId + '</span></div>' +
'<div class="detail-row"><span class="detail-label">Submitted:</span><span class="detail-value">' + submittedDate + '</span></div>' +
'<div class="detail-row"><span class="detail-label">College:</span><span class="detail-value">' + (data.college || 'Not specified') + '</span></div>' +
'<div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">' + (data.student_email || 'Not provided') + '</span></div>' +
'</div>' +
'<div class="email-notice"><strong>📧 Confirmation email on the way.</strong> You\'ll receive a confirmation email within the next hour. If it doesn\'t arrive (check your spam folder first), email us at <a href="mailto:apply@campusready.org" style="color:#92400e;"><strong>apply@campusready.org</strong></a> with your Application ID above.</div>' +
'<div class="next-steps">' +
'<h3>📋 What Happens Next</h3>' +
'<ol>' +
'<li><strong>Save this page:</strong> Your Application ID is your record of submission</li>' +
'<li><strong>Review Period:</strong> Our board will review all applications after the May 15 deadline</li>' +
'<li><strong>Decision Notification:</strong> All applicants will be notified of decisions by <strong>June 1</strong></li>' +
'<li><strong>If Selected:</strong> We\'ll contact you about your Campus Ready Essentials Kit and ongoing support</li>' +
'</ol>' +
'</div>' +
'<div class="actions">' +
'<a href="https://campusready.org" class="btn btn-primary">Return to Campus Ready</a>' +
'<button onclick="window.print()" class="btn btn-secondary">Save This Page</button>' +
'</div>' +
'<div class="contact-info"><strong>Questions?</strong> Contact us at <a href="mailto:apply@campusready.org" style="color: #14b8a6;">apply@campusready.org</a><br><br><strong>Important:</strong> Please save your Application ID (' + applicationId + ') for future reference.</div>' +
'</div></body></html>';

  return HtmlService.createHtmlOutput(html);
}

function createAlreadySubmittedPage(existingAppId, data) {
  const firstName = (data && data.student_name) ? data.student_name.split(' ')[0] : 'Student';

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>Application Already Received - Campus Ready Foundation</title>' +
'<style>' +
'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }' +
'.container { background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); padding: 48px; max-width: 600px; width: 100%; text-align: center; }' +
'.icon { width: 80px; height: 80px; background: #0d9488; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 40px; font-weight: bold; }' +
'h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin: 0 0 16px; }' +
'.subtitle { color: #6b7280; font-size: 18px; margin-bottom: 32px; line-height: 1.6; }' +
'.details-box { background: #f0fdfa; border: 2px solid #99f6e4; border-radius: 12px; padding: 24px; margin: 32px 0; }' +
'.detail-label { font-weight: 600; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }' +
'.detail-value { color: #0f766e; font-family: Monaco, monospace; font-weight: 600; font-size: 18px; word-break: break-all; }' +
'.contact-info { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; line-height: 1.6; }' +
'.btn { background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 16px; }' +
'</style></head><body>' +
'<div class="container">' +
'<div class="icon">✓</div>' +
'<h1>We Already Have Your Application</h1>' +
'<p class="subtitle">Hi ' + escapeHtml(firstName) + ' — our records show we\'ve already received your Campus Ready Foundation grant application for this cycle. You don\'t need to submit again.</p>' +
'<div class="details-box">' +
'<div class="detail-label">Your Application ID</div>' +
'<div class="detail-value">' + escapeHtml(existingAppId) + '</div>' +
'</div>' +
'<div class="contact-info">' +
'<strong>Need to correct something?</strong><br>' +
'Email <a href="mailto:apply@campusready.org" style="color:#14b8a6;">apply@campusready.org</a> with your Application ID and we\'ll help you.<br><br>' +
'All applicants will be notified of decisions by <strong>June 1</strong>.' +
'</div>' +
'<a href="https://campusready.org" class="btn">Return to Campus Ready</a>' +
'</div></body></html>';

  return HtmlService.createHtmlOutput(html);
}

function createErrorPage(error) {
  const errorHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>Submission Error - Campus Ready Foundation</title>' +
'<style>' +
'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #fef2f2; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }' +
'.container { background: white; border-radius: 12px; border: 1px solid #fecaca; padding: 40px; max-width: 500px; width: 100%; text-align: center; }' +
'.error-icon { color: #dc2626; font-size: 48px; margin-bottom: 16px; }' +
'h1 { color: #dc2626; margin-bottom: 16px; }' +
'p { color: #6b7280; margin-bottom: 24px; line-height: 1.6; }' +
'.btn { background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }' +
'</style></head><body>' +
'<div class="container">' +
'<div class="error-icon">⚠️</div>' +
'<h1>Submission Error</h1>' +
'<p>We encountered an issue processing your application. Please try again or contact us for assistance.</p>' +
'<p><strong>Error:</strong> ' + String(error) + '</p>' +
'<a href="javascript:history.back()" class="btn">Try Again</a>' +
'</div></body></html>';
  return HtmlService.createHtmlOutput(errorHtml);
}

// === UTILITY HELPERS ===
function getMasterSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.MASTER_SHEET_NAME);
  if (!sheet) throw new Error('Master sheet not found');
  return sheet;
}

function findNextAvailableRow(sheet) {
  const values = sheet.getRange('A:A').getValues();
  for (let i = 1; i < values.length; i++) {
    const rowNumber = i + 1;
    const cellValue = values[i][0];
    if (cellValue === '' || cellValue === null || cellValue === undefined) {
      const formula = sheet.getRange(rowNumber, 1).getFormula();
      if (!formula) return rowNumber;
    }
    if (i >= 4999) return sheet.getLastRow() + 1;
  }
  return sheet.getLastRow() + 1;
}

function generateApplicationId() {
  return 'CR_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 6);
}

function computeCycleYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month < 5 ? year : year + 1;
}

function isGuardianRequired(data) {
  if (data.is_minor === 'Yes') return true;
  if (data.student_dob) {
    const dob = new Date(data.student_dob);
    if (!isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
      return age < 18;
    }
  }
  return false;
}

function getConsentSentence(data) {
  return data.consent_sentence ||
    'I agree to electronic records and signatures. I certify that I am the named applicant and intend my electronic signature to be legally binding.';
}

function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const str = String(value).trim().toLowerCase();
  return ['true', 'on', '1', 'yes'].indexOf(str) !== -1;
}

function cleanIncomeValue(income) {
  if (!income) return 0;
  const cleaned = String(income).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function buildHouseholdCircumstances(data) {
  if (!data.household_circumstances) return '';
  let circumstances = [];
  if (Array.isArray(data.household_circumstances)) {
    circumstances = data.household_circumstances;
  } else if (typeof data.household_circumstances === 'string') {
    circumstances = [data.household_circumstances];
  }
  return circumstances.join(', ');
}

function buildAffordabilityConcerns(data) {
  if (!data.affordability_concerns) return '';
  let concerns = [];
  if (Array.isArray(data.affordability_concerns)) {
    concerns = data.affordability_concerns.slice();
  } else {
    concerns = [String(data.affordability_concerns)];
  }
  if (concerns.indexOf('other') !== -1 && data.other_concern_text) {
    const index = concerns.indexOf('other');
    concerns[index] = 'Other: ' + data.other_concern_text;
  }
  return concerns.join(', ');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// === TESTING / DIAGNOSTIC FUNCTIONS ===
function validateConfiguration() {
  const issues = [];
  try {
    SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    console.log('✓ Spreadsheet access: OK');
  } catch (err) { issues.push('✗ Spreadsheet access: ' + err.message); }

  try {
    const sheet = getMasterSheet();
    if (sheet) console.log('✓ Master sheet: OK');
  } catch (err) { issues.push('✗ Master sheet: ' + err.message); }

  try {
    const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    console.log('✓ PDF folder: ' + folder.getName());
  } catch (err) { issues.push('✗ PDF folder: ' + err.message); }

  try {
    getPendingDataSheet();
    console.log('✓ PendingData sheet: OK');
  } catch (err) { issues.push('✗ PendingData sheet: ' + err.message); }

  return issues.length === 0 ? '✓ All validations passed' : 'Issues:\n' + issues.join('\n');
}

// Simulates a sync doPost with mock data. Writes a row with Pending Processing.
// Leave on staging; do not run on production.
function testSyncPath() {
  const mockEvent = {
    postData: {
      contents: 'student_name=Sync%20Test&student_email=synctest_' + Date.now() + '%40example.com' +
        '&student_address=123%20Test%20St&student_city_name=Napa&student_state=CA&student_zip=94559' +
        '&college=Test%20University&college_address=456%20College%20Ave&college_city_name=Davis' +
        '&college_state=CA&college_zip=95616&household_members=4&household_income=48000' +
        '&essay1=This%20is%20a%20test%20essay&essay2=Another%20test%20essay' +
        '&applicant_typed_name=Sync%20Test&certify=on'
    }
  };
  const result = doPost(mockEvent);
  console.log('Sync path complete. Check Master for Pending Processing row.');
  return 'Done. Check logs.';
}

// Manually fire the background worker (e.g., from the editor while testing)
function testBackgroundPath() {
  processBackgroundQueue();
  return 'Background run complete. Check logs.';
}

// === COMPATIBILITY ===
// Use this in any sheet formula that needs distance:
//   =getDistanceByZip("94558", "95616")
function getDistanceByZip(homeZip, collegeZip) {
  return calculateDistance({ student_zip: homeZip, college_zip: collegeZip });
}

// The old address-based shim. After the 2026 ZIP-only refactor, this no longer
// works because calculateDistance requires ZIPs. Returns a clear error so any
// orphaned sheet formula surfaces immediately instead of silently writing junk.
function getDistance(originAddress, destinationAddress) {
  return 'getDistance() is deprecated. Use =getDistanceByZip(homeZip, collegeZip) instead.';
}
