import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Check } from "lucide-react";

interface Props {
  workspaceId: string;
  funnelName: string;
}

const FIELD_OPTIONS = [
  { value: "name", label: "Full Name" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "message", label: "Message" },
];

export default function EmbedCodeDialog({ workspaceId, funnelName }: Props) {
  const [fields, setFields] = useState<string[]>(["name", "email"]);
  const [source, setSource] = useState(funnelName.toLowerCase().replace(/\s+/g, "-") || "embed-form");
  const [tags, setTags] = useState("");
  const [buttonText, setButtonText] = useState("Get Started");
  const [accentColor, setAccentColor] = useState("#D4AF37");
  const [copied, setCopied] = useState<string | null>(null);

  const origin = window.location.origin;

  const toggleField = (f: string) => {
    setFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  // Always include email
  const finalFields = fields.includes("email") ? fields : ["email", ...fields];

  const params = new URLSearchParams({
    workspace: workspaceId,
    fields: finalFields.join(","),
    source,
    button: buttonText,
    color: accentColor,
  });
  if (tags.trim()) params.set("tags", tags.trim());

  const embedUrl = `${origin}/embed/form?${params.toString()}`;

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  style="width:100%;border:none;min-height:300px"
  title="Lead Capture Form"
></iframe>
<script>
window.addEventListener("message",function(e){
  if(e.data&&e.data.type==="nexusflo-embed-resize"){
    var f=document.querySelector('iframe[src*="${workspaceId}"]');
    if(f)f.style.height=e.data.height+"px";
  }
});
</script>`;

  const jsSnippet = `<div id="nexusflo-form"></div>
<script>
(function(){
  var d=document,f=d.createElement("iframe");
  f.src="${embedUrl}";
  f.style.cssText="width:100%;border:none;min-height:300px";
  f.title="Lead Capture Form";
  d.getElementById("nexusflo-form").appendChild(f);
  window.addEventListener("message",function(e){
    if(e.data&&e.data.type==="nexusflo-embed-resize"){
      f.style.height=e.data.height+"px";
    }
  });
})();
</script>`;

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    toast.success(`${label} snippet copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="mr-1.5 h-4 w-4" /> Embed Form
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed Lead Capture Form</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add a lead capture form to any external website. Leads are captured directly into your workspace.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Field selector */}
          <div>
            <Label className="text-sm font-medium">Form Fields</Label>
            <p className="text-xs text-muted-foreground mb-2">Select the fields to include in your form.</p>
            <div className="mt-1 flex flex-col gap-1.5">
              {FIELD_OPTIONS.map((opt) => {
                const isEmail = opt.value === "email";
                const checked = finalFields.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${
                      checked
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border hover:border-primary/40"
                    } ${isEmail ? "opacity-80 cursor-not-allowed" : ""}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isEmail}
                      onCheckedChange={() => !isEmail && toggleField(opt.value)}
                    />
                    <span>{opt.label}</span>
                    {isEmail && <span className="text-[10px] text-muted-foreground ml-auto">required</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Config row */}
          <div className="grid gap-2 grid-cols-2">
            <div>
              <Label className="text-xs">Lead Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. homepage" className="mt-1 h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. website, organic" className="mt-1 h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Button Text</Label>
              <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="mt-1 h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Accent Color</Label>
              <div className="mt-1 flex items-center gap-1.5">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0.5 shrink-0" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Code snippets */}
          <Tabs defaultValue="iframe">
            <TabsList>
              <TabsTrigger value="iframe">iFrame Embed</TabsTrigger>
              <TabsTrigger value="js">JavaScript Snippet</TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="mt-3">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
                  {iframeSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyCode(iframeSnippet, "iFrame")}
                >
                  {copied === "iFrame" ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied === "iFrame" ? "Copied" : "Copy"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="js" className="mt-3">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
                  {jsSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyCode(jsSnippet, "JS")}
                >
                  {copied === "JS" ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied === "JS" ? "Copied" : "Copy"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Paste the snippet into your website's HTML. The form auto-resizes to fit its container.
            All submissions are captured as leads in your workspace with full UTM tracking.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
