import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import nexusLogo from "@/assets/nexusflo24-logo-full.png";

/**
 * Hosted public lead capture form.
 * Route: /form/:workspaceId
 *
 * Designed as a polished, brand-consistent standalone share page suitable for
 * social bios, QR codes, link-in-bio tools, WhatsApp, etc. Submissions flow
 * through the existing `capture-lead` edge function.
 *
 * Supported query params:
 *   fields, tags, source, button, color, redirect, title, subtitle,
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term
 */

const FIELD_LABELS: Record<string, string> = {
  name: "Full Name",
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  message: "Message",
};

export default function HostedLeadForm() {
  const { workspaceId = "" } = useParams();
  const [searchParams] = useSearchParams();

  const fieldsParam = searchParams.get("fields") || "name,email";
  const source = searchParams.get("source") || "hosted-form";
  const tagsParam = searchParams.get("tags") || "";
  const buttonText = searchParams.get("button") || "Submit";
  const accentColor = searchParams.get("color") || "";
  const redirectUrl = searchParams.get("redirect") || "";
  const title = searchParams.get("title") || "Get in touch";
  const subtitle =
    searchParams.get("subtitle") ||
    "Fill out the form below and we'll get back to you shortly.";

  const fields = fieldsParam.split(",").map((f) => f.trim()).filter(Boolean);
  const tags = tagsParam
    ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect after success if requested
  useEffect(() => {
    if (success && redirectUrl) {
      const t = setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [success, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.email) return;
    setLoading(true);
    setError(null);

    try {
      const utm: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
        (k) => {
          const v = searchParams.get(k);
          if (v) utm[k] = v;
        },
      );

      const fullName =
        values.name ||
        ((values.firstName || values.lastName)
          ? `${values.firstName || ""} ${values.lastName || ""}`.trim()
          : null);

      const { error: fnError } = await supabase.functions.invoke("capture-lead", {
        body: {
          workspace_id: workspaceId,
          full_name: fullName,
          email: values.email,
          phone: values.phone || null,
          source,
          tags,
          notes: values.message || "",
          meta: {
            page: window.location.href,
            formId: "hosted-form",
            referrer: document.referrer || null,
            company: values.company || null,
            ...utm,
          },
        },
      });

      if (fnError) throw fnError;
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <p className="text-destructive text-sm">
          Invalid form link — missing workspace identifier.
        </p>
      </div>
    );
  }

  // Allow accent color override (used on submit button).
  const buttonStyle = accentColor
    ? { backgroundColor: accentColor, color: "#fff" }
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <Helmet>
        <title>{title} | NexusFlo24</title>
        <meta name="description" content={subtitle.slice(0, 160)} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      {/* Top bar */}
      <header className="w-full border-b border-border/40 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center">
            <img
              src={nexusLogo}
              alt="NexusFlo24"
              className="h-8 sm:h-9 object-contain"
            />
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Secure form
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card shadow-lg p-6 sm:p-8">
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Thank you!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your submission has been received.
                  {redirectUrl && " Redirecting you now…"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map((f) => {
                  const isTextarea = f === "message";
                  const inputType =
                    f === "email" ? "email" : f === "phone" ? "tel" : "text";
                  const label = FIELD_LABELS[f] || f;
                  const required = f === "email";
                  return (
                    <div key={f} className="space-y-1.5">
                      <Label htmlFor={`field-${f}`} className="text-sm">
                        {label}
                        {required && (
                          <span className="ml-0.5 text-destructive">*</span>
                        )}
                      </Label>
                      {isTextarea ? (
                        <Textarea
                          id={`field-${f}`}
                          rows={3}
                          value={values[f] || ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [f]: e.target.value }))
                          }
                          placeholder={`Your ${label.toLowerCase()}`}
                        />
                      ) : (
                        <Input
                          id={`field-${f}`}
                          type={inputType}
                          required={required}
                          value={values[f] || ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [f]: e.target.value }))
                          }
                          placeholder={`Your ${label.toLowerCase()}`}
                          maxLength={f === "email" ? 255 : 200}
                        />
                      )}
                    </div>
                  );
                })}

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  style={buttonStyle}
                  className="w-full h-11 font-semibold bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  We respect your privacy. Your information is kept secure and
                  never shared.
                </p>
              </form>
            )}
          </div>

          {/* Footer / trust */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Powered by{" "}
            <Link
              to="/"
              className="font-semibold text-foreground hover:text-accent transition-colors"
            >
              NexusFlo24
            </Link>
            <span className="mx-1.5">·</span>
            <Link to="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
            <span className="mx-1.5">·</span>
            <Link to="/terms-of-service" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
