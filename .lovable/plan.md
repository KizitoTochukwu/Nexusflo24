# Audit and upgrade Template Settings (email editor)

## What the audit found

1. **Header Bar Color does nothing in real emails.** The sent email builder accepts the colour but never uses it — it only tints the fake "Subject:" strip in the builder preview. What you pick is never seen by the recipient.
2. **Every email starts from NexusFlo24 defaults.** Settings are stored per step, so a new email action always loads the NexusFlo24 logo, footer and unsubscribe wording. For AfarHome (or any client workspace) you must restyle every single message by hand.
3. **Workspace branding is ignored.** The workspace already stores a logo, brand colour and brand name, but Template Settings never reads them.
4. **Logo alt text is hardcoded to "NexusFlo24"**, so images-off inboxes show the wrong brand.
5. **Footer and unsubscribe text are not personalised** — variables such as `{{contact.first_name}}` or a company name are left as raw braces there, unlike the message body.
6. **No safety rails** — an invalid colour code is accepted silently, there is no reset, and no way to see the effect without opening the full preview.
7. **Missing compliance and brand controls** — no sender postal address (required for bulk email), no brand/preheader text, no button or link colour, no page background colour.

## What will change

### Make the settings actually apply
- Render a real branded header band, using the chosen Header Bar Color, at the top of the email — in both the sent email and the builder preview, so they match.
- Use the brand name for the logo alt text.
- Run footer and unsubscribe text through the same variable engine as the body, so tokens resolve instead of showing braces.

### Make settings reusable
- Pre-fill new emails from the workspace's saved brand (logo, brand colour, brand name) instead of NexusFlo24 defaults.
- Add **Save as workspace default** and **Reset to default** buttons. Saved defaults apply to new email steps and campaigns in that workspace.
- Add **Apply to all email steps in this automation** so one restyle updates the whole flow.

### New controls
- Brand name (used for logo alt text and default footer wording).
- Preheader text (the grey line inboxes show next to the subject).
- Button / link colour, and page background colour.
- Sender postal address block shown under the unsubscribe line (compliance).

### Panel polish
- Live mini-preview strip at the top of the panel showing header, logo and footer as configured.
- Hex fields validate and show an inline error instead of silently accepting bad values.
- Proper labels tied to each control, clearer section descriptions, consistent spacing.

## Technical notes

- `supabase/functions/_shared/email-layout.ts`: `wrapEmailTemplate` currently computes `headerColor` but never uses it — add a header band, brand-aware alt text, preheader, button/link colour, background colour and address block; mirror all of it in `src/components/automations/email-editor/emailPreviewRenderer.ts` so preview equals delivery.
- Extend the `TemplateSettings` interface with `brandName`, `preheader`, `accentColor`, `backgroundColor`, `address`; keep all existing keys and the `size` back-compat path so saved automations and campaigns keep rendering.
- Workspace defaults: store the settings object on `workspace_branding` (new `email_template_settings` jsonb column, plus grants unchanged) and hydrate through `useWorkspaceBranding`.
- Interpolate footer/unsubscribe/address with `interpolateText` in both the preview renderer and `email-layout.ts`.
- Consumers to keep working: `AutomationStepEditor`, `WorkflowEditor`, `CreateCampaignDialog`, `execute-automation`, `execute-campaign`, `email-send`.
- Add unit tests for header band rendering, back-compat with old saved settings, and hex validation; redeploy `execute-automation`, `execute-campaign`, `email-send`.
