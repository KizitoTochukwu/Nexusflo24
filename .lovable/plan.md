# AI Receptionist Marketing Page

## Goal
Add a public marketing page at `/ai-receptionist` that promotes NexusFlo Voice — the AI telephone receptionist — and drives visitors to start a trial or book a demo. Live calling is not enabled yet, so the page must be honest about that (an "early access / setup required" note) without undermining the value proposition.

## What to build

### 1. New page component: `src/pages/AiReceptionist.tsx`
A single-file marketing page following the existing patterns (Header + Footer + Seo, Navy/Gold design tokens, same section rhythm as `AiClientFinder.tsx` and the sector pages). No new layout components needed — reuse `Header`, `Footer`, `Seo`, `Button`, `Accordion`, `Card`.

Sections (top to bottom):
1. **Hero** — eyebrow "NexusFlo Voice", headline "Every call answered. Every opportunity captured.", subheadline, two CTAs (Start Free Trial → /register, Book a Demo → /book/...), trust chips (14-day trial, no card, cancel anytime). Hero image generated via imagegen (navy/gold, phone + AI receptionist concept).
2. **Trust strip** — one line of social proof.
3. **Problem** — 3-4 pain points (missed calls = lost revenue, after-hours calls go to voicemail, no record of what was said, can't scale reception).
4. **How it works** — 4-step flow: call comes in → AI answers & understands → books/transfers/captures details → syncs to CRM & follows up.
5. **Features grid** — 6 cards: 24/7 call answering, natural conversation, booking & transfers, CRM capture, call summaries & transcripts, UK numbers first.
6. **Honest status callout** — a bordered card noting that Voice is in early access: live calling requires gateway setup and a connected Twilio number. The dashboard section is available to configure now.
7. **Testimonials** — 3 placeholder quotes (clearly marked as illustrative until real ones exist).
8. **Pricing teaser** — short block pointing to /pricing; mention 200 included Starter minutes, 1 assistant, 1 number.
9. **Mid CTA** — navy band with Start Free Trial / Book a Demo.
10. **FAQ** — accordion: What is NexusFlo Voice? Do I need a separate account? How does it know about my business? Is recording on? Can it book appointments? What about after hours? Is it available now? — honest answer on early access.
11. **Final CTA** — card with two CTAs.

### 2. Route registration in `src/App.tsx`
Add `<Route path="/ai-receptionist" element={<AiReceptionist />} />` near the other public feature routes (after `/ai-client-finder`).

### 3. Header nav link
Add "AI Receptionist" to the `solutionsLinks` dropdown in `src/components/layout/Header.tsx` so it's reachable from the site nav.

### 4. SEO + metadata
- `<Seo>` with title "NexusFlo Voice — AI Telephone Receptionist | NexusFlo24", description, path "/ai-receptionist", Service JSON-LD.
- Update `index.html` only if needed (it already has app-level title; no change required).

### 5. Hero image
Generate one hero image via imagegen (premium, navy/gold, abstract AI receptionist / phone concept), saved to `src/assets/voice-receptionist-hero.png`, imported as an ES6 image import.

## Truthfulness rules (from project memory)
- Every public claim must be honest. Live calling is NOT connected — say "early access" / "setup required", not "answer every call today".
- Recording is off by default; say so.
- No fabricated testimonials presented as real — mark them illustrative or use clearly-generic names.
- The page links the dashboard Voice section for users who want to configure now.

## Files touched
- New: `src/pages/AiReceptionist.tsx`
- Edit: `src/App.tsx` (route + import)
- Edit: `src/components/layout/Header.tsx` (nav link)
- New: `src/assets/voice-receptionist-hero.png` (generated image)

No backend, no database, no edge functions — this is a public marketing page only.
