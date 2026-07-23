# Decision Log — Campus Ready Foundation

**Active decisions:** DEC-001 through DEC-067
**Last updated:** July 23, 2026

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
| DEC-047 to DEC-054 | Travel Detail + Ramp card rules — July 14, 2026 |
| DEC-055 to DEC-059 | Ramp finalization — July 14, 2026 |
| DEC-060 to DEC-062 | Retailer strategy + Amazon bulk-order mechanics + formula rebuild — July 20, 2026 |

**Next available decision number: DEC-063**

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

### DEC-047: Companion Return Gas Column Added to Travel Detail (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Implemented — one manual correction pending

**Context:** Travel Detail only captured one-way gas for driving students. Companion return trips (parent driving home after drop-off) had no column and were tracked only in notes.

**Decision:** Add a "Companion Return Gas" formula column (inserted after Companion Ground, before Hotel). Formula: `=IF(AND([Driving?]="Yes",[Companion Traveling?]="Yes"), ROUNDUP([Miles]*gas_rate/25,0)*25, 0)`. Feeds into Total Travel Cost and flows through to CRF Cash Outlay (Lyft Credit formula already returns $0 for driving students, so no separate offset needed).

**Known exception:** Anastasia Guerrier's companion is flying back (MN→FL), not driving. The formula fires for her because she is driving AND has a companion — but there is no return drive. Her Companion Return Gas cell must be manually set to 0 with a note. The Travel Detail has no mechanism to distinguish "companion driving back" from "companion flying back." If this pattern recurs at scale (125+ students), add a "[Input] Companion Driving Back? (Y/N)" column to avoid the manual override.

**Rationale:** Companion return gas is CRF outlay regardless of payment mechanism (Ramp card or separate Visa gift card). The Travel Detail is the source of truth for all CRF travel spend and should capture it.

---

### DEC-048: Companion Return Gas — Payment Mechanisms by Return Distance (July 14, 2026)
**System:** FULFILLMENT
**Status:** ⚠️ Superseded by DEC-052 — physical card replaces all Visa gift card tiers

**Context:** Ramp virtual card lives on the student's phone. After drop-off, the parent can no longer access it. For long return drives, the parent needs independent access to gas funds.

**Decision:** Tier the solution by return distance:

| Student | Return miles | Mechanism | Notes |
|---------|-------------|-----------|-------|
| Amara Boerner | 531 mi | Separate Visa gift card ~$125, mailed to student | Parent needs card after drop-off — 2+ fill-ups |
| Henry Ray | 483 mi | Separate Visa gift card ~$100, mailed to student | Parent needs card after drop-off — 2+ fill-ups |
| Melanie Avila | 272 mi | Ramp virtual card — parent fills up at departure | Single fill-up; student present at pump |
| Licendi Clavel Lopez | 220 mi | Ramp virtual card — parent fills up at departure | Single fill-up; student present at pump |
| Daniel Sanchez | 133 mi | Covered within $100 Ramp card floor | Short trip; no separate action needed |
| Sara Roberts | 42 mi | Covered within $100 Ramp card floor | Short trip; no separate action needed |
| Wlises Ramirez Santos | 89 mi | Covered within $100 Ramp card floor | Short trip; no separate action needed |

**Action required:** Source two physical Visa gift cards ($100–$125 each) for Henry Ray and Amara Boerner's parents. Order and mail to student **at least 2 weeks before move-in** — the student hands the card to the parent at drop-off. Do not wait until move-in week.

**Rationale:** Visa gift card requires no signup, no phone, and can be handed to the parent at drop-off. For parents who are not tech-savvy or don't have a smartphone, this is more reliable than sharing a virtual card number.

**Note for 2027:** Consider issuing Ramp physical cards to parents of long-distance drivers. Parents would need to complete a simple Guest signup (email required), but Ramp ships a physical card to any address. Lead time: 5–7 business days standard; plan accordingly. Either way, the card or card number must be in the parent's hands at the moment of drop-off — not mailed after.

---

### DEC-049: Ramp Card Amount Rounding Rule and $100 Floor (July 14, 2026)
**System:** FULFILLMENT
**Status:** ⚠️ Partially superseded by DEC-055 — $100 floor removed; formula and rounding are correct

