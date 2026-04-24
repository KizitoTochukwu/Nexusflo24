## Goal

Upgrade every pop-up notification across NexusFlo24 (toasts from `sonner` and the legacy Radix `useToast`) to a premium, on-brand visual style — without touching the ~50 files that call `toast(...)`. All upgrades happen in the two Toaster shells and the toast primitive, so existing `toast.success(...)`, `toast.error(...)`, and `toast({ title, description })` calls automatically inherit the new look.

## Visual direction

Premium SaaS feel aligned with the navy + gold brand:

- **Surface**: white/elevated card with a subtle gradient (`from-card to-surface`), 1px hairline border, soft layered shadow, 14px radius, generous padding.
- **Accent rail**: a 3px colored bar on the left edge per toast type (success = emerald, error = destructive red, warning = gold/accent, info = navy, default = gold).
- **Icon chip**: 36×36 rounded-lg tinted background (e.g. `bg-emerald-500/10 text-emerald-600`) with a Lucide icon (CheckCircle2, AlertTriangle, XCircle, Info, Sparkles) — replaces Sonner's default flat icon.
- **Typography**: `text-sm font-semibold` title in primary navy, `text-xs text-muted-foreground` description with relaxed leading.
- **Close button**: ghost X, `opacity-0 group-hover:opacity-100`, top-right, smooth fade.
- **Action button**: navy primary with gold hover ring; cancel button is muted ghost.
- **Motion**: slide-in from the right + fade + slight scale (200ms ease-out), slide-out + fade on dismiss. Uses existing tailwind keyframes.
- **Position**: bottom-right on desktop (Sonner default), top on mobile, with `gap-3` between stacked toasts and `expand` enabled so multiple toasts feel like a stack of premium cards instead of a single collapsing pile.
- **Dark mode**: respects existing tokens (no hardcoded colors except the per-type tints, which use Tailwind palette with `/10` and `/20` opacity for tints that work on both themes).

## Files to change (3 total)

1. **`src/components/ui/sonner.tsx`** — main upgrade. Configure `<Sonner />` with:
   - `position="bottom-right"`, `expand`, `richColors={false}` (we draw our own), `closeButton`, `duration={4500}`, `gap={12}`, `offset={24}`.
   - `toastOptions.classNames` rewritten with the premium card styling above (gradient bg, hairline border, layered shadow, accent rail via `before:` pseudo-element, padded layout).
   - Per-variant classNames (`success`, `error`, `warning`, `info`) override the rail color and icon-chip tint.
   - Custom `icons={{ success: <CheckCircle2/>, error: <XCircle/>, warning: <AlertTriangle/>, info: <Info/> }}` rendered inside a tinted chip wrapper.

2. **`src/components/ui/toast.tsx`** (Radix) — restyle to match Sonner so the few legacy `useToast()` callers look identical:
   - Update `toastVariants` base classes to the same gradient card + hairline + layered shadow + accent rail.
   - Add `success` and `warning` variants alongside `default` and `destructive`.
   - Tighten padding (`p-4 pr-10`), refine title/description sizes, and make `ToastClose` always-visible-on-hover with the fade pattern.
   - Move `ToastViewport` to bottom-right on desktop (`sm:bottom-4 sm:right-4`) with a max-width and `gap-3` stacking.

3. **`src/components/ui/toaster.tsx`** — small tweak: render the icon chip + content in a flex layout so legacy toasts get the same icon treatment when a `variant` is passed.

## What is NOT changing

- No call-site edits. All existing `toast.success("...")`, `toast.error(...)`, `toast({ title, description, variant: "destructive" })` invocations keep working and automatically pick up the new look.
- `NotificationBell` (in-app notification center) is a separate Popover, not a pop-up toast — out of scope unless you want it included.
- `BillingWarningBanner` / `FreePlanBanner` are inline banners, not toasts — out of scope.

## Acceptance check

After implementation, trigger a toast on three known surfaces to verify:
- Login error (Login.tsx → `toast.error`)
- Save success in Settings → ChannelSettingsTab (Sonner success)
- Legacy `useToast` path in CSV import dialog (Radix variant)

All three should render with the new premium card, accent rail, tinted icon chip, and bottom-right slide-in animation.
