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
| DEC-027 to DEC-046 | Grant Fulfillment operations — July 2026 |

**Next available decision number: DEC-047**

---

## Grant Fulfillment Operations — July 2026

*These decisions were previously in the Grant Fulfillment repo DECISION_LOG. Consolidated here July 13, 2026.*

### DEC-027: Ramp Guest User Model for Student Virtual Cards (July 10, 2026)
**System:** FULFILLMENT
**Status:** ⏳ In Progress — Stage 1 complete, Stages 2–4 not started

**Context:** Ramp's card issuance model is built around employees. Grant recipients are external, non-employee individuals. Ramp support confirmed the correct model on July 10, 2026.

**Decision:** Students are added as Guest Users (available on Ramp Plus), not employees. All current guest users are assigned to a "Student" department under a single shared manager. Card issuance runs in four distinct stages, each requiring a separate admin action:

1. **Draft user created** — student exists in Ramp, cannot log in, no email sent.
2. **Invite published** — admin publishes from People > Invites; triggers invitation email.
3. **Student accepts** — student sets up their own Ramp account.
4. **Admin issues virtual card** — only after acceptance, by explicit admin action. Guest users cannot request their own cards or funds, and cannot receive physical cards — virtual only.

**Current Roster (14 draft guest users, as of July 10, 2026):**

| # | Name | Purpose | Minor? |
|---|------|---------|--------|
| 1 | Elizabeth Carmichael | Flight | |
| 2 | Gabrielle Pina | Flight | Yes |
| 3 | Jimena Reynaga-Castro | Flight | |
| 4 | Lilian Barrientos Aceituno | Flight | |
| 5 | Nicholas Avery Joy | Flight | |
| 6 | Amara Boerner | Flight → **needs gas/hotel correction (DEC-043)** | Yes |
| 7 | Arianna Deibert | Flight → **needs gas/hotel correction (DEC-041)** | Yes |
| 8 | Michelle Villafana | Flight | |
| 9 | Osvaldo Ramirez Hernandez | Flight | Yes |
| 10 | Henry Ray | Flight | |
| 11 | Journey Penterman | Flight | |
| 12 | Melanie Avila | Flight → **needs gas/hotel correction (DEC-043)** | |
| 13 | Reese Oo | Flight | |
| 14 | Anastasia Guerrier | Gas card (driving) — correct, no change needed | |

**Not yet in Ramp:** Marisol Navarro — confirmed eligible. Travel mode TBD. Do not add until confirmed.

**Open Items:** Flight cost ceilings ($200 cross-country / $135 short-haul) from pro forma — not confirmed as live quotes.

**Status:** Stage 1 complete. No invitations sent. No cards issued.

**Correction (July 13, 2026):** Minor status is not a blocker. Ramp does not restrict guest user invitation, acceptance, or virtual card issuance based on age — Gabrielle Pina, Amara Boerner, Arianna Deibert, and Osvaldo Ramirez Hernandez proceed through the exact same four-stage process as any other student. The July 10 entry above framed this as unresolved — that was incorrect, corrected per Eric.

---

### DEC-028: Six-Audience Segmentation for 2026 Cohort Comms (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active framework — use for all cohort communications

**Decision:** All communications must be segmented across six distinct groups:
1. Attending, no travel involvement — event info only
2. Attending, travel-involved — event info + travel confirmation
3. Non-attending, no travel — full orientation content replacement + program info
4. Non-attending, travel-involved — full orientation replacement + travel confirmation
5. Minors attending without an on-site guardian — no outreach until guardian/release mechanism resolved
6. Never RSVP'd — handle separately before segmenting further

**Rationale:** Sending one message to all recipients either overloads students who need less or shortchanges those who need more.

**Important:** Re-verify RSVP data against Travel Detail before every send (see DEC-032).

---

### DEC-029: Travel-Confirmation Message Template (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Approved — use for all individual travel outreach

**Decision:** State the plan as a fact, ask a contained yes/no question. Correct framing: "We have you flying from [airport] on [date]... Does that still work, or has something changed?" Do not ask open-ended questions about dates, companions, or preferences. The Cole (Nicholas Avery Joy) reply is the canonical reference.

