import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";

export type TriggerConfig = {
  funnel_id?: string;
  source?: string;
  funnel_name?: string;
  tags?: string[];
};

interface Props {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  funnels: { id: string; name: string }[];
}

const SOURCE_OPTIONS = [
  "Organic",
  "Paid Ads",
  "Referral",
  "Social Media",
  "Email",
  "WhatsApp",
  "Landing Page",
  "Webinar",
  "Other",
];

export default function TriggerConfigFilters({ config, onChange, funnels }: Props) {
  const [tagInput, setTagInput] = useState("");

  const update = (partial: Partial<TriggerConfig>) => {
    onChange({ ...config, ...partial });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    const existing = config.tags ?? [];
    if (!existing.includes(tag)) {
      update({ tags: [...existing, tag] });
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    update({ tags: (config.tags ?? []).filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trigger Filters (optional)</p>

      {/* Funnel scope */}
      <div>
        <label className="text-sm font-medium text-foreground">Funnel</label>
        <Select value={config.funnel_id ?? "all"} onValueChange={(v) => update({ funnel_id: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue placeholder="All funnels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All funnels (global)</SelectItem>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source filter */}
      <div>
        <label className="text-sm font-medium text-foreground">Lead Source</label>
        <Select value={config.source ?? "any"} onValueChange={(v) => update({ source: v === "any" ? undefined : v })}>
          <SelectTrigger><SelectValue placeholder="Any source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any source</SelectItem>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Funnel name (text match) */}
      <div>
        <label className="text-sm font-medium text-foreground">Funnel Name (contains)</label>
        <Input
          placeholder="e.g. Black Friday"
          value={config.funnel_name ?? ""}
          onChange={(e) => update({ funnel_name: e.target.value || undefined })}
        />
        <p className="text-xs text-muted-foreground mt-0.5">Matches if the lead's funnel name contains this text</p>
      </div>

      {/* Tags filter */}
      <div>
        <label className="text-sm font-medium text-foreground">Lead must have tags</label>
        <div className="flex gap-2">
          <Input
            placeholder="Add tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            className="flex-1"
          />
        </div>
        {(config.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(config.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">Only triggers if the lead has ALL of these tags</p>
      </div>
    </div>
  );
}
