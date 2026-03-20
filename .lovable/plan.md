

# Phase 1: Usage-Based Message Credit System ✅

## Overview
Add a message credit system so every outbound message (email, SMS, WhatsApp) deducts from a workspace balance. Credits are purchased through Stripe and managed entirely within NexusFlo24 — no third-party accounts needed.

**Status: COMPLETE**

---

# Phase 2: Credit Visibility & Alerts ✅

## Overview
Make credit balances visible throughout the dashboard, surface included credits on the public Pricing page, provide full transaction history, and alert users when credits run low.

## Implemented

### 1. Sidebar Credit Widget
- `SidebarCreditWidget` component shows Email/SMS/WhatsApp balances in the dashboard sidebar
- Collapsed state shows abbreviated badges with color-coded status (red = empty, yellow = low)
- Expanded state shows channel icons with formatted counts (e.g. "10k")

### 2. Pricing Page Credit Info
- Each plan card now includes a "Monthly Credits" feature group showing included allocations
- Feature comparison table adds Email/SMS/WhatsApp Credits/mo rows with per-plan values
- New "Need More Credits?" section at bottom displays the three top-up packs with pricing

### 3. Transaction History UI
- `CreditTransactionHistory` component in Settings → Usage tab
- Paginated table showing date, channel, type (Purchase/Allocation/Message Sent), and signed amount
- Color-coded amounts (green for top-ups, red for deductions)

### 4. Low-Credit Alerts
- `useLowCreditAlert` hook fires a toast warning when any channel drops to ≤20 credits
- Only triggers once per channel per session to avoid spamming
- Directs users to Settings → Usage for top-up
