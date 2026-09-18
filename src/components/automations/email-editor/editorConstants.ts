export type AutomationVariable = { label: string; value: string };

export const CONTACT_VARIABLES: AutomationVariable[] = [
  { label: "First name", value: "{{contact.first_name}}" },
  { label: "Last name", value: "{{contact.last_name}}" },
  { label: "Full name", value: "{{contact.full_name}}" },
  { label: "Email", value: "{{contact.email}}" },
  { label: "Phone", value: "{{contact.phone}}" },
  { label: "WhatsApp number", value: "{{contact.whatsapp_number}}" },
  { label: "Company", value: "{{contact.company}}" },
  { label: "Lead source", value: "{{contact.source}}" },
  { label: "Status", value: "{{contact.status}}" },
  { label: "Score", value: "{{contact.score}}" },
  { label: "Service required", value: "{{contact.service_interest}}" },
  { label: "Required timeframe", value: "{{contact.service_urgency}}" },
  { label: "Preferred contact method", value: "{{contact.preferred_channel}}" },
  { label: "Country of residence", value: "{{contact.country_of_residence}}" },
  { label: "Nigerian location", value: "{{contact.service_location}}" },
  { label: "Enquiry details", value: "{{contact.enquiry_details}}" },
  { label: "Enquiry date", value: "{{contact.enquiry_date}}" },
];

export const LEAD_VARIABLES: AutomationVariable[] = [
  { label: "Full name", value: "{{lead.full_name}}" },
  { label: "Email", value: "{{lead.email}}" },
  { label: "Phone", value: "{{lead.phone}}" },
  { label: "Source", value: "{{lead.source}}" },
  { label: "Status", value: "{{lead.status}}" },
  { label: "Score", value: "{{lead.score}}" },
];

export const DEAL_VARIABLES: AutomationVariable[] = [
  { label: "Opportunity name", value: "{{deal.name}}" },
  { label: "Reference number", value: "{{deal.reference_number}}" },
  { label: "Pipeline stage", value: "{{deal.stage}}" },
  { label: "Pipeline", value: "{{deal.pipeline}}" },
  { label: "Status", value: "{{deal.status}}" },
  { label: "Priority", value: "{{deal.priority}}" },
  { label: "Amount", value: "{{deal.amount}}" },
  { label: "Currency", value: "{{deal.currency}}" },
  { label: "Expected close date", value: "{{deal.expected_close_date}}" },
  { label: "Service required", value: "{{deal.service_required}}" },
  { label: "Timeframe", value: "{{deal.timeframe}}" },
  { label: "Preferred contact", value: "{{deal.preferred_contact}}" },
  { label: "Secure record link", value: "{{deal.secure_url}}" },
];

export const ASSIGNED_USER_VARIABLES: AutomationVariable[] = [
  { label: "Name", value: "{{assigned_user.name}}" },
  { label: "Email", value: "{{assigned_user.email}}" },
  { label: "Phone", value: "{{assigned_user.phone}}" },
];

// Backwards-compatible export consumed by autocomplete and older editor code.
export const VARIABLE_OPTIONS = CONTACT_VARIABLES;

export const AUTOMATION_LINKS = [
  { label: "Call Booking Link", value: "{{booking_link}}" },
  { label: "Funnel Link", value: "{{funnel_link}}" },
  { label: "Offer Page", value: "{{offer_page_link}}" },
  { label: "Webinar Registration Link", value: "{{webinar_link}}" },
  { label: "Checkout Link", value: "{{checkout_link}}" },
  { label: "Unsubscribe Link", value: "{{unsubscribe_link}}" },
];

export const CRM_DATA = [...LEAD_VARIABLES, ...DEAL_VARIABLES, ...ASSIGNED_USER_VARIABLES];

export const PREVIEW_VALUES: Record<string, string> = {
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
  "{{funnel_link}}": "https://app.nexusflo24.com/f/offer",
  "{{offer_page_link}}": "https://app.nexusflo24.com/offer",
  "{{webinar_link}}": "https://app.nexusflo24.com/webinar",
  "{{checkout_link}}": "https://app.nexusflo24.com/checkout",
  "{{unsubscribe_link}}": "https://app.nexusflo24.com/unsubscribe",
};
