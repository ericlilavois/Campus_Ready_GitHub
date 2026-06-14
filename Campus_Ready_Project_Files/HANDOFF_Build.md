# Agent Handoff — Build

**Role:** Technical implementation for Campus Ready Foundation systems
**Owns:** Code, deployment, technical architecture, debugging
**Last Updated:** June 7, 2026

---

## Before You Begin

**Read these documents first, in order:**

1. **AGENT_CHECKLIST.md** — How Eric works. Non-negotiable.
2. **FOUNDATION_OVERVIEW.md** — Mission and systems overview.
3. **CURRENT_STATUS.md** — What's active, what's in progress.
4. **DECISION_LOG.md** — What's been decided (don't re-propose).
5. **SYSTEM_ARCHITECTURE.md** — Full technical architecture across all five systems.

---

## Your Role

You're the Build agent — responsible for implementing, deploying, and debugging Foundation technical systems.

**You write code, deploy, debug, and make technical architecture decisions.** You work across five systems, each with different technical patterns.

**You are an executor with technical expertise, not a strategist.** That said, you're expected to:
- Flag technical constraints that affect operations
- Propose implementation approaches before writing code
- Push back if something requested isn't feasible or advisable

---

## Technical Stack

### Primary Infrastructure

| Component | Technology | Notes |
|-----------|------------|-------|
| Application form | HTML + vanilla JS | Static, hosted on Vercel |
| Application form proxy | Vercel (`api/apply.js`) | Routes around scripts.google.com — merged to main May 21 |
| Kit customization form | HTML + vanilla JS | Multi-step with validation — live at award.campusready.org |
| Backend processing | Google Apps Script | doPost handlers, PDF generation, email, product logic, kit emails |
| Data stores | Google Sheets | Multiple sheets, interconnected |
| Document storage | Google Drive | Application PDFs, verification documents |
| Form proxies | Vercel | Both application form and kit form route through Vercel |
| Cloud processing | Google Cloud Run | Checklist Intelligence pipeline |
| AI/ML | Gemini 2.5 Flash, Vertex AI | Search grounding, semantic matching |
| Website | Static HTML + Tailwind CSS CDN | Vercel hosting via GitHub auto-deploy |
| Analytics | Google Analytics | G-C6B2GRMESL |
| Analysis pipeline | Python (local) | Application Analysis — extract, analyze, fill, derive |

### GCP Configuration

| Resource | Value |
|----------|-------|
| Project | `campus-ready-checklist` |
| Region | us-central1 |
| Service Account | `checklist-processor@campus-ready-checklist.iam.gserviceaccount.com` |

### Google Sheets

| Sheet | ID | System |
|-------|----|--------|
| Checklist Master Sheet | `1nGjWNY8VyvDv1pBUuiUiky2NrufNvUMe7TuUNILNoaQ` | Checklist Intelligence |
| Intake Form | `1OtJVT3Us1szyRZO6rQAqs6qDC_WLNwvfgIHXK5_75vQ` | Checklist Intelligence |
| Application Reviews | *Ask Eric for ID* | Application System |
| Grant Fulfillment DB | `1jOOev4f8w6HzekRNRxMN6nwYfTCJ5dJKrqzK4zfcYVk` | Grant Fulfillment |

---

## System-Specific Technical Patterns

### Application System

**Apps Script architecture:**
- `doPost(e)` — Main form handler. Parses POST data, generates Application ID, calculates distance via Google Maps API, creates PDF, writes to Master sheet, sends emails.
- Row 1 headers in Master are positional — Apps Script writes by column position. **Do not reorder columns.**
- All year-based formulas reference Config Tab B1. Never hardcode years.
- Essay scores flow from Board_Essays to Master via VLOOKUP (columns AQ, AR).
- Financial Need uses ARRAYFORMULA for cohort-based scoring.

