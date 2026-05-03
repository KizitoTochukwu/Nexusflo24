import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  EmailBlock, TextBlockProps, ImageBlockProps, ButtonBlockProps,
  DividerBlockProps, SpacerBlockProps, SocialBlockProps, ColumnsBlockProps,
  BLOCK_META, GradientProps,
} from "./emailBlockTypes";
import InsertDropdown from "../InsertDropdown";

interface EmailBlockPropertiesProps {
  block: EmailBlock | null;
  onChange: (id: string, props: EmailBlock["props"]) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-2 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 border-b border-border/60 pb-1">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AlignmentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="left">Left</SelectItem>
        <SelectItem value="center">Center</SelectItem>
        <SelectItem value="right">Right</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ColorOpacityField({
  label, color, opacity, onColorChange, onOpacityChange,
}: {
  label: string;
  color: string;
  opacity: number;
  onColorChange: (v: string) => void;
  onOpacityChange: (v: number) => void;
}) {
  const pct = Math.round(opacity * 100);
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="h-7 w-7 rounded border cursor-pointer p-0" />
          <Input value={color} onChange={(e) => onColorChange(e.target.value)} className="h-8 text-xs flex-1" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Opacity</Label>
          <Slider value={[pct]} min={0} max={100} step={1} onValueChange={([v]) => onOpacityChange(v / 100)} className="flex-1" />
          <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
        </div>
      </div>
    </Field>
  );
}

const DEFAULT_GRADIENT: GradientProps = {
  enabled: false,
  from: "#0B1F3B",
  fromOpacity: 1,
  to: "#C9A227",
  toOpacity: 1,
  angle: 135,
};

function GradientField({
  value, onChange,
}: {
  value: GradientProps | undefined;
  onChange: (g: GradientProps) => void;
}) {
  const g = value ?? DEFAULT_GRADIENT;
  const update = (patch: Partial<GradientProps>) => onChange({ ...g, ...patch });
  const previewFrom = `rgba(${parseInt(g.from.slice(1, 3), 16)},${parseInt(g.from.slice(3, 5), 16)},${parseInt(g.from.slice(5, 7), 16)},${g.fromOpacity})`;
  const previewTo = `rgba(${parseInt(g.to.slice(1, 3), 16)},${parseInt(g.to.slice(3, 5), 16)},${parseInt(g.to.slice(5, 7), 16)},${g.toOpacity})`;
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Background Gradient</Label>
        <Switch checked={g.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>
      {g.enabled && (
        <>
          <div
            className="h-6 w-full rounded border border-border"
            style={{ backgroundImage: `linear-gradient(${g.angle}deg, ${previewFrom}, ${previewTo})` }}
          />
          <ColorOpacityField
            label="From"
            color={g.from}
            opacity={g.fromOpacity}
            onColorChange={(v) => update({ from: v })}
            onOpacityChange={(v) => update({ fromOpacity: v })}
          />
          <ColorOpacityField
            label="To"
            color={g.to}
            opacity={g.toOpacity}
            onColorChange={(v) => update({ to: v })}
            onOpacityChange={(v) => update({ toOpacity: v })}
          />
          <Field label={`Angle (${g.angle}°)`}>
            <Slider value={[g.angle]} min={0} max={360} step={5} onValueChange={([v]) => update({ angle: v })} />
          </Field>
        </>
      )}
    </div>
  );
}

