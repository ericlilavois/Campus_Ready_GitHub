# Current Status — Campus Ready Foundation

**Last Updated:** July 22, 2026
**Maintained by:** Eric Lilavois

> **Single source of truth for all Campus Ready programs.**
> Grant Fulfillment technical reference (Sheets schema, Apps Script functions, product logic) lives in `Grant_Fulfillment_Project_Files/CURRENT_STATUS.md` in the Grant Fulfillment repo.

---

## Executive Summary

**2026 application window closed May 15.** 45 applications received. 3 were ineligible (submitted after the deadline). 1 was ineligible (no on-campus housing). 41 students awarded grants. Award emails sent May 27, 2026. Winners transferred to Grant Fulfillment May 27, 2026.

**Board:** 3 members (Eric Lilavois, Karen Dantzler, Janie Green).

**Website live** at campusready.org. All pages operational: Homepage, About/Our Story, Team, Mission, Apply, Donate, Partners, FAQ, Privacy.

**Application System operational.** Scoring rubric (100 points: 70 objective + 30 board-scored essays) implemented. Personalized essay scoring sheets distributed to all three board members. IPEDS-backed college picker shipped May 21 — replaced free-text college fields, distance scoring corruption resolved. Vercel proxy merged to main. Apps Script in version control. API key rotated and moved to Script Properties.

**Grant Fulfillment System active.** Kit form emails sent (July 1 send confirmed — all 37 eligible rows stamped Kit Email Sent = Yes). 36 students in active travel coordination. Orientation & Celebration event is tomorrow, July 15 at Napa Valley Community Foundation. Travel Detail v20 exported July 14 — Companion Return Gas column added (DEC-047); Anastasia Guerrier's row needs manual correction (formula fires incorrectly for flying-back companion). **33 Ramp invitations sent July 14** — students now receiving invite emails; physical cards ship to home addresses once students accept. Sofia Alvarez invite pending transport confirmation.

**Travel cost model — reconciled July 12, 2026.** Lyft credit confirmed at $7,500 (50 credits × $150, general-purpose). See DEC-042, DEC-046.

**Application Analysis documents produced May 16.** Internal version (for board) and external version (for donors) both finalized.

**Checklist Intelligence System operational.** Six-stage pipeline deployed across Cloud Run. ~1,600 schools in target list.

---

## 2026 Application Cycle

| Milestone | Date | Status |
|-----------|------|--------|
| Application window opens | — | ✅ Complete |
| Application window closes | May 15, 2026 | ✅ Complete |
| Applications received | 45 total | ✅ Complete |
| Ineligible — post-deadline | 3 students | ✅ Removed |
| Ineligible — no on-campus housing | 1 student | ✅ Removed |
| Board essay scoring | May 16 – May 22, 2026 | ✅ Complete |
| Award decisions finalized | May 27, 2026 | ✅ Complete — 41 awarded, 4 denied |
| Award emails sent | May 27, 2026 | ✅ Complete |
| Winners transferred to Grant Fulfillment | May 27, 2026 | ✅ Complete |
| Advisory Board meeting | June 8, 2026 | ✅ Complete — event logistics decided |
| Kit form emails sent to 37 eligible recipients | July 1, 2026 | ✅ Complete |
| Orientation & Celebration event | Wednesday, July 15, 2026 | This Wednesday — Napa Valley Community Foundation |
| Kit shopping + assembly | July – August 2026 | Upcoming |
| Kit delivery | August 2026 (before move-in) | Upcoming |
| Testimonial outreach | September – October 2026 | Upcoming |

---

## 2026 Cohort Key Numbers

| Metric | Value |
|--------|-------|
| Applications received | 45 |
| Ineligible (post-deadline) | 3 |
| Ineligible (no on-campus housing) | 1 |
| Final cohort size — awarded | 41 students |
| Denied | 4 students |
| Active in Travel Detail (as of July 12) | 36 students (Daysee removed, Valeria added) |
| Students assigned Lyft | 28 (incl. Melanie Avila and Journey Penterman overrides) |
| Students assigned flight | 12 |
| Students attending July 15 event | 24 confirmed |
| Total Travel Cost (before Lyft credits) | $12,759 |
| Total Lyft Grant Value (confirmed) | $7,500 (50 credits × $150, general-purpose) |
| CRF Cash Outlay (base, after credits) | $8,757 — reconciled July 12, 2026 |
| 15% Contingency | $1,314 |
| Recommended Cash Budget | $10,071 — reconciled July 12, 2026 |
| Blended per student (incl. contingency) | $209 |

