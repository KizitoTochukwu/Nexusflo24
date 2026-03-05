

## Plan: Update WhatsApp Access Token

Update the `WHATSAPP_ACCESS_TOKEN` secret with the new permanent System User token provided by the user. This is a single secret update — no code changes needed.

### Step
1. Use the `add_secret` tool to overwrite `WHATSAPP_ACCESS_TOKEN` with the new token value.

After updating, test WhatsApp sending from Settings → Integrations to confirm the credential mismatch is resolved.

