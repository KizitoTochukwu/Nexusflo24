

## Plan: Structured Email Template Rendering

### Problem
The automation email editor produces mixed content (plain text with `\n`, `• ` bullets, inline HTML like `<b>`, `<a>`) that gets sent as-is. Email clients render this as a plain text block with no structure.

### Solution
Create a shared `formatEmailBody` function that transforms editor content into a branded, mobile-friendly HTML email template, then apply it in both edge functions.

### Changes

**1. Create `supabase/functions/_shared/email-layout.ts`**

A shared utility with two functions:

- `formatEmailBody(rawContent: string): string` — Converts editor output to structured HTML:
  - Converts `\n` to `<br>` but groups consecutive lines into `<p>` blocks with proper spacing
  - Converts `• ` prefixed lines into `<ul><li>` lists
  - Converts `1. ` prefixed lines into `<ol><li>` lists
  - Detects `---` dividers and converts to `<hr>`
  - Preserves existing HTML tags (`<b>`, `<i>`, `<a>`, `<img>`, button markup)

- `wrapEmailTemplate(body: string, options?: { preheader?: string }): string` — Wraps formatted body in a full email layout:
  - DOCTYPE + head with responsive meta tags
  - Max-width 600px centered container
  - NexusFlo24 branded header with logo
  - White body background, clean typography (font-family stack)
  - 24px padding on desktop, 16px on mobile
  - Navy (#0B1F3B) text, proper link styling
  - Media query for mobile responsiveness

**2. Update `supabase/functions/execute-automation/index.ts`**

In the `send_email` action block (line 149), after interpolation:
```typescript
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
// ...
let html = interpolate(config.body || config.message || "", lead);
html = wrapEmailTemplate(formatEmailBody(html));
```

The unsubscribe footer will be injected inside the template wrapper (before the closing `</td>`).

**3. Update `supabase/functions/email-send/index.ts`**

Before tracking injection (line 64), wrap the incoming `html` body:
```typescript
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
// ...
let trackedHtml = wrapEmailTemplate(formatEmailBody(html));
```

This ensures campaign emails also render with proper formatting.

### Template Structure
```text
┌─────────────────────────────────┐
│  #f4f5f7 background             │
│  ┌───────────────────────────┐  │
│  │  NexusFlo24 Logo (center) │  │
│  ├───────────────────────────┤  │
│  │  #ffffff body card        │  │
│  │                           │  │
│  │  <p> paragraph blocks     │  │
│  │  <ul> bullet lists        │  │
│  │  <a> styled links         │  │
│  │  CTA buttons (centered)   │  │
│  │                           │  │
│  ├───────────────────────────┤  │
│  │  Unsubscribe footer       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Scope
- 1 new shared file (`_shared/email-layout.ts`)
- 2 edge functions updated (`execute-automation`, `email-send`)
- No database or frontend changes

