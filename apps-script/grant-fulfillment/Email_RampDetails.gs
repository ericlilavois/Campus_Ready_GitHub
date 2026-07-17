/**
 * Email_RampDetails.gs
 * "What your Ramp travel card covers"
 *
 * Sent to each 2026 grant recipient once their Ramp card is configured.
 *
 * Merge fields (passed to sendRampDetailsEmail)
 * ────────────────────────────────────────────
 *   FirstName              string   Student's first name
 *   flight_amount          number   Flight budget — omit or 0 to hide row
 *   gas_amount             number   Gas/driving budget — omit or 0 to hide row
 *   hotel_amount           number   Hotel budget — omit or 0 to hide row
 *   card_amount            number   Total loaded on the card
 * Per-purchase limit is computed automatically as the highest of the three category amounts.
 *
 * Amount buckets (computed by _getRampDetailsData_):
 *   is_flight_mode = Transport Mode contains "flight" or "flying"
 *
 *   if is_flight_mode:
 *     flight_amount = Primary Transport + Companion Transport + Companion Ground
 *     gas_amount    = Companion Return Gas
 *   else:
 *     gas_amount    = Primary Transport + Companion Return Gas
 *     flight_amount = Companion Transport + Companion Ground
 *
 *   hotel_amount = Hotel
 *   card_amount  = ROUND(CRF Cash Outlay × 1.15 / 25) × 25   (no floor, per DEC-049/055)
 *
 * Airport Lyft is never included — it's covered by the $150 Lyft credit code (DEC-053/054).
 *
 * Hard excludes (DEC-057):
 *   Lilian Barrientos Aceituno — excluded from Ramp entirely
 *   Marely Vazquez Garcia      — Transport Mode unconfirmed; include after sheet is updated
 */


// ─── CONFIG ────────────────────────────────────────────────────────────────────

var RAMP_DETAILS_LOGO_URL_ =
  'https://campusready.org/assets/img/brand/CRF_logo.lockup.GRN.png';

var RAMP_DETAILS_TEST_EMAIL_ = 'elilavois@gmail.com';

var RD_SENT_COL_NAME_ = 'Ramp Details Email Sent';


// ─── PUBLIC ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Sends the Ramp card details email to one student.
 *
 * @param {{
 *   email: string,
 *   FirstName: string,
 *   flight_amount: (number|string|null|undefined),
 *   gas_amount:    (number|string|null|undefined),
 *   hotel_amount:  (number|string|null|undefined),
 *   card_amount:   (number|string),
 * }} student
 */
function sendRampDetailsEmail(student) {
  MailApp.sendEmail({
    to:        student.email,
    subject:   'What your Ramp travel card covers',
    htmlBody:  _buildRampDetailsHTML(student),
    plainBody: _buildRampDetailsText(student),
    name:      'Campus Ready Foundation'
  });
}


// ─── DATA LAYER ────────────────────────────────────────────────────────────────

var RAMP_DETAILS_EXCLUDES_ = [
  'lilian barrientos aceituno',
  'marely vazquez garcia'
];

/** Parses a sheet dollar value ('$1,050', '-', '') to a number (0 if absent). */
function _rdParseAmt_(val) {
  if (!val || String(val).trim() === '-') return 0;
  return Number(String(val).replace(/[$,\s]/g, '')) || 0;
}

/** Whitespace-collapsed, lower-cased string for name comparison. */
function _rdNormName_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Finds a column index in a headers array.
 * Normalizes newlines to spaces before matching; falls back to substring search.
 */
function _rdFindCol_(headers, needle) {
  var norm = [];
  for (var i = 0; i < headers.length; i++) {
    norm.push(String(headers[i]).replace(/\n/g, ' ').trim());
  }
  var exact = norm.indexOf(needle);
  if (exact !== -1) return exact;
  for (var j = 0; j < norm.length; j++) {
    if (norm[j].indexOf(needle) !== -1) return j;
  }
  return -1;
}

