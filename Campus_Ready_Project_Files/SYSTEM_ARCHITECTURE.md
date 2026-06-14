# System Architecture — Campus Ready Foundation

**Purpose:** Consolidated technical reference for all Foundation systems
**Last Updated:** June 11, 2026

---

## Overview

Campus Ready Foundation operates five interconnected systems, built primarily on Google Workspace (Sheets, Apps Script, Drive) with Cloud Run functions for heavier processing and Vercel for form proxies.

| System | Primary Technology | Data Store | Status |
|--------|--------------------|------------|--------|
| Application System | HTML form + Apps Script + Vercel | Application Reviews Sheet | Active — 2026 awards sent May 27 |
| Grant Fulfillment | HTML form + Apps Script + Vercel | Grant Fulfillment Sheet + Drive | Active — Kit form live at award.campusready.org, confirmation email deployed |
| Application Analysis Pipeline | Python pipeline + docx | Local repo (`2026_Overview/`) | Complete — 2026 FINAL docs produced |
| Checklist Intelligence | Cloud Run + Gemini AI | Master Sheet + Intake Form | Operational — ~1,600 schools |
| Website | Static HTML + Vercel | N/A | Live at campusready.org |

**GCP Project:** `campus-ready-checklist`
**Service Account:** `checklist-processor@campus-ready-checklist.iam.gserviceaccount.com`

---

## 1. Application System

### Purpose
Manages the complete lifecycle from student submission through board review to award decisions.

### Architecture
```
Student ──▶ Application Form (HTML at /apply/)
                 │ POST
                 ▼
            Vercel Proxy (/api/apply.js)   ← routes around scripts.google.com
                 │ Forward
                 ▼
            Apps Script (doPost)
            • Parses form data
            • Generates Application ID
            • Calculates distance (Google Maps API via Script Properties key)
            • Creates PDF of full application
            • Writes 39-column row to Master sheet
            • Writes college_id separately to column AX (50)
            • Sends staff notification email
            • Sends applicant confirmation email
                 │
                 ▼
          Application Reviews Sheet
          ┌──────────────────────────┐
          │ Master Tab               │ ← All applications (source of truth)
          │ Applications Tab         │ ← Filtered by cycle year (QUERY)
          │ Review Tab               │ ← Scoring calculations (FILTER)
          │ Final_Review Tab         │ ← Sorted by Total Score (QUERY)
          │ Board_Essays Tab         │ ← Essay scoring input (FILTER)
          │ Config Tab               │ ← Year, dates, settings (hidden)
          │ FPG Current Tab          │ ← Federal Poverty Guidelines
          │ Archive Tab              │ ← Historical cohorts
          │ Dashboard Tab            │ ← KPIs and charts
          └──────────────────────────┘
```

### Scoring System (100 points)

| Category | Points | Type | Method |
|----------|--------|------|--------|
| Financial Need | 40 | Auto-calculated | Income Per Person: cohort ranking + FPG comparison, averaged |
| Household Circumstances | 15 | Auto-calculated | 1 point per indicator (max 5), scaled to 15 |
| Distance & Travel | 15 | Auto-calculated | Home → college distance via Google Maps |
| Essay 1: Award Significance | 15 | Board scored | Independent scoring (1-10) × 1.5 |
| Essay 2: Challenge & Resilience | 15 | Board scored | Independent scoring (1-10) × 1.5 |
| Housing Verification | Pass/Fail | Required | Must provide proof of on-campus housing |

**Financial Need Bands:** Critical (32-40), High (24-31), Moderate (12-23), Lower (0-11)

**Config Tab (B1)** controls the cycle year — all year-based formulas reference this single cell. Year rollover is a 5-minute process: archive current cohort, update B1, verify with test application.

**Distance scoring (resolved May 21, 2026):** Free-text college entry produced incorrect ZIP codes and misspelled city names, corrupting distance scoring for 18 students in the 2026 cohort — some distances off by 10x. Resolved by replacing free-text fields with the IPEDS-backed typeahead picker (DEC-015). ZIP is now authoritative from IPEDS.

