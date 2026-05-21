/**
 * Campus Ready Foundation — Board Essay Score Import
 * Single-step: click "Import Board Scores", review the preview window,
 * click Proceed to apply or Cancel to abort.
 *
 * Menu wiring lives in Applications_Admin_Script.gs (single onOpen per project).
 */

// Reviewer source spreadsheet IDs.
const ERIC_SHEET_ID  = '15uZHKaIFwcTzvbRtFwscus7AqzKHFaW2geZit-Yujr8';
const KAREN_SHEET_ID = '11UmeceKEd73j06FjhU6itezwhF2F5SxoLZy9690dLfk';
const JANIE_SHEET_ID = '1es0Ul3mJ1Mxz227Qa6Xr_yhJN5cNpkDcg83kGznGsmc';

// Set to true only on the final import run after all three reviewers have finished scoring.
const LOG_MISSING_SCORES = false;

const REVIEWERS = [
  { name: 'Eric Lilavois',  sheetId: ERIC_SHEET_ID,
    essay1Col: 'Eric Lilavois Essay 1 Score',  essay2Col: 'Eric Lilavois Essay 2 Score' },
  { name: 'Karen Dantzler', sheetId: KAREN_SHEET_ID,
    essay1Col: 'Karen Dantzler Essay 1 Score', essay2Col: 'Karen Dantzler Essay 2 Score' },
  { name: 'Janie Green',    sheetId: JANIE_SHEET_ID,
    essay1Col: 'Janie Green Essay 1 Score',    essay2Col: 'Janie Green Essay 2 Score' },
];

const SCORING_TAB       = 'Scoring Sheet';
const SOURCE_HEADER_SCAN_ROWS = 10; // Auto-detect: scan first N rows of each Scoring Sheet for 'Student Name'
const DEST_TAB          = 'Board_Essays';
const NOTES_TAB         = 'Board Notes';
const LOG_TAB           = 'Import Log';
const HEADER_SCAN_ROWS  = 5;

const SRC_NAME_HEADER  = 'Student Name';
const SRC_NOTES_HEADER = 'Notes (optional)';
const SRC_ESSAY1_HEADERS = ['Essay 1\n(1-10)', 'Essay 1 (1-10)', 'Essay 1(1-10)'];
const SRC_ESSAY2_HEADERS = ['Essay 2\n(1-10)', 'Essay 2 (1-10)', 'Essay 2(1-10)'];

const DEST_NAME_HEADER  = 'Name';
const ESSAY1_AVG_HEADER = 'Essay 1 Avg';
const ESSAY2_AVG_HEADER = 'Essay 2 Avg';

// ============================================
// MENU ENTRY POINT (single item)
// onOpen lives in Applications_Admin_Script.gs
// ============================================

function importBoardScores() {
  const result = analyzeBoardScores();
  if (result.fatalError) {
    SpreadsheetApp.getUi().alert(result.fatalError);
    return;
  }
  const html = HtmlService.createHtmlOutput(buildPreviewHtml(result))
    .setWidth(900).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Board Score Import — Review Before Applying');
}

// Called from the dialog's Proceed button.
function executeBoardScoreImport() {
  const result = analyzeBoardScores();
  if (result.fatalError) {
    return { ok: false, message: result.fatalError };
  }
  applyImport(result);
  return {
    ok: true,
    changes:     result.counters.changes,
    unchanged:   result.counters.unchanged,
    avgChanges:  result.counters.avgChanges,
    notes:       result.notes.length,
    skipped:     result.counters.skipped,
    errors:      result.errors.length,
  };
}

// ============================================
// ANALYSIS (no writes)
// ============================================

