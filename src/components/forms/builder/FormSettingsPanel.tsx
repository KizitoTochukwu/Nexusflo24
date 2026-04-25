import type { FormSettings, FormTheme } from "@/hooks/useForms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  description: string;
  settings: FormSettings;
  theme: FormTheme;
  onChangeDescription: (v: string) => void;
  onChangeSettings: (s: FormSettings) => void;
  onChangeTheme: (t: FormTheme) => void;
}

const PIPELINE_STAGES = [
  "new_lead", "contacted", "engaged", "qualified", "demo_booked", "proposal_sent", "negotiation", "closed_won",
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
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CRM mapping</p>
        <div>
          <Label className="text-xs">Lead source</Label>
          <Input value={settings.source} onChange={(e) => setS("source", e.target.value)} />
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branding</p>
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
        <div>
          <Label className="text-xs">Logo URL (optional)</Label>
          <Input value={theme.logo_url} onChange={(e) => setT("logo_url", e.target.value)} placeholder="https://…" />
        </div>
      </div>
    </div>
  );
}
