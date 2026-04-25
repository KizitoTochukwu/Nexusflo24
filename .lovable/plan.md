# Forms Module — Drag-and-Drop Form Builder

A new top-level "Forms" section in the dashboard for building reusable lead-capture forms. Forms are saved to the database, hosted on a public URL, embeddable on any site, and pipe submissions into the CRM through the existing `capture-lead` pipeline.

## What you'll get

1. **Sidebar entry**: a new "Forms" item between **CRM (Leads)** and **Funnels**.
2. **Forms list page** (`/dashboard/:workspaceId/forms`): grid of all saved forms with name, status (draft/active), submission count, last edited; actions to create, open, duplicate, delete, copy embed code, and copy hosted URL.
3. **Form builder** (`/dashboard/:workspaceId/forms/:formId`):
   - Three-column layout (mirrors funnel builder): **Field Library** | **Live Canvas** | **Properties Panel**
   - Drag-and-drop reordering of fields
   - Field types: short text, long text, email, phone, number, dropdown, checkboxes, radio, consent checkbox, hidden field, date, divider, heading, paragraph
   - Per-field settings: label, placeholder, help text, required toggle, default value, options (for select/radio), validation
   - Form-level settings: title, description, submit button text, success message, redirect URL, lead source, tags, default folder, default pipeline stage
   - Branding: background color, accent color, font, border radius, logo image
   - Multi-step support: split fields into pages with progress bar
   - Save / autosave, status toggle (draft ↔ active), preview
4. **Public hosted form** (`/forms/:slug`): clean public page that renders the saved form, submits to `capture-lead`, shows success message or redirects.
5. **Embed dialog**: iframe snippet for any form, plus a copyable hosted-page link — same UX as the existing funnel embed dialog.

## How submissions flow

```text
Public form page  ──►  capture-lead edge function  ──►  leads table
                                                        + lead_activities ('form_submit' = +10 score)
                                                        + lead_folder_leads (if default folder set)
                                                        + automation triggers (folder/new_lead)
```

The form's `source` and `tags` settings are merged into the lead record so existing automations (`lead_added_to_folder`, `new_lead`) fire as expected.

## Technical details

**New DB tables (migration):**

- `forms`
  - `id uuid pk`, `workspace_id uuid`, `user_id uuid`, `name text`, `slug text unique` (auto-generated like funnels), `status text default 'draft'`, `description text`
  - `schema jsonb` — array of field definitions and step grouping
  - `settings jsonb` — submit text, success message, redirect URL, source, tags, default folder, default pipeline stage
  - `theme jsonb` — colors, font, radius, logo URL
  - `submission_count int default 0`, `created_at`, `updated_at`
  - RLS: workspace-member CRUD + public SELECT where `status='active'` (mirrors `funnels`)
  - Trigger: reuse the funnel slug-generator pattern for auto slugs

- `form_submissions`
  - `id`, `form_id`, `workspace_id`, `lead_id` (nullable), `data jsonb`, `created_at`
  - RLS: workspace members SELECT; service role + public INSERT (insert happens through edge function)

**Frontend:**

- `src/pages/dashboard/DashboardForms.tsx` — list page (cards grid, create button, search)
- `src/pages/dashboard/FormBuilder.tsx` — builder shell with header (name, status, save, preview, embed)
- `src/components/forms/builder/FieldLibrary.tsx` — draggable field palette
- `src/components/forms/builder/FormCanvas.tsx` — live preview + drop targets, reorder via dnd-kit (already in project)
- `src/components/forms/builder/FieldPropertiesPanel.tsx` — settings for selected field
- `src/components/forms/builder/FormSettingsPanel.tsx` — global form/theme settings
- `src/components/forms/PublicFormRenderer.tsx` — shared renderer used by both builder preview and public page
- `src/pages/PublicForm.tsx` — route `/forms/:slug`
- `src/components/forms/EmbedFormDialog.tsx` — iframe + URL snippets
- Sidebar: add `Forms` item (icon: `FormInput` from lucide) in `DashboardLayout.tsx`
- Routes added in `src/App.tsx`: `forms`, `forms/:formId`, and a top-level `/forms/:slug` public route

**Backend:**

- Extend the existing `capture-lead` edge function to accept `{ form_id, data }` payloads: validate the form is active, map `data` → lead fields using the form schema, increment `submission_count`, insert a `form_submissions` row, then run the existing lead-capture path. No new function needed.

**Validation & security:**

- Zod schema on form save (name length, slug format, field count limits)
- Server-side re-validation of submitted data against the form schema in the edge function
- Public route only renders forms with `status='active'`
- No PII logged

## Out of scope (can add later)

- A/B testing of form variants
- File-upload fields (needs storage policy)
- Conditional logic between fields
- Built-in spam/captcha (can add hCaptcha later)