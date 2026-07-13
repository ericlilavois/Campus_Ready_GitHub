# Current Status — Campus Ready Foundation

**Last Updated:** July 13, 2026
**Maintained by:** Eric Lilavois

> **Single source of truth for all Campus Ready programs.**
> Grant Fulfillment technical reference (Sheets schema, Apps Script functions, product logic) lives in `Grant_Fulfillment_Project_Files/CURRENT_STATUS.md` in the Grant Fulfillment repo.

---

## ⚠️ VENUE CONFLICT — CONFIRM BEFORE JULY 15

Campus Ready files consistently reference **10,000 Degrees (after-hours access via Hugo Que)** as the July 15 event venue. Grant Fulfillment files consistently reference **Napa Valley Community Foundation**. These are different organizations. The event is in two days. Eric must confirm which is correct and update this file before July 15.

---

## Executive Summary

**2026 application window closed May 15.** 45 applications received. 3 were ineligible (submitted after the deadline). 1 was ineligible (no on-campus housing). 41 students awarded grants. Award emails sent May 27, 2026. Winners transferred to Grant Fulfillment May 27, 2026.

**Board:** 3 members (Eric Lilavois, Karen Dantzler, Janie Green).

**Website live** at campusready.org. All pages operational: Homepage, About/Our Story, Team, Mission, Apply, Donate, Partners, FAQ, Privacy.

**Application System operational.** Scoring rubric (100 points: 70 objective + 30 board-scored essays) implemented. Personalized essay scoring sheets distributed to all three board members. IPEDS-backed college picker shipped May 21 — replaced free-text college fields, distance scoring corruption resolved. Vercel proxy merged to main. Apps Script in version control. API key rotated and moved to Script Properties.

**Grant Fulfillment System active.** Kit form emails sent (July 1 send confirmed — all 37 eligible rows stamped Kit Email Sent = Yes). 36 students in active travel coordination. Orientation & Celebration event is July 15. Travel Detail fully reconciled July 12: 36 students, $8,757 CRF cash outlay, $10,071 with 15% contingency. Ramp virtual card setup in progress — 14 draft guest users created, no invitations sent yet, Spend Program corrections pending.

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
| Orientation & Celebration event | July 15, 2026 | 2 days out — see venue conflict above |
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

### Ramp Virtual Cards

- 14 students created as draft guest users in Ramp (Stage 1 complete)
- Invitations not yet published (Stage 2 not started)
- No student has accepted or set up a Ramp account (Stage 3 not started)
- No cards have been issued (Stage 4 not started)
- Marisol Navarro confirmed eligible but not yet added to Ramp — travel mode TBD
- 4 students are minors (Gabrielle Pina, Amara Boerner, Arianna Deibert, Osvaldo Ramirez Hernandez) — authorization mechanism for minors unresolved before invitations can be sent

**Spend Program corrections needed (DEC-041, DEC-043):** Arianna Deibert, Amara Boerner, and Melanie Avila were created under the flight-restricted Spend Program but are confirmed driving. All three must be moved to the gas/hotel Spend Program in Ramp before cards are issued. Anastasia Guerrier is already on the gas/hotel program — correct, no change needed.

**Approved student-facing language for explaining virtual cards (from Ramp support):**
> "A virtual card is a digital payment card that's connected to funds allocated to them by your organization's finance team. Rather than using a physical card, they'll receive a secure card number that can be used for approved purchases, such as their college travel expenses. The virtual card draws from the funds your organization has assigned to it and is subject to any spending limits or controls your team has configured."

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
| Jimena Reynaga-Castro | Attending | Handle at event |
| Lizbeth Pérez Solano | Unknown | No RSVP on file — follow up directly |
| Marisol Navarro | Attending w/guest | Handle at event; Lyft credit held until docs clear |
| Osvaldo Jr. Ramirez Hernandez | Attending (minor) | Handle at event |
| Wlises Ramirez Santos | Attending | Handle at event |
| Xadani Irais Ramirez Herrera | Not attending | Non-attendee email held — re-run script when docs approved |

### Open Items

**Time-sensitive (before July 15):**
- **⚠️ Confirm event venue** — 10,000 Degrees vs. Napa Valley Community Foundation. See top of this file.
- **Lizbeth Pérez Solano RSVP:** No RSVP, docs pending, last contact July 9 with no reply. Follow up directly.
- **Alice & Xadani docs:** When approved, re-run `sendNonAttendeeNoTravelEmails()`.
- **Event materials — board/advisor printable:** Alpha-order error identified, hasn't been reviewed since initial flag. Fix before July 15.