/**
 * Reads Travel_Detail + Grant_Recipients and returns the data needed
 * to drive sendRampDetailsEmails().
 *
 * Returns:
 *   students  — array of student objects ready for sendRampDetailsEmail()
 *               plus _grRowIndex and _alreadySent internal fields
 *   grSheet   — the Grant_Recipients Sheet (for writing sent status)
 *   sentCol   — 0-indexed column of RD_SENT_COL_NAME_ in Grant_Recipients
 */
function _getRampDetailsData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Travel_Detail ──────────────────────────────────────────────────────────
  var tdSheet = ss.getSheetByName('Travel_Detail');
  if (!tdSheet) throw new Error('Travel_Detail sheet not found');

  var tdAll = tdSheet.getDataRange().getValues();

  // Locate the header row (first row that contains 'Student Name')
  var tdHeaderIdx = -1;
  for (var i = 0; i < Math.min(tdAll.length, 8); i++) {
    for (var j = 0; j < tdAll[i].length; j++) {
      if (String(tdAll[i][j]).trim() === 'Student Name') {
        tdHeaderIdx = i;
        break;
      }
    }
    if (tdHeaderIdx !== -1) break;
  }
  if (tdHeaderIdx === -1) throw new Error('Could not locate header row in Travel_Detail');

  var tdH        = tdAll[tdHeaderIdx];
  var tdNameCol  = _rdFindCol_(tdH, 'Student Name');
  var tdModeCol  = _rdFindCol_(tdH, 'Transport Mode');
  var tdPrimCol  = _rdFindCol_(tdH, 'Primary Transport');
  var tdCompTCol = _rdFindCol_(tdH, 'Companion Transport');
  var tdCompGCol = _rdFindCol_(tdH, 'Companion Ground');
  var tdRetGCol  = _rdFindCol_(tdH, 'Companion Return Gas');
  var tdHotelCol = _rdFindCol_(tdH, 'Hotel');
  var tdOutlay   = _rdFindCol_(tdH, 'CRF Cash Outlay');

  if (tdNameCol === -1 || tdModeCol === -1 || tdPrimCol === -1 || tdOutlay === -1) {
    throw new Error(
      'Required columns not found in Travel_Detail. ' +
      'Expected: Student Name, Transport Mode, Primary Transport, CRF Cash Outlay.'
    );
  }

  // ── Grant_Recipients ───────────────────────────────────────────────────────
  var grSheet = ss.getSheetByName('Grant_Recipients');
  if (!grSheet) throw new Error('Grant_Recipients sheet not found');

  var grData    = grSheet.getDataRange().getValues();
  var grHeaders = grData[0];

  var grEmailCol = _rdFindCol_(grHeaders, 'Email Address');

  // Name column: try several likely headers, fall back to col 0
  var grNameCol = _rdFindCol_(grHeaders, 'Student Name');
  if (grNameCol === -1) grNameCol = _rdFindCol_(grHeaders, 'Full Name');
  if (grNameCol === -1) grNameCol = _rdFindCol_(grHeaders, 'Name');
  if (grNameCol === -1) grNameCol = 0;

  // Ramp Details Email Sent column — auto-create if absent
  var sentColName = RD_SENT_COL_NAME_;
  var sentCol     = -1;
  for (var h = 0; h < grHeaders.length; h++) {
    if (String(grHeaders[h]).trim() === sentColName) { sentCol = h; break; }
  }
  if (sentCol === -1) {
    sentCol = grHeaders.length;
    grSheet.getRange(1, sentCol + 1).setValue(sentColName);
  }

  // Build name-keyed lookup: normalizedName → {email, firstName, rowIndex, alreadySent}
  var grLookup = {};
  for (var r = 1; r < grData.length; r++) {
    var fullName = String(grData[r][grNameCol] || '').trim();
    if (!fullName) continue;
    var norm  = _rdNormName_(fullName);
    var email = grEmailCol !== -1 ? String(grData[r][grEmailCol] || '').trim() : '';
    grLookup[norm] = {
      email:       email,
      firstName:   fullName.split(/\s+/)[0],
      rowIndex:    r + 1,
      alreadySent: grData[r][sentCol]
    };
  }

  // ── Build student list ─────────────────────────────────────────────────────
  var students = [];

  for (var row = tdHeaderIdx + 1; row < tdAll.length; row++) {
    var tdRow  = tdAll[row];
    var tdName = String(tdRow[tdNameCol] || '').trim();
    if (!tdName) continue;
    if (/^(TOTAL|15%|NOTES)/i.test(tdName)) break;  // stop at summary rows

    // Hard excludes
    var normTd   = _rdNormName_(tdName);
    var excluded = false;
    for (var ex = 0; ex < RAMP_DETAILS_EXCLUDES_.length; ex++) {
      if (normTd.indexOf(RAMP_DETAILS_EXCLUDES_[ex]) !== -1) {
        excluded = true;
        break;
      }
    }
    if (excluded) {
      Logger.log('[RampDetails] Excluded: ' + tdName);
      continue;
    }

    // Parse amounts
    var primAmt  = _rdParseAmt_(tdRow[tdPrimCol]);
    var compT    = tdCompTCol !== -1 ? _rdParseAmt_(tdRow[tdCompTCol])  : 0;
    var compG    = tdCompGCol !== -1 ? _rdParseAmt_(tdRow[tdCompGCol])  : 0;
    var retGas   = tdRetGCol  !== -1 ? _rdParseAmt_(tdRow[tdRetGCol])   : 0;
    var hotelAmt = tdHotelCol !== -1 ? _rdParseAmt_(tdRow[tdHotelCol])  : 0;
    var outlay   = _rdParseAmt_(tdRow[tdOutlay]);

    // card_amount: 15% contingency, round to nearest $25 (no floor, DEC-049/055)
    var cardAmt = Math.round(outlay * 1.15 / 25) * 25;
    if (cardAmt <= 0) {
      Logger.log('[RampDetails] No card amount — skipping: ' + tdName);
      continue;
    }

    // Bucket by transport mode
    var mode      = String(tdRow[tdModeCol] || '').toLowerCase();
    var isFlight  = /flight|flying/.test(mode);
    var flightAmt, gasAmt;
    if (isFlight) {
      flightAmt = primAmt + compT + compG;
      gasAmt    = retGas;
    } else {
      gasAmt    = primAmt + retGas;
      flightAmt = compT + compG;
    }

    // Match to Grant_Recipients for email + firstName
    var grRec = grLookup[normTd];
    if (!grRec) {
      // Fallback: match on first token + last token
      var tokens = normTd.split(/\s+/);
      var fl     = tokens[0];
      var ll     = tokens[tokens.length - 1];
      for (var gk in grLookup) {
        var gt = gk.split(/\s+/);
        if (gt[0] === fl && gt[gt.length - 1] === ll) {
          grRec = grLookup[gk];
          break;
        }
      }
    }
    if (!grRec || !grRec.email) {
      Logger.log('[RampDetails] Could not match to Grant_Recipients — skipping: ' + tdName);
      continue;
    }

    students.push({
      name:          tdName,
      FirstName:     grRec.firstName,
      email:         grRec.email,
      flight_amount: flightAmt || null,
      gas_amount:    gasAmt    || null,
      hotel_amount:  hotelAmt  || null,
      card_amount:   cardAmt,
      _grRowIndex:   grRec.rowIndex,
      _alreadySent:  grRec.alreadySent
    });
  }

  return { students: students, grSheet: grSheet, sentCol: sentCol };
}


