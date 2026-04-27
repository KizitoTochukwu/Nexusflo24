import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fbqTrack } from "@/lib/analytics/metaPixel";
import WorkspacePixelLoader from "@/components/analytics/WorkspacePixelLoader";
import { wsTrack } from "@/lib/analytics/workspacePixels";

/**
 * Lightweight embeddable form page.
 * URL: /embed/form?workspace=<id>&source=<source>&fields=name,email,phone&tags=tag1,tag2&button=Submit&color=#D4AF37
 *
 * Designed to be loaded inside an <iframe> on external websites.
 * Submits to the capture-lead edge function.
 */

export default function EmbedForm() {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspace") || "";
  const source = searchParams.get("source") || "embed-form";
  const fieldsParam = searchParams.get("fields") || "email";
  const tagsParam = searchParams.get("tags") || "";
  const buttonText = searchParams.get("button") || "Submit";
  const accentColor = searchParams.get("color") || "#D4AF37";
  const redirectUrl = searchParams.get("redirect") || "";

  const fields = fieldsParam.split(",").map((f) => f.trim()).filter(Boolean);
  const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent iframe of height changes for auto-resize
  useEffect(() => {
    const sendHeight = () => {
      window.parent?.postMessage(
        { type: "nexusflo-embed-resize", height: document.body.scrollHeight },
        "*"
      );
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [success]);

  const labelMap: Record<string, string> = {
    name: "Full Name",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    message: "Message",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.email) return;
    setLoading(true);
    setError(null);

    try {
      const utm: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
        const v = searchParams.get(k);
        if (v) utm[k] = v;
      });

      const { error: fnError } = await supabase.functions.invoke("capture-lead", {
        body: {
          workspace_id: workspaceId,
          full_name: values.name || values.firstName ? `${values.firstName || ""} ${values.lastName || ""}`.trim() : null,
          email: values.email,
          phone: values.phone || null,
          source,
          tags,
          notes: values.message || "",
          meta: {
            page: document.referrer || window.location.href,
            formId: "embed-form",
            referrer: document.referrer || null,
            company: values.company || null,
            ...utm,
          },
        },
      });

      if (fnError) throw fnError;

      setSuccess(true);
      fbqTrack("Lead", { content_name: source, content_category: "embed_form" });
      wsTrack("Lead", { content_name: source, content_category: "embed_form" });

      // Notify parent
      window.parent?.postMessage({ type: "nexusflo-embed-success", email: values.email }, "*");

      if (redirectUrl) {
        window.top?.location.assign(redirectUrl);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pageWrapperStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
  };

  if (!workspaceId) {
    return (
      <div style={{ ...pageWrapperStyle, color: "#dc2626" }}>
        <div>Missing <code>workspace</code> parameter.</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageWrapperStyle}>
        <WorkspacePixelLoader workspaceId={workspaceId} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#16a34a" }}>Thank you!</p>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Your submission has been received.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapperStyle}>
      <WorkspacePixelLoader workspaceId={workspaceId} />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 480 }}>
        {fields.map((f) => {
          const isTextarea = f === "message";
          const inputType = f === "email" ? "email" : f === "phone" ? "tel" : "text";
          const commonStyle: React.CSSProperties = {
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          };
          return isTextarea ? (
            <textarea
              key={f}
              placeholder={labelMap[f] || f}
              value={values[f] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
              rows={3}
              style={commonStyle}
            />
          ) : (
            <input
              key={f}
              type={inputType}
              placeholder={labelMap[f] || f}
              required={f === "email"}
              value={values[f] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
              style={commonStyle}
            />
          );
        })}
        {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: accentColor,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Submitting…" : buttonText}
        </button>
      </form>
    </div>
  );
}
