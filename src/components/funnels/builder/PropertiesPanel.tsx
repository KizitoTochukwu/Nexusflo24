import { useState, useRef, useEffect } from "react";
import { Block, BlockType, BLOCK_LABELS, BLOCK_DEFAULTS } from "./blockTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FunnelTextEditor from "./FunnelTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, RotateCcw, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  block: Block | null;
  onChange: (id: string, props: Record<string, unknown>) => void;
}

export default function PropertiesPanel({ block, onChange }: Props) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Select a block to edit its properties
      </div>
    );
  }

  const update = (key: string, value: unknown) => {
    onChange(block.id, { ...block.props, [key]: value });
  };

  const resetStyles = () => {
    onChange(block.id, BLOCK_DEFAULTS[block.type]());
  };

  const p = block.props;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {BLOCK_LABELS[block.type]?.label || block.type} Properties
        </h3>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={resetStyles} title="Reset styles">
          <RotateCcw className="mr-1 h-3 w-3" />Reset
        </Button>
      </div>

      {block.type === "section" && <SectionProps p={p} update={update} />}
      {(block.type === "columns2" || block.type === "columns3") && <ColumnsProps p={p} update={update} type={block.type} />}
      {block.type === "heading" && <HeadingProps p={p} update={update} />}
      {block.type === "text" && <TextProps p={p} update={update} />}
      {block.type === "image" && <ImageProps p={p} update={update} />}
      {block.type === "button" && <ButtonProps p={p} update={update} />}
      {block.type === "divider" && <DividerProps p={p} update={update} />}
      {block.type === "spacer" && <SpacerProps p={p} update={update} />}
      {block.type === "form" && <FormProps p={p} update={update} />}
      {block.type === "testimonials" && <TestimonialsProps p={p} update={update} />}
      {block.type === "pricing" && <PricingProps p={p} update={update} />}
      {block.type === "faq" && <FaqProps p={p} update={update} />}
      {block.type === "embed" && <EmbedProps p={p} update={update} />}
      {block.type === "video" && <VideoProps p={p} update={update} />}
      {block.type === "booking" && <BookingProps p={p} update={update} />}
    </div>
  );
}

/* ─── Helpers ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
      </div>
    </Field>
  );
}

function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Align">
      <Select value={value || "left"} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ─── Section ─── */
function SectionProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  const bgType = (p.backgroundType as string) || "solid";
  return (
    <>
      <Field label="Background Type">
        <Select value={bgType} onValueChange={(v) => update("backgroundType", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {bgType === "solid" && <ColorField label="Background Color" value={p.backgroundColor as string} onChange={(v) => update("backgroundColor", v)} />}
      {bgType === "gradient" && (
        <>
          <ColorField label="Gradient From" value={p.gradientFrom as string} onChange={(v) => update("gradientFrom", v)} />
          <ColorField label="Gradient To" value={p.gradientTo as string} onChange={(v) => update("gradientTo", v)} />
        </>
      )}
      {bgType === "image" && (
        <>
          <Field label="Background Image URL"><Input value={(p.backgroundImage as string) || ""} onChange={(e) => update("backgroundImage", e.target.value)} placeholder="https://…" /></Field>
          <ImageUploadButton onUploaded={(url) => update("backgroundImage", url)} label="Upload Background" />
          <Field label="Position">
            <Select value={(p.backgroundPosition as string) || "center"} onValueChange={(v) => update("backgroundPosition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="top left">Top Left</SelectItem>
                <SelectItem value="top right">Top Right</SelectItem>
                <SelectItem value="bottom left">Bottom Left</SelectItem>
                <SelectItem value="bottom right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Size">
            <Select value={(p.backgroundSize as string) || "cover"} onValueChange={(v) => update("backgroundSize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="100% 100%">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Repeat">
            <Select value={(p.backgroundRepeat as string) || "no-repeat"} onValueChange={(v) => update("backgroundRepeat", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no-repeat">No Repeat</SelectItem>
                <SelectItem value="repeat">Repeat</SelectItem>
                <SelectItem value="repeat-x">Repeat X</SelectItem>
                <SelectItem value="repeat-y">Repeat Y</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ColorField label="Overlay Color" value={(p.overlayColor as string) || "#000000"} onChange={(v) => update("overlayColor", v)} />
          <Field label="Overlay Opacity (0-100)"><Input type="number" min={0} max={100} value={String(p.backgroundOverlay ?? 0)} onChange={(e) => update("backgroundOverlay", Number(e.target.value))} /></Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pad Top"><Input value={String(p.paddingTop ?? "40")} onChange={(e) => update("paddingTop", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Pad Right"><Input value={String(p.paddingRight ?? "20")} onChange={(e) => update("paddingRight", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Pad Bottom"><Input value={String(p.paddingBottom ?? "40")} onChange={(e) => update("paddingBottom", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Pad Left"><Input value={String(p.paddingLeft ?? "20")} onChange={(e) => update("paddingLeft", e.target.value)} className="h-8 text-xs" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Margin Top"><Input value={String(p.marginTop ?? "0")} onChange={(e) => update("marginTop", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Margin Bottom"><Input value={String(p.marginBottom ?? "0")} onChange={(e) => update("marginBottom", e.target.value)} className="h-8 text-xs" /></Field>
      </div>
      <Field label="Max Width">
        <Select value={(p.maxWidth as string) || "960px"} onValueChange={(v) => update("maxWidth", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="720px">720px</SelectItem>
            <SelectItem value="960px">960px</SelectItem>
            <SelectItem value="1100px">1100px</SelectItem>
            <SelectItem value="1280px">1280px</SelectItem>
            <SelectItem value="100%">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <AlignField value={(p.alignment as string) || "center"} onChange={(v) => update("alignment", v)} />
      <Field label="Border Radius"><Input value={String(p.borderRadius ?? "0")} onChange={(e) => update("borderRadius", e.target.value)} className="h-8 text-xs" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Border Width"><Input value={String(p.borderWidth ?? "0")} onChange={(e) => update("borderWidth", e.target.value)} className="h-8 text-xs" /></Field>
        <ColorField label="Border Color" value={(p.borderColor as string) || "#e5e7eb"} onChange={(v) => update("borderColor", v)} />
      </div>
      <SwitchField label="Shadow" checked={!!p.shadow} onChange={(v) => update("shadow", v)} />
      {!!p.shadow && (
        <Field label="Shadow Intensity">
          <Select value={(p.shadowIntensity as string) || "medium"} onValueChange={(v) => update("shadowIntensity", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="heavy">Heavy</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <div className="space-y-1 pt-1">
        <p className="text-[11px] font-medium text-muted-foreground">Visibility</p>
        <SwitchField label="Hide on Mobile" checked={!!p.hideOnMobile} onChange={(v) => update("hideOnMobile", v)} />
        <SwitchField label="Hide on Tablet" checked={!!p.hideOnTablet} onChange={(v) => update("hideOnTablet", v)} />
        <SwitchField label="Hide on Desktop" checked={!!p.hideOnDesktop} onChange={(v) => update("hideOnDesktop", v)} />
      </div>
    </>
  );
}

/* ─── Columns ─── */
function ColumnsProps({ p, update, type }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void; type: string }) {
  const presets = type === "columns2"
    ? ["50/50", "60/40", "40/60", "70/30", "30/70"]
    : ["33/33/33", "50/25/25", "25/50/25", "25/25/50"];
  const [useCustom, setUseCustom] = useState(!presets.includes((p.columnWidths as string) || presets[0]));
  
  return (
    <>
      <Field label="Gap"><Input value={(p.gap as string) || "24px"} onChange={(e) => update("gap", e.target.value)} /></Field>
      <SwitchField label="Custom Widths" checked={useCustom} onChange={(v) => {
        setUseCustom(v);
        if (!v) update("columnWidths", presets[0]);
      }} />
      {!useCustom ? (
        <Field label="Column Widths">
          <Select value={(p.columnWidths as string) || presets[0]} onValueChange={(v) => update("columnWidths", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {presets.map((pr) => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field label="Custom Widths (e.g. 40/60)">
          <Input value={(p.columnWidths as string) || presets[0]} onChange={(e) => update("columnWidths", e.target.value)} placeholder="40/60" className="h-8 text-xs" />
        </Field>
      )}
      <Field label="Vertical Align">
        <Select value={(p.verticalAlign as string) || "top"} onValueChange={(v) => update("verticalAlign", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Middle</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <SwitchField label="Stack on Mobile" checked={p.stackOnMobile !== false} onChange={(v) => update("stackOnMobile", v)} />
    </>
  );
}

/* ─── Heading ─── */
function HeadingProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <Label className="text-xs">Text</Label>
        <div className="mt-1">
          <FunnelTextEditor
            value={(p.text as string) || ""}
            onChange={(v) => update("text", v)}
            placeholder="Enter heading text…"
            minHeight="80px"
          />
        </div>
      </div>
      <Field label="Level">
        <Select value={(p.level as string) || "h2"} onValueChange={(v) => update("level", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="h1">H1</SelectItem>
            <SelectItem value="h2">H2</SelectItem>
            <SelectItem value="h3">H3</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <AlignField value={p.align as string} onChange={(v) => update("align", v)} />
      <ColorField label="Color" value={p.color as string} onChange={(v) => update("color", v)} />
      <Field label="Font Size"><Input value={(p.fontSize as string) || ""} onChange={(e) => update("fontSize", e.target.value)} placeholder="e.g. 36px" /></Field>
      <Field label="Font Weight">
        <Select value={(p.fontWeight as string) || "bold"} onValueChange={(v) => update("fontWeight", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="semibold">Semibold</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="extrabold">Extra Bold</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Line Height"><Input value={(p.lineHeight as string) || ""} onChange={(e) => update("lineHeight", e.target.value)} placeholder="e.g. 1.2" /></Field>
      <Field label="Max Width"><Input value={(p.maxWidth as string) || ""} onChange={(e) => update("maxWidth", e.target.value)} placeholder="e.g. 600px" /></Field>
    </>
  );
}

/* ─── Text ─── */
function TextProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <Label className="text-xs">Content</Label>
        <div className="mt-1">
          <FunnelTextEditor
            value={(p.text as string) || ""}
            onChange={(v) => update("text", v)}
            placeholder="Enter text content with {{variables}}…"
            minHeight="200px"
          />
        </div>
      </div>
      <AlignField value={p.align as string} onChange={(v) => update("align", v)} />
      <ColorField label="Color" value={p.color as string} onChange={(v) => update("color", v)} />
      <Field label="Font Size"><Input value={(p.fontSize as string) || ""} onChange={(e) => update("fontSize", e.target.value)} placeholder="e.g. 16px" /></Field>
      <Field label="Font Weight">
        <Select value={(p.fontWeight as string) || "normal"} onValueChange={(v) => update("fontWeight", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="semibold">Semibold</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="extrabold">Extra Bold</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Line Height"><Input value={(p.lineHeight as string) || ""} onChange={(e) => update("lineHeight", e.target.value)} placeholder="e.g. 1.6" /></Field>
      <Field label="Max Width"><Input value={(p.maxWidth as string) || ""} onChange={(e) => update("maxWidth", e.target.value)} placeholder="e.g. 600px" /></Field>
    </>
  );
}

/* ─── Image ─── */
function ImageProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Image URL"><Input value={(p.src as string) || ""} onChange={(e) => update("src", e.target.value)} placeholder="https://…" /></Field>
      <ImageUploadButton onUploaded={(url) => update("src", url)} label="Upload Image" />
      <Field label="Alt Text"><Input value={(p.alt as string) || ""} onChange={(e) => update("alt", e.target.value)} /></Field>
      <Field label="Width"><Input value={(p.width as string) || "100%"} onChange={(e) => update("width", e.target.value)} /></Field>
      <Field label="Border Radius"><Input value={(p.borderRadius as string) || "8px"} onChange={(e) => update("borderRadius", e.target.value)} /></Field>
      <Field label="Object Fit">
        <Select value={(p.objectFit as string) || "cover"} onValueChange={(v) => update("objectFit", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <AlignField value={(p.alignment as string) || "center"} onChange={(v) => update("alignment", v)} />
      <SwitchField label="Shadow" checked={!!p.shadow} onChange={(v) => update("shadow", v)} />
      <Field label="Link URL"><Input value={(p.linkUrl as string) || ""} onChange={(e) => update("linkUrl", e.target.value)} placeholder="Optional link wrap" /></Field>
    </>
  );
}

/* ─── Image Upload Button ─── */
function ImageUploadButton({ onUploaded, label }: { onUploaded: (url: string) => void; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, GIF, and WEBP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in to upload"); return; }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("funnel-assets").upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("funnel-assets").getPublicUrl(path);
      onUploaded(publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} />
      <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
        {uploading ? "Uploading…" : label}
      </Button>
    </div>
  );
}

/* ─── Button ─── */
function ButtonProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Text"><Input value={(p.text as string) || ""} onChange={(e) => update("text", e.target.value)} /></Field>
      <Field label="Link"><Input value={(p.link as string) || "#"} onChange={(e) => update("link", e.target.value)} /></Field>
      <ColorField label="Background" value={p.backgroundColor as string} onChange={(v) => update("backgroundColor", v)} />
      <ColorField label="Text Color" value={p.textColor as string} onChange={(v) => update("textColor", v)} />
      <AlignField value={p.align as string} onChange={(v) => update("align", v)} />
      <Field label="Size">
        <Select value={(p.size as string) || "lg"} onValueChange={(v) => update("size", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Border Radius"><Input value={(p.borderRadius as string) || "8px"} onChange={(e) => update("borderRadius", e.target.value)} /></Field>
      <SwitchField label="Open in New Tab" checked={!!p.openNewTab} onChange={(v) => update("openNewTab", v)} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Padding X"><Input value={String(p.paddingX ?? "32")} onChange={(e) => update("paddingX", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Padding Y"><Input value={String(p.paddingY ?? "12")} onChange={(e) => update("paddingY", e.target.value)} className="h-8 text-xs" /></Field>
      </div>
    </>
  );
}

/* ─── Divider ─── */
function DividerProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <ColorField label="Color" value={p.color as string} onChange={(v) => update("color", v)} />
      <Field label="Thickness"><Input value={(p.thickness as string) || "1px"} onChange={(e) => update("thickness", e.target.value)} /></Field>
      <Field label="Style">
        <Select value={(p.style as string) || "solid"} onValueChange={(v) => update("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Width"><Input value={(p.width as string) || "100%"} onChange={(e) => update("width", e.target.value)} /></Field>
    </>
  );
}

/* ─── Spacer ─── */
function SpacerProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return <Field label="Height"><Input value={(p.height as string) || "40px"} onChange={(e) => update("height", e.target.value)} /></Field>;
}

/* ─── Form ─── */
function FormProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <Label className="text-xs">Fields</Label>
        <div className="mt-1 space-y-1">
          {["firstName", "lastName", "email", "phone"].map((f) => {
            const fields = (p.fields as string[]) || ["email"];
            const checked = fields.includes(f);
            return (
              <label key={f} className="flex items-center gap-2 text-sm">
                <Switch checked={checked} disabled={f === "email"} onCheckedChange={(v) => {
                  const next = v ? [...fields, f] : fields.filter((x) => x !== f);
                  update("fields", next);
                }} />
                {f}{f === "email" && " (required)"}
              </label>
            );
          })}
        </div>
      </div>
      <Field label="Button Text"><Input value={(p.buttonText as string) || "Submit"} onChange={(e) => update("buttonText", e.target.value)} /></Field>
      <ColorField label="Button Color" value={p.buttonColor as string} onChange={(v) => update("buttonColor", v)} />
    </>
  );
}

/* ─── Testimonials ─── */
function TestimonialsProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <ListEditor
      items={(p.items as any[]) || []}
      renderItem={(item, i, updateItem, removeItem) => (
        <div key={i} className="space-y-1 rounded border p-2">
          <Input value={item.name} onChange={(e) => updateItem(i, { ...item, name: e.target.value })} placeholder="Name" className="h-8 text-xs" />
          <Input value={item.role} onChange={(e) => updateItem(i, { ...item, role: e.target.value })} placeholder="Role" className="h-8 text-xs" />
          <Textarea value={item.text} onChange={(e) => updateItem(i, { ...item, text: e.target.value })} placeholder="Quote" rows={2} className="text-xs" />
          <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-6 text-xs text-destructive"><Trash2 className="mr-1 h-3 w-3" />Remove</Button>
        </div>
      )}
      onAdd={() => update("items", [...(p.items as any[] || []), { name: "Name", text: "Quote", role: "Role" }])}
      onUpdate={(items) => update("items", items)}
      label="Testimonials"
    />
  );
}

/* ─── Pricing ─── */
function PricingProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Title"><Input value={(p.title as string) || ""} onChange={(e) => update("title", e.target.value)} /></Field>
      <Field label="Price"><Input value={(p.price as string) || ""} onChange={(e) => update("price", e.target.value)} /></Field>
      <Field label="Button Text"><Input value={(p.buttonText as string) || ""} onChange={(e) => update("buttonText", e.target.value)} /></Field>
      <ColorField label="Button Color" value={p.buttonColor as string} onChange={(v) => update("buttonColor", v)} />
      <div>
        <Label className="text-xs">Features</Label>
        {((p.features as string[]) || []).map((f, i) => (
          <div key={i} className="mt-1 flex gap-1">
            <Input value={f} className="h-8 text-xs" onChange={(e) => {
              const next = [...(p.features as string[])];
              next[i] = e.target.value;
              update("features", next);
            }} />
            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => update("features", (p.features as string[]).filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => update("features", [...(p.features as string[] || []), "New feature"])}>
          <Plus className="mr-1 h-3 w-3" />Add Feature
        </Button>
      </div>
    </>
  );
}

/* ─── FAQ ─── */
function FaqProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <ListEditor
      items={(p.items as any[]) || []}
      renderItem={(item, i, updateItem, removeItem) => (
        <div key={i} className="space-y-1 rounded border p-2">
          <Input value={item.q} onChange={(e) => updateItem(i, { ...item, q: e.target.value })} placeholder="Question" className="h-8 text-xs" />
          <Textarea value={item.a} onChange={(e) => updateItem(i, { ...item, a: e.target.value })} placeholder="Answer" rows={2} className="text-xs" />
          <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-6 text-xs text-destructive"><Trash2 className="mr-1 h-3 w-3" />Remove</Button>
        </div>
      )}
      onAdd={() => update("items", [...(p.items as any[] || []), { q: "Question?", a: "Answer." }])}
      onUpdate={(items) => update("items", items)}
      label="Items"
    />
  );
}

/* ─── Embed ─── */
function EmbedProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Embed URL"><Input value={(p.src as string) || ""} onChange={(e) => update("src", e.target.value)} placeholder="https://…" /></Field>
      <Field label="Height"><Input value={(p.height as string) || "400px"} onChange={(e) => update("height", e.target.value)} /></Field>
      <SwitchField label="Use Aspect Ratio" checked={!!p.useAspectRatio} onChange={(v) => update("useAspectRatio", v)} />
      {!!p.useAspectRatio && (
        <Field label="Aspect Ratio">
          <Select value={(p.aspectRatio as string) || "16:9"} onValueChange={(v) => update("aspectRatio", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="21:9">21:9</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field label="Max Width"><Input value={(p.maxWidth as string) || ""} onChange={(e) => update("maxWidth", e.target.value)} placeholder="e.g. 800px" /></Field>
      <AlignField value={(p.alignment as string) || "center"} onChange={(v) => update("alignment", v)} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Margin Top"><Input value={String(p.marginTop ?? "0")} onChange={(e) => update("marginTop", e.target.value)} className="h-8 text-xs" /></Field>
        <Field label="Margin Bottom"><Input value={String(p.marginBottom ?? "0")} onChange={(e) => update("marginBottom", e.target.value)} className="h-8 text-xs" /></Field>
      </div>
    </>
  );
}

/* ─── Video ─── */
function VideoProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Video URL"><Input value={(p.src as string) || ""} onChange={(e) => update("src", e.target.value)} placeholder="YouTube, Vimeo, or .mp4 URL" /></Field>
      <Field label="Aspect Ratio">
        <Select value={(p.aspectRatio as string) || "16:9"} onValueChange={(v) => update("aspectRatio", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="21:9">21:9</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="space-y-1">
        <SwitchField label="Autoplay" checked={!!p.autoplay} onChange={(v) => update("autoplay", v)} />
        <SwitchField label="Mute" checked={!!p.mute} onChange={(v) => update("mute", v)} />
        <SwitchField label="Loop" checked={!!p.loop} onChange={(v) => update("loop", v)} />
        <SwitchField label="Show Controls" checked={p.controls !== false} onChange={(v) => update("controls", v)} />
      </div>
    </>
  );
}

/* ─── List Editor (generic) ─── */
function ListEditor({ items, renderItem, onAdd, onUpdate, label }: {
  items: any[];
  renderItem: (item: any, i: number, updateItem: (i: number, item: any) => void, removeItem: (i: number) => void) => React.ReactNode;
  onAdd: () => void;
  onUpdate: (items: any[]) => void;
  label: string;
}) {
  const updateItem = (i: number, item: any) => { const next = [...items]; next[i] = item; onUpdate(next); };
  const removeItem = (i: number) => onUpdate(items.filter((_, j) => j !== i));

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 space-y-2">
        {items.map((item, i) => renderItem(item, i, updateItem, removeItem))}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" />Add {label.slice(0, -1)}
        </Button>
      </div>
    </div>
  );
}

/* ─── Booking ─── */
function BookingProps({ p, update }: { p: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  const [bookingPages, setBookingPages] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("booking_pages" as any)
        .select("id, name, slug")
        .order("created_at", { ascending: false });
      setBookingPages((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Field label="Booking Page">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
        ) : bookingPages.length === 0 ? (
          <p className="text-xs text-muted-foreground">No booking pages found. Create one in Bookings first.</p>
        ) : (
          <Select value={(p.booking_page_id as string) || ""} onValueChange={(v) => update("booking_page_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select a booking page" /></SelectTrigger>
            <SelectContent>
              {bookingPages.map((bp) => (
                <SelectItem key={bp.id} value={bp.id}>{bp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <Field label="Button Text">
        <Input value={(p.buttonText as string) || "Book a Call"} onChange={(e) => update("buttonText", e.target.value)} className="h-8 text-xs" />
      </Field>
      <ColorField label="Button Color" value={(p.buttonColor as string) || "#D4AF37"} onChange={(v) => update("buttonColor", v)} />
      <Field label="Button Alignment">
        <Select value={(p.align as string) || "center"} onValueChange={(v) => update("align", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Button Size">
        <Select value={(p.size as string) || "lg"} onValueChange={(v) => update("size", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Border Radius">
        <Input value={(p.borderRadius as string) || "8px"} onChange={(e) => update("borderRadius", e.target.value)} placeholder="e.g. 8px" className="h-8 text-xs" />
      </Field>
      <SwitchField label="Open in New Tab" checked={p.openNewTab !== false} onChange={(v) => update("openNewTab", v)} />
    </>
  );
}
