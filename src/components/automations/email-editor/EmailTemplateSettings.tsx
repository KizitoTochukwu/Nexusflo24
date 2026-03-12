import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Image, FileText, Type, ChevronDown, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemplateSettings {
  header: {
    color: string;
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

interface Props {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
}

export default function EmailTemplateSettings({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof TemplateSettings>(
    section: K,
    patch: Partial<TemplateSettings[K]>
  ) => {
    onChange({
      ...settings,
      [section]: { ...settings[section], ...patch },
    });
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
      const path = `logos/${Date.now()}.${ext}`;
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
        {/* ── Header Logo ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Header Logo
            </span>
            <Switch
              checked={settings.logo.visible}
              onCheckedChange={(v) => update("logo", { visible: v })}
            />
          </div>

          {settings.logo.visible && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Logo URL"
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
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Alignment</label>
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
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Width: {settings.logo.width ?? settings.logo.size ?? 120}px
                  </label>
                  <Slider
                    min={32}
                    max={300}
                    step={4}
                    value={[settings.logo.width ?? settings.logo.size ?? 120]}
                    onValueChange={([v]) => update("logo", { width: v })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Switch
                    checked={settings.logo.autoHeight ?? true}
                    onCheckedChange={(v) => update("logo", { autoHeight: v })}
                  />
                  <label className="text-[10px] text-muted-foreground">Auto height</label>
                </div>

                {!settings.logo.autoHeight && (
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">
                      Height: {settings.logo.height ?? settings.logo.size ?? 56}px
                    </label>
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
              checked={settings.unsubscribe.enabled}
              onCheckedChange={(v) => update("unsubscribe", { enabled: v })}
            />
          </div>

          {settings.unsubscribe.enabled && (
            <Textarea
              placeholder="Compliance text shown above unsubscribe link"
              className="text-xs min-h-[60px]"
              value={settings.unsubscribe.text}
              onChange={(e) => update("unsubscribe", { text: e.target.value })}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" /> Footer
          </span>

          <Input
            placeholder="Footer text"
            className="text-xs h-8"
            value={settings.footer.text}
            onChange={(e) => update("footer", { text: e.target.value })}
          />

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.footer.color}
                  onChange={(e) => update("footer", { color: e.target.value })}
                  className="h-7 w-7 rounded border border-border cursor-pointer"
                />
                <Input
                  value={settings.footer.color}
                  onChange={(e) => update("footer", { color: e.target.value })}
                  className="flex-1 text-xs h-8 font-mono"
                  placeholder="#C9A227"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Alignment</label>
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
      </CollapsibleContent>
    </Collapsible>
  );
}
