# Parking Lot — Campus Ready Foundation

**Purpose:** Capture valuable ideas without derailing current work. Review when phase completes.
**Last Updated:** May 29, 2026

---

## Ground Rules

1. **New ideas go here first** — not into active work
2. **Review after each phase completion** — decide what to pull in next
3. **Ideas aren't lost** — they're just sequenced appropriately
4. **Some ideas may become obsolete** — that's okay

---

## Future Enhancements

### P-001: Checklist → Grant Fulfillment Integration

**What it is:** Use school-specific packing list data from the Checklist Intelligence System to inform kit contents for each award recipient.

**Why it matters:** Currently, kits are based on a general product list. College-specific data would ensure students receive items their particular school recommends, making kits more relevant and complete.

**Dependencies:** Checklist Intelligence data must reach critical mass across schools. Fulfillment system needs mapping between canonical items and purchasable products.

**When to revisit:** After 2026 fulfillment cycle — assess data coverage and operational feasibility.

---

### P-002: Automated Application Monitoring Dashboard

**What it is:** Real-time view of application volume, completion rates, and demographic patterns during the open window.

**Why it matters:** Eric currently checks the Master sheet manually. An automated dashboard would surface trends (application pace, geographic distribution, common drop-off points) without manual analysis.

**When to revisit:** Before 2027 application cycle.

---

### P-003: Board Portal for Essay Scoring

**What it is:** A dedicated web interface for board members to score essays, rather than working directly in Google Sheets.

**Why it matters:** Google Sheets works but isn't ideal for the essay review experience. A dedicated UI could present essays more readably, enforce scoring ranges, and track progress.

**Dependencies:** Board size and scoring workflow stability.

**When to revisit:** If board expands beyond 5 members, or if scoring quality issues emerge.

---

### P-004: Donor Impact Reporting

**What it is:** Automated reporting showing donors how their contributions translated into student support — number of kits, schools served, student outcomes.

**Why it matters:** Donor retention depends on feeling connected to impact. Currently, impact reporting is manual.

**When to revisit:** After first full 2026 cycle provides data.

---

### P-005: Website Testimonial Gallery

**What it is:** Public display of student testimonials (photos, videos, quotes) from grant recipients who've given permission.

**Why it matters:** Social proof is the strongest tool for both fundraising and application volume. Currently, testimonials are collected but not displayed on the website.

**Dependencies:** Requires sufficient testimonials with release permission from 2026 cohort.

**When to revisit:** After September 2026 testimonial outreach cycle.

---

### P-006: Consumer Platform Revenue Integration

**What it is:** Formal financial pipeline from campusready.co affiliate revenue to Foundation funding.

**Why it matters:** The commercial platform was designed to fund the Foundation. As affiliate revenue materializes, the operational and legal structure for transferring funds needs to be established.

**Dependencies:** Consumer platform launch, affiliate program approval, revenue materialization.

**When to revisit:** After consumer platform has 3 months of revenue data.

---

### P-007: Geographic Expansion (Beyond California)

**What it is:** Expanding the Foundation's service area beyond California to national coverage.

**Why it matters:** The systems are designed for national scale. Currently California-focused for Year 1.

**Dependencies:** Funding capacity, fulfillment logistics for cross-country shipping, FPG table updates for AK/HI.

**When to revisit:** After 2026 cycle assessment.

---

### P-008: Annual Web Filter Vendor Recategorization Check

**What it is:** Each September, before the application window opens, recheck campusready.foundation and campusready.org across all major web filtering vendors to confirm categorizations are still in place.

**Vendors and contact points:**
- Fortinet: fortiguard.com/webfilter
- Barracuda: barracudacentral.org/lookups
- Cisco Talos: talosintelligence.com/reputation_center/web_categorization
- Lightspeed: support@lightspeedsystems.com
- GoGuardian: support@goguardian.com
- Securly: support@securly.com

**Why it matters:** Fortinet flagged campusready.foundation as "Suspicious / Newly Registered Domain" in 2026. Students applying from school networks were blocked. Categorizations can lapse or reset — an annual check ensures no student hits a wall during the open window.

**When to revisit:** Every September. Estimated time: 45 minutes.

---

### P-009: Add Transport Question to Application Form (Next Cycle)

