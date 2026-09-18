import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Image, FileText, Type, ChevronDown, Upload, Save, RotateCcw, Palette, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceBranding, useUpsertBranding } from "@/hooks/useWorkspaceBranding";

export interface TemplateSettings {
  /** Brand name — used for logo alt text and default footer wording. */
  brandName?: string;
  /** Inbox preview line shown next to the subject. */
  preheader?: string;
  /** Button / link colour used inside the email. */
  accentColor?: string;
  /** Page background colour behind the email card. */
  backgroundColor?: string;
  /** Sender postal address shown under the unsubscribe line. */
  address?: string;
  header: {
    color: string;
    /** Show the coloured brand band above the email card. */
    showBar?: boolean;
  };
  logo: {
    url: string;
    alignment: "left" | "center" | "right";
    size?: number; // deprecated, kept for backward compat
    width: number;
    height: number;
    autoHeight: boolean;
    visible: boolean;
  };
  unsubscribe: {
    enabled: boolean;
    text: string;
  };
  footer: {
    text: string;
    color: string;
    alignment: "left" | "center" | "right";
  };
}

const HEADER_COLOR_PRESETS = [
  { label: "Navy", value: "#0B1F3B" },
  { label: "Black", value: "#000000" },
  { label: "Charcoal", value: "#333333" },
  { label: "Dark Teal", value: "#0D4F4F" },
  { label: "Deep Purple", value: "#2D1B69" },
  { label: "Burgundy", value: "#5B1A2A" },
  { label: "Forest", value: "#1B4332" },
  { label: "Slate", value: "#475569" },
];

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  brandName: "NexusFlo24",
  preheader: "",
  accentColor: "#C9A227",
  backgroundColor: "#F4F5F7",
  address: "",
  header: {
    color: "#0B1F3B",
    showBar: true,
  },
  logo: {
    url: "https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png",
    alignment: "center",
    width: 120,
    height: 56,
    autoHeight: true,
    visible: true,
  },
  unsubscribe: {
    enabled: true,
    text: "You received this email because you subscribed to NexusFlo24.",
  },
  footer: {
    text: "© NexusFlo24 · AI-Powered Marketing Automation",
    color: "#C9A227",
    alignment: "center",
  },
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(value: string | undefined | null): boolean {
  return HEX_RE.test(String(value ?? "").trim());
}

/** Fill in any missing keys so old saved settings keep rendering. */
export function normalizeTemplateSettings(raw?: Partial<TemplateSettings> | null): TemplateSettings {
  return {
    ...DEFAULT_TEMPLATE_SETTINGS,
    ...(raw ?? {}),
    header: { ...DEFAULT_TEMPLATE_SETTINGS.header, ...raw?.header },
    logo: { ...DEFAULT_TEMPLATE_SETTINGS.logo, ...raw?.logo },
    unsubscribe: { ...DEFAULT_TEMPLATE_SETTINGS.unsubscribe, ...raw?.unsubscribe },
    footer: { ...DEFAULT_TEMPLATE_SETTINGS.footer, ...raw?.footer },
  };
}

/** Build starting settings from the workspace's saved brand. */
export function templateSettingsFromBranding(branding?: {
  logo_url?: string | null;
  brand_color?: string | null;
  brand_name?: string | null;
  email_template_settings?: unknown;
} | null): TemplateSettings {
  if (!branding) return DEFAULT_TEMPLATE_SETTINGS;
  const saved = branding.email_template_settings as Partial<TemplateSettings> | null | undefined;
  if (saved && typeof saved === "object") return normalizeTemplateSettings(saved);

  const name = branding.brand_name?.trim();
  return normalizeTemplateSettings({
    brandName: name || DEFAULT_TEMPLATE_SETTINGS.brandName,
    header: {
      color: isValidHex(branding.brand_color) ? String(branding.brand_color) : DEFAULT_TEMPLATE_SETTINGS.header.color,
      showBar: true,
    },
    logo: branding.logo_url
      ? { ...DEFAULT_TEMPLATE_SETTINGS.logo, url: branding.logo_url }
      : DEFAULT_TEMPLATE_SETTINGS.logo,
    unsubscribe: {
      enabled: true,
      text: name
        ? `You received this email because you subscribed to ${name}.`
        : DEFAULT_TEMPLATE_SETTINGS.unsubscribe.text,
    },
    footer: name
      ? { ...DEFAULT_TEMPLATE_SETTINGS.footer, text: `© ${name}` }
      : DEFAULT_TEMPLATE_SETTINGS.footer,
  });
}

