import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_SETTINGS,
  isValidHex,
  normalizeTemplateSettings,
  templateSettingsFromBranding,
} from "@/components/automations/email-editor/EmailTemplateSettings";
import { buildPreviewHtml } from "@/components/automations/email-editor/emailPreviewRenderer";

describe("template settings", () => {
  it("validates hex colours", () => {
    expect(isValidHex("#0B1F3B")).toBe(true);
    expect(isValidHex("#abc")).toBe(true);
    expect(isValidHex("navy")).toBe(false);
    expect(isValidHex("#12345")).toBe(false);
    expect(isValidHex(undefined)).toBe(false);
  });

  it("keeps old saved settings rendering (back-compat)", () => {
    const legacy = {
      header: { color: "#111111" },
      logo: { url: "https://x/y.png", alignment: "left", size: 80, visible: true },
      unsubscribe: { enabled: false },
      footer: { text: "old footer" },
    } as any;
    const ts = normalizeTemplateSettings(legacy);
    expect(ts.header.color).toBe("#111111");
    expect(ts.header.showBar).toBe(true);
    expect(ts.logo.alignment).toBe("left");
    expect(ts.footer.color).toBe(DEFAULT_TEMPLATE_SETTINGS.footer.color);
    expect(ts.accentColor).toBe(DEFAULT_TEMPLATE_SETTINGS.accentColor);
  });

  it("derives settings from workspace branding", () => {
    const ts = templateSettingsFromBranding({
      brand_name: "AfarHome",
      brand_color: "#123456",
      logo_url: "https://cdn/afar.png",
    } as any);
    expect(ts.brandName).toBe("AfarHome");
    expect(ts.header.color).toBe("#123456");
    expect(ts.logo.url).toBe("https://cdn/afar.png");
    expect(ts.unsubscribe.text).toContain("AfarHome");
  });

  it("prefers explicitly saved workspace template settings", () => {
    const ts = templateSettingsFromBranding({
      brand_name: "AfarHome",
      email_template_settings: { brandName: "Saved", header: { color: "#000000" } },
    } as any);
    expect(ts.brandName).toBe("Saved");
    expect(ts.header.color).toBe("#000000");
  });
});

describe("preview rendering", () => {
  const settings = normalizeTemplateSettings({
    brandName: "AfarHome",
    header: { color: "#123456", showBar: true },
    accentColor: "#ABCDEF",
    backgroundColor: "#EEEEEE",
    address: "AfarHome Ltd, Lagos, Nigeria",
    logo: { ...DEFAULT_TEMPLATE_SETTINGS.logo, visible: false },
    footer: { text: "© AfarHome", color: "#C9A227", alignment: "center" },
  } as any);

  it("renders the header band with the chosen colour and brand name", () => {
    const html = buildPreviewHtml("Hello", "Subject", {}, settings);
    expect(html).toContain("background-color:#123456");
    expect(html).toContain("AfarHome");
    expect(html).toContain("background-color:#EEEEEE");
    expect(html).toContain("#ABCDEF");
  });

  it("shows the postal address under the unsubscribe line", () => {
    const html = buildPreviewHtml("Hello", "Subject", {}, settings);
    expect(html).toContain("AfarHome Ltd, Lagos, Nigeria");
  });

  it("resolves variables in footer copy and never leaks braces", () => {
    const withTokens = normalizeTemplateSettings({
      ...settings,
      footer: { ...settings.footer, text: "Sent to {{contact.first_name}}" },
      unsubscribe: { enabled: true, text: "Hi {{contact.first_name}}, {{unknown.token}}" },
    } as any);
    const html = buildPreviewHtml("Body", "Subject", {}, withTokens);
    expect(html).not.toContain("{{");
  });
});
