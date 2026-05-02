## Goal
Fix the visual issues on the public blog article page (`/blog/:slug`) without touching the article content itself. Make it feel like a premium editorial page: clean hero, strong hierarchy, comfortable reading rhythm, polished share row, and a stronger CTA.

## File to edit
- `src/pages/BlogArticle.tsx` (only file; no DB or routing changes)

## Changes

### 1. Hero section
- Add top padding so the fixed header no longer overlaps the hero image.
- Reduce hero height (`h-56 md:h-[420px]`) and add a subtle dark gradient overlay so any future overlaid text reads cleanly.
- Move the **category badge + title + meta row** *onto* the bottom of the hero (overlay), instead of leaving a giant white gap below.
- Fallback: if no `image_url`, render a navy gradient hero band so the page still has visual weight.

### 2. Article header / metadata
- Larger, bolder title (`text-3xl md:text-5xl`, tighter leading).
- "Back to Blog" link moved above the hero or styled as a chip in the top-left of the article container.
- Author / date / read time row: slightly larger, better spacing, subtle separators.

### 3. Body typography (prose)
- Increase paragraph spacing (`prose-p:my-5`), line-height (`leading-[1.8]`), and contrast (`prose-p:text-foreground/90`).
- Stronger heading hierarchy: H2 with top border accent or larger size + extra `mt-12 mb-4`; H3 with gold accent underline or left border.
- Restore real bullet/number markers (`prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6`), remove the `[&_div]:my-2` rule that was collapsing list spacing.
- Add `max-w-2xl mx-auto` wrapper around the body so line-length stays readable (~70ch).

### 4. Share row
- Replace text-only buttons with **icon + label** ghost buttons, evenly spaced with a thin top border and a small "Share this article" label.
- Use `lucide-react` brand-style icons (Facebook, Instagram, Twitter, Linkedin, MessageCircle for WhatsApp, Link2 for copy).
- Add a toast on copy ("Link copied").

### 5. CTA block
- Widen container (`max-w-3xl`), bigger heading, add a short supporting line and two buttons (primary "Start Free Trial" + ghost "Explore Features").
- Add subtle radial gold glow background like other marketing sections for consistency.

### 6. Spacing & responsiveness
- Consistent vertical rhythm: `py-12 md:py-20` for major sections.
- Side padding on mobile (`px-4`).
- Ensure article container has `pt-24` to clear fixed header in the no-image fallback.

## Out of scope
- No changes to article HTML/content, DB schema, admin editor, or routing.
- No changes to the Layout/Header components.

## Acceptance
- Header no longer overlaps hero.
- Title + meta sit cleanly over the hero image with a readable gradient.
- No giant empty white band between hero and body.
- Lists render with visible bullets/numbers.
- Section headings are clearly distinguishable from body text.
- Share buttons look uniform with icons; copy button shows toast.
- CTA section feels prominent and on-brand (navy + gold).