**Award decision emails:**
- `sendAwardDecisionEmails()` — Menu-driven function in `Application_Admin_Script.gs`. Reads Final_Review tab (headers in row 3, data starts row 4), filters on Award Status ("Awarded"/"Denied"), skips rows where "Award Email Sent" = "Yes", sends winner or non-winner email accordingly, marks each row "Yes" with a timestamp on success.
- `sendWinnerEmail(firstName, email)` — HTML + plaintext. Subject: "Congratulations from Campus Ready Foundation."
- `sendNonWinnerEmail(firstName, email)` — HTML + plaintext. Subject: "Campus Ready Foundation."
- `testWinnerEmail()` and `testNonWinnerEmail()` — Send test emails to eric@campusready.org. Run these before any live send.
- **Known limitation — bounced emails:** GmailApp hands the message off to the mail server and marks the row "Yes" immediately. It has no awareness of downstream bounces. Recovery procedure: manually clear the "Award Email Sent" cell and the timestamp cell for the affected row, correct the email address in Final_Review, and rerun `sendAwardDecisionEmails()`. The function skips rows marked "Yes" and will only process the cleared rows.

**Vercel proxy (`api/apply.js`):**
- Receives form POST from browser, forwards to Apps Script
- `bodyParser: false` — Vercel must not consume the raw body
- Excludes `submissionId`, `submissionDate`, and `applicantSignature` from the forwarded payload
- Reads Application ID from response using regex `/CR_\d+_[a-z0-9]{6}/` and redirects to `/apply/success`
- `APPS_SCRIPT_URL` environment variable set in Vercel dashboard (Production and Preview)
- Status: ✅ Merged to main (May 21, 2026)

**Critical: Do not modify:**
- Row 1 headers in Master (Apps Script writes by position)
- FILTER/QUERY formulas in cell A1/A2/A3 of filtered tabs
- Named ranges (Dashboard and Helpers depend on these)
- Config Tab B1 (all year formulas depend on this)
- Essay lookup formulas in Master columns AQ and AR
- Apps Script configuration constants (spreadsheet IDs, folder IDs)

**Key IDs:**
- PDF Storage Folder: `1H7EQRF29pNp5r8NKJqDoz1HK92FyE1xW`

---

### Grant Fulfillment System

**Form flow:**
1. Email entry (or auto-verify via `?id=CR_XXXX` personalized link)
2. Document upload (skipped for students already approved)
3. Kit Customization (Section 1)
4. Shipping Information (Section 2)
5. Review & Submit (Section 3)

**Personalized link auto-verify:**
- On page load, the form checks the URL for an `?id=` parameter
- If found, calls the API with the application ID, shows "Getting your kit ready…", and routes directly to the correct screen
- Hero title personalizes to "Welcome, [FirstName]."
- If the ID is unrecognized, falls back to standard email entry — no regression
- Apps Script function: `checkStudentStatusById(applicationId)` — looks up by column A of Grant_Recipients, returns identical response shape as `checkStudentStatus()` so `handleStudentStatus()` works unchanged
- doPost() handles `action: 'checkStudentStatusById'` via Vercel proxy

**Kit Form Email system:**
- `sendKitFormEmails()` — menu-driven bulk sender. Reads all Grant_Recipients rows, builds unique `?id=` URL per student using `KIT_FORM_BASE_URL + '?id=' + applicationId`, confirms count before sending.
- `sendKitFormEmail(firstName, email, personalizedLink)` — sends styled HTML email with personalized link in CTA button and plain-text fallback.
- `testKitFormEmail()` — sends preview to elilavois@gmail.com before live send. Always run this before the cohort send.
- `KIT_FORM_BASE_URL` constant: `https://award.campusready.org/Customize_Your_Kit.html` — update once per year if URL changes.
- **Annual maintenance:** Email copy inside `sendKitFormEmail()` (grant package items, event date, etc.) should be updated each cohort year before sending. Function structure and personalized link logic require no year-to-year changes.
- Menu location: Fulfillment Tools → Send Kit Form Emails (after Generate Shopping List)

