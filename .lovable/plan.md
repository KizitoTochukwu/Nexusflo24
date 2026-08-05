# NexusFlo24 Bookings Module — Full Audit, Repair and Build

Scope confirmed: plan all 10 phases and build in one pass. Integrations: Google Calendar + Google Meet only (Outlook, Teams and Zoom screens are built but shown as "not connected" until credentials exist). Team scheduling: full (booking teams, round-robin, collective, group).

## Phase 1 — Audit findings (verified against the live schema and code)

| Capability | Status | Evidence |
| --- | --- | --- |
| Booking dashboard | Partially functional | `DashboardBookings.tsx` (159 lines) + `BookingsSummaryCards`; no conversion rate, by-host, by-source, activity feed |
| Calendar views | Partially functional | `AppointmentCalendarView` renders week/month/agenda; no day view, no drag-drop, no busy events, no now-indicator |
| Appointment types | Missing as a concept | `booking_pages` doubles as page + type; no capacity, slot interval, min notice, daily limit, custom questions |
| Availability | Partially functional | `booking_pages.availability` jsonb, single weekly schedule; no reusable schedules, overrides, holidays, per-type overrides |
| One-to-one | Fully functional | `book-appointment` end-to-end |
| Group meetings | Missing | no capacity column, no multi-invitee model |
| Team scheduling / collective | Missing | no booking teams tables |
| Round-robin | Partially functional | `assign_next_round_robin` exists for leads only, not bookings |
| Public booking page | Fully functional | `PublicBooking.tsx` (670 lines), `get_public_booking_page` |
| Confirmation page | Partially functional | in-page confirmation; no ICS download, no add-to-calendar buttons |
| Reschedule / cancel | Partially functional | `reschedule-booking`, `cancel-booking`; no cut-offs, attempt limits, reason capture |
| Time zones / DST | Fully functional | `booking-availability` does zoned wall-clock to UTC with DST correction |
| Reminders | UI only / missing | only `bookings.reminder_sent_at` set manually from the drawer |
| No-show workflow | Partially functional | status can be set; no timeline event, no workflow trigger |
| Google Calendar | Fully functional | `google-calendar-auth`, token refresh, conflict check, event create |
| Google Meet | Fully functional | `conferenceDataVersion=1` path in `book-appointment` |
| Outlook / Teams / Zoom | Missing | no code, no tables |
| CRM connection | Partially functional | lead matched/created, +50 score; not linked to contacts/companies/deals, not shown on records |
| Automation events | Partially functional | `book_appointment` trigger fires; no reschedule/cancel/no-show/reminder events, no idempotency |
| Security / RLS | Fully functional | all booking tables are workspace-scoped with policies |
| Mock data | None found | all views read the database |

## What gets built

### Data model (new tables, additive — nothing dropped)
- `appointment_types` — the meeting definition (kind: one_to_one / group / round_robin / collective, durations, capacity, slot interval, min notice, max advance, buffers, daily limit, colour, location options, policies, custom questions, reminder sequence, publish gating).
- `availability_schedules` + `availability_rules` + `availability_overrides` — reusable weekly hours, multiple ranges per day, date overrides, holidays, time off.
- `booking_teams` + `booking_team_members` — hosts, priority, paused flag, max meetings, assignment method.
- `booking_reminders` — scheduled per-booking reminder rows with channel, send-at, state, provider response (deduped).
- `booking_events` — idempotent automation event log keyed by `(booking_id, event_type, idempotency_key)`.
- `booking_attendees` — group-meeting invitees against capacity.
- Columns added to `bookings`: `appointment_type_id`, `host_user_id`, `contact_id`, `company_id`, `deal_id`, `answers`, `utm` attribution, `cancel_reason`, `reschedule_count`, `status_actor_id`, `status_changed_at`.
- Columns added to `booking_pages`: branding, intro text, tracking params, `is_published`. Existing pages are backfilled into a matching `appointment_types` row so nothing breaks.
- Every new table: GRANTs, RLS scoped by `is_workspace_member` / `is_workspace_admin`, indexes on `workspace_id` + time columns, unique constraint preventing overlapping confirmed bookings per host.