interface Props {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
  /** When provided, shows "Apply to every email step in this automation". */
  onApplyToAll?: (settings: TemplateSettings) => void;
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const invalid = value.trim().length > 0 && !isValidHex(value);
  return (
    <div className="flex-1 space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={isValidHex(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 shrink-0 rounded border border-border cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 text-xs h-8 font-mono ${invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
          placeholder={placeholder}
          aria-invalid={invalid}
        />
      </div>
      {invalid && <p className="text-[10px] text-destructive">Use a colour code like #0B1F3B.</p>}
    </div>
  );
}

export default function EmailTemplateSettings({ settings: rawSettings, onChange, onApplyToAll }: Props) {
  const settings = useMemo(() => normalizeTemplateSettings(rawSettings), [rawSettings]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const workspaceId = useWorkspaceId();
  const { data: branding } = useWorkspaceBranding(workspaceId || "");
  const upsertBranding = useUpsertBranding();

  const update = <K extends keyof TemplateSettings>(
    section: K,
    patch: TemplateSettings[K] extends object ? Partial<TemplateSettings[K]> : never
  ) => {
    onChange({
      ...settings,
      [section]: { ...(settings[section] as object), ...(patch as object) },
    });
  };

  const setField = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${workspaceId}/logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("email-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
      update("logo", { url: data.publicUrl });
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveAsWorkspaceDefault = async () => {
    if (!workspaceId) return;
    await upsertBranding.mutateAsync({
      workspace_id: workspaceId,
      email_template_settings: settings,
    } as any);
    toast.success("Saved as the default look for new emails in this workspace.");
  };

  const resetToDefault = () => {
    onChange(templateSettingsFromBranding(branding as any));
    toast.success("Reset to your workspace default.");
  };

  const logoWidth = settings.logo.width ?? settings.logo.size ?? 120;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2 text-xs text-muted-foreground hover:text-foreground h-9"
        >
          <span className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Template Settings
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-2 pb-1">
        {/* ── Live mini preview ── */}
        <div
          className="overflow-hidden rounded-lg border border-border"
          style={{ backgroundColor: isValidHex(settings.backgroundColor) ? settings.backgroundColor : "#F4F5F7" }}
        >
          {settings.header.showBar !== false && (
            <div
              className="flex items-center px-4 py-3"
              style={{
                backgroundColor: isValidHex(settings.header.color) ? settings.header.color : "#0B1F3B",
                justifyContent:
                  settings.logo.alignment === "left" ? "flex-start" : settings.logo.alignment === "right" ? "flex-end" : "center",
              }}
            >
              {settings.logo.visible && settings.logo.url ? (
                <img
                  src={settings.logo.url}
                  alt={settings.brandName || "Brand"}
                  style={{ width: Math.min(logoWidth, 140), borderRadius: 6 }}
                />
              ) : (
                <span className="text-xs font-semibold text-white">{settings.brandName || "Your brand"}</span>
              )}
            </div>
          )}
          <div className="bg-white px-4 py-3">
            <p className="text-[11px] text-[#0B1F3B]">Your email content appears here.</p>
            <span
              className="mt-2 inline-block rounded px-2 py-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: isValidHex(settings.accentColor) ? settings.accentColor : "#C9A227" }}
            >
              Button
            </span>
          </div>
          <p
            className="px-4 py-2 text-[10px]"
            style={{
              color: isValidHex(settings.footer.color) ? settings.footer.color : "#C9A227",
              textAlign: settings.footer.alignment,
            }}
          >
            {settings.footer.text}
          </p>
        </div>

        {/* ── Brand ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Brand
          </span>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Brand name</Label>
            <Input
              className="text-xs h-8"
              placeholder="e.g. AfarHome"
              value={settings.brandName ?? ""}
              onChange={(e) => setField("brandName", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Shown when images are blocked, and in default footer wording.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Inbox preview line</Label>
            <Input
              className="text-xs h-8"
              placeholder="Short line shown next to the subject in the inbox"
              value={settings.preheader ?? ""}
              onChange={(e) => setField("preheader", e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3">
            <ColorField
              label="Button / link colour"
              value={settings.accentColor ?? ""}
              onChange={(v) => setField("accentColor", v)}
              placeholder="#C9A227"
            />
            <ColorField
              label="Page background"
              value={settings.backgroundColor ?? ""}
              onChange={(v) => setField("backgroundColor", v)}
              placeholder="#F4F5F7"
            />
          </div>
        </div>

        {/* ── Header Bar ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" /> Header Bar
            </span>
            <Switch
              aria-label="Show header bar"
              checked={settings.header.showBar !== false}
              onCheckedChange={(v) => update("header", { showBar: v })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">A coloured band across the top of the email, with your logo on it.</p>
          <div className="flex flex-wrap gap-2">
            {HEADER_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                onClick={() => update("header", { color: preset.value })}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  settings.header.color === preset.value
                    ? "border-primary scale-110 ring-2 ring-primary/30"
                    : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
          <ColorField
            label="Header colour"
            value={settings.header.color}
            onChange={(v) => update("header", { color: v })}
            placeholder="#0B1F3B"
          />
        </div>

        {/* ── Header Logo ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Header Logo
            </span>
            <Switch
              aria-label="Show header logo"
              checked={settings.logo.visible}
              onCheckedChange={(v) => update("logo", { visible: v })}
            />
          </div>

          {settings.logo.visible && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Logo URL"
                  aria-label="Logo URL"
                  className="flex-1 text-xs h-8"
                  value={settings.logo.url}
                  onChange={(e) => update("logo", { url: e.target.value })}
                />
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      <Upload className="h-3 w-3" />
                      {uploading ? "…" : "Upload"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Alignment</Label>
                  <Select
                    value={settings.logo.alignment}
                    onValueChange={(v) =>
                      update("logo", { alignment: v as "left" | "center" | "right" })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Width: {logoWidth}px</Label>
                  <Slider
                    min={32}
                    max={300}
                    step={4}
                    value={[logoWidth]}
                    onValueChange={([v]) => update("logo", { width: v })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Switch
                    aria-label="Auto height"
                    checked={settings.logo.autoHeight ?? true}
                    onCheckedChange={(v) => update("logo", { autoHeight: v })}
                  />
                  <Label className="text-[11px] text-muted-foreground">Auto height</Label>
                </div>

                {!settings.logo.autoHeight && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Height: {settings.logo.height ?? settings.logo.size ?? 56}px
                    </Label>
                    <Slider
                      min={32}
                      max={200}
                      step={4}
                      value={[settings.logo.height ?? settings.logo.size ?? 56]}
                      onValueChange={([v]) => update("logo", { height: v })}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Unsubscribe Block ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Unsubscribe / Compliance
            </span>
            <Switch
              aria-label="Show unsubscribe block"
              checked={settings.unsubscribe.enabled}
              onCheckedChange={(v) => update("unsubscribe", { enabled: v })}
            />
          </div>

          {settings.unsubscribe.enabled && (
            <>
              <Textarea
                placeholder="Compliance text shown above unsubscribe link"
                aria-label="Compliance text"
                className="text-xs min-h-[60px]"
                value={settings.unsubscribe.text}
                onChange={(e) => update("unsubscribe", { text: e.target.value })}
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Postal address</Label>
                <Input
                  className="text-xs h-8"
                  placeholder="Company name, street, city, country"
                  value={settings.address ?? ""}
                  onChange={(e) => setField("address", e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Bulk email rules require a real postal address in the footer.</p>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" /> Footer
          </span>

          <Input
            placeholder="Footer text"
            aria-label="Footer text"
            className="text-xs h-8"
            value={settings.footer.text}
            onChange={(e) => update("footer", { text: e.target.value })}
          />

          <div className="flex items-start gap-3">
            <ColorField
              label="Colour"
              value={settings.footer.color}
              onChange={(v) => update("footer", { color: v })}
              placeholder="#C9A227"
            />
            <div className="flex-1 space-y-1">
              <Label className="text-[11px] text-muted-foreground">Alignment</Label>
              <Select
                value={settings.footer.alignment}
                onValueChange={(v) =>
                  update("footer", { alignment: v as "left" | "center" | "right" })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Reuse actions ── */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!workspaceId || upsertBranding.isPending}
            onClick={saveAsWorkspaceDefault}
          >
            <Save className="h-3.5 w-3.5" />
            Save as workspace default
          </Button>
          {onApplyToAll && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                onApplyToAll(settings);
                toast.success("Applied to every email step in this automation.");
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              Apply to all email steps
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={resetToDefault}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
