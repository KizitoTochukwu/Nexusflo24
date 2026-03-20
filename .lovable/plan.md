


# Phase 1: Usage-Based Message Credit System ✅

## Overview
Add a message credit system so every outbound message (email, SMS, WhatsApp) deducts from a workspace balance. Credits are purchased through Stripe and managed entirely within NexusFlo24 — no third-party accounts needed.

**Status: COMPLETE**

---

# Phase 2: Credit Visibility & Alerts ✅

## Overview
Make credit balances visible throughout the dashboard, surface included credits on the public Pricing page, provide full transaction history, and alert users when credits run low.

**Status: COMPLETE**

---

# Phase 3: Templates, White-Label, Smart Lists & Chatbot Enhancements ✅

## Overview
Add a Template Marketplace, White-Label branding for Enterprise subscribers, Smart Lists (saved filter presets) for the CRM, and enhance the AI chatbot with lead capture capabilities.

**Status: COMPLETE**

## Implemented

### 1. Template Marketplace
- New `templates` DB table with category, config, tags, popularity, and premium flag
- Dashboard page at `/dashboard/:workspaceId/templates` with category tabs (Email/Automation/Funnel)
- Search, filtering, and placeholder templates shown when DB is empty
- Premium templates gated with lock badge; one-click install for free templates
- Sidebar nav item added ("Templates" with ShoppingBag icon)

### 2. White-Label / Agency Mode
- `workspace_branding` DB table storing logo_url, icon_url, brand_color, brand_name, custom_domain
- Settings → Branding tab with logo/icon upload, color picker, custom domain input
- Live preview of brand identity (buttons, colors, logo)
- Enterprise-gated via `LockedFeature` wrapper (requires `whiteLabelBranding` plan flag)

### 3. Smart Lists & Saved Filters
- `smart_lists` DB table storing workspace-scoped filter presets (name, icon, filters JSONB)
- `SmartListPanel` component in the Leads sidebar below folders
- Save current active filters with emoji icon picker
- Click to instantly apply saved filter preset; delete with hover action
- Filters saved: status, source, pipeline stage, AI verdict, sort

### 4. AI Conversational Chatbot Enhancement
- Updated `nexus-ai-chat` edge function with lead capture system prompt
- AI detects when visitors share name + email and emits `[LEAD_CAPTURED]` tag
- ChatbotWidget parses the tag, strips it from display, and sends lead data to backend
- Leads stored with source "AI Chatbot" and conversation intent
- "Lead saved" badge appears in chat header after capture
