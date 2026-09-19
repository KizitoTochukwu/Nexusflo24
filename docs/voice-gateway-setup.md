# NexusFlo Voice — going live checklist

Three things sit between the built product and answered calls.

## 1. Deploy the voice gateway (Google Cloud Run)

Source lives in `services/voice-gateway`. Follow its README. Copy the resulting
service URL.

## 2. Save the secrets in NexusFlo24

| Secret | Value |
| --- | --- |
| `VOICE_GATEWAY_URL` | The Cloud Run service URL (`https://…run.app`) |
| `VOICE_GATEWAY_SIGNING_KEY` | A strong random string (`openssl rand -hex 32`), saved here **and** set on the Cloud Run service |
| `VOICE_INBOUND_PUBLIC_URL` | Optional: the exact inbound webhook URL Twilio calls, when a proxy rewrites it |
| `VOICE_STATUS_PUBLIC_URL` | Optional: same, for the status callback |

The OpenAI Realtime key is set on Cloud Run only — the platform never needs it.

## 3. Point the number at NexusFlo24

Each voice number needs, on the Twilio number configuration:

- **A call comes in** → Webhook, HTTP POST
  `https://<project-ref>.supabase.co/functions/v1/voice-inbound-call`
- **Call status changes** → Webhook, HTTP POST
  `https://<project-ref>.supabase.co/functions/v1/voice-call-status`

Both requests are signature-verified with the workspace's Twilio auth token and
rejected (403) when the signature does not match.

## What happens on a call

1. Twilio posts to `voice-inbound-call`. The signature is checked, the dialled
   number is matched to a workspace and assistant, and one call record is
   created per Twilio call id (retries are safe).
2. If voice is switched off, the assistant is not live, the gateway is not
   configured, or the concurrent-call limit is reached, the caller hears an
   honest message and is transferred where a transfer number is set — never a
   dead line, and never a claim of being an emergency service.
3. Otherwise the caller is connected to the gateway with a token valid for ten
   minutes, naming only that call and its permitted tools.
4. The gateway fetches the published instructions, streams the conversation,
   writes transcript turns, and may only use tools the assistant is allowed.
5. `voice-call-status` closes the call out: real duration, minutes recorded
   once, and the call synced into the CRM.
