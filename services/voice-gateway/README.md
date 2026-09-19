# NexusFlo Voice gateway

Persistent WebSocket service that carries live call audio between Twilio
Programmable Voice and the OpenAI Realtime API. It runs on Google Cloud Run,
outside the NexusFlo24 app, because edge functions are short-lived and cannot
hold an open audio connection.

It holds **no database credentials**. Each call arrives with a short-lived,
signed token that names only that call, its workspace and the tools that call
may use. Everything else goes through the platform's `voice-gateway-session`
and `voice-tools` endpoints.

## Deploy to Cloud Run

```bash
cd services/voice-gateway
gcloud run deploy nexusflo-voice-gateway \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --min-instances 1 \
  --timeout 3600 \
  --set-env-vars PLATFORM_FUNCTIONS_URL=https://<project-ref>.supabase.co/functions/v1 \
  --set-secrets OPENAI_REALTIME_API_KEY=openai-realtime-key:latest
```

Notes:
- `--min-instances 1` keeps a warm instance so the first caller is not left in
  silence during a cold start.
- `--timeout 3600` allows long calls; Cloud Run supports WebSockets natively.
- `--allow-unauthenticated` is required because Twilio connects directly; the
  per-call token is the actual authentication.

After deploying, copy the service URL (for example
`https://nexusflo-voice-gateway-xxxx.a.run.app`) into the NexusFlo24 secret
`VOICE_GATEWAY_URL`.

## Environment

| Variable | Purpose |
| --- | --- |
| `PLATFORM_FUNCTIONS_URL` | NexusFlo24 functions base URL |
| `OPENAI_REALTIME_API_KEY` | OpenAI key with Realtime access |
| `OPENAI_REALTIME_MODEL` | Optional model override (default `gpt-realtime`) |
| `PORT` | Set automatically by Cloud Run |

## Health check

`GET /healthz` returns `{"ok":true}`. Calls connect on `GET /twilio?token=…`
(WebSocket upgrade).