---

### DEC-030: Codes Sent by Text Only — Never Email (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active rule

**Decision:** Any redeemable code (Ramp card codes, gift card codes, etc.) goes to students by text only. Never by email. A redeemable code in an email inbox is a real security exposure.

---

### DEC-031: Companion Policy — Uniform Terms (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — apply uniformly regardless of when need surfaces

**Decision:** One parent or guardian may accompany a student. One hotel night covered at the standard rate for that student's distance tier. Applies whether the need was stated on the application, raised in a text reply, or mentioned in an unprompted email.

---

### DEC-032: Travel Detail as Authoritative Data Source (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active rule

**Decision:** Travel Detail sheet (not Grant_Recipients) is the authoritative source for travel mode, route, and companion status. Treat it as a starting assumption to confirm — not a fact to build on without verification. Three data errors in the July 10 session (Osvaldo's Travel Helper, Yadira's RSVP, Cole's stale plan) proved unverified data propagates to real students.

---

### DEC-033: Kit Email Sent Flag Added to Grant_Recipients (July 10, 2026)
**System:** FULFILLMENT
**Status:** ✅ Implemented

**Decision:** Add `Kit Email Sent` (col Z) and `Kit Email Sent At` (col AA) columns to Grant_Recipients. `sendKitFormEmails()` skips rows where Kit Email Sent = Yes. Resend path: `resendKitFormEmailToOne(targetEmail)` bypasses the flag intentionally. All 2026 cohort rows backfilled to Yes after initial send confirmed complete.

---

### DEC-034: Non-Attendee Email — No-Travel Segment (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Built and sent July 11

**Decision:** Standalone `Email_NonAttendee_No_Travel.gs` for students not attending and with no flight or drive travel support (Lyft credit only). Two cards: teal (Lyft $150 + DoorDash $100), yellow (Target $100, conditional on docs). Scripts read docs status directly from Grant_Recipients — no hardcoded flags. Sent July 11 to Cristian Fonseca Nunez, Diego Perez Herrera, Fernanda Contreras Alcaraz. Alice Baxter and Xadani Ramirez Herrera skipped — docs pending.

---

### DEC-035: RSVP Data Hierarchy — Latest Timestamp Wins (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active rule

**Decision:** When RSVP CSV contains duplicate entries for the same student, the most recent timestamp wins — but verify directly with the student before acting when the change affects what they receive. Arianna Deibert's July 10 attending entry superseded her June 26 not-attending entry; confirmed attending July 11.

---

### DEC-036: Orientation_Reminder.gs Naming Conflicts Resolved (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Resolved

**Decision:** All function names in `Orientation_Reminder.gs` renamed to avoid conflict with `Email_Orientation.gs` (`testOrientationReminderEmail`, `sendOrientationReminderEmails`, `buildReminderEmailHtml`). File moved into clasp-managed folder. Menu.gs fixed.

**Rule:** All Apps Script files must live in the clasp-managed folder. Never copy-paste directly into the Apps Script editor outside of clasp.

---

### DEC-037: Non-Attendee Emails Gated on Docs Approval (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Implemented

**Decision:** Both non-attendee scripts read Housing Status and Acceptance Status directly from Grant_Recipients at send time. A student is eligible only if both fields equal Approved. Students with Pending or Uploaded status are skipped automatically. Re-running the script after approval reaches skipped students without code changes.

---

### DEC-038: Non-Attendee Email Sent Tracking Column (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Implemented

**Decision:** Both non-attendee scripts auto-create a `Non-Attendee Email Sent` column in Grant_Recipients on first run. Writes Yes after successful send. Subsequent runs skip students marked Yes. Mirrors Kit Email Sent pattern (DEC-033).

---

### DEC-039: File Renamed — Email_NonAttendee_Lyft → Email_NonAttendee_No_Travel (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Implemented

**Decision:** Renamed file and all internal functions from Lyft to NoTravel. "Lyft" described one component, not the audience. "No Travel" matches the audience descriptor and aligns naming with `Email_NonAttendee_Travel.gs`.

---

### DEC-040: Arianna Deibert — Confirmed Attending, Travel Text Sent (July 11, 2026)
**System:** FULFILLMENT
**Status:** ✅ Resolved

**Decision:** Arianna's July 10 RSVP (attending) superseded her June 26 entry (not_attending) per DEC-035. Removed from non-attendee travel email roster. Travel confirmation text sent July 11 covering her SFO → SAN flight to San Diego State. Stale June 26 RSVP row to be deleted from RSVP_Responses.

---

### DEC-041: Arianna Deibert — Ramp Spend Program Corrected from Flight to Gas/Hotel (July 12, 2026)
**System:** FULFILLMENT
**Status:** ⏳ Decision recorded — execution in Ramp pending

**Decision:** Arianna Deibert is confirmed driving to San Diego State, not flying. Her Ramp guest user must be moved from the flight-restricted Spend Program to the gas/hotel Spend Program. Eric must execute this in Ramp directly.

---

### DEC-042: Travel Cost Policy — Gas Coverage, Lyft Scope, Companion Ground Fee (July 12, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — apply uniformly

**Decisions:**
1. **Gas/mileage coverage** applies only to students driving in lieu of flying (long-distance relocation). Students offered a Lyft credit who opt to drive locally instead are not entitled to gas coverage.
2. **Lyft credit ($150/student)** is general-purpose — rides to campus, airport, or around town after arrival. Not scoped to the move-in trip. The $7,500 total across 50 codes is fully explained; no further reconciliation needed.
3. **Companion Ground fee ($50)** applies only to companions of flight-mode students (ground transport at destination). Companions of driving students cost $0 in this line item unless the companion flies back separately.

---

### DEC-043: Ramp Spend Program Corrections — Amara Boerner and Melanie Avila (July 12, 2026)
**System:** FULFILLMENT
**Status:** ⏳ Decision recorded — execution in Ramp pending

**Decision:** Amara Boerner and Melanie Avila are confirmed driving students created under the flight-restricted Spend Program in error. Both must be moved to the gas/hotel Spend Program. Consistent rule: any student confirmed driving comes off the flight-restricted program. Eric must execute in Ramp.

---

### DEC-044: Anastasia Guerrier — Legacy Override Status (Permanent) (July 12, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — do not move to formula

**Decision:** Anastasia is driving to campus; her mother is flying home one-way after drop-off (MSP → MIA). This arrangement is not representable by standard Travel Detail formula logic. Her row stays permanently on Legacy Override — manually entered and maintained. This is the intended state, not a gap.

---

### DEC-045: Roster Changes — Daysee Removed, Valeria Added (July 12, 2026)
**System:** FULFILLMENT
**Status:** ✅ Confirmed

**Daysee Jossabeth Queme Mazariegos:** Confirmed ineligible — no longer on-campus. Removed from Travel Detail.
**Valeria Alexa Hernandez Correa:** Confirmed eligible, added to roster. Was missing from Travel Detail despite being in Grant_Recipients. Offered Lyft credit.

---

### DEC-046: 2026 Pro Forma Frozen; 2027 Pro Forma Architecture Decided (July 12, 2026)
**System:** FULFILLMENT
**Status:** ✅ Frozen (2026) / ⏳ Deferred until after July 15 (2027 architecture)

**2026 Pro Forma:** Stays frozen at board-approved figures. No formula link to Travel Detail. An approved budget does not move after approval.

**2027 Pro Forma architecture:**
1. **Budget vs. Actual tab** (build post–July 15): One side is the frozen 2026 board-approved total (static). The other is a live SUMIF from Travel Detail. The variance is the point — neither side writes back into the other.
2. **2027 Pro Forma seed** (build after 2026 travel is finalized): AVERAGEIF by transport mode pulls 2026's realized average cost per student into a 2027 Assumptions tab. That average × 2027's projected headcount generates the 2027 Pro Forma.
3. **Partner/rate assumptions** (Lyft rate, credit cap, hotel table) live in a per-year Assumptions tab, referenced by formula. A future partner swap touches a few cells in Assumptions, not a rebuild.

---

## Pre-existing Grant Fulfillment Decisions — November 2025

*These decisions predate the DEC-XXX numbering system. Documented in the original Grant Fulfillment decision log under a different numbering scheme. Included here as historical record.*

**Decision 1: Email Validation Over Token-Based Access (Nov 13, 2025)** — Email validation against approved recipient list. Simpler, better UX, scalable. Partially superseded by DEC-022 (Personalized Link Auto-Verify), which added token-based ?id= links for the kit form send.

**Decision 2: Submission Lock Policy (Nov 13, 2025)** — Submissions lock permanently after final submit. No edits through form. Students email hello@campusready.co for changes. Still active.

**Decision 5: Warm Error Messages (Nov 13, 2025)** — Error messages are collaborative, not corrective. Examples in original log. Still active.

**Decision 6: Winner Transfer Workflow (Nov 14, 2025)** — "Transfer Winners" button in Application_Reviews populates Grant_Recipients. Board action is the explicit gate. Still active.

**Decision 7: Grant_Recipients Tab Structure (Nov 14–16, 2025)** — Column structure: Application ID, Student Name, Email, Cohort Year, Transfer Date, Housing Status, Housing Doc URL, Acceptance Status, Acceptance Doc URL, Items Selected, Submission Timestamp. Additional columns added since (Kit Email Sent col Z/AA via DEC-033; Non-Attendee Email Sent via DEC-038).

**Decision 8: Multi-Layer Email Validation (Nov 14, 2025)** — Format validation, typo detection, backend validation, submission re-validation. Rate limiting (5 attempts/hour/IP). Still active.

**Decision 9: No Disposable Email Blocking (Nov 14, 2025)** — Do not block any email domains. Small cohort; board-vetted recipients. Still active.

**Decision 10: No DNS/MX Validation (Nov 14, 2025)** — Typo detection is sufficient. Still active.

**Decision 11a: Housing Verification as Fulfillment Gate (Nov 14, 2025)** — Housing verification is a grant fulfillment requirement, not an application selection requirement. Board sees all scored applicants regardless of housing status. Still active.

**Decision 11b: Rate Limiting Parameters (Nov 14, 2025)** — 5 email validation attempts per hour per IP. Status: ⏳ Approved, not yet implemented.

**Decision 12: Document Upload Before Kit Selection (Nov 14, 2025)** — Upload documents before item selection (no point customizing kit if student can't receive it). Form flow: Email Validation → Document Upload → [Admin Review] → Kit Selection → Final Submit. Note: DEC-020 resequenced to Kit Customization first within the post-upload steps, but document upload still precedes kit selection.

**Decision 13: Manual Admin Review Required (Nov 14, 2025)** — Admin/Board must approve documents before item selection unlocks. Status: ⏳ Approved, implementation complete. Dropdown: Pending → Uploaded → Approved/Rejected.

**Decision 14: Document Storage in Google Drive (Nov 14, 2025)** — Folder: "Housing_Verification_&_College_Acceptance_PDFs," ID `1ccJ8lg40PTgMFIXdNoXyHU12ySgSnurf`. Naming: `{ApplicationID}_{DocType}.pdf`. Still active.

**Decision 15a: Warm Document Rejection Messaging (Nov 14, 2025)** — Frame as "we need a bit more information," not "rejected." Status: ⏳ Approved, implementation complete via `sendRejectionEmails()`.

**Decision 15b: readonly Instead of disabled for Auto-Populated Fields (Nov 17, 2025)** — Readonly fields are included in FormData; disabled fields are not. Still active.

**Decision 16a: Shopping List Generation Filter (Nov 14, 2025)** — Filter: data_type=Live AND cohort_year=current AND shopping_list_generated=FALSE AND housing_status=Approved AND acceptance_status=Approved. Still active.

**Decision 16b: Separate Vercel Proxies (Nov 16, 2025)** — Application Proxy and Grant Fulfillment Proxy are independent deployments. Still active.

**Decision 17: Apps Script Parameter Validation (Nov 16, 2025)** — Comprehensive validation in uploadDocuments(). Still active.

**Decision 18: Manual Button Advancement After Document Upload (Nov 17, 2025)** — Replace auto-advance setTimeout with manual "Continue" button. Gives students control over pacing. Still active.