---

## Grant Fulfillment Operations — Current State

**As of July 13, 2026.**

**Active action plan:** `ACTION_PLAN_July_2026_Event.md` — read this before advising on any fulfillment task for the July 14–17 window. It contains step-by-step sequencing, hold logic, ready-to-send text messages, Ramp funding amounts, and gas card guide.

### Ramp Physical Cards

**33 invitations sent July 14** via bulk issuance CSV (Student Travel Expenses spend program). Students are Employee role with physical cards — cards ship to their home address once they accept the invite. Deactivation date: October 15, 2026.

| Status | Count | Students |
|--------|-------|---------|
| Ready — invited | 33 | Invitations sent July 14 |
| Pending — invite held | 1 | Sofia Alvarez — transport unconfirmed; $25 card ready when confirmed |
| Excluded | 2 | Lilian Barrientos (flight reimbursed by check, DEC-057); Lizbeth Perez Solano (ineligible, DEC-058) |

- **Invitations sent** (Stage 2 complete — July 14)
- Students must accept invite and enter **home address** for card shipping (not dorm)
- No cards physically issued yet — ships after student acceptance
- Spend program "Student Travel Expenses": Gas/fuel, Airlines, Hotels only. Rideshare and restaurants blocked. (DEC-056)
- All companion return gas: parent takes student's physical Ramp card at drop-off and fills up — no separate Visa gift cards needed (DEC-052)
- Card amounts: individual per student, $25–$1,200. Formula: `ROUND(Outlay × 1.15 / 25, 0) × 25`, no floor (DEC-055)
- Jimena Reynaga-Castro, Marisol Navarro, Osvaldo Ramirez Hernandez: docs approved July 14 — included in 33-student send

### Kit Shopping — Status as of July 22, 2026

**Ordering underway.** 30 of 35 students are in the active batch. 5 students (Anastasia Guerrier, Gabrielle Pina, Lilian Barrientos Aceituno, Elizabeth Carmichael, Nicholas Avery Joy) are excluded pending shipping address confirmation — all are school-bound, waiting on confirmation that facilities can receive deliveries.

**Ordering method — combined per-student Amazon Business List (DEC-063, pending).** Active method for 2026: one Amazon Business List per student (Universal + Choice items merged), one checkout per student. Amazon's bulk upload tool was evaluated and confirmed to work — uploading a student's product list automatically creates a ready-to-place order. It does not enable bulk pricing on individual products across students. Track A (Amazon "Ship to Multiple Addresses") is deferred, not permanently abandoned; revisit for 2027.

**2027 ordering strategy — Amazon Request Quotes.** Amazon allows Request Quotes on Business accounts. Recommended approach for 2027: as soon as the product catalog is finalized (likely October–November), submit a Request for Quote covering the full bulk quantities needed across all students. This engages sellers directly and allows pricing negotiations before orders are placed. Request quotes at least two weeks before the ordering window opens.

**Three SKU substitutions applied to all 30 active order files (DEC-064, DEC-065, DEC-066, pending):**

| Item | Old SKU | New SKU | Notes |
|---|---|---|---|
| Under-Bed Storage | B004I8Q6RQ (discontinued) | B09Q38H2J4 (Budding Joy 90L, 4-pack) | Qty 1 per student = one full 4-pack |
| Feminine Hygiene | B06XRW5H48 (102-count — sourcing error) | B0BPBB21N3 (Tampax Pearl, 47-count) | Women-preference students only |
| Comforter | B07CMN2H2S (ViscoSoft — Aug 12–Sep 12 delivery) | B07XM834N6 (Utopia Bedding Twin XL, White) | All 30 students |

**Personal Care scent defect found — Vanilla & Botanicals silently dropped by resolver (DEC-067, pending).** "Vanilla & Botanicals" is a valid intake form scent option but has no corresponding entries in Personal_Care for four categories: Deodorant, Body Wash, Shampoo & Conditioner Set, and Shaving Cream. When the resolver finds no catalog match, it silently drops the line item — no error is logged, no flag is raised, and nothing in Shopping_List or the order files indicates an item is missing. 19 of 35 students selected Vanilla & Botanicals; all 19 were missing up to 4 personal care items each (72 missing line items total across the cohort).

