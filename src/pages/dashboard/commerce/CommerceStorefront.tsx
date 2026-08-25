import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import { useShopBranding, useShopStore, useUpdateBranding, useUpdateStore } from "@/hooks/useCommerce";

export default function CommerceStorefront() {
  const { data: store, isLoading } = useShopStore();
  const { data: branding } = useShopBranding(store?.id);
  const updateStore = useUpdateStore();
  const updateBranding = useUpdateBranding();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [primary, setPrimary] = useState("#0B1F3A");
  const [accent, setAccent] = useState("#D4AF37");
  const [logoUrl, setLogoUrl] = useState("");
  const [footer, setFooter] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  useEffect(() => {
    if (store) {
      setName(store.name);
      setDescription(store.description ?? "");
    }
  }, [store]);

  useEffect(() => {
    if (branding) {
      setTagline(branding.tagline ?? "");
      setPrimary(branding.primary_color);
      setAccent(branding.accent_color);
      setLogoUrl(branding.logo_url ?? "");
      setFooter(branding.footer_text ?? "");
      setSeoTitle(branding.seo_title ?? "");
      setSeoDescription(branding.seo_description ?? "");
    }
  }, [branding]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const handleSave = () => {
    updateStore.mutate({ id: store.id, patch: { name, description } });
    updateBranding.mutate({
      storeId: store.id,
      patch: {
        tagline,
        primary_color: primary,
        accent_color: accent,
        logo_url: logoUrl || null,
        footer_text: footer || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Storefront branding</h2>
        <div>
          <Label htmlFor="b-name">Store name</Label>
          <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="b-tagline">Tagline</Label>
          <Input id="b-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="b-desc">Description</Label>
          <Textarea id="b-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="b-logo">Logo URL</Label>
          <Input id="b-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="b-primary">Primary colour</Label>
            <Input id="b-primary" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-accent">Accent colour</Label>
            <Input id="b-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="b-footer">Footer text</Label>
          <Input id="b-footer" value={footer} onChange={(e) => setFooter(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="b-seo-title">SEO title</Label>
            <Input id="b-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-seo-desc">SEO description</Label>
            <Input id="b-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateStore.isPending || updateBranding.isPending}>
          Save storefront
        </Button>
      </div>

      <div className="h-fit space-y-3 rounded-2xl border bg-card p-6">
        <h3 className="font-semibold">Preview</h3>
        <div className="overflow-hidden rounded-xl border">
          <div className="p-4" style={{ background: primary }}>
            <p className="text-sm font-semibold" style={{ color: accent }}>{name || "Your store"}</p>
            <p className="mt-1 text-xs text-white/80">{tagline || "Your tagline"}</p>
          </div>
          <div className="p-4 text-xs text-muted-foreground">{description || "Store description"}</div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer">
            Open live storefront <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
