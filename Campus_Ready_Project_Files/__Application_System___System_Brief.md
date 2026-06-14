\# Application System — System Brief

\*\*Part of:\*\* Campus Ready Foundation Agent Documentation    
\*\*Last Updated:\*\* December 2025

\---

\#\# Purpose

The Application System is how students request Campus Ready grants. It collects eligibility information, captures two essays, and routes applications through a structured review process. Winners are transferred to the Grant Fulfillment System for kit customization.

\---

\#\# Student Journey

1\. \*\*Discovery\*\* — Student finds Campus Ready via website, school counselor, or referral  
2\. \*\*Application\*\* — Student completes the online form at campusready.foundation/apply  
3\. \*\*Confirmation\*\* — Student receives email confirmation with application ID  
4\. \*\*Review\*\* — Campus Ready scores the application (automated \+ human review)  
5\. \*\*Decision\*\* — Student is notified of award or non-selection  
6\. \*\*Handoff\*\* — Winners proceed to Grant Fulfillment for kit customization

\---

\#\# Architecture

\`\`\`  
┌─────────────────────────────────────────────────────────────────┐  
│                         STUDENT                                 │  
│                    Completes HTML Form                          │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │ POST  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                    APPS SCRIPT (doPost)                         │  
│  • Parses form data                                             │  
│  • Generates unique Application ID                              │  
│  • Calculates distance (home → college via Google Maps API)     │  
│  • Creates PDF of full application                              │  
│  • Writes row to Master sheet                                   │  
│  • Sends staff notification email                               │  
│  • Sends applicant confirmation email                           │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                    GOOGLE SHEETS                                │  
│                                                                 │  
│  Master Tab — One row per application                           │  
│  • Application ID, timestamp, cycle year                        │  
│  • Student info (name, email, phone, DOB, address)              │  
│  • College info (name, address, start date)                     │  
│  • Household data (members, income, FAFSA, SAI)                 │  
│  • Circumstances and affordability concerns                     │  
│  • Essay snippets \+ word counts                                 │  
│  • PDF link, status, distance                                   │  
│                                                                 │  
│  Config Tab — Cycle year, scoring parameters                    │  
│  Final\_Review — Scored applications ready for decision          │  
│  Board\_Essays — Essays formatted for board review               │  
│  Archive — Completed cohorts                                    │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                    GOOGLE DRIVE                                 │  
│  PDF Folder — Stores generated application PDFs                 │  
│  Each PDF contains full application for reviewer reference      │  
└─────────────────────────────────────────────────────────────────┘  
\`\`\`

\---

\#\# Review Process

Applications are scored on a 100-point scale using a transparent rubric. Objective criteria (70 points) are auto-calculated from application data. Subjective criteria (30 points) are scored by board members reviewing essays.

\#\#\# Scoring Categories

| Category | Max Points | Type | How It Works |  
|----------|------------|------|--------------|  
| Financial Need | 40 | Auto-Calculated | Income Per Person (household income ÷ members) scored two ways: ranking within the applicant cohort \+ comparison to Federal Poverty Guidelines. Final score \= average of both. |  
| Household Circumstances | 15 | Auto-Calculated | 1 point per indicator (max 5), scaled to 15 points. Indicators: SNAP/WIC/free meals, housing instability, no internet/computer, parent unemployment, student contributes financially. |  
| Distance & Travel | 15 | Auto-Calculated | Calculated from home → college addresses. 0-50 miles \= 0-2 pts, 51-100 \= 3-6 pts, 101-200 \= 7-12 pts, 200+ \= 13-15 pts. |  
| Essay 1: Award Significance | 15 | Board Scored | Why Campus Ready support is meaningful and necessary. Scored independently by multiple reviewers, then averaged. |  
| Essay 2: Challenge & Resilience | 15 | Board Scored | Demonstrates hardship, initiative, and commitment to college success. Scored independently by multiple reviewers, then averaged. |

\#\#\# Housing Verification (Pass/Fail Gate)

Before scoring, applicants must provide proof of on-campus housing (contract, assignment confirmation, deposit receipt, or housing approval). Applications without verified housing are disqualified regardless of score.

\#\#\# Financial Need Bands

For board review, Financial Need scores are displayed as bands:  
\- \*\*32-40:\*\* Critical need  
\- \*\*24-31:\*\* High need  
\- \*\*12-23:\*\* Moderate need  
\- \*\*0-11:\*\* Lower need

\#\#\# Tie-Breakers

When total scores are tied, priority goes to (in order):  
1\. First-generation college student  
2\. Pell-eligible or comparable indicator  
3\. Documented homelessness, foster care, or verified special circumstances  
4\. Earlier application date

\#\#\# Board Workflow

1\. Each board member scores essays independently  
2\. Individual scores entered into evaluation system  
3\. System averages essay scores across reviewers  
4\. Objective (70) \+ Subjective (30) \= Total Score  
5\. Applications ranked by total score for award decisions

The scoring logic lives in sheet formulas (objective) and the board review workflow (subjective). Final decisions are made by reviewing the Final\_Review tab.

\---

\#\# Key Data Points Captured

| Category | Fields |  
|----------|--------|  
| Identity | Name, email, phone, DOB, address |  
| College | Institution name, address, expected start date |  
| Household | Number of members, annual income |  
| Financial Aid | FAFSA status, SAI (Student Aid Index) |  
| Circumstances | Checkboxes for single parent, disability, job loss, etc. |  
| Affordability | What concerns them most (travel, supplies, meals, etc.) |  
| Essays | Two short essays (snippets stored, full text in PDF) |  
| Signatures | Applicant signature required; guardian if under 18 |

\---

\#\# What Triggers What

| Event | System Response |  
|-------|-----------------|  
| Student submits form | Apps Script processes, writes to Master, emails sent |  
| Staff reviews application | Manual scoring in sheets, formulas calculate objective score |  
| Decision finalized | Status updated in Master |  
| Winner selected | Admin function transfers to Grant Fulfillment Database |  
| Cohort complete | Archive function moves data to Archive tab |

\---

\#\# Admin Functions

The Application Reviews sheet includes menu-driven admin tools:

\- \*\*Transfer Winners to Grant Fulfillment\*\* — Moves approved recipients to the Grant Fulfillment Database with initial status fields  
\- \*\*Archive Current Cohort\*\* — Moves completed cycle data to Archive tab, reads cohort year from Config Tab

\---

\#\# Connections to Other Systems

\- \*\*Grant Fulfillment System\*\* — Winners are transferred with Application ID, name, email, cohort year, and start date  
\- \*\*Website\*\* — Application form is hosted at campusready.foundation/apply  
\- \*\*Email\*\* — Confirmation emails use Campus Ready branding and come from apply@campusready.foundation

\---

\#\# Technical Files (Available on Request)

| File | Contents |  
|------|----------|  
| Application.html | The student-facing form |  
| Application\_Ops\_Apps\_Script | doPost handler, PDF generation, sheet writing, emails |  
| Application\_Admin\_Apps\_Script | Transfer and archive functions |  
| Application\_Rubric | Full scoring rubric with essay criteria and calibration details |  
| Application\_Reviews\_Operations\_Manual | Step-by-step review procedures |  
| Master Sheet Export | Current application data |

\---

\*For technical details like sheet IDs, column mappings, or script modifications, ask Eric for the relevant files.\*