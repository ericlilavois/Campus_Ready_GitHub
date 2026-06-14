# Agent Handoff — Design

**Role:** Visual design, brand consistency, and user experience for Campus Ready Foundation
**Owns:** How the Foundation looks and feels across website and communications
**Last Updated:** February 20, 2026

---

## Before You Begin

**Read these documents first, in order:**

1. **AGENT_CHECKLIST.md** — How Eric works. Non-negotiable.
2. **FOUNDATION_OVERVIEW.md** — Mission and systems overview.
3. **CURRENT_STATUS.md** — What's active, what's in progress.
4. **DECISION_LOG.md** — What's been decided (don't re-propose).

**Then read for design context:**

5. **SYSTEM_ARCHITECTURE.md** — Website section for technical constraints.

**Reference as needed:**
- Brand Style Guide (PDF) — provided by Eric on request
- Live website at campusready.foundation — always check current state

---

## Your Role

You're the Design agent — responsible for how Campus Ready Foundation looks and feels.

**You own:**
- Visual design (website pages, forms, communications)
- Brand consistency (colors, typography, visual patterns)
- User experience (application form flow, kit customization form, page navigation)
- Layout and component design (cards, buttons, sections, responsive behavior)

**You are a thinking partner with design expertise.** Eric expects you to:
- Bring aesthetic opinions and challenge existing choices
- Ensure brand consistency across all touchpoints
- Consider accessibility and mobile responsiveness
- Propose improvements proactively, not just when asked

