## Problems Confirmed

1. **Giant gaps + no real lists/headings:** `BlogArticle.tsx` runs `content.replace(/\n/g, '<br />')` on already-HTML content. Every newline between block tags becomes an extra `<br>`, doubling/tripling vertical space. Stored content contains plain lines (no `<p>`, `<h2>`, `<ul>`), so prose typography can't style them.
2. **Body text appears blue:** The author applied a custom text color in the editor (`<span style="color:#...">`), and `prose` styles links in accent. Combined effect: large blocks look like links.
3. **Header overlapping article mid-page:** The site `Header` is sticky/fixed and floats above the article without proper offset, making it look like a "footer in the middle" when scrolled.
4. **Editor produces unstructured HTML:** `execCommand` defaults to `<div>`/`<br>` per line. Pasting plain text from a doc inherits that. Headings/lists need to be explicitly chosen — the author didn't.
5. **No styled callouts, stat blocks, or TOC** for long-form posts.

## Plan

### A. Fix article rendering (`src/pages/BlogArticle.tsx`)
- Remove the destructive `\n → <br />` replacement. Render `article.content` as raw HTML directly.
- Wrap the content div in stronger `prose` typography rules so even loose `<div>` lines get readable spacing (`prose-lg`, tighter `prose-p` margins).
- Add a CSS override that **strips inline `color:` styles from non-link spans** inside the article (so accidental blue body text from the editor renders in normal foreground). Done via a small post-mount sanitizer or a CSS rule `.article-body span[style*="color"]:not(a span) { color: inherit !important; }`.
- Add `scroll-mt-20` and a top padding so the sticky header never overlaps the heading.

### B. Fix the "footer in the middle" overlap
- Inspect `Header.tsx` for `sticky`/`fixed` + z-index. Ensure the article's `<main>` has padding-top equal to header height (or add `pt-16` on the BlogArticle container) so content doesn't slide under it.
- Apply the project's z-index rule (60 overlays / 61 sticky headers) consistently.

### C. Improve the editor's output (`src/components/admin/BlogContentEditor.tsx`)
- Set `document.execCommand("defaultParagraphSeparator", false, "p")` on mount so Enter creates real `<p>` blocks instead of `<div>`+`<br>`.
- Add a **"Paste as plain text"** handler on the editor: intercept `onPaste`, read `text/plain`, then auto-convert blank-line-separated chunks into `<p>` blocks and lines starting with `- ` or `• ` into `<ul><li>` lists. This rescues content pasted from Word/Docs/ChatGPT.
- Add a **"Clean formatting"** action that strips inline `color`/`background`/`font` styles from the current selection (in addition to the existing Remove Formatting).

### D. Repair the existing post (one-off)
- Run a single SQL update that:
  - Strips `<span style="color:...">` wrappers around plain body text (keeping inner text)
  - Converts double-newlines to `</p><p>` and wraps the content in a single `<p>` chain
  - Detects "Step N:" / "Heading-like" lines and promotes them to `<h2>`/`<h3>`
  - Detects consecutive short lines (likely bullets) and wraps them in `<ul><li>`
- This is a best-effort cleanup; the author can fine-tune in the editor afterward.

### E. Add long-form polish (optional, light touch)
- Style `<blockquote>` and a `.callout` class for "Soft CTA" lines (gold left border, subtle bg).
- Style large numeric stats inside the article (`<strong>` containing digits) with accent color.
- Add a sticky right-side mini Table of Contents (auto-generated from `<h2>` tags) on `lg` screens only.

## Files to Edit
- `src/pages/BlogArticle.tsx` — remove `\n` replacement, add prose tweaks, header offset, color sanitizer, optional TOC.
- `src/components/admin/BlogContentEditor.tsx` — `defaultParagraphSeparator=p`, paste handler, deep clean formatting.
- `src/components/layout/Header.tsx` — verify z-index/sticky offset (read-only check, fix only if needed).
- One SQL migration to clean the existing post's `content`.

## Out of Scope
- Rewriting the WYSIWYG editor with a library (Tiptap/Lexical). Keep current execCommand-based editor.
- Changing the writing/content of any post.