**Product_Logic architecture:**
- Product_Logic is populated exclusively by `rebuildProductLogic()` Apps Script function
- Reads directly from raw source tabs: Bedding, Pillows, Towels, Accessories, Universal Products, Personal_Care
- Reads by **header name** — column order in source tabs does not matter; IMAGE URL and other extra columns are silently ignored
- Product ID derived from Unique Lookup Key (e.g., "Sheet Set|White", "Pillow|Soft") — stable across rebuilds
- Clears Product_Logic rows 2+ and rewrites sorted data
- PL_* intermediate tabs (PL_Bedding, PL_Pillows, PL_Towels, PL_Personal_Care, PL_Accessories) are **deprecated** — can be hidden or deleted
- Menu location: Fulfillment Tools → Rebuild Product Logic (top of menu)
- **Current state:** 174 products, zero duplicate IDs, zero URL errors, all resolver dimensions correct

**⚠️ Critical operational rule — rebuildProductLogic():**
Do NOT run `rebuildProductLogic()` between student submissions and Shopping List generation. Running it mid-cycle will reassign Product IDs and break the Resolver → Shopping List join. Run once before submissions begin, then leave it alone until the next cycle.

**Resolver (LOGIC_HEADERS):**
- Maps student preferences to product rows in Product_Logic
- Includes `COLOR_CRIT: 'COLOR'` — slides color matching is active (deployed June 2026)
- Slides match by size AND color — a student selecting Navy size 10M will only match Navy size 10M rows

**Student_Selections sheet:**
- Headers in row 1 must match doPost() write order exactly
- Current confirmed header row (as of June 2026):
  `Timestamp | Student Name | Email Address | Shipping Preference (home or college) | Street Address | Street Address 2 | City | State | Zip Code | Gender Preference | Scent Preference | Deodorant Type | Style Preference | Bedding Color | Pillow Firmness | Towel Color | Slides Size | data_type | cohort_year | Comforter Cover Color | Slides Color | College Name | College Unit ID`

**Vercel proxy** bridges the HTML form to Apps Script backends without exposing script URLs.

**Transfer Winners timing:** Transfer Winners must be complete before the preferences form link goes out to winners (July 1). It does not need to run before award emails are sent — those are independent operations.

---

### Application Analysis Pipeline

**Location:** `~/Desktop/Campus_Ready_GitHub/2026_Overview/`

**Run order:**
```bash
venv/bin/python _extract_essays.py        # reads PDFs → _extracted_data.json
venv/bin/python _analyze_applications.py  # joins data → _analysis_output.json
venv/bin/python fill_analysis_doc.py      # fills template → internal + external docx
```

**Do not touch:** `Application_PDFs/` (sensitive, gitignored), `crf_service_account.json`.

**Known issues to fix before 2027:**
- Template path in `fill_analysis_doc.py` (line 35) is stale — points to v6.docx which was moved to Trash
- Chart rendering needs extraction into `regenerate_charts.py` — currently ad-hoc
- Annual constants (`FPL_4_PERSON_2026`) need updating
- Anonymization dicts are cycle-specific — rewrite for 2027 profiles

---

### Checklist Intelligence System

**Cloud Run deployment pattern:**
- All functions deployed to us-central1
- Always use `--no-invoker-iam-check` after deployment
- Batch sizes vary by function (15-100, see SYSTEM_ARCHITECTURE.md)
- Fallback extraction uses Playwright (heavier container with Chromium)

**Cloud Shell Python scripts need:**
```python
import sys
sys.path.insert(0, "/home/eric/.local/lib/python3.12/site-packages")
```

---

### Website

**Static HTML — no build process:**
- Edit HTML files directly
- Push to GitHub triggers deployment
- Shared header/footer via `/includes/header.html`, `/includes/footer.html`
- Include loader: `/assets/js/includes.js`
- Tailwind CSS loaded from CDN with inline config block
- New pages must include: standard head elements, fonts, Tailwind config, analytics snippet, meta tags, header/footer includes
- `CLAUDE.md` in repo root — Claude Code configuration file

**Branch discipline:**
- All work on `staging` branch
- Staging pushes produce Vercel preview URLs
- Merges to `main` deploy to the live site
- Squash and merge only (repo configured)
- Never push directly to `main`

