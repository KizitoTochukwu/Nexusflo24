

## Make Credit Packs Interactive & Checkout-Ready

Redesign the "Need More Credits?" section to be dynamic, clickable cards that take users directly to Stripe checkout — inspired by the ActiveCampaign reference.

### Changes

**File: `src/pages/Pricing.tsx`**

1. **Add quantity selector** to each credit pack card (dropdown or +/- stepper) so users can pick how many packs they want.
2. **Add a "Buy Now" button** on each card that invokes the `create-credit-purchase` edge function and redirects to Stripe checkout.
3. **Add loading state** per card while checkout session is being created.
4. **Visual upgrade** — hover effects, cursor-pointer, gradient borders, subtle glow on hover to make them feel interactive and premium (matching the dark card style from the reference).
5. **Auth check** — if user is not logged in, redirect to `/register` instead of invoking checkout.
6. **Workspace resolution** — pull `workspaceId` from context/URL for the checkout call (use `useWorkspaceId` if available, or prompt login).

### UI Layout (per card)

```text
┌──────────────────────┐
│   [EMAIL badge]      │
│                      │
│  1,000 emails        │
│  $5 per pack         │
│                      │
│  Qty: [- 1 +]        │
│                      │
│  [ Buy Now → ]       │
└──────────────────────┘
```

### Technical Details

- Import `useAuth` and `useWorkspaceId` for auth/workspace context
- Call `supabase.functions.invoke("create-credit-purchase", { body: { channel, workspaceId, quantity } })`
- On success, redirect to `data.url`
- Add per-channel loading state with `useState<string | null>`
- Cards get `hover:border-accent hover:shadow-gold transition-all cursor-pointer` styling
- Quantity defaults to 1, min 1, max 10

