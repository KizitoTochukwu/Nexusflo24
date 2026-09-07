# Reuse an existing campaign: full "Use as template" duplicate flow

## Goal
Let you reuse any existing campaign instead of starting from scratch: duplicate it with ALL of its settings, open the result prefilled in the campaign editor so you can change the audience/receivers or anything else, then save and send — nothing is sent automatically.

## Current state (verified)
- The ⋯ row menu has **Duplicate**, but it only copies `name`, `type`, `objective`, `audience_filter`, `message_content`. It drops `campaign_mode`, `trigger_config`, `fallback_settings`, `scheduled_at`, sender profile IDs and the WhatsApp template selection.
- The copy is created immediately as a draft named "X (Copy)" with no chance to review or adjust.
- `CreateCampaignDialog` already supports edit mode (`editCampaign` prop) that prefills the full editor and saves via `useUpdateCampaign` without resending.

## Changes

### 1. Duplicate opens the editor, prefilled (DashboardCampaigns.tsx + CreateCampaignDialog.tsx)
- Change Duplicate so it no longer creates a copy silently. Instead it opens the campaign editor with every field prefilled from the source campaign:
  - name: "X (Copy)"
  - channel, objective, mode, trigger config
  - message subject/body, template settings, WhatsApp template, sender profiles
  - audience filters / selected leads, fallback settings, schedule
- Status is always reset to **draft**; the copy only exists once you click Create Campaign in the dialog.
- Implementation: extend the dialog's existing `editCampaign` prefill path with a `templateCampaign` mode (same prefill, but saves via `useCreateCampaign` instead of `useUpdateCampaign`).

### 2. Keep it explicit
- Rename the menu item to "Duplicate / Use as template" for discoverability.
- No campaign is sent on save for broadcast + send-now... keep the existing create behavior (send-now broadcasts execute after creation) but show a confirmation note in the dialog when the duplicated campaign would send immediately, so reusing a broadcast can't surprise-send.

### 3. No backend changes
- No database changes, no resending of existing campaigns, existing campaigns untouched.

## Verification
- Typecheck/build must pass.
- Browser check: duplicate a multi-channel triggered campaign → editor opens fully prefilled → change audience → create → new draft appears, source campaign unchanged.
