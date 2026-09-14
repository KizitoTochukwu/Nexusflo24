# Message credits audit: why nothing is deducting, and the fix

## What I checked

Live database and the sending code for Email, SMS and WhatsApp.

Current balances: Email 500, SMS 162, WhatsApp 200 — last changed 28 April, even though 438 emails, 135 texts and 617 WhatsApp messages have been sent since.

## What is actually wrong

**1. Your own account is exempt from all charges (the main cause).**
The system gives unlimited free messaging to any workspace whose owner is a platform admin. Your account is the only admin, so every single message you send is logged as "admin exempt" and charged nothing. The history shows 84 exempt sends (36 email, 33 WhatsApp, 15 SMS) and no charges since April. Credits are not broken — they were switched off for you and every workspace you own.

**2. Some sending paths are never charged.**
Messages sent by the AI Sales Closer and by the Nexus AI assistant are marked "skip charge" and no charge is taken anywhere else in those paths. Anyone using those features messages for free.

**3. Texts are missing from the usage reports.**
The usage table holds zero SMS rows despite 135 texts sent, and 106 of the 113 rows it does hold record "0 credits". So the admin usage and reporting screens understate real volume.

**4. Charging is not race-safe.**
Two sends at the same moment can collide; one is refused with "Failed to deduct credit (contention). Retry." instead of simply going through. On a campaign blast this silently fails messages.

**5. No refund when a send fails.**
WhatsApp returns the credit if the message is rejected, but email and SMS do not — a failed send still costs a credit.

## What I will change

### A. Replace the blanket admin exemption with a deliberate switch
- Remove "the owner is an admin, so everything is free" from email, SMS, WhatsApp, campaigns and automations.
- Add a per-workspace **Unlimited messaging** flag that only platform staff can set, shown clearly in the admin area and on the workspace's own credits panel ("Unlimited — no credits deducted").
- Your workspaces get this flag switched on during the change, so nothing breaks for you today; every other workspace starts being charged correctly.

### B. Charge every sending path
Route AI Sales Closer and Nexus AI sends through the same charge as everything else, so no channel can send for free.

### C. Make charging reliable
- Move the balance change into a single database operation so simultaneous sends can never collide or double-charge.
- Return the credit automatically when email or SMS fails before the provider accepts it (matching how WhatsApp already works).

### D. Fix usage recording
Record a usage row for every send on all three channels with the real credit amount, including exempt sends (recorded as 0 with a reason), so admin reporting matches reality.

### E. Make the balances visible and honest
- Credits panel shows balance, used this period, and a clear "Unlimited" state.
- Warning when a channel drops below 20, and a plain "You've run out of X credits — top up" message when a send is refused, instead of a raw error.

## Technical notes

- New `deduct_message_credit(workspace_id, channel, amount, reason, reference_id)` database function: `SECURITY DEFINER`, single atomic `UPDATE ... SET balance = balance - amount WHERE balance >= amount RETURNING`, writes the `credit_transactions` row in the same call. `credit-guard.ts` `deductCredit`/`addCredits` call it instead of read-then-write.
- New `message_credits.unlimited boolean not null default false` (additive), set true for the workspaces currently covered by the admin bypass. `isAdminUser`-based exemptions removed from `email-send`, `sms-send`, `whatsapp-send`, `twilio-whatsapp-send`, `execute-campaign`, `execute-automation`.
- `skipCredits` remains only for internal double-charge prevention (caller already charged), never as a free pass.
- `logUsage` in `_shared/usage-logger.ts` called on every success path in `sms-send` (currently missing) with `credits_deducted` set to the real amount.
- No data deleted; existing balances and history untouched.

## Verification after the change

1. Send a test email, SMS and WhatsApp from a normal (non-exempt) workspace and confirm each balance drops by one and a transaction row appears.
2. Force a failed send and confirm the credit comes back.
3. Run a small campaign and confirm the totals sent, charged and recorded all match.
