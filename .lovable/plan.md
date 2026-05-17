## Add Google Tag Manager to index.html

Since NexusFlo24 is a React SPA, all routes share the same `index.html`. Adding GTM there covers every page.

### Steps

1. Insert the GTM `<script>` snippet immediately after `<meta charset="UTF-8" />` in `<head>` (highest possible position).
2. Insert the GTM `<noscript><iframe>` fallback immediately after the opening `<body>` tag.
3. Verify the build succeeds.

### GTM Container ID
`GTM-52MNRXJ4`

### Placement
```
<head>
  <meta charset="UTF-8" />
  <!-- Google Tag Manager —> ... </!-- End Google Tag Manager —>
  <meta name="viewport" ... />
  ...
</head>
<body>
  <!-- Google Tag Manager (noscript) —> <noscript><iframe ...></iframe></noscript> —>
  <!-- End Google Tag Manager (noscript) —>
  ...
</body>
```
