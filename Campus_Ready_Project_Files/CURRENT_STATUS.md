# Current Status — Campus Ready Foundation

**Last Updated:** June 14, 2026

---

## Executive Summary

**2026 application window closed May 15.** 45 applications received. 3 were ineligible (submitted after the deadline). 1 was ineligible (no on-campus housing). 41 students awarded grants. Award emails sent May 27, 2026. Winners transferred to Grant Fulfillment May 27, 2026.

**Board:** 3 members (Eric Lilavois, Karen Dantzler, Janie Green).

**Website live** at campusready.org. All pages operational: Homepage, About/Our Story, Team, Mission, Apply, Donate, Partners, FAQ, Privacy.

**Application System operational.** Scoring rubric (100 points: 70 objective + 30 board-scored essays) implemented. Personalized essay scoring sheets distributed to all three board members. IPEDS-backed college picker shipped May 21 — replaced free-text college fields, distance scoring corruption resolved. Vercel proxy merged to main. Apps Script now in version control. API key rotated and moved to Script Properties.

**Grant Fulfillment System active.** 41 winners transferred May 27. Kit customization form fully rebuilt and live at award.campusready.org. Product_Logic confirmed 174 clean products. Kit confirmation email confirmed working — sends automatically after submission in school colors with full product summary. Personalized link auto-verify and Kit Form Email system deployed. Form is ready for July 1 send.

**Travel cost model — pending revision.** Lyft grant confirmed at $7,500 (50 credits × $150, contact: Celia Moreno). Travel model numbers require reconciliation against confirmed grant value.

**Application Analysis documents produced May 16.** Internal version (for board) and external version (for donors) both finalized.

**Checklist Intelligence System operational.** Six-stage pipeline deployed across Cloud Run. ~1,600 schools in target list.

**July 15 Orientation & Celebration event** — venue confirmed at 10,000 Degrees (after-hours access via Hugo Que). Advisory Board meeting June 8 was the decision gate for remaining logistics. Updates to follow from that meeting.

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
| Preferences form link sent to winners | July 1, 2026 | Upcoming |
| Document verification + kit preferences | July 2026 | Upcoming |
| Orientation & Celebration event | July 15, 2026 | Upcoming — venue confirmed |
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
| Students with companion | 19 |
| Students assigned Lyft | 28 (incl. Melanie Avila and Journey Penterman overrides) |
| Students assigned flight | 12 |
| Students on campus (no travel needed) | 0 |
| Total Travel Cost (before Lyft credits) | $12,759 |
| Total Lyft Grant Value (confirmed) | $7,500 (50 credits × $150) |
| Total Lyft Credits Applied (per travel model) | $6,150 — ⚠️ revisit against confirmed grant |
| CRF Cash Outlay (base, after credits) | $7,636 — ⚠️ revisit against confirmed grant |
| 15% Contingency | $1,145 |
| Recommended Cash Budget | $8,781 — ⚠️ revisit against confirmed grant |
| Blended per student (incl. contingency) | $209 |

---

## System Status

### Application System
- Application form: Closed (window ended May 15)
- Apps Script (doPost): Operational — in version control (`apps-script/application/`) with clasp deployment
- Apps Script secrets: API key rotated and moved to Script Properties (May 21) — source code contains no credentials
- Apps Script deploy: Run `push-scripts app` in Terminal — requires Campus Ready Foundation Google account (`~/.clasprc-crf.json`)
- Master Sheet: 45 applications received — column AX added ("College UNITID")
- PDF generation: Working — label updated from "Address" to "College Location"
- Confirmation emails: Sent
- Board_Essays tab: Scoring complete (window closed May 22)
- Final_Review tab: Populated, sorted by Total Score — 41 Awarded, 4 Denied
- Award emails: ✅ Sent May 27, 2026 via `sendAwardDecisionEmails()` in Application_Admin_Script.gs
- Vercel proxy (`api/apply.js`): ✅ Merged to main (May 21)
- College picker: ✅ Shipped — IPEDS-backed typeahead replaces all free-text college fields
- College address field: Removed — column S will be empty for 2027+ applications (intentional)
- Config Tab B1: Set to 2026
- Known limitation: GmailApp does not detect bounced emails. A bounced address will still be marked "Award Email Sent = Yes." Recovery procedure: manually clear the "Award Email Sent" cell and timestamp for the affected row, correct the email address, and rerun `sendAwardDecisionEmails()`.
- Pre-existing issue (not yet fixed): Column 38 header says "Internal Notes" but Apps Script uses it as PROCESSING_STARTED timestamp. Staff notes in that column would be overwritten on retry. Rename header to "Processing Timestamp."

