import { useState } from "react";
import type { FormRecord, FormField } from "@/hooks/useForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { fbqTrack } from "@/lib/analytics/metaPixel";
import { wsTrack } from "@/lib/analytics/workspacePixels";

/**
 * Normalize a user-provided redirect URL so we never accidentally navigate
 * to a relative path (e.g. typing "www.example.com" without a protocol would
 * otherwise resolve against the current `/forms/<slug>` URL and 404).
 */
function normalizeRedirectUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Same-site relative path is allowed.
  if (trimmed.startsWith("/")) return trimmed;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

interface Props {
  form: FormRecord;
  /** When true, the renderer simulates submit instead of calling capture-lead. */
  preview?: boolean;
}

export default function PublicFormRenderer({ form, preview }: Props) {
  const steps = form.schema?.steps ?? [];
  const theme = form.theme;
  const settings = form.settings;
  const [stepIdx, setStepIdx] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const currentStep = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const setVal = (name: string, v: any) => setValues((s) => ({ ...s, [name]: v }));

  const validateCurrent = () => {
    for (const f of currentStep?.fields ?? []) {
      if (!f.required) continue;
      const v = values[f.name];
      if (f.type === "consent" || f.type === "checkbox") {
        if (!v) return `Please confirm: ${f.label}`;
      } else if (v === undefined || v === null || v === "") {
        return `${f.label} is required`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateCurrent();
    if (err) {
      toast.error(err);
      return;
    }
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }

    if (preview) {
      setDone(true);
      return;
    }

    setSubmitting(true);
    try {
      // Build lead payload from field map_to
      const allFields = steps.flatMap((s) => s.fields);
      const lead: Record<string, any> = { meta: {} as Record<string, any> };
      for (const f of allFields) {
        const v = values[f.name];
        if (v === undefined) continue;
        if (f.map_to && f.map_to !== "meta") {
          lead[f.map_to] = v;
        } else {
          lead.meta[f.name] = v;
        }
      }
      lead.meta.form_id = form.id;
      lead.meta.form_name = form.name;

      const { error } = await supabase.functions.invoke("capture-lead", {
        body: {
          ...lead,
          workspace_id: form.workspace_id,
          source: settings.source,
          tags: settings.tags,
          lead_destination: {
            apply_tags: settings.tags,
            source: settings.source,
            pipeline_stage: settings.pipeline_stage || "new_lead",
            folder_name: settings.folder_name || undefined,
          },
        },
      });
      if (error) throw error;

      // Log submission (best-effort, public insert allowed for active forms)
      await supabase.from("form_submissions").insert({
        form_id: form.id,
        workspace_id: form.workspace_id,
        data: values,
      });

      // Fire-and-forget: notify workspace users with full submission details
      try {
        await supabase.functions.invoke("notify-form-submission", {
          body: {
            form_id: form.id,
            workspace_id: form.workspace_id,
            values,
            lead_email: lead.email ?? null,
            lead_name: lead.full_name ?? null,
          },
        });
      } catch (notifyErr) {
        console.warn("notify-form-submission failed:", notifyErr);
      }

      fbqTrack("Lead", { content_name: form.name, content_category: "public_form" });
      wsTrack("Lead", { content_name: form.name, content_category: "public_form" });

      const safeRedirect = normalizeRedirectUrl(settings.redirect_url);
      if (safeRedirect) {
        window.location.href = safeRedirect;
        return;
      }
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: theme.bg_color, color: theme.text_color, borderRadius: theme.border_radius }}
      >
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12" style={{ color: theme.accent_color }} />
        <p className="text-lg font-semibold">{settings.success_message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border p-6 shadow-sm"
      style={{
        background: theme.bg_color,
        color: theme.text_color,
        fontFamily: theme.font,
        borderRadius: theme.border_radius,
      }}
    >
      {theme.logo_url && (
        <img src={theme.logo_url} alt="Logo" className="mx-auto mb-2 max-h-12" />
      )}
      <div>
        <h2 className="text-xl font-bold">{form.name}</h2>
        {form.description && (
          <p className="mt-1 text-sm opacity-70">{form.description}</p>
        )}
      </div>

      {steps.length > 1 && (
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= stepIdx ? theme.accent_color : "#e5e7eb" }}
            />
          ))}
        </div>
      )}

      {currentStep?.title && (
        <p className="text-sm font-medium opacity-80">{currentStep.title}</p>
      )}

      <div className="space-y-4">
        {(currentStep?.fields ?? []).map((f) => (
          <FieldRenderer key={f.id} field={f} value={values[f.name]} onChange={(v) => setVal(f.name, v)} accent={theme.accent_color} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {steps.length > 1 && stepIdx > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStepIdx((i) => i - 1)}>
            Back
          </Button>
        ) : <span />}
        <Button
          type="submit"
          disabled={submitting}
          style={{ background: theme.accent_color, color: "#fff" }}
        >
          {submitting ? "Submitting…" : isLast ? settings.submit_text : "Next"}
        </Button>
      </div>
    </form>
  );
}

