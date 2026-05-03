## Goal
Remove all the text overlaid on the hero image (Back to Blog link, category badge, title, excerpt, author/date/read-time row). Keep only the hero image itself.

## Change
In `src/pages/BlogArticle.tsx`, replace the entire `<header>` block (lines 131–180) with a minimal version that renders just the image:

```tsx
{/* Hero image */}
<header className="relative bg-hero pt-20">
  {article.image_url ? (
    <img
      src={article.image_url}
      alt={article.title}
      className="block w-full h-auto max-h-[520px] object-contain mx-auto"
    />
  ) : (
    <div className="h-24" />
  )}
</header>
```

This removes:
- `Back to Blog` link
- Category `Badge`
- `<h1>` title
- Excerpt paragraph
- Author / date / read-time meta row
- The dark gradient overlay (no longer needed without text on top)

The article body section below (title-less) stays unchanged. Since the `<h1>` is gone from the hero, I'll also add the title as a heading at the top of the article body so the page still has a clear title:

```tsx
<article className="container max-w-3xl px-4 py-12 md:py-20 bg-secondary rounded-md">
  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">
    {article.title}
  </h1>
  {/* existing prose div ... */}
</article>
```

If you'd rather drop the title entirely too, say the word and I'll remove that as well.
