# Decision Log — Campus Ready Foundation

**Active decisions:** DEC-001 through DEC-023
**Last updated:** June 11, 2026

---

## How to Use This Document

- **Before proposing an approach:** Check if it's already been decided
- **After making a decision:** Add it here with date, rationale, and alternatives considered
- **If revisiting a decision:** Note the original decision and why it's being changed

---

## Decision Format

```markdown
### DEC-XXX: Short Title (Date)

**Context:** Why this decision was needed.

**Decision:** What was decided.

**Rationale:** Why this approach was chosen.

**Status:** Implemented / Pending / In Progress
```

---

## Pre-Existing Decisions

The following decisions predate this decision log. They are documented here for reference — these systems were built before formal decision tracking was established.

### DEC-001: Application Scoring Rubric — 70/30 Split (Pre-2026)

**Context:** Needed a fair, transparent method to evaluate grant applications balancing objective data with human judgment.

**Decision:** 100-point rubric: 70 points objective (Financial Need 40, Household Circumstances 15, Distance 15) + 30 points subjective (Essay 1: 15, Essay 2: 15). Housing verification as pass/fail gate.

**Rationale:** Heavy objective weighting reduces bias. Board essay scoring adds human assessment of resilience and need. Dual-method financial need calculation (cohort ranking + FPG comparison) ensures fairness across varying applicant pools.

**Status:** Implemented.

---

### DEC-002: Financial Need Dual Calculation (Pre-2026)

**Context:** Single-method financial need scoring could disadvantage applicants in years with unusually high or low income pools.

**Decision:** Average two scores: (1) Cohort points based on applicant's rank within the current year's pool, (2) Absolute points based on Income Per Person relative to Federal Poverty Guidelines. Final = average of both, rounded to whole points.

**Rationale:** Cohort method captures relative need within the applicant pool. Absolute method anchors to an external standard. Averaging smooths distortions from either method alone.

**Status:** Implemented.

---

### DEC-003: Config Tab as Single Source of Truth (Pre-2026)

**Context:** Year rollover previously required updating formulas across multiple tabs — error-prone and time-consuming.

**Decision:** All year-based formulas reference Config Tab cell B1. Year rollover requires only: archive cohort, update B1, verify with test application.

**Rationale:** Single point of change eliminates formula update errors. Estimated rollover time: 5-10 minutes.

**Status:** Implemented.

---

### DEC-004: Checklist Intelligence Six-Stage Pipeline (Pre-2026)

**Context:** Needed to automate packing list discovery and extraction across ~1,600 colleges at scale.

**Decision:** Six-stage pipeline: URL Discovery → URL Analysis → Retry Flagged → Extraction → Fallback Extraction (Playwright) → Semantic Matching. Each stage is a separate Cloud Run function with independent batch processing.

**Rationale:** Separation of concerns allows each stage to fail and retry independently. Fallback extraction handles JavaScript-heavy pages that Gemini grounding can't process. Semantic matching with confidence thresholds ensures quality control.

**Status:** Implemented.

---

### DEC-005: Website Static HTML Architecture (Pre-2026)

**Context:** Needed a professional website that Eric could maintain without engineering dependencies.

**Decision:** Static HTML pages with Tailwind CSS via CDN, shared header/footer via JavaScript includes, hosted on Vercel via GitHub auto-deploy. No build process, no CMS.

**Rationale:** Zero build complexity. Eric edits HTML directly. Changes deploy automatically on push. Tailwind CDN avoids build step while providing utility-first styling.

**Status:** Implemented.

---

### DEC-006: Grant Fulfillment Kit Customization via Web Form (Pre-2026)

**Context:** Needed a way for award recipients to specify their preferences for personalized kits.

**Decision:** Multi-step web form: (1) Email validation against Grant_Recipients sheet via Vercel proxy, (2) Document upload to Google Drive, (3) Kit preference selection, (4) Shipping information, (5) Review & Submit. All data writes back to Grant Fulfillment Database.

**Rationale:** Web form is accessible, requires no app installation, and integrates directly with Google Sheets backend. Vercel proxy bridges the form to Apps Script without exposing script URLs.

**Status:** Implemented.

---

## Recent Decisions

### DEC-007: Web Filter Vendor Categorization (May 13, 2026)

**Context:** Students applying from school computers and networks were blocked from accessing the application. Root cause was two distinct issues: (1) school web filters blocking scripts.google.com — the domain the application form was posting to directly — identified by Terri Linder (Academic & College Counselor, St. Helena High School); and (2) several vendor databases either lacking campusready.foundation as a category or flagging it as suspicious. The scripts.google.com issue was the primary cause of submission failures; domain categorization was a secondary but real contributing factor.

