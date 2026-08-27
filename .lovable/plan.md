# CRM Phase 9: Create Contact from Unmatched Conversations (+ Phase 8 verification)

## Context

Phase 8 added contact linking for WhatsApp/SMS threads, but unmatched conversations can only be linked to an **existing** contact. Phase 9 lets a workspace member create a new CRM contact directly from an unmatched thread. The Phase 8 link-mutation bug (`contact_identities.source`) is already fixed in the live database — this phase starts by verifying it end-to-end.

## Scope

### 1. Verify the Phase 8 link mutation (no new code)

- Browser-drive Dashboard → Messages, open an unlinked WhatsApp/SMS thread, link it to an existing contact via `crm_link_conversation_contact`, and confirm messages attach and the badge clears.

### 2. Guarded create-and-link RPC (migration)

- New function `crm_create_contact_from_conversation(_workspace_id uuid, _channel text, _identifier text, _full_name text, _email text default null)`:
  - Guards: caller must be a workspace member (`is_workspace_member(auth.uid(), ...)`); channel restricted to `whatsapp`/`sms`; full name required and trimmed; email validated if provided.
  - Creates the contact via the canonical `crm_upsert_contact` path (phone-first identity, normalized), records the phone in `contact_identities`, then links all matching messages exactly like `crm_link_conversation_contact` (single transaction — contact + identity + message link are atomic).
  - Returns the new contact id and linked message count.
  - `REVOKE` from PUBLIC/anon; `GRANT EXECUTE` to authenticated only.
- Explicitly does NOT auto-promote lifecycle or trigger automations; the contact is created as a standard CRM contact.

### 3. "New contact" mode in LinkContactDialog

- Add a mode toggle: **Link existing** (current search) / **New contact**.
- New-contact mode: full name (prefilled from the thread's display name), optional email, read-only phone showing the conversation identifier.
- Submit calls the new RPC, then shows the linked-message count and closes; thread flips to linked state via the existing `onLinked` refresh.
- Creating a contact requires an explicit button press — no automatic data writes (per project AI/data-safety rules).

### 4. DashboardMessages wiring

- Pass the thread's suggested display name into `LinkContactDialog` so the New-contact form is prefilled.

### 5. Tests & verification

- Unit tests: normalization edge cases for the create path (phone-only, phone+email, invalid email rejection).
- Build check, then authenticated browser smoke: create a contact from an unmatched SMS thread and confirm the contact appears in CRM with the messages on its timeline.

## Technical notes

- Migration follows the established guarded-RPC pattern: `SECURITY DEFINER`, `SET search_path = public`, internal `is_workspace_member` check, revoked from PUBLIC/anon.
- Reuses `crm_normalize_phone` and the existing `contact_identities` columns (`identity_type`, `identity_value`, `raw_value`) — no schema changes to existing tables.
- Supabase types regenerate after the migration; client code follows.

## Out of scope

- No changes to auto-linking on inbound messages, duplicate-review queue, or commerce promotion rules.
- No bulk "create contacts for all unmatched threads" action.
