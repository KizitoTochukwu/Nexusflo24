# Expand Campaign Editor Pane

The Compose Message step (step 3) in `CreateCampaignDialog` currently renders inside a narrow `sm:max-w-lg` dialog with `max-h-[85vh]`, which cramps the block-based email editor (content library, canvas, and properties panel get squeezed and scroll horizontally, as shown in the screenshot).

The Automation step editor uses a wide side drawer/full pane so the same `AutomationEmailEditor` renders with all three columns visible. We'll bring the campaign flow to parity.

## Changes

**`src/components/campaigns/CreateCampaignDialog.tsx`**
- Replace the fixed `sm:max-w-lg max-h-[85vh]` `DialogContent` sizing with a responsive full-screen container so the modal behaves like a page:
  - `w-screen h-screen max-w-none sm:max-w-none rounded-none p-0` with an inner scroll container.
  - Sticky header (stepper + title + close) at top, sticky footer (Back / Next / Launch buttons) at bottom, scrollable body in between.
- Constrain non-compose steps (audience, schedule, review, integration status) to a centered `max-w-2xl` column so they don't stretch awkwardly across the full width.
- Let step 3 (Compose Message) use the full available width (`max-w-6xl` centered) so the email block editor's Content / Canvas / Properties three-column layout has room to breathe, matching the automation editor experience.
- Keep all existing logic (steps, validation, launch handlers, broadcast skip of step 2) unchanged — this is purely a presentation/layout change.

## Out of scope
- No changes to `AutomationEmailEditor`, email block editor, or business logic.
- Not converting to a real route/page — keeping it as a Dialog preserves current entry points and state management; the full-viewport dialog gives the same "page-like" feel.
