import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { FormRecord } from "@/hooks/useForms";

interface Props {
  form: FormRecord;
  trigger: React.ReactNode;
}

export default function EmbedFormDialog({ form, trigger }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostedUrl = `${origin}/forms/${form.slug}`;
  const iframeSnippet = `<iframe src="${hostedUrl}" style="width:100%;max-width:560px;border:0;min-height:520px" loading="lazy"></iframe>`;

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed “{form.name}”</DialogTitle>
        </DialogHeader>

        {form.status !== "active" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This form is in draft. Activate it before sharing the public link.
          </div>
        )}

        <Tabs defaultValue="link" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1">Hosted link</TabsTrigger>
            <TabsTrigger value="iframe" className="flex-1">Iframe</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-3 space-y-2">
            <Label className="text-xs">Public form URL</Label>
            <div className="flex gap-2">
              <Input value={hostedUrl} readOnly />
              <Button variant="outline" onClick={() => copy("link", hostedUrl)}>
                {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="iframe" className="mt-3 space-y-2">
            <Label className="text-xs">Iframe snippet</Label>
            <Textarea readOnly rows={4} value={iframeSnippet} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => copy("iframe", iframeSnippet)}>
              {copied === "iframe" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy snippet
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
