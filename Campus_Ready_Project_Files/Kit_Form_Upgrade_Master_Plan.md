# Kit Form Upgrade — Master Plan

**Project:** Campus Ready Foundation — Customize Your Kit Form
**Director / Reviewer:** Mastermind (strategic advisor). All agent output returns here for review before it's accepted.
**Builder:** Claude Code
**Supporting agents:** Design, Copy. (Experience/UX agent available if needed — not expected to be required.)
**Owner / decision authority:** Eric Lilavois
**Created:** May 29, 2026
**Hard deadline:** June 15, 2026 (Eric leaves for vacation; prefers not to work while away)
**Supersedes:** `Kit_Form_Upgrade_Sprint_Plan.md` (May 29) and `Kit_Form_Upgrade_Action_Plan.md` (May 22). Both are retired. Where they conflict with this document, this document wins.

---

## 0. How to Use This Document (read first if you're picking this up cold)

This is a **portable master plan**. It is written so that any agent — a fresh Mastermind instance, the Build agent, Design, or Copy — can read it with no prior conversation context and know what we're building, why, what's been decided, and what to do next.

**The working model:**
- **Mastermind directs and reviews.** Eric brings each agent's output back to Mastermind for review and confirmation before it is accepted as done. No task is "complete" until it has passed that review. The status table in §7 is the source of truth for what's been accepted.
- **Claude Code builds.** All code, all commits.
- **Design and Copy** produce specs and assets, not committed HTML. Build integrates their approved work.
- **Eric approves.** Copy must be Eric-approved before Build implements it. Eric holds the two external dependencies (Firestore export access, copy approval) that gate the schedule.

**Critical capability boundary — who can touch what:**
Claude Code works inside the **repo** — it directly authors and commits the HTML, JS, and Apps Script `.gs` files under version control. It **cannot reach Google's runtime**: it cannot read or write the **Firestore** (DormShopper's data) or the **live Grant Fulfillment Google Sheet** (recipient rows, resolver, catalog tabs). For anything touching those, Claude Code **authors the code or script and the step-by-step instructions; Eric executes it** (typically from the Apps Script editor or the Firebase console), guided by the agent in real time, and reports results back for verification. The rule, stated once: **Claude Code authors; Eric (guided) executes anything that touches Firestore or the live Sheet.** Tasks with this split are tagged **[Eric executes, guided]** below.

**If you are an agent resuming this work:** check §7 (Status Tracker) for the current state, §6 (Sequencing) for what's active, and §4 (the decisions) so you don't reopen settled questions. If something in here is stale, flag it to Eric rather than guessing.

---

## 1. The Goal, in One Paragraph

Rebuild the Customize Your Kit form (live at `award.campusready.org/Customize_Your_Kit.html`) so a grant recipient feels the form was made *for them*. When they open it, it recognizes them by email, knows their school, renders in that school's spirit colors, greets them by name, surfaces a few school touches (slogan, mascot), gives them a link to their school's own official packing list, and lets them set kit preferences through a warm, visual, category-by-category popup interface — not the flat grey questionnaire it is today. The standard we're matching is the *feel* of DormShopper. The mechanism is a port of DormShopper's proven interaction patterns into the Foundation's environment.

---

## 2. The Single Most Important Design Principle: Copy the Interaction, Not the Engine

This is the decision that keeps the project from ballooning. Read it carefully — every prior plan got tangled here.

DormShopper is a **shopping app**. It ingests each school's real packing list, runs a large item-normalization engine (`normalizeSchoolItems()` — compound-item splitting, dedup, bundle expansion, universal-item injection, category sorting), and decides item-by-item which preference popup to show via `getPopupTrigger()`. That engine reads a live Firestore `items` collection per school.

**The grant form does none of that, and should not.** Grant recipients do not get the full shopping experience. They customize a **fixed Campus Ready kit** — the same set of categories for every student — and they get a *link* to their school's official list. The catalog is closed and known. There is no per-school item extraction.

