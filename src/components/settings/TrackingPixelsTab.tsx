import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Target, BarChart3, Tag as TagIcon, ShieldAlert, ExternalLink } from "lucide-react";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { injectMetaPixel, injectGA4, injectGTM, wsTrack } from "@/lib/analytics/workspacePixels";

interface Props {
  workspaceId: string;
}

const META_RE = /^\d{10,17}$/;
const GA4_RE = /^G-[A-Z0-9]{4,15}$/i;
const GTM_RE = /^GTM-[A-Z0-9]{4,10}$/i;

export default function TrackingPixelsTab({ workspaceId }: Props) {
  const { isAdmin } = useWorkspaceRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [metaId, setMetaId] = useState("");
  const [metaEnabled, setMetaEnabled] = useState(true);

  const [ga4Id, setGa4Id] = useState("");
  const [ga4Enabled, setGa4Enabled] = useState(true);

  const [gtmId, setGtmId] = useState("");
  const [gtmEnabled, setGtmEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workspace_tracking_pixels")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (data) {
        setMetaId(data.meta_pixel_id || "");
        setMetaEnabled(data.meta_enabled ?? true);
        setGa4Id(data.ga4_measurement_id || "");
        setGa4Enabled(data.ga4_enabled ?? true);
        setGtmId(data.gtm_id || "");
        setGtmEnabled(data.gtm_enabled ?? true);
      }
      setLoading(false);
    })();
  }, [workspaceId]);

  const validate = (): string | null => {
    if (metaId && !META_RE.test(metaId.trim())) return "Meta Pixel ID must be 10–17 digits.";
    if (ga4Id && !GA4_RE.test(ga4Id.trim())) return "GA4 ID must look like G-XXXXXXXX.";
    if (gtmId && !GTM_RE.test(gtmId.trim())) return "GTM ID must look like GTM-XXXXXX.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const { error } = await supabase
      .from("workspace_tracking_pixels")
      .upsert({
        workspace_id: workspaceId,
        meta_pixel_id: metaId.trim() || null,
        meta_enabled: metaEnabled,
        ga4_measurement_id: ga4Id.trim() || null,
        ga4_enabled: ga4Enabled,
        gtm_id: gtmId.trim() || null,
        gtm_enabled: gtmEnabled,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error(error.message || "Failed to save."); return; }
    toast.success("Tracking pixels saved. They'll auto-load on your public pages.");
  };

  const testMeta = () => {
    if (!metaId.trim() || !META_RE.test(metaId.trim())) { toast.error("Enter a valid Meta Pixel ID first."); return; }
    injectMetaPixel(metaId.trim(), workspaceId);
    setTimeout(() => {
      wsTrack("PageView");
      toast.success("Meta PageView fired. Check Meta Events Manager → Test Events.");
    }, 800);
  };
  const testGa4 = () => {
    if (!ga4Id.trim() || !GA4_RE.test(ga4Id.trim())) { toast.error("Enter a valid GA4 Measurement ID first."); return; }
    injectGA4(ga4Id.trim(), workspaceId);
    setTimeout(() => {
      wsTrack("page_view");
      toast.success("GA4 page_view fired. Check GA4 → Realtime.");
    }, 800);
  };
  const testGtm = () => {
    if (!gtmId.trim() || !GTM_RE.test(gtmId.trim())) { toast.error("Enter a valid GTM Container ID first."); return; }
    injectGTM(gtmId.trim(), workspaceId);
    toast.success("GTM container loaded. Use GTM Preview to verify tags.");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /><CardTitle className="text-lg">Admin only</CardTitle></div>
          <CardDescription>Only workspace owners and admins can manage tracking pixels.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Tracking & Pixels</CardTitle></div>
          <CardDescription>
            Add your own Meta Pixel, Google Analytics 4, and GTM containers. They'll auto-load on every
            public page this workspace owns — funnels (<code className="text-xs">/f/:slug</code>),
            hosted forms (<code className="text-xs">/forms/:slug</code>), embedded forms,
            and booking pages (<code className="text-xs">/book/:slug</code>) —
            and fire conversion events on form submissions and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Pixel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-[#1877F2]" />
                Meta Pixel ID
              </Label>
              <Switch checked={metaEnabled} onCheckedChange={setMetaEnabled} />
            </div>
            <div className="flex gap-2">
              <Input
                value={metaId}
                onChange={(e) => setMetaId(e.target.value)}
                placeholder="e.g. 4520045111651647"
                inputMode="numeric"
                maxLength={20}
              />
              <Button variant="outline" size="sm" onClick={testMeta}>Test</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find it in <a href="https://business.facebook.com/events_manager2/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Meta Events Manager <ExternalLink className="h-3 w-3" /></a>. Tracks <strong>PageView</strong> + <strong>Lead</strong> + <strong>Schedule</strong>.
            </p>
          </div>

          <Separator />

          {/* GA4 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-[#E37400]" />
                Google Analytics 4 Measurement ID
              </Label>
              <Switch checked={ga4Enabled} onCheckedChange={setGa4Enabled} />
            </div>
            <div className="flex gap-2">
              <Input
                value={ga4Id}
                onChange={(e) => setGa4Id(e.target.value)}
                placeholder="e.g. G-XXXXXXXXXX"
                maxLength={20}
              />
              <Button variant="outline" size="sm" onClick={testGa4}>Test</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find it in <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">GA4 Admin → Data Streams <ExternalLink className="h-3 w-3" /></a>.
            </p>
          </div>

          <Separator />

          {/* GTM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <TagIcon className="h-4 w-4 text-[#246FDB]" />
                Google Tag Manager Container ID
              </Label>
              <Switch checked={gtmEnabled} onCheckedChange={setGtmEnabled} />
            </div>
            <div className="flex gap-2">
              <Input
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
                placeholder="e.g. GTM-XXXXXX"
                maxLength={20}
              />
              <Button variant="outline" size="sm" onClick={testGtm}>Test</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use GTM if you want to manage many tags from one place.
            </p>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            🔒 Your IDs are public by design — they're embedded on your public landing pages anyway.
            Never paste API secrets or access tokens here.
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Pixels
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