**Decision:** Submit categorization and review requests to all major web filtering vendors. Results:

| Vendor | campusready.foundation | campusready.org | Outcome |
|--------|----------------------|-----------------|---------|
| Cisco Talos | Non-governmental Organizations | — | ✅ No action needed |
| Fortinet FortiGuard | Education (changed from Suspicious/Newly Registered) | — | ✅ Confirmed May 13 |
| Barracuda | Education (submitted) | — | ✅ Submitted May 13 |
| Securly | Educational | — | ✅ Confirmed May 13 |
| Lightspeed Systems | Email sent May 13 | — | ⚠️ Response pending |
| GoGuardian | Email sent May 13 | — | ⚠️ Response pending |

**Rationale:** Proactive categorization ensures students on school networks can access the application without IT intervention. Annual recheck every September before application window opens (see P-008).

**Status:** Implemented. Two vendors (Lightspeed, GoGuardian) still pending response.

---

### DEC-008: Vercel Proxy for Application Form (May 2026)

**Context:** The application form was POSTing directly to scripts.google.com, which school web filters block. This was the primary cause of submission failures for students applying from school networks.

**Decision:** Route all application form submissions through a Vercel proxy (`api/apply.js`). The browser POSTs to the Vercel endpoint; Vercel forwards to Apps Script. Students never touch scripts.google.com.

**Rationale:** Vercel is already the hosting platform. Adding a proxy endpoint requires no new infrastructure. The proxy also provides a clean redirect to `/apply/success` using the Application ID extracted from the Apps Script response.

**Status:** Implemented. Merged to main May 21, 2026.

---

### DEC-009: API Key and Secrets via Script Properties (May 21, 2026)

**Context:** The Google Maps API key was hardcoded inline in `Application_Main_Script.gs`. When `apps-script/` was committed to GitHub for the first time, GitHub's secret scanner detected the key immediately.

**Decision:** All secrets sourced from `PropertiesService.getScriptProperties()`. Source code never contains credential values. The Maps API key is read via `CONFIG.GOOGLE_MAPS_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY')`. A guard in `calculateDistance()` throws a clear error if the property is missing — caught by the existing background-queue error pipeline, marks the row Failed, and alerts eric@campusready.org. Fails loudly rather than writing junk distance values silently.

**Rationale:** Secrets in source code become secrets in git history permanently. Script Properties are the correct pattern for Apps Script credentials — they're per-project, not per-file, and never leave the Google environment.

**Status:** Implemented (commit 26bfeff). Key was rotated before remediation. Historical commit contains revoked key — harmless, history scrub deferred.

---

### DEC-010: Apps Script in Version Control (May 21, 2026)

**Context:** Apps Script files existed only inside the Google Apps Script editor — no version history, no backup, no code review.

**Decision:** Commit all four .gs files to the GitHub repository under `apps-script/`. Going forward, any change to Apps Script is committed to the repo before or immediately after deployment.

**Rationale:** Version control is the minimum bar for production code that processes real student applications. Git history provides rollback capability and change attribution.

**Status:** Implemented (commit afdf380).

---

### DEC-011: Lyft Credit Modeled as Capped Offset Per Student (May 2026)

**Context:** Needed a consistent method to apply Lyft ride credits (50 credits × $150 = $7,500 total) against student travel costs in the budget model.

**Decision:** Apply Lyft credit as MIN(actual transport cost, $150). If a student's transport costs less than $150, CRF's cash outlay is $0 — but the student keeps the full credit for other uses. The unused balance does not return to CRF.

**Rationale:** The $150 is a benefit granted to the student, not a variable CRF offset. Modeling it as a capped offset (rather than a fixed reduction) is both accurate and consistent with the partner agreement intent.

**Status:** Implemented. Formula in spreadsheet: `=IF(L>0, MIN(L, 150), 0)`

---

### DEC-012: Application Analysis — Dual-Version Document Architecture (May 2026)

**Context:** The Application Analysis document serves two distinct audiences with different information needs: the board (needs full data including selection methodology and real student profiles) and donors (need cohort data but not selection scoring or identifiable student information).