### Grant Fulfillment System
- Grant Fulfillment Database: ✅ Active — 41 winners transferred May 27, 2026
- Customize Your Kit form: ✅ Live at award.campusready.org — fully rebuilt (June 2026)
- Form flow: Email verify → Document upload → Kit Customization (Section 1) → Shipping Information (Section 2) → Review & Submit (Section 3). Approved students bypass document upload.
- Product_Logic: ✅ 174 products — zero duplicate IDs, zero URL errors, all resolver dimensions confirmed correct
- Student_Selections headers: ✅ Fixed — all 23 column headers match doPost() write order
- COLOR_CRIT: ✅ Deployed — slide color matching active in resolver
- Apps Script: ✅ New version deployed — includes rebuildProductLogic(), COLOR_CRIT, personalized link auto-verify, Kit Form Email system, Kit Confirmation Email. In version control at `apps-script/grant-fulfillment/` with clasp deployment via `push-scripts gf`.
- Kit Confirmation Email: ✅ Confirmed working — fires automatically after submission, displays all 7 product categories in school colors, checkboxes for physical tracking as packages arrive. `testKitConfirmationEmail()` available in Fulfillment Tools menu.
- Kit Form Email system: ✅ Built — sendKitFormEmails() ready for July 1 send
- Personalized link auto-verify: ✅ Built — ?id=CR_XXXX auto-routes students on page load
- Vercel proxy: Operational
- Google Drive folder: Ready for document uploads
- Shopping list generation: Built
- Testimonial templates: Ready
- Next action: Send preferences form link July 1
- Known gaps (cosmetic, non-blocking): Razor Refills and Toothpaste have no product images in KIT_EMAIL_IMGS_ — render with blank placeholder. school_color not persisted to Student_Selections — a manual re-send would default to CRF teal.
- Deferred: Pink/Mint bedding colors and cool/herbal/wood scent lanes (code path exists, SKUs not in catalog), Style preference popup (planned, not implemented), school_color + school_nickname persistence to Student_Selections (needed only if manual re-send functionality is added)

### Application Analysis Pipeline
- Internal FINAL (board copy): `CRF_Application_Analysis_Internal_20260516_FINAL.docx` — complete
- External FINAL (donor copy): `CRF_Application_Analysis_External_20260516_FINAL.docx` — derived from internal, complete
- PDF: `2026 Application Analysis.pdf` — produced from FINAL.docx
- Chart rendering: 8 PNGs at 300 DPI, swapped into filled docx. Chart script not yet extracted (needed before 2027 cycle)
- Template path in `fill_analysis_doc.py`: Stale — points to v6.docx which was moved to Trash. Must resolve before 2027 run.

### Checklist Intelligence System
- discover-urls: v4.6 deployed
- analyze-urls: v1.0 deployed
- retry-flagged: v1.3 deployed
- extract-items: v4.0 deployed
- fallback-extraction: v4.0 deployed
- process-intake: v4.0 deployed
- Apps Script menu tools: Operational
- ~1,600 schools in pipeline

### Website
- All pages live at campusready.org
- Application form accessible at /apply/ (now closed — window ended May 15)
- Givebutter donation integration active
- Google Analytics tracking (G-C6B2GRMESL)
- SEO/OpenGraph tags on all pages
- DoorDash added to Partners page

### Web Filter Vendor Status
- Cisco Talos: Correct (Non-governmental Organizations) — no action needed
- Fortinet FortiGuard: Changed to "Education" — confirmed May 13
- Barracuda: "Education" submitted May 13
- Securly: "Educational" — confirmed May 13
- Lightspeed Systems: Email sent May 13 — response pending
- GoGuardian: Email sent May 13 — response pending
- Annual recheck: Every September before application window opens

---

## Partners (Confirmed)

