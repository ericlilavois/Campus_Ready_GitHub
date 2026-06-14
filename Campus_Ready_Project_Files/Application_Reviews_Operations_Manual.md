# Application Reviews - Operations Manual

*Last Updated: May 27, 2026*

# 1. System Overview

## Purpose

The Application Reviews system manages the complete lifecycle of Campus Ready Foundation grant applications, from initial submission through board review to award decisions, email notifications, transfer to Grant Fulfillment, and archiving completed cohorts.

## Data Flow

Applications flow through the system in this sequence:

1. Student submits application via the online form
2. Apps Script processes submission and writes to Master sheet
3. Filtered views automatically populate from Master
4. Board members score essays in Board_Essays tab
5. Essay scores flow to Master via lookup formulas
6. Administrator sets Award Status for each applicant
7. Administrator sends award decision emails via "Send Award Decision Emails" menu function
8. Awarded recipients transfer to Grant Fulfillment Database (must complete before preferences form link goes out)
9. Completed cohort is archived at end of cycle

## System Components

- **Application Reviews spreadsheet** — Primary database with multiple tabs for different views and functions
- **Application Submission Apps Script** — Processes incoming applications, generates PDFs, sends confirmations
- **Admin Functions Apps Script** — Handles award decision emails, Grant Fulfillment transfers, and cohort archiving
- **Online Application Form** — Student-facing HTML form at campusready.foundation/apply/
- **Grant Fulfillment Database** — Receives awarded recipients for kit customization and fulfillment

# 2. Config Tab — Single Source of Truth

**IMPORTANT:** The Config Tab is the control center for this system. All year-based formulas reference Config Tab cell B1. When a new application cycle begins, this is the ONLY place you need to update the year.

## Config Tab Contents

| Cell | Setting | Example Value |
|------|---------|---------------|
| B1 | Current Year | 2026 |
| B2 | Cycle Start Date | January 1, 2026 |
| B3 | Cycle End Date | June 15, 2026 |
| B4 | Brand Color (hex) | #14b8a6 |
| B5 | Digest Recipients | Email addresses |

The Config Tab is hidden by default. To access it, right-click any tab and select "Unhide."

# 3. Routine Operations

## Viewing and Filtering Applications

**Primary workspace:** Final_Review tab displays all applicants sorted by Total Score.
**Using slicers:** Click the large filter buttons at the top of the sheet to filter by Need Band (Critical, High, Moderate, Low).
**Viewing full application details:** The PDF URL column links to each applicant's full PDF application.

## Board Essay Scoring Workflow

Board members score essays using the Board_Essays tab. Each board member has dedicated columns for Essay 1 and Essay 2 scores.

### Scoring Process

1. Navigate to the Board_Essays tab
2. Locate your name columns (e.g., "Eric Lilavois Essay 1 Score")
3. Enter scores from 1-10 for each essay (whole numbers only)
4. Essay 1 Avg and Essay 2 Avg columns calculate automatically
5. Scores are multiplied by 1.5 to convert to 0-15 point scale
6. Essay scores automatically flow to Master tab and Total Score

### Essay Scoring Rubric

Use whole numbers 1-10 for both essays:

- **1-3:** Does not meet requirements
- **4-6:** Meets basic requirements
- **7-8:** Strong response, exceeds requirements
- **9-10:** Exceptional, compelling response

**Essay 1 - Award Significance:** Rate how clearly the student explains their need and how this support would impact their education.
**Essay 2 - Challenge and Resilience:** Rate evidence of overcoming obstacles and commitment to educational goals despite difficulties.

*Tip: Scores should reflect genuine differences between applications. Use the full 1-10 range.*

### Understanding the Scores

**Financial Need Bands:**

- **Critical (32-40 points):** Severe financial hardship
- **High (24-31 points):** Significant demonstrated need
- **Moderate (12-23 points):** Some financial challenges
- **Lower (0-11 points):** Minimal demonstrated need

**Total Score Interpretation:**

- **90-100:** Exceptional candidates (highest need + compelling essays)
- **75-89:** Strong candidates (significant need or excellent essays)
- **60-74:** Good candidates (moderate need + solid essays)
- **Below 60:** Consider based on available funding

# 4. Administrative Procedures

## Setting Award Status

After the board reviews applications and makes decisions, the administrator records the outcome in the Award Status column of the Final_Review tab.

**Valid values:**

- **Awarded** — Student will receive grant (required for transfer and winner email)
- **Waitlist** — Student is on waitlist pending funding availability
- **Denied** — Student will not receive grant this cycle (required for non-selection email)

## Sending Award Decision Emails

Once Award Status is set for all students, send notifications via the built-in email function.

### How It Works