**Fallback rule confirmed (DEC-067, pending):** Vanilla & Botanicals → Soft & Floral for all four affected categories, consistent with a pre-existing catalog note on the Deodorant row. Confirmed SKUs (Women, Soft & Floral):

| Category | Brand | SKU | Price |
|---|---|---|---|
| Deodorant | Native | B07GB1KJN3 | $11.25 |
| Body Wash | EOS | B0DPHQRLJC | $11.99 |
| Shampoo & Conditioner Set | Native | B0BBBSMV94 | $19.99 |
| Shaving Cream | EOS | B0CVCTQ1DK | $9.98 |

**Correction status:**
- 14 in-batch Vanilla & Botanicals students: fallback items added to individual order files ✅
- Amara S. Boerner, Yadira Lizbeth Pelayo Avina: already checked out before bug was caught — supplemental orders built and placed ✅
- Andrea E. Suarez: confirmed not affected (Cool & Herbal, Antiperspirant) ✅
- Anastasia Guerrier, Gabrielle Pina, Lilian Barrientos Aceituno: all three are Vanilla & Botanicals — fallback must be applied manually when their order files are generated. Underlying catalog gap not yet fixed at source.

**Source files not yet updated.** Universal_Bulk_Order and Shopping_List still reference old SKUs (B06XRW5H48, B07CMN2H2S) and have no Vanilla & Botanicals fallback. If any file is regenerated from source before the source is corrected, all substitutions must be reapplied.

**Standing data anomalies (non-blocking):**
- **Henry Ray:** Resolver produced separate Shampoo and Conditioner line items instead of a combined Shampoo & Conditioner Set. Men/Unscented/Antiperspirant — unrelated to the scent bug. Not urgent, but should be corrected for data cleanliness.
- **Sofia Alvarez:** Phone number shows (170) area code in Application Master — likely a data-entry error. Correct if needed for delivery contact.
- **Gabrielle Pina:** Street Address and Street Address 2 fields contain the same full address string in Universal_Order_Addresses.csv — must be corrected before she is added to the active ordering list.

### Student Communications Status

**Sent / Complete:**
- Kit form emails → 37 eligible students (July 1 send, all stamped Kit Email Sent = Yes)
- July 15 event reminder → 24 attending students (apps, colors, photographer notice)
- Document upload nudge → Lizbeth Pérez Solano (sent 7/9, no reply yet)
- Kit form email resend → Valeria Alexa Hernandez Correa (sent 7/10)
- Travel-confirmation texts → attending flight students (sent 7/10); Arianna Deibert text sent 7/11
- **Non-attendee No-Travel email** — sent July 11 to Cristian Fonseca Nunez, Diego Perez Herrera, Fernanda Contreras Alcaraz. Alice Baxter and Xadani Ramirez Herrera skipped — docs pending.
- **Non-attendee Travel email** — sent July 11 to Gabrielle Pina, Lilian Barrientos Aceituno, Anastasia Guerrier.

**Not Yet Sent:**

| Audience | What's Needed | Status |
|----------|---------------|--------|
| All students | "Here's what to expect from Ramp" email | Held — travel confirmations now reconciled; confirm gate has cleared |
| Alice Baxter, Xadani Ramirez Herrera | Non-attendee No-Travel email | Blocked — docs pending. Re-run `sendNonAttendeeNoTravelEmails()` when docs approved |

### Docs-Pending Students

| Student | RSVP | Impact |
|---------|------|--------|
| Alice Lilliane Baxter | Not attending | Non-attendee email held — re-run script when docs approved |
| Andrea Elia Suarez | Attending w/guest | Handle at event |
| Antonio Rivera | Attending w/guest | Handle at event |
| Wlises Ramirez Santos | Attending | Handle at event |
| Xadani Irais Ramirez Herrera | Not attending | Non-attendee email held — re-run script when docs approved |

### Open Items