### Vercel Proxy (Application Form)

**File:** `api/apply.js` in `ericlilavois/CampusReady_Site` repo
**Status:** ✅ Merged to main (May 21, 2026) — production
**Purpose:** Receives form POST from browser, forwards to Apps Script. Browser never touches scripts.google.com, which school filters block.
**Key detail:** `submitApplication()` excludes `submissionId`, `submissionDate`, and `applicantSignature` from the proxy payload — these fields caused duplicate-submission errors in Apps Script when included.
**Environment variable:** `APPS_SCRIPT_URL` set in Vercel dashboard for Production and Preview environments.

### Key Admin Functions

| Function | Menu Location | Purpose |
|----------|--------------|---------|
| Transfer Winners | Grant Fulfillment menu | Moves Awarded recipients to Grant Fulfillment Database |
| Send Award Decision Emails | Grant Fulfillment menu | Sends winner or non-winner emails to all rows with Award Status set and not yet notified |
| Archive Current Cohort | Archive menu | Copies to Archive, clears working tabs |

### Award Decision Emails

Two email functions live in `Application_Admin_Script.gs`:

- `sendWinnerEmail(firstName, email)` — HTML + plaintext. Subject: "Congratulations from Campus Ready Foundation."
- `sendNonWinnerEmail(firstName, email)` — HTML + plaintext. Subject: "Campus Ready Foundation."
- `sendAwardDecisionEmails()` — Menu-driven orchestrator. Reads Final_Review (headers row 3, data starts row 4). Filters on Award Status ("Awarded"/"Denied"). Skips rows where "Award Email Sent" = "Yes". Marks each row "Yes" with a timestamp on success.
- `testWinnerEmail()` / `testNonWinnerEmail()` — Send test emails to eric@campusready.org. Run before any live send.

**Known limitation — bounced emails:** GmailApp hands the message off to the mail server and marks the row "Yes" immediately. It has no awareness of downstream bounces. Recovery: manually clear the "Award Email Sent" cell and the timestamp for the affected row, correct the email address, and rerun `sendAwardDecisionEmails()`. The function skips rows already marked "Yes" and only processes the cleared rows.

**Transfer Winners timing:** Transfer Winners must be complete before the preferences form link goes out to winners — not before award emails are sent. The two operations are independent.

### Board Essay Scoring (2026)

Three personalized scoring sheets built for Eric Lilavois, Karen Dantzler, and Janie Green. Each sheet: Tab 1 (Instructions, rubric, calibration tips), Tab 2 (45 students pre-populated with clickable PDF links, score entry columns E and F, optional notes column G). Scoring deadline: May 22, 2026. Scoring complete.

### Master Sheet Column Structure

The Master sheet has **49 columns**. The main submission script writes a 39-column row array. Columns 40–49 (AN–AW) are scoring and derived data managed outside the submission script and must never be overwritten by it.

| Range | Columns | Managed By |
|-------|---------|------------|
| 1–39 | A–AM | Apps Script row write (doPost) |
| 40–49 | AN–AW | Scoring formulas and derived fields |
| 50 | AX | `college_id` — written via separate `setValue` after row write |

**Rule:** Any future field additions must follow the AX pattern — a separate `setValue` to a column beyond AW. Never extend the 39-column row array.

**Pre-existing issue (not yet fixed):** Column 38 header reads "Internal Notes" but Apps Script uses it as a `PROCESSING_STARTED` timestamp. Staff notes written there would be overwritten on retry. Rename header to "Processing Timestamp" before staff begin using that column.

### School Database (IPEDS + DormShopper Alias Layer)

**Status:** Complete — both Phase 1 (database) and Phase 2 (form integration) shipped May 21, 2026.