**Context:** Needed a consistent, defensible method for setting Ramp card spending limits across 37 students with varying travel costs.

**Decision:** Card amount = `ROUND(CRF Cash Outlay × 1.15 / 25, 0) × 25`, with a floor of $100.
1. Multiply CRF Cash Outlay by 1.15 (15% contingency buffer)
2. Round to the nearest $25
3. Apply $100 minimum floor

**Examples:**
- Outlay $25 → $28.75 → nearest $25 = $25 → floor applied → **$100**
- Outlay $50 → $57.50 → nearest $25 = $50 → floor applied → **$100**
- Outlay $125 → $143.75 → nearest $25 = $150 → **$150**
- Outlay $350 → $402.50 → nearest $25 = $400 → **$400**

**Rationale:** The 15% buffer provides headroom for price variation at the pump or in hotel rates. Rounding to $25 keeps amounts clean — grant recipients see these numbers. The $100 floor ensures no student receives a trivially small card; it signals CRF is not nickeling and diming them.

**Note:** The Travel Detail gas column uses `ROUNDUP` (always rounds up to the nearest $25), while the Ramp card amount formula uses standard nearest-$25 rounding applied to a contingency-buffered outlay. These are different calculations with different purposes — do not conflate them. See DEC-051.

---

### DEC-050: Ramp Spend Program Must Be Set at Point of Creation (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active rule

**Context:** In 2026, Arianna Deibert, Amara Boerner, Melanie Avila, and Henry Ray were created in Ramp under the flight-restricted Spend Program and later confirmed as driving. Each required a separate manual correction in the Ramp platform before cards could be issued.

**Decision:** Do not add a student to the Ramp working file until their transport mode is confirmed. Assign Spend Program at creation based on confirmed mode:
- Driving → **"Student Gas & Hotel"**
- Flying → **"Student Travel Expenses"**
- Lyft/local → **"Student Travel Expenses"**

If transport mode changes after a student is already in Ramp, update the Spend Program in the Ramp platform immediately — do not leave it stale and plan to fix later.

**Rationale:** The Ramp platform does not support bulk Spend Program reassignment — each correction is a separate admin action. Four corrections in 2026 were caught before cards issued, but only by accident of timing. Setting programs correctly at creation costs nothing; correcting after the fact burns admin time and creates risk of issuing a card under the wrong program.

**What "Pending" rows in the working file mean:** In 2026, some students were pre-loaded as Pending (transport unconfirmed) to reduce future data entry. These rows should default to "Student Gas & Hotel" as a placeholder only — update to the correct program before the invite goes out. Never issue a card on a Pending row.

---

### DEC-052: All Students Switched to Employee Role with Physical Ramp Cards (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — implemented in Ramp Working File v3

**Context:** Ramp virtual cards (Guest role) are online-only and are declined at all physical POS terminals, including gas pumps and hotel front desks. Students cannot hand a virtual card to a parent after drop-off. The two-program approach (DEC-050) was also producing wrong-program corrections.

**Decision:** Switch all students from Guest to Employee role. Enable physical card issuance for all. Use a single Spend Program ("Student Travel Expenses") for all students; apply card-level category restrictions per student if needed. Wipe the 14 students previously imported to Ramp as Guests and re-import the full 36-student roster (Lilian excluded — reimbursed by check) as Employees with physical cards enabled and `is_draft=TRUE`.

**Impact on companion return gas:** Physical card replaces the Visa gift card mechanism for all students. Parent takes the student's physical Ramp card at drop-off and fills up for the return drive. No separate Visa gift cards needed for Henry Ray or Amara Boerner. DEC-048 Visa gift card tier is superseded.

**Impact on hotel check-in:** Physical card works at hotel front desk for incidental holds. No reimbursement workflow needed for hotel students.

**Role visibility:** The Employee role label is not displayed to students in Ramp — they see only their card and spending limits. No optics issue.

**Note for 2027:** Assign Employee role and physical card as default for all grant recipients from initial import. Do not use Guest role for students who have any in-person spending need.

---

### DEC-053: Lyft Credit Cap — $150 Per Student; Student Pays Any Excess (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — Assumptions tab row already exists; update wording as noted below