| Partner | What They Provide | Status |
|---------|------------------|--------|
| Lyft | Ride credits (50 credits × $150 = $7,500 total) | Confirmed — grant closed. Contact: Celia Moreno |
| Target | Corporate Engagement Foundation grant | Confirmed |
| DoorDash | Community Credits (digital code delivery) | Confirmed |
| 10,000 Degrees | Student outreach and referrals; July 15 event venue (after-hours access) | Active — MOU in progress, not yet signed. Contact: Hugo Que |
| Napa Valley Community Foundation (NVCF) | Funding partner | Active — any external mention requires Terence Mulligan review before distribution |

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
| Application | CLAUDE.md repo configuration file | Complete |
| Application | IPEDS school database (`crf_schools_merged.json`) | Complete — 5,969 schools, aliases merged |
| Application | College typeahead picker (form integration) | ✅ Complete — shipped May 21 |
| Application | Apps Script in version control (`apps-script/application/`) | ✅ Complete |
| Application | API key moved to Script Properties | ✅ Complete |
| Application | Apps Script deploy via clasp (`push-scripts app`) | ✅ Complete — June 14 |
| Infrastructure | Project files in GitHub repo (`Campus_Ready_Project_Files/`) | ✅ Complete — June 14 |
| Infrastructure | claude.ai project synced from GitHub | ✅ Complete — June 14 |
| Fulfillment | Apps Script deploy via clasp (`push-scripts gf`) | ✅ Complete — June 14 |
| Fulfillment | Kit customization form — full rebuild | ✅ Complete — live at award.campusready.org |
| Fulfillment | Product_Logic — rebuildProductLogic() | ✅ Complete — 174 products, clean |
| Fulfillment | Student_Selections headers corrected | ✅ Complete |
| Fulfillment | COLOR_CRIT in LOGIC_HEADERS | ✅ Complete — deployed |
| Fulfillment | Personalized link auto-verify (?id= param) | ✅ Complete — deployed |
| Fulfillment | Kit Form Email system (sendKitFormEmails) | ✅ Complete — deployed |
| Fulfillment | Kit Confirmation Email (post-submission) | ✅ Complete — confirmed working |
| Fulfillment | Document verification + Drive storage | Complete |
| Fulfillment | Shopping list generation | Complete |
| Fulfillment | Testimonial invite workflow | Complete |
| Analysis | Internal + external Application Analysis docs | Complete (2026 cycle) |
| Analysis | Data pipeline (extract → analyze → fill → derive) | Complete (2026 cycle) |
| Checklist | 6-stage Cloud Run pipeline | Complete |
| Checklist | Apps Script menu tools | Complete |
| Checklist | Semantic matching (Alias + Vertex AI) | Complete |
| Website | All content pages | Complete |
| Website | Shared header/footer includes | Complete |
| Website | SEO + social meta tags | Complete |

---

## What's In Progress

- **Lyft travel model reconciliation** — 50 credits at $150 each ($7,500 total) confirmed. Travel math should be revisited against confirmed grant value. Contact: Celia Moreno.
- **Web filter vendor follow-ups** — Lightspeed and GoGuardian responses still pending.
- **10,000 Degrees MOU** — in progress, not yet signed.
- **Checklist Intelligence refinement** — ~600 schools remain in manual lookup queue.
- **Checklist → Fulfillment integration** — planned but not yet built.
- **Column 38 header fix** — rename from "Internal Notes" to "Processing Timestamp" before staff use that column for notes.
- **July 15 Orientation & Celebration event** — venue confirmed at 10,000 Degrees (after-hours access via Hugo Que). June 8 Advisory Board meeting was the decision gate; updates to follow. Briana Marie confirmed as photographer. Zoom planned for remote students. Karen Dantzler owns testimonial invitation segment.

---

## Immediate Action Items

| Item | Owner | Deadline |
|------|-------|----------|
| Send preferences form link to award recipients | Eric | July 1 |
| Finalize July 15 event logistics post-June 8 decisions | Eric | July 13 "everything locked" |
| Reconcile travel model against confirmed Lyft grant ($7,500) | Eric | Before kit shopping |
| Follow up: Lightspeed and GoGuardian vendor emails | Eric | Overdue (sent May 13) |
| Rename column 38 header from "Internal Notes" to "Processing Timestamp" | Eric | Before 2027 window |
| Update testSyncPath() in Apps Script to match current form payload | Build agent | Before 2027 window |

---

## Key Dates

| Date | Event |
|------|-------|
| May 15, 2026 | ✅ Application window closed |
| May 16–22, 2026 | ✅ Board essay review period complete |
| May 27, 2026 | ✅ Award emails sent — 41 winners, 4 denied |
| May 27, 2026 | ✅ Winners transferred to Grant Fulfillment |
| June 8, 2026 | ✅ Advisory Board meeting — event logistics decided |
| July 1, 2026 | Preferences form link sent to winners |
| July 13, 2026 | "Everything locked" date for July 15 event |
| July 15, 2026 | Orientation & Celebration — 10,000 Degrees (venue confirmed) |
| August 2026 | Kit delivery (before move-in) |
| September 2026 | Testimonial outreach begins / Annual web filter vendor recheck |

---

*45 applications received. 41 awarded, 4 denied. Award emails sent and winners transferred May 27, 2026. Kit form fully rebuilt, confirmed working, confirmation email deployed. Preferences form goes out July 1. July 15 event venue confirmed.*

## Grant Fulfillment Status

**As of June 15, 2026:** 40 eligible students confirmed for grant fulfillment (41 awarded minus Daysee Jossabeth Queme Mazariegos, ineligible). All 41 Lyft credits verified against policy (flat $150 per student). Pro forma locked—no revisions needed. Second Lyft credit request to Celia Moreno will be based on actual student travel plan responses.

## July 15 Event Status

**As of June 15, 2026:** Run of Show (v2, June 9) and event program locked. Kelli Watkins confirmed for Belonging & Campus Life session. Victor Ruiz-Cornejo (DoorDash) role TBD pending Thursday call with DoorDash head of strategic communications. Event is on track for launch.