function analyzeBoardScores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const errors = [];
  const notes = [];
  const writes = [];
  const counters = { changes: 0, unchanged: 0, avgChanges: 0, skipped: 0 };

  const destSheet = ss.getSheetByName(DEST_TAB);
  if (!destSheet) return { fatalError: 'Destination tab "' + DEST_TAB + '" not found.' };

  const destData = destSheet.getDataRange().getValues();
  if (destData.length === 0) return { fatalError: 'Destination tab "' + DEST_TAB + '" is empty.' };

  const headerRowIdx = findHeaderRowIdx(destData, DEST_NAME_HEADER, HEADER_SCAN_ROWS);
  if (headerRowIdx === -1) {
    return { fatalError: 'Could not find header "' + DEST_NAME_HEADER +
      '" in the first ' + HEADER_SCAN_ROWS + ' rows of ' + DEST_TAB + '.' };
  }

  const destHeaders = destData[headerRowIdx].map(String);
  const destNameCol = destHeaders.indexOf(DEST_NAME_HEADER);

  const originalDestData = destData.map(row => row.slice());

  const nameToRow = {};
  for (let r = headerRowIdx + 1; r < destData.length; r++) {
    const n = normalizeName(destData[r][destNameCol]);
    if (n) nameToRow[n] = r;
  }

  const reviewerCols = REVIEWERS.map(r => ({
    e1: destHeaders.indexOf(r.essay1Col),
    e2: destHeaders.indexOf(r.essay2Col),
  }));

  REVIEWERS.forEach((reviewer, rIdx) => {
    if (!reviewer.sheetId || reviewer.sheetId.indexOf('REPLACE_WITH') === 0) {
      errors.push({ reviewer: reviewer.name, student: '', reason: 'Sheet ID not configured' });
      return;
    }

    let srcSs;
    try {
      srcSs = SpreadsheetApp.openById(reviewer.sheetId);
    } catch (e) {
      errors.push({ reviewer: reviewer.name, student: '',
        reason: 'Cannot open source sheet: ' + e.message });
      return;
    }

    const srcSheet = srcSs.getSheetByName(SCORING_TAB);
    if (!srcSheet) {
      errors.push({ reviewer: reviewer.name, student: '',
        reason: 'Tab "' + SCORING_TAB + '" not found' });
      return;
    }

    const srcValues = srcSheet.getDataRange().getValues();
    if (srcValues.length === 0) return;

    const srcHeaderRowIdx = findHeaderRowIdx(srcValues, SRC_NAME_HEADER, SOURCE_HEADER_SCAN_ROWS);
    if (srcHeaderRowIdx === -1) {
      errors.push({ reviewer: reviewer.name, student: '',
        reason: 'Could not find "' + SRC_NAME_HEADER + '" in first ' +
                SOURCE_HEADER_SCAN_ROWS + ' rows of "' + SCORING_TAB + '" tab' });
      return;
    }

    const srcHeaders = srcValues[srcHeaderRowIdx].map(String);
    const nameIdx   = srcHeaders.indexOf(SRC_NAME_HEADER);
    const essay1Idx = findFirstHeader(srcHeaders, SRC_ESSAY1_HEADERS);
    const essay2Idx = findFirstHeader(srcHeaders, SRC_ESSAY2_HEADERS);
    const notesIdx  = srcHeaders.indexOf(SRC_NOTES_HEADER);

    if (nameIdx === -1 || essay1Idx === -1 || essay2Idx === -1) {
      errors.push({ reviewer: reviewer.name, student: '',
        reason: 'Required header missing in source sheet (need Student Name, Essay 1, Essay 2)' });
      return;
    }

    const dE1 = reviewerCols[rIdx].e1;
    const dE2 = reviewerCols[rIdx].e2;
    if (dE1 === -1 || dE2 === -1) {
      errors.push({ reviewer: reviewer.name, student: '',
        reason: 'Reviewer column missing in ' + DEST_TAB });
      return;
    }

        for (let i = srcHeaderRowIdx + 1; i < srcValues.length; i++) {
      const row = srcValues[i];
      const studentName = (row[nameIdx] == null ? '' : String(row[nameIdx])).trim();
      if (!studentName) continue;

      const destRow = nameToRow[normalizeName(studentName)];
      if (destRow === undefined) {
        errors.push({ reviewer: reviewer.name, student: studentName,
          reason: 'No matching student in ' + DEST_TAB });
        counters.skipped++;
        continue;
      }

      processScore(row[essay1Idx], 'Essay 1', dE1, destRow, reviewer, studentName,
                   destData, writes, errors, counters);
      processScore(row[essay2Idx], 'Essay 2', dE2, destRow, reviewer, studentName,
                   destData, writes, errors, counters);

      const note = notesIdx === -1 ? '' :
        (row[notesIdx] == null ? '' : String(row[notesIdx]).trim());
      if (note) notes.push({ student: studentName, reviewer: reviewer.name, note: note });
    }
  });

  // Recompute averages (only where all three reviewer scores are valid).
  const avg1Col = destHeaders.indexOf(ESSAY1_AVG_HEADER);
  const avg2Col = destHeaders.indexOf(ESSAY2_AVG_HEADER);
  const reviewerE1Cols = reviewerCols.map(c => c.e1);
  const reviewerE2Cols = reviewerCols.map(c => c.e2);

  for (let r = headerRowIdx + 1; r < destData.length; r++) {
    const studentName = String(destData[r][destNameCol] || '').trim();
    if (!studentName) continue;

    if (avg1Col !== -1) {
      const vals = reviewerE1Cols.map(c => c === -1 ? null : destData[r][c]);
      const newAvg = vals.every(isValidScore) ? avg(vals) : '';
      const oldAvg = originalDestData[r][avg1Col];
      if (newAvg !== oldAvg) {
        writes.push({ type: 'avg', reviewer: '(calculated)', student: studentName,
          cell: 'Essay 1 Avg', oldValue: oldAvg, newValue: newAvg });
        counters.avgChanges++;
      }
      destData[r][avg1Col] = newAvg;
    }

    if (avg2Col !== -1) {
      const vals = reviewerE2Cols.map(c => c === -1 ? null : destData[r][c]);
      const newAvg = vals.every(isValidScore) ? avg(vals) : '';
      const oldAvg = originalDestData[r][avg2Col];
      if (newAvg !== oldAvg) {
        writes.push({ type: 'avg', reviewer: '(calculated)', student: studentName,
          cell: 'Essay 2 Avg', oldValue: oldAvg, newValue: newAvg });
        counters.avgChanges++;
      }
      destData[r][avg2Col] = newAvg;
    }
  }

  if (LOG_MISSING_SCORES) {
    for (let r = headerRowIdx + 1; r < destData.length; r++) {
      const studentName = String(destData[r][destNameCol] || '').trim();
      if (!studentName) continue;
      REVIEWERS.forEach((reviewer, rIdx) => {
        const c1 = reviewerCols[rIdx].e1;
        const c2 = reviewerCols[rIdx].e2;
        if (c1 !== -1 && !isValidScore(destData[r][c1])) {
          errors.push({ reviewer: reviewer.name, student: studentName,
            reason: 'Missing Essay 1 score after import' });
        }
        if (c2 !== -1 && !isValidScore(destData[r][c2])) {
          errors.push({ reviewer: reviewer.name, student: studentName,
            reason: 'Missing Essay 2 score after import' });
        }
      });
    }
  }

  return {
    destSheet: destSheet,
    destData: destData,
    headerRowIdx: headerRowIdx,
    nameToRow: nameToRow,
    reviewerCols: reviewerCols,
    avg1Col: avg1Col,
    avg2Col: avg2Col,
    writes: writes,
    errors: errors,
    notes: notes,
    counters: counters,
  };
}

