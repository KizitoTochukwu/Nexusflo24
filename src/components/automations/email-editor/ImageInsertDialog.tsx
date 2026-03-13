import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

export default function ImageInsertDialog({ open, onOpenChange, onInsert }: ImageInsertDialogProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [width, setWidth] = useState("600");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

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
      const { error } = await supabase.storage
        .from("email-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
      setUrl(data.publicUrl);
      setPreviewUrl(data.publicUrl);
      if (!alt) setAlt(file.name.replace(/\.[^.]+$/, ""));
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleInsert = () => {
    if (!url) {
      toast.error("Please provide an image URL or upload one.");
      return;
    }
    const w = parseInt(width) || 600;
    const imgTag = `<img src="${url}" alt="${alt || "image"}" width="${w}" style="max-width:100%;height:auto;display:block;border-radius:8px;" />`;
    const html = linkUrl
      ? `\n<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;">${imgTag}</a>\n`
      : `\n${imgTag}\n`;
    onInsert(html);
    onOpenChange(false);
    setUrl("");
    setAlt("");
    setWidth("600");
    setLinkUrl("");
    setPreviewUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 pt-2">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload an image</span>
                  <span className="text-xs text-muted-foreground">PNG, JPEG, WebP, GIF · Max 5MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </TabsContent>

          <TabsContent value="url" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreviewUrl(e.target.value);
                }}
                placeholder="https://example.com/image.png"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Link URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/landing-page"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Alt Text</Label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Image description" />
            </div>
            <div className="space-y-1.5">
              <Label>Width (px)</Label>
              <Input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="600" type="number" />
            </div>
          </div>

          {previewUrl && (
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div className="border border-border rounded-md p-2 bg-muted/30 flex justify-center">
                <img
                  src={previewUrl}
                  alt={alt || "preview"}
                  className="max-h-40 max-w-full object-contain rounded"
                  onError={() => setPreviewUrl("")}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInsert} disabled={!url}>Insert Image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
