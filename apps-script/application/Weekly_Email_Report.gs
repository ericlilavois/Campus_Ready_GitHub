// ============================================
// CAMPUS READY FOUNDATION - WEEKLY APPLICATION REPORT
// ============================================
// Version 1.0
// Created: December 5, 2025
// Purpose: Sends weekly digest of application activity
// Schedule: Mondays at 8 AM PT, Dec 1 - June 1 only
// ============================================

// === CONFIGURATION ===
const REPORT_SPREADSHEET_ID = '1utgR5xiHElarYMAj-jg_ReY7ZQMrzqFYb6wKOCPWB4s';
const REPORT_MASTER_SHEET = 'Master';
const REPORT_CONFIG_TAB = 'Config Tab';
const REPORT_TIMEZONE = 'America/Los_Angeles';
const REPORT_LOGO_URL = 'https://campusready.foundation/assets/img/brand/CRF_logo.lockup.GRN.png';
const REPORT_PDF_FOLDER_ID = '1H7EQRF29pNp5r8NKJqDoz1HK92FyE1xW';

// Brand colors
const BRAND = {
  teal: '#14b8a6',
  tealLight: '#f0fdfa',
  tealBorder: '#99f6e4',
  red: '#dc2626',
  redLight: '#fef2f2',
  orange: '#f97316',
  yellow: '#eab308',
  gray: '#6b7280',
  grayLight: '#f9fafb',
  text: '#374151',
  textDark: '#1f2937',
  muted: '#9ca3af',
  border: '#e5e7eb',
  white: '#ffffff'
};

// === MAIN FUNCTION ===
function sendWeeklyApplicationReport() {
  try {
    // Check if we're in the active reporting window (Dec 1 - June 1)
    if (!isInReportingWindow()) {
      console.log('Outside reporting window (Dec 1 - June 1). Skipping report.');
      return;
    }

    const ss = SpreadsheetApp.openById(REPORT_SPREADSHEET_ID);
    
    // Get config values
    const configSheet = ss.getSheetByName(REPORT_CONFIG_TAB);
    if (!configSheet) {
      throw new Error('Config Tab not found');
    }
    
    const cycleYear = configSheet.getRange('B1').getValue();
    const recipients = configSheet.getRange('B5').getValue();
    
    if (!recipients) {
      throw new Error('No recipients found in Config Tab B5');
    }
    
    // Get Master sheet data
    const masterSheet = ss.getSheetByName(REPORT_MASTER_SHEET);
    if (!masterSheet) {
      throw new Error('Master sheet not found');
    }
    
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Build header index map
    const idx = {};
    headers.forEach((h, i) => {
      idx[String(h).toLowerCase().trim()] = i;
    });
    
    // Get column indices
    const colAppId = idx['application id'] ?? 0;
    const colTimestamp = idx['submission timestamp'] ?? 1;
    const colCycleYear = idx['cycle year'] ?? 2;
    const colStudentName = idx['student full name'] ?? 9;
    const colCity = idx['home city'] ?? 14;
    const colState = idx['home state'] ?? 15;
    const colCollege = idx['college name'] ?? 17;
    const colNeedPoints = idx['financial needs points'] ?? 41;
    
    // Filter to current cycle year
    const rows = data.slice(1).filter(row => {
      const rowYear = row[colCycleYear];
      return rowYear == cycleYear || String(rowYear) === String(cycleYear);
    });
    
    // Calculate date ranges
    const today = new Date();
    const todayStart = startOfDay(today);
    const weekStart = addDays(todayStart, -7);
    const prevWeekStart = addDays(todayStart, -14);
    
    // Calculate deadline (May 15 of cycle year)
    const deadline = new Date(cycleYear, 4, 15, 23, 59, 59); // May is month 4 (0-indexed)
    const daysToDeadline = Math.max(0, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)));
    
    // Process applications
    const applications = rows.map(row => {
      const timestamp = safeDate(row[colTimestamp]);
      const needPoints = parseFloat(row[colNeedPoints]) || 0;
      return {
        id: row[colAppId],
        timestamp: timestamp,
        name: row[colStudentName] || 'Unknown',
        city: row[colCity] || '',
        state: row[colState] || '',
        college: row[colCollege] || '',
        needPoints: needPoints,
        needBand: getNeedBand(needPoints)
      };
    });
    
    // New this week
    const newApps = applications.filter(a => a.timestamp && a.timestamp >= weekStart);
    const prevWeekApps = applications.filter(a => a.timestamp && a.timestamp >= prevWeekStart && a.timestamp < weekStart);
    
    // Counts
    const total = applications.length;
    const newCount = newApps.length;
    const prevCount = prevWeekApps.length;
    const trendDelta = newCount - prevCount;
    const trendIcon = trendDelta > 0 ? '↑' : (trendDelta < 0 ? '↓' : '→');
    
    // Need band breakdown
    const needBands = {
      critical: applications.filter(a => a.needBand === 'Critical').length,
      high: applications.filter(a => a.needBand === 'High').length,
      moderate: applications.filter(a => a.needBand === 'Moderate').length,
      lower: applications.filter(a => a.needBand === 'Lower').length
    };
    
    // Top 5 locations
    const locationCounts = {};
    applications.forEach(a => {
      if (a.city && a.state) {
        const loc = `${a.city}, ${a.state}`;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    });
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));
    
    // Sort new apps by date descending, take top 10
    const recentApps = newApps
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 10);
    const newAppsOverflow = Math.max(0, newCount - 10);
    
    // Build email
    const dateLine = formatDate(today, 'EEE • MMM d, yyyy');
    const subject = `Campus Ready Weekly Application Report — ${newCount} new, ${total} total`;
    
    const html = buildReportHtml({
      dateLine,
      cycleYear,
      daysToDeadline,
      totals: { total, newCount, prevCount, trendDelta, trendIcon },
      needBands,
      recentApps,
      newAppsOverflow,
      topLocations
    });
    
    const text = buildReportText({
      dateLine,
      cycleYear,
      daysToDeadline,
      totals: { total, newCount, prevCount, trendDelta, trendIcon },
      needBands,
      recentApps,
      newAppsOverflow,
      topLocations
    });
    
    // Send email
    GmailApp.sendEmail(recipients, subject, text, { htmlBody: html });
    console.log('Weekly application report sent successfully to: ' + recipients);
    
  } catch (error) {
    console.error('Error sending weekly application report:', error);
    // Send error notification
    GmailApp.sendEmail(
      'apply@campusready.foundation',
      'Campus Ready Weekly Application Report — Error',
      [
        'There was an error generating the weekly application report.',
        '',
        String(error),
        '',
        'Please check the Apps Script logs.'
      ].join('\n')
    );
  }
}

