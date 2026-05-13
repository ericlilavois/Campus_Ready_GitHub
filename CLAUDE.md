# CLAUDE.md — Campus Ready Foundation Site

## Project Identity

This is the public website and grant application for Campus Ready Foundation, a 501(c)(3) nonprofit that provides one-time grants to first-time college students from low-income households. The site lives at campusready.foundation (with campusready.org as an alias). It serves two audiences: students applying for grants, and donors and partners learning about the Foundation's mission. This codebase has no structural connection to campusready.co (DormShopper) — different deployment, different domain, different audience, different purpose entirely.

## Communication Rules

Write in plain English. No jargon, no inline code references in prose. When you describe a change, describe what it does, not how it does it — "this sends the form to our server instead of Google directly" not "this replaces the native form submit with a fetch POST to the Vercel edge function." If something needs technical detail, put it in a code comment, not in the explanation to me. Be direct about uncertainty — if something could go wrong, say so plainly before proceeding.

## Branch and Deploy Rules

All work happens on the `staging` branch. Never push directly to `main`. When changes on `staging` are approved and ready, they merge to `main` via squash and merge — that push to `main` is what triggers a live update on Vercel. Pushes to `staging` produce a Vercel preview URL where changes can be verified before promotion. Test on `staging` first, confirm it works, then and only then merge to `main`. Never commit or push anything without explicit approval — always show changes before asking.

## Architecture

The site is plain static HTML with no build step, no framework, and no JavaScript modules. Pages are individual HTML files. Navigation and footer are shared across pages via a lightweight include pattern described in the readme. Serverless functions live in the `/api/` directory. Both the static pages and the API functions deploy through the same Vercel project (`campus_ready`) — pushes to `staging` produce Vercel preview URLs, and pushes to `main` deploy to the live site. The site is reachable at both campusready.org (the canonical URL) and campusready.foundation (an alias that redirects to .org). One important note: the application form connects to a live Google Apps Script backend that processes real grant applications from real students. Changes to form submission logic have real consequences — a broken submission means a lost application from a student who may not try again.

## Brand and Tone

Campus Ready Foundation is a nonprofit. Its voice is mission-driven, warm, and direct — not commercial. The site exists to serve students and build donor trust, not to sell anything. When suggesting copy or visual choices, treat this like a trusted institution speaking to families, not a product speaking to shoppers. If a suggestion would feel at home on an e-commerce site, it doesn't belong here. The Foundation's tagline is "Confidence. Dignity. A Strong Start." — that register should inform every word on the site.

## Commit Pattern

Small, atomic commits — one logical change per commit. Always show what changed and why before committing. Never commit or push without explicit approval. Commit messages should describe the change in plain English: "Add Vercel proxy for application form submission" not "refactor: update api handler." No batch commits that bundle unrelated changes.

## Boundaries

This repo has no connection to DormShopper (dormshopper.com, formerly campusready.co), its Firebase project, its user accounts, or its product catalog. If dormshopper.com or campusready.co appears anywhere in this codebase, it is a cross-link only — a hyperlink to a separate site — not shared infrastructure. Do not import, reference, or assume any shared configuration between the two. Any suggestion that touches Firebase, DormShopper's data layer, or shared authentication should be treated as out of scope for this repo.
