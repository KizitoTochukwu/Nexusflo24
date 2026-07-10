## Plan

1. **Fix the data model issue causing credentials to be overwritten**
   - Keep Meta connection details in `whatsapp_settings`.
   - Keep Twilio credentials in `workspace_channel_settings`.
   - Stop treating the single `workspace_channel_settings` WhatsApp row as both Meta and Twilio storage, because switching providers currently overwrites the previous provider's saved config.

2. **Add proper provider-aware backend switching**
   - Update the WhatsApp provider trigger/function logic so activating Meta only deactivates the Twilio row, and activating Twilio only deactivates Meta.
   - Adjust uniqueness so saved Twilio and Meta rows can coexist without both being active at the same time.
   - Add a migration to safely support provider-specific rows and repair existing WhatsApp channel rows where possible.

3. **Update Meta activation flow**
   - When Meta signup/activation succeeds, save or update only the Meta provider row.
   - Do not overwrite or delete existing Twilio credentials.
   - After activation, refresh state from the backend before showing success.

4. **Update Twilio save/switch flow**
   - Save or update only the Twilio provider row.
   - Deactivate Meta without deleting Meta credentials or templates.
   - Preserve Twilio fields so switching away and back does not force users to re-enter credentials.

5. **Fix status retrieval and UI state**
   - Update `channel-settings-get` to return provider-specific WhatsApp state instead of collapsing everything into one `whatsapp` object.
   - Update `WhatsAppConnectCard.tsx` so:
     - top badge derives only from the database active provider,
     - each tab separately shows “saved/configured” vs “active”,
     - Meta tab no longer says “Not connected” when Meta is saved but inactive,
     - Twilio tab can prefill non-secret saved values and show masked secret fields.

6. **Keep explicit disconnect separate from switching**
   - “Switch provider” will only deactivate the current provider.
   - “Disconnect Meta” or “Disconnect Twilio” will explicitly disable/remove that provider setup as intended.
   - Existing templates, webhook info, Meta connection metadata, and Twilio webhook URLs remain intact.

7. **Verify the full flow**
   - Check Meta active + Twilio saved inactive.
   - Check Twilio active + Meta saved inactive.
   - Confirm campaign send routing uses the active provider only.
   - Confirm the UI badges and card content no longer contradict each other.