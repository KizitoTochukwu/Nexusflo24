import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Code2, Loader2, Save, ShieldAlert } from "lucide-react";
import { useIsAdmin } from "@/hooks/useAdminRole";

const MAX_LEN = 20000;

export default function CustomCodeTab() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [headEnabled, setHeadEnabled] = useState(true);
  const [bodyEnabled, setBodyEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("site_custom_code")
        .select("head_code, body_code, head_enabled, body_enabled")
        .eq("id", "global")
        .maybeSingle();
      if (!error && data) {
        setHeadCode(data.head_code || "");
        setBodyCode(data.body_code || "");
        setHeadEnabled(data.head_enabled ?? true);
        setBodyEnabled(data.body_enabled ?? true);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (headCode.length > MAX_LEN || bodyCode.length > MAX_LEN) {
      toast.error(`Each snippet must be under ${MAX_LEN.toLocaleString()} characters.`);
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("site_custom_code")
      .upsert({
        id: "global",
        head_code: headCode,
        body_code: bodyCode,
        head_enabled: headEnabled,
        body_enabled: bodyEnabled,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save custom code.");
    } else {
      toast.success("Custom code saved. Changes apply site-wide within seconds.");
    }
  };

  if (adminLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /><CardTitle className="text-lg">Admin only</CardTitle></div>
          <CardDescription>Custom site code can only be edited by platform admins. Contact your administrator to add tracking pixels or analytics scripts.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2"><Code2 className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Custom Site Code</CardTitle></div>
        <CardDescription>
          Inject HTML/JavaScript site-wide — perfect for Meta Pixel, Google Analytics, GTM, Hotjar, etc.
          Changes apply instantly to every page (marketing site, dashboard, public forms, funnels & booking pages).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">&lt;head&gt; code</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{headCode.length.toLocaleString()} / {MAX_LEN.toLocaleString()}</span>
                  <Switch checked={headEnabled} onCheckedChange={setHeadEnabled} />
                </div>
              </div>
              <Textarea
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                placeholder={`<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s){...}\nfbq('init', 'YOUR_PIXEL_ID');\nfbq('track', 'PageView');\n</script>`}
                className="min-h-[180px] font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Loaded once on every page. Use for tracking pixels, analytics libraries, font preloads, or meta tags.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">End-of-&lt;body&gt; code</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{bodyCode.length.toLocaleString()} / {MAX_LEN.toLocaleString()}</span>
                  <Switch checked={bodyEnabled} onCheckedChange={setBodyEnabled} />
                </div>
              </div>
              <Textarea
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                placeholder={`<!-- Chat widget, no-script fallbacks, deferred scripts, etc. -->`}
                className="min-h-[140px] font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Appended at the end of the &lt;body&gt;. Best for chat widgets and deferred scripts.
              </p>
            </div>

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              ⚠️ Code runs on every visitor's browser. Only paste snippets from trusted sources — malicious scripts can compromise user accounts.
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Custom Code
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