**Kit Shopping:**
- **3 excluded students (Anastasia Guerrier, Gabrielle Pina, Lilian Barrientos Aceituno):** All three are Vanilla & Botanicals — when their order files are generated, apply the 4-category Soft & Floral fallback (DEC-067) manually before ordering. Do not assume the source files will do this; the catalog gap is not yet fixed.
- **Gabrielle Pina address:** Street Address and Street Address 2 are duplicated in Universal_Order_Addresses.csv — fix before adding her to the active ordering list.
- **Update source files:** Universal_Bulk_Order and Shopping_List must be updated with the three substituted SKUs and Vanilla & Botanicals fallback logic before any order file is regenerated from source.
- **QTY / pack size audit:** Some catalog SKUs are sold as multi-unit packs (Standard Pillow = Set of 2, Under-Bed Storage = 4-pack). QTY PER STUDENT must be divided by units per pack before entering the order quantity. Full catalog audit needed before 2027; see P-013 in PARKING_LOT.md.
- **Firm pillow backup SKU:** If Love Attitude Firm (B0C5D5XPLJ) goes out of stock again, substitute EASELAND Firm Shredded Memory Foam Standard, Set of 2 — ASIN B0BY7T3K2R.
- **Amazon Request Quotes:** Start quote requests as soon as the 2027 catalog is finalized (October–November) — at least two weeks before orders are placed.
- **DEC-063 through DEC-067:** Decision log entries drafted, awaiting Eric's go-ahead to assign numbers and log.

**Ramp (post-invite):**
- **Sofia Alvarez invite:** Held pending transport confirmation. $25 card ready; invite her once confirmed.
- **Student acceptance:** Students must accept invite and enter home address. Physical cards ship after acceptance (allow 5–7 days).
- **Anastasia Guerrier Travel Detail correction:** Set Companion Return Gas (column Q) to 0 manually — formula fires incorrectly because her companion is flying back, not driving (DEC-047).

**Travel / Pro Forma:**
- **Flight fare revisions:** Real fares researched for 9 flight-mode students. Higher-coverage figures to be delivered — awaiting Eric's go-ahead.
- **Anastasia's Reconciliation Notes cell:** Confirm it reflects the finalized Legacy Override arrangement (DEC-044).
- **2026 Pro Forma flagged items:** Reconciliation agent identified internal inconsistencies. Eric to decide which are real errors vs. accepted-as-approved.
- **Isabella Jones (Houston → San Antonio):** Referenced in old Pro Forma, absent from current Travel Detail. Status unknown.

**Post–July 15:**
- **Budget vs. Actual tab:** Build per DEC-046 architecture.
- **Travel Detail headcount/Overview formulas:** Make formula-driven and consistent; fix Overview tab arithmetic.
- **2027 Pro Forma seed:** Build AVERAGEIF-driven formula from 2026 realized actuals once travel wraps (DEC-046).
- **Dashboard tab:** Reviewed, not yet approved or deployed. Eric's review needed before deploy.

**Standing:**
- **Arianna stale RSVP row:** Delete her June 26 `not_attending` row from RSVP_Responses.
- **Daniel Sanchez & Sofia Alvarez (minors, no on-site guardian):** Hold is for **photo release only** — general outreach (travel confirmation, Ramp card, event comms) is not blocked.
- **Flight cost estimates:** $135/$200 caps are unverified estimates. Confirm before setting Ramp card limits.
- **Marisol Navarro:** Confirmed eligible, not yet in Ramp. Travel mode TBD.

---

## System Status

### Application System
- Application form: Closed (window ended May 15)
- Apps Script (doPost): Operational — in version control (`apps-script/application/`) with clasp deployment
- Apps Script secrets: API key rotated and moved to Script Properties (May 21)
- Apps Script deploy: Run `push-scripts app` in Terminal — requires Campus Ready Foundation Google account
- Master Sheet: 45 applications received
- PDF generation: Working
- Board_Essays tab: Scoring complete
- Final_Review tab: 41 Awarded, 4 Denied
- Award emails: ✅ Sent May 27, 2026
- Vercel proxy: ✅ Merged to main
- College picker: ✅ Shipped — IPEDS-backed typeahead
- Known limitation: GmailApp does not detect bounced emails. Recovery: manually clear "Award Email Sent" cell and timestamp, correct email, rerun `sendAwardDecisionEmails()`.
- Pre-existing issue: Column 38 header says "Internal Notes" but Apps Script uses it as PROCESSING_STARTED timestamp. Rename before staff add notes there.