function TextProps({ block, onChange }: { block: EmailBlock; onChange: (p: TextBlockProps) => void }) {
  const p = block.props as TextBlockProps;
  return (
    <>
      <Section title="Content">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Text</Label>
          <InsertDropdown onInsert={(v) => onChange({ ...p, content: p.content + v })} />
        </div>
        <Textarea
          className="min-h-[120px] text-sm font-mono"
          value={p.content}
          onChange={(e) => onChange({ ...p, content: e.target.value })}
          placeholder="Use {{first_name}} for variables..."
        />
      </Section>
      <Section title="Typography">
        <Field label="Font Size">
          <div className="flex items-center gap-2">
            <Slider value={[p.fontSize]} min={10} max={36} step={1} onValueChange={([v]) => onChange({ ...p, fontSize: v })} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{p.fontSize}px</span>
          </div>
        </Field>
        <Field label="Font Weight">
          <Select value={p.fontWeight} onValueChange={(v) => onChange({ ...p, fontWeight: v as "normal" | "bold" })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alignment">
          <Select value={p.alignment} onValueChange={(v) => onChange({ ...p, alignment: v as TextBlockProps["alignment"] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="justify">Justify</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>
      <Section title="Color">
        <ColorOpacityField
          label="Text Color"
          color={p.color}
          opacity={p.colorOpacity ?? 1}
          onColorChange={(v) => onChange({ ...p, color: v })}
          onOpacityChange={(v) => onChange({ ...p, colorOpacity: v })}
        />
        <GradientField
          value={p.bgGradient}
          onChange={(g) => onChange({ ...p, bgGradient: g })}
        />
      </Section>
      <Section title="Spacing">
        <Field label="Line Height">
          <div className="flex items-center gap-2">
            <Slider value={[p.lineHeight * 10]} min={10} max={25} step={1} onValueChange={([v]) => onChange({ ...p, lineHeight: v / 10 })} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{p.lineHeight}</span>
          </div>
        </Field>
      </Section>
    </>
  );
}

function ImageProps({ block, onChange }: { block: EmailBlock; onChange: (p: ImageBlockProps) => void }) {
  const p = block.props as ImageBlockProps;
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `images/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("email-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
      onChange({ ...p, src: data.publicUrl, alt: p.alt || file.name.replace(/\.[^.]+$/, "") });
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Field label="Image URL">
        <div className="flex gap-1.5">
          <Input className="h-8 text-xs flex-1" value={p.src} onChange={(e) => onChange({ ...p, src: e.target.value })} placeholder="https://..." />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={uploading}
            onClick={() => document.getElementById(`img-upload-${block.id}`)?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </Button>
          <input
            id={`img-upload-${block.id}`}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </div>
      </Field>
      <Field label="Alt Text">
        <Input className="h-8 text-xs" value={p.alt} onChange={(e) => onChange({ ...p, alt: e.target.value })} />
      </Field>
      <Field label="Width (%)">
        <div className="flex items-center gap-2">
          <Slider value={[p.width]} min={10} max={100} step={5} onValueChange={([v]) => onChange({ ...p, width: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.width}%</span>
        </div>
      </Field>
      <Field label="Border Radius">
        <div className="flex items-center gap-2">
          <Slider value={[p.borderRadius]} min={0} max={24} step={2} onValueChange={([v]) => onChange({ ...p, borderRadius: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.borderRadius}px</span>
        </div>
      </Field>
      <Field label="Link URL (optional)">
        <Input className="h-8 text-xs" value={p.linkUrl} onChange={(e) => onChange({ ...p, linkUrl: e.target.value })} placeholder="https://..." />
      </Field>
      <Field label="Alignment">
        <AlignmentSelect value={p.alignment} onChange={(v) => onChange({ ...p, alignment: v as ImageBlockProps["alignment"] })} />
      </Field>
    </>
  );
}

function ButtonProps({ block, onChange }: { block: EmailBlock; onChange: (p: ButtonBlockProps) => void }) {
  const p = block.props as ButtonBlockProps;
  return (
    <>
      <Section title="Content">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Button Label</Label>
          <InsertDropdown onInsert={(v) => onChange({ ...p, label: p.label + v })} />
        </div>
        <Input className="h-8 text-xs" value={p.label} onChange={(e) => onChange({ ...p, label: e.target.value })} />
        <Field label="Button URL">
          <Input className="h-8 text-xs" value={p.url} onChange={(e) => onChange({ ...p, url: e.target.value })} placeholder="https://..." />
        </Field>
      </Section>
      <Section title="Typography">
        <Field label="Font Size">
          <div className="flex items-center gap-2">
            <Slider value={[p.fontSize]} min={12} max={24} step={1} onValueChange={([v]) => onChange({ ...p, fontSize: v })} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{p.fontSize}px</span>
          </div>
        </Field>
        <Field label="Alignment">
          <AlignmentSelect value={p.alignment} onChange={(v) => onChange({ ...p, alignment: v as ButtonBlockProps["alignment"] })} />
        </Field>
      </Section>
      <Section title="Color">
        <ColorOpacityField
          label="Background Color"
          color={p.bgColor}
          opacity={p.bgOpacity ?? 1}
          onColorChange={(v) => onChange({ ...p, bgColor: v })}
          onOpacityChange={(v) => onChange({ ...p, bgOpacity: v })}
        />
        <ColorOpacityField
          label="Text Color"
          color={p.textColor}
          opacity={p.textOpacity ?? 1}
          onColorChange={(v) => onChange({ ...p, textColor: v })}
          onOpacityChange={(v) => onChange({ ...p, textOpacity: v })}
        />
      </Section>
      <Section title="Spacing & Shape">
        <Field label="Border Radius">
          <div className="flex items-center gap-2">
            <Slider value={[p.borderRadius]} min={0} max={24} step={2} onValueChange={([v]) => onChange({ ...p, borderRadius: v })} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{p.borderRadius}px</span>
          </div>
        </Field>
        <Field label="Full Width">
          <Switch checked={p.fullWidth} onCheckedChange={(v) => onChange({ ...p, fullWidth: v })} />
        </Field>
      </Section>
    </>
  );
}

function DividerProps({ block, onChange }: { block: EmailBlock; onChange: (p: DividerBlockProps) => void }) {
  const p = block.props as DividerBlockProps;
  return (
    <>
      <Field label="Color">
        <div className="flex items-center gap-2">
          <input type="color" value={p.color} onChange={(e) => onChange({ ...p, color: e.target.value })} className="h-7 w-7 rounded border cursor-pointer p-0" />
          <Input value={p.color} onChange={(e) => onChange({ ...p, color: e.target.value })} className="h-8 text-xs flex-1" />
        </div>
      </Field>
      <Field label="Thickness">
        <div className="flex items-center gap-2">
          <Slider value={[p.thickness]} min={1} max={6} step={1} onValueChange={([v]) => onChange({ ...p, thickness: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.thickness}px</span>
        </div>
      </Field>
      <Field label="Style">
        <Select value={p.style} onValueChange={(v) => onChange({ ...p, style: v as DividerBlockProps["style"] })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Margin">
        <div className="flex items-center gap-2">
          <Slider value={[p.margin]} min={4} max={48} step={4} onValueChange={([v]) => onChange({ ...p, margin: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.margin}px</span>
        </div>
      </Field>
    </>
  );
}

function SpacerProps({ block, onChange }: { block: EmailBlock; onChange: (p: SpacerBlockProps) => void }) {
  const p = block.props as SpacerBlockProps;
  return (
    <Field label="Height">
      <div className="flex items-center gap-2">
        <Slider value={[p.height]} min={8} max={120} step={4} onValueChange={([v]) => onChange({ ...p, height: v })} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{p.height}px</span>
      </div>
    </Field>
  );
}

function SocialProps({ block, onChange }: { block: EmailBlock; onChange: (p: SocialBlockProps) => void }) {
  const p = block.props as SocialBlockProps;
  const platforms = ["facebook", "twitter", "linkedin", "instagram"] as const;
  return (
    <>
      {platforms.map((platform) => (
        <Field key={platform} label={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}>
          <Input
            className="h-8 text-xs"
            value={p.links[platform]}
            onChange={(e) => onChange({ ...p, links: { ...p.links, [platform]: e.target.value } })}
            placeholder={`https://${platform}.com/...`}
          />
        </Field>
      ))}
      <Field label="Icon Size">
        <div className="flex items-center gap-2">
          <Slider value={[p.iconSize]} min={20} max={48} step={4} onValueChange={([v]) => onChange({ ...p, iconSize: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.iconSize}px</span>
        </div>
      </Field>
      <Field label="Alignment">
        <AlignmentSelect value={p.alignment} onChange={(v) => onChange({ ...p, alignment: v as SocialBlockProps["alignment"] })} />
      </Field>
    </>
  );
}

function ColumnsProps({ block, onChange }: { block: EmailBlock; onChange: (p: ColumnsBlockProps) => void }) {
  const p = block.props as ColumnsBlockProps;
  return (
    <>
      <Field label="Columns">
        <Select
          value={String(p.columnCount)}
          onValueChange={(v) => {
            const count = Number(v) as 2 | 3;
            const cols = [...p.columns];
            while (cols.length < count) cols.push(`Column ${cols.length + 1} text`);
            onChange({ ...p, columnCount: count, columns: cols.slice(0, count) });
          }}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Columns</SelectItem>
            <SelectItem value="3">3 Columns</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Gap">
        <div className="flex items-center gap-2">
          <Slider value={[p.gap]} min={0} max={32} step={4} onValueChange={([v]) => onChange({ ...p, gap: v })} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{p.gap}px</span>
        </div>
      </Field>
      {p.columns.map((col, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{`Column ${i + 1}`}</Label>
            <InsertDropdown onInsert={(v) => {
              const cols = [...p.columns];
              cols[i] = cols[i] + v;
              onChange({ ...p, columns: cols });
            }} />
          </div>
          <Textarea
            className="min-h-[60px] text-xs"
            value={col}
            onChange={(e) => {
              const cols = [...p.columns];
              cols[i] = e.target.value;
              onChange({ ...p, columns: cols });
            }}
          />
        </div>
      ))}
    </>
  );
}

export default function EmailBlockProperties({ block, onChange }: EmailBlockPropertiesProps) {
  if (!block) {
    return (
      <div className="hidden md:flex w-[180px] lg:w-[220px] shrink-0 border-l border-border bg-muted/30 p-4 items-center justify-center">
        <p className="text-xs text-muted-foreground text-center">
          Select a block to edit its properties
        </p>
      </div>
    );
  }

  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;

  const handleChange = (props: EmailBlock["props"]) => {
    onChange(block.id, props);
  };

  return (
    <div className="hidden md:block w-[180px] lg:w-[220px] shrink-0 border-l border-border bg-muted/30 overflow-y-auto">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">{meta.label} Properties</span>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {block.type === "text" && <TextProps block={block} onChange={handleChange as (p: TextBlockProps) => void} />}
        {block.type === "image" && <ImageProps block={block} onChange={handleChange as (p: ImageBlockProps) => void} />}
        {block.type === "button" && <ButtonProps block={block} onChange={handleChange as (p: ButtonBlockProps) => void} />}
        {block.type === "divider" && <DividerProps block={block} onChange={handleChange as (p: DividerBlockProps) => void} />}
        {block.type === "spacer" && <SpacerProps block={block} onChange={handleChange as (p: SpacerBlockProps) => void} />}
        {block.type === "social" && <SocialProps block={block} onChange={handleChange as (p: SocialBlockProps) => void} />}
        {block.type === "columns" && <ColumnsProps block={block} onChange={handleChange as (p: ColumnsBlockProps) => void} />}
      </div>
    </div>
  );
}
