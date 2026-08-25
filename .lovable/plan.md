# Commerce, Customer Portal & Community — Phase 1

A new **Commerce** capability that lets each workspace run its own branded storefront, sell products, and take payments through its own Stripe account. Existing NexusFlo24 systems (Automation Store at `/automations`, Academy, CRM, bookings, SaaS billing) are untouched and continue working.

Delivery is phase by phase: this plan builds and verifies **Phase 1** in full, then I report and stop for your approval before Phase 2.

## What already exists (inspected)

- `/automations` platform store uses `store_products`, `store_orders`, `store_projects` and is NexusFlo24's own service catalogue — not reusable as a multi-tenant seller storefront. New tables use a `shop_`/`commerce_` prefix so nothing collides.
- Dashboard routes live under `/dashboard/:workspaceId` behind `WorkspaceGuard`; sidebar sections are defined in `DashboardLayout.tsx`.
- Stripe today is a single platform account (`create-checkout-session`, `store-checkout`, `stripe-webhook`) used for NexusFlo24's own SaaS billing and store orders. Seller payments need a separate Connect layer.
- Academy is a static file (`src/data/academyCourses.ts`) with no database courses, enrolments or progress — DB-backed courses get built in Phase 2/3 as agreed, and the existing static pages keep working until then.
- CRM `contacts` (workspace-scoped, email-normalised) is the contact record commerce customers will link to.

## Phase 1 scope

**Store setup and branding**
- Wizard: name, slug, logo/cover, brand colours, typography, business info, currency, countries served, product types, payment connection, shipping, policies, preview, publish.
- One primary store per workspace; schema keyed by `store_id` so multiple stores need no destructive change later.

**Products**
- Types: physical, digital, service, course, membership. Shared fields (slug, descriptions, status, media, SKU, price, compare-at, currency, tax category, one-time/recurring + interval, collections, tags, visibility, SEO, button text).
- Physical: variants/options, per-variant SKU, inventory tracking, weight, shipping class, low-stock threshold, back-orders.
- Digital: private file uploads, entitlement, download limits/expiry, signed time-limited URLs only.
- Service: deliverables, optional link to an existing booking page/appointment type, post-purchase instructions.
- Course and membership products are created and priced in Phase 1 but their access grants land with the entitlement engine (Phase 4); the UI states this clearly instead of shipping a dead control.

**Storefront** at `/s/:storeSlug`: home, shop, collection, product/service detail, cart, checkout, order confirmation, policies, contact. Branded from store settings, responsive, SEO tags, draft products never publicly readable.

**Cart & checkout**: add/remove/update, variant validation, discount codes, shipping calculation, totals recomputed server-side, guest or authenticated checkout, abandoned-cart records for later automation.

**Payments — Stripe Connect Standard**
- Workspace owner connects their own Stripe account via OAuth; only the connected account id is stored. Seller funds never touch NexusFlo24's platform balance and this stays fully separate from SaaS billing.
- Server-side Checkout Sessions on the connected account for one-time and recurring purchases, with idempotency keys.
- Dedicated seller webhook endpoint with signature verification and a `processed_webhook_events` table so duplicate deliveries can never create duplicate orders.
- Platform application fee is stored and defaults to 0 (no fee charged), configurable later by a platform admin.

**Orders, shipping, fulfilment**: statuses (pending, payment processing, paid, partially fulfilled, fulfilled, cancelled, refunded, partially refunded, payment failed) with full status history; shipping zones/rates, flat rate, free-shipping threshold, local pickup, product rules; manual and partial fulfilment with carrier and tracking number; customer shipment notification via existing email sending. No live carrier rates are claimed.

**Commerce dashboard** at `/dashboard/:workspaceId/commerce` plus store, products, collections, orders, subscriptions, customers, discounts, shipping, settings. Every metric (gross/net sales, orders, AOV, active subscriptions, new customers, pending fulfilment, failed payments, refunds, top products, sales over time, recent orders) is computed from real order and transaction rows; empty states show zero, never invented figures.

## Technical notes

- Migrations are additive only. New tables: `shop_stores`, `shop_store_branding`, `shop_products`, `shop_product_variants`, `shop_product_prices`, `shop_product_media`, `shop_product_files`, `shop_collections`, `shop_collection_products`, `shop_inventory_movements`, `shop_carts`, `shop_cart_items`, `shop_discounts`, `shop_discount_redemptions`, `shop_orders`, `shop_order_items`, `shop_order_status_history`, `shop_transactions`, `shop_customers`, `shop_shipping_zones`, `shop_shipping_rates`, `shop_fulfilments`, `shop_fulfilment_items`, `seller_payment_accounts`, `commerce_events`, `processed_webhook_events`. Every business row carries `workspace_id`.
- RLS: staff access via the existing `is_workspace_member` / `is_workspace_admin` helpers; new commerce roles (commerce manager, fulfilment staff, read-only analyst) added to the workspace role set and enforced in policies and edge functions. Anonymous visitors read published stores/products only through `SECURITY DEFINER` functions, matching how public funnels and forms already work — no broad `anon` table grants.
- Storage: separate buckets for store branding, product images (public read) and digital product files (private, signed URLs issued only after server-side entitlement check). File type and size validation on upload.
- Edge functions: `shop-connect-stripe` (OAuth start/callback), `shop-checkout` (server-priced session on the connected account), `shop-webhook` (seller events, idempotent), `shop-download-url` (entitlement-checked signed URL), `shop-fulfilment-notify`.
- Frontend: new `src/pages/dashboard/commerce/*` and `src/pages/shop/*` using existing shadcn components, navy/gold tokens, and the current dashboard layout. Sidebar gains a Commerce section.

## Acceptance checks run at the end of Phase 1

Publish a store; browse it publicly; confirm draft products 404; buy a digital product and download it; confirm a second customer cannot use that URL; buy a physical product and fulfil it partially then fully; confirm shipping matches the zone; replay a Stripe webhook and confirm no duplicate order; confirm a failed payment creates no paid order; confirm another workspace cannot read this store's commerce data; confirm `/automations`, Academy, CRM, bookings and SaaS billing still work.

## Later phases (not built yet)

2. Customer portal at `/portal/:storeSlug` + DB-backed Academy courses, enrolments and progress.
3. Community: spaces, posts, comments, reactions, moderation, challenges, events.
4. Central entitlement engine: grants, revocation policies, refund and cancellation behaviour, subscription lifecycle.
5. CRM contact sync, commerce timeline activities, and commerce triggers/actions on the existing automation engine.
