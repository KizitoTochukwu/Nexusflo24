import { describe, expect, it } from "vitest";
import { interpolateText, previewVars } from "@/lib/messaging/interpolate";
import { CONTACT_VARIABLES, DEAL_VARIABLES, VARIABLE_OPTIONS } from "@/components/automations/email-editor/editorConstants";

describe("automation CRM variables", () => {
  it("renders the requested AfarHome contact, deal and lead variables", () => {
    const template = "{{contact.first_name}} {{contact.last_name}}. Service: {{deal.service_required}}. Timeframe: {{deal.timeframe}}. Preferred Contact: {{deal.preferred_contact}}. View Record: {{deal.secure_url}} — {{lead.full_name}}, {{lead.email}}";
    const rendered = interpolateText(template, previewVars());
    expect(rendered).toContain("John Doe. Service: Property inspection and maintenance");
    expect(rendered).toContain("Timeframe: Within 48 hours");
    expect(rendered).toContain("Preferred Contact: Email");
    expect(rendered).toContain("/crm/deals?deal=demo");
    expect(rendered).toContain("John Doe, john@example.com");
  });

  it("supports fallbacks and removes unknown values", () => {
    expect(interpolateText("Hi {{contact.first_name|there}}", previewVars({ first_name: "" }))).toBe("Hi there");
    expect(interpolateText("Value: {{deal.unknown}}", previewVars())).toBe("Value: ");
  });

  it("keeps legacy flat variables working", () => {
    expect(interpolateText("{{first_name}} {{lead_score}}", previewVars())).toBe("John 85");
  });

  it("advertises CRM variables without stale calculator variables", () => {
    const advertised = [...CONTACT_VARIABLES, ...DEAL_VARIABLES, ...VARIABLE_OPTIONS].map((item) => item.value);
    expect(advertised).toContain("{{contact.service_interest}}");
    expect(advertised).toContain("{{deal.secure_url}}");
    expect(advertised.some((value) => value.startsWith("{{calculator."))).toBe(false);
  });
});