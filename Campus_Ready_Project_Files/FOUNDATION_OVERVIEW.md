# Campus Ready Foundation — Overview

**Owner:** Eric Lilavois, Founder
**Last Updated:** June 7, 2026

---

## Who We Are

Campus Ready Foundation is a 501(c)(3) nonprofit that supports first-time college students from low-income households with the essentials they need to start strong. We provide one-time grants averaging $2,500 to cover what financial aid typically doesn't: move-in essentials, travel to campus, and early-arrival support.

Our target population is families earning $40K–$75K — too high for substantial need-based aid, too low to have emergency savings. For these students, arriving unprepared can cascade into excessive work hours, lower GPAs, missed opportunities, and ultimately dropping out. Our grants interrupt that cycle at the source.

This isn't charity. It's strategic investment in human potential with measurable returns.

---

## Who Eric Is

Eric is the founder and primary operator of Campus Ready Foundation. He comes from a hospitality executive background — strong on operations, systems design, and process optimization. He is not an engineer, but he's building sophisticated technical systems with AI assistance and learning as he goes.

Eric co-founded Campus Ready with his wife Karen after a personal realization during their son's college move-in at Chapman University: families with fewer resources face enormous hidden costs just to get started. That moment — Karen asking "How do families less fortunate afford all this?" during a Target run for forgotten essentials — became the founding story.

---

## Board of Directors

| Name | Role |
|------|------|
| Eric Lilavois | Founder, primary operator |
| Karen Dantzler | Co-founder |
| Janie Green | Board member |

---

## Advisory Board

| Name | Affiliation |
|------|-------------|
| Xochitl Polanco | Advisory board member |
| Terri Linder | Academic & College Counselor, St. Helena High School |

---

## The Five Systems

Campus Ready Foundation runs on five interconnected systems. All are built primarily on Google Workspace (Sheets, Apps Script, Drive) with Cloud Run functions for heavier processing and Vercel for form proxies.

### 1. Application System
Students apply via an HTML form at campusready.org/apply. Submissions flow to a Google Sheet (Master), generate a PDF, and trigger confirmation emails. Applications are scored using a 100-point rubric: 70% objective criteria (financial need, household circumstances, distance) auto-calculated from application data, 30% essay review scored independently by board members. Winners are selected and transferred to Grant Fulfillment.

**Key components:** Application form (HTML), Apps Script (doPost handler, PDF generation, email), Application Reviews spreadsheet (Master, Final_Review, Board_Essays tabs), scoring rubric, IPEDS-backed college typeahead picker.

### 2. Grant Fulfillment System
Award recipients receive a personalized email with a unique link. They verify enrollment and housing via a multi-step web form (award.campusready.org), then customize their kit through preference selections. Their selections populate a shopping list. Campus Ready purchases and ships personalized kits. After move-in, students are invited to share testimonials and receive a $50 gift card as thanks.

**Key components:** Grant Fulfillment Database (Google Sheet), Customize Your Kit form (HTML), Kit Form Email system (sendKitFormEmails), personalized link auto-verify, Vercel proxy, Google Drive (document storage), Apps Script (rebuildProductLogic, shopping list generation, email templates).

### 3. Application Analysis Pipeline
An annual Python pipeline that produces the Application Analysis document — a data-rich report on the cohort. Two versions from one source: an internal version (full data, for the board) and a redacted external version (for donors). Both are produced in a single pipeline pass and cannot drift apart.

**Key components:** Python scripts (`_extract_essays.py`, `_analyze_applications.py`, `fill_analysis_doc.py`), Word/docx output with baked-in PNG charts, `derive_external()` for donor redaction.

### 4. College Checklist Intelligence System
An automated six-stage pipeline that discovers packing list URLs from ~1,600 U.S. residential colleges, extracts items, and matches them to Campus Ready's 48 canonical products. Built on Google Cloud Run functions, Gemini AI with Google Search grounding, and Google Sheets for data management.

**Key components:** 6 Cloud Run functions (discover-urls, analyze-urls, retry-flagged, extract-items, fallback-extraction, process-intake), Master Sheet, Intake Form, Apps Script menu tools.

### 5. Website (campusready.org)
The public face of the organization. Static HTML site hosted on Vercel via GitHub auto-deploy, with Tailwind CSS styling. Communicates mission and story, hosts the student application, provides donor information via Givebutter, and showcases partnerships. Brand identity uses Playfair Display (headlines) and Inter (body), teal color palette (#14b8a6 primary), glass morphism effects.

**Key components:** HTML pages, shared header/footer includes, Google Analytics, Vercel (form proxies and hosting).

---

## How Systems Connect

```
                    campusready.org
                    (Website + Application Form)
                              │
                              ▼
                    Application Reviews
                    (Google Sheet + Apps Script)
                              │
                     [Board scores essays]
                     [Admin sets Award Status]
                              │
                    Transfer Winners ──▶ Grant Fulfillment Database
                                        (Google Sheet)
                                              │
                                    [Personalized email → ?id= link]
                                    [Student verifies docs]
                                    [Student selects preferences]
                                              │
                                        Shopping List ──▶ Kit Assembly ──▶ Delivery
                                              │
                                        Testimonial Invite ──▶ Gift Card

    College Checklist Intelligence
    (Cloud Run pipeline)
         │
         ▼
    School-specific packing lists ──▶ Inform kit contents (planned integration)
```

---

## Related Project: Campus Ready Consumer Platform

Eric also operates campusready.co, a commercial affiliate platform that helps college freshmen prepare for move-in day with school-specific product recommendations. Revenue from affiliate commissions funds the Foundation. The consumer platform has its own separate project documentation and agent system.

The Foundation and commercial platform share:
- The same GCP project (`campus-ready-checklist`)
- The College Checklist Intelligence System (data feeds both)
- Eric's time and attention

They do NOT share: codebase, hosting, design system, or agent documentation. The Foundation project is independent.

---

## How to Work with Eric

**Communication style:**
Eric values warm, friendly, sophisticated communication. Use his name. Be direct but kind. Treat every interaction as a genuine collaboration — not a transaction.

**Your role as an agent:**
You are an expert advisor. Provide recommendations, challenge incorrect assumptions, proactively offer better solutions, and explain your reasoning. Eric wants to understand, not just implement.

**Working principles:**
- Understand before acting — clarify the goal before diving into solutions
- Complete solutions over patches — favor clean, deployable approaches
- No code until approach is approved — discuss strategy first
- Batch clarifying questions at the end of your response
- End with momentum — always close with a clear next step

---

## Quick Reference

| Resource | Purpose |
|----------|---------|
| AGENT_CHECKLIST.md | Read first, every session |
| FOUNDATION_OVERVIEW.md | This doc — mission, systems, people |
| SYSTEM_ARCHITECTURE.md | Technical architecture across all five systems |
| CURRENT_STATUS.md | What's happening now |
| DECISION_LOG.md | What's been decided |
| HANDOFF_*.md | Agent-specific context and scope |
| PARKING_LOT.md | Deferred ideas — good for "what about X?" questions |

---

*When in doubt, ask. Eric would rather clarify than have you guess.*
