## Remove the "WhatsApp formatting" hint strip

### Context
At `src/components/automations/email-editor/AutomationEmailEditor.tsx` line 484–486, a small footer below the message textarea reads:

> WhatsApp formatting: `*bold*` · `_italic_` · `~strike~` · `` `code` ``

This strip renders for **both SMS and WhatsApp** branches (it's in the non-email block). It is:
- **Misleading for SMS** — those markers are not rendered by carriers.
- **Low value for WhatsApp** — power users already know it; the toolbar above already provides Bold/Italic buttons that wrap the same syntax.

### Change
- Delete lines 484–486 (the entire `<div className="px-3 py-2 border-t …">…</div>` block) in `AutomationEmailEditor.tsx`.
- No other code touches this element. No imports become unused.
- All formatting behavior (toolbar buttons, send pipeline, WhatsApp markdown rendering on the recipient side) stays unchanged.

### What stays untouched
- Toolbar buttons (Bold / Italic / etc.).
- Character / SMS-segment counter on the same toolbar row.
- Email editor, template settings, preview iframe.
