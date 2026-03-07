import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ButtonInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

const COLOR_PRESETS = [
  { label: "Navy (Primary)", value: "#0B1F3B" },
  { label: "Gold (Accent)", value: "#D4AF37" },
  { label: "Green", value: "#16a34a" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
];

export default function ButtonInsertDialog({ open, onOpenChange, onInsert }: ButtonInsertDialogProps) {
  const [text, setText] = useState("Book Your Strategy Call");
  const [url, setUrl] = useState("https://");
  const [color, setColor] = useState("#0B1F3B");
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [rounded, setRounded] = useState<"sm" | "md" | "full">("md");

  const sizeMap = { sm: "10px 20px", md: "14px 32px", lg: "18px 44px" };
  const fontMap = { sm: "14px", md: "16px", lg: "18px" };
  const radiusMap = { sm: "4px", md: "8px", full: "50px" };

  const handleInsert = () => {
    const html = `\n<a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:${sizeMap[size]};font-size:${fontMap[size]};font-weight:600;text-decoration:none;border-radius:${radiusMap[rounded]};text-align:center;">${text}</a>\n`;
    onInsert(html);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert CTA Button</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Button Text</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.value }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={(v) => setSize(v as "sm" | "md" | "lg")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Corners</Label>
              <Select value={rounded} onValueChange={(v) => setRounded(v as "sm" | "md" | "full")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Slight</SelectItem>
                  <SelectItem value="md">Rounded</SelectItem>
                  <SelectItem value="full">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Preview */}
          <div className="space-y-1.5">
            <Label>Preview</Label>
            <div className="border border-border rounded-md p-4 flex justify-center bg-muted/30">
              <span
                style={{
                  display: "inline-block",
                  background: color,
                  color: "#ffffff",
                  padding: sizeMap[size],
                  fontSize: fontMap[size],
                  fontWeight: 600,
                  borderRadius: radiusMap[rounded],
                  textAlign: "center",
                }}
              >
                {text || "Button"}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInsert}>Insert Button</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
