\# Grant Fulfillment System — System Brief

\*\*Part of:\*\* Campus Ready Foundation Agent Documentation    
\*\*Last Updated:\*\* December 2025

\---

\#\# Purpose

The Grant Fulfillment System manages the journey from award notification to kit delivery and follow-up. It handles document verification, preference collection, shopping list generation, and post-move-in engagement. This is where Campus Ready's promise becomes tangible for students.

\---

\#\# Recipient Journey

1\. \*\*Transfer\*\* — Winner is transferred from Application Reviews to Grant Fulfillment Database  
2\. \*\*Notification\*\* — Student receives award email with instructions  
3\. \*\*Verification\*\* — Student uploads housing confirmation and acceptance letter  
4\. \*\*Customization\*\* — Student selects kit preferences (colors, sizes, scents, shipping)  
5\. \*\*Shopping\*\* — Campus Ready shops for personalized items based on selections  
6\. \*\*Delivery\*\* — Kit ships to student's chosen address (home or campus)  
7\. \*\*Follow-up\*\* — After move-in, student is invited to share a testimonial  
8\. \*\*Thank You\*\* — Students who participate receive a $50 gift card

\---

\#\# Architecture

\`\`\`  
┌─────────────────────────────────────────────────────────────────┐  
│                  APPLICATION REVIEWS SYSTEM                     │  
│                  (Winners selected and approved)                │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │ Transfer Winners function  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│              GRANT FULFILLMENT DATABASE (Google Sheet)          │  
│                                                                 │  
│  Grant\_Recipients Tab — One row per winner                      │  
│  • Application ID, name, email, cohort year                     │  
│  • Housing Status, Acceptance Status (Pending → Verified)       │  
│  • Document URLs (stored in Drive)                              │  
│  • Items Selected (Yes/No)                                      │  
│  • Kit preferences (colors, sizes, scents)                      │  
│  • Shipping address                                             │  
│  • Start date, testimonial status, gift card status             │  
│                                                                 │  
│  Shopping\_List Tab — Aggregated items to purchase               │  
│  Testimonial\_Templates Tab — Email/SMS templates                │  
│  Archive Tab — Completed cohorts                                │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│              CUSTOMIZE YOUR KIT FORM (HTML)                     │  
│                                                                 │  
│  Step 1: Email Validation                                       │  
│  • Student enters email                                         │  
│  • Form checks against Grant\_Recipients via Vercel proxy        │  
│  • If found: proceeds. If not: shows error.                     │  
│                                                                 │  
│  Step 2: Document Upload                                        │  
│  • Housing confirmation (PDF/image)                             │  
│  • Acceptance letter (PDF/image)                                │  
│  • Files uploaded to Google Drive                               │  
│  • Sheet updated with document URLs and status                  │  
│                                                                 │  
│  Step 3: Kit Preferences                                        │  
│  • Shipping preference (home vs. campus)                        │  
│  • Shipping address                                             │  
│  • Personal preferences (see table below)                       │  
│  • Submission writes to Grant\_Recipients                        │  
└─────────────────────┬───────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                    GOOGLE DRIVE                                 │  
│  Verification Documents Folder                                  │  
│  • {ApplicationID}\_Housing.pdf                                  │  
│  • {ApplicationID}\_Acceptance.pdf                               │  
│  • Files set to "Anyone with link can view"                     │  
└─────────────────────────────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                 SHOPPING & FULFILLMENT                          │  
│  • Shopping list generated from preferences                     │  
│  • Campus Ready purchases items                                 │  
│  • Kit assembled and shipped to student                         │  
└─────────────────────────────────────────────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────────────────────┐  
│                 POST-MOVE-IN ENGAGEMENT                         │  
│  • Testimonial invite email sent after start date               │  
│  • SMS reminder sent (manual, using template)                   │  
│  • Student replies with photo/video                             │  
│  • $50 gift card sent as thank-you                              │  
└─────────────────────────────────────────────────────────────────┘  
\`\`\`

\---

\#\# Kit Preferences Captured

| Category | Options |  
|----------|---------|  
| Shipping Preference | Home address or Campus address |  
| Gender Preference | Determines product variants |  
| Scent Preference | Fresh, Unscented, etc. |  
| Deodorant Type | Stick, spray, etc. |  
| Style Preference | Aesthetic choices for visible items |  
| Bedding Color | Color options for sheets/comforter |  
| Pillow Firmness | Soft, medium, firm |  
| Towel Color | Color options for bath towels |  
| Slides Size | Shoe size for shower slides |

These preferences drive personalized shopping — students receive items that match their needs and tastes, not generic supplies.

\---

\#\# Verification Requirements

Before kit preferences are accepted, students must upload:

| Document | Purpose | Acceptable Formats |  
|----------|---------|-------------------|  
| Housing Confirmation | Proves on-campus housing assignment | Contract, assignment letter, deposit receipt |  
| Acceptance Letter | Confirms college enrollment | Official acceptance from institution |

Documents are stored in Google Drive with Application ID prefixes for easy retrieval. The form updates Housing Status and Acceptance Status in Grant\_Recipients upon successful upload.

\---

\#\# What Triggers What

| Event | System Response |  
|-------|-----------------|  
| Winner approved in Application Reviews | Admin runs "Transfer Winners" → creates row in Grant\_Recipients |  
| Student enters email in Kit form | Vercel proxy calls checkStudentStatus() → validates against sheet |  
| Student uploads documents | uploadDocuments() → files to Drive, URLs to sheet, status updated |  
| Student submits preferences | Form data written to Grant\_Recipients, Items Selected \= "Yes" |  
| Start date passes \+ Items Selected \= Yes | Student becomes eligible for testimonial invite |  
| Admin runs "Send Testimonial Invites" | Email sent, Testimonial Invited timestamp recorded |  
| Student submits testimonial | Gift card sent, Release Signed updated |

\---

\#\# Admin Functions

The Grant Fulfillment Database includes menu-driven tools:

| Function | Purpose |  
|----------|---------|  
| Generate Shopping List | Creates filtered list of items to purchase based on preferences |  
| Send Testimonial Invites | Emails eligible students (start date passed, items selected, not yet invited) |  
| Archive Cohort | Moves completed cohort data to Archive tab |

\---

\#\# Testimonial System

\*\*Eligibility:\*\* Students become eligible for testimonial invites when:  
\- Start date has passed  
\- Items Selected \= "Yes"  
\- Testimonial Invited \= blank

\*\*Process:\*\*  
1\. Admin runs "Send Testimonial Invites" from menu  
2\. System identifies eligible students and shows confirmation  
3\. Email sent with friendly request for photo/video of dorm setup  
4\. SMS reminder sent manually using template in Testimonial\_Templates tab  
5\. Students reply to email with content  
6\. $50 Visa gift card sent as thank-you  
7\. Content may be used on website/social media (release language in email)

\---

\#\# Connections to Other Systems

| System | Connection |  
|--------|------------|  
| Application System | Winners transferred via Admin function with Application ID, name, email, cohort, start date |  
| College Checklist Intelligence | Informs what items go into kits based on college-specific packing lists |  
| Website | Kit customization form hosted separately, communicates via Vercel proxy |  
| Email | Award notifications and testimonial invites sent via Gmail from hello@campusready.foundation |

\---

\#\# Data Flow Summary

\`\`\`  
Application Reviews                 Grant Fulfillment  
┌─────────────────┐                ┌─────────────────┐  
│  Master Sheet   │ ──Transfer──▶  │ Grant\_Recipients│  
│  (Winners)      │                │                 │  
└─────────────────┘                └────────┬────────┘  
                                           │  
                              ┌────────────┴────────────┐  
                              ▼                         ▼  
                     Document Upload            Kit Preferences  
                     (Drive \+ Sheet)            (Sheet update)  
                              │                         │  
                              └────────────┬────────────┘  
                                           ▼  
                                    Shopping List  
                                           │  
                                           ▼  
                                    Kit Fulfillment  
                                           │  
                                           ▼  
                                    Testimonial Invite  
\`\`\`

\---

\#\# Technical Files (Available on Request)

| File | Contents |  
|------|----------|  
| Customize\_Your\_Kit.html | Student-facing preference form |  
| Grant\_Fulfillment\_Apps\_Script | checkStudentStatus, uploadDocuments, shopping list, testimonials |  
| Vercel Proxy | API bridge between form and Apps Script |  
| Grant\_Recipients Sheet Export | Current recipient data |  
| Testimonial\_Templates | Email and SMS templates for outreach |

\---

\*For technical details like sheet IDs, column mappings, Drive folder IDs, or proxy configuration, ask Eric for the relevant files.\*