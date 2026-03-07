

## Plan: Google Calendar OAuth Integration for Bookings

### Overview
Connect Google Calendar to booking pages so that (1) new bookings automatically create calendar events, and (2) the availability checker blocks off times marked busy in Google Calendar. This requires a server-side OAuth flow, encrypted token storage, and updates to both booking edge functions.

### Prerequisites — Google OAuth Credentials
Two new secrets are needed: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. These come from Google Cloud Console (OAuth 2.0 credentials with `https://www.googleapis.com/auth/calendar` scope). The redirect URI will point to a new edge function that handles the OAuth callback.

### Database Changes (1 migration)

**Table: `google_calendar_tokens`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid | RLS scoped |
| user_id | uuid | who connected |
| access_token | text | encrypted |
| refresh_token | text | encrypted |
| token_expires_at | timestamptz | |
| calendar_id | text | default `'primary'` |
| created_at / updated_at | timestamptz | |

RLS: workspace admin CRUD only.

**Add column to `booking_pages`:**
- `google_token_id uuid` nullable FK → `google_calendar_tokens.id` (links a booking page to a specific Google Calendar connection)

### Edge Functions

**1. `google-calendar-auth/index.ts`** (NEW, verify_jwt = false)
- Two modes based on query param `action`:
  - `action=start`: Receives `workspace_id` + `booking_page_id` from authenticated user, builds Google OAuth URL with `calendar` scope, stores state in a signed JWT, redirects user to Google consent screen.
  - `action=callback`: Google redirects here with `code`. Exchanges code for tokens via Google's token endpoint, stores encrypted tokens in `google_calendar_tokens`, links to booking page, redirects back to dashboard.

**2. `google-calendar-refresh/index.ts`** (NEW helper, called internally)
- Takes a `google_calendar_tokens.id`, checks if `token_expires_at` is past, refreshes via Google's token endpoint using `refresh_token`, updates the row. Returns a valid `access_token`.
- Not a separate function — will be a shared utility within the edge functions that need it.

**3. Update `book-appointment/index.ts`**
- After creating the booking row, check if the booking page has a linked `google_token_id`.
- If yes, refresh the token if needed, then call `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` with the booking details (summary, start/end, attendee email).
- Store the returned `event_id` in `bookings.google_event_id`.

**4. Update `booking-availability/index.ts`**
- After fetching existing bookings from DB, check if the booking page has a linked `google_token_id`.
- If yes, refresh token, then call `GET https://www.googleapis.com/calendar/v3/freeBusy` for the requested date range.
- Merge Google Calendar busy periods with DB bookings before computing available slots.

### Frontend Changes

**5. Update `BookingPageForm.tsx`**
- Replace the "Coming Soon" badge with a "Connect Google Calendar" button.
- If already connected, show "Connected" status with a "Disconnect" option.
- The connect button opens a new window/tab to the `google-calendar-auth?action=start` URL.
- After redirect back, the form reloads to show connected state.

**6. New hook: `useGoogleCalendar.ts`**
- Queries `google_calendar_tokens` for the workspace to check connection status.
- Provides `connect(bookingPageId)` and `disconnect(bookingPageId)` functions.

### Config Changes

**7. `supabase/config.toml`**
- Add `[functions.google-calendar-auth]` with `verify_jwt = false` (handles its own auth via state JWT).

### Security
- Access and refresh tokens are stored server-side only, never exposed to the client.
- The OAuth state parameter uses a signed JWT to prevent CSRF.
- Token refresh happens server-side in edge functions.
- RLS restricts token rows to workspace admins.

### Secrets Needed
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

### Flow Summary
```text
User clicks "Connect Google Calendar"
  → Opens google-calendar-auth?action=start&workspace_id=X&booking_page_id=Y
  → Redirects to Google consent screen
  → Google redirects to google-calendar-auth?action=callback&code=...&state=...
  → Edge function exchanges code for tokens, stores in DB
  → Redirects user back to dashboard/bookings

Guest books a slot:
  → book-appointment creates booking
  → If google_token_id set: refresh token → create Google Calendar event
  → Store google_event_id on booking

Guest checks availability:
  → booking-availability computes slots from DB
  → If google_token_id set: refresh token → fetch freeBusy → merge busy times
  → Return filtered slots
```

