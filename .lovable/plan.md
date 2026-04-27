## Why the user saw "Form not found"

The form **Webinar – AI Sales System Masterclass** (`/forms/webinar-c16e15`) has its **Redirect URL** set to `www.nexusflo24.com` — without `https://`.

In `PublicFormRenderer.tsx`:
```ts
if (settings.redirect_url) {
  window.location.href = settings.redirect_url; // "www.nexusflo24.com"
}
```

When `window.location.href` is assigned a string with no protocol, the browser treats it as a **relative path**. From `/forms/webinar-c16e15`, the user is sent to `/forms/www.nexusflo24.com`. That slug doesn't exist, so `PublicForm.tsx` renders the "Form not found" card.

The submission itself succeeded — the lead was captured before the redirect happened. Only the post-submit navigation broke.

## Fix

Two layers so this can't recur:

**1. Runtime safety in `PublicFormRenderer.tsx`** — normalize the redirect URL before navigating:
- If it starts with `http://` or `https://`, use as-is.
- If it starts with `/`, treat as same-site path (allowed).
- Otherwise, prepend `https://` (so `www.nexusflo24.com` becomes `https://www.nexusflo24.com`).
- Wrap in `try/catch` with `new URL(...)` validation; on failure, fall back to showing the success screen instead of navigating.

**2. Editor validation in `FormSettingsPanel.tsx`** — when the user types a redirect URL:
- Keep the `type="url"` input but add a small helper note: *"Include https:// — e.g. https://example.com/thanks"*.
- On blur, auto-prepend `https://` if the value is non-empty, has no scheme, and isn't a relative path starting with `/`. This prevents future forms from being saved with a bare domain.

**3. Repair the existing record** — run a one-time update for the affected form so the redirect works immediately:
```sql
UPDATE forms
SET settings = jsonb_set(settings, '{redirect_url}', '"https://www.nexusflo24.com"')
WHERE id = 'e582fdad-eda4-47df-96f6-297be379f594';
```

## Files touched
- `src/components/forms/PublicFormRenderer.tsx` — normalize/validate `redirect_url` before assigning to `window.location.href`.
- `src/components/forms/builder/FormSettingsPanel.tsx` — auto-prefix `https://` on blur and add helper text.
- One DB migration to fix the saved value for the existing form.

## Out of scope
- No changes to the capture-lead pipeline, RLS, or form schema. Submissions were already saving correctly.