**Decision:** Produce two versions from one source file in a single pipeline pass so they cannot drift apart:
- **Internal version:** Full content. Includes Section 6 (Selection Methodology and Score Distribution) and real student profiles with first names and actual destination schools.
- **External version:** Derived from the finalized internal using `derive_external()`. Section 6 stripped. Four featured students anonymized to Student A–D. Home locations generalized (county level for large counties, regional descriptor for small ones). Destinations generalized to institution type. All "INTERNAL" header markers removed.

The donor copy is never edited by hand — it is always re-derived from the internal FINAL.

**Rationale:** Single-source derivation eliminates version drift. Any manual edit to the donor copy would be overwritten on the next derivation run. One-pass production means the two versions are structurally identical except for the deliberate redactions.

**Status:** Implemented for 2026 cycle. Both FINAL documents produced May 16, 2026.

---

### DEC-013: Application Analysis — Word/Docx as Current Source Format (May 2026)

**Context:** Design and Copy agents expect Word format. Early templates used live Word chart objects, which rasterize when round-tripped through any non-Word editor.

**Decision:** Word (.docx) is the canonical source format for the Application Analysis document. Charts are baked-in PNGs at 300 DPI — not live Word chart objects — because PNGs survive round-trips intact. Fonts (Inter and Playfair Display) are embedded as .ttf files inside the docx. The planned future state — rebuilding as semantic HTML + CSS + SVG charts with PDF output via headless rendering — is explicitly deferred until the 2026 layout is fully locked.

**Rationale:** Word is what Design and Copy agents work in. PNGs are stable across editors. Embedded fonts ensure consistent rendering on any machine. The HTML port is the right long-term path but adds complexity before the layout is stable.

**Status:** Implemented for 2026 cycle. HTML port deferred (see P-011).

---

### DEC-014: IPEDS as Master School List with DormShopper Alias Layer (May 21, 2026)

**Context:** The grant application collected college name and address as free text. Students misspelled schools, used informal names, and entered wrong ZIP codes. Distance scoring — which feeds the financial need calculation — was incorrect for 18 of 42 students in the 2026 cohort, with some distances off by 10x.

**Decision:** Replace free-text college entry on the application form with a controlled typeahead picker. Master school list sourced from IPEDS (US Dept of Education) — 5,969 active institutions. Housing eligibility gate: only schools with ROOM=1 and ROOMCAP ≥ 50 are eligible (1,987 schools). Ineligible schools remain visible in the picker with an explanation — they are not hidden. Alias layer merged from two sources: the IPEDS IALIAS field and a one-time donated export from DormShopper (1,626 records). Ambiguity filter drops any alias token claimed by two or more institutions, or that exactly equals another school's official name (306 tokens dropped; schools remain in picker). Data file is self-hosted — no dependency on DormShopper infrastructure. ZIP code is now authoritative from IPEDS rather than user-typed, fixing the distance scoring corruption.

Files added to repository (commit cf2f87a, staging branch):

| File | Purpose |
|------|---------|
| `tools/build_schools/build.py` | Full build pipeline |
| `tools/build_schools/crf_schools_merged.json` | Production data file — 5,969 schools with merged aliases |
| `tools/build_schools/crf_schools_master_raw.json` | IPEDS master pre-alias-merge |
| `tools/build_schools/rename_crosswalk.json` | 15 hand-curated entries for renames/mergers not yet in IPEDS 2023 |
| `tools/build_schools/crf_excluded_institutions.txt` | 194 excluded records with reasons |
| `tools/build_schools/ambiguous_aliases_dropped.txt` | 306 dropped alias tokens with reasons |
| `.gitignore` | Updated — IPEDS raw CSVs excluded |

IPEDS raw files are gitignored but recoverable via four-line curl recipe documented in `build.py` header.

**Rationale:** Government dataset is permanent and independent. DormShopper alias layer contributes real student search behavior that IPEDS alone doesn't capture. Housing eligibility gate stops ineligible students at school selection. ZIP is now authoritative from IPEDS.

**Status:** Implemented. Merged to main May 21, 2026.

---

### DEC-015: College Picker Replaces Free-Text College Entry (May 21, 2026)

**Context:** Free-text college fields on the application form produced misspelled school names, wrong addresses, and incorrect ZIP codes. Distance scoring was wrong for 18 of 42 students in the 2026 cohort.

**Decision:** Replace all free-text college fields (name, address, city, state, ZIP) with a controlled typeahead picker backed by `crf_schools.json`. Hidden fields preserve existing Apps Script field names so Apps Script and Master sheet columns are unchanged. A new `college_id` field (IPEDS UNITID) flows through the payload as an addition. The address field is removed entirely — ZIP is now authoritative from IPEDS. Column S (college_address) will be empty for all 2027+ applications; this is intentional.

