export { VARIABLE_OPTIONS, AUTOMATION_LINKS, CRM_DATA, PREVIEW_VALUES } from "@/components/automations/email-editor/editorConstants";

export const FUNNEL_SMART_LINKS = [
  { label: "Booking Page", value: "{{booking_link}}" },
  { label: "Next Funnel Step", value: "{{next_step_link}}" },
  { label: "Offer Page", value: "{{offer_page_link}}" },
  { label: "Checkout Page", value: "{{checkout_link}}" },
  { label: "External URL", value: "{{external_url}}" },
];

export const CONDITIONAL_TEMPLATES = [
  { label: "If Lead Score > 50", value: '{{#if lead_score > 50}}', closing: '{{/if}}' },
  { label: "If Lead Status = Hot", value: '{{#if lead_status == "hot"}}', closing: '{{/if}}' },
  { label: "If Has Phone", value: '{{#if phone}}', closing: '{{/if}}' },
];

export const FUNNEL_PREVIEW_VALUES: Record<string, string> = {
  "{{first_name}}": "John",
  "{{last_name}}": "Doe",
  "{{email}}": "john@example.com",
  "{{phone}}": "+1 555-123-4567",
  "{{company}}": "Acme Inc.",
  "{{source}}": "Landing Page",
  "{{lead_score}}": "85",
  "{{lead_status}}": "Hot",
  "{{last_activity_date}}": "Mar 5, 2026",
  "{{assigned_rep}}": "Sarah Miller",
  "{{booking_link}}": "https://app.nexusflo24.com/book/demo",
  "{{next_step_link}}": "#next",
  "{{offer_page_link}}": "https://app.nexusflo24.com/offer",
  "{{checkout_link}}": "https://app.nexusflo24.com/checkout",
  "{{external_url}}": "https://example.com",
  "{{funnel_link}}": "https://app.nexusflo24.com/f/offer",
  "{{webinar_link}}": "https://app.nexusflo24.com/webinar",
};
