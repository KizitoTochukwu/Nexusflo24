import { useEffect, useMemo, useRef, useState } from "react";
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
import SmsConsentCheckbox from "@/components/forms/SmsConsentCheckbox";
import { buildSmsConsentText } from "@/lib/consent/smsConsent";
import { isFieldVisible } from "@/lib/forms/conditions";


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
  /** Condenses spacing and controls for the popup embed. */
  compact?: boolean;
}

export default function PublicFormRenderer({ form, preview, compact = false }: Props) {
  const steps = form.schema?.steps ?? [];
  const theme = form.theme;
  const settings = form.settings;
  const messagingConsentText = buildSmsConsentText(settings.messaging_consent_text);
  const [stepIdx, setStepIdx] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [isNarrowPopup, setIsNarrowPopup] = useState(false);
  const [popupPage, setPopupPage] = useState(0);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!compact) return;
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrowPopup(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [compact]);

  const allFieldsFlat = steps.flatMap((s) => s.fields);
  const hasPhoneField = allFieldsFlat.some(
    (f) => f.type === "phone" || f.map_to === "phone",
  );
  const currentStep = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const visibleCurrentFields = useMemo(
    () => (currentStep?.fields ?? []).filter((f) => isFieldVisible(f, values)),
    [currentStep, values],
  );
  const usesMobilePopupPages = compact && isNarrowPopup && steps.length === 1 && visibleCurrentFields.length > 4;
  const visiblePopupFields = usesMobilePopupPages
    ? (popupPage === 0 ? visibleCurrentFields.slice(0, 4) : visibleCurrentFields.slice(4))
    : visibleCurrentFields;

  const setVal = (name: string, v: any) => setValues((s) => ({ ...s, [name]: v }));

  const validateFields = (fields: FormField[]) => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.name];
      if (f.type === "consent" || f.type === "checkbox") {
        if (!v) return `Please confirm: ${f.label}`;
      } else if (f.type === "file") {
        if (!Array.isArray(v) || v.length === 0) return `${f.label} is required`;
      } else if (v === undefined || v === null || v === "") {
        return `${f.label} is required`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateFields(visiblePopupFields);
    if (err) {
      toast.error(err);
      return;
    }
    if (usesMobilePopupPages && popupPage === 0) {
      setPopupPage(1);
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
      // Build lead payload from field map_to — hidden (conditional) fields are excluded
      const allFields = steps
        .flatMap((s) => s.fields)
        .filter((f) => isFieldVisible(f, values));
      const submittedValues: Record<string, any> = {};
      const lead: Record<string, any> = { meta: {} as Record<string, any> };
      for (const f of allFields) {
        const v = values[f.name];
        if (v === undefined) continue;
        submittedValues[f.name] = v;
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
          form_id: form.id,
          form_data: submittedValues,
          hp_field: honeypot,
          elapsed_ms: Date.now() - startedAt.current,
          sms_consent: hasPhoneField ? smsConsent : undefined,
          sms_consent_text: hasPhoneField && smsConsent ? messagingConsentText : undefined,
          sms_consent_timestamp: hasPhoneField && smsConsent ? new Date().toISOString() : undefined,
          sms_consent_source: hasPhoneField && smsConsent ? `Form: ${form.name}` : undefined,
          lead_destination: {
            apply_tags: settings.tags,
            source: settings.source,
            pipeline_stage: settings.pipeline_stage || "new_lead",
            folder_name: settings.folder_name || undefined,
          },
        },
      });
      if (error) throw error;


      // Note: form_submissions insert + submission_count increment are now handled
      // server-side inside capture-lead (via DB trigger). Client no longer inserts
      // here to avoid double-counting.

      // Fire-and-forget: notify workspace users with full submission details
      try {
        await supabase.functions.invoke("notify-form-submission", {
          body: {
            form_id: form.id,
            workspace_id: form.workspace_id,
            values: submittedValues,

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
      className={compact
        ? "relative space-y-2.5 rounded-lg border px-4 py-3 shadow-sm sm:px-5 sm:py-4"
        : "relative space-y-5 rounded-xl border p-6 shadow-sm"}
      style={{
        background: theme.bg_color,
        color: theme.text_color,
        fontFamily: theme.font,
        borderRadius: theme.border_radius,
      }}
    >
      {theme.logo_url && (
        <img src={theme.logo_url} alt="Logo" className={compact ? "mx-auto max-h-8" : "mx-auto mb-2 max-h-12"} />
      )}
      <div className={compact ? "pr-8" : undefined}>
        <h2 className={compact ? "text-lg font-bold leading-tight" : "text-xl font-bold"}>{form.name}</h2>
        {form.description && (
          <p className={compact ? "mt-0.5 text-xs leading-snug opacity-70" : "mt-1 text-sm opacity-70"}>{form.description}</p>
        )}
      </div>

      {(steps.length > 1 || usesMobilePopupPages) && (
        <div className="flex gap-1">
          {(usesMobilePopupPages ? [0, 1] : steps).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= (usesMobilePopupPages ? popupPage : stepIdx) ? theme.accent_color : "#e5e7eb" }}
            />
          ))}
        </div>
      )}

      {currentStep?.title && (
        <p className={compact ? "text-xs font-medium opacity-80" : "text-sm font-medium opacity-80"}>{currentStep.title}</p>
      )}

      <div className={compact ? "grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2" : "space-y-4"}>
        {visiblePopupFields.map((f) => (
          <div key={f.id} className={compact && isFullWidthPopupField(f) ? "sm:col-span-2" : undefined}>
            <FieldRenderer
              field={f}
              value={values[f.name]}
              onChange={(v) => setVal(f.name, v)}
              accent={theme.accent_color}
              formId={form.id}
              preview={preview}
              compact={compact}
            />
          </div>
        ))}
      </div>

      {hasPhoneField && isLast && (!usesMobilePopupPages || popupPage === 1) && (
        <SmsConsentCheckbox
          checked={smsConsent}
          onCheckedChange={setSmsConsent}
          consentText={messagingConsentText}
          className={compact ? "[&_label]:text-[10px] [&_label]:leading-[1.35]" : undefined}
        />
      )}

      {/* Honeypot — hidden from humans, tempting to bots */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={`hp-${form.id}`}>Leave this field empty</label>
        <input
          id={`hp-${form.id}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>





      <div className={compact ? "flex items-center justify-between gap-2 pt-0.5" : "flex items-center justify-between gap-2 pt-2"}>
        {(usesMobilePopupPages && popupPage > 0) || (steps.length > 1 && stepIdx > 0) ? (
          <Button
            type="button"
            variant="outline"
            className={compact ? "h-9 px-4" : undefined}
            onClick={() => usesMobilePopupPages ? setPopupPage(0) : setStepIdx((i) => i - 1)}
          >
            Back
          </Button>
        ) : <span />}
        <Button
          type="submit"
          disabled={submitting}
          className={compact ? "h-9 px-4" : undefined}
          style={{ background: theme.accent_color, color: "#fff" }}
        >
          {submitting ? "Submitting…" : (usesMobilePopupPages && popupPage === 0) || !isLast ? "Next" : settings.submit_text}
        </Button>
      </div>
    </form>
  );
}

function isFullWidthPopupField(field: FormField) {
  return ["consent", "checkbox", "checkbox_group", "radio", "long_text", "heading", "paragraph", "divider", "image", "logo", "file"].includes(field.type);
}

function FieldRenderer({
  field, value, onChange, accent, formId, preview, compact,
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
  accent: string;
  formId?: string;
  preview?: boolean;
  compact?: boolean;
}) {

  const styledLabel = (extra?: React.CSSProperties) => (
    <Label
      className={compact ? "mb-1 block text-xs font-medium" : "mb-1.5 block font-medium"}
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
    <Label className={compact ? "mb-1 block text-xs font-medium" : "mb-1.5 block text-sm font-medium"}>
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
            <SelectTrigger className={compact ? "h-9" : undefined}><SelectValue placeholder={field.placeholder || "Select…"} /></SelectTrigger>
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
          className={compact
            ? "group flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-all hover:shadow-sm"
            : "group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:shadow-sm sm:p-4"}
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
            <span className={compact ? "text-xs leading-snug" : "text-sm leading-relaxed"}>
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
    case "file":
      return (
        <FileFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          labelEl={labelEl}
          formId={formId}
          preview={preview}
        />
      );
    case "date":

      return (
        <div>
          {labelEl}
          <Input className={compact ? "h-9" : undefined} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div>
          {labelEl}
          <Input className={compact ? "h-9" : undefined} type="number" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "email":
      return (
        <div>
          {labelEl}
          <Input className={compact ? "h-9" : undefined} type="email" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "phone":
      return (
        <div>
          {labelEl}
          <Input className={compact ? "h-9" : undefined} type="tel" value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "short_text":
    default: {
      const isShortText = field.type === "short_text";
      return (
        <div>
          {isShortText ? styledLabel() : labelEl}
          <Input
            className={compact ? "h-9" : undefined}
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

function FileFieldRenderer({
  field, value, onChange, labelEl, formId, preview,
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
  labelEl: React.ReactNode;
  formId?: string;
  preview?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const files: { path: string; name: string; size: number }[] = Array.isArray(value) ? value : [];
  const maxMb = field.max_size_mb ?? 10;

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (preview) {
      toast.info("File uploads are disabled in preview.");
      return;
    }
    if (!formId) return;
    setBusy(true);
    try {
      const uploaded = [...files];
      for (const file of Array.from(list)) {
        if (file.size > maxMb * 1024 * 1024) {
          toast.error(`${file.name} is larger than ${maxMb}MB`);
          continue;
        }
        const { data, error } = await supabase.functions.invoke("form-upload-url", {
          body: { form_id: formId, field: field.name, file_name: file.name, size: file.size },
        });
        if (error || !data?.path) throw new Error(data?.error || "Upload failed");
        const { error: upErr } = await supabase.storage
          .from("form-uploads")
          .uploadToSignedUrl(data.path, data.token, file);
        if (upErr) throw upErr;
        uploaded.push({ path: data.path, name: file.name, size: file.size });
        if (!field.multiple) break;
      }
      onChange(field.multiple ? uploaded : uploaded.slice(-1));
    } catch (e: any) {
      toast.error(e.message || "Could not upload file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {labelEl}
      <Input
        type="file"
        accept={field.accept || undefined}
        multiple={Boolean(field.multiple)}
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-1 text-xs opacity-60">
        {busy ? "Uploading…" : `Max ${maxMb}MB${field.accept ? ` · ${field.accept}` : ""}`}
      </p>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs opacity-80">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="underline"
                onClick={() => onChange(files.filter((x) => x.path !== f.path))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {field.help_text && <p className="mt-1 text-xs opacity-60">{field.help_text}</p>}
    </div>
  );
}