- 5,969 active institutions sourced from IPEDS (US Dept of Education)
- Housing eligibility gate: ROOM=1 and ROOMCAP ≥ 50 → 1,987 eligible schools
- Ineligible schools remain visible in the picker with an explanation — not hidden
- Alias layer from IPEDS IALIAS field + one-time DormShopper export (1,626 records)
- 306 ambiguous alias tokens dropped
- 15 hand-curated rename/merger entries in `rename_crosswalk.json`
- Data file is self-hosted — no ongoing DormShopper infrastructure dependency

**Files (in `tools/build_schools/`):**

| File | Purpose |
|------|---------|
| `build.py` | Full build pipeline |
| `crf_schools_merged.json` | Production data file — 5,969 schools with merged aliases |
| `crf_schools_master_raw.json` | IPEDS master pre-alias-merge |
| `rename_crosswalk.json` | 15 hand-curated rename/merger entries |
| `crf_excluded_institutions.txt` | 194 excluded records with reasons |
| `ambiguous_aliases_dropped.txt` | 306 dropped alias tokens with reasons |

**Annual maintenance (every September):** Review `rename_crosswalk.json`, re-download IPEDS HD + IC files, run `python3 build.py --source prod`, replace both JSON files, commit and deploy.

---

## 2. Grant Fulfillment System

### Purpose
Manages the journey from award notification to kit delivery and post-move-in engagement.

### Architecture
```
Application Reviews ──[Transfer Winners]──▶ Grant Fulfillment Database
                                                    │
                                           Grant_Recipients Tab
                                           (one row per winner)
                                                    │
                                    ┌───────────────┴──────────────────┐
                                    │ Personalized email with ?id= link │
                                    │ sendKitFormEmails() → July 1       │
                                    └───────────────┬──────────────────┘
                                                    │
                                                    ▼
                                      Customize Your Kit Form (HTML)
                                      award.campusready.org
                                      ┌────────────────────────────────┐
                                      │ Auto-verify (?id= on page load) │
                                      │ — or — Email entry             │
                                      ├────────────────────────────────┤
                                      │ Step 1: Document Upload        │
                                      │ (skipped if already approved)  │
                                      ├────────────────────────────────┤
                                      │ Section 1: Kit Customization   │
                                      ├────────────────────────────────┤
                                      │ Section 2: Shipping Info       │
                                      ├────────────────────────────────┤
                                      │ Section 3: Review & Submit     │
                                      └───────────────┬────────────────┘
                                                      │
                                         ┌────────────┼────────────┐
                                         ▼            ▼            ▼
                                   Vercel Proxy   Google Drive   Sheet Update
                                   (validation)   (documents)   (preferences)
                                                      │
                                                      ▼
                                              Kit Confirmation Email
                                              (auto-fires, school colors,
                                               full product summary)
                                                      │
                                                      ▼
                                              Shopping List Tab
                                              (aggregated items)
                                                      │
                                                      ▼
                                             Kit Assembly + Shipping
                                                      │
                                                      ▼
                                        Testimonial Invite + Gift Card
```

### Kit Form Email System

- `sendKitFormEmails()` — menu-driven bulk sender. Reads all Grant_Recipients rows, builds unique `?id=` URL per student using `KIT_FORM_BASE_URL + '?id=' + applicationId`, confirms count with Eric before sending, then dispatches.
- `sendKitFormEmail(firstName, email, personalizedLink)` — sends styled HTML email with personalized link in CTA button and plain-text fallback.
- `testKitFormEmail()` — sends preview to elilavois@gmail.com. Always run before cohort send.
- `KIT_FORM_BASE_URL` constant: `https://award.campusready.org/Customize_Your_Kit.html` — update once per year if URL changes.
- Menu location: Fulfillment Tools → Send Kit Form Emails (after Generate Shopping List)

### Personalized Link Auto-Verify

- On page load, form checks URL for `?id=` parameter
- If found: calls API with application ID, shows "Getting your kit ready…", routes to correct screen
- Hero title personalizes to "Welcome, [FirstName]."
- If ID unrecognized: falls back to standard email entry — no regression for direct URL visitors
- Apps Script: `checkStudentStatusById(applicationId)` — looks up by column A of Grant_Recipients, returns identical response shape as `checkStudentStatus()` so `handleStudentStatus()` works unchanged
- `doPost()` handles `action: 'checkStudentStatusById'` via Vercel proxy