**Rationale:** Controlled selection eliminates the misspelling and wrong-ZIP problem at the source. Preserving existing field names means zero changes to Apps Script or the Master sheet column structure.

**Status:** Shipped. Merged to main May 21, 2026.

---

### DEC-016: college_id Written to Column AX via Separate setValue (May 21, 2026)

**Context:** The Master sheet has 49 columns. Appending `college_id` to the 39-column row array at position 40 would have overwritten Distance Points and corrupted scoring for every application.

**Decision:** Write `college_id` via a separate `setValue` call to column AX (position 50) after the main row write completes. The row array stays at 39 columns permanently — this structurally prevents the submission writer from ever touching the scoring block.

**Rationale:** The row array boundary is a structural protection, not just a convention. Any future field additions must follow the same pattern: append via separate `setValue` to a column beyond AW, never extend the row array.

**Status:** Implemented (commit afdf380).

---

### DEC-017: API Keys and Secrets via Script Properties, Not Source Code (May 21, 2026)

**Context:** The Google Maps API key was hardcoded inline in `Application_Main_Script.gs` for the lifetime of the Foundation's Apps Script. GitHub's secret scanner detected the key immediately on first commit.

**Decision:** All secrets sourced from `PropertiesService.getScriptProperties()`. Source code never contains credential values. The key was rotated before remediation.

**Rationale:** Secrets in source code become secrets in git history permanently. Script Properties are the correct pattern for Apps Script credentials.

**Status:** Implemented (commit 26bfeff).

---

### DEC-018: Product_Logic Architecture — Script-Driven, PL_* Tabs Deprecated (June 2026)

**Context:** Product_Logic was previously populated by a SORT/QUERY/ARRAYFORMULA in cell A2 that aggregated from PL_* intermediate tabs (PL_Bedding, PL_Pillows, PL_Towels, PL_Personal_Care, PL_Accessories). Those PL_* tabs pulled from raw source tabs via ARRAYFORMULA. The raw source tabs include an IMAGE URL column that the Product_Logic template does not. Because the SORT/QUERY formula maps columns positionally, the IMAGE URL column landed in the GENDER column of Product_Logic, shifting all subsequent data one column to the right. The resolver read image URLs as gender values and never matched any product.

**Decision:** Replace the SORT/QUERY/ARRAYFORMULA with `rebuildProductLogic()`, an Apps Script function that reads directly from raw source tabs (Bedding, Pillows, Towels, Accessories, Universal Products, Personal_Care) by header name. Extra columns in source tabs (IMAGE URL and others) are silently ignored. Product_Logic cell A2 formula deleted. PL_* intermediate tabs are deprecated and can be hidden or deleted. Product ID is derived from the Unique Lookup Key (e.g., "Sheet Set|White") for stability across rebuilds; falls back to sequential number if Unique Lookup Key is absent.

**Rationale:** Reading by header name rather than column position eliminates the fragile positional dependency. Removing the intermediate PL_* tabs removes an entire class of future data corruption risk.

**Operational rule:** `rebuildProductLogic()` must not run between student submissions and Shopping List generation. Running it mid-cycle would reassign Product IDs and break the Resolver → Shopping List join.

**Status:** Implemented and deployed. Product_Logic confirmed 174 products, zero duplicate IDs, zero URL errors. Menu location: Fulfillment Tools → Rebuild Product Logic (top of menu).

---

### DEC-019: Product ID = Unique Lookup Key (June 2026)

**Context:** Product IDs need to be stable across Product_Logic rebuilds so the Shopping List generator can reliably join resolver output to product records. Positional numbers assigned at sort time would shift if source tab row order changed.

**Decision:** Product ID is derived from the Unique Lookup Key — a stable string identifier composed of product attributes (e.g., "Sheet Set|White", "Pillow|Soft", "Slides|Navy|M|10"). Falls back to sequential number only if Unique Lookup Key is absent from the source tab.

**Rationale:** Attribute-based keys are deterministic and stable. The same product always gets the same ID regardless of row order in source tabs or rebuild timing.

**Status:** Implemented. Confirmed stable across rebuilds.

---

### DEC-020: Kit Form Section Order Resequenced (June 2026)

**Context:** The original form flow placed Shipping Information as Section 1 and Kit Customization as Section 2. This required students to enter their address before seeing their kit, which felt backwards and reduced engagement with the customization step.