### Grant Fulfillment System
See **Grant Fulfillment Operations** section above for current operational state.

- Grant Fulfillment Database: ✅ Active — 41 winners transferred May 27, 2026; 36 active in Travel Detail
- Kit form: ✅ Live at award.campusready.org
- Product_Logic: ✅ 174 products — zero duplicate IDs, zero URL errors
- Apps Script: ✅ Modular (`apps-script/grant-fulfillment/modules/`), deployed via `push-scripts gf`
- Kit Confirmation Email: ✅ Working — fires automatically after submission
- Kit Form Email system: ✅ Sent July 1 to 37 eligible students
- Vercel proxy: Operational
- Google Drive folder: Ready for document uploads (`1ccJ8lg40PTgMFIXdNoXyHU12ySgSnurf`)
- Shopping list generation: Built
- Testimonial templates: Ready
- Script version: v2.4 (last updated Jun 7, 2026)

### Grant_Recipients Column-Index Refactor (Priority — Pre-2027)

Grant_Recipients reads and writes are hardcoded by column position in at least three confirmed files: `DocumentUpload.gs`, `WebHandlers.gs`, and `Application_Admin_Script.gs`. `Final_Review` and `Product_Logic` already use header-name lookup (the same fix DEC-018 applied to Product_Logic). Goal: convert all Grant_Recipients access to header-name addressing before the 2027 cycle so future column additions don't require hunting for a "safe zone" at the end of the sheet.

### Application Analysis Pipeline
- Internal FINAL (board copy): `CRF_Application_Analysis_Internal_20260516_FINAL.docx` — complete
- External FINAL (donor copy): `CRF_Application_Analysis_External_20260516_FINAL.docx` — complete
- PDF: `2026 Application Analysis.pdf` — produced
- Chart rendering: 8 PNGs at 300 DPI — chart script not yet extracted (needed before 2027 cycle)
- Template path in `fill_analysis_doc.py`: Stale — points to v6.docx which was moved to Trash. Must resolve before 2027 run.

### Checklist Intelligence System
- discover-urls: v4.6 deployed
- analyze-urls: v1.0 deployed
- retry-flagged: v1.3 deployed
- extract-items: v4.0 deployed
- fallback-extraction: v4.0 deployed
- process-intake: v4.0 deployed
- Apps Script menu tools: Operational
- ~1,600 schools in pipeline; ~600 remain in manual lookup queue

### Website
- All pages live at campusready.org
- Application form at /apply/ — closed (window ended May 15)
- Givebutter donation integration active
- Google Analytics tracking (G-C6B2GRMESL)
- SEO/OpenGraph tags on all pages
- DoorDash added to Partners page
- GitHub branch protection active on `main` (July 18, 2026) — direct pushes blocked; all changes must go through a pull request from `staging`

### Web Filter Vendor Status
- Cisco Talos: Correct (Non-governmental Organizations) — no action needed
- Fortinet FortiGuard: Changed to "Education" — confirmed May 13
- Barracuda: "Education" submitted May 13
- Securly: "Educational" — confirmed May 13
- Lightspeed Systems: Email sent May 13 — **response still pending** (overdue)
- GoGuardian: Email sent May 13 — **response still pending** (overdue)
- Annual recheck: Every September before application window opens

---

## Partners (Confirmed)

| Partner | What They Provide | Status |
|---------|------------------|--------|
| Lyft | Ride credits (50 credits × $150 = $7,500 total) | ✅ Confirmed — grant closed. Contact: Celia Moreno |
| Target | Corporate Engagement Foundation grant | Confirmed |
| DoorDash | Community Credits (digital code delivery) | Confirmed |
| 10,000 Degrees | Student outreach and referrals | Active — MOU in progress, not yet signed. Contact: Hugo Que |
| Napa Valley Community Foundation (NVCF) | Funding partner; Wednesday July 15 event venue (after-hours access) | Active — any external mention requires Terence Mulligan review |

---

## What's Built

