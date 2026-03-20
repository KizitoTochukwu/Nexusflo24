import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Palette, Upload, Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceBranding, useUpsertBranding } from "@/hooks/useWorkspaceBranding";
import LockedFeature from "@/components/billing/LockedFeature";
import { usePlanGating } from "@/hooks/usePlanGating";

interface BrandingTabProps {
  workspaceId: string;
}

export default function BrandingTab({ workspaceId }: BrandingTabProps) {
  const { data: branding, isLoading } = useWorkspaceBranding(workspaceId);
  const upsert = useUpsertBranding();
  const { limits } = usePlanGating();
  const locked = !limits.whiteLabelBranding;

  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#D4AF37");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [uploading, setUploading] = useState<"logo" | "icon" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding) {
      setBrandName(branding.brand_name || "");
      setBrandColor(branding.brand_color || "#D4AF37");
      setCustomDomain(branding.custom_domain || "");
      setLogoUrl(branding.logo_url || "");
      setIconUrl(branding.icon_url || "");
    }
  }, [branding]);

  const handleUpload = async (file: File, type: "logo" | "icon") => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) { toast.error("Only JPG, PNG, WebP, or SVG allowed."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size 2MB"); return; }
    setUploading(type);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${workspaceId}/${type}.${ext}`;
    const { error } = await supabase.storage.from("funnel-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("funnel-assets").getPublicUrl(path);
    if (type === "logo") setLogoUrl(urlData.publicUrl);
    else setIconUrl(urlData.publicUrl);
    setUploading(null);
    toast.success(`${type === "logo" ? "Logo" : "Icon"} uploaded`);
  };

  const handleSave = () => {
    upsert.mutate({
      workspace_id: workspaceId,
      brand_name: brandName || null,
      brand_color: brandColor,
      custom_domain: customDomain || null,
      logo_url: logoUrl || null,
      icon_url: iconUrl || null,
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <LockedFeature locked={locked} featureName="White-Label Branding" requiredPlan="enterprise">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Brand Identity</CardTitle>
            </div>
            <CardDescription>Customize logos, colors, and branding for your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Brand Name</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your Brand" maxLength={50} />
              </div>
              <div className="space-y-1">
                <Label>Brand Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="max-w-[120px] font-mono text-sm" maxLength={7} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 max-w-[160px] object-contain rounded border p-1 bg-muted" />
                  ) : (
                    <div className="flex h-10 w-24 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">No logo</div>
                  )}
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
                  <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploading === "logo"}>
                    {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Upload
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sidebar Icon</Label>
                <div className="flex items-center gap-3">
                  {iconUrl ? (
                    <img src={iconUrl} alt="Icon" className="h-10 w-10 object-contain rounded border p-1 bg-muted" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">—</div>
                  )}
                  <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "icon")} />
                  <Button variant="outline" size="sm" onClick={() => iconRef.current?.click()} disabled={uploading === "icon"}>
                    {uploading === "icon" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label>Custom Domain</Label>
              </div>
              <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="app.yourbrand.com" maxLength={100} />
              <p className="text-xs text-muted-foreground">Point a CNAME to your NexusFlo24 instance. Contact support for DNS setup.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={upsert.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Branding
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>How your brand will appear to customers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3" style={{ color: brandColor }}>
                {iconUrl ? (
                  <img src={iconUrl} className="h-8 w-8 object-contain" alt="icon" />
                ) : (
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: brandColor }}>
                    {(brandName || "N")[0].toUpperCase()}
                  </div>
                )}
                {logoUrl ? (
                  <img src={logoUrl} className="h-8 max-w-[140px] object-contain" alt="logo" />
                ) : (
                  <span className="text-lg font-bold">{brandName || "Your Brand"}</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="rounded-md px-3 py-1.5 text-xs text-white font-medium" style={{ backgroundColor: brandColor }}>
                  Primary Button
                </div>
                <div className="rounded-md px-3 py-1.5 text-xs font-medium border" style={{ borderColor: brandColor, color: brandColor }}>
                  Secondary Button
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LockedFeature>
  );
}
