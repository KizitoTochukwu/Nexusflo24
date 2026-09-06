import { describe, it, expect } from "vitest";
import { renderMessageHtml, extractBody } from "@/components/campaigns/MessageContentPreview";
import { computeCampaignMetrics, resolveCampaignMetrics, formatRate } from "@/lib/campaigns/metrics";

describe("renderMessageHtml", () => {
  it("renders structured JSON with text and image blocks", () => {
    const body = JSON.stringify([
      { id: "b1", type: "text", props: { content: "Hello there", fontSize: 15, color: "#000", alignment: "left", fontWeight: "normal", lineHeight: 1.6 } },
      { id: "b2", type: "image", props: { src: "https://example.com/a.jpg", alt: "Pic", width: 100, alignment: "center", linkUrl: "", borderRadius: 0 } },
    ]);
    const { html, failed } = renderMessageHtml({ body });
    expect(failed).toBe(false);
    expect(html).toContain("Hello there");
    expect(html).toContain("https://example.com/a.jpg");
    expect(html).not.toContain('"props"');
    expect(html).not.toContain("b1");
  });

  it("renders HTML email content sanitised", () => {
    const { html } = renderMessageHtml({ body: "<p>Hi <strong>there</strong></p><script>alert(1)</script>" });
    expect(html).toContain("<strong>there</strong>");
    expect(html).not.toContain("script");
  });

  it("preserves line breaks in plain text", () => {
    const { html } = renderMessageHtml({ body: "line one\nline two" });
    expect(html).toBe("line one<br>line two");
  });

  it("converts literal \\n escapes", () => {
    const { html } = renderMessageHtml({ body: "a\\nb" });
    expect(html).toBe("a<br>b");
  });

  it("falls back safely on malformed JSON", () => {
    const { failed, html } = renderMessageHtml({ body: '[{"id":"x","type":"text",' });
    expect(failed).toBe(true);
    expect(html).toBeNull();
  });

  it("keeps very long URLs intact", () => {
    const url = `https://example.com/${"a".repeat(300)}`;
    const { html } = renderMessageHtml({ body: url });
    expect(html).toContain(url);
  });

  it("keeps template variables visible without a recipient", () => {
    const { html } = renderMessageHtml({ body: "Hi {{first_name}}" });
    expect(html).toContain("{{first_name}}");
  });

  it("substitutes recipient values when supplied", () => {
    const { html } = renderMessageHtml({ body: "Hi {{first_name}}" }, { first_name: "Ada" });
    expect(html).toContain("Hi Ada");
  });

  it("extracts subject and body", () => {
    expect(extractBody({ subject: "S", body: "B" })).toEqual({ subject: "S", body: "B" });
  });
});

describe("campaign metrics", () => {
  it("reports 100% open rate for one sent and one opened", () => {
    const m = computeCampaignMetrics([{ id: "1", lead_id: "l1", delivery_status: "sent", opened: true }]);
    expect(m.sent).toBe(1);
    expect(m.opened).toBe(1);
    expect(formatRate(m.openRate)).toBe("100.0%");
  });

  it("counts multiple opens from one recipient as a single unique open", () => {
    const m = computeCampaignMetrics([
      { id: "1", lead_id: "l1", delivery_status: "delivered", opened: true },
      { id: "2", lead_id: "l1", delivery_status: "delivered", opened: true },
    ]);
    expect(m.opened).toBe(1);
    expect(formatRate(m.openRate)).toBe("50.0%");
  });

  it("uses delivered as the click-rate denominator", () => {
    const m = computeCampaignMetrics([
      { id: "1", lead_id: "l1", delivery_status: "delivered", clicked: true },
      { id: "2", lead_id: "l2", delivery_status: "failed" },
    ]);
    expect(formatRate(m.clickRate)).toBe("100.0%");
  });

  it("falls back to stored rates when there are no delivery records", () => {
    const m = resolveCampaignMetrics({ sent_count: 5, open_rate: 0.5, click_rate: 0.25 }, computeCampaignMetrics([]));
    expect(m.sent).toBe(5);
    expect(formatRate(m.openRate)).toBe("50.0%");
  });
});
