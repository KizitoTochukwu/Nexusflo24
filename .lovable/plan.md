# Connect Client Finder mailboxes and data providers

Turn the four "not configured" capabilities into real, working connections: per-user Gmail and Outlook sending mailboxes, Apollo for company/contact discovery, and Hunter for email verification.

## 1. Gmail and Outlook mailboxes (per app user)

Each workspace user connects their own mailbox — nobody sends from a shared platform account.

- Register the Gmail and Outlook App User Connector clients on this project (a Lovable approval card will appear for each; the Gmail one uses Lovable-managed OAuth as you chose, the Outlook one needs a Microsoft app registration).
- Store each user's connection securely server-side, encrypted, keyed to their signed-in account. Nothing sensitive reaches the browser.
- Replace the current hand-rolled Google/Microsoft OAuth path in the mailbox function with the connector flow, keeping the existing `prospecting_mailboxes` records, health status, daily limits, disconnect behaviour and "campaigns pause when a mailbox goes away" safeguard.
- Sending: approved sequences send through the connected mailbox via the connector gateway. If a user has no mailbox connected, the existing verified workspace sender is still used and the UI says so plainly.
- Settings page: both cards become live Connect / Reconnect / Disconnect with the connected address, connection date, and last error shown truthfully.

Scopes requested: send mail, read mail (for reply detection), and basic profile — nothing more.

## 2. Apollo — company and contact discovery

- Add an Apollo adapter behind the existing provider interface: company search from an approved ICP (industry, size, location, keywords), and decision-maker lookup per company with title/seniority filters.
- Results are written as normal prospect rows with the source recorded, so every row is traceable to Apollo and dated.
- Discoveries count against the workspace's monthly discovery allowance, enforced on the server as today.
- Apollo's key is a workspace/platform credential stored as a server secret — never in the browser.

## 3. Hunter — email verification

- Add a Hunter adapter for email verification: deliverable / risky / undeliverable / unknown, with the confidence score and check date stored on the prospect contact.
- Undeliverable addresses are blocked from sending and flagged in the prospect table.
- Verifications count against the monthly verification allowance.

## 4. Provider status surface

The Data providers table stops showing "not configured" for connected capabilities and instead shows the live provider name, a real credential check result, and the last-checked timestamp. Any capability without a key keeps the current honest not-configured state and CSV import stays available.

## What I need from you

- **Apollo API key** and **Hunter API key** — I will request them through the secure secret prompt when I start building; they are never written into the code.
- **Microsoft**: an Entra app registration (client ID/secret) for the Outlook connector. Gmail needs nothing from you if you accept the Lovable-managed client.

Anything you cannot supply stays visibly not configured rather than pretending to work.

## Technical notes

- Gmail/Outlook use App User Connectors (`google_mail`, `microsoft_outlook`) with per-user connection keys encrypted at rest in a service-role-only table; provider calls go through the connector gateway from edge functions only.
- Apollo/Hunter adapters live in `supabase/functions/_shared/prospect-providers/` and are called only from server functions; keys read from `Deno.env`.
- `prospecting_provider_connections` rows are updated with real verification results and `last_checked_at`; no simulated rows.
- Entitlement checks (`checkEntitlement`) wrap every discovery, verification and send call, as with existing AI operations.
- Existing design system, tables and RLS are reused; migrations are additive only.
- Verification: type-check, tests, a live credential check per provider, and an authenticated browser pass over Settings, Prospects and Outreach.
