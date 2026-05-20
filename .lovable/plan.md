## Hardcode Google Ads tag in `index.html`

Add the `AW-18169219778` `gtag.js` snippet directly after the GTM block (line 12), before the existing GA4 comment.

### Change

In `index.html`, insert immediately after `<!-- End Google Tag Manager -->`:

```html
<!-- Google tag (gtag.js) - Google Ads AW-18169219778 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18169219778"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18169219778');
</script>
<!-- End Google tag -->
```

### Notes

- Single SPA `index.html` covers every route, so this fires on all pages.
- GTM already loads `gtag.js`; this adds a second load. Functional, but if you later see Google flagging "duplicate Google tag", remove this and configure `AW-18169219778` inside GTM instead.
- No other files change.