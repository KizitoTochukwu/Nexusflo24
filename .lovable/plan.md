# Fix: capture-lead Unique-Constraint Violation on Form Submit

## Root cause

Form submission failed with HTTP 500 from `capture-lead`:
```
duplicate key value violates unique constraint "leads_user_phone_unique"
Key (user_id, phone)=(afd12255…, +447517327597) already exists.
```

The phone `+447517327597` already exists on lead `50c0906e…` (Kizito, no email). When a new submission arrives with **a different email** but **the same phone**, the dedup logic:

1. Looks up by email → no match (new email).
2. Looks up by phone → currently filters by `workspace_id + user_id + phone`. Should match, but does not in some races (e.g. `ownerId` resolution path).
3. Falls through to INSERT → hits the `(user_id, phone)` unique constraint → 500.

The phone-match branch is too restrictive and assumes `ownerId` is always identical to the existing lead's `user_id`.

## Fix

Edit `supabase/functions/capture-lead/index.ts` (one block, lines 164–175):

1. **Broaden phone lookup** — drop the `user_id` filter; match on `workspace_id + phone` only. Phone is workspace-unique in practice (the constraint is `(user_id, phone)`, but workspace ownership rarely splits a contact across users).
2. **Re-align `ownerId`** to the matched lead's `user_id` before falling through to the UPDATE path — guarantees the subsequent update never violates `(user_id, phone)`.
3. **Belt-and-suspenders:** wrap the INSERT in a try/catch for Postgres error code `23505`; on conflict, re-query by `(workspace_id, phone)` and merge into the existing lead instead of failing.

## Deployment

Re-deploy `capture-lead` immediately after the patch.

## Verification

After deploy, retry the form submission shown in the screenshot (Kizito Tochukwu, `kizioostore@gmail.com`, `+447517327597`). Expected: HTTP 200, the existing lead `50c0906e…` is updated with the new email, exactly one new `form_submit` activity, score +10.