| System | Component | Status |
|--------|-----------|--------|
| Application | HTML form + validation | Complete |
| Application | Apps Script processing (doPost, PDF, email) | Complete |
| Application | 100-point scoring rubric | Complete |
| Application | Board essay scoring workflow | Complete |
| Application | Personalized scoring sheets (3 members) | Complete |
| Application | Vercel proxy (`api/apply.js`) | ✅ Complete — merged to main May 21 |
| Application | Transfer Winners to Grant Fulfillment | Complete |
| Application | Award decision emails (winner + non-winner) | ✅ Complete — sent May 27, 2026 |
| Application | Archive Cohort function | Complete |
| Application | Config Tab year-based formula system | Complete |
| Application | IPEDS school database (`crf_schools_merged.json`) | Complete — 5,969 schools |
| Application | College typeahead picker | ✅ Complete — shipped May 21 |
| Application | Apps Script in version control | ✅ Complete |
| Application | API key moved to Script Properties | ✅ Complete |
| Application | Apps Script deploy via clasp (`push-scripts app`) | ✅ Complete |
| Infrastructure | Project files in GitHub repo (`Campus_Ready_Project_Files/`) | ✅ Complete |
| Infrastructure | claude.ai project synced from GitHub | ✅ Complete |
| Fulfillment | Apps Script deploy via clasp (`push-scripts gf`) | ✅ Complete |
| Fulfillment | Kit customization form — full rebuild | ✅ Complete — live at award.campusready.org |
| Fulfillment | Product_Logic — rebuildProductLogic() | ✅ Complete — 174 products, clean |
| Fulfillment | COLOR_CRIT in LOGIC_HEADERS | ✅ Complete |
| Fulfillment | Personalized link auto-verify (?id= param) | ✅ Complete |
| Fulfillment | Kit Form Email system (sendKitFormEmails) | ✅ Complete — sent July 1 |
| Fulfillment | Kit Confirmation Email (post-submission) | ✅ Complete — confirmed working |
| Fulfillment | Kit Email Sent tracking (col Z, AA) | ✅ Complete — DEC-033 |
| Fulfillment | Non-attendee email scripts (No-Travel + Travel) | ✅ Complete — sent July 11 |
| Fulfillment | Orientation_Reminder.gs | ✅ Complete — in clasp-managed folder |
| Fulfillment | Email_Ramp.gs | ✅ Built — on GitHub main, not yet sent |
| Fulfillment | Document verification + Drive storage | Complete |
| Fulfillment | Shopping list generation | Complete |
| Fulfillment | Testimonial invite workflow | Complete |
| Analysis | Internal + external Application Analysis docs | Complete (2026 cycle) |
| Analysis | Data pipeline (extract → analyze → fill → derive) | Complete (2026 cycle) |
| Checklist | 6-stage Cloud Run pipeline | Complete |
| Checklist | Apps Script menu tools | Complete |
| Website | All content pages | Complete |
| Website | SEO + social meta tags | Complete |

---

## What's In Progress

- **Web filter vendor follow-ups** — Lightspeed and GoGuardian responses pending since May 13.
- **10,000 Degrees MOU** — in progress, not yet signed.
- **Checklist Intelligence refinement** — ~600 schools remain in manual lookup queue.
- **Ramp virtual card issuance** — 14 draft users created; invitations, acceptance, and card issue all pending. Spend Program corrections must happen first.
- **Wednesday July 15 event** — Napa Valley Community Foundation. Two days out.
- **Column 38 header fix** — rename from "Internal Notes" to "Processing Timestamp" before staff use that column for notes.

---

## Immediate Action Items

| Item | Owner | Deadline |
|------|-------|----------|
| Invite Sofia Alvarez to Ramp once transport confirmed | Eric | Before move-in |
| Set Anastasia Guerrier Companion Return Gas to 0 in Travel Detail (column Q) | Eric | This week |
| Confirm flight fare revision go-ahead | Eric | This week |
| Follow up: Lightspeed and GoGuardian vendor emails | Eric | Overdue (sent May 13) |
| Rename column 38 header from "Internal Notes" to "Processing Timestamp" | Eric | Before 2027 window |
| Delete Arianna's June 26 stale RSVP row from RSVP_Responses | Eric | Cleanup |

---

## Key Dates

