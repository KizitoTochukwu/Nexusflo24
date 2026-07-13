# Native WhatsApp Booking Confirmations

Send guest (and optionally host) WhatsApp confirmations directly from `book-appointment`, without requiring a Send-WhatsApp automation. Provider (Meta / Twilio) is resolved automatically from the workspace's active WhatsApp channel.

## 1. Schema — `booking_pages`

Migration adds three nullable columns:

- `notify_guest_whatsapp boolean not null default false`
- `notify_host_whatsapp boolean not null default false`
- `whatsapp_confirmation_template_id uuid null references public.whatsapp_templates(id) on delete set null`

No RLS changes (existing booking_pages policies already cover it). Types regen after approval.

## 2. Booking Page settings UI

`src/components/bookings/BookingPageForm.tsx` — add a "WhatsApp confirmations" card below the existing Email host-notify card:

- Toggle: "Send WhatsApp confirmation to guest" (`notify_guest_whatsapp`)
- Template picker: reuses existing `WhatsAppTemplatePicker` (provider-aware, already fixed in earlier turn) — only shown when guest toggle is on. Persists `whatsapp_confirmation_template_id`.
- Toggle: "Also WhatsApp me (host) when someone books" (`notify_host_whatsapp`) — uses the same selected template with host-oriented variables; requires host phone on workspace/profile (fallback message: "Add a host phone in Profile to receive alerts").
- Helper text explains the 24-hour session rule and that a template is required.

`src/hooks/useBookings.ts` — extend `BookingPage` type + select list + create/update mutations to pass through the new fields.

## 3. `book-appointment` edge function

After the existing email block (~line 570+), add a best-effort WhatsApp block:

1. Skip entirely if `!page.notify_guest_whatsapp && !page.notify_host_whatsapp`.
2. Resolve active WhatsApp provider:
   - Meta: `whatsapp_settings` where `workspace_id = page.workspace_id and is_active = true`
   - Twilio: `workspace_channel_settings` where `channel='whatsapp' and provider='twilio' and is_active=true`
   - If neither active → log and skip.
3. Load the template row (`whatsapp_templates` by `id`) — must belong to workspace and be `approved`. If missing/unapproved → skip guest send, insert a `notifications` row telling the owner why.
4. Build variables map:
   - `guest_name`, `page_name`, `date` (formatted in `page.timezone`), `time`, `meeting_url` (falls back to `meeting_location` or "See email"), `host_name` (workspace owner profile name) for host variant.
5. Invoke `whatsapp-send` via internal fetch with service-role auth, once per recipient:
   - Guest: `{ workspaceId, to: guest_phone, leadId, template: { id, name, language, components: hydrated with variables } }`
   - Host: same template, `to: host_phone_e164`. Host phone comes from `profiles.phone` (owner) — if empty, skip host send silently.
6. Rely on `whatsapp-send` to insert into `whatsapp_messages` (already does) and to route Meta vs Twilio automatically — no branching needed here.
7. All errors are caught and logged; they never fail the booking (mirrors the email best-effort pattern).

Guest phone normalization uses the existing `normalizePhone` in `whatsapp-send`; only send when `guest_phone` was provided on the booking.

## 4. Non-goals / not changing

- `whatsapp-send` itself is untouched — its provider routing + template hydration already work post-Meta fix.
- `notify-hot-lead` is not repurposed. Host WhatsApp on booking uses the same template path as the guest (single, simple flow) rather than the hot-lead SMS/WA plumbing.
- No new template seeding — the workspace must pick an already-synced approved template. UI empty state points them to Settings → Channels → WhatsApp.
- Email flow unchanged.

## Technical notes

- Migration order per project rules: `ALTER TABLE ... ADD COLUMN` only, no new table, no new grants needed.
- Template variable hydration reuses the same interpolation shape `whatsapp-send` already accepts for Meta components; when only the template `id` is passed, `whatsapp-send` hydrates from DB, so `book-appointment` can send `{ template: { id, variables: {...} } }` and let the send function build components. If `whatsapp-send` doesn't currently accept a `variables` map alongside `template.id`, we add that small shim (map variables → positional `{{1}},{{2}}...` in the order defined by the template's body params) — kept inside `whatsapp-send` so the contract stays clean.
- Files touched:
  - `supabase/migrations/<new>.sql`
  - `supabase/functions/book-appointment/index.ts`
  - `supabase/functions/whatsapp-send/index.ts` (only if variables-with-id shim needed)
  - `src/components/bookings/BookingPageForm.tsx`
  - `src/hooks/useBookings.ts`