**Context:** DEC-042 established the Lyft credit as $150/student. The cap behavior — what happens when a Lyft estimate exceeds $150 — needed explicit documentation.

**Decision:** $150 is a hard ceiling on CRF's Lyft contribution. CRF provides a Lyft code worth $150. If the actual ride costs more, the student pays the difference out of pocket. CRF does not cover the excess — not via Ramp card, not by any other mechanism.

**Formula logic in Travel Detail:**
- `Lyft Credit = MIN(Lyft estimate, $150)`
- `CRF Cash Outlay excludes all Lyft` — the Lyft code is a separate budget item, not a Ramp card charge. The Ramp card covers flight, companion transport, companion ground, hotel, and gas only.

**Implication for the Ramp working file:** Airport Lyft estimates should NOT appear in a student's CRF Cash Outlay or card amount. Lyft is handled entirely by the code. Any amount above $150 is the student's cost.

**Example:** Jimena Reynaga-Castro — airport Lyft estimated at $168. CRF provides $150 code. Student pays $18 excess. Her Ramp card outlay = $200 (flight) + $400 (companion) + $50 (companion ground) + $400 (hotel) = $1,050. Card = $1,200.

**Assumptions tab:** The Lyft Credit Cap row already exists. Update the Notes column to add: *"Hard cap — student covers any amount above $150. CRF does not reimburse excess via Ramp card or any other mechanism."*

**Rationale:** The $150 Lyft code is a defined grant benefit, not an open-ended reimbursement. Documenting the ceiling prevents future builders from treating all Lyft as fully covered.

---

### DEC-054: Lyft Is Not a Primary Transport Mode — Driving or Flying Only (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active

**Context:** Several 2026 students were listed in the Travel Detail as "Lyft" transport mode, implying Lyft would get them from home to campus. DEC-042 described the Lyft credit as "general-purpose — rides to campus, airport, or around town after arrival," which was ambiguous about whether Lyft is a valid primary mode.

**Decision:** Lyft is not a primary transport mode. All students travel to campus by Driving or Flying. The $150 Lyft credit (DEC-042, DEC-053) exists for two purposes only:
1. Airport transfers — getting to and from the departure/arrival airport
2. Local use around campus after arrival (errands, orientation, around town)

Any student currently listed as "Lyft" in the Transport Mode column is pending confirmation of their actual mode (Driving or Flying). These rows should be updated once transport is confirmed; the Ramp card should be set up for their actual mode, not for Lyft.

**Exception:** If a student has no viable driving or flying option and Lyft is genuinely their only way to reach campus, CRF would cover Lyft cost above the $150 credit. No 2026 student is in this situation.

**Impact on Ramp working file:**
- Marisol Navarro: Transport Mode was "Lyft, $88 outlay" (Lyft $238 − $150 credit). Under this decision, the $88 outlay is removed. Her Ramp outlay = $0 (card = $100 floor) until she confirms driving or flying.
- Jimena Reynaga-Castro: Airport Lyft ($168) was included in CRF Cash Outlay per prior (incorrect) calculation. Under DEC-053 + this decision, airport Lyft is not a Ramp card expense. Her Ramp outlay corrects to $1,050 (card = $1,200).
- Cristian Fonseca Nunez, Luna Juarez Alvarez, Sofia Alvarez: Previously noted as "Lyft covered by code." Reframed as pending driving/flying confirmation. Outlay stays $0; card stays $100 floor.

**Impact on Travel Detail:** The formula for CRF Cash Outlay must exclude airport Lyft entirely (handled by code, not Ramp card). Jimena's Travel Detail row currently shows $1,068 — should be $1,050.

---

### DEC-051: Travel Detail Gas Formula vs. Ramp Working File — Source of Truth (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active rule

**Context:** During the July 14 session, Melanie Avila's Ramp working file showed a $329 CRF Cash Outlay while the Travel Detail showed $350 for the same student. Root cause: the Ramp file used raw miles × $0.20 for companion return gas ($54.40), while the Travel Detail formula uses `ROUNDUP(miles × 0.20 / 25, 0) × 25` which rounded to $75. The $21 difference cascaded into a $25 card amount discrepancy ($375 vs. $400).