// ============================================
// APPLY (writes)
// ============================================

function applyImport(result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  writeBackChangedColumns(result.destSheet, result.destData, result.nameToRow,
                          result.reviewerCols, result.avg1Col, result.avg2Col);
  writeBoardNotes(ss, result.notes);
  writeImportLog(ss, result.errors);
}

// ============================================
// HELPERS
// ============================================

function processScore(rawValue, essayLabel, destCol, destRow, reviewer, studentName,
                      destData, writes, errors, counters) {
  if (isBlank(rawValue)) return;

  if (!isValidScore(rawValue)) {
    errors.push({ reviewer: reviewer.name, student: studentName,
      reason: essayLabel + ' score invalid: "' + rawValue + '"' });
    counters.skipped++;
    return;
  }

  const newVal = Number(rawValue);
  const oldVal = destData[destRow][destCol];

  if (newVal !== oldVal) {
    writes.push({ type: 'score', reviewer: reviewer.name, student: studentName,
      cell: essayLabel + ' Score', oldValue: oldVal, newValue: newVal });
    counters.changes++;
  } else {
    counters.unchanged++;
  }
  destData[destRow][destCol] = newVal;
}

function findHeaderRowIdx(data, requiredHeader, maxRowsToScan) {
  const max = Math.min(maxRowsToScan, data.length);
  for (let r = 0; r < max; r++) {
    if (data[r].map(String).indexOf(requiredHeader) !== -1) return r;
  }
  return -1;
}