// ─── TEST ──────────────────────────────────────────────────────────────────────

/**
 * Sends a representative sample to the test address.
 * Uses the design-mockup values (flight + gas + hotel) so the full layout renders.
 * Run this before any live send to verify HTML and text output.
 */
function testRampDetailsEmail() {
  var sample = {
    FirstName:     'Alex',
    email:         RAMP_DETAILS_TEST_EMAIL_,
    flight_amount: 800,
    gas_amount:    150,
    hotel_amount:  200,
    card_amount:   1150
  };
  sendRampDetailsEmail(sample);
  Logger.log('[RampDetails] Test sent to ' + RAMP_DETAILS_TEST_EMAIL_);
  SpreadsheetApp.getUi().alert('Test email sent to ' + RAMP_DETAILS_TEST_EMAIL_);
}


// ─── BULK SENDER ───────────────────────────────────────────────────────────────

/**
 * Sends the Ramp card details email to every eligible student in Travel_Detail.
 *
 * Eligible = has a valid card_amount, not in RAMP_DETAILS_EXCLUDES_, not yet sent.
 * Ramp acceptance status (Pending / Active / not yet invited) is not a gate —
 * seeing their amounts is intended to prompt acceptance (DEC-057).
 *
 * Tracks sends in the Grant_Recipients "Ramp Details Email Sent" column.
 */