**Decision:** Resequence to: Email verify → Document upload → Kit Customization (Section 1) → Shipping Information (Section 2) → Review & Submit (Section 3). Approved students (housing and acceptance docs already verified) land directly on Kit Customization, bypassing the document upload screen.

**Rationale:** Leading with the kit is more motivating and mission-aligned. Students should experience the excitement of building their kit before handling logistics. Approved students get an even faster path.

**Status:** Implemented. Live on main at award.campusready.org.

---

### DEC-021: Product Images Inline in HTML (June 2026)

**Context:** Product images need to display on the kit customization form. Two options considered: (1) inline `PRODUCT_IMAGES` object in the HTML file, (2) separate `crf_product_images.json` file fetched at runtime.

**Decision:** Images are defined inline in a `PRODUCT_IMAGES` object in the form HTML. No separate JSON file or additional fetch.

**Rationale:** Simpler, no extra network request, no fetch failure edge case. The catalog is stable enough that inline definition is maintainable. Upgrade path to a separate JSON file is straightforward when the catalog grows to a size that makes inline unwieldy.

**Status:** Implemented. All product categories covered including color-specific and scent-specific variants.

---

### DEC-022: Personalized Link Auto-Verify + Kit Form Email System (June 2026)

**Context:** The original kit form required students to type their email address to identify themselves. The July 1 email distribution presented an opportunity to pre-identify students via a unique link, eliminating friction and reducing errors from mistyped emails.

**Decision:** Two components implemented together:

**Personalized Link Auto-Verify:** Students who arrive via `?id=CR_XXXX` are automatically identified on page load. The form calls the API with the application ID, shows "Getting your kit ready…", and routes directly to the correct screen. Hero title personalizes to "Welcome, [FirstName]." If the ID is unrecognized, the form falls back to the standard email entry screen — no regression for direct URL visitors. New Apps Script function `checkStudentStatusById(applicationId)` looks up by Application ID (column A of Grant_Recipients) and returns the identical response shape as `checkStudentStatus()`.

**Kit Form Email System:** `sendKitFormEmails()` is a menu-driven bulk sender that reads all Grant_Recipients rows, builds a unique `?id=` URL per student from their Application ID using `KIT_FORM_BASE_URL`, confirms count with Eric before sending, then dispatches. `sendKitFormEmail(firstName, email, personalizedLink)` sends a styled HTML email with the personalized link in the CTA button and a plain-text fallback. `testKitFormEmail()` sends a preview to elilavois@gmail.com before the live send. `KIT_FORM_BASE_URL` constant (`https://award.campusready.org/Customize_Your_Kit.html`) — update once per year if the URL changes. Email copy inside `sendKitFormEmail()` should be updated each cohort year; the function structure and personalized link logic require no changes year to year.

**Rationale:** Personalized links eliminate the email-typing step and reduce identification errors. Bulk email with unique per-student links is the correct delivery mechanism for a 41-student cohort. The `checkStudentStatusById()` response shape mirrors `checkStudentStatus()` so `handleStudentStatus()` required no changes.

**Menu location:** Fulfillment Tools → Send Kit Form Emails (after Generate Shopping List).

**Status:** Implemented and deployed.

---

### DEC-023: Kit Confirmation Email Architecture (June 2026)

**Context:** Students needed a post-submission confirmation that shows every product in their kit — mirroring the Review screen they saw before submitting — so they can check off packages as they arrive. Design choices involved format, data source, school color sourcing, and failure handling.

**Decision:** Four architectural decisions made together:

**Format:** Static, fully expanded, visual-only checkboxes. All 7 categories always visible. Checkboxes are empty bordered squares for students to physically check as packages arrive. No JavaScript required. School color used for the header — not Campus Ready teal — sourced from `schoolRecord.primary_color_hex`, passed in the POST body as `school_color`. School nickname from `schoolRecord.nickname || schoolRecord.name`.

**Data source:** Products read from the Resolver sheet after `processLatestSubmission()` has run — not from Product_Logic or Student_Selections directly. This ensures the email shows the exact resolved SKUs that will actually ship.

**Product images:** Amazon CDN URLs already in `PRODUCT_IMAGES` in the HTML form. Brand names looked up from a static map keyed by product type + variant (e.g., `'Pillow|Medium' → 'Utopia Bedding'`). For gender-dependent products, student's `gender_preference` determines which brand to display.

**Trigger and failure handling:** Email fires automatically from `doPost()` immediately after `processLatestSubmission()` completes. Wrapped in try/catch so a failed email never blocks the form submission or returns an error to the student.

