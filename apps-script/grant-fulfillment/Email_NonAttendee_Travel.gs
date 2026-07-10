// ============================================
// CAMPUS READY — NON-ATTENDEE TRAVEL EMAIL v2
// ============================================
// Redesigned to match the orientation reminder email system:
//   - White logo header (no teal band)
//   - Card-based layout (teal, yellow, neutral)
//   - Brand eyebrow style (teal, 11px, uppercase, tracked)
//   - 14–16px body text
//   - Table-based layout for Gmail compatibility
//   - Actual hosted partner logos (no Clearbit)
// ============================================

// ============================================
// CONFIGURATION
// ============================================

const NAT_LOGO_URL         = 'https://campusready.org/assets/img/brand/CRF_logo.lockup.GRN.png';
const NAT_LYFT_LOGO_URL    = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/Lyft_Logo_Pink_RGB.png';
const NAT_DOORDASH_LOGO_URL = 'https://award.campusready.org/2026_Orientation_Event/design_handoff_orientation_email/assets/Partners/DoorDash.png';

const NAT_LYFT_APP_URL     = 'https://apps.apple.com/us/app/lyft/id529379082';
const NAT_DOORDASH_APP_URL = 'https://apps.apple.com/us/app/doordash-food-delivery/id719972451';

const NAT_SUBJECT          = 'What we have for you.';
const NAT_SENDER_NAME      = 'Campus Ready Foundation';
const NAT_TEST_EMAIL       = 'elilavois@gmail.com';

// ============================================
// STUDENT ROSTER
// ============================================
// docsApproved: drives the gift card line — verify before sending.
// travelMode: 'flight' or 'drive'
// companion: used in drive subtext only

