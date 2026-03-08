
-- Backfill lead_id on whatsapp_messages from matching leads by phone number
UPDATE whatsapp_messages wm
SET lead_id = l.id
FROM leads l
WHERE wm.lead_id IS NULL
  AND wm.direction = 'outbound'
  AND l.phone = wm.phone_number
  AND l.workspace_id = wm.workspace_id;

-- Mark campaign_messages as opened for WhatsApp messages the user confirmed were read
UPDATE campaign_messages
SET opened = true
WHERE channel = 'whatsapp'
  AND delivery_status = 'delivered'
  AND opened = false;
