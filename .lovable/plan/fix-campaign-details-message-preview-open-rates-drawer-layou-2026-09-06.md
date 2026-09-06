# Fix Campaign Details: message preview, open rates, drawer layout

## What's wrong today (verified)

- Saved campaign message bodies are stored as editor block JSON (e.g. `[{"id":"blk_...","type":"text","props":{...}}]`). The drawer prints that string as-is, so people see raw JSON, `\n` escapes and editor metadata instead of the message.
- Campaign rows keep `open_rate = 0` even when their message records show opens (one campaign has 1 sent / 1 opened, another 15 sent / 7 opened), so every card, table cell and chart shows 0.0%.
- The preview box does not wrap long links, which pushes the drawer sideways.

## The fix

### 1. A single message preview component

New `MessageContentPreview` used by the drawer (and reusable elsewhere):

- Detects the format of the stored body: editor blocks JSON, HTML, or plain text.
- Editor blocks are rendered through the existing block renderer so text, headings, images, buttons, dividers, spacers, columns and social links all show as designed; newlines become line breaks.
- HTML is sanitised then rendered; plain text keeps its line breaks.
- Broken/unparseable content shows "Message preview unavailable" instead of raw JSON.
- All output is sanitised (DOMPurify, already in the project) so nothing malicious can run.
- Merge fields like `{{first_name}}` stay visible in preview; when a recipient is supplied their real values are filled in using the existing interpolation helper.
- Images are capped to the container width; long words and URLs wrap.

### 2. Correct open/click rates from real delivery records

New shared helper + hook that derive metrics from the campaign message records rather than the stored rate columns:

- sent = number of message records
- delivered = records marked delivered
- opened = unique recipients with an open
- clicked = unique recipients with a click
- open rate = opened / sent; click rate = clicked / delivered (0 when the denominator is 0)

Applied consistently to the campaign list table, the drawer's summary cards, the Sequence Timeline and the Analytics tab, so 1 sent + 1 opened reads 100.0% everywhere. Repeat opens by the same recipient count once. Stored rate columns are used only as a fallback when no message records exist. No campaign data is modified and nothing is resent.

### 3. Drawer layout

- Drawer widens on large screens and stays full-width on mobile; no page-level sideways scrolling.
- Text and URLs wrap (`overflow-wrap: anywhere`, `word-break: break-word`); images constrained to `max-width:100%; height:auto`.
- Only the message preview area scrolls vertically when tall.
- Message Content gets two tabs: **Preview** (formatted) and **Source** (raw stored content, for troubleshooting only).

### 4. Tests

Unit tests covering: block JSON with text + image, HTML body, plain text, malformed JSON fallback, very long URLs, merge-field handling, 1 sent / 1 opened = 100%, and duplicate opens from one recipient counted once.

## Technical notes

- New `src/components/campaigns/MessageContentPreview.tsx`; block-to-HTML rendering reuses `emailBlockSerializer` logic, output passed through DOMPurify with a restricted tag/attribute allowlist.
- Merge fields resolved with `src/lib/messaging/interpolate.ts`.
- New `src/lib/campaigns/metrics.ts` (pure functions) + a `useCampaignMetrics` hook built on `useCampaignMessages`; the list page batches message aggregates per workspace campaign set.
- Tests as Vitest files under `src/lib/__tests__/` and a component test for the preview.
- No database migrations, no edge-function changes, no campaign sends.