const NON_ATTENDEE_TRAVEL_STUDENTS = [
  {
    firstName:    'Arianna',
    email:        'deibertarianna@gmail.com',
    college:      'San Diego State University',
    travelMode:   'flight',
    departure:    'SFO',
    destination:  'San Diego',
    docsApproved: false   // Housing + Acceptance still pending as of July 10, 2026
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

// ============================================
// TEST — sends all 4 variants to test address
// ============================================

function testNonAttendeeTravelEmails() {
  NON_ATTENDEE_TRAVEL_STUDENTS.forEach(function(student) {
    const testStudent = Object.assign({}, student, { email: NAT_TEST_EMAIL });
    _sendNonAttendeeTravelEmail(testStudent);
    Logger.log('Test sent to ' + NAT_TEST_EMAIL + ' for ' + student.firstName);
    Utilities.sleep(300);
  });
  Logger.log('Done — 4 test variants sent to ' + NAT_TEST_EMAIL);
}

// ============================================
// MAIN SEND
// ============================================

function sendNonAttendeeTravelEmails() {
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    'Send Non-Attendee Travel Emails?',
    'Ready to send to ' + NON_ATTENDEE_TRAVEL_STUDENTS.length + ' students:\n\n' +
    NON_ATTENDEE_TRAVEL_STUDENTS.map(function(s) { return s.firstName + ' — ' + s.email; }).join('\n') +
    '\n\nThis cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let successCount = 0;
  let failCount    = 0;

  NON_ATTENDEE_TRAVEL_STUDENTS.forEach(function(student) {
    try {
      _sendNonAttendeeTravelEmail(student);
      successCount++;
      Logger.log('Sent: ' + student.email);
      Utilities.sleep(200);
    } catch (e) {
      failCount++;
      Logger.log('Failed: ' + student.email + ' — ' + e.message);
    }
  });

  let summary = successCount + ' email(s) sent.';
  if (failCount > 0) summary += '\n' + failCount + ' failed — check Logs for details.';
  ui.alert('Done', summary, ui.ButtonSet.OK);
}

// ============================================
// INTERNAL SENDER
// ============================================

function _sendNonAttendeeTravelEmail(student) {
  const html = buildNonAttendeeTravelHtml(student);
  const text = _buildNonAttendeeTravelText(student);

  GmailApp.sendEmail(student.email, NAT_SUBJECT, text, {
    htmlBody: html,
    name:     NAT_SENDER_NAME,
    from:     'hello@campusready.org',
    replyTo:  'hello@campusready.org'
  });
}

// ============================================
// HTML BUILDER
// ============================================

function buildNonAttendeeTravelHtml(student) {
  const isFlight = student.travelMode === 'flight';

  // Gift card line — conditional on docs status
  const giftCardLine = student.docsApproved
    ? 'A $100 Target gift card will be sent to your email address in the coming days.'
    : 'A $100 Target gift card will be sent to your email address once your housing and college acceptance documents are approved.';

  // Travel card copy
  const travelIcon    = isFlight ? '✈️' : '🚗';
  const travelEyebrow = travelIcon + ' Travel to ' + student.college;

  const travelBody = isFlight
    ? "We’re setting up a Ramp virtual card to cover your flight. It’s a secure digital card number you’ll use to book your ticket directly — not a physical card. We’ll share the details once you’ve confirmed your plans."
    : "We’re setting up a Ramp virtual card to cover gas for your drive, plus one night of hotel if you need it along the way. It’s a secure digital card number — no physical card. We’ll share the details once you’ve confirmed your plans.";

  const travelSubBase = isFlight
    ? 'Based on your application: flight from ' + student.departure + ' to ' + student.destination + '.'
    : 'Based on your application: drive from ' + student.departure + ' to ' + student.destination + (student.companion ? ' with ' + student.companion : '') + '.';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="background:#ffffff;padding:28px 32px 24px;border-bottom:1px solid #e2e8f0;">
            <img src="${NAT_LOGO_URL}" alt="Campus Ready Foundation" style="height:110px;width:auto;display:block;margin:0 auto;">
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px 40px 32px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.4;">Hi ${student.firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#374151;">Though you won’t be at Wednesday’s event, everything we promised is still yours. Here’s what we have waiting for you:</p>

            <!-- CARD 1: Lyft + DoorDash -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 16px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0d9488;">Before you head to campus</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;line-height:1.4;">Download Lyft and DoorDash Apps.</p>
                  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#374151;">We set up a <strong>Lyft credit ($150)</strong> to help you get to campus, the airport, or around town — and a <strong>DoorDash credit ($100)</strong> for meals during your first days. Download both apps, then text us at <strong>(707) 595-8281</strong>. Once we hear from you, we’ll send your codes.</p>

                  <!-- App buttons -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding-right:8px;">
                        <a href="${NAT_LYFT_APP_URL}" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">
                          <img src="${NAT_LYFT_LOGO_URL}" alt="Lyft" style="height:22px;width:auto;display:block;margin:0 auto 6px;">
                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:'Inter',sans-serif;">Download Lyft</span>
                        </a>
                      </td>
                      <td width="50%" style="padding-left:8px;">
                        <a href="${NAT_DOORDASH_APP_URL}" style="display:block;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-decoration:none;text-align:center;">
                          <img src="${NAT_DOORDASH_LOGO_URL}" alt="DoorDash" style="height:22px;width:auto;display:block;margin:0 auto 6px;">
                          <span style="font-size:12px;font-weight:600;color:#475569;font-family:'Inter',sans-serif;">Download DoorDash</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CARD 2: Target gift card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin:0 0 16px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <img src="https://campusready.org/assets/Partners/Target_Bullseye-Logo_Red.jpg" alt="Target" style="width:28px;height:28px;display:block;border-radius:4px;">
                      </td>
                      <td style="vertical-align:middle;">
                        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#b45309;">$100 Target gift card</p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">${giftCardLine} Use it for whatever helps most with move-in.</p>
                </td>
              </tr>
            </table>

            <!-- CARD 3: Travel -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#14b8a6;">${travelEyebrow}</p>
                  <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#374151;">${travelBody}</p>
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;font-style:italic;">${travelSubBase} <a href="mailto:hello@campusready.org" style="color:#14b8a6;text-decoration:none;font-weight:600;font-style:italic;">Let us know</a> if your plans have changed.</p>
                </td>
              </tr>
            </table>

            <!-- Sign-off -->
            <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">We’re rooting for you.</p>
            <p style="margin:0 0 32px;font-size:15px;font-weight:600;color:#0f172a;">Team Campus Ready</p>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-top:1px solid #e2e8f0;padding-top:20px;">
                  <p style="margin:0;font-size:14px;color:#64748b;">
                    Questions? <a href="mailto:hello@campusready.org" style="color:#14b8a6;text-decoration:none;font-weight:500;">hello@campusready.org</a>
                    &nbsp;&middot;&nbsp;
                    <a href="tel:+17075958281" style="color:#14b8a6;text-decoration:none;font-weight:500;">(707) 595-8281</a>
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

// ============================================
// PLAIN TEXT FALLBACK
// ============================================

function _buildNonAttendeeTravelText(student) {
  const isFlight = student.travelMode === 'flight';

  const giftCardLine = student.docsApproved
    ? 'A $100 Target gift card will be sent to your email address in the coming days.'
    : 'A $100 Target gift card will be sent to your email address once your housing and college acceptance documents are approved.';

  const travelSection = isFlight
    ? 'FLIGHT TO ' + student.college.toUpperCase() + '\n\n' +
      "We're setting up a Ramp virtual card to cover your flight. It's a secure digital card number you'll use to book your ticket directly — not a physical card. We'll share the details once we've confirmed your plans.\n\n" +
      'Based on your application: flight from ' + student.departure + ' to ' + student.destination + '. Let us know if your plans have changed.'
    : 'DRIVE TO ' + student.college.toUpperCase() + '\n\n' +
      "We're setting up a Ramp virtual card to cover gas for your drive, plus one night of hotel if you need it along the way. It's a secure digital card number — no physical card. We'll share the details once we've confirmed your plans.\n\n" +
      'Based on your application: drive from ' + student.departure + ' to ' + student.destination + (student.companion ? ' with ' + student.companion : '') + '. Let us know if your plans have changed.';

  return 'Hi ' + student.firstName + ',\n\n' +
    "You won't be at Wednesday's event — but everything we promised is still yours. Here's what's on the way.\n\n" +
    'BEFORE YOU HEAD TO CAMPUS\n\n' +
    'Download Lyft and DoorDash.\n\n' +
    "We set up a Lyft credit ($150) to help you get to campus, the airport, or around town — and a DoorDash credit ($100) for meals during your first days. Download both apps, then text us at (707) 595-8281. Once we hear from you, we'll send your codes.\n\n" +
    'Download Lyft: ' + NAT_LYFT_APP_URL + '\n' +
    'Download DoorDash: ' + NAT_DOORDASH_APP_URL + '\n\n' +
    '$100 TARGET GIFT CARD\n\n' +
    giftCardLine + " Use it for whatever helps most with move-in.\n\n" +
    travelSection + '\n\n' +
    'See you soon.\n' +
    'Team Campus Ready\n\n' +
    'hello@campusready.org\n' +
    '(707) 595-8281';
}
