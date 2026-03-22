

## Plan: Logo Cards in Marquee

### Changes to `src/pages/Index.tsx`

**1. Remove Twilio and Slack** from the `integrations` array (their logos don't load from Simple Icons).

**2. Wrap each logo in a card container** styled to match the reference image:
- Light gray rounded card (`rounded-xl bg-white/80 border border-gray-100 shadow-sm`)
- Fixed dimensions (~100x60px) with centered logo
- Keeps the marquee scroll and hover-pause behavior

**3. Update the marquee markup** to render each integration inside a card div instead of a bare `<img>`.

### Rendering structure

```text
┌──────────┐  ┌──────────┐  ┌──────────┐
│  [logo]  │  │  [logo]  │  │  [logo]  │  ← scrolling
└──────────┘  └──────────┘  └──────────┘
```

Each card: `div.rounded-xl.border.bg-white/80.shadow-sm.p-4.flex.items-center.justify-center` containing the `<img>` tag.

### Files modified
- `src/pages/Index.tsx`