**Decision:** Travel Detail is the source of truth for all outlay figures. When building or updating the Ramp working file, pull CRF Cash Outlay totals from the Travel Detail — do not recalculate from raw mileage. If the two files show different totals for the same student, the Travel Detail wins; update the Ramp file to match.

**Gas formula in Travel Detail:** `ROUNDUP(Miles × $0.20 / 25, 0) × 25` — always rounds up to the nearest $25. This is intentional: estimate high rather than leave a student short at the pump.

**Card amount formula in Ramp working file:** `ROUND(Outlay × 1.15 / 25, 0) × 25`, no floor (DEC-055). This is applied to the Travel Detail outlay total, not recalculated from raw miles. See DEC-049.

---

### DEC-055: Ramp Card Amount — No Minimum Floor (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — supersedes $100 floor in DEC-049

**Context:** A previous agent added a $100 minimum card amount without explicit authorization. This resulted in ~19 students receiving inflated card amounts.

**Decision:** No minimum floor on Ramp card amounts. The formula is: `ROUND(CRF Cash Outlay × 1.15 / 25, 0) × 25`. A student with $25 outlay gets a $25 card.

**Rationale:** A minimum floor gives money away unnecessarily. The 15% contingency is sufficient buffer. Students with small outlays (short-distance driving) don't need extra padding.

---

### DEC-056: Ramp Allowed Categories — Gas, Airlines, Hotels Only (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Active — configured in Student Travel Expenses spend program

**Decision:** Three categories allowed on all student Ramp cards: Gas and fuel stations, Airlines, Hotels and lodging. All other categories blocked, including rideshare and restaurants. Lyft is covered by separate $150 credit codes. DoorDash is covered by separate Community Credits.

---

### DEC-057: Lilian Barrientos Aceituno — Excluded from Ramp (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Resolved

**Decision:** Lilian is excluded from Ramp and was deleted from the platform on July 14. Her flight (SFO → ORD, $284.20) was already purchased and is being reimbursed by check. She has no remaining travel expenses requiring a card.

---

### DEC-058: Lizbeth Perez Solano — Deemed Ineligible (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Resolved

**Decision:** Lizbeth is deemed ineligible as of July 14, 2026. No contact was made after a July 9 follow-up nudge went unanswered. She is enrolled at Napa Valley College (on campus, no travel required). Deleted from Ramp. Email on file: lizbethperezsolano369@gmail.com.

---

### DEC-059: Ramp Invitations Sent — 33 Students, July 14, 2026 (July 14, 2026)
**System:** FULFILLMENT
**Status:** ✅ Complete

