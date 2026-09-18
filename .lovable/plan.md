# NexusFlo Voice — Milestone 1: Inspection and Architecture Map

No code or database changes in this milestone. Below is what exists today, what can be reused, what is missing, and the build order proposed for approval.

## What already exists and can be reused

**Accounts and access**
- One React app, one login, workspaces with membership roles; dashboard lives at `/dashboard/:workspaceId/...`. Security rules per workspace are already enforced in the database, with helper checks for member and admin.
- Platform-admin area already exists with health and monitoring pages.

**CRM**
- Contacts, companies, leads, deals, pipelines and stages, tasks, notes, tags, custom fields, lead scoring, duplicate detection, timeline activities and audit log. Phone matching and contact-creation helpers already exist, so a caller can be matched or created without new logic.

**Bookings**
- Appointment types, availability rules and overrides, booking pages, bookings, reminders, teams, Google Calendar connection, plus reschedule and cancel flows. A voice assistant can book through the existing availability and booking services.

**Automations and messaging**
- Automation builder with triggers, conditions, branching, delays, scheduled jobs, execution logs and the recently upgraded variable system. Email (Resend/SendGrid), SMS and WhatsApp (Twilio and Meta) sending, credits, usage recording and provider health pages.

**Billing**
- Stripe subscriptions and portal, plan tiers in code, credit packs, usage ledger, communication usage and message-credit deduction.

**Design and AI**
- Navy/gold design system, shared tables, charts, forms, drawers. An in-app AI assistant (Nexus AI) and several AI generators already run through the platform AI gateway.

**Twilio**
- Already connected for SMS and WhatsApp: account credentials stored, sub-account provisioning and number purchasing functions exist, and webhook-handling patterns with encrypted per-workspace credentials are established. Voice has never been used.

## What is missing or conflicts

1. **No persistent audio runtime.** Backend functions here are short-lived and cannot hold a live phone-audio WebSocket. A separate small voice-gateway service must be hosted outside this project (Fly.io, Cloud Run, Render or similar). This is the single biggest external dependency and it needs your decision on hosting and cost.
2. **No real-time voice AI credential.** The platform AI gateway covers chat and text generation, not live telephone speech. A real-time voice model key (for example OpenAI Realtime) will be required, added as a secret.
3. **No voice data model.** Nothing exists for assistants, phone numbers, call sessions, transcripts, recordings, knowledge sources or voice usage.
4. **No search/embedding support in the database.** The vector extension is not installed. Knowledge answers will start with structured FAQ and keyword matching; semantic search needs the extension enabled later.
5. **No private storage area for recordings or knowledge documents.** Existing buckets are for other modules.
6. **No separate hostname.** Everything runs from one domain with `/dashboard/:workspaceId`. Recommendation: build Voice inside the existing app at `/dashboard/:workspaceId/voice/...` and point `voice.nexusflo24.com` at the same app as an entry point, keeping one session and one codebase (the brief allows this).
7. **Plan limits live in code, not the database.** Voice minutes, concurrent-call caps and overage need a real entitlement and usage record, similar to message credits.
8. **Twilio Voice not configured.** No voice-capable numbers, no voice webhooks, no recording or transfer setup yet.
9. **No document text extraction** for PDF/DOCX knowledge uploads.

## Proposed implementation sequence

Each step ships behind a feature flag, with truthful "Not connected / Setup required" states where a provider is missing.

1. **Data model and security (Milestone 2).** Additive tables: voice assistants and versioned published configs, phone numbers, call sessions, call events, transcripts, recordings metadata, knowledge sources and chunks, voice usage ledger, voice settings. Workspace-scoped access rules and grants. Two private storage areas: call recordings and knowledge documents. No existing table changed.
2. **Navigation and routes (Milestone 3).** A permission-aware "NexusFlo Voice" menu item and the Voice sub-routes inside the existing dashboard, deep-link safe behind the current login. `voice.nexusflo24.com` mapped to the same app.
3. **Assistant wizard and versioning (Milestone 4).** Save-and-resume 12-step setup, statuses draft/testing/active/paused/degraded/archived, server-generated runtime prompt, published versions with rollback, and an activation checklist that blocks going live while dependencies are missing.
4. **Knowledge base (Milestone 5).** FAQs, business profile, services, policies, approved URLs, document upload, states and retry, assistant assignment, unanswered-question approval queue. Keyword retrieval first; semantic search added once the vector extension is enabled.
5. **CRM identity and timeline (Milestone 6).** Reuse existing phone normalisation and contact upsert so a call creates exactly one contact, logs a timeline entry, and applies configured pipeline, stage, owner, tags and score.
6. **Booking and handover tools (Milestone 7).** Server-side tools the assistant may call: real availability, book, transfer, callback request — each permission-checked and idempotent.
7. **Numbers and provider setup (Milestone 8).** Voice-capable Twilio numbers per workspace, assignment to an assistant, webhook configuration, truthful connection status, release confirmation.
8. **Voice gateway contract and secure webhooks (Milestone 9).** Signature-verified inbound webhook, one call session per provider call ID, short-lived signed gateway token carrying only call, assistant, workspace, expiry, permitted tools and config version. Gateway deployed separately; it never holds database credentials.
9. **Call inbox and post-call processing (Milestone 10).** Call list and detail with transcript, recording (protected access), summary, extracted fields, outcome, intent and sentiment; replay-safe processing.
10. **Automations (Milestone 11).** New call triggers and actions wired into the existing automation engine, firing exactly once.
11. **Usage, billing and analytics (Milestone 12).** Voice minutes entitlement, concurrent-call limits enforced server-side, overage, and analytics that reconcile with call records.
12. **Marketing page and demo (Milestone 13).** `/ai-receptionist` page and a controlled demo.
13. **Security, accessibility and regression testing (Milestone 14).** Signature, idempotency, access-rule, tool-boundary, prompt-injection and failure-recovery tests, plus mobile and state coverage.

## Decisions needed before Milestone 2

- **Voice gateway hosting.** Which provider should host the small always-on audio service (Fly.io, Cloud Run, Render, Railway)? I can write the service and deployment files here, but you deploy and hold its credentials.
- **Real-time voice model.** Confirm OpenAI Realtime, and supply the key when we reach Milestone 9.
- **Twilio account.** Use the existing NexusFlo24 Twilio account for voice numbers, or a separate one.
- **Recording default.** Recording off by default with per-workspace opt-in, and a retention period (suggested 90 days).
- **Commercials.** Included voice minutes per plan and the overage rate — needed for Milestone 12.

## Technical notes

- Stack confirmed: React 18 + Vite + Tailwind + TypeScript, Supabase (Postgres, auth, storage, edge functions, pg_cron, pgmq, pg_net), Stripe, Twilio, Meta, Resend/SendGrid.
- Installed extensions: pg_cron, pg_net, pgcrypto, pgmq, supabase_vault, uuid-ossp. `vector` is absent.
- Existing secrets already cover Twilio, Stripe, Meta, WhatsApp, Google and email; new secrets needed later: realtime voice model key, gateway signing key, gateway URL.
- Per-workspace provider credentials follow the existing AES-GCM encrypted pattern used by SMS/WhatsApp settings.