function sendRampDetailsEmails() {
  var ui   = SpreadsheetApp.getUi();
  var data;
  try {
    data = _getRampDetailsData_();
  } catch (e) {
    ui.alert('Error loading data', e.message, ui.ButtonSet.OK);
    return;
  }

  var students = data.students;
  var grSheet  = data.grSheet;
  var sentCol  = data.sentCol;

  var eligible = [];
  var skipped  = [];
  for (var i = 0; i < students.length; i++) {
    if (students[i]._alreadySent === 'Yes' ||
        String(students[i]._alreadySent || '').indexOf('Yes') === 0) {
      skipped.push(students[i]);
    } else {
      eligible.push(students[i]);
    }
  }

  if (eligible.length === 0) {
    ui.alert(
      'No Eligible Recipients',
      'All students have already been sent this email.',
      ui.ButtonSet.OK
    );
    return;
  }

  var skipNote = skipped.length > 0
    ? '\n\n' + skipped.length + ' already sent — skipped:\n' +
      skipped.map(function(s) { return '  ' + s.FirstName; }).join('\n')
    : '';

  var confirm = ui.alert(
    'Send ' + eligible.length + ' Ramp Card Details Email(s)?',
    'Ready to send to:\n\n' +
    eligible.map(function(s) {
      return s.FirstName + ' (' + s.name + ') — ' + s.email;
    }).join('\n') +
    skipNote +
    '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var successCount = 0;
  var errors       = [];

  for (var j = 0; j < eligible.length; j++) {
    var s = eligible[j];
    try {
      sendRampDetailsEmail(s);
      grSheet.getRange(s._grRowIndex, sentCol + 1).setValue(
        'Yes — ' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'M/d/yy h:mm a')
      );
      successCount++;
      Logger.log('[RampDetails] Sent: ' + s.email);
      Utilities.sleep(200);
    } catch (e) {
      errors.push(s.FirstName + ' (' + s.email + '): ' + e.message);
      Logger.log('[RampDetails] Failed: ' + s.email + ' — ' + e.message);
    }
  }

  var summary = successCount + ' email(s) sent successfully.';
  if (errors.length > 0) summary += '\n\nErrors:\n' + errors.join('\n');
  ui.alert('Done', summary, ui.ButtonSet.OK);
}


// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

