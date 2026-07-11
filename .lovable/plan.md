## Bookings Page Revamp

Rework `src/pages/dashboard/DashboardBookings.tsx` into a premium, automation-aware bookings hub while preserving all existing data flows (hooks `useBookingPages`, `useBookings`, `useCreateBookingPage`, `useUpdateBookingPage`, `useDeleteBookingPage`, `useUpdateBooking`) and the `BookingPageForm` dialog.

### 1. Summary dashboard (top of page)

New component `BookingsSummaryCards` — a responsive grid of 6 white cards with soft shadow, rounded-xl, gold accent icon chips:

- **Total bookings** — `bookings.length`
- **Upcoming** — confirmed & `start_time >= now`
- **Completed** — `status = 'completed'` OR (confirmed & `end_time < now`)
- **Cancelled** — `status = 'cancelled'`
- **No-show rate** — `no_show / (completed + no_show)` %, computed client-side (adds `no_show` as valid status)
- **Next appointment** — soonest upcoming: guest name + relative date/time

All derived client-side from existing `bookings` array. No new queries.

### 2. Booking Pages tab

New card component `BookingPageCard` per page:

- Header: title, duration • timezone, status badge (active/inactive with new styling)
- Description (2-line clamp)
- Upcoming bookings count for this page
- Public link row (readonly input + copy button, existing pattern)
- **Automation status chips** — derived by checking existing data:
  - "Email confirmation" — from `booking_pages.notify_host` (already selected) + presence of `bookings` (proxy). Long-term: query `automations` table for triggers referencing this page. For v1: show static "Auto email on booking" chip (confirmation email is already sent by existing booking flow) with green dot.
  - "WhatsApp reminder" — check `automations` table for trigger `type='booking_created'` linked to this page id; show green/gray chip. Falls back to gray "Not configured" if absent.
  - "CRM pipeline" — always green ("Leads auto-created") since bookings create leads via existing flow.
  - Fetched via one new lightweight hook `useBookingAutomationStatus(workspaceId)` that reads `automations` filtered by trigger config.
- Action row: **Preview**, **Edit**, **Share** (new — opens a small popover with copy link, email link, and QR-style dialog reusing link), **Delete** (icon, destructive).

### 3. Appointments tab

New component `AppointmentsPanel` wrapping current `BookingsList`.

**Toolbar row:**
- Search input (name/email, client-side filter)
- Booking page `Select` filter
- Status `Select` filter (All / Confirmed / Completed / Cancelled / No-show)
- Timeframe `Select` (Upcoming / Past / All)
- Date range popover (from/to using existing `Calendar` component)
- **View toggle** (`ToggleGroup`): List · Calendar · Week · Month

**List view:** upgraded table with row hover, click-to-open drawer, guest avatar (initials), inline status pill, and an action `DropdownMenu` (⋯) per row replacing the current icons:
- View details (opens drawer)
- Reschedule (existing link)
- Send reminder (calls new edge function `send-booking-reminder` OR reuses existing `whatsapp-send` / `email-send` — v1 stub with toast + logs an entry)
- Mark as attended → `status='completed'`
- Mark as no-show → `status='no_show'` (extend allowed statuses)
- Cancel → `status='cancelled'`
- Open contact in CRM → navigate to `/dashboard/:workspaceId/leads?leadId=<booking.lead_id>` when present

**Calendar / Week / Month views:** grid rendered from filtered bookings using `date-fns`. Clicking a slot opens the same drawer. No new libraries — built with tailwind grid + `date-fns` helpers already in project.

### 4. Appointment Details Drawer

New `AppointmentDetailsDrawer.tsx` using shadcn `Sheet` (right side, 480px):

- Header: guest name + status badge
- Contact block: email, phone (with mailto/tel links), copy buttons
- Booking block: booking page, date, time range, timezone, reschedule token link
- **Form answers**: renders `bookings.notes` (currently used to store form answers as JSON/text). If parseable JSON, render as key/value list; else show as text.
- **CRM contact link**: if `lead_id`, deep-link to lead drawer + show lead score/stage via existing `useLeads` cache.
- **Conversation history**: last 5 messages via existing message hooks filtered by `lead_id` (email/SMS/WhatsApp), links to Messages page.
- **Reminder status**: shows whether a reminder was sent (from a new `booking_reminders_sent` boolean or from the `notifications` table filtered by booking_id — v1 reads from `bookings.reminder_sent_at` column, added if missing via migration).
- **Internal notes** textarea — persisted to new column `bookings.internal_notes` (migration).
- Footer actions mirror the row menu (reschedule, cancel, mark attended/no-show, send reminder).

### 5. Data / backend touches

Minimal, additive:

- Migration `add_booking_operational_fields`:
  - `ALTER TABLE bookings ADD COLUMN internal_notes text`
  - `ALTER TABLE bookings ADD COLUMN reminder_sent_at timestamptz`
  - Extend allowed `status` values to include `'no_show'` and `'completed'` (via CHECK update if constraint exists, else no-op).
- No new tables. RLS already covers `bookings`.

### 6. Style pass

- White cards `bg-card`, `rounded-2xl`, `shadow-sm hover:shadow-md transition-shadow`, `border border-border/60`
- Navy primary buttons (existing `Button` default), gold accent used for icon chips on summary cards and highlight rings on "Next appointment"
- Status badge palette (added to a shared `bookingStatus` util): confirmed=emerald, completed=blue, cancelled=rose, no_show=amber
- Empty states get illustrated icon + short copy + CTA
- Tabs get a subtle pill container; sticky toolbar above the appointments table
- Mobile: summary grid collapses to 2 cols, filters stack, table becomes card list, drawer becomes bottom sheet

### 7. Files

**New**
- `src/components/bookings/BookingsSummaryCards.tsx`
- `src/components/bookings/BookingPageCard.tsx`
- `src/components/bookings/AppointmentsPanel.tsx`
- `src/components/bookings/AppointmentsToolbar.tsx`
- `src/components/bookings/AppointmentCalendarView.tsx` (list of view modes)
- `src/components/bookings/AppointmentDetailsDrawer.tsx`
- `src/components/bookings/SharePagePopover.tsx`
- `src/hooks/useBookingAutomationStatus.ts`
- `src/lib/bookings/status.ts` (status colors + labels + helpers)
- `supabase/migrations/<ts>_add_booking_operational_fields.sql`

**Edited**
- `src/pages/dashboard/DashboardBookings.tsx` — compose new sections, keep existing dialogs and mutations
- `src/components/bookings/BookingsList.tsx` — becomes the list-view renderer used by `AppointmentsPanel`; add action `DropdownMenu`, row click → drawer, avatar cell
- `src/hooks/useBookings.ts` — extend `Booking` type with `internal_notes`, `reminder_sent_at`; extend `useUpdateBooking` args (already generic)

### 8. Non-goals (kept out of this pass)

- No new "send reminder" delivery pipeline beyond wiring the action to an existing send function + timestamping `reminder_sent_at`. Full templated reminder scheduler is a follow-up.
- No drag-to-reschedule inside calendar view; clicking opens the existing reschedule link.
- No changes to public `/book/:slug` page.

Existing bookings, booking pages, and public link behaviour remain untouched.
