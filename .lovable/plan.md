

## Plan: Editable Email Template Components (Header, Footer, Unsubscribe)

### Overview
Convert the hardcoded logo, unsubscribe text, and footer in the email editor into configurable fields that users can customize per automation step. Template settings are stored in the step's `config` object and passed through to both the preview renderer and the edge function at send time.

### Architecture

The email template settings live in the step config alongside `subject`, `message`, etc. No database changes needed — the automation step's `config` JSON column already stores arbitrary data.

```text
step.config = {
  action: "send_email",
  subject: "...",
  message: "...",
  // NEW template settings:
  templateSettings: {
    logo: { url: string, alignment: "left"|"center"|"right", size: number, visible: boolean },
    unsubscribe: { enabled: boolean, text: string },
    footer: { text: string, color: string, alignment: "left"|"center"|"right" }
  }
}
```

### Changes

**1. New Component: `EmailTemplateSettings.tsx`**
`src/components/automations/email-editor/EmailTemplateSettings.tsx`

A collapsible "Template Settings" panel below the email body editor with three sections:

- **Header Logo**: Toggle visibility, URL input (with file upload button to `email-assets` bucket), alignment select (left/center/right), size slider (32–120px)
- **Unsubscribe Block**: Toggle on/off, editable text textarea (default: "You received this email because you subscribed to NexusFlo24.")
- **Footer**: Editable text input (default: "© NexusFlo24 · AI-Powered Marketing Automation"), color picker (hex input), alignment select

Uses Collapsible from radix with a Settings icon trigger.

**2. Update `AutomationEmailEditor.tsx`**

- Accept new props: `templateSettings` and `onTemplateSettingsChange`
- Render `<EmailTemplateSettings>` below the editor area (only for email)
- Pass `templateSettings` to `buildPreviewHtml` so the preview reflects user customizations
- Define default template settings constant

**3. Update `AutomationStepEditor.tsx`**

- Pass `templateSettings` from `step.config.templateSettings` to `AutomationEmailEditor`
- Wire `onTemplateSettingsChange` to call `updateStep(i, { templateSettings: ... })`

**4. Update `emailPreviewRenderer.ts`**

- Update `buildPreviewHtml` signature to accept an optional `templateSettings` object
- Replace hardcoded logo section with conditional rendering based on `logo.visible`, `logo.url`, `logo.alignment`, `logo.size`
- Replace hardcoded unsubscribe footer with conditional block based on `unsubscribe.enabled` and `unsubscribe.text`
- Replace hardcoded copyright footer with `footer.text`, `footer.color`, `footer.alignment`

**5. Update `supabase/functions/execute-automation/index.ts`**

- Read `config.templateSettings` from the step config
- Pass settings to `wrapEmailTemplate` as options (logo, footer, unsubscribe text)
- Update `wrapEmailTemplate` in `_shared/email-layout.ts` to accept these options

**6. Update `supabase/functions/_shared/email-layout.ts`**

- Extend `wrapEmailTemplate` options parameter:
  ```typescript
  interface TemplateOptions {
    preheader?: string;
    logo?: { url?: string; alignment?: string; size?: number; visible?: boolean };
    unsubscribe?: { enabled?: boolean; text?: string };
    footer?: { text?: string; color?: string; alignment?: string };
    unsubUrl?: string; // injected by the edge function
  }
  ```
- Use these options to conditionally render logo, footer, and unsubscribe sections
- Keep current values as defaults when options are not provided

**7. Update `supabase/functions/email-send/index.ts`**

- Accept optional `templateSettings` from request body
- Pass to `wrapEmailTemplate`

### Default Values
```typescript
const DEFAULT_TEMPLATE_SETTINGS = {
  logo: {
    url: "https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png",
    alignment: "center",
    size: 56,
    visible: true,
  },
  unsubscribe: {
    enabled: true,
    text: "You received this email because you subscribed to NexusFlo24.",
  },
  footer: {
    text: "© NexusFlo24 · AI-Powered Marketing Automation",
    color: "#C9A227",
    alignment: "center",
  },
};
```

### Scope
- 1 new component (`EmailTemplateSettings.tsx`)
- 3 frontend files updated (`AutomationEmailEditor`, `AutomationStepEditor`, `emailPreviewRenderer`)
- 2 edge functions updated (`execute-automation`, `email-send`)
- 1 shared utility updated (`email-layout.ts`)
- No database changes

