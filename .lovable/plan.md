## Fix GA4 double-counting

Your GTM container already fires the GA4 tag `G-MB7MS71VQE` on every page (Initialization - All Pages trigger). The hardcoded `gtag.js` snippet in `index.html` fires the same tag a second time, doubling every pageview in GA4.

### Change

Remove the hardcoded GA4 snippet from `index.html` (lines 12–20):

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MB7MS71VQE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-MB7MS71VQE');
</script>
<!-- End Google tag -->
```

Keep GTM (`GTM-52MNRXJ4`) as the single source — it loads `gtag.js` and configures GA4 itself.

### Result

- One pageview per visit in GA4
- All future tracking changes managed in GTM (no code deploys)
- Meta Pixel and GTM noscript fallback untouched

### Note on SPA pageviews

Since NexusFlo24 is a React SPA, GA4 will only auto-track the initial page load. Client-side route changes won't fire pageviews unless GTM is configured with a History Change trigger (configurable in GTM UI — no code change needed) or a `GA4RouteTracker` is added to the app. Let me know after approval if you want the route tracker too.