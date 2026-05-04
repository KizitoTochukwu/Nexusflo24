# Fix: Duplicate Phone Constraint — Friendly Errors + Universal Normalization

Two coordinated fixes so users (a) never see raw Postgres errors and (b) stop hitting the constraint accidentally because phone numbers were stored in inconsistent formats.

---

## Fix 1 — Friendly duplicate-lead error messages

Replace the raw `duplicate key value violates unique constraint "leads_user_phone_unique"` (and the email equivalent) with a clear, actionable message everywhere a lead can be created or updated.

**Where it surfaces today:**
- `useCreateLead` / `useUpdateLead` (`src/hooks/useLeads.ts`) — Add Lead dialog & edit
- `CsvImportDialog` (already partially handles dedup, but final insert can still throw)
- `capture-lead` edge function (public forms / funnels)
- `ingest-leads` edge function (Make.com / API)

**What changes:**
1. **New helper** `src/lib/leads/duplicateError.ts` exporting `parseLeadDbError(err)` that detects Postgres code `23505` and the constraint name, returning:
   - `{ kind: "duplicate_phone", message: "A lead with this phone number already exists." }`
   - `{ kind: "duplicate_email", message: "A lead with this email already exists." }`
   - `{ kind: "other", message: <original> }`
2. **`useCreateLead` / `useUpdateLead`**: wrap the supabase call, run the error through the helper, and `throw new Error(friendlyMessage)` so the existing `toast.error` shows the clean text. Also surface a follow-up toast action `"Open existing lead"` when we can locate the conflicting lead by `(workspace_id, phone)` or `(workspace_id, email)`.
3. **`AddLeadDialog`**: on duplicate, keep the dialog open and highlight the offending field (`phone` or `email`) using `form.setError`.
4. **Edge functions** (`capture-lead`, `ingest-leads`): on `23505`, return HTTP 409 with `{ error: "duplicate_phone" | "duplicate_email", message, existing_lead_id }` instead of a 500. (Note: `capture-lead` already has race-recovery merge logic — we only change what we return when merge isn't appropriate.)
5. **`CsvImportDialog`**: catch the new 409 path and route those rows into the existing "conflicts" UI rather than the failure list.

---

## Fix 2 — Normalize phone to E.164 everywhere before lookup AND insert

Today phone normalization lives in three different files (`whatsapp-send`, `sms-send`, `CsvImportDialog`) with subtly different rules. The dedup lookup in `capture-lead` and `ingest-leads` does `eq("phone", phone)` against raw input, so `"07517327597"` vs `"+447517327597"` vs `"447517327597"` all create separate rows that then collide on the unique constraint when one is later edited.

**What changes:**
1. **New shared module** `supabase/functions/_shared/phone.ts` exporting:
   - `normalizePhoneE164(raw, defaultCountry?)` — single source of truth, mirroring the most permissive existing logic (UK local → +44, strips non-digits, validates against `^\+[1-9]\d{1,14}$`).
   - `isValidE164(phone)`.
   Both `whatsapp-send`, `sms-send`, `whatsapp-webhook`, `capture-lead`, and `ingest-leads` switch to this module (delete their local copies).
2. **New shared frontend module** `src/lib/leads/phone.ts` with the same `normalizePhoneE164` function. `CsvImportDialog`, `AddLeadDialog`, and `useCreateLead`/`useUpdateLead` all run phone through it before sending to the DB.
3. **`capture-lead` & `ingest-leads`**: after `sanitizeString`, call `normalizePhoneE164(phone)` and use the normalized value for **both** the dedup `eq("phone", …)` lookup AND the final insert/update. If normalization fails, return 400 "Invalid phone format" (same shape as existing email validation).
4. **`AddLeadDialog`**: normalize on submit; if invalid, show form error "Use international format like +447517327597".
5. **One-time backfill migration**: `supabase/migrations/<ts>_normalize_lead_phones.sql` runs `UPDATE public.leads SET phone = normalized WHERE phone IS NOT NULL` using a PL/pgSQL `DO` block that mirrors the JS logic (strip non-digits, prepend `+`, UK `0` → `+44`). Wrapped in a try/skip per row so any phone that can't be normalized is left as-is. Conflicts during backfill (two rows that normalize to the same value for the same user) are merged: keep the older row, copy non-null fields & union tags from the newer, then delete the newer.

---

## Technical Details

**Files added:**
- `src/lib/leads/duplicateError.ts`
- `src/lib/leads/phone.ts`
- `supabase/functions/_shared/phone.ts`
- `supabase/migrations/<timestamp>_normalize_lead_phones.sql`

**Files modified:**
- `src/hooks/useLeads.ts` — wrap insert/update with friendly error parsing
- `src/components/leads/AddLeadDialog.tsx` — normalize on submit, set field-level errors
- `src/components/leads/CsvImportDialog.tsx` — replace local `normalizePhone` with shared one, handle 409
- `supabase/functions/capture-lead/index.ts` — use shared phone normalizer + 409 response
- `supabase/functions/ingest-leads/index.ts` — same
- `supabase/functions/whatsapp-send/index.ts`, `whatsapp-webhook/index.ts`, `sms-send/index.ts` — switch to shared module (no behavior change)
- `supabase/functions/_shared/validation.ts` — `safeErrorResponse` already maps "duplicate key" → "Resource already exists"; refine to detect lead-specific constraints.

**No schema changes** — the existing `leads_user_phone_unique` and `leads_user_email_unique` constraints stay; we just stop tripping them and present nicer errors when we do.

**Risk:** the backfill could merge rows. We will print a `RAISE NOTICE` count of merged rows and run it inside a transaction so it can be rolled back if the count looks wrong. Existing FKs (`lead_activities`, `scheduled_jobs`, etc.) have ON DELETE CASCADE — the merge step re-points activities to the kept lead before deleting the duplicate.

---

## Out of scope
- Changing the unique constraint shape (e.g. moving from `(user_id, phone)` to `(workspace_id, phone)`) — separate decision.
- International phone parsing beyond UK heuristics + raw E.164 — full `libphonenumber` integration is a follow-up.