---

## Code Delivery Rules

1. **No code until approach is approved.** Discuss strategy first.
2. **Snippets over rewrites.** Default to targeted code snippets, not full file rewrites. For each edit:
   - Provide the **target line number**
   - Show the **line before** and **line after** for placement verification
   - Include the **new code** to insert or replace
   - When delivering multiple edits, **order them bottom-up** (highest line numbers first) so line numbers don't drift as Eric applies changes
   - Only rewrite a complete file when changes touch >50% of the file or when creating a new file. State why.
3. **Apps Script changes are high-risk.** The application processing pipeline processes real student applications for real financial support. Any change to doPost or scoring formulas requires extra caution and testing.
4. **Preserve formula integrity.** When modifying sheets, never overwrite cells containing formulas unless explicitly approved.
5. **Test with a test application** after any Application System changes. Delete the test row when done.

---

## Current Deployment State

### Vercel Proxies

| Proxy | File | System | Status |
|-------|------|--------|--------|
| Application form | `api/apply.js` | Application System | ✅ Production — merged to main May 21 |
| Kit form | Vercel proxy | Grant Fulfillment | ✅ Production — live at award.campusready.org |

### Cloud Run Functions (Checklist Intelligence)

| Function | Version | Status |
|----------|---------|--------|
| discover-urls | v4.6 | Deployed |
| analyze-urls | v1.0 | Deployed |
| retry-flagged | v1.3 | Deployed |
| extract-items | v4.0 | Deployed |
| fallback-extraction | v4.0 | Deployed |
| process-intake | v4.0 | Deployed |

### Apps Script Projects

| Project | System | Contains |
|---------|--------|----------|
| Application Submission | Application | doPost, PDF generation, email |
| Application Admin | Application | Transfer Winners, Archive Cohort, Award Decision Emails |
| Checklist Tools | Checklist Intelligence | Menu tools, batch runners |
| Intake Form Script | Checklist Intelligence | Intake Form automation |
| Grant Fulfillment Script | Grant Fulfillment | checkStudentStatus, checkStudentStatusById, rebuildProductLogic, sendKitFormEmails, document upload, shopping list, testimonials |

---

## Sensitive Areas

These are the highest-risk areas for technical changes:

1. **doPost handler** — Processing live applications. Downtime means lost submissions.
2. **Master sheet column positions** — Apps Script writes by position, not header name.
3. **Scoring formulas** — Any error directly affects award decisions.
4. **Config Tab B1** — All year-based formulas depend on this cell.
5. **Vercel proxy configuration** — Both the kit form and the application form proxy bridge HTML forms to Apps Script. Breaking either means submissions fail silently.
6. **Script Properties** — All Apps Script secrets (Google Maps API key) live in Script Properties, never in source code. If you need to add a new credential, add it in the Apps Script editor under Project Settings → Script Properties, then read it via `PropertiesService.getScriptProperties().getProperty('KEY_NAME')`. Never write a credential value into a .gs file.
7. **Application Analysis pipeline** — Sensitive applicant data (PDFs, extracted JSON). Never commit to repo. Keep gitignored files local.
8. **rebuildProductLogic() timing** — Never run between submissions and Shopping List generation. Product IDs will reassign and break the join.

---

## Pending Build Tasks

| Task | Priority | Notes |
|------|----------|-------|
| Kit form test submission | High | Run before July 1 send — form is ready |
| Rename column 38 header to "Processing Timestamp" | Medium | Currently "Internal Notes" — staff notes there would be overwritten on retry |
| Update testSyncPath() to match current form payload | Medium | Still references old field names — non-blocking but misleading. Before 2027 window. |
| Extract chart rendering into `regenerate_charts.py` | Medium | Before 2027 cycle |
| Restore or rebuild fill_analysis_doc.py template | Medium | Before 2027 cycle |
| Move SPREADSHEET_ID / PDF_FOLDER_ID to Script Properties | Low | Not secrets, but would improve consistency with API key pattern |

---

*These systems process real student applications for real financial support. Precision matters more than speed.*