/** Formats a number as a dollar string: 800 → "$800", 1150 → "$1,150". */
function _fmtAmt_(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

/**
 * Returns the active travel rows in display order.
 * A row is included only when its amount is truthy (non-zero, non-null, non-empty).
 *
 * @returns {{ emoji: string, label: string, amount: string }[]}
 */
function _travelRows_(student) {
  var rows = [];
  if (student.flight_amount) {
    rows.push({ emoji: '✈️', label: 'Getting you to campus',         amount: _fmtAmt_(student.flight_amount) });
  }
  if (student.gas_amount) {
    rows.push({ emoji: '⛽', label: 'Fueling the road there',         amount: _fmtAmt_(student.gas_amount) });
  }
  if (student.hotel_amount) {
    rows.push({ emoji: '🏨', label: 'A place to rest along the way', amount: _fmtAmt_(student.hotel_amount) });
  }
  return rows;
}

/** Inline-style shorthand for the Inter font stack (repeated across many cells). */
var FONT_ = "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";


// ─── HTML BUILDER ──────────────────────────────────────────────────────────────
function _buildRampDetailsHTML(student) {
  var rows      = _travelRows_(student);
  var cardAmt   = _fmtAmt_(student.card_amount);
  var maxTxn    = _fmtAmt_(Math.max(Number(student.flight_amount) || 0, Number(student.gas_amount) || 0, Number(student.hotel_amount) || 0));
  var firstName = student.FirstName;

  // Travel item rows — divider only between rows, never after the last one
  var itemRowsHTML = rows.map(function (row, i) {
    var border = (i < rows.length - 1) ? 'border-bottom:1px solid #ccfbf1;' : '';
    return (
      '<tr>' +
        '<td style="padding:16px 20px;' + border + '">' +
          '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
            '<tr>' +
              '<td style="width:28px;vertical-align:middle;font-size:18px;line-height:1;">' + row.emoji + '</td>' +
              '<td style="vertical-align:middle;padding-left:8px;' + FONT_ + 'font-size:14px;color:#0f172a;font-weight:500;">' + row.label + '</td>' +
              '<td style="vertical-align:middle;text-align:right;white-space:nowrap;' + FONT_ + 'font-size:15px;font-weight:700;color:#0d9488;">' + row.amount + '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
      '</tr>'
    );
  }).join('');

  return (
'<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>What your Ramp travel card covers</title>' +
'</head>' +
'<body style="margin:0;padding:0;background:#f1f5f9;">' +

// ── Outer wrapper ──────────────────────────────────────────────────────────────
'<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f1f5f9;">' +
'<tr><td style="padding:32px 16px;">' +

// ── 600px container ────────────────────────────────────────────────────────────
'<table width="600" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);">' +

// ── HEADER ─────────────────────────────────────────────────────────────────────
'<tr>' +
  '<td style="background:#ffffff;padding:28px 32px 24px;text-align:center;border-bottom:1px solid #e2e8f0;">' +
    '<img src="' + RAMP_DETAILS_LOGO_URL_ + '" alt="Campus Ready Foundation" width="240" style="height:120px;width:auto;display:inline-block;border:0;">'   +
  '</td>' +
'</tr>' +

// ── BODY ───────────────────────────────────────────────────────────────────────
'<tr>' +
'<td style="padding:40px 40px 32px;' + FONT_ + '">' +

  // Opening
  '<p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#374151;">' +
    'Hi ' + firstName + ',<br>Here\u2019s what your Campus Ready Foundation travel card from Ramp covers, and how to use it.' +
  '</p>' +

  // ── WHAT IT'S FOR ────────────────────────────────────────────────────────────
  // What it's for: icon circle + eyebrow
  '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">' +
    '<tr>' +
      '<td width="40" height="40" style="width:40px;height:40px;border-radius:50%;background:#f0fdfa;border:1.5px solid #99f6e4;text-align:center;vertical-align:middle;padding:0;">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="8" y1="6" x2="21" y2="6"></line>' +
          '<line x1="8" y1="12" x2="21" y2="12"></line>' +
          '<line x1="8" y1="18" x2="21" y2="18"></line>' +
          '<line x1="3" y1="6" x2="3.01" y2="6"></line>' +
          '<line x1="3" y1="12" x2="3.01" y2="12"></line>' +
          '<line x1="3" y1="18" x2="3.01" y2="18"></line>' +
        '</svg>' +
      '</td>' +
      '<td style="padding-left:12px;vertical-align:middle;' + FONT_ + 'font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#14b8a6;">What it’s for</td>' +
    '</tr>' +
  '</table>' +

  '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 28px;overflow:hidden;">' +

    itemRowsHTML +

    // Total bar
    '<tr>' +
      '<td style="background:#0d9488;padding:14px 20px;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
          '<tr>' +
            '<td style="' + FONT_ + 'font-size:13px;font-weight:500;color:rgba(255,255,255,0.8);">Total on your card</td>' +
            '<td style="text-align:right;' + FONT_ + 'font-size:17px;font-weight:700;color:#ffffff;">' + cardAmt + '</td>' +
          '</tr>' +
        '</table>' +
      '</td>' +
    '</tr>' +

  '</table>' +

  // ── TWO CARDS, TWO JOBS ──────────────────────────────────────────────────────
  // Two cards: icon circle + eyebrow
  '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">' +
    '<tr>' +
      '<td width="40" height="40" style="width:40px;height:40px;border-radius:50%;background:#f8fafc;border:1.5px solid #e2e8f0;text-align:center;vertical-align:middle;padding:0;">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>' +
          '<line x1="1" y1="10" x2="23" y2="10"></line>' +
        '</svg>' +
      '</td>' +
      '<td style="padding-left:12px;vertical-align:middle;' + FONT_ + 'font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#14b8a6;">Two cards, two jobs</td>' +
    '</tr>' +
  '</table>' +

  '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 28px;">' +
    '<tr>' +
      '<td style="padding:20px 24px;' + FONT_ + 'font-size:14px;line-height:1.8;color:#374151;">' +
        'You have two ways to use this: a virtual card, ready now in the Ramp app for anything online. ' +
        'A physical card, arriving by mail in 5–7 days, for anywhere that needs a card in hand. ' +
        'Same total either way.' +
      '</td>' +
    '</tr>' +
  '</table>' +

  // ── LIMITS ──────────────────────────────────────────────────────────────────
  '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">' +
    'Your card has a per-purchase limit of <strong style="color:#0f172a;font-weight:600;">' + maxTxn + '</strong>.' +
  '</p>' +

  // ── DATE ────────────────────────────────────────────────────────────────────
  '<p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#374151;">' +
    'Your card is active through <strong style="color:#0f172a;font-weight:600;">October 15, 2026.</strong>' +
  '</p>' +

  // ── SIGN-OFF ────────────────────────────────────────────────────────────────
  '<p style="margin:0 0 32px;font-size:15px;font-weight:600;color:#0f172a;">Team Campus Ready</p>' +

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;">' +
    '<tr>' +
      '<td style="padding-top:20px;' + FONT_ + 'font-size:14px;color:#64748b;">' +
        'Questions? <a href="mailto:hello@campusready.org" style="color:#14b8a6;text-decoration:none;font-weight:500;">hello@campusready.org</a>' +
        '&nbsp;&middot;&nbsp;' +
        '<a href="tel:+17075958281" style="color:#14b8a6;text-decoration:none;font-weight:500;">(707) 595-8281</a>' +
      '</td>' +
    '</tr>' +
  '</table>' +

'</td>' +
'</tr>' +
'</table>' + // /600px container

'</td></tr>' +
'</table>' + // /outer wrapper

'</body>' +
'</html>'
  );
}


// ─── PLAIN TEXT BUILDER ────────────────────────────────────────────────────────
function _buildRampDetailsText(student) {
  var rows    = _travelRows_(student);
  var cardAmt = _fmtAmt_(student.card_amount);
  var maxTxn  = _fmtAmt_(Math.max(Number(student.flight_amount) || 0, Number(student.gas_amount) || 0, Number(student.hotel_amount) || 0));

  var div = '─────────────────────────────────────────';
  var lines = [];

  lines.push('CAMPUS READY FOUNDATION');
  lines.push('');
  lines.push('Hi ' + student.FirstName + ', Here\u2019s what your Campus Ready Foundation travel card from Ramp covers, and how to use it.');
  lines.push('');
  lines.push('WHAT IT’S FOR');
  lines.push(div);
  rows.forEach(function (row) {
    lines.push(row.label + ': ' + row.amount);
  });
  lines.push(div);
  lines.push('Total on your card: ' + cardAmt);
  lines.push('');
  lines.push('TWO CARDS, TWO JOBS');
  lines.push('');
  lines.push('You have two ways to use this: a virtual card, ready now in the Ramp app for anything online. A physical card, arriving by mail in 5–7 days, for anywhere that needs a card in hand. Same total either way.');
  lines.push('');
  lines.push('Your card has a per-purchase limit of ' + maxTxn + '.');
  lines.push('');
  lines.push('Your card is active through October 15, 2026.');
  lines.push('');
  lines.push('Team Campus Ready');
  lines.push('');
  lines.push(div);
  lines.push('Questions? hello@campusready.org | (707) 595-8281');
  lines.push('Campus Ready Foundation · campusready.org');

  return lines.join('\n');
}
