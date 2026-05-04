## Goal

When a guest books a demo, the confirmation email (and host email) should include a join link — either an auto-generated Google Meet link or a manually configured link (Zoom, Teams, custom URL, or in-person address).

## Current gap

- `booking_pages` has no location/meeting-link field.
- `bookings` stores `google_event_id` but never reads back the Meet link.
- The Google Calendar event is created without `conferenceData`, so no Meet link is generated.
- The confirmation email never renders a "Join meeting" section.

## Plan

### 1. Database migration
Add to `booking_pages`:
- `location_type` text — one of: `google_meet` (default when Google Calendar connected), `zoom`, `custom_link`, `in_person`, `phone_call`
- `location_value` text — the Zoom/custom URL or physical address (nullable; unused for `google_meet`)

Add to `bookings`:
- `meeting_url` text — final resolved link saved at booking time (Google Meet link from Calendar API response, or copied from `location_value`)
- `meeting_location` text — human-readable location for in-person/phone bookings

### 2. Booking page form (`src/components/bookings/BookingPageForm.tsx`)
Add a "Meeting location" section:
- Radio/select: Google Meet (auto) · Zoom link · Custom link · In-person · Phone call
- Conditional input for the URL/address depending on choice
- Google Meet option is only enabled when a Google Calendar is connected; show a hint otherwise

### 3. `book-appointment` edge function
- When `location_type = 'google_meet'` and a Google token exists, include `conferenceData.createRequest` with `conferenceSolutionKey: { type: 'hangoutsMeet' }` in the event payload and add `?conferenceDataVersion=1` to the Calendar API URL. Read back `conferenceData.entryPoints[0].uri` (or `hangoutLink`) and store as `meeting_url`.
- For other types, copy `location_value` directly into `meeting_url` / `meeting_location`.
- Pass meeting details into the email layout.

### 4. Email template
Add a new "Join meeting" card above the action buttons in both guest + host emails:
- For URL types: gold "Join meeting" CTA button + small text with the link and the platform name (Google Meet / Zoom / Custom)
- For in-person: location address with a globe glyph
- For phone call: phone number with the existing phone glyph
- Include a small "Add to calendar" hint line for guest emails

### 5. Public booking page
After successful booking, show the meeting link on the confirmation screen too (so the guest sees it immediately without needing email).

## Technical notes

- Google Meet auto-generation requires `conferenceDataVersion=1` query param on the events.insert call — easy to miss.
- Existing Calendar OAuth scope (`/auth/calendar`) already permits creating Meet conferences; no scope change needed.
- For workspaces without Google Calendar connected, default `location_type` to `custom_link` and require the user to fill it in (validation in the form).
- All changes are backward-compatible: existing booking pages get `location_type = 'custom_link'` with empty `location_value` — emails simply omit the join card if no link is present.

## Files touched

- New migration (booking_pages + bookings columns)
- `src/components/bookings/BookingPageForm.tsx`
- `supabase/functions/book-appointment/index.ts`
- `src/pages/PublicBooking.tsx` (success screen)
