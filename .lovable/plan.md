# Live end-to-end channel test

Goal: prove, with real sends, whether Email, WhatsApp and SMS work — and whether a triggered multi-channel campaign fires correctly end to end.

## What I need from you

- The email address to send the test to.
- The mobile number (with country code) for the WhatsApp and SMS tests.
- Confirmation that number has messaged your WhatsApp business number in the last 24 hours (otherwise WhatsApp will only accept an approved template, and the test result will reflect that limitation rather than a fault).

## Test 1 — single-channel sends

Send one real message per channel to your details and record the exact provider response:

1. Email — one send, then check the email log for sent/failed and any provider error.
2. WhatsApp — one send; report whether it goes out as a free-form reply or a template, and capture the delivery status the provider reports back (submitted, delivered, read, or failed with Meta's error code).
3. SMS — one send; expected to fail while the Twilio account is suspended. I'll report the exact Twilio error rather than guessing.

## Test 2 — triggered multi-channel campaign

1. Create a temporary triggered multi-channel test campaign with real short content on all three channels, set to fire on a new lead.
2. Create one test lead carrying the test email and phone number.
3. Confirm the campaign fires: the trigger dispatch runs, a message record is written per channel, the lead status update and tag action apply, and the send count increases.
4. Check the fallback behaviour: when a channel fails, the next channel is queued with the configured delay rather than immediately.

## Cleanup

Remove the test lead, test campaign and their message records afterwards. Live campaign "summa" will not be touched in this task.

## Report

A short table per channel: sent / failed, the provider's own status, and the precise error where one occurred. Plus a clear verdict on whether triggered multi-channel firing works, and what remains blocked (currently Twilio reinstatement for SMS).

## Technical notes

- Sends go through the existing `email-send`, `whatsapp-send` and `sms-send` functions so the test exercises the real paths including credit deduction and pacing.
- WhatsApp status is only treated as truth when a signed Meta webhook confirms it; an HTTP 200 is reported as "submitted", not "delivered".
- Trigger firing is verified via the campaign dispatch path used by `capture-lead` / `ingest-leads`, not by calling `execute-campaign` directly.