**Decision:** 33 students were invited to Ramp on July 14, 2026 via bulk email from the Student Travel Expenses spend program. Bulk issuance CSV used (Ramp's 5-column template: email, spend_limit_amount, spend_limit_currency, spend_limit_frequency, should_request_cardholder_mailing_address). Individual card limits set per student (range: $25–$1,200). `spend_limit_frequency = TOTAL`. `should_request_cardholder_mailing_address = TRUE` — students provide their **home address** (not dorm) so cards ship before departure. Deactivation date: October 15, 2026.

**Not invited:** Sofia Alvarez (transport unconfirmed, $25 card ready when confirmed); Lilian (DEC-057); Lizbeth (DEC-058).

**Student text sent July 14:** Advised students to check inbox for Ramp invite, accept, and enter home address for card shipping.

---

### DEC-060: All Choice-Item Products Now Sourced from Amazon — Target/Walmart No Longer Primary (Confirmed July 20, 2026)

**System:** FULFILLMENT
**Status:** ✅ Reflects current state of live product data — retroactively documented

**Context:** The Ops Manual (v3, Jan 2026) and this log's prior guidance had Target as primary retailer for choice items (Bedding, Pillows, Towels, Personal Care, Accessories), with Walmart as backup, and Amazon reserved for Universal Products plus a single named exception (Bedsure Twin XL duvet covers). Live product research tabs, reviewed July 20, 2026, show every choice-item tab already carrying `PRIMARY RETAILER = Amazon` for all researched rows:

| Tab | Rows | Primary Retailer |
|-----|------|-------------------|
| Bedding | 13 | Amazon |
| Pillows | 3 | Amazon |
| Towels | 6 | Amazon |
| Accessories | 51 | Amazon |
| Personal_Care | 74 | Amazon |
| Universal Products | 28 | Amazon |

Walmart survives only as a backup retailer on two Personal_Care rows (Toothbrush, Toothpaste) — not as a primary sourcing path anywhere. No decision was ever logged when this changed. Exact date/rationale unconfirmed.

**Decision:** Amazon is the primary retailer for all product categories — choice items and universal items alike. Target and Walmart are no longer part of the default sourcing path for any category. This decision formalizes what the live data already reflects.

**Rationale:** Documenting current reality so future sessions stop giving guidance from the stale Target/Walmart model in the Ops Manual.

**Downstream impact:**
- Ops Manual v3, Section 6 (Retailer Strategy) is stale and needs revision (see v4 of the manual).
- `rebuildProductLogic()` reads `PRIMARY RETAILER` directly from research tabs by header name — no code change needed, Product_Logic already reflects Amazon once rebuilt.
- DormShopper's `checkout.js` (separate consumer platform, separate repo) is unaffected — that code is not part of CRF Grant Fulfillment operations.

---

### DEC-061: Amazon Business "Ship to Multiple Addresses" — Real Constraint Is 50 Total Items Per Order, Not 20 Addresses (July 20, 2026)

**System:** FULFILLMENT
**Status:** ✅ Confirmed against Amazon's published documentation — apply to all Universal Bulk Order execution

**Context:** Eric raised a concern that the Universal Bulk Order tab's flat "20" student count (see DEC-060 context and the corrected file referenced below) might reflect a real Amazon-imposed cap rather than a stale planning assumption. Checked against Amazon's official Ship to Multiple Addresses documentation.

**Confirmed mechanics:**
1. A Shared Address group used for multi-address shipping must contain **50 or fewer addresses**.
2. The feature caps at **a total quantity of 50 items per checkout** — e.g., 1 item to 50 addresses, 2 items to 25 addresses, and so on. If item quantity × address count exceeds 50, the order must be split into multiple batches.
3. This is unrelated to per-listing "max order quantity" limits, which are set independently by each seller and vary by SKU — worth spot-checking at checkout regardless, but not the source of the "20" figure in the stale Universal Bulk Order tab.

**Decision:** For the 2026 cohort (35 approved recipients):
- **27 of 28 universal items** ship at qty 1/student → 35 total units needed, under the 50-item cap. One multi-address order each.
- **Pillow Protectors** ship at qty 2/student → 70 total units needed, **over the 50-item cap**. Must be split into two batches (e.g., 25 addresses × 2 = 50, then remaining 10 addresses × 2 = 20).
- **Feminine Hygiene** ships to the Women-preference subset only (25 confirmed as of July 20, pending 1 outstanding submission) → well under the 50-item cap regardless.
- **Real total order count for universal items: 29** (26 single-item-type orders at qty 1, 1 order for Feminine Hygiene, 2 orders for Pillow Protectors) — not 28, not 20.

**Rationale:** Documenting the actual platform constraint prevents future sessions from either under-planning (assuming no cap exists) or over-correcting (capping at the wrong number, 20, which would force unnecessary batch-splitting on items that don't need it).

**Note for 2027 planning:** At a projected ~125 students, *every* universal item will need batch-splitting under the 50-item cap, not just Pillow Protectors. Build the batching math into whatever tooling handles the 2027 bulk order — this won't scale as a single order per item past 50 total units.

---

### DEC-062: Universal Bulk Order Tab Converted to Self-Maintaining Formulas (July 20, 2026)

**System:** FULFILLMENT
**Status:** ✅ Implemented and verified

**Context:** DEC-060/061 identified that the Universal Bulk Order tab's Total Students figure was stale (hardcoded at 20). Updating Meta_Data's student count to 35 fixed 27 of 28 rows, but Feminine Hygiene remained wrong — every row referenced the identical Meta_Data cell with no gender awareness, so Feminine Hygiene showed 35 instead of the real Women-preference count. The "BULK ORDER SUMMARY" block at the bottom of the tab was also static text, not formula-driven, and had drifted out of sync with the line items above it (miscounted Laundry as 3 items instead of 4).

**Decision:** Rebuilt the tab to be fully self-maintaining:

1. **Added a `Gender Specific?` column (K)** that pulls each product's gender restriction from the Universal Products tab by SKU match:
   `=IFERROR(IF(VLOOKUP(D2,'Universal Products'!$F:$H,3,FALSE)="","No",VLOOKUP(D2,'Universal Products'!$F:$H,3,FALSE)),"No")`
   Returns "No" for unrestricted items, or the actual gender (e.g., "Women") for restricted ones. This is the single source of truth for which items need gender-aware counting — adding a future gender-restricted item requires only filling in its GENDER field on Universal Products; no formula changes anywhere else.

2. **Total Students (column H)** now checks each row's own Gender Specific value instead of blindly referencing Meta_Data:
   `=IF(K2="No", Meta_Data!$B$3, COUNTIF(Student_Selections!J:J, K2))`
   Unrestricted rows fall through to the normal approved-cohort count; restricted rows count matching students directly from Student_Selections column J (Gender Preference).

3. **Total Qty Needed (I) and Total Cost (J)** were already formula-driven (`=G*H` and `=I*F` respectively) — unchanged, just confirmed correct.

4. **BULK ORDER SUMMARY block (rows 38–45) rebuilt with bounded-range formulas:**
   - Item count per category: `=COUNTIF($A$2:$A$29,$A38)&" items"`
   - Cost per category: `=SUMIF($A$2:$A$29,$A38,$J$2:$J$29)`
   - Grand total items: `=SUMPRODUCT(--($A$2:$A$29<>""))&" items"`
   - Grand total cost: `=SUM($J$2:$J$29)`
   Ranges are deliberately bound to `$A$2:$A$29` (the 28 real product rows only) rather than left open-ended, because the summary rows themselves repeat category names in column A — an unbounded range would double-count the summary against itself.

**Verified output (July 20, 2026):** Feminine Hygiene = 25 students, $670.50. Grand Total = 28 items, $13,950.20. Matches independent hand calculation from DEC-060/061 review.

**Rationale:** Eliminates the entire class of "someone forgot to update a hardcoded number" bug this tab has now hit twice. Both the headcount and the gender-restriction logic now recalculate live off Meta_Data and Student_Selections — no manual per-cycle maintenance required.

**Note for 2027:** This pattern (lookup-driven flag column + conditional formula) is the right model to extend if more gender-restricted or otherwise-conditional universal items are added at higher cohort scale.

---

### DEC-063: 2026 Ordering Method — Amazon Business List Per Student; Track A Deferred; Request Quotes for 2027 (July 22, 2026)

**Context:** First full kit ordering run. Three approaches were on the table: Track A (Amazon "Ship to Multiple Addresses" for bulk consolidation), Track B (individual per-student orders), and a bookmarked Amazon bulk upload tool that had not yet been tested.

**Decision:**
- **Active 2026 method:** One Amazon Business List per student — Universal and choice items merged into a single list, one checkout per student. The bookmarked bulk upload tool was tested and confirmed to work: uploading a student's product list automatically creates a ready-to-place order.
- **Track A (Ship to Multiple Addresses) is deferred, not abandoned.** The real constraint is 50 total line items per order (not the 20-address display limit per DEC-061). Revisit for 2027 if cohort scale and order complexity make consolidation worthwhile.
- **Amazon Request Quotes for 2027:** Amazon Business allows requesting quotes directly from sellers. As soon as the 2027 catalog is finalized (October–November), submit a Request for Quote covering full bulk quantities across all students. Request at least two weeks before the ordering window opens so there is time to review pricing and negotiate before committing.

**Rationale:** The bulk upload tool works well enough for 2026's scale and avoids the complexity of Track A's multi-address consolidation. Track A remains viable for 2027 if the Foundation orders a larger number of identical items where bulk pricing matters. Request Quotes is the best path to bulk pricing — it engages sellers directly rather than relying on Amazon's automated pricing logic.

**Status:** Implemented (2026). Request Quotes strategy queued for 2027.

---

### DEC-064: Under-Bed Storage SKU Substitution — B004I8Q6RQ → B09Q38H2J4 (July 22, 2026)

**Context:** The original Under-Bed Storage SKU (B004I8Q6RQ) was discontinued and unavailable during the ordering window.

**Decision:** Substitute with Budging Joy 90L Under Bed Storage Bags, 4-pack (B09Q38H2J4). Qty = 1 per student, which equals one full 4-pack. Applied to all 30 active order files.

**Rationale:** Direct functional replacement. 4-pack format at Qty 1 matches the student's actual storage need and is in stock.

**Status:** Implemented. Source files (Universal_Bulk_Order, Shopping_List) not yet updated — substitution must be reapplied if any order file is regenerated before the source is corrected. See Open Items in CURRENT_STATUS.md.

---

### DEC-065: Feminine Hygiene SKU Substitution — B06XRW5H48 → B0BPBB21N3 (July 22, 2026)

**Context:** The original SKU (B06XRW5H48) was a 102-count pack — a sourcing error; the intended quantity was a standard single-cycle supply.

**Decision:** Substitute with Tampax Pearl Tampons, 47-count (B0BPBB21N3). Applied to Women-preference students only. Applied to all 30 active order files.

**Rationale:** Correct pack size for a one-time supply. The 102-count was disproportionate and likely a catalog error from initial sourcing.

**Status:** Implemented. Source files not yet updated — same caveat as DEC-064.

---

### DEC-066: Comforter SKU Substitution — B07CMN2H2S → B07XM834N6 (July 22, 2026)

**Context:** The original comforter SKU (B07CMN2H2S, ViscoSoft) had an estimated delivery window of August 12 – September 12 — too late for move-in.

**Decision:** Substitute with Utopia Bedding Twin XL Comforter, White (B07XM834N6). Applied to all 30 active order files.

**Rationale:** Delivery timing was the sole disqualifier for the original SKU. The Utopia Bedding replacement ships within the required window.

**Status:** Implemented. Source files not yet updated — same caveat as DEC-064.

---

### DEC-067: Vanilla & Botanicals Personal Care — Fallback to Soft & Floral (July 22, 2026)

**Context:** "Vanilla & Botanicals" is a valid scent option on the kit customization form but had no corresponding entries in the Personal_Care catalog for four categories: Deodorant, Body Wash, Shampoo & Conditioner Set, and Shaving Cream. When the resolver found no match, it silently dropped those line items with no error or flag. 19 of 35 students selected Vanilla & Botanicals and were each missing up to 4 personal care items (72 missing line items total). The gap was caught by manually comparing two students' order files.

**Decision:** Vanilla & Botanicals students receive Soft & Floral SKUs for all four affected personal care categories. Consistent with a pre-existing catalog note on the Deodorant row. Confirmed SKUs (Women, Soft & Floral):

| Category | Brand | SKU | Price |
|---|---|---|---|
| Deodorant | Native | B07GB1KJN3 | $11.25 |
| Body Wash | EOS | B0DPHQRLJC | $11.99 |
| Shampoo & Conditioner Set | Native | B0BBBSMV94 | $19.99 |
| Shaving Cream | EOS | B0CVCTQ1DK | $9.98 |

**Correction status:**
- 14 in-batch Vanilla & Botanicals students: fallback items added to individual order files ✅
- Amara S. Boerner, Yadira Lizbeth Pelayo Avina: already checked out — supplemental orders built and placed ✅
- Andrea E. Suarez: confirmed not affected (Cool & Herbal, Antiperspirant) ✅
- Anastasia Guerrier, Gabrielle Pina, Lilian Barrientos Aceituno: Vanilla & Botanicals — fallback must be applied manually when their order files are generated

**Root cause fix:** The form's catalogValue for the Soft & Floral option was incorrectly set to "Vanilla & Botanicals" instead of "Soft & Floral," causing all Soft & Floral students to submit the wrong scent value to the resolver. This was fixed in Customize_Your_Kit.html (committed July 2026, not yet pushed live). Once pushed, new submissions will submit the correct value. Catalog entries for Vanilla & Botanicals as a standalone scent remain absent — add real SKUs before 2027 if Vanilla & Botanicals is kept as an option.

**Rationale:** Fallback is directionally consistent with existing catalog notes. Four SKUs were available and already vetted. Manual application was the only viable path for the 2026 cohort given the ordering timeline.

**Status:** Implemented for 2026. Root cause fix in code, not yet live. Catalog gap remains open (P-012).

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