### Kit Confirmation Email

Fires automatically from `doPost()` after `processLatestSubmission()` completes. Wrapped in try/catch — never blocks submission.

- Static, fully expanded — all 7 product categories always visible
- Header renders in the student's school color (passed via POST body from `schoolRecord.primary_color_hex`)
- Visual checkbox squares next to every item for physical tracking as packages arrive
- Product images use the same Amazon CDN URLs as the kit form
- Brand names from a static map keyed by product type + variant
- Products read from the Resolver sheet — shows exact resolved SKUs, not form data
- `testKitConfirmationEmail()` — sends test to elilavois@gmail.com using hardcoded NYU violet (#57068C). Menu: Fulfillment Tools → "📬 Test — Kit Confirmation Email"
- Sends from hello@campusready.org

### Product_Logic Architecture

Product_Logic is populated exclusively by the `rebuildProductLogic()` Apps Script function. The prior SORT/QUERY/ARRAYFORMULA-from-PL_*-tabs architecture is deprecated.

**How it works:**
- Reads directly from raw source tabs: Bedding, Pillows, Towels, Accessories, Universal Products, Personal_Care
- Reads by **header name** — column order in source tabs does not matter; IMAGE URL and other extra columns are silently ignored
- Product ID = Unique Lookup Key (e.g., "Sheet Set|White", "Pillow|Soft") — stable string, deterministic across rebuilds
- Clears Product_Logic rows 2+ and rewrites sorted data

**Current state:** 174 products — zero duplicate Product IDs, zero URL errors, all resolver dimensions confirmed correct.

| Product Type | Count | Notes |
|-------------|-------|-------|
| Sheet Set | 6 | One per color |
| Duvet Cover | 6 | One per color |
| Pillow | 3 | Soft / Medium / Firm |
| Towel Set | 6 | One per color |
| Slides | 48 | 6 colors × 4 sizes × Men/Women |
| Shampoo & Conditioner Set | 12 | 4 scents × Men/Women/Unisex |
| Deodorant | 15 | 5 scents × 3 genders |
| Shaving Cream | 15 | 5 scents × 3 genders |
| Universal + Accessories | remaining | Single-SKU items |

**PL_* intermediate tabs deprecated** — no longer part of the pipeline, can be hidden or deleted.

**⚠️ Critical operational rule:** Do NOT run `rebuildProductLogic()` between student submissions and Shopping List generation. Running it mid-cycle will reassign Product IDs and break the Resolver → Shopping List join.

**Menu location:** Fulfillment Tools → Rebuild Product Logic (top of menu)

### Resolver (LOGIC_HEADERS)

Maps student preferences from Student_Selections to product rows in Product_Logic:
- `COLOR_CRIT: 'COLOR'` — slides color matching active (deployed June 2026)
- Sheet Set and Duvet Cover are split cases — Duvet Cover resolves against `ComforterCoverColor` with fallback to `BeddingColor` for pre-2026 submissions

### Student_Selections Sheet

Headers in row 1 must match `doPost()` write order exactly. **Current confirmed header row (as of June 2026):**

`Timestamp | Student Name | Email Address | Shipping Preference (home or college) | Street Address | Street Address 2 | City | State | Zip Code | Gender Preference | Scent Preference | Deodorant Type | Style Preference | Bedding Color | Pillow Firmness | Towel Color | Slides Size | data_type | cohort_year | Comforter Cover Color | Slides Color | College Name | College Unit ID`

### Kit Preferences Captured

| Category | What It Determines |
|----------|--------------------|
| Shipping Preference | Home or campus delivery |
| Gender Preference | Product variants (cascades across personal care) |
| Scent Preference | Fresh, Unscented, Cool & Herbal, Wood & Amber (cascades across personal care) |
| Deodorant Type | Stick, spray, etc. |
| Bedding Color | Sheet set color (White, Gray, Navy, Cream, Pink, Mint) |
| Comforter Cover Color | Duvet cover color — independent from sheet color |
| Pillow Firmness | Soft, Medium, Firm |
| Towel Color | Bath towel color |
| Slides Size | Shoe size for shower slides |
| Slides Color | Color selection for shower slides |

### Verification Requirements

| Document | Purpose | Stored In |
|----------|---------|----|
| Housing Confirmation | Proves on-campus housing | Google Drive ({AppID}_Housing.pdf) |
| Acceptance Letter | Confirms enrollment | Google Drive ({AppID}_Acceptance.pdf) |

### Grant_Recipients Tab Columns

| Col | Field | Notes |
|-----|-------|-------|
| A | Application ID | From Application Reviews |
| B | Student Name | From Application Reviews |
| C | Email Address | From Application Reviews |
| D | Cohort Year | Set at transfer |
| E | Transfer Date | Set at transfer |
| F | Housing Status | Pending → Approved/Rejected |
| G | Housing Doc URL | Google Drive link |
| H | Acceptance Status | Pending → Approved/Rejected |
| I | Acceptance Doc URL | Google Drive link |
| J | Items Selected | Yes/No |
| K | Submission Timestamp | Kit form submission time |
| L | Rejection Email Sent | Timestamp if rejection email sent |
| M | Rejection Count | Number of rejection emails sent |
| N | Start Date | College start date |
| O | Testimonial Invited | Timestamp when invite sent |
| P | Submission URL | Kit form submission URL |
| Q | Release Signed | Media release status |
| R | Gift Card Sent | Gift card distribution status |
| S | Phone | From Application Reviews |
| T | College Name | Canonical IPEDS name — populated at transfer time (2027+) |
| U | College Unit ID | IPEDS UNITID — populated at transfer time (2027+) |

### Apps Script Functions — Grant Fulfillment

| Function | Purpose |
|----------|---------|
| `checkStudentStatus(email)` | Validates student by email, returns status + kit data |
| `checkStudentStatusById(applicationId)` | Validates student by Application ID (column A), returns identical response shape |
| `rebuildProductLogic()` | Rebuilds Product_Logic from raw source tabs by header name |
| `sendKitFormEmails()` | Bulk sends personalized kit form invitations with ?id= links |
| `sendKitFormEmail(firstName, email, link)` | Sends single styled HTML invitation email |
| `testKitFormEmail()` | Sends preview to elilavois@gmail.com |
| `sendKitConfirmationEmail(ss, data)` | Reads Resolver, builds and sends post-submission product summary email in school colors |
| `testKitConfirmationEmail()` | Sends test confirmation email to elilavois@gmail.com |
| `generateShoppingList()` | Aggregates student selections into Shopping List tab |
| `sendTestimonialInvites()` | Sends post-move-in testimonial invitation emails |

---

## 3. Application Analysis Pipeline

### Purpose
Annual Python pipeline that produces the Application Analysis document — an internal version for the board and a redacted external version for donors.

### Document Architecture (DEC-012)
Two versions produced from one source in a single pipeline pass:
- **Internal version:** Full content including selection methodology and real student profiles
- **External version:** Derived from internal via `derive_external()` — Section 6 stripped, four featured students anonymized to Student A–D, locations generalized, "INTERNAL" markers removed

The donor copy is never edited by hand — always re-derived from the internal FINAL.

### Pipeline Location
`~/Desktop/Campus_Ready_GitHub/2026_Overview/`

### Run Order
```bash
venv/bin/python _extract_essays.py        # rebuilds _extracted_data.json from PDFs
venv/bin/python _analyze_applications.py  # rebuilds _analysis_output.json
venv/bin/python fill_analysis_doc.py      # fills template, writes internal + external dated docx
# then regenerate chart PNGs and swap into word/media/ of the filled internal
# then re-derive external from the chart-complete internal
```

### Chart Inventory (2026)

| # | Content | Filename | Dimensions |
|---|---------|----------|------------|
| 1 | Cover logo | image1.png | 1006×456 — do not touch |
| 2 | Financial need band distribution (4 bars) | image3.png | 432×149 |
| 3 | Household size distribution (5 bars) | image5.png | 432×165 |
| 4 | Income per person distribution (5 bars) | image7.png | 432×165 |
| 5 | Transport method breakdown (3 bars) | image8.png | 432×165 |
| 6 | Destinations by institution type (6 bars) | image6.png | 432×165 |
| 7 | Distance bands (5 bars) | image2.png | 432×149 |
| 8 | California vs out-of-state colleges (2 bars, horizontal) | image4.png | 432×90 |

### Known Issues (Must Resolve Before 2027)

1. **Template path in `fill_analysis_doc.py` is stale.** Line 35 points to `CRF_Application_Analysis_Internal_20260516_v6.docx`, which was moved to Trash.
2. **Chart rendering not in a script.** Extract into `regenerate_charts.py`.
3. **Annual constants need updating.** `FPL_4_PERSON_2026 = 31200` must be updated and renamed.
4. **Anonymization dicts are cycle-specific.** Rewrite for 2027 profiles.
5. **School name canonicalization.** `SCHOOL_ALIASES` dict will need new entries for 2027 destination schools.

---

## 4. College Checklist Intelligence System

### Purpose
Automated discovery and extraction of residence hall packing lists from ~1,600 U.S. residential colleges.

### Six-Stage Pipeline
```
Stage 1: DISCOVER URLS ──▶ Stage 2: ANALYZE URLS ──▶ Stage 3: RETRY FLAGGED
(Gemini + Search)          (quality evaluation)       (targeted re-discovery)
     │                                                        │
     └────────────────── College_Summaries ◀──────────────────┘
                                │
                                ▼
                    Stage 4: EXTRACT ITEMS ──▶ Stage 5: FALLBACK EXTRACTION
                    (Gemini grounding)          (Playwright for JS pages)
                                │                        │
                                └──── Intake Form ◀──────┘
                                          │
                                          ▼
                              Stage 6: SEMANTIC MATCHING
                              (Alias lookup + Vertex AI)
                                          │
                                          ▼
                                    School_Items
                                (matched to 48 canonical products)
```

### Cloud Run Functions

| Function | Version | Batch Size | Purpose |
|----------|---------|------------|---------|
| discover-urls | v4.6 | 50 schools | URL discovery via Gemini grounding |
| analyze-urls | v1.0 | 100 schools | Quality evaluation + categorization |
| retry-flagged | v1.3 | 50 schools | Targeted re-discovery with strategies |
| extract-items | v4.0 | 50 URLs | Item extraction via Gemini grounding |
| fallback-extraction | v4.0 | 15 URLs | Playwright-based extraction |
| process-intake | v4.0 | All pending | Semantic matching to canonicals |

**All deployed to:** Google Cloud Run, us-central1

### Data Stores

| Sheet | ID | Purpose |
|-------|----|----|
| Master Sheet | `1nGjWNY8VyvDv1pBUuiUiky2NrufNvUMe7TuUNILNoaQ` | Operational hub |
| Intake Form | `1OtJVT3Us1szyRZO6rQAqs6qDC_WLNwvfgIHXK5_75vQ` | Extraction staging |

### Key Master Sheet Tabs

| Tab | Purpose |
|-----|---------|
| College_Summaries | One row per school — URLs, status, analysis |
| School_Target_List | 1,625 prioritized schools (processing queue) |
| School_Items | Extracted items matched to canonical products |
| CR_Item_Coverage | 48 canonical Campus Ready products |
| Alias_Schema | Maps variant item names to canonicals |

### Semantic Matching
Two-tier approach:
1. **Alias Lookup** — Exact match against Alias_Schema (100% confidence)
2. **Semantic Matching** — Vertex AI embeddings (80%+ auto-approved, 60-79% needs review, <60% unmatched)

### Key Learnings
- Simple searches beat complex ones: `MIT move in checklist` outperforms complex site-scoped queries
- Save failed URLs for review — Gemini often finds the right page despite HTTP validation failures
- PDFs extract reliably; HTML via grounding is inconsistent — route failures to Playwright
- Alternating retry/analyze cycles required until queue empties
- Orientation departments often own packing lists, not just housing

---

## 5. Website (campusready.org)

### Purpose
Public face of the organization. Communicates mission, hosts student application, provides donor information.

### Technical Stack

| Component | Technology |
|-----------|------------|
| Hosting | Vercel (GitHub auto-deploy from `ericlilavois/CampusReady_Site`) |
| Styling | Tailwind CSS via CDN |
| Fonts | Google Fonts (Inter, Playfair Display) |
| Analytics | Google Analytics (G-C6B2GRMESL) |
| Forms | Custom HTML → Vercel proxy → Apps Script backends |
| Repo | `ericlilavois/CampusReady_Site` (main branch = production) |
| Staging | `staging` branch → Vercel preview URL |
| Claude Code config | `CLAUDE.md` in repo root |

**Branch discipline:** All work on `staging`. Never push directly to `main`. Squash and merge only.

### Site Structure
```
campusready.org/
├── index.html              ← Homepage
├── about/                  ← Origin story + team bios
├── mission/                ← Mission statement
├── apply/                  ← Application landing + form (closed — window ended May 15)
│   └── success/            ← Post-submission success page
├── donate/                 ← Givebutter donation page
├── partners/               ← Corporate partnerships (DoorDash added)
├── faq/                    ← FAQ (accordion)
├── privacy/                ← Privacy policy
├── api/
│   └── apply.js            ← Application form proxy (production — merged to main May 21)
├── includes/               ← Shared header/footer
└── assets/                 ← Images, JS, favicons, OG images
```

### Brand Implementation

| Element | Value |
|---------|-------|
| Primary Color | #14b8a6 (Brand 500 teal) |
| Hover | #0d9488 (Brand 600) |
| Dark Accent | #0f766e (Brand 700) |
| Light BG | #f0fdfa, #ccfbf1 (Brand 50-100) |
| Headlines | Playfair Display (serif, 700/800) |
| Body | Inter (sans-serif) |
| Hero Effect | Radial gradient, teal at 10-15% opacity |
| Cards | Glass morphism, subtle shadows, 12-16px radius |
| Tagline | "Confidence. Dignity. A Strong Start." |
| CRF Green (brand standard) | #469E92 (used in Application Analysis charts) |

### Include System
- Shared header: `/includes/header.html`
- Shared footer: `/includes/footer.html`
- Loaded via: `/assets/js/includes.js`
- Pages use: `<div data-include="/includes/header.html"></div>`

---

## Cross-System Dependencies

| From | To | Connection |
|------|----|----|
| Website | Application System | Form POSTs to Vercel proxy → Apps Script |
| Application System | Grant Fulfillment | Transfer Winners admin function |
| Application System | Application Analysis | Master CSV export feeds analysis pipeline |
| Grant Fulfillment | Students | Kit form emails with personalized ?id= links + post-submission confirmation email |
| Grant Fulfillment | Website | Kit form linked from award communications |
| Checklist Intelligence | Grant Fulfillment | Planned: school-specific items inform kit contents |
| Website | Vercel | Proxies both application form and kit form submissions |
| All systems | Google Drive | Document storage (PDFs, verifications) |
| All systems | Gmail | Email notifications from Foundation addresses |

---

## Email Addresses

| Address | Purpose |
|---------|---------|
| hello@campusready.org | General contact (transactional — used by Apps Script for kit emails and confirmation email) |
| apply@campusready.org | Application confirmations |

---

## Implementation Notes

All coding work is handled via Claude Code. This document is the technical reference — column structures, system boundaries, and architectural decisions live here. When Claude Code needs context about the Foundation's systems, this is the authoritative source.

*For specific column indices, function URLs, or deployment steps, ask Eric for the relevant files.*
