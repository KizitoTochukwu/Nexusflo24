import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdminRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Code2, Loader2, Save, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

const MAX = 20000;

type Row = {
  head_code: string;
  body_code: string;
  head_enabled: boolean;
  body_enabled: boolean;
  updated_at: string | null;
};

export default function CustomCodeTab() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<Row>({
    head_code: "",
    body_code: "",
    head_enabled: true,
    body_enabled: true,
    updated_at: null,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_custom_code")
        .select("head_code, body_code, head_enabled, body_enabled, updated_at")
        .eq("id", "global")
        .maybeSingle();
      if (data) setRow(data as Row);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    if (row.head_code.length > MAX || row.body_code.length > MAX) {
      toast.error(`Each snippet must be under ${MAX.toLocaleString()} characters.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_custom_code")
      .upsert(
        {
          id: "global",
          head_code: row.head_code,
          body_code: row.body_code,
          head_enabled: row.head_enabled,
          body_enabled: row.body_enabled,
          updated_by: user.id,
        },
        { onConflict: "id" }
      );
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save custom code.");
      return;
    }
    toast.success("Custom code saved. New page loads will pick it up immediately.");
    setRow((r) => ({ ...r, updated_at: new Date().toISOString() }));
  };

  if (roleLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Admin Only</CardTitle>
          </div>
          <CardDescription>This setting is restricted to platform administrators.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">Custom Site Code</CardTitle>
          </div>
          <CardDescription>
            Inject tracking pixels and analytics snippets (Meta Pixel, Google Analytics, GTM, Hotjar, etc.) site-wide
            without editing source code. Changes apply on the next page load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Heads up:</strong> Code pasted here runs on every page of the site for every visitor. Only paste
            snippets from trusted sources. Paste the full <code>&lt;script&gt;...&lt;/script&gt;</code> (and{" "}
            <code>&lt;noscript&gt;</code>) blocks exactly as the provider gives them.
          </div>
        </CardContent>
      </Card>

      {/* Head Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Head Code</CardTitle>
              <CardDescription>
                Injected into <code>&lt;head&gt;</code>. Use for Meta Pixel, GA4, GTM, Hotjar, etc.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="head-enabled" className="text-xs">Enabled</Label>
              <Switch
                id="head-enabled"
                checked={row.head_enabled}
                onCheckedChange={(v) => setRow((r) => ({ ...r, head_enabled: v }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={row.head_code}
            onChange={(e) => setRow((r) => ({ ...r, head_code: e.target.value }))}
            placeholder={`<!-- Meta Pixel Code -->\n<script>...</script>\n<noscript><img ... /></noscript>`}
            rows={12}
            maxLength={MAX}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground text-right">
            {row.head_code.length.toLocaleString()} / {MAX.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Body Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Body End Code</CardTitle>
              <CardDescription>
                Injected at the end of <code>&lt;body&gt;</code>. Use for chat widgets and late-loading scripts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="body-enabled" className="text-xs">Enabled</Label>
              <Switch
                id="body-enabled"
                checked={row.body_enabled}
                onCheckedChange={(v) => setRow((r) => ({ ...r, body_enabled: v }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={row.body_code}
            onChange={(e) => setRow((r) => ({ ...r, body_code: e.target.value }))}
            placeholder={`<!-- Chat widget, late scripts, etc. -->`}
            rows={8}
            maxLength={MAX}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground text-right">
            {row.body_code.length.toLocaleString()} / {MAX.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {row.updated_at ? `Last updated ${format(new Date(row.updated_at), "MMM d, yyyy 'at' h:mm a")}` : "Not saved yet."}
        </p>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Custom Code
        </Button>
      </div>
    </div>
  );
}
