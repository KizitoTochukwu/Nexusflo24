# Fix Getting Started ticks for imports and email

I checked this workspace's live data. Both items are genuinely done, but the checklist is looking in the wrong place.

## What's actually wrong

**Import contacts** — the checklist only counts leads whose source contains the word "import". The CSV importer never writes that: it keeps whatever source is in your file, or falls back to "Organic". In this workspace the 646 imported records carry the source "nas/nexusflu24 Contact", so nothing matches and the item can never tick. Contacts imported through CRM Import & Export aren't counted at all.

**Connect email** — the checklist only counts sender profiles awaiting approval. This workspace has an active sending setup (Resend, support@nexusflo24.com) plus, as of this afternoon, an email sender profile — but the active email setup alone never satisfied the check.

**A third, smaller issue** — nothing refreshes the checklist after you import or connect something, and it caches for a minute, so even a correct tick only appears after a reload.

## The fix

1. Mark imports properly: when a CSV import finishes (leads importer and CRM Import & Export), record that contacts were imported for this workspace, and also treat any existing bulk import as done by counting contacts/leads that arrived through an import rather than matching on the word "import".
2. Count email as connected when the workspace has an active email setup, a verified/approved or pending email sender, or a connected mailbox — not sender profiles alone.
3. Refresh the checklist immediately after an import, a sender is added, a calendar is connected, or an invite is sent, so ticks appear straight away.

Result for this workspace: Import contacts and Connect email both tick, taking Getting started to 9 of 9 and making the bar disappear.

## Technical notes

- `useGettingStarted` in `src/hooks/useOnboarding.ts`:
  - `imported`: count `leads` with `source ilike '%import%'` OR a recorded `answers.contacts_imported` OR `contacts` rows linked through `contact_source_map` with an import source; simplest robust signal is a new persisted flag plus a contacts-count fallback — decide in code, keep the existing `answers` fallback.
  - `senders`: replace the single `sender_profiles` count with `email_settings` where `is_active = true` OR `sender_profiles` with `channel = 'email'` OR an existing connected mailbox row.
- `CsvImportDialog.tsx` and `DashboardImportExport.tsx`: on success, call `useSaveOnboarding(workspaceId)` with `answers: { ...existing, contacts_imported: true }` and invalidate `["getting-started", workspaceId]`.
- Add `queryClient.invalidateQueries({ queryKey: ["getting-started"] })` to the sender-profile save, Google Calendar connect and invite mutations.