**Key implementation details (non-obvious patterns future agents must know):**
- The Resolver stores product types using two different conventions: specific product names for items with variant choices (e.g., Sheet Set, Pillow, Slides) and category-level names for commodity items (e.g., Cleaning, Desk, Laundry, Storage). A `KIT_CAT_TYPES_` lookup and `KIT_NAME_NORM_` normalization map route all types to the correct category, image, and brand lookup via a single `effectiveType` variable.
- "Move-In Essentials" is a seventh Resolver product type bucket (Power Strip, Command Strips, Trash Bin, Shower Caddy, Paper Towels, Facial Tissues). Each item is redistributed to the correct display category based on product name.
- `gender_preference` stores "Men"/"Women" (not "Male"/"Female"). `kitEmailGenderKey_()` maps both forms — `{'Male':'Men', 'Men':'Men', 'Female':'Women', 'Women':'Women'}` — to avoid falling through to the Unisex default.

**Known remaining gaps (cosmetic, not blocking):**
- Razor Refills and Toothpaste have no entries in `KIT_EMAIL_IMGS_` — render with blank placeholder.
- `school_color` and `school_nickname` are not persisted to Student_Selections — they travel through the POST body into the email only. A manual re-send would default to CRF teal. Address by adding those columns to Student_Selections if future re-send functionality is needed.

**Rationale:** Static format requires no JavaScript and survives all email clients. School color header makes the email feel personal and school-specific rather than generic. Reading from the Resolver guarantees the email reflects actual resolved products, not form data. try/catch wrapper is essential — email failures must never surface as form errors to students.

**Status:** Implemented, deployed, and confirmed working. `testKitConfirmationEmail()` available in Fulfillment Tools menu. Email sends from hello@campusready.org.

---

## Decision Number Ranges

| Range | Category |
|-------|----------|
| DEC-001 to DEC-006 | Pre-existing system decisions (documented retroactively) |
| DEC-007 to DEC-023 | Decisions made May–June 2026 |

**Next available decision number: DEC-024**

---

## Infrastructure Decisions — June 14, 2026

### DEC-024: Project Files Migrated to GitHub Repo (June 14, 2026)

**Context:** Project files (handoffs, decision log, current status, reference docs) lived locally and in claude.ai project uploads — not version-controlled, prone to loss if local disk failed or project was reset.

**Decision:** All `Campus_Ready_Project_Files/` now live in the `ericlilavois/Campus_Ready_GitHub` repo. Claude Code Stop hook (doc-router) auto-updates docs after each session. claude.ai project connected to GitHub so agents read files directly from the repo.

**Rationale:** Version control protects against data loss. GitHub integration means agents always have current project context without manual uploads.

**Status:** Implemented.

---

### DEC-025: Apps Script Deployment via clasp (June 14, 2026)

**Context:** Changes to Application_Main_Script, Application_Admin_Script, Board_Score_Import, and Weekly_Email_Report required manual copy-paste into the Google Apps Script editor — slow and error-prone.

**Decision:** Installed clasp (v3.3.0). Application and Grant Fulfillment scripts now live in `apps-script/application/` and `apps-script/grant-fulfillment/` in the `Campus_Ready_GitHub` repo. Deploy with `push-scripts app` or `push-scripts gf` from Terminal. Both require the Campus Ready Foundation Google account (`~/.clasprc-crf.json`).

**Rationale:** Eliminates copy-paste deployment. Scripts are version-controlled. Any Claude Code session can push directly to live Apps Script projects.

**Status:** Implemented.

---

### DEC-026: Branch Strategy Clarified (June 14, 2026)

**Context:** Ambiguity about what work goes to staging vs main for the Campus Ready repo.

**Decision:** The Campus Ready repo uses a single `main` branch for all work — project files, docs, Apps Script, and HTML. There is no staging branch. (Staging branches exist only in DormShopper and Grant Fulfillment repos, and only for their respective HTML form files.)

**Rationale:** Campus Ready doesn't have a live consumer web app. The application form and grant fulfillment form are not served from this repo. All changes can go directly to main.

**Status:** Active going forward.

---

## Decision Number Ranges

| Range | Category |
|-------|----------|
| DEC-001 to DEC-006 | Pre-existing system decisions (documented retroactively) |
| DEC-007 to DEC-023 | Decisions made May–June 2026 |
| DEC-024 to DEC-026 | Infrastructure overhaul — June 14, 2026 |

**Next available decision number: DEC-027**
