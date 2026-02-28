import { Block, BlockType, BLOCK_LABELS } from "./blockTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

  const p = block.props;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {BLOCK_LABELS[block.type]?.label || block.type} Properties
      </h3>

      {/* Heading */}
      {block.type === "heading" && (
        <>
          <Field label="Text"><Input value={(p.text as string) || ""} onChange={(e) => update("text", e.target.value)} /></Field>
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
        </>
      )}

      {/* Text */}
      {block.type === "text" && (
        <>
          <Field label="Content"><Textarea value={(p.text as string) || ""} onChange={(e) => update("text", e.target.value)} rows={4} /></Field>
          <AlignField value={p.align as string} onChange={(v) => update("align", v)} />
          <ColorField label="Color" value={p.color as string} onChange={(v) => update("color", v)} />
        </>
      )}

      {/* Image */}
      {block.type === "image" && (
        <>
          <Field label="Image URL"><Input value={(p.src as string) || ""} onChange={(e) => update("src", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Alt Text"><Input value={(p.alt as string) || ""} onChange={(e) => update("alt", e.target.value)} /></Field>
          <Field label="Width"><Input value={(p.width as string) || "100%"} onChange={(e) => update("width", e.target.value)} /></Field>
          <Field label="Border Radius"><Input value={(p.borderRadius as string) || "8px"} onChange={(e) => update("borderRadius", e.target.value)} /></Field>
        </>
      )}

      {/* Button */}
      {block.type === "button" && (
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
        </>
      )}

      {/* Divider */}
      {block.type === "divider" && (
        <>
          <ColorField label="Color" value={p.color as string} onChange={(v) => update("color", v)} />
          <Field label="Thickness"><Input value={(p.thickness as string) || "1px"} onChange={(e) => update("thickness", e.target.value)} /></Field>
        </>
      )}

      {/* Spacer */}
      {block.type === "spacer" && (
        <Field label="Height"><Input value={(p.height as string) || "40px"} onChange={(e) => update("height", e.target.value)} /></Field>
      )}

      {/* Section */}
      {block.type === "section" && (
        <>
          <ColorField label="Background" value={p.backgroundColor as string} onChange={(v) => update("backgroundColor", v)} />
          <Field label="Padding"><Input value={(p.padding as string) || "40px 20px"} onChange={(e) => update("padding", e.target.value)} /></Field>
          <Field label="Max Width"><Input value={(p.maxWidth as string) || "960px"} onChange={(e) => update("maxWidth", e.target.value)} /></Field>
        </>
      )}

      {/* Form */}
      {block.type === "form" && (
        <>
          <div>
            <Label className="text-xs">Fields</Label>
            <div className="mt-1 space-y-1">
              {["firstName", "lastName", "email", "phone"].map((f) => {
                const fields = (p.fields as string[]) || ["email"];
                const checked = fields.includes(f);
                return (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={checked}
                      disabled={f === "email"}
                      onCheckedChange={(v) => {
                        const next = v ? [...fields, f] : fields.filter((x) => x !== f);
                        update("fields", next);
                      }}
                    />
                    {f}{f === "email" && " (required)"}
                  </label>
                );
              })}
            </div>
          </div>
          <Field label="Button Text"><Input value={(p.buttonText as string) || "Submit"} onChange={(e) => update("buttonText", e.target.value)} /></Field>
          <ColorField label="Button Color" value={p.buttonColor as string} onChange={(v) => update("buttonColor", v)} />
        </>
      )}

      {/* Testimonials */}
      {block.type === "testimonials" && (
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
      )}

      {/* Pricing */}
      {block.type === "pricing" && (
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
      )}

      {/* FAQ */}
      {block.type === "faq" && (
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
      )}

      {/* Embed */}
      {block.type === "embed" && (
        <>
          <Field label="Embed URL"><Input value={(p.src as string) || ""} onChange={(e) => update("src", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Height"><Input value={(p.height as string) || "400px"} onChange={(e) => update("height", e.target.value)} /></Field>
        </>
      )}

      {/* Columns */}
      {(block.type === "columns2" || block.type === "columns3") && (
        <Field label="Gap"><Input value={(p.gap as string) || "24px"} onChange={(e) => update("gap", e.target.value)} /></Field>
      )}
    </div>
  );
}

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
