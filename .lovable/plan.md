## What I found right now

The WhatsApp webhook is active and receiving your messages.

- Your messages at `18:47:20`, `18:47:43`, and `18:48:02 UTC` were stored as inbound WhatsApp messages.
- The webhook triggered the AI Sales Closer each time.
- AI classification worked each time: `intent: interest`, `confidence: 100`.
- The reason no auto-reply was sent for those latest messages is a backend status bug introduced while making send-status more honest:
  - `ai-sales-closer` tried to create the outbound AI reply with status `sending`.
  - The `sales_conversations` table only allows: `draft`, `pending_approval`, `sent`, `delivered`, `failed`.
  - Because `sending` is not allowed, the outbound reply record was rejected before `whatsapp-send` was called.
- The older `WhatsApp not configured` problem has already been addressed by wiring the sender to use the active Meta WhatsApp connection and setting the approved default template.

## Plan to fix it once and for all

1. **Fix the invalid status flow**
   - Change `ai-sales-closer` so it never writes `sending` to `sales_conversations`.
   - For auto-send replies, create the outbound record as `draft`, then update it to `sent` only after WhatsApp confirms success, or `failed` if sending fails.

2. **Make the auto-reply path fail loudly and visibly**
   - If creating the outbound reply record fails, return a clear error and log it instead of returning `status: sending`.
   - If the WhatsApp send fails, store the failure reason in the conversation `meta.send_result`.

3. **Confirm WhatsApp sender wiring**
   - Keep the current `whatsapp-send` credential resolution:
     - workspace Meta credentials first from active WhatsApp settings
     - repair the legacy channel settings mirror automatically
     - only fallback to platform credentials if workspace settings are unavailable

4. **Verify live after implementation**
   - Check the latest inbound message chain again.
   - Ask you to send one final WhatsApp message.
   - Confirm in the backend:
     - inbound message stored
     - AI reply generated
     - outbound WhatsApp message created
     - provider message ID returned
     - status becomes `sent` or a clear error is stored

## Important note

There is no evidence that Meta webhook delivery is the problem now. The messages are arriving and AI is processing them. The current blocker is the invalid `sending` status preventing the outbound reply from being created and sent.