# Forms module: feature audit and gap plan

## What the audit found

| Feature | Status today |
|---|---|
| Form builder | Works, but **not drag-and-drop** — fields are added by clicking a tile and reordered with up/down arrows |
| Website embed | Works — hosted link `/forms/<slug>` plus an iframe snippet |
| Popup forms | **Missing** — no popup/modal embed option anywhere in Forms |
| Multi-step forms | Works end to end — steps in the builder, progress bar, Back/Next, per-step required-field checks |
| Conditional logic | **Missing** — no show/hide rules; every field always renders |
| File uploads | **Missing** — no file field type and no storage wiring |
| Spam protection | **Missing** — no honeypot, no timing check, no rate limit, no captcha on the public form or in lead capture |

Submissions themselves are solid: the public form saves the lead, applies tags/source/pipeline stage/folder, records the submission, notifies the workspace, and fires tracking pixels.

## What I propose to build

### 1. True drag-and-drop builder
Make the canvas draggable: drag a field tile from the library straight onto the canvas, and drag rows to reorder within a step or across steps. Keep the arrow buttons as a keyboard/accessibility fallback.

### 2. Popup and inline embed script
Add a small embed script served by the app, with three embed modes in the Embed dialog:
- Inline (iframe, as today)
- Popup on button click
- Popup on timer / scroll depth / exit intent
Options: delay, frequency cap (once per visit / per N days), overlay style. Auto-height messaging already exists in the embed form page and will be reused.

### 3. Conditional logic
Per-field rules: "show this field when <other field> <is / is not / contains / is empty> <value>", with AND/OR groups. Rules are evaluated live in the renderer, hidden fields are skipped by validation and excluded from the submitted payload. Rule editor lives in the field properties panel.

### 4. File uploads
New "File upload" field: accepted types, max size, single or multiple. Files go to a private storage bucket scoped per workspace/form; the submission stores signed-path references, and the submission notification and the lead record link to the files. Downloads are restricted to workspace members.

### 5. Spam protection
Layered, no third-party account needed by default:
- Hidden honeypot field
- Minimum time-to-submit check
- Per-IP / per-form submission rate limit enforced server-side in lead capture
- Optional disposable-email and duplicate-burst blocking
- Per-form toggle in Form Settings, with an optional invisible challenge later if abuse continues

### 6. Submission integrity
Required-field checks and length/pattern rules are currently enforced only in the browser. Add matching server-side validation against the form schema so an embedded form can't be bypassed.

## Technical notes

- Drag-and-drop via `@dnd-kit` (sortable list + droppable canvas), replacing the click-to-add-only flow in `FieldLibrary.tsx` / `FormCanvas.tsx`.
- `FormField` gains `visible_when` (rule group), and file-field keys (`accept`, `max_size_mb`, `multiple`); `FormSettings` gains `spam` (honeypot, min seconds, rate limit) and `popup` config. Existing forms keep working — all new keys are optional.
- Popup embed ships as a versioned public script that injects the existing `/forms/<slug>` iframe inside a modal; no cross-origin data access needed.
- File uploads use a private storage bucket with workspace-scoped policies; public submitters upload through an edge function issuing scoped upload URLs rather than direct client writes.
- Spam checks and schema validation are enforced inside the `capture-lead` edge function so every entry point (hosted, iframe, popup) is covered.

## Suggested order

1. Spam protection + server-side validation (protects what is already live)
2. Conditional logic
3. File uploads
4. Drag-and-drop builder
5. Popup embed
