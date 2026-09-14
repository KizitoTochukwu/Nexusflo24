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
import { DEFAULT_POPUP, type FormRecord } from "@/hooks/useForms";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";


interface Props {
  form: FormRecord;
  trigger: React.ReactNode;
}

export default function EmbedFormDialog({ form, trigger }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostedUrl = `${origin}/forms/${form.slug}`;
  const iframeSnippet = `<iframe src="${hostedUrl}" style="width:100%;max-width:560px;border:0;min-height:520px" loading="lazy"></iframe>`;

  const popup = form.settings?.popup ?? DEFAULT_POPUP;
  const [popupTrigger, setPopupTrigger] = useState<string>(popup.trigger ?? "button");
  const [delaySeconds, setDelaySeconds] = useState<number>(popup.delay_seconds ?? 5);
  const [scrollPercent, setScrollPercent] = useState<number>(popup.scroll_percent ?? 50);
  const [frequency, setFrequency] = useState<string>(popup.frequency ?? "session");
  const [frequencyDays, setFrequencyDays] = useState<number>(popup.frequency_days ?? 7);
  const [buttonLabel, setButtonLabel] = useState<string>(form.settings?.submit_text || "Open form");

  const popupSnippet = [
    `<script src="${origin}/forms-popup.js"`,
    `  data-form="${hostedUrl}"`,
    `  data-trigger="${popupTrigger}"`,
    popupTrigger === "delay" ? `  data-delay="${delaySeconds}"` : null,
    popupTrigger === "scroll" ? `  data-scroll="${scrollPercent}"` : null,
    popupTrigger === "button" ? `  data-button-text="${buttonLabel}"` : null,
    popupTrigger !== "button" ? `  data-frequency="${frequency}"` : null,
    popupTrigger !== "button" && frequency === "days" ? `  data-days="${frequencyDays}"` : null,
    `  defer><\/script>`,
  ].filter(Boolean).join("\n");

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
            <TabsTrigger value="popup" className="flex-1">Popup</TabsTrigger>
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
          <TabsContent value="popup" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">When should it open?</Label>
                <Select value={popupTrigger} onValueChange={setPopupTrigger}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button">On button click</SelectItem>
                    <SelectItem value="delay">After a delay</SelectItem>
                    <SelectItem value="scroll">On scroll</SelectItem>
                    <SelectItem value="exit">On exit intent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {popupTrigger === "button" && (
                <div>
                  <Label className="text-xs">Button text</Label>
                  <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
                </div>
              )}
              {popupTrigger === "delay" && (
                <div>
                  <Label className="text-xs">Delay (seconds)</Label>
                  <Input
                    type="number" min={0} max={120}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value) || 0)}
                  />
                </div>
              )}
              {popupTrigger === "scroll" && (
                <div>
                  <Label className="text-xs">Scroll depth (%)</Label>
                  <Input
                    type="number" min={1} max={100}
                    value={scrollPercent}
                    onChange={(e) => setScrollPercent(Number(e.target.value) || 50)}
                  />
                </div>
              )}
              {popupTrigger !== "button" && (
                <div>
                  <Label className="text-xs">Show it</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Once per visit</SelectItem>
                      <SelectItem value="days">Once every few days</SelectItem>
                      <SelectItem value="always">Every time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {popupTrigger !== "button" && frequency === "days" && (
                <div>
                  <Label className="text-xs">Days between showings</Label>
                  <Input
                    type="number" min={1} max={365}
                    value={frequencyDays}
                    onChange={(e) => setFrequencyDays(Number(e.target.value) || 7)}
                  />
                </div>
              )}
            </div>
            <Textarea readOnly rows={7} value={popupSnippet} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => copy("popup", popupSnippet)}>
              {copied === "popup" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy snippet
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Paste this before the closing &lt;/body&gt; tag. With the button option you can also
              add <code>data-nf24-popup</code> to any existing button to open the form.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

