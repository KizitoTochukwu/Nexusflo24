

## Plan: Appointment / Calendar Booking Feature

### Overview
Build a booking system where users create booking pages with availability settings, leads book time slots via a public page, and bookings sync to Google Calendar. Booking links can be embedded in funnels (new "booking" block) and automations (new "book_appointment" action).

### Database Changes (1 migration)

**Table: `booking_pages`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid | RLS scoped |
| user_id | uuid | creator |
| name | text | e.g. "30-Min Discovery Call" |
| slug | text UNIQUE | public URL path |
| duration_minutes | int | default 30 |
| availability | jsonb | `{ mon: [{start:"09:00",end:"17:00"}], ... }` |
| timezone | text | default 'UTC' |
| buffer_minutes | int | default 15 (gap between bookings) |
| max_days_ahead | int | default 30 |
| description | text | shown on public page |
| color | text | brand accent |
| status | text | 'active' / 'inactive' |
| google_calendar_id | text | nullable, for sync |
| created_at / updated_at | timestamptz | |

**Table: `bookings`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| booking_page_id | uuid FK | |
| workspace_id | uuid | RLS scoped |
| lead_id | uuid FK nullable | linked lead |
| guest_name | text | |
| guest_email | text | |
| guest_phone | text nullable | |
| start_time | timestamptz | |
| end_time | timestamptz | |
| status | text | 'confirmed' / 'cancelled' / 'completed' |
| google_event_id | text nullable | |
| notes | text nullable | |
| created_at | timestamptz | |

RLS: workspace members CRUD on both tables. Public SELECT on active `booking_pages` by slug. Public INSERT on `bookings` (for guest submissions).

Auto-generate slug trigger similar to funnels.

### Edge Functions

**1. `book-appointment/index.ts`** (NEW, verify_jwt = false)
- Public endpoint for guests to book
- Input: `{ booking_page_id, guest_name, guest_email, guest_phone?, start_time, notes? }`
- Validates slot is available (no overlapping bookings, within availability window)
- Creates booking row
- Looks up lead by email in workspace, links `lead_id` if found; otherwise creates lead via `capture-lead` pattern
- Logs `call_booking` activity on the lead (triggers scoring: +50)
- If `google_calendar_id` configured, creates Google Calendar event (placeholder — needs OAuth)
- Returns confirmation

**2. `booking-availability/index.ts`** (NEW, verify_jwt = false)
- Public endpoint to fetch available slots for a booking page
- Input: `{ booking_page_id, date }` (or date range)
- Reads availability config, existing bookings, buffer, timezone
- Returns array of available time slots for the requested date(s)

### Frontend Components

**3. `src/pages/dashboard/DashboardBookings.tsx`** (NEW)
- List of booking pages with create/edit/delete
- Shows booking count, link to public page
- Booking page form: name, duration, description, availability grid (day × time ranges), timezone picker, buffer, max days ahead

**4. `src/components/bookings/BookingPageForm.tsx`** (NEW)
- Availability editor: 7-day grid with add/remove time slots per day
- Duration, buffer, timezone, max days ahead inputs
- Preview link

**5. `src/components/bookings/BookingsList.tsx`** (NEW)
- Table of upcoming bookings for the workspace
- Filter by booking page, status
- Cancel/reschedule actions

**6. `src/hooks/useBookings.ts`** (NEW)
- CRUD hooks for `booking_pages` and `bookings` tables

**7. `src/pages/PublicBooking.tsx`** (NEW)
- Route: `/book/:slug`
- Fetches booking page by slug
- Calendar date picker → available slots for selected date (via `booking-availability` EF)
- Guest form: name, email, phone, notes
- Confirmation screen after booking

### Funnel Builder Integration

**8. Add `"booking"` block type** to `blockTypes.ts` and `BlockLibrary.tsx`
- Props: `booking_page_id`, display style
- In `PublicBlockRenderer.tsx`: renders an embedded mini booking widget (date picker + slots + form)

### Automation Integration

**9. Add `"book_appointment"` trigger** to `useAutomations.ts` TRIGGER_OPTIONS
- Fires when a booking is created (the `book-appointment` EF checks for matching automations)

### Sidebar & Routing

**10. Update `DashboardLayout.tsx`**
- Add Calendar icon + "Bookings" nav item between Funnels and Analytics

**11. Update `App.tsx`**
- Add route: `<Route path="bookings" element={<DashboardBookings />} />`
- Add route: `<Route path="/book/:slug" element={<PublicBooking />} />`

### Google Calendar Integration (Placeholder)
- The `booking_pages.google_calendar_id` field and `bookings.google_event_id` field are created but Google Calendar OAuth is deferred to a follow-up (requires Google OAuth consent flow + token storage)
- A "Connect Google Calendar" button is shown in the booking page settings but marked as "Coming Soon"

### Deliverables Summary
| Component | What it does |
|---|---|
| 2 DB tables + RLS | `booking_pages`, `bookings` |
| 2 Edge Functions | `book-appointment`, `booking-availability` |
| Dashboard page | List/create/edit booking pages + view bookings |
| Public booking page | `/book/:slug` with date picker and slot selection |
| Funnel block | Embeddable booking widget in funnel pages |
| Automation trigger | `call_booking` trigger fires on new booking |
| Scoring | +50 via existing `call_booking` rule |