function findFirstHeader(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const idx = headers.indexOf(candidates[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

function isBlank(v) { return v === '' || v === null || v === undefined; }

function isValidScore(v) {
  if (isBlank(v)) return false;
  const n = Number(v);
  if (isNaN(n)) return false;
  if (n !== Math.floor(n)) return false;
  return n >= 1 && n <= 10;
}

function avg(vals) {
  let s = 0;
  vals.forEach(v => s += Number(v));
  return s / vals.length;
}

function normalizeName(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function writeBackChangedColumns(destSheet, destData, nameToRow, reviewerCols, avg1Col, avg2Col) {
  const studentRows = Object.keys(nameToRow).map(k => nameToRow[k]);
  if (studentRows.length === 0) return;

  const minRow = Math.min.apply(null, studentRows);
  const maxRow = Math.max.apply(null, studentRows);
  const numRows = maxRow - minRow + 1;

  const colsToWrite = [];
  reviewerCols.forEach(c => {
    if (c.e1 !== -1) colsToWrite.push(c.e1);
    if (c.e2 !== -1) colsToWrite.push(c.e2);
  });
  if (avg1Col !== -1) colsToWrite.push(avg1Col);
  if (avg2Col !== -1) colsToWrite.push(avg2Col);

  colsToWrite.forEach(col => {
    const colData = [];
    for (let r = minRow; r <= maxRow; r++) {
      colData.push([destData[r][col]]);
    }
    destSheet.getRange(minRow + 1, col + 1, numRows, 1).setValues(colData);
  });
}

function writeBoardNotes(ss, notes) {
  let sheet = ss.getSheetByName(NOTES_TAB);
  if (!sheet) sheet = ss.insertSheet(NOTES_TAB);
  sheet.clear();
  const rows = [['Student Name', 'Reviewer', 'Note']];
  notes.forEach(n => rows.push([n.student, n.reviewer, n.note]));
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.setFrozenRows(1);
}

function writeImportLog(ss, errors) {
  let sheet = ss.getSheetByName(LOG_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_TAB);
    sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Reviewer', 'Student Name', 'Reason']]);
    sheet.setFrozenRows(1);
  }
  if (!errors.length) return;
  const ts = new Date();
  const rows = errors.map(e => [ts, e.reviewer || '', e.student || '', e.reason || '']);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
}

// ============================================
// PREVIEW DIALOG HTML
// ============================================

function buildPreviewHtml(result) {
  const esc = function(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const fmt = function(v) {
    if (isBlank(v)) return '<span style="color:#9aa0a6">(blank)</span>';
    if (typeof v === 'number') return esc(Math.round(v * 100) / 100);
    return esc(v);
  };

  const c = result.counters;
  const hasChanges = result.writes.length > 0 || result.notes.length > 0;

  let html = ''
    + '<style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:14px;color:#202124;margin:0;}'
    + 'h2{margin:0 0 12px;font-size:18px;}'
    + 'h3{font-size:12px;margin:18px 0 6px;color:#5f6368;text-transform:uppercase;letter-spacing:.6px;}'
    + '.summary{background:#f8f9fa;border:1px solid #dadce0;border-radius:6px;padding:10px 14px;}'
    + '.summary table{width:100%;border-collapse:collapse;}'
    + '.summary td{padding:3px 6px;font-size:13px;}'
    + '.summary td:first-child{color:#5f6368;}'
    + '.summary td:last-child{font-weight:600;text-align:right;}'
    + '.err{color:#c5221f;}'
    + 'table.changes{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}'
    + 'table.changes th,table.changes td{padding:5px 8px;border-bottom:1px solid #e8eaed;text-align:left;vertical-align:top;}'
    + 'table.changes th{background:#f8f9fa;font-weight:600;color:#5f6368;position:sticky;top:0;}'
    + 'table.changes td.num{font-variant-numeric:tabular-nums;text-align:right;}'
    + '.none{color:#5f6368;font-style:italic;padding:6px 0;font-size:13px;}'
    + '.note-cell{max-width:480px;white-space:pre-wrap;}'
    + '#actions{position:sticky;bottom:0;background:#fff;padding:12px 0 4px;border-top:1px solid #e8eaed;margin-top:18px;text-align:right;}'
    + 'button{font-size:13px;padding:8px 18px;border-radius:4px;border:1px solid #dadce0;background:#fff;cursor:pointer;margin-left:8px;}'
    + 'button.primary{background:#1a73e8;color:#fff;border-color:#1a73e8;}'
    + 'button:disabled{background:#dadce0;border-color:#dadce0;color:#80868b;cursor:default;}'
    + 'button.primary:disabled{background:#9aa0a6;border-color:#9aa0a6;color:#fff;}'
    + '#status{margin-right:12px;font-size:13px;color:#1a73e8;}'
    + '#status.done{color:#137333;font-weight:600;}'
    + '#status.err{color:#c5221f;font-weight:600;}'
    + '</style>'

    + '<h2>Review changes before applying</h2>'
    + '<div class="summary"><table>'
    + '<tr><td>Score changes to be written</td><td>' + c.changes + '</td></tr>'
    + '<tr><td>Scores re-imported unchanged</td><td>' + c.unchanged + '</td></tr>'
    + '<tr><td>Averages to be updated</td><td>' + c.avgChanges + '</td></tr>'
    + '<tr><td>Notes to be consolidated</td><td>' + result.notes.length + '</td></tr>'
    + '<tr><td>Skipped (invalid or unmatched)</td><td>' + c.skipped + '</td></tr>'
    + '<tr><td>Errors / flags</td><td class="' + (result.errors.length ? 'err' : '') + '">' + result.errors.length + '</td></tr>'
    + '</table></div>'

    + '<h3>Changes</h3>';

  if (result.writes.length === 0) {
    html += '<div class="none">No changes would be made.</div>';
  } else {
    html += '<table class="changes"><thead><tr>'
      + '<th>Type</th><th>Reviewer</th><th>Student</th><th>Cell</th>'
      + '<th>Old</th><th>New</th></tr></thead><tbody>';
    result.writes.forEach(function(w) {
      html += '<tr>'
        + '<td>' + esc(w.type) + '</td>'
        + '<td>' + esc(w.reviewer) + '</td>'
        + '<td>' + esc(w.student) + '</td>'
        + '<td>' + esc(w.cell) + '</td>'
        + '<td class="num">' + fmt(w.oldValue) + '</td>'
        + '<td class="num">' + fmt(w.newValue) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
  }

  if (result.errors.length) {
    html += '<h3>Errors / Flags</h3>'
      + '<table class="changes"><thead><tr>'
      + '<th>Reviewer</th><th>Student</th><th>Reason</th></tr></thead><tbody>';
    result.errors.forEach(function(e) {
      html += '<tr>'
        + '<td>' + esc(e.reviewer) + '</td>'
        + '<td>' + esc(e.student) + '</td>'
        + '<td class="err">' + esc(e.reason) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
  }

  if (result.notes.length) {
    html += '<h3>Notes to consolidate</h3>'
      + '<table class="changes"><thead><tr>'
      + '<th>Student</th><th>Reviewer</th><th>Note</th></tr></thead><tbody>';
    result.notes.forEach(function(n) {
      html += '<tr>'
        + '<td>' + esc(n.student) + '</td>'
        + '<td>' + esc(n.reviewer) + '</td>'
        + '<td class="note-cell">' + esc(n.note) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
  }

  html += '<div id="actions">'
    + '<span id="status"></span>'
    + '<button onclick="google.script.host.close()">Cancel</button>'
    + '<button id="proceedBtn" class="primary" onclick="proceed()"'
    + (hasChanges ? '' : ' disabled') + '>Proceed with Import</button>'
    + '</div>'

    + '<script>'
    + 'function proceed(){'
    + '  document.getElementById("proceedBtn").disabled=true;'
    + '  document.getElementById("status").className="";'
    + '  document.getElementById("status").innerText="Applying...";'
    + '  google.script.run'
    + '    .withSuccessHandler(onDone)'
    + '    .withFailureHandler(onErr)'
    + '    .executeBoardScoreImport();'
    + '}'
    + 'function onDone(r){'
    + '  var s=document.getElementById("status");'
    + '  if(!r.ok){s.className="err";s.innerText="Error: "+r.message;return;}'
    + '  s.className="done";'
    + '  s.innerText="Import complete — "+r.changes+" score changes, "+r.avgChanges+" avg updates, "'
    + '    +r.notes+" notes consolidated, "+r.errors+" errors logged.";'
    + '}'
    + 'function onErr(err){'
    + '  var s=document.getElementById("status");'
    + '  s.className="err";'
    + '  s.innerText="Error: "+(err.message||err);'
    + '  document.getElementById("proceedBtn").disabled=false;'
    + '}'
    + '<\/script>';

  return html;
}