// === REPORTING WINDOW CHECK ===
function isInReportingWindow() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 11=Dec
  const day = now.getDate();
  
  // Dec 1 - Dec 31 (month 11)
  if (month === 11 && day >= 1) return true;
  
  // Jan 1 - May 31 (months 0-4)
  if (month >= 0 && month <= 4) return true;
  
  // June 1 only (month 5, day 1)
  if (month === 5 && day === 1) return true;
  
  return false;
}

// === NEED BAND CALCULATION ===
function getNeedBand(points) {
  if (points >= 32) return 'Critical';
  if (points >= 24) return 'High';
  if (points >= 12) return 'Moderate';
  return 'Lower';
}

// === DATE UTILITIES ===
function safeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date, pattern) {
  return Utilities.formatDate(date, REPORT_TIMEZONE, pattern || 'MMM d, yyyy');
}

// === HTML BUILDER ===
function buildReportHtml(data) {
  const { dateLine, cycleYear, daysToDeadline, totals, needBands, recentApps, newAppsOverflow, topLocations } = data;
  const { total, newCount, prevCount, trendDelta, trendIcon } = totals;
  
  const folderUrl = `https://drive.google.com/drive/folders/${REPORT_PDF_FOLDER_ID}`;
  
  // Helper for stat cards
  const statCard = (label, value, bgColor, borderColor, textColor) => `
    <td width="50%" style="padding:6px;">
      <div style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:12px; padding:16px; text-align:center;">
        <div style="font-size:28px; font-weight:700; color:${textColor};">${esc(value)}</div>
        <div style="font-size:12px; color:${BRAND.gray}; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;">${esc(label)}</div>
      </div>
    </td>`;
  
  // Helper for need band pill
  const needPill = (band) => {
    const colors = {
      'Critical': { bg: BRAND.red, text: BRAND.white },
      'High': { bg: BRAND.orange, text: BRAND.white },
      'Moderate': { bg: BRAND.yellow, text: BRAND.textDark },
      'Lower': { bg: BRAND.gray, text: BRAND.white }
    };
    const c = colors[band] || colors['Lower'];
    return `<span style="background:${c.bg}; color:${c.text}; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600;">${esc(band)}</span>`;
  };
  
  // Build new applications rows
  let appRows = '';
  if (recentApps.length > 0) {
    recentApps.forEach((app, i) => {
      const isLast = i === recentApps.length - 1 && newAppsOverflow === 0;
      const borderStyle = isLast ? '' : 'border-bottom:1px solid ' + BRAND.border + ';';
      appRows += `
        <tr>
          <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle}">${esc(app.name)}</td>
          <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle}">${esc(app.college)}</td>
          <td style="padding:10px 12px; font-size:13px; ${borderStyle}">${needPill(app.needBand)}</td>
          <td style="padding:10px 12px; font-size:13px; color:${BRAND.gray}; ${borderStyle}">${app.timestamp ? formatDate(app.timestamp, 'MMM d') : '—'}</td>
        </tr>`;
    });
  } else {
    appRows = `<tr><td colspan="4" style="padding:12px; font-size:13px; color:${BRAND.muted};">No new applications this week.</td></tr>`;
  }
  
  // Build need band rows
  const bandRows = [
    { band: 'Critical', range: '32-40 pts', count: needBands.critical },
    { band: 'High', range: '24-31 pts', count: needBands.high },
    { band: 'Moderate', range: '12-23 pts', count: needBands.moderate },
    { band: 'Lower', range: '0-11 pts', count: needBands.lower }
  ].map((b, i, arr) => {
    const isLast = i === arr.length - 1;
    const borderStyle = isLast ? '' : 'border-bottom:1px solid ' + BRAND.border + ';';
    return `
      <tr>
        <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle}">${needPill(b.band)} (${b.range})</td>
        <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle} text-align:right; font-weight:600;">${b.count}</td>
      </tr>`;
  }).join('');
  
  // Build location rows
  let locationRows = '';
  if (topLocations.length > 0) {
    topLocations.forEach((loc, i) => {
      const isLast = i === topLocations.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom:1px solid ' + BRAND.border + ';';
      locationRows += `
        <tr>
          <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle}">${esc(loc.location)}</td>
          <td style="padding:10px 12px; font-size:13px; color:${BRAND.text}; ${borderStyle} text-align:right; font-weight:600;">${loc.count}</td>
        </tr>`;
    });
  } else {
    locationRows = `<tr><td colspan="2" style="padding:12px; font-size:13px; color:${BRAND.muted};">No location data available.</td></tr>`;
  }
  
  // Overflow note
  const overflowNote = newAppsOverflow > 0 
    ? `<div style="padding:10px 12px; font-size:12px; color:${BRAND.gray};">...and ${newAppsOverflow} more not shown</div>` 
    : '';
  
  // Trend color
  const trendColor = trendDelta > 0 ? BRAND.teal : (trendDelta < 0 ? BRAND.red : BRAND.gray);
  
  const preheader = `New: ${newCount} • Total: ${total} • Critical: ${needBands.critical}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background:#f6f7f9;">
  <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">
    ${esc(preheader)}
  </span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background:${BRAND.white}; border-radius:16px; border:1px solid ${BRAND.border}; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
          
          <!-- Header -->
          <tr>
            <td style="padding:24px 24px 12px 24px; text-align:center;">
              <img src="${REPORT_LOGO_URL}" alt="Campus Ready Foundation" style="max-width:180px; height:auto; display:block; margin:0 auto;">
              <div style="font-size:22px; font-weight:700; color:${BRAND.textDark}; margin-top:16px;">
                Weekly Application Report
              </div>
              <div style="font-size:13px; color:${BRAND.gray}; margin-top:4px;">
                ${esc(dateLine)}
              </div>
            </td>
          </tr>

          <!-- Stat Cards -->
          <tr>
            <td style="padding:8px 24px 4px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  ${statCard('New (7 days)', String(newCount), BRAND.tealLight, BRAND.tealBorder, BRAND.teal)}
                  ${statCard('Total Applications', String(total), BRAND.tealLight, BRAND.tealBorder, BRAND.teal)}
                </tr>
                <tr>
                  ${statCard('Critical Need', String(needBands.critical), BRAND.redLight, BRAND.red, BRAND.red)}
                  ${statCard('Days to Deadline', String(daysToDeadline), BRAND.grayLight, BRAND.border, BRAND.text)}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Growth Line -->
          <tr>
            <td style="padding:8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.border}; border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px; font-size:13px; color:${BRAND.text};">
                    <strong>Growth:</strong> this week <strong>${newCount}</strong>, previous <strong>${prevCount}</strong> — trend <span style="color:${trendColor};">${trendIcon}</span> <span style="color:${trendColor};">${trendDelta >= 0 ? '+' : ''}${trendDelta}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- New Applications -->
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <div style="font-size:15px; font-weight:700; color:${BRAND.textDark}; margin-bottom:12px;">
                New Applications (this week)
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden;">
                <tr style="background:${BRAND.grayLight};">
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">Student</td>
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">College</td>
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">Need</td>
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">Date</td>
                </tr>
                ${appRows}
              </table>
              ${overflowNote}
            </td>
          </tr>

          <!-- Need Band Breakdown -->
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <div style="font-size:15px; font-weight:700; color:${BRAND.textDark}; margin-bottom:12px;">
                Need Band Breakdown
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden;">
                <tr style="background:${BRAND.grayLight};">
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">Need Band</td>
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border}; text-align:right;">Count</td>
                </tr>
                ${bandRows}
              </table>
            </td>
          </tr>

          <!-- Top 5 Locations -->
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <div style="font-size:15px; font-weight:700; color:${BRAND.textDark}; margin-bottom:12px;">
                Top 5 Locations
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden;">
                <tr style="background:${BRAND.grayLight};">
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border};">Location</td>
                  <td style="padding:10px 12px; font-size:11px; font-weight:600; color:${BRAND.gray}; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${BRAND.border}; text-align:right;">Students</td>
                </tr>
                ${locationRows}
              </table>
            </td>
          </tr>

          <!-- Footer Button -->
          <tr>
            <td style="padding:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:16px; background:${BRAND.tealLight}; border-radius:12px; text-align:center;">
                    <a href="${folderUrl}" style="display:inline-block; background:${BRAND.teal}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
                    View Application PDFs
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <div style="font-size:12px; color:${BRAND.muted}; text-align:center;">
                Campus Ready Foundation • Application cycle: Jan 1 – May 15, ${cycleYear}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// === PLAIN TEXT BUILDER ===
function buildReportText(data) {
  const { dateLine, cycleYear, daysToDeadline, totals, needBands, recentApps, newAppsOverflow, topLocations } = data;
  const { total, newCount, prevCount, trendDelta, trendIcon } = totals;
  
  const folderUrl = `https://drive.google.com/drive/folders/${REPORT_PDF_FOLDER_ID}`;
  
  const lines = [];
  lines.push('Campus Ready Weekly Application Report');
  lines.push(dateLine);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`- New (7 days): ${newCount}`);
  lines.push(`- Total Applications: ${total}`);
  lines.push(`- Critical Need: ${needBands.critical}`);
  lines.push(`- Days to Deadline: ${daysToDeadline}`);
  lines.push(`- Growth: this week ${newCount}, previous ${prevCount} — trend ${trendIcon} ${trendDelta >= 0 ? '+' : ''}${trendDelta}`);
  lines.push('');
  
  lines.push('NEW APPLICATIONS (this week)');
  if (recentApps.length > 0) {
    recentApps.forEach((app, i) => {
      lines.push(`${i + 1}. ${app.name} | ${app.college} | ${app.needBand} | ${app.timestamp ? formatDate(app.timestamp, 'MMM d') : '—'}`);
    });
    if (newAppsOverflow > 0) lines.push(`...and ${newAppsOverflow} more not shown`);
  } else {
    lines.push('No new applications this week.');
  }
  lines.push('');
  
  lines.push('NEED BAND BREAKDOWN');
  lines.push(`- Critical (32-40 pts): ${needBands.critical}`);
  lines.push(`- High (24-31 pts): ${needBands.high}`);
  lines.push(`- Moderate (12-23 pts): ${needBands.moderate}`);
  lines.push(`- Lower (0-11 pts): ${needBands.lower}`);
  lines.push('');
  
  lines.push('TOP 5 LOCATIONS');
  if (topLocations.length > 0) {
    topLocations.forEach((loc, i) => {
      lines.push(`${i + 1}. ${loc.location}: ${loc.count} students`);
    });
  } else {
    lines.push('No location data available.');
  }
  lines.push('');
  
  lines.push(`View Application PDFs: ${folderUrl}`);
  lines.push('');
  lines.push(`Campus Ready Foundation • Application cycle: Jan 1 – May 15, ${cycleYear}`);
  
  return lines.join('\n');
}

// === HTML ESCAPER ===
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// === TEST FUNCTION ===
function testWeeklyApplicationReport() {
  sendWeeklyApplicationReport();
}

// === MANUAL TRIGGER (for testing outside reporting window) ===
function sendReportNow() {
  // Bypasses the date check - use for testing only
  try {
    const ss = SpreadsheetApp.openById(REPORT_SPREADSHEET_ID);
    console.log('Spreadsheet access: OK');
    
    const configSheet = ss.getSheetByName(REPORT_CONFIG_TAB);
    const recipients = configSheet.getRange('B5').getValue();
    console.log('Recipients: ' + recipients);
    
    // Run the actual report
    sendWeeklyApplicationReport();
  } catch (error) {
    console.error('Test failed:', error);
  }
}