

## Plan: Embed YouTube Video Section After Features

### Changes to `src/pages/Index.tsx`

Add a new section between the "Features" and "How It Works" sections containing:

- Section heading: "Why We Created NexusFlo24"
- Centered YouTube embed using the provided iframe (`814S7T-Kcqw`)
- Responsive 16:9 aspect ratio container using Tailwind's `aspect-video`
- Rounded corners with shadow, matching the page's card styling
- Max width ~800px, centered

### Structure
```text
┌─────────────────────────────────┐
│  Why We Created NexusFlo24      │  ← section heading
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   YouTube embed (16:9)    │  │  ← rounded-xl, shadow-card
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Files modified
- `src/pages/Index.tsx`

