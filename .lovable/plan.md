# Phase 9 — Create contacts from unlinked conversations

Today, an unlinked WhatsApp/SMS thread can only be attached to an **existing** contact. If none exists, the dialog dead-ends with "Create the contact in CRM first" — and 76 WhatsApp + 58 SMS messages still sit on threads with no contact at all. This phase closes that gap: create the contact right inside the link dialog, in one atomic step.

## What I verified

- `LinkContactDialog` (`src/components/messages/LinkContactDialog.tsx`) already searches contacts and calls `crm_link_conversation_contact`; its empty state currently tells the user to leave and create the contact elsewhere.
- `crm_upsert_contact` (the canonical create/dedupe RPC) is **not executable by signed-in users** — only `service_role` (confirmed via `pg_proc.proacl`). So the browser cannot call it directly; a new guarded RPC is required rather than loosening that grant.
- `crm_link_conversation_contact` IS executable by `authenticated` and already relinks a whole thread by normalised phone.
- Unmatched threads carry a phone number and sometimes a lead name (WhatsApp threads surface `lead_name` from the leads join; SMS threads are number-only).

## Changes

**1. Migration — new guarded RPC `crm_create_contact_from_conversation`**

One call, atomic, workspace-member checked:

1. Validate membership (`is_workspace_member(auth.uid(), _workspace_id)`), channel in (`whatsapp`,`sms`), and that the identifier normalises to a phone number.
2. Call the existing `crm_upsert_contact` internally (definer-to-definer, so no grant change on that function) with the phone, optional name/email, `source = 'conversation_create'`, `source_table` = the message table — this reuses all dedupe/identity/attribution logic, so if a contact with that phone actually exists it links instead of duplicating.
3. Link the thread via the same logic as `crm_link_conversation_contact` (update messages, upsert `contact_identities`).
4. Record a `crm_activities` timeline event on the contact ("Contact created from WhatsApp/SMS conversation").
5. Return the contact id + number of messages attached. Grant `EXECUTE` to `authenticated` only; revoke from `PUBLIC`/`anon`. SECURITY DEFINER with `search_path = public`, consistent with the sibling RPCs.

**2. LinkContactDialog — "Create new contact" mode**

- A "New contact" toggle/button at the top of the dialog (always visible, not just on empty results).
- Form: name (pre-filled from the thread's lead name when available), phone (pre-filled with the thread identifier, editable), optional email.
- Submit calls the new RPC, toasts "Contact created and linked — N message(s) attached", closes, and invalidates the thread queries (existing `onLinked` path).
- Empty-search state now offers "Create new contact" inline instead of the dead-end message.

**3. DashboardMessages wiring**

- Pass the thread's lead/display name into `LinkContactDialog` as `suggestedName` so the create form is pre-filled.

**4. Tests & verification**

- Unit tests for the create-mode form state (pre-fill, validation: name or email optional but phone required, channel validation).
- Browser verification: open an unlinked SMS thread → Link to contact → New contact → create → toast + badge gone + "View contact" appears → contact profile shows the phone identity and timeline event.
- Re-check message link counts before/after and the linter baseline (expect no new issues beyond the reviewed set).

## Technical notes

- No changes to `crm_upsert_contact` or its grants — the new RPC wraps it, keeping the acquisition-path function service-role-only.
- Phone normalisation reuses `crm_normalize_phone` (SQL) — the single source of truth already mirrored by `src/lib/contactNormalization.ts`.
- Nothing is backfilled automatically: contacts are only created by explicit user action, consistent with the "AI/system never writes data without confirmation" rule.
