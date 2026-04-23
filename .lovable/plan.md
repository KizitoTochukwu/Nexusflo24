
## Fix: Automation emails leaking raw block JSON

### What's broken
The Webinar automation email arrives looking messy because the **email body is stored as a JSON blocks array** (the visual email editor's format — `[{"id":"blk_…","type":"image","props":{…}},…]`), but the edge function that sends automation emails treats it as plain text. The result: subscribers see raw JSON, escaped quotes, and stray fragments instead of a rendered email with the image, "Save Your Seat" button, and formatted text.

The bug exists in two send paths:
1. `supabase/functions/execute-automation/index.ts` — used by your Webinar automation
2. `supabase/functions/email-send/index.ts` — used by Workflows, manual sends, and Campaigns that pipe through it

The frontend already has a `blocksToHtml()` serializer (`src/components/automations/email-editor/email-blocks/emailBlockSerializer.ts`) that converts the blocks array into proper HTML. It just isn't reachable from edge functions because it imports `lucide-react` icons via a sibling types file. We need a Deno-safe copy in `supabase/functions/_shared/`.

### Fix

**1. Create `supabase/functions/_shared/email-blocks.ts`**
- Port the type definitions (text/image/button/divider/spacer/social/columns) — pure types, no React/lucide imports.
- Port the `blocksToHtml(blocks)` renderer (table-based, email-client-safe HTML).
- Port `parseBlocksFromMessage(raw)` that detects whether a string is a JSON blocks array.

**2. Update `supabase/functions/execute-automation/index.ts`**
Around line 206, before `formatEmailBody`:
```ts
const rawBody = config.body || config.message || "";
const blocks = parseBlocksFromMessage(rawBody);
let html = blocks
  ? blocksToHtml(blocks.map((b) => interpolateBlock(b, lead)))
  : interpolate(rawBody, lead);
html = wrapEmailTemplate(blocks ? html : formatEmailBody(html), { ... });
```
Add a small `interpolateBlock()` helper that walks each block's text fields (`content`, `label`, `url`, `alt`, `linkUrl`, `columns[]`) and runs `interpolate()` on them so `{{first_name}}` etc. still work.

**3. Update `supabase/functions/email-send/index.ts`**
Same change near line 106 — detect blocks JSON, render via `blocksToHtml`, otherwise fall back to `formatEmailBody`. This automatically fixes Workflow emails (which delegate to `email-send`) and any manual sends.

**4. Deploy** both edge functions.

### How it'll look after
- The header logo image renders centered.
- The "Save Your Seat Here" gold/navy button renders as a real button.
- Body paragraphs render with proper spacing — no more `","fontSize":15,...` leaking.
- `{{FirstName}}` / `{{first_name}}` continue to interpolate inside block content.
- Existing legacy automations whose body is plain text/HTML keep working unchanged (the parser returns `null` for non-JSON strings → falls back to `formatEmailBody`).

### What this does NOT touch
- The visual email editor UI (already correct).
- The frontend preview (already uses the same renderer).
- WhatsApp/SMS messages (the WhatsApp body in your screenshots was clean — that path already strips/sends plain text).
- No DB migration, no schema change, no breaking change to existing automations.

### Verification after deploy
- Trigger the Webinar automation on a test lead (drop a contact into the Webinar folder).
- Check the inbox — email should render the image header, formatted body, and CTA button cleanly.
- Check `email_logs` for the new send — `status: sent`, no JSON in the `body` column.