**Ramp (before July 15 or immediately after):**
- **Spend Program corrections:** Move Arianna Deibert, Amara Boerner, and Melanie Avila from flight-restricted to gas/hotel Spend Program in Ramp (DEC-041, DEC-043). Execution pending — Eric must do this in Ramp.
- **Ramp invitations:** 14 draft guest users created, no invites sent. Minor authorization mechanism unresolved before invites go out for the 4 minors.
- **Ramp email (`Email_Ramp.gs`):** Sitting on GitHub main, unapproved. Gates sends on docs approval, excludes minors, tracks "Ramp Email Sent" column. The "held until travel confirmations land" gate has now cleared — travel is reconciled as of July 12. Confirm whether to proceed.

**Travel / Pro Forma:**
- **Flight fare revisions:** Real fares researched for 9 flight-mode students. Higher-coverage figures to be delivered — awaiting Eric's go-ahead.
- **Anastasia's Reconciliation Notes cell:** Confirm it reflects the finalized Legacy Override arrangement (DEC-044).
- **2026 Pro Forma flagged items:** Reconciliation agent identified internal inconsistencies. Eric to decide which are real errors vs. accepted-as-approved.
- **Isabella Jones (Houston → San Antonio):** Referenced in old Pro Forma, absent from current Travel Detail. Status unknown.
- **Henry Ray cross-check:** Present in Travel Detail as driving-mode student (Oregon State Univ-Cascades). Confirm against Grant_Recipients.

**Post–July 15:**
- **Budget vs. Actual tab:** Build per DEC-046 architecture.
- **Travel Detail headcount/Overview formulas:** Make formula-driven and consistent; fix Overview tab arithmetic.
- **2027 Pro Forma seed:** Build AVERAGEIF-driven formula from 2026 realized actuals once travel wraps (DEC-046).
- **Dashboard tab:** Reviewed, not yet approved or deployed. Eric's review needed before deploy.

**Standing:**
- **Arianna stale RSVP row:** Delete her June 26 `not_attending` row from RSVP_Responses.
- **Daniel Sanchez & Sofia Alvarez (minors, no on-site guardian):** No outreach until release/signature mechanism resolved.
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
| 10,000 Degrees | Student outreach and referrals; ⚠️ listed as July 15 event venue in some docs — confirm | Active — MOU in progress, not yet signed. Contact: Hugo Que |
| Napa Valley Community Foundation (NVCF) | Funding partner; ⚠️ listed as July 15 event venue in other docs — confirm | Active — any external mention requires Terence Mulligan review |

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
- **July 15 event** — venue conflict must be resolved. Event is in 2 days.
- **Column 38 header fix** — rename from "Internal Notes" to "Processing Timestamp" before staff use that column for notes.

---

## Immediate Action Items

| Item | Owner | Deadline |
|------|-------|----------|
| **Confirm July 15 event venue** — 10,000 Degrees or NVCF? | Eric | Today |
| Correct Ramp Spend Program for Arianna Deibert, Amara Boerner, Melanie Avila | Eric | Before cards issued |
| Confirm Ramp email gate cleared — approve or hold `Email_Ramp.gs` | Eric | This week |
| Confirm flight fare revision go-ahead | Eric | This week |
| Confirm Henry Ray against Grant_Recipients (Travel Detail driving student) | Eric | This week |
| Confirm Isabella Jones status (in old Pro Forma, not in Travel Detail) | Eric | This week |
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
| July 13, 2026 | "Everything locked" for July 15 event — TODAY |
| July 15, 2026 | Orientation & Celebration — venue TBD (see conflict above) |
| August 2026 | Kit delivery (before move-in) |
| September 2026 | Testimonial outreach begins / Annual web filter vendor recheck |

---

## Notes for Next Year (2027 Cohort Planning)

- **Lock audience segmentation before any outreach starts.** The six-audience breakdown (DEC-028) was discovered during a drafting session. Map who needs what before writing a single message.
- **Lock companion policy before outreach starts.** The one-guardian / one-night / distance-tier-rate rule (DEC-031) was established reactively in response to Cole. Set it in advance.
- **Data audit before comms planning.** Three data errors surfaced during the July 10 session (Osvaldo's Travel Helper, Yadira's RSVP, Cole's stale travel plan). Run a reconciliation pass before drafting begins.
- **Verify flight cost estimates with live fares before setting card amounts.** The $135/$200 caps were still unverified estimates as of July 10.
- **Resolve the minors mechanism before invite season.** Daniel/Sofia (minors attending without on-site guardian) was unresolved going into the event. Needs a decision — release form, designated point of contact — before any minor is invited or issued a card.
- **Ramp limit increase conversation.** $5K credit limit looks adequate for 2026's estimated $2–3K exposure but uses unverified fare inputs. Raise the limit discussion with Ramp before 2027 cohort numbers are set.
- **The travel-confirmation message template (DEC-029) is proven.** Use it as the starting point next year.

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
