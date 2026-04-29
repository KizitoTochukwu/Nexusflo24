import { useState } from "react";
import type { FormSettings, FormTheme } from "@/hooks/useForms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLeadFolders, useCreateFolder } from "@/hooks/useLeadFolders";
import { Plus } from "lucide-react";

interface Props {
  description: string;
  settings: FormSettings;
  theme: FormTheme;
  workspaceId?: string;
  onChangeDescription: (v: string) => void;
  onChangeSettings: (s: FormSettings) => void;
  onChangeTheme: (t: FormTheme) => void;
}

const PIPELINE_STAGES = [
  "new_lead", "contacted", "engaged", "qualified", "demo_booked", "proposal_sent", "negotiation", "closed_won",
];

const LEAD_SOURCES = [
  "Form",
  "Landing Page",
  "Funnel",
  "Webinar",
  "Email Campaign",
  "WhatsApp",
  "SMS",
  "Facebook Ad",
  "Instagram Ad",
  "Google Ad",
  "LinkedIn",
  "Referral",
  "Organic",
  "Other",
];

const COLOR_PALETTES: { name: string; bg: string; accent: string; text: string }[] = [
  { name: "NexusFlo Navy", bg: "#FFFFFF", accent: "#0B1F3B", text: "#0B1F3B" },
  { name: "Gold Luxe", bg: "#FFFFFF", accent: "#C9A227", text: "#1F2937" },
  { name: "Midnight", bg: "#0F172A", accent: "#6366F1", text: "#F8FAFC" },
  { name: "Ocean", bg: "#F0F9FF", accent: "#0284C7", text: "#0C4A6E" },
  { name: "Forest", bg: "#F0FDF4", accent: "#16A34A", text: "#14532D" },
  { name: "Sunset", bg: "#FFF7ED", accent: "#EA580C", text: "#7C2D12" },
  { name: "Rose", bg: "#FFF1F2", accent: "#E11D48", text: "#881337" },
  { name: "Mono", bg: "#FAFAFA", accent: "#111111", text: "#111111" },
];

export default function FormSettingsPanel({
  description, settings, theme, onChangeDescription, onChangeSettings, onChangeTheme,
}: Props) {
  const setS = <K extends keyof FormSettings>(k: K, v: FormSettings[K]) =>
    onChangeSettings({ ...settings, [k]: v });
  const setT = <K extends keyof FormTheme>(k: K, v: FormTheme[K]) =>
    onChangeTheme({ ...theme, [k]: v });

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Optional intro text shown above the form"
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Behavior</p>
        <div>
          <Label className="text-xs">Submit button text</Label>
          <Input value={settings.submit_text} onChange={(e) => setS("submit_text", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Success message</Label>
          <Textarea rows={2} value={settings.success_message} onChange={(e) => setS("success_message", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Redirect URL (optional)</Label>
          <Input
            type="url"
            placeholder="https://example.com/thank-you"
            value={settings.redirect_url}
            onChange={(e) => setS("redirect_url", e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (!v) return;
              if (v.startsWith("/")) return;
              if (/^https?:\/\//i.test(v)) return;
              setS("redirect_url", `https://${v}`);
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Must include https:// (e.g. https://www.example.com/thanks). We'll add it automatically if you forget.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CRM mapping</p>
        <div>
          <Label className="text-xs">Lead source</Label>
          <Select
            value={LEAD_SOURCES.includes(settings.source) ? settings.source : "Other"}
            onValueChange={(v) => setS("source", v)}
          >
            <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tags (comma-separated)</Label>
          <Input
            value={(settings.tags ?? []).join(", ")}
            onChange={(e) =>
              setS("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Folder name (optional)</Label>
          <Input
            value={settings.folder_name}
            onChange={(e) => setS("folder_name", e.target.value)}
            placeholder="Will route lead to this folder"
          />
        </div>
        <div>
          <Label className="text-xs">Initial pipeline stage</Label>
          <Select value={settings.pipeline_stage} onValueChange={(v) => setS("pipeline_stage", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submission notifications</p>
        <p className="text-xs text-muted-foreground">
          Alert your team whenever someone submits this form. Defaults to workspace owners/admins if no recipients are set.
        </p>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Email notification</Label>
          <Switch
            checked={settings.notify_channels?.email ?? true}
            onCheckedChange={(v) =>
              setS("notify_channels", { ...(settings.notify_channels ?? { email: true, sms: false, whatsapp: false }), email: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">SMS notification</Label>
          <Switch
            checked={settings.notify_channels?.sms ?? false}
            onCheckedChange={(v) =>
              setS("notify_channels", { ...(settings.notify_channels ?? { email: true, sms: false, whatsapp: false }), sms: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">WhatsApp notification</Label>
          <Switch
            checked={settings.notify_channels?.whatsapp ?? false}
            onCheckedChange={(v) =>
              setS("notify_channels", { ...(settings.notify_channels ?? { email: true, sms: false, whatsapp: false }), whatsapp: v })
            }
          />
        </div>

        <div>
          <Label className="text-xs">Recipient emails (comma-separated)</Label>
          <Input
            placeholder="alex@team.com, sales@team.com"
            value={(settings.notify_emails ?? []).join(", ")}
            onChange={(e) =>
              setS("notify_emails", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Recipient phones (E.164, comma-separated)</Label>
          <Input
            placeholder="+15551234567, +447900000000"
            value={(settings.notify_phones ?? []).join(", ")}
            onChange={(e) =>
              setS("notify_phones", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))
            }
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branding</p>

        <div>
          <Label className="text-xs">Color palette</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {COLOR_PALETTES.map((p) => {
              const active =
                theme.bg_color.toLowerCase() === p.bg.toLowerCase() &&
                theme.accent_color.toLowerCase() === p.accent.toLowerCase() &&
                theme.text_color.toLowerCase() === p.text.toLowerCase();
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    onChangeTheme({
                      ...theme,
                      bg_color: p.bg,
                      accent_color: p.accent,
                      text_color: p.text,
                    })
                  }
                  className={`group flex items-center gap-2 rounded-md border p-2 text-left transition hover:border-primary ${
                    active ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                  title={p.name}
                >
                  <div className="flex -space-x-1">
                    <span className="h-5 w-5 rounded-full border border-background" style={{ background: p.bg }} />
                    <span className="h-5 w-5 rounded-full border border-background" style={{ background: p.accent }} />
                    <span className="h-5 w-5 rounded-full border border-background" style={{ background: p.text }} />
                  </div>
                  <span className="truncate text-xs">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Background</Label>
            <Input type="color" value={theme.bg_color} onChange={(e) => setT("bg_color", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Accent</Label>
            <Input type="color" value={theme.accent_color} onChange={(e) => setT("accent_color", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Text</Label>
            <Input type="color" value={theme.text_color} onChange={(e) => setT("text_color", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Radius (px)</Label>
            <Input
              type="number"
              min={0}
              max={32}
              value={theme.border_radius}
              onChange={(e) => setT("border_radius", Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Font family</Label>
          <Select value={theme.font} onValueChange={(v) => setT("font", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Inter", "Poppins", "Roboto", "system-ui", "Georgia"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
