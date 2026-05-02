## Goal
On the blog article page, show the full hero image (no cropping). Right now it uses `object-cover` which crops to fill, hiding parts of tall/wide images.

## Change
In `src/pages/BlogArticle.tsx` (line 138), change the hero `<img>` class:

- From: `absolute inset-0 h-full w-full object-cover`
- To:   `absolute inset-0 h-full w-full object-contain`

This makes the entire image visible inside the hero area. The dark gradient overlay and the navy `bg-hero` background already in place will fill any letterbox space behind the image, keeping the title/badge legible.

## Notes
- No other elements move — header height, title overlay, and metadata stay as-is.
- If you'd later prefer a balanced look (image fully visible AND filling the box), the alternative is to remove the absolute hero overlay and render the image as a normal block above the title. Happy to do that as a follow-up if `object-contain` leaves too much empty space on certain images.