### Booking engine (server-side, authoritative)
- `booking-availability` extended: reusable schedules, overrides, buffers, min notice, max advance, daily limits, slot interval, group capacity, collective intersection across required hosts, connected-calendar busy times.
- `book-appointment` extended: transactional slot lock (advisory lock + unique index) so two simultaneous bookings cannot take the same slot, atomic round-robin host selection with fallback to the next eligible host, group capacity decrement, CRM resolution (lead → contact → company, dedupe by email then E.164 phone), custom answers + consent + UTM persisted, reminder rows scheduled, idempotent event emission.
- `process-booking-reminders` (new, cron every 5 min): sends due reminders through the existing email / SMS / WhatsApp senders, re-checks booking is still active, respects consent and WhatsApp template rules, records provider response, never double-sends.
- `reschedule-booking` / `cancel-booking` extended: cut-off + attempt-limit enforcement, reason capture, calendar event update/delete, Meet link refresh, old reminders cancelled and new ones scheduled, one idempotent event each.
- `booking-no-show-sweep` (new, optional per workspace): after a grace period, evaluates unmarked past bookings.

### Frontend
- `BookingsWorkspaceLayout` mirroring the CRM shell: sticky premium nav with Overview, Calendar, Appointment Types, Booking Pages, Availability, Team Scheduling, Integrations, Settings; mobile dropdown; breadcrumbs; single "Bookings" sidebar item retained; existing `/bookings` route preserved with sub-routes added.
- Overview dashboard: today / upcoming / pending / completed / cancelled / no-show / rescheduled counts, conversion rate, by type / host / source breakdowns, recent activity, filters (date range, host, team, type, status, source), quick actions.
- Calendar: day, week, month, agenda; host/team/type/status filters; drag-and-drop reschedule with optimistic update and rollback on failure; now-indicator; busy events from Google; colour by type or status; manual booking dialog; details drawer (reuses the existing drawer).
- Appointment Types: list + full editor with publish gating (blocks publish when host, availability, calendar or location is incomplete).
- Availability: schedule editor with weekly ranges, overrides, holidays, time off, assignment to hosts and types.
- Team Scheduling: teams, members, priority, pause, max meetings, workload view, reassignment, assignment method picker.
- Public booking page upgraded: branding, host photo, timezone selector, custom questions, consent, UTM capture; confirmation screen with ICS download, Add to Google/Outlook, reschedule and cancel via existing signed tokens.
- Integrations: Google Calendar (real OAuth, account, calendars, conflict calendars, last sync, errors, test, reconnect, disconnect) and Google Meet live. Outlook, Teams, Zoom render as explicitly disconnected with a "credentials required" note — no fake connected state.
- CRM: Bookings tab on contact, company and deal records; "Schedule meeting" action from a record.
- UX pass across all new screens: skeletons, empty states, error states, confirm dialogs, toasts, unsaved-change guards, keyboard access, mobile.

### Automation wiring
Events emitted through the existing automation engine (no second engine): booking created, confirmed, host assigned, rescheduled, cancelled, reminder due/sent/failed, meeting starting, completed, invitee no-show, host no-show, follow-up due, calendar connection failed, video-meeting creation failed. Each carries workspace, booking, type, host, CRM record, previous/new status, start/end, timezone, actor, source, timestamp — written to `booking_events` first, so retries cannot double-fire.

## Delivery order
1. Migration + RLS + backfill of existing pages into appointment types
2. Appointment types + availability engine
3. Calendar + overview dashboard
4. Public page + confirmation flow
5. Team, round-robin, group and collective
6. Google Calendar + Meet integration screens; other providers stubbed disconnected
7. Reminders, cancellation, rescheduling
8. CRM, messaging and automation wiring
9. No-show workflows and reporting
10. End-to-end test journey and final report

## What you need to provide
Nothing new for Google — the existing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` cover Calendar and Meet. Outlook, Teams and Zoom stay disabled until you supply an Entra app registration and a Zoom OAuth app.

## Known limitations of this pass
- Outlook/Teams/Zoom are screens only, clearly labelled disconnected.
- Google push-notification webhook renewal is polling-based on the existing token refresh, not channel webhooks.
- Rate limiting on public endpoints is per-IP in the edge function, not a platform WAF.
