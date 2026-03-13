import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LinkInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

export default function LinkInsertDialog({ open, onOpenChange, onInsert }: LinkInsertDialogProps) {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");

  const handleInsert = () => {
    const linkText = text.trim() || url;
    onInsert(`<a href="${url}">${linkText}</a>`);
    setUrl("https://");
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-url" className="text-xs">URL</Label>
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-text" className="text-xs">Display Text (optional)</Label>
            <Input
              id="link-text"
              placeholder="Click here"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleInsert} disabled={!url || url === "https://"}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
