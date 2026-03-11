

## Plan: Default billing toggle to Yearly

**Change**: In `src/pages/Pricing.tsx`, update the initial state of `billingCycle` from `"monthly"` to `"yearly"` on line 147.

```typescript
// Before
const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

// After
const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
```

Single line change, no other files affected.

