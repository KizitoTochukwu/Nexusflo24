

# Fix: Replace Hardcoded "Placeholder" Integration Status with Live Status

## Problem
The Integration Status section on the Review & Launch step (Step 5) of the campaign wizard shows hardcoded "Placeholder" badges for Email, WhatsApp, and SMS. It never checks whether these services are actually configured.

## Solution
Replace the static badges with a live status check using the existing `integration-status` edge function, which already returns `{ resend: bool, twilio: bool, whatsapp: bool }` for admin users.

Since non-admin users won't have access to the admin-only `integration-status` function, we'll use a simpler approach: call the function and gracefully fall back to "Unknown" if forbidden, or show green "Connected" / red "Not Configured" badges based on the response.

## Changes

### `src/components/campaigns/CreateCampaignDialog.tsx`
1. Add a `useEffect` or `useQuery` that calls the `integration-status` edge function when Step 5 is reached
2. Replace the three hardcoded "Placeholder" `<span>` elements with dynamic badges:
   - **Connected** (green) — when the key is configured
   - **Not Configured** (red/amber) — when not configured
   - **Checking...** (gray) — while loading
3. Update labels to match actual providers: "Email (Resend)" instead of "SendGrid/MailerLite", "SMS (Twilio)" instead of "SMS Gateway"
4. Only show the integration status for the **selected channel** (highlight the relevant one)

### Technical Details
- Uses `supabase.functions.invoke("integration-status")` — already deployed
- Gracefully handles 403 (non-admin users) by showing "Status unavailable" instead of erroring
- No database changes needed