Therefore:
- **PORT** the *interaction pattern*: the modal popup shell, the color-swatch grid, selected-state rings, the "expand for more colors" pattern, the scent grid, gender pills, firmness cards, and the school-color theming function. These are the things that make DormShopper feel good. They live mostly in `preferences-popup.css` and the *rendering* halves of the popup functions.
- **DO NOT PORT** the engine: `normalizeSchoolItems()`, `getPopupTrigger()`'s decision tree, the `items` Firestore collection, `PRODUCT_TYPE_MAP` / `CLEANING_SUBTYPE_MAP` / `BUNDLE_EXPANSIONS`, and the per-school item loading in `getSchoolItems()`. None of it is needed to drive a fixed-catalog kit whose options are known in advance.

The form already knows what's in a Campus Ready kit — it's the same kit for everyone. So the categories and their options are **defined in the form against the Grant Fulfillment catalog** (the `Grant_Fulfillment_Database` workbook — Bedding, Towels, Pillows, Accessories, Personal_Care, Universal Products tabs), not derived from per-school data. The catalog is authoritative on what products, colors, and resolver keys exist (see Decision 12).

**The clean line: take everything from DormShopper's `school_brands` record. Take nothing from its `items` collection.**

---

## 3. Architecture: Static JSON File, Not a Live Database

**Decision: the form's school data is a static JSON file the Foundation owns, refreshed once a year. No Foundation Firestore, no mirror/sync job, no runtime database lookup.**

Why: the only school-specific data the form needs is static reference data that changes at most once a year (a college does not change its spirit color mid-semester). The sprint plan proposed standing up a separate Foundation Firestore and a scheduled job mirroring DormShopper's database into it, with a Vercel lookup endpoint. That is live-database infrastructure — new billing, new credentials, new secrets in Vercel, a sync job that can silently fail and leave stale data — solving for freshness the form doesn't need. It is the wrong tool.

Instead: **export the needed fields once from DormShopper's Firestore into `crf_schools_kit.json`, deployed alongside the form.** The form reads it directly on load — exactly the pattern the application picker already uses with `crf_schools.json`. Refresh annually during the existing September IPEDS refresh window. Same rhythm Eric already runs.

This also satisfies the 501(c)(3) entity-separation requirement cleanly: the Foundation owns its own data file and never reaches into LilaVine's live database at runtime. The one-time export is an IP donation from LilaVine, LLC to Campus Ready Foundation (document it for Foundation records).

### The data file: `crf_schools_kit.json`

One record per school, **keyed by UNITID** (the same IPEDS ID the application picker already uses — no ID translation anywhere). Fields, all sourced from DormShopper's `school_brands` collection:

| Field | Source (DormShopper `school_brands`) | Used for |
|-------|--------------------------------------|----------|
| `unitid` | `school_id` | Join key — matches the recipient's UNITID |
| `name` | school name | "You're heading to [name]" |
| `primary_color_hex` | `primary_color_hex` | Header / accent theming |
| `secondary_color_hex` | secondary color | Secondary accent |
| `text_color_override` | `text_color_override` (optional) | Contrast override when present |
| `slogan` | school slogan | Personalization touch |
| `mascot` | mascot name | Personalization touch |
| `checklist_url` | official checklist URL | "See [School]'s official list →" link |

Missing fields degrade gracefully: no color → CRF teal `#469E92` default; no slogan/mascot → omit that touch; no checklist URL → hide the link button.

---

## 4. Settled Decisions (do not reopen without Eric)