The `sendAwardDecisionEmails()` function reads the Final_Review tab, finds all rows where Award Status is "Awarded" or "Denied" and "Award Email Sent" is not already "Yes," and sends the appropriate email to each student. It marks each row "Yes" with a timestamp on success.

- **Winner email** — Subject: "Congratulations from Campus Ready Foundation." Includes grant summary and next steps timeline.
- **Non-selection email** — Subject: "Campus Ready Foundation." Compassionate, dignified, no explanation of scoring.

### Running the Function

1. Confirm Award Status is set for all students in Final_Review
2. Run `testWinnerEmail()` and `testNonWinnerEmail()` from the Apps Script editor to confirm both emails land correctly in eric@campusready.org before sending live
3. From the Application Reviews sheet, open the Campus Ready menu
4. Select "Send Award Decision Emails"
5. Review the confirmation dialog showing winner and non-winner counts
6. Click Yes to send
7. Check Apps Script Executions log to confirm all sent successfully

### Known Limitation — Bounced Emails

GmailApp marks a row "Award Email Sent = Yes" as soon as it hands the message to the mail server. It has no awareness of downstream bounces. A bounced email will still be recorded as sent.

**Recovery procedure:** Check the sending Gmail account's inbox for bounce-back messages after the send. For any bounced address:
1. Find the student's row in Final_Review
2. Clear the "Award Email Sent" cell and the timestamp cell next to it
3. Correct the email address
4. Rerun "Send Award Decision Emails" — it will only send to rows without "Yes"

## Transferring Awarded Recipients to Grant Fulfillment

Once award emails are sent, transfer awarded students to the Grant Fulfillment Database. **This must be complete before the preferences form link goes out to winners** — the kit form validates student emails against Grant_Recipients, and students not yet transferred will be rejected by the form.

Transfer Winners does not need to run before award emails are sent. The two operations are independent.

### Prerequisites

- Award Status must be set to "Awarded" for each recipient
- Student Name, Application ID, and Email Address must be populated
- You must have edit access to both spreadsheets

### Running the Transfer

1. Navigate to the Final_Review tab
2. Click the "Grant Fulfillment" menu in the menu bar
3. Select "Transfer Winners to Grant Fulfillment"
4. Review the confirmation dialog
5. Click Yes to proceed

The function skips students already marked "Transferred = Yes" — it is safe to rerun if needed.

## Archiving a Completed Cohort

At the end of each application cycle, archive the cohort's data to preserve it for future reference and clear the working tabs for the next year.

### Prerequisites

- All applications must have Award Status set (Awarded or Denied)
- No applications can be on Waitlist (resolve these first)
- All Grant Fulfillment transfers should be complete

### Running the Archive

1. From any tab, click the "Archive" menu in the menu bar
2. Select "Archive Current Cohort"
3. Review the confirmation dialog showing record count and actions
4. Click Yes to proceed

### What the Archive Does

- Copies all Master rows for the cohort to the Archive tab
- Adds Award Status column to archived records
- Deletes archived rows from Master
- Clears data from Final_Review (preserves headers and formulas)
- Clears essay scores from Board_Essays (preserves formulas)
- Working tabs are immediately ready for the next cohort

# 5. Annual Year Rollover

**This is the simplified rollover process.** Because all formulas reference the Config Tab, you no longer need to duplicate tabs or update formulas manually.

## Step 1: Archive the Current Cohort

Before starting a new year, archive the completed cohort using the Archive menu (see Section 4).

## Step 2: Update Config Tab

1. Open the Config Tab (right-click any tab → Unhide)
2. Change cell B1 from the old year to the new year (e.g., 2026 → 2027)
3. Update B2 (Cycle Start) and B3 (Cycle End) dates if needed
4. Re-hide the Config Tab

**That's it for the year change.** All formulas read from Config Tab automatically.

## Step 3: Update Federal Poverty Guidelines (if changed)

- Check if HHS has released new poverty guidelines (usually January)
- If yes: Update values in FPG Current tab

## Step 4: Verify

- Submit a test application
- Confirm it appears in the filtered tabs with correct scoring
- Delete the test application from Master when done

*Estimated time: 5-10 minutes*

# 6. Troubleshooting