function FieldRenderer({
  field, value, onChange, accent,
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
  accent: string;
}) {
  const styledLabel = (extra?: React.CSSProperties) => (
    <Label
      className="mb-1.5 block font-medium"
      style={{
        color: field.label_color || undefined,
        fontSize: field.label_size ? `${field.label_size}px` : undefined,
        fontWeight: field.label_weight || undefined,
        ...extra,
      }}
    >
      {field.label}
      {field.required && <span style={{ color: accent }}>{" *"}</span>}
    </Label>
  );
  const labelEl = (
    <Label className="mb-1.5 block text-sm font-medium">
      {field.label}
      {field.required && <span style={{ color: accent }}>{" *"}</span>}
    </Label>
  );

  const inputStyle: React.CSSProperties = {
    color: field.text_color || undefined,
    backgroundColor: field.background_color || undefined,
    borderColor: field.border_color || undefined,
    borderRadius: field.border_radius != null ? `${field.border_radius}px` : undefined,
    fontSize: field.font_size ? `${field.font_size}px` : undefined,
    fontWeight: field.font_weight || undefined,
    textAlign: (field.text_align as any) || undefined,
    resize: field.resize as any,
  };

  const headingStyle: React.CSSProperties = {
    color: field.text_color || undefined,
    backgroundColor: field.background_color || undefined,
    borderRadius: field.border_radius != null ? `${field.border_radius}px` : undefined,
    padding: field.background_color || field.border_radius ? "0.5rem 0.75rem" : undefined,
    fontSize: field.font_size ? `${field.font_size}px` : undefined,
    fontWeight: field.font_weight || undefined,
    textAlign: (field.text_align as any) || undefined,
    lineHeight: field.line_height || undefined,
    letterSpacing: field.letter_spacing != null ? `${field.letter_spacing}px` : undefined,
    marginTop: field.margin_top != null ? `${field.margin_top}px` : undefined,
    marginBottom: field.margin_bottom != null ? `${field.margin_bottom}px` : undefined,
  };

  switch (field.type) {
    case "heading": {
      const Tag = (field.heading_level ?? "h2") as keyof JSX.IntrinsicElements;
      const defaultClass =
        field.heading_level === "h1" ? "text-3xl font-bold"
        : field.heading_level === "h3" ? "text-lg font-semibold"
        : field.heading_level === "h4" ? "text-base font-semibold"
        : field.heading_level === "h5" ? "text-sm font-semibold"
        : field.heading_level === "h6" ? "text-xs font-semibold uppercase tracking-wider"
        : "text-2xl font-bold"; // h2 default
      return <Tag className={defaultClass} style={headingStyle}>{field.label}</Tag>;
    }
    case "paragraph":
      return <p className="text-sm opacity-80" style={headingStyle}>{field.label}</p>;
    case "divider":
      return <hr className="border-t" />;
    case "image":
    case "logo": {
      if (!field.image_url) return null;
      const align = field.image_align ?? "center";
      const justify = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
      return (
        <div className={`flex ${justify}`}>
          <img
            src={field.image_url}
            alt={field.image_alt ?? (field.type === "logo" ? "Logo" : "")}
            style={{ width: `${field.image_width ?? (field.type === "logo" ? 40 : 100)}%` }}
            className="rounded-md"
          />
        </div>
      );
    }
    case "hidden":
      return null;
    case "long_text": {
      const len = typeof value === "string" ? value.length : 0;
      return (
        <div>
          {styledLabel()}
          <Textarea
            value={value ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows ?? 4}
            minLength={field.min_length}
            maxLength={field.max_length}
            autoComplete={field.autocomplete}
            style={inputStyle}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            {field.help_text ? (
              <p className="text-xs opacity-60">{field.help_text}</p>
            ) : <span />}
            {field.show_counter && (
              <p className="text-xs opacity-60 tabular-nums">
                {len}{field.max_length ? ` / ${field.max_length}` : ""}
              </p>
            )}
          </div>
        </div>
      );
    }
    case "select":
      return (
        <div>
          {labelEl}
          <Select value={value ?? ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select…"} /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "radio":
      return (
        <div>
          {labelEl}
          <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-1">
            {(field.options ?? []).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`${field.id}-${o.value}`} value={o.value} />
                <Label htmlFor={`${field.id}-${o.value}`} className="text-sm font-normal">{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case "checkbox_group": {
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (val: string) => {
        if (arr.includes(val)) onChange(arr.filter((v) => v !== val));
        else onChange([...arr, val]);
      };
      return (
        <div>
          {labelEl}
          <div className="space-y-1">
            {(field.options ?? []).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <Checkbox id={`${field.id}-${o.value}`} checked={arr.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                <Label htmlFor={`${field.id}-${o.value}`} className="text-sm font-normal">{o.label}</Label>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "consent": {
      const checked = !!value;
      return (
        <label
          htmlFor={field.id}
          className="group flex cursor-pointer items-start gap-3 rounded-xl border p-3 sm:p-4 transition-all hover:shadow-sm"
          style={{
            backgroundColor: `${accent}0D`, // ~5% opacity
            borderColor: checked ? accent : `${accent}40`, // 25% when unchecked, full when checked
          }}
        >
          <Checkbox
            id={field.id}
            checked={checked}
            onCheckedChange={(c) => onChange(!!c)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 transition-colors data-[state=checked]:text-white"
            style={{
              borderColor: accent,
              backgroundColor: checked ? accent : "transparent",
            }}
          />
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: accent }}
              aria-hidden="true"
            />
            <span className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span style={{ color: accent }}>{" *"}</span>}
            </span>
          </div>
        </label>
      );
    }
    case "checkbox":
      return (
        <div className="flex items-start gap-2">
          <Checkbox id={field.id} checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
          <Label htmlFor={field.id} className="text-sm font-normal">
            {field.label}
            {field.required && <span style={{ color: accent }}>{" *"}</span>}
          </Label>
        </div>
      );
    case "date":
      return (
        <div>
          {labelEl}
          <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div>
          {labelEl}
          <Input type="number" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "email":
      return (
        <div>
          {labelEl}
          <Input type="email" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "phone":
      return (
        <div>
          {labelEl}
          <Input type="tel" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "short_text":
    default: {
      const isShortText = field.type === "short_text";
      return (
        <div>
          {isShortText ? styledLabel() : labelEl}
          <Input
            value={value ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            minLength={isShortText ? field.min_length : undefined}
            maxLength={isShortText ? field.max_length : undefined}
            pattern={isShortText ? field.pattern : undefined}
            title={isShortText ? field.pattern_message : undefined}
            autoComplete={isShortText ? field.autocomplete : undefined}
            style={isShortText ? inputStyle : undefined}
          />
          {field.help_text && <p className="mt-1 text-xs opacity-60">{field.help_text}</p>}
        </div>
      );
    }
  }
}
