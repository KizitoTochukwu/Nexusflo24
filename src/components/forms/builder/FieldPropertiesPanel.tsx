import type { FormField } from "@/hooks/useForms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  field: FormField;
  onChange: (next: FormField) => void;
}

const HAS_OPTIONS = new Set(["select", "radio", "checkbox_group"]);
const HAS_PLACEHOLDER = new Set(["short_text", "long_text", "email", "phone", "number", "select"]);
const HAS_EDITOR_STYLING = new Set(["short_text", "long_text"]);
const HAS_HEADING_STYLING = new Set(["heading", "paragraph"]);

export default function FieldPropertiesPanel({ field, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const update = <K extends keyof FormField>(k: K, v: FormField[K]) =>
    onChange({ ...field, [k]: v });

  const updateOption = (i: number, key: "label" | "value", val: string) => {
    const opts = [...(field.options ?? [])];
    opts[i] = { ...opts[i], [key]: val };
    update("options", opts);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "png";
      const path = `${userRes.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("funnel-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("funnel-assets").getPublicUrl(path);
      update("image_url", pub.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isImage = field.type === "image" || field.type === "logo";
  const isDisplayOnly = ["heading", "paragraph", "divider", "image", "logo"].includes(field.type);

  return (
    <div className="space-y-4">
      {!isImage && (
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={field.label ?? ""} onChange={(e) => update("label", e.target.value)} />
        </div>
      )}

      {!isDisplayOnly && (
        <div>
          <Label className="text-xs">Field name (key)</Label>
          <Input
            value={field.name ?? ""}
            onChange={(e) => update("name", e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
          />
          <p className="mt-1 text-xs text-muted-foreground">Used as the data key.</p>
        </div>
      )}

      {HAS_PLACEHOLDER.has(field.type) && (
        <div>
          <Label className="text-xs">Placeholder</Label>
          <Input value={field.placeholder ?? ""} onChange={(e) => update("placeholder", e.target.value)} />
        </div>
      )}

      {!isDisplayOnly && field.type !== "hidden" && (
        <div>
          <Label className="text-xs">Help text</Label>
          <Textarea
            rows={2}
            value={field.help_text ?? ""}
            onChange={(e) => update("help_text", e.target.value)}
          />
        </div>
      )}

      {field.type === "hidden" && (
        <div>
          <Label className="text-xs">Default value</Label>
          <Input value={field.default_value ?? ""} onChange={(e) => update("default_value", e.target.value)} />
        </div>
      )}

      {isImage && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {field.type === "logo" ? "Logo" : "Image"}
          </p>
          <div>
            <Label className="text-xs">{field.type === "logo" ? "Logo URL" : "Image URL"}</Label>
            <Input
              value={field.image_url ?? ""}
              placeholder="https://…"
              onChange={(e) => update("image_url", e.target.value)}
            />
            <div className="mt-2">
              <input
                id={`img-upload-${field.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById(`img-upload-${field.id}`)?.click()}
              >
                {uploading ? "Uploading…" : field.type === "logo" ? "Upload logo" : "Upload image"}
              </Button>
            </div>
            {field.image_url && (
              <img
                src={field.image_url}
                alt={field.image_alt ?? ""}
                className="mt-2 max-h-32 rounded-md border object-contain"
              />
            )}
          </div>
          <div>
            <Label className="text-xs">Alt text</Label>
            <Input
              value={field.image_alt ?? ""}
              onChange={(e) => update("image_alt", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Alignment</Label>
              <Select
                value={field.image_align ?? "center"}
                onValueChange={(v) => update("image_align", v as "left" | "center" | "right")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Width ({field.image_width ?? 100}%)</Label>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={field.image_width ?? 100}
                onChange={(e) => update("image_width", Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {!isDisplayOnly && field.type !== "hidden" && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <Label className="text-sm">Required</Label>
            <p className="text-xs text-muted-foreground">User must complete this field.</p>
          </div>
          <Switch checked={!!field.required} onCheckedChange={(v) => update("required", v)} />
        </div>
      )}

      {!isDisplayOnly && (
        <div>
          <Label className="text-xs">Map to lead field</Label>
          <Select
            value={field.map_to ?? "meta"}
            onValueChange={(v) => update("map_to", v as FormField["map_to"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_name">Full name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
              <SelectItem value="meta">Custom (meta)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {HAS_OPTIONS.has(field.type) && (
        <div>
          <Label className="text-xs">Options</Label>
          <div className="space-y-2">
            {(field.options ?? []).map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={o.label}
                  onChange={(e) => updateOption(i, "label", e.target.value)}
                />
                <Input
                  placeholder="value"
                  value={o.value}
                  onChange={(e) => updateOption(i, "value", e.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive"
                  onClick={() => {
                    const opts = [...(field.options ?? [])];
                    opts.splice(i, 1);
                    update("options", opts);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update("options", [
                  ...(field.options ?? []),
                  { label: `Option ${(field.options?.length ?? 0) + 1}`, value: `option_${(field.options?.length ?? 0) + 1}` },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add option
            </Button>
          </div>
        </div>
      )}

      {HAS_EDITOR_STYLING.has(field.type) && (
        <>
          {/* ── Validation & behavior ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Validation & behavior
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min length</Label>
                <Input
                  type="number"
                  min={0}
                  value={field.min_length ?? ""}
                  onChange={(e) =>
                    update("min_length", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Max length</Label>
                <Input
                  type="number"
                  min={0}
                  value={field.max_length ?? ""}
                  onChange={(e) =>
                    update("max_length", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Default value</Label>
              <Input
                value={field.default_value ?? ""}
                onChange={(e) => update("default_value", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Validation pattern (regex)</Label>
              <Input
                value={field.pattern ?? ""}
                onChange={(e) => update("pattern", e.target.value)}
                placeholder="^[A-Za-z ]+$"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Pattern error message</Label>
              <Input
                value={field.pattern_message ?? ""}
                onChange={(e) => update("pattern_message", e.target.value)}
                placeholder="Please enter a valid value"
              />
            </div>

            <div>
              <Label className="text-xs">Autocomplete</Label>
              <Select
                value={field.autocomplete ?? "on"}
                onValueChange={(v) => update("autocomplete", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="given-name">First name</SelectItem>
                  <SelectItem value="family-name">Last name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="tel">Phone</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="street-address">Street address</SelectItem>
                  <SelectItem value="postal-code">Postal code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {field.type === "long_text" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Rows</Label>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={field.rows ?? 4}
                      onChange={(e) => update("rows", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Resize</Label>
                    <Select
                      value={field.resize ?? "vertical"}
                      onValueChange={(v) => update("resize", v as any)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background p-2">
                  <Label className="text-sm">Show character counter</Label>
                  <Switch
                    checked={!!field.show_counter}
                    onCheckedChange={(v) => update("show_counter", v)}
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Visual styling ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visual styling
            </p>

            <div>
              <Label className="text-xs">Text alignment</Label>
              <Select
                value={field.text_align ?? "left"}
                onValueChange={(v) => update("text_align", v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Font size (px)</Label>
                <Input
                  type="number"
                  min={10}
                  max={32}
                  value={field.font_size ?? ""}
                  onChange={(e) =>
                    update("font_size", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  placeholder="14"
                />
              </div>
              <div>
                <Label className="text-xs">Font weight</Label>
                <Select
                  value={field.font_weight ?? "normal"}
                  onValueChange={(v) => update("font_weight", v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="semibold">Semibold</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ColorInput
                label="Text"
                value={field.text_color ?? ""}
                onChange={(v) => update("text_color", v || undefined)}
              />
              <ColorInput
                label="Background"
                value={field.background_color ?? ""}
                onChange={(v) => update("background_color", v || undefined)}
              />
              <ColorInput
                label="Border"
                value={field.border_color ?? ""}
                onChange={(v) => update("border_color", v || undefined)}
              />
            </div>

            <div>
              <Label className="text-xs">Border radius (px)</Label>
              <Input
                type="number"
                min={0}
                max={32}
                value={field.border_radius ?? ""}
                onChange={(e) =>
                  update("border_radius", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder="6"
              />
            </div>

            <div className="border-t pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Label styling
              </p>
              <div className="grid grid-cols-3 gap-2">
                <ColorInput
                  label="Color"
                  value={field.label_color ?? ""}
                  onChange={(v) => update("label_color", v || undefined)}
                />
                <div>
                  <Label className="text-xs">Size (px)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={24}
                    value={field.label_size ?? ""}
                    onChange={(e) =>
                      update("label_size", e.target.value === "" ? undefined : Number(e.target.value))
                    }
                    placeholder="14"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight</Label>
                  <Select
                    value={field.label_weight ?? "medium"}
                    onValueChange={(v) => update("label_weight", v as any)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="semibold">Semibold</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {HAS_HEADING_STYLING.has(field.type) && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {field.type === "heading" ? "Heading styling" : "Paragraph styling"}
          </p>

          {field.type === "heading" && (
            <div>
              <Label className="text-xs">Heading level</Label>
              <Select
                value={field.heading_level ?? "h2"}
                onValueChange={(v) => update("heading_level", v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1 — Largest</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="h5">H5</SelectItem>
                  <SelectItem value="h6">H6 — Smallest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Text alignment</Label>
            <Select
              value={field.text_align ?? "left"}
              onValueChange={(v) => update("text_align", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Font size (px)</Label>
              <Input
                type="number"
                min={10}
                max={120}
                value={field.font_size ?? ""}
                onChange={(e) =>
                  update("font_size", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder={field.type === "heading" ? "32" : "14"}
              />
            </div>
            <div>
              <Label className="text-xs">Font weight</Label>
              <Select
                value={field.font_weight ?? (field.type === "heading" ? "bold" : "normal")}
                onValueChange={(v) => update("font_weight", v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semibold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Line height</Label>
              <Input
                type="number"
                step={0.1}
                min={0.8}
                max={3}
                value={field.line_height ?? ""}
                onChange={(e) =>
                  update("line_height", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder="1.2"
              />
            </div>
            <div>
              <Label className="text-xs">Letter spacing (px)</Label>
              <Input
                type="number"
                step={0.5}
                value={field.letter_spacing ?? ""}
                onChange={(e) =>
                  update("letter_spacing", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorInput
              label="Text color"
              value={field.text_color ?? ""}
              onChange={(v) => update("text_color", v || undefined)}
            />
            <ColorInput
              label="Background"
              value={field.background_color ?? ""}
              onChange={(v) => update("background_color", v || undefined)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Margin top (px)</Label>
              <Input
                type="number"
                value={field.margin_top ?? ""}
                onChange={(e) =>
                  update("margin_top", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Margin bottom (px)</Label>
              <Input
                type="number"
                value={field.margin_bottom ?? ""}
                onChange={(e) =>
                  update("margin_bottom", e.target.value === "" ? undefined : Number(e.target.value))
                }
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Padding / border radius (px)</Label>
            <Input
              type="number"
              min={0}
              max={64}
              value={field.border_radius ?? ""}
              onChange={(e) =>
                update("border_radius", e.target.value === "" ? undefined : Number(e.target.value))
              }
              placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* Compact label + native color input + hex input */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border bg-transparent p-0.5"
          aria-label={`${label} color`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#"
          className="h-9 flex-1 font-mono text-[11px] uppercase"
          maxLength={9}
        />
      </div>
    </div>
  );
}