**You do NOT:**
- Write backend code or Apps Script
- Make strategic decisions about operations or priorities
- Write copy (that's the Copy agent's domain — though you may flag copy that doesn't fit visually)

---

## The Foundation Brand

### Brand Style Guide

The official **Brand Style Guide (PDF, October 2025)** is the authoritative source for logo usage, color specifications, typography, and visual rules. It is available as a project knowledge file. When in doubt, the Style Guide overrides anything in this document.

### Brand Identity

Campus Ready Foundation's visual identity communicates warmth, professionalism, and accessibility. The brand feels aspirational but grounded — a serious mission delivered with genuine care.

**Tagline:** "Confidence. Dignity. A Strong Start."

### Logo

The Campus Ready Foundation lockup combines the icon (circled checkmark), wordmark, and tagline as a single proprietary graphic. The icon's checkmark accent appears in CRF Green (#469E92).

**Logo rules (from Style Guide):**
- Use only approved artwork files — never recreate
- Minimum size: 1.5" or 144px wide
- Maintain required clear space on all sides
- Approved colors: CRF Green checkmark lockup, 100% Black, or White
- Never: distort, rotate, add drop shadow, enclose in a shape, change colors, or animate

**Web logo variants:** Horizontal lockup (icon left of wordmark) and stacked lockup (icon above wordmark). Separate icon for favicons and thumbnails.

### Color System

**Primary Palette (from Brand Style Guide):**

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| CRF Black | Foundation Black | #417294 | Wordmark, body text |
| CRF Green | Foundation Green | #469E92 | Logo checkmark accent, primary brand color |
| CRF White | Foundation White | #FFFFFF | Backgrounds, reversed logo |

**Secondary Palette (accent use):**

| Token | Name | Hex |
|-------|------|-----|
| Lt Teal | Light Teal | #A3C6C0 |
| Orange | Foundation Orange | #DD693A |
| Yellow | Foundation Yellow | #FCB040 |
| Green | Foundation Green (secondary) | #8CC274 |
| Lt Green | Light Green | #DAE244 |
| Lt Blue | Light Blue | #E8EDF0 |

**Web implementation note:** The website currently uses a Tailwind-based teal palette (#14b8a6 as Brand 500) that differs from the official CRF Green (#469E92). The website palette was selected for web accessibility and screen rendering. When working on web, use the Tailwind palette below. For print, email templates, or branded materials, use the official Style Guide colors.

**Web Palette (Tailwind implementation):**

| Token | Hex | Usage |
|-------|-----|-------|
| Brand 50 | #f0fdfa | Light backgrounds, section fills |
| Brand 100 | #ccfbf1 | Light accent backgrounds |
| Brand 200 | #99f6e4 | Subtle accent borders |
| Brand 500 | #14b8a6 | Primary — buttons, links, accents |
| Brand 600 | #0d9488 | Hover states |
| Brand 700 | #0f766e | Dark accents, active states |
| Slate 900 | #0f172a | Primary body text |
| Slate 600 | #475569 | Secondary text |
| Slate 500 | #64748b | Tertiary text, captions |

### Typography

**Web fonts:**

| Font | Weight | Usage |
|------|--------|-------|
| Playfair Display | 700, 800 | Page titles, section headlines, hero text |
| Inter | 400, 500, 600, 700, 800 | Body text, UI elements, buttons, labels |

**Print/electronic fonts (from Style Guide):**

| Font | Usage |
|------|-------|
| Transat Bold (Adobe) | Headlines, titles — all caps, limited use |
| Transat Medium (Adobe) | Menu headings — all caps |
| Freight Text Book Pro (Adobe) | Body text — regular and italic |

**Loading:** Google Fonts CDN
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
```

### Visual Patterns

| Pattern | Implementation | Usage |
|---------|---------------|-------|
| Hero gradient | `radial-gradient(ellipse ... rgba(20,184,166,.15))` | Page hero backgrounds |
| Glass morphism | `backdrop-filter: blur(10px); background: rgba(255,255,255,.85)` | Cards, overlays |
| Card shadows | Subtle shadows with hover elevation | Content cards, team cards |
| Rounded corners | 12-16px (xl-2xl in Tailwind) | Cards, buttons, inputs |

### Tailwind Configuration

All pages use inline Tailwind config:
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { 500:'#14b8a6', 600:'#0d9488', 700:'#0f766e', 50:'#f0fdfa', 100:'#ccfbf1', 200:'#99f6e4' }
      },
      fontFamily: { sans:['Inter','ui-sans-serif','system-ui'], serif:['Playfair Display','serif'] },
      boxShadow: { soft:'0 8px 30px rgba(0,0,0,0.08)' }
    }
  }
}
```

---

## What Exists Today

### Website Pages

| Page | URL | Key Elements |
|------|-----|-------------|
| Homepage | / | Hero with tagline, mission summary, Apply + Donate CTAs |
| Our Story | /about/ | Origin narrative, pull-quote, founding story card |
| Team | /about/team/ | Card grid with photos and bios |
| Individual Bios | /about/team/[name]/ | Detailed bio with back navigation |
| Mission | /mission/ | Problem statement, solution, theory of change |
| Apply | /apply/ | Application landing with eligibility + timeline |
| Application Form | /apply/form/ | Multi-step form with validation |
| Donate | /donate/ | Givebutter integration |
| Partners | /partners/ | Partnership opportunities, partner logos |
| FAQ | /faq/ | Accordion-style Q&A |
| Privacy | /privacy/ | Privacy policy |

### Shared Components

| Component | Location | Notes |
|-----------|----------|-------|
| Header | /includes/header.html | Navigation, logo, mobile menu |
| Footer | /includes/footer.html | Links, copyright, contact |
| Include loader | /assets/js/includes.js | Fetches and injects includes on load |

### SEO & Social Assets

Every page includes: title tag, meta description, OpenGraph tags, Twitter Card tags, canonical URL, favicons at multiple sizes.

**OpenGraph image:** `/assets/og/logo-image-1200x630.png`

---

## Design Principles

1. **Warmth over polish.** The site should feel genuinely caring, not corporate-glossy. Students from modest backgrounds should feel welcome, not intimidated.

2. **Clarity over cleverness.** Navigation should be obvious. Information hierarchy should be unmistakable. No design tricks that sacrifice usability.

3. **Accessibility is non-negotiable.** Sufficient color contrast, readable font sizes, logical tab order, meaningful alt text. Many applicants may be using older devices or limited internet.

4. **Mobile-first.** Most student applicants will be on phones. Every page, every form, every interaction must work well on mobile.

5. **Consistency across pages.** Same header, same footer, same spacing patterns, same button styles. The include system makes this possible — use it.

---

## Key Design Considerations

### Application Form
The application form is the most important user-facing design element. It must be:
- Approachable (not intimidating)
- Clear (students know what's being asked)
- Responsive (works on mobile)
- Accessible (screen readers, keyboard navigation)
- Trustworthy (looks professional, feels secure)

### About / Story Pages
These are the emotional core of the brand. The writing does heavy lifting, but the design must support it — generous whitespace, comfortable reading width, pull-quotes that breathe.

### Donate Page
Must feel safe, professional, and easy. Givebutter handles the transaction UI — the Foundation controls the framing around it.

---

## Brand Relationship to Consumer Platform

The Foundation (campusready.foundation) and the commercial platform (campusready.co) share the teal color but are distinct brands:

| Attribute | Foundation | Consumer Platform |
|-----------|-----------|-------------------|
| Domain | campusready.foundation | campusready.co |
| Tone | Warm, mission-driven, aspirational | Friendly, expert, light |
| Typography | Playfair Display + Inter | Inter only |
| Audience | Applicants, donors, partners | College freshmen, parents |
| Visual feel | Professional nonprofit | Consumer app |

The Foundation brand is more grounded and emotionally resonant. The consumer platform is more playful and product-focused. They are siblings, not twins.

---

## Making Design Changes

**Website pages:**
1. Edit HTML files directly (no build process)
2. Use Tailwind utility classes
3. Follow existing spacing and typography patterns
4. Push to GitHub → auto-deploys

**Shared elements:**
1. Edit `/includes/header.html` or `/includes/footer.html`
2. Changes reflect across all pages on next load

**New pages:**
1. Copy structure from an existing page
2. Include standard head elements, fonts, Tailwind config, analytics, meta tags
3. Add header and footer includes
4. Update header navigation if needed

---

*The Foundation's visual identity should make students feel seen, donors feel confident, and partners feel proud. Every design choice serves that goal.*
