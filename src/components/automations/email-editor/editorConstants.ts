export const VARIABLE_OPTIONS = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Company", value: "{{company}}" },
  { label: "Source", value: "{{source}}" },
  { label: "Lead Score", value: "{{lead_score}}" },
  { label: "ROI · Currency", value: "{{calculator.currency}}" },
  { label: "ROI · Monthly Opportunity", value: "{{calculator.monthly_opportunity}}" },
  { label: "ROI · Annual Opportunity", value: "{{calculator.annual_opportunity}}" },
  { label: "ROI · Recoverable Revenue", value: "{{calculator.recoverable_revenue}}" },
  { label: "ROI · Manual Admin Cost", value: "{{calculator.manual_admin_cost}}" },
  { label: "ROI · Business Type", value: "{{calculator.business_type}}" },
  { label: "ROI · Preferred Contact", value: "{{calculator.preferred_contact_method}}" },
];

export const AUTOMATION_LINKS = [
  { label: "Call Booking Link", value: "{{booking_link}}" },
  { label: "Funnel Link", value: "{{funnel_link}}" },
  { label: "Offer Page", value: "{{offer_page_link}}" },
  { label: "Webinar Registration Link", value: "{{webinar_link}}" },
];

export const CRM_DATA = [
  { label: "Lead Score", value: "{{lead_score}}" },
  { label: "Lead Status", value: "{{lead_status}}" },
  { label: "Last Activity Date", value: "{{last_activity_date}}" },
  { label: "Assigned Sales Rep", value: "{{assigned_rep}}" },
];

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
  "{{calculator.currency}}": "GBP",
  "{{calculator.monthly_opportunity}}": "£4,200",
  "{{calculator.annual_opportunity}}": "£50,400",
  "{{calculator.recoverable_revenue}}": "£3,600",
  "{{calculator.manual_admin_cost}}": "£500",
  "{{calculator.business_type}}": "Marketing agency",
  "{{calculator.preferred_contact_method}}": "Email",
};