## Common Issues and Fixes

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Need Points all zero | High income | If income ≥ 3× FPG, 0 points is correct |
| Row missing from filtered tabs | Cycle Year mismatch | Confirm Cycle Year in Master matches Config Tab B1 |
| Board averages blank | Scores not entered | Ensure scores are numbers (1-10) in Board_Essays |
| Essay scores not in Master | Lookup formula issue | Verify AQ2 and AR2 formulas reference Board_Essays correctly |
| Total Score missing essays | Essay columns empty | Check that AQ and AR have lookup formulas |
| Archive blocked by Waitlist | Unresolved applications | Change all Waitlist to Awarded or Denied first |
| Transfer script error | Config Tab not found | Ensure Config Tab exists and B1 has valid year |
| Award email shows "sent" but student didn't receive | Bounced email | Check Gmail inbox for bounce-back; clear row's "Award Email Sent" cell; correct address; rerun function |
| Award email function sends nothing | All rows already marked "Yes" | Check "Award Email Sent" column — clear cells for any students who need resending |

**When in doubt:** Check the Master sheet first — it's the source of truth for all data.

# 7. Data Architecture

## Tab Structure

| Tab | Purpose | Data Source |
|-----|---------|-------------|
| Master | Primary data store — all applications | Apps Script writes here |
| Applications | Current year applications (filtered view) | QUERY from Master |
| Review | Scoring calculations staging | FILTER from Master |
| Final_Review | Board decision view, sorted by score | QUERY from Review |
| Board_Essays | Essay scoring input | FILTER from Master |
| Archive | Historical data from all years | Archive script |
| Dashboard | KPIs and charts | Named ranges |
| Config Tab | System settings (year, dates) | Manual entry |
| FPG Current | Federal Poverty Guidelines | Manual entry (annual) |

## Key Master Sheet Columns

| Column | Header | Description |
|--------|--------|-------------|
| A | Application ID | Unique ID (e.g., CR_1758657496058_8l0scy) |
| B | Submission Timestamp | Date/time of submission |
| C | Cycle Year | Application cycle (must match Config Tab B1) |
| J | Student Full Name | Applicant's full name |
| K | Student Email | Applicant's email address |
| X | Household Members | Number of people in household |
| Y | Household Income | Total household income |
| AM | Distance (miles) | Calculated home-to-college distance |
| AN | Distance Points | Points based on distance (0-15) — formula |
| AO | Circumstances Points | Points for hardship indicators (0-15) — formula |
| AP | Financial Needs Points | Points based on income (0-40) — formula |
| AQ | Essay 1 Score | Pulled from Board_Essays via VLOOKUP — formula |
| AR | Essay 2 Score | Pulled from Board_Essays via VLOOKUP — formula |
| AT | Total Score | Sum of all scoring components (0-100) — formula |
| AV | Income Per Person | Household Income ÷ Household Members — formula |
| AX | College UNITID | IPEDS UNITID — written separately after row write |

**Note:** Column 38 header currently reads "Internal Notes" but Apps Script uses it as a PROCESSING_STARTED timestamp. Do not enter staff notes in this column — they will be overwritten if the row is retried. This header should be renamed to "Processing Timestamp" before staff begin using it.

# 8. Technical Reference

## Formulas That Reference Config Tab

The following formulas read the current year from Config Tab cell B1:

| Location | Cell | Purpose |
|----------|------|---------|
| Master | AP2 | Financial Needs Points — filters by cycle year |
| Applications | A1 | QUERY pulls applications matching Config year |
| Review | A2 | FILTER pulls Application IDs matching Config year |
| Board_Essays | A3 | FILTER pulls Application IDs matching Config year |

## Essay Score Formulas in Master

These formulas in Master pull essay averages from Board_Essays:

**AQ2 (Essay 1 Score):**
=ARRAYFORMULA(IF(A2:A="", "", IFERROR(VLOOKUP(A2:A, Board_Essays!A:J, 10, FALSE), "")))

**AR2 (Essay 2 Score):**
=ARRAYFORMULA(IF(A2:A="", "", IFERROR(VLOOKUP(A2:A, Board_Essays!A:K, 11, FALSE), "")))

## Integration Points

- **Application Form URL:** campusready.foundation/apply/
- **PDF Storage Folder ID:** 1H7EQRF29pNp5r8NKJqDoz1HK92FyE1xW
- **Grant Fulfillment Database ID:** 1jOOev4f8w6HzekRNRxMN6nwYfTCJ5dJKrqzK4zfcYVk

## What NOT to Modify

Modifying these elements without understanding their dependencies can break the system:

- Row 1 headers in Master — Apps Script writes data based on column position
- FILTER/QUERY formulas in cell A1/A2/A3 of filtered tabs
- Named ranges — Dashboard and Helpers tabs reference these
- Config Tab cell B1 — all year-based formulas depend on this
- Essay lookup formulas in Master columns AQ and AR
- Apps Script configuration constants (spreadsheet IDs, folder IDs)
- Columns AN–AW — scoring and derived data managed outside the submission script
- Column AX — college_id written via separate setValue; do not include in row array

--- End of Document ---

Questions? Contact apply@campusready.org
