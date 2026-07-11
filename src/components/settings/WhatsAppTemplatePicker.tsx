// Approved-template picker used in automation steps and campaign broadcasts.
// Provider-aware: shows Meta-approved templates when the workspace's active
// WhatsApp provider is Meta Cloud API, and Twilio Content-SID templates when
// Twilio is active. Selecting a template exposes N variable rows; values may
// be static text or contain {{lead_variable}} tokens (interpolated per lead
// server-side).
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { useActiveWhatsAppProvider } from "@/hooks/useWhatsAppConnection";

export type WhatsAppTemplateSelection = {
  id?: string;
  name?: string;
  language?: string;
  /** Twilio only. */
  contentSid?: string;
  /** Variable map ({"1": "{{first_name}}", …}). Used by both providers. */
  contentVariables?: Record<string, string>;
};

type Row = {
  id: string;
  name: string;
  language: string;
  category: string;
  body_preview: string;
  variable_count: number;
  provider: string | null;
  twilio_content_sid: string | null;
  twilio_variable_sample: Record<string, string> | null;
  status: string;
};

const TOKEN_HINTS = [
  "{{first_name}}", "{{full_name}}", "{{last_name}}",
  "{{email}}", "{{phone}}", "{{company}}",
];

interface Props {
  workspaceId: string | null;
  value: WhatsAppTemplateSelection | null;
  onChange: (v: WhatsAppTemplateSelection | null) => void;
  /** Optional override; otherwise auto-detects from workspace_channel_settings. */
  provider?: "meta" | "twilio";
}

export default function WhatsAppTemplatePicker({ workspaceId, value, onChange, provider }: Props) {
  const { data: detectedProvider } = useActiveWhatsAppProvider(workspaceId);
  const activeProvider = provider ?? detectedProvider ?? "meta";

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["wa-approved-templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, name, language, category, body_preview, variable_count, provider, twilio_content_sid, twilio_variable_sample, status")
        .eq("workspace_id", workspaceId!)
        .eq("status", "approved")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const eligible = useMemo(() => {
    if (activeProvider === "twilio") {
      return templates.filter((t) => !!t.twilio_content_sid);
    }
    // Meta: rows synced from Meta have provider='meta' or NULL (legacy). Exclude Twilio-only.
    return templates.filter((t) => {
      const p = (t.provider || "meta").toLowerCase();
      return p === "meta" || p === "both";
    });
  }, [templates, activeProvider]);

  const selected = useMemo(
    () => eligible.find((t) => t.id === value?.id) || null,
    [eligible, value?.id],
  );

  const setTemplate = (id: string) => {
    if (id === "none") { onChange(null); return; }
    const t = eligible.find((x) => x.id === id);
    if (!t) return;
    const defaults: Record<string, string> = {};
    for (let i = 1; i <= (t.variable_count || 0); i++) {
      const key = String(i);
      defaults[key] = t.twilio_variable_sample?.[key] ?? (i === 1 ? "{{first_name}}" : "");
    }
    onChange({
      id: t.id,
      name: t.name,
      language: t.language,
      contentSid: activeProvider === "twilio" ? t.twilio_content_sid || undefined : undefined,
      contentVariables: defaults,
    });
  };

  const setVar = (key: string, val: string) => {
    if (!value) return;
    onChange({ ...value, contentVariables: { ...(value.contentVariables || {}), [key]: val } });
  };

  const providerLabel = activeProvider === "twilio" ? "Twilio" : "Meta Cloud API";

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-xs font-medium">Approved WhatsApp template</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Required for business-initiated messages. Free-text only delivers inside the 24-hour reply window.
            <span className="ml-1">Active provider: <strong>{providerLabel}</strong>.</span>
          </p>
        </div>
        {selected && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {activeProvider === "twilio" && selected.twilio_content_sid
              ? `Twilio · ${selected.twilio_content_sid.slice(0, 6)}…`
              : "Meta"}
          </Badge>
        )}
      </div>

      <Select value={value?.id ?? "none"} onValueChange={setTemplate}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={isLoading ? "Loading templates…" : "Select an approved template"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— None (session-only free-text) —</SelectItem>
          {eligible.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} · {t.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isLoading && eligible.length === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {activeProvider === "twilio" ? (
            <span>
              No Twilio-approved templates found. Add one in <strong>Settings → Channels → WhatsApp Templates</strong> using the
              Content SID (starts with <code className="font-mono">HX…</code>) from Twilio Content Template Builder.
            </span>
          ) : (
            <span>
              No Meta-approved templates found. Open <strong>Settings → Channels → WhatsApp</strong> and click
              <em> Sync templates from Meta</em>. Templates must be <strong>approved</strong> in Meta Business Manager to appear here.
            </span>
          )}
        </div>
      )}

      {selected && selected.variable_count > 0 && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-[11px] font-medium text-muted-foreground">Variable mapping</p>
          {Array.from({ length: selected.variable_count }).map((_, i) => {
            const key = String(i + 1);
            const val = value?.contentVariables?.[key] ?? "";
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground w-10">{`{{${key}}}`}</span>
                <Input
                  value={val}
                  onChange={(e) => setVar(key, e.target.value)}
                  placeholder="e.g. {{first_name}} or a static value"
                  className="h-8 text-sm"
                />
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">
            Tip: use tokens like {TOKEN_HINTS.slice(0, 4).map((t) => <code key={t} className="mx-0.5 font-mono">{t}</code>)} — resolved per lead.
          </p>
        </div>
      )}

      {selected?.body_preview && (
        <div className="rounded border bg-background p-2 text-[11px] text-muted-foreground whitespace-pre-wrap">
          {selected.body_preview}
        </div>
      )}
    </div>
  );
}