1. **Copy the interaction, not the engine.** (§2) Confirmed by Eric, May 29.
2. **Static JSON file, not a Foundation Firestore + mirror.** (§3) Confirmed by Eric, May 29.
3. **All schools, not 42.** The data file covers DormShopper's full school set and is refreshed yearly. No per-cohort throwaway work.
4. **UNITID is the join key** everywhere. No ID translation.
5. **The checklist is a link, not rendered items.** Students get a button to their school's official list URL. The form does not parse or render the school's individual items.
6. **Personalization is generous because it's cheap.** Pull all of `school_brands` (colors, slogan, mascot, checklist URL) — these are static fields, free to carry. The expense was only ever the item engine, which we're not porting.
7. **Awards already went out May 27.** The "add college data before awards" task from the May 22 plan is now a **backfill** of 41 existing records (§5, Task C1).
8. **Real deadline is June 15** (Eric's vacation), not July 1. Achievable without drama because the engine is excluded. July 1 (preferences-link send date to winners) is the hard backstop if June 15 slips.
9. **Platform constraint:** static HTML on GitHub Pages, served at `award.campusready.org`, Vercel proxy to Apps Script. No React, no build step. All ported code must work within this.
10. **Additive-only backend changes.** New form fields must be reflected in the Apps Script resolver and the Grant_Recipients schema. Never break or rename existing columns.
11. **Color language:** Pink is Pink. Not blush, not rose. (Carried from May 22 plan — Eric's standing preference.)
12. **The Grant Fulfillment catalog is authoritative on products, colors, and resolver keys.** Both prior plans had the color set wrong. Verified today: bedding and towels are **White / Gray / Navy / Cream**; pillows are **Soft / Medium / Firm**; scent lanes are **Unscented / Fresh & Clean / Vanilla & Botanicals**; gender is **Men / Women / Unisex**; slides are sized **S / M / L / XL**. The comforter and all Universal Products ship to everyone (not choices). Any new option (Pink, Mint, slides color) requires a verified catalog SKU before it can be fulfilled (Task D5).
13. **Build the Pink/Mint/slides-color path now; fulfill when SKUs land.** Eric's call (May 29): C5 builds the full capability rather than deferring it. Code and catalog are independent tracks.

---

## 5. The Work — Three Phases

Phases 1 and 2 run in parallel and start immediately. Phase 3 depends on both.

### PHASE 1 — Foundation (Build / Claude Code) — start now, no dependencies on the others

This phase makes the form *able* to be school-aware. Without it, nothing personalized works.

**Task C1 — Backfill college data + fix Transfer Winners.** *(Keystone. Zero dependencies. Start first.)* **[Eric executes, guided — touches the live Sheet]**
Transfer Winners ran May 27 without carrying college name + UNITID onto the recipient records. Backfill both onto the 41 existing `Grant_Recipients` rows, sourced from the Master sheet (college UNITID is in Master column AX, header "College UNITID", added May 21). Then update the Transfer Winners function so future cycles carry both fields automatically.
**Why it's the keystone:** UNITID on the recipient record is the key the form uses to look up everything school-specific. No UNITID, no theming, no slogan, no checklist link.
**Execution split:** Claude Code writes (a) the corrected `transferWinnersToGrantFulfillment()` in the `.gs` repo file so future cycles carry college name + UNITID automatically, and (b) a one-time backfill routine for the 41 existing rows. Eric runs both from the Apps Script editor against the live sheet, guided step by step.
**Verify:** 41 rows populated with name + UNITID; existing columns unchanged; a test run of the fixed Transfer Winners carries both fields.

**Task C2 — Extend `checkStudentStatus()` to return `collegeName` + `collegeUnitId`.**
The form's email-validation step calls this function. It currently returns name/email/cohort/housing/acceptance. Add the two college fields (now present on the recipient record after C1) to the return object.
**Depends on:** C1.
**Verify:** form receives `collegeName` and `collegeUnitId` for a transferred student.

**Task C3 — Export `crf_schools_kit.json` from DormShopper Firestore.** **[Eric executes, guided — touches Firestore]**
Export the eight fields in §3's table from DormShopper's `school_brands` collection, keyed by UNITID, into a static JSON file deployed with the form. Document the LilaVine → Foundation IP donation for Foundation records.
**Execution split:** Claude Code writes the export script (Firebase Admin SDK, run with Eric's LilaVine credentials) or, if simpler, walks Eric through a console export. Eric runs it and hands back the JSON; Claude Code commits the file to the form repo. **Pull only `school_brands`. Do not touch `items`.**
**Depends on:** Eric confirming export access (Dependency D1).
**Verify:** file loads on form init; spot-check several schools (one with full data, one missing a color, one missing a checklist URL) for graceful degradation.

### PHASE 2 — Experience (Design + Copy) — start now, parallel to Phase 1

Produces specs and assets. Build integrates them in Phase 3. **Copy must be Eric-approved before Build touches the form (Dependency D2).**

**Task X1 — Copy.** Scent descriptors (plain, everyday language — not marketing). Shipping explainers + tooltip text (home delivery = repack for campus; campus delivery = mail-center pickup). Style-card descriptions (warmer than DormShopper's terse versions, grant-recipient tone). Gift-card opt-in language including content-release permission.
**Output:** approved copy doc → Mastermind review → Eric approval.

**Task X2 — Design.** CRF visual spec applied to the popup interaction: teal `#469E92`, orange `#DD693A`, yellow `#FCB040`; Playfair Display headers, Inter body; category icons; celebratory (not bureaucratic) tone. Any style-card images if the style selector is kept.
**Output:** design spec + assets → Mastermind review.

### PHASE 3 — The Form Rebuild (Build / Claude Code) — after Phase 1 + approved copy

**Sequenced internally — these tasks all touch `Customize_Your_Kit.html`, so they run in order, never concurrently.**

**Task C4 — Port the popup interaction, wired to the resolver dimensions.** Two requirements held together: the popups carry the **DormShopper interaction design** (modal popup shell, color-swatch grid, selected-state rings, "expand for more colors," scent grid, gender pills, firmness cards — from `preferences-popup.css` and the *rendering* halves of the popup functions), AND the categories/fields **mirror the Grant Fulfillment resolver dimensions** so every selection resolves to a product.

The resolver matches each product on `PRODUCT TYPE | GENDER | SCENT | STYLE`, assembled into a `Unique Lookup Key` (e.g. `Towel Set|Navy`, `Deodorant|DeodorantMenFresh & Clean`). The form must collect exactly the inputs that resolve. Mapped to the live `Student_Selections` schema (the 9 real preference fields), the categories are:

- **Bedding** → bedding color *(swatch picker)*; pillow firmness *(Soft / Medium / Firm — firmness cards)*
- **Bath** → towel color *(swatch picker)*; slides size *(S / M / XL by gender)*; slides color *(swatch — see C5)*
- **Personal Care** → gender preference *(pills)*; scent preference *(scent grid: Unscented / Fresh & Clean / Vanilla & Botanicals)*; deodorant type
- **Style** → style preference *(keep the style-card treatment — see note below)*
- **Shipping** → home or college *(with the explainer/tooltip copy from X1)*

Note that Gender and Scent are **load-bearing**: a single Gender pick and single Scent pick cascade across the entire personal-care line (shaving, razors, deodorant, shampoo, body wash, etc.) in the resolver. The popup sets one of each; the resolver fans them out. This is a different model than per-item color and the UX should make the single choice feel deliberate.

The comforter and the entire Universal Products set ship to every student regardless of choice — surface them as "included in your kit" (a generous-kit moment), not as decisions.

No Firestore `items` read. No `normalizeSchoolItems`. No `getPopupTrigger` decision tree. Categories and options are defined in the form against the catalog, not derived from per-school data.

**Style-card treatment — keep it.** `STYLE` is currently lightly used in the catalog (meaningfully only on the Toiletry Bag), but Eric is keeping the style-card UI in scope to support adding style labels to more products later (e.g. desk lamp). Design should build the treatment but not over-invest in bespoke per-style illustration until the scope of `STYLE` is decided.

**Depends on:** C2, X1 (approved), X2.

**Task C5 — Build Pink/Mint bedding + towels and slides color (full path).** **[Form code: Claude Code. Sheet-side schema + resolver: Eric executes, guided.]** Build the complete capability for the new colors: swatch UI in the form (swatch pickers replace any remaining dropdowns), the new `slides_color` field, the Apps Script resolver handling, and the Grant_Recipients / Student_Selections schema additions (additive only — never rename or break existing columns). Verified color set today is **White / Gray / Navy / Cream** for bedding and towels; this task adds **Pink** and **Mint** to both, and adds **slides color**.

**Resolver dependency (not a build blocker):** the resolver matches selections to products via the `Unique Lookup Key`. A `Sheet Set|Pink`, `Towel Set|Mint`, or colored-slide selection resolves to an actual order only once a verified product row with that key exists in the catalog (the Bedding / Towels / Accessories tabs). So: **Build delivers the full code path by June 15; the new colors become fulfillable the moment the verified SKUs are added (Task D5).** The two are independent — the code can ship before the SKUs exist, and the SKUs can be added before or after without blocking the build. Until SKUs exist, a QA guard should confirm the new swatches render and submit correctly even though they won't yet resolve.
**Depends on:** C4.

**Task C6 — School-aware rendering.** Form reads `crf_schools_kit.json` (C3) by the recipient's UNITID (C2). Applies spirit color via the ported `setSchoolColors()` (a self-contained ~20-line luminance/contrast function — ports nearly verbatim; CRF teal default on miss). Greets by name + school. Surfaces slogan/mascot touches where present.
**Depends on:** C4, C3.

**Task C7 — Checklist link + gift-card moment.** A button — "See [School]'s official list →" — to `checklist_url` (hidden if absent). Move the $50 gift card from footnote to a celebratory opt-in card near the top of the preferences step, with content-release permission (copy from X1).
**Depends on:** C6, X1.

---

## 6. Sequencing to June 15

| Window | Active work |
|--------|-------------|
| **May 29–31** | Kickoff. **C1 backfill starts immediately** (no dependencies). Phase 2 (Copy X1, Design X2) starts. Eric confirms Firestore export access (D1) so C3 can start. |
| **June 1–4** | C1 done → C2. C3 export once D1 confirmed. Copy + Design deliver → Mastermind review → Eric approves copy (D2). |
| **June 5–9** | C4 popup interaction port. C5 color/options + resolver. |
| **June 10–12** | C6 school-aware rendering. C7 checklist link + gift-card moment. |
| **June 13** | Full QA on the live form against real recipient records across several schools — full brand data, missing-color fallback, missing-checklist fallback. Mastermind review of the assembled form. |
| **June 14** | Fixes from QA. Final Eric sign-off. |
| **June 15** | **Deploy. Upgraded form live at `award.campusready.org`.** |

The two things that can slip the date, both on Eric, both early: **D1** (export access — blocks C3) and **D2** (copy approval — blocks C4). Clear them in the first few days and the build has slack.

---

## 7. Status Tracker (the source of truth for "what's done")

Nothing is "done" until Mastermind has reviewed the agent's output and Eric has confirmed. Update this table as work is accepted.

| ID | Task | Owner | Depends on | Status |
|----|------|-------|-----------|--------|
| D1 | Confirm DormShopper Firestore export access | Eric | — | ⬜ Not started |
| D2 | Approve Copy before Build implements | Eric | X1 | ⬜ Not started |
| D3 | IP donation record (LilaVine → CRF) | Eric | — | ⬜ Not started |
| D5 | Source + verify Pink/Mint bedding+towel SKUs and colored-slide SKUs into the catalog | Eric | — | ⬜ Not started |
| C1 | Backfill college data + fix Transfer Winners | Build | — | ⬜ Not started |
| C2 | `checkStudentStatus()` returns college fields | Build | C1 | ⬜ Not started |
| C3 | Export `crf_schools_kit.json` (`school_brands` only) | Build | D1 | ⬜ Not started |
| X1 | Copy (scent, shipping, style, gift-card) | Copy | — | ⬜ Not started |
| X2 | CRF visual spec + assets | Design | — | ⬜ Not started |
| C4 | Port popup interaction → fixed categories | Build | C2, X1✓, X2 | ⬜ Not started |
| C5 | Pink/Mint + slides-color full path (UI, resolver, schema) | Build | C4 | ⬜ Not started |
| C6 | School-aware rendering (theming, greeting) | Build | C4, C3 | ⬜ Not started |
| C7 | Checklist link + gift-card moment | Build | C6, X1 | ⬜ Not started |

Legend: ⬜ Not started · 🟡 In progress · 🔵 Submitted for review · ✅ Accepted

---

## 8. Collision Rules for Parallel Agents

1. **Only one agent edits `Customize_Your_Kit.html` at a time.** All Phase 3 tasks are serial.
2. Design and Copy produce specs and assets, never committed HTML. Build integrates.
3. Apps Script (`Grant_Fulfillment_Script.gs`) is touched only in C1, C2, and C5 — all Build, sequenced.
4. Every task branches off `staging`. Squash-merge to `main`. Never push to `main` directly.
5. All agent output returns to Mastermind for review before it counts as done (§7).
6. **Claude Code authors; Eric (guided) executes anything touching Firestore or the live Sheet.** Claude Code commits repo code directly but cannot reach Google's runtime — it writes the scripts/instructions and Eric runs them, reporting back for verification. Tasks affected: C1 (backfill), C3 (Firestore export), C5 (sheet schema + resolver).

---

## 9. Source Files (DormShopper — reference for the port)

Provided by Eric, May 29. These are the *reference* for the interaction port — read the rendering/CSS, leave the engine.

| File | What to take | What to leave |
|------|--------------|---------------|
| `preferences-popup.css` | All of it — popup shell, swatches, scent grid, gender pills, firmness, unscented row | — |
| `preference-popups.js` | Rendering halves: swatch grid build, selected-state handling, expand-colors, Done flow | `getPopupTrigger()` decision tree, `canonicalizeColorKey` engine coupling |
| `preference-popup-universal.js` | Interaction patterns only | Item-driven logic |
| `school-helpers.js` | `setSchoolColors()` (ports ~verbatim) | `loadSchools`/`getSchoolItems`/`normalizeSchoolItems` (the entire item engine) |
| `checklist.js` / `checklist.css` | Visual reference only | Item rendering — we use a link, not a rendered list |
| `layout.css` | Layout/responsive patterns as reference | — |
| `firebase.json` | Confirms DormShopper structure; `/list/**` route context | Not used by the grant form |

Note: the grant form reads `crf_schools_kit.json` directly. It does **not** import `firebase-init.js` or make any Firestore calls. `setSchoolColors()` should be adapted to read from the loaded JSON record rather than `state.schoolBrand`.

---

## 10. Key URLs and Brand Reference

| Resource | Value |
|----------|-------|
| Live Kit Form | https://award.campusready.org/Customize_Your_Kit.html |
| Kit Form repo | `ericlilavois/Campus_Ready_Grant_Fulfillment` |
| DormShopper repo | `ericlilavois/DormShopper` |
| DormShopper site | dormshopper.com |
| Vercel proxy (Kit Form) | https://grant-fulfillment-proxy.vercel.app/api/proxy |
| Master sheet — College UNITID | Column AX (header "College UNITID") |
| CRF brand colors | Teal `#469E92`, Orange `#DD693A`, Yellow `#FCB040`, Blue/Black `#417294` |
| Fonts | Playfair Display (headers), Inter (body) |
| CRF teal default (theming fallback) | `#469E92` |

---

*Master plan prepared by Mastermind, May 29, 2026. Mastermind reviews all agent output before it is accepted. Awaiting Eric's go to brief Build, Copy, and Design.*