| Date | Event |
|------|-------|
| May 15, 2026 | ✅ Application window closed |
| May 27, 2026 | ✅ Award emails sent — 41 winners, 4 denied |
| May 27, 2026 | ✅ Winners transferred to Grant Fulfillment |
| June 8, 2026 | ✅ Advisory Board meeting — event logistics decided |
| July 1, 2026 | ✅ Kit form emails sent to 37 eligible students |
| July 11, 2026 | ✅ Non-attendee emails sent |
| July 12, 2026 | ✅ Travel Detail fully reconciled |
| July 13, 2026 | ✅ "Everything locked" for July 15 event |
| July 14, 2026 | ✅ Travel Detail v20 + Ramp Working File finalized; 33 Ramp invitations sent; Jimena/Marisol/Osvaldo approved; Lizbeth deemed ineligible |
| Wednesday, July 15, 2026 | Orientation & Celebration — Napa Valley Community Foundation |
| August 2026 | Kit delivery (before move-in) |
| September 2026 | Testimonial outreach begins / Annual web filter vendor recheck |

---

## Notes for Next Year (2027 Cohort Planning)

- **Lock audience segmentation before any outreach starts.** The six-audience breakdown (DEC-028) was discovered during a drafting session. Map who needs what before writing a single message.
- **Lock companion policy before outreach starts.** The one-guardian / one-night / distance-tier-rate rule (DEC-031) was established reactively in response to Cole. Set it in advance.
- **Data audit before comms planning.** Three data errors surfaced during the July 10 session (Osvaldo's Travel Helper, Yadira's RSVP, Cole's stale travel plan). Run a reconciliation pass before drafting begins.
- **Verify flight cost estimates with live fares before setting card amounts.** The $135/$200 caps were still unverified estimates as of July 10.
- **Ramp card issuance for minors is not a blocker (DEC-027).** Minor status does not restrict invitation, acceptance, or virtual card issuance. No separate mechanism needed.
- **Resolve the on-site guardian question for minors before invite season.** Daniel Sanchez and Sofia Alvarez (minors attending without an on-site guardian) — this is a separate issue from Ramp and remains unresolved. Needs a decision — release form, designated point of contact — before those students are invited to future events.
- **Ramp limit increase conversation.** $5K credit limit looks adequate for 2026's estimated $2–3K exposure but uses unverified fare inputs. Raise the limit discussion with Ramp before 2027 cohort numbers are set.
- **The travel-confirmation message template (DEC-029) is proven.** Use it as the starting point next year.
- **Set Ramp Spend Programs at point of creation, not after (DEC-050).** Four 2026 students had to be manually corrected in the Ramp platform because they were added before transport was confirmed. Don't add a student until their transport mode is confirmed; set the Spend Program correctly the first time.
- **Source Visa gift cards for long-distance companion drivers at least 2 weeks before move-in (DEC-048).** Buy and mail to the student — the student hands the card to the parent at drop-off. If 2027 has more long-distance companion drivers, consider Ramp physical cards instead (5–7 day lead time, parent needs an email address to accept).
- **Pull Ramp card outlay figures from the Travel Detail, not from raw miles (DEC-051).** The Travel Detail uses ROUNDUP for gas (always rounds up to nearest $25). Recalculating from raw mileage produces lower figures that diverge from the source of truth. Copy the CRF Cash Outlay column from Travel Detail into the Ramp working file.

---

## How to Orient a New Agent

Read these files **in order**, directly — do not rely on search alone:

1. `Campus_Ready_Project_Files/CURRENT_STATUS.md` — this file. Foundation-wide view.
2. `Campus_Ready_Project_Files/DECISION_LOG.md` — all decisions across all programs.
3. `Campus_Ready_Project_Files/HANDOFF_[role].md` — role-specific context for your agent type.
4. `Campus_Ready_Project_Files/Brand_Guidelines.md` — tone, voice, design standards.

For Grant Fulfillment technical reference (Sheets schema, Apps Script functions, product matching): read `Grant_Fulfillment_Project_Files/CURRENT_STATUS.md` in the Grant Fulfillment repo.

**Do not ask for information that exists in these files. Do not re-propose decisions already in DECISION_LOG.md.**

---

## Working Principles (Eric's Requirements for All Agents)

- **Read first, act second.** Never assume. Read all relevant files before doing anything.
- **No assumptions.** If something is unclear, ask. Don't guess.
- **Challenge my thinking.** Push back if something doesn't make sense.
- **Show your work.** Explain what you're doing and why.
- **Be direct and candid.** Don't soften bad news or bury concerns.
- **One task at a time.** Always ask before writing code, designing artifacts, or editing files.