**What it is:** Add a question to the application asking how the student plans to get to campus. Suggested options: "I'll drive / A parent or family member will drive me / I'll need help with transportation."

**Why it matters:** CRF currently assumes no student has access to a car — the right conservative assumption for this population. But some students or families may have vehicles and be willing to drive even 400–500 miles. This single question would allow CRF to target travel grant resources precisely rather than budgeting for transport that may not be needed.

**When to revisit:** Before 2027 application window opens. Low implementation effort — one new form field.

---

### P-010: Apps Script Distance Calculator Fix (Urgent — Before 2027 Cycle)

**What it is:** The Apps Script distance calculator geocodes from full address strings rather than ZIP codes. This produces incorrect results when students mistype city names. 18 of 42 students in the 2026 cohort had incorrect distances — some off by 10x (e.g., Santa Rosa → Davis showing 927 miles instead of 53 miles). Three students entered their home address as their college address, requiring manual correction.

**Fix:** Switch to ZIP-code-only geocoding using `student_zip` and `college_zip` fields (both reliably collected by the form's autocomplete system). Keep driving distance from Maps API — do not switch to straight-line. Add a sanity check: if calculated distance exceeds 1.5x a reasonable threshold for the route, flag the row as "Distance Review Needed" rather than writing silently.

**When to revisit:** Before 2027 application window. This is a Claude Code task. See SYSTEM_ARCHITECTURE.md for the distance calculation context.

---

### P-011: Application Analysis — Port to HTML/CSS/SVG (Long-Term)

**What it is:** Rebuild the Application Analysis document as semantic HTML + CSS with SVG charts, with PDF output via headless rendering. This replaces the current Word/docx pipeline.

**Why it matters:** Every pass through a non-Word editor damages something in the current docx format — charts rasterize, fonts reshuffle, paragraph relationships break. HTML as source eliminates every round-trip damage problem, gives full design control, and makes chart updates trivial (SVG, not PNG swaps).

**Current state:** The 2026 layout is locked and both FINAL documents are produced. This port is the right long-term path but was explicitly deferred until the layout was stable.

**Dependencies:** 2026 layout fully locked (done). Decision to port before or after 2027 cycle is still open.

**When to revisit:** Before beginning 2027 cycle prep. Eric has signaled this is the right long-term direction.

---

### P-012: Resolver Validation for Unmatched Gender+Scent+Category Combinations (Pre-2027 Priority)

**What it is:** Add a validation step to the resolver that flags — rather than silently drops — any Gender+Scent+Category combination for which no Product_Logic entry exists. The flag should identify the student name, category, scent, and gender, surface the issue in the Errors tab, and block Shopping List generation from proceeding with an incomplete list.

**Why it matters:** In 2026, "Vanilla & Botanicals" had zero catalog entries for four personal care categories. The resolver dropped those line items with no error, no flag, and nothing in Shopping_List or the order files to indicate anything was missing. 19 of 35 students (54%) were each missing up to 4 items — 72 missing line items total — and the gap was only caught by manually diffing two students' order files. At 2027's target scale (100–125 students), a 54%-affected rate would produce 270+ missing items before anyone notices. The silent-drop behavior is the more important fix — it would catch any future catalog gap, not just this one scent.

**Fix scope (two parts):**
1. **Resolver validation pass:** After the resolver runs, check every resolved student row against the full expected set of categories. Log any unmatched combination (student + category + criteria) to the Errors tab and surface a clear summary before Shopping List generation proceeds.
2. **Vanilla & Botanicals catalog entries:** Add real, vetted SKUs to the Personal_Care research tab for all four affected categories (Deodorant, Body Wash, Shampoo & Conditioner Set, Shaving Cream) so the resolver can match the scent directly. Until this is done, the Soft & Floral fallback (DEC-067) must be applied manually to any Vanilla & Botanicals student's order file.

**Also recommended:** Audit all other scent-dependent categories for the same class of gap before 2027 — only the four personal care categories were confirmed affected in 2026, but no systematic check was run across all categories and all scent values.

**Dependencies:** Grant Fulfillment Database (Personal_Care research tab) and Apps Script codebase (resolver function). This is a Claude Code task.

**When to revisit:** Before the 2027 product research phase (Phase 2A, October–November 2026). High priority — do before any new scent options are added to the intake form.

---

*Ideas captured here are respected, not forgotten. They'll get their turn when the time is right.*
