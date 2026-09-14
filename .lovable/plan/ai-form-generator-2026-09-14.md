# AI Form Generator

Add a "Generate with AI" option on the Forms page so a user can describe what they need
("webinar registration with name, email, phone and a question about budget") and get a
ready-to-edit form instead of starting from a blank builder.

## What the user sees

1. On the Forms page, next to **New form**, a second button: **Generate with AI**.
2. It opens a short dialog:
   - A description box ("What should this form collect, and who is it for?")
   - A few one-tap starter ideas (lead capture, webinar registration, contact us,
     application/intake, quote request)
   - Optional toggle: "Split into multiple steps"
3. Pressing **Generate** shows a working state, then a preview of what the AI proposed:
   form name, short description, the list of fields (with type and whether required),
   and the button/thank-you wording.
4. Two choices: **Create form** (saves it and opens it in the builder, in draft) or
   **Try again** (regenerate with the same or an edited description).
5. Everything is editable afterwards in the normal builder — nothing the AI makes is locked.

## What the AI produces

- Form name and one-line description
- Fields with sensible types (name, email, phone, dropdown, checkboxes, long text,
  consent, date, file upload), labels, placeholders, help text and required flags
- Correct mapping so name/email/phone land on the lead record and the rest are saved as
  extra details
- Steps when multi-step is requested
- Submit button text and a thank-you message
- Spam protection left on with the existing defaults

Anything the AI returns that isn't a supported field type is dropped rather than saved,
so a generated form can never break the builder or the public page.

## Technical notes

- New edge function `generate-form`, modelled on the existing `generate-funnel`:
  Lovable AI Gateway, strict JSON output, no client-side key. Returns
  `{ name, description, settings_overrides, schema }` matching `FormSchema` in
  `src/hooks/useForms.ts`.
- A normaliser on the client validates the response against the allowed
  `FormFieldType` list, assigns field ids/names, enforces one email field, and merges
  `DEFAULT_SETTINGS` / `DEFAULT_THEME` / `DEFAULT_SPAM` so older keys stay intact.
- New `src/components/forms/AiFormDialog.tsx` holds the prompt, preview and create flow;
  creation reuses `useCreateForm` + `useUpdateForm`, then navigates to
  `/dashboard/:workspaceId/forms/:id`. Status stays `draft`.
- Gateway failures are surfaced plainly (rate limit, credits, blocked) instead of a
  generic error; the typed description is kept so nothing is lost.
- `DashboardForms.tsx` gains the button and dialog only; the existing New form flow is
  untouched.
