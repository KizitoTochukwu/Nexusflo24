import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useAnalyseWebsite, useDeleteOffer, useOffers, useSaveOffer, type Offer,
} from "@/hooks/useClientFinder";

type Draft = Partial<Offer> & { key_benefitsText?: string; countriesText?: string };

const emptyDraft: Draft = { name: "", currency: "GBP", key_benefits: [], countries_served: [] };

export default function CfOffers() {
  const workspaceId = useWorkspaceId();
  const { data: offers = [], isLoading } = useOffers(workspaceId);
  const saveOffer = useSaveOffer(workspaceId);
  const deleteOffer = useDeleteOffer();
  const analyse = useAnalyseWebsite(workspaceId);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const openNew = () => {
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (o: Offer) => {
    setDraft({
      ...o,
      key_benefitsText: (o.key_benefits ?? []).join("\n"),
      countriesText: (o.countries_served ?? []).join(", "),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      toast.error("Give the offer a name");
      return;
    }
    const { key_benefitsText, countriesText, ...rest } = draft;
    await saveOffer.mutateAsync({
      ...rest,
      key_benefits: (key_benefitsText ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      countries_served: (countriesText ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    } as any);
    setOpen(false);
  };

  const handleAnalyse = async (offer: Offer) => {
    if (!offer.website_url) {
      toast.error("Add a website address to this offer first");
      return;
    }
    const res = await analyse.mutateAsync({ offer_id: offer.id, website_url: offer.website_url });
    toast.success(`Read ${res.pages.filter((p: any) => p.chars > 0).length} public pages`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Everything the assistant writes is grounded in these details. Nothing is invented.
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New offer
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading offers…</CardContent></Card>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-medium">No offers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add what you sell so the assistant can build an ideal customer profile from it.
            </p>
            <Button className="mt-4" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add your first offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{o.name}</CardTitle>
                  {o.website_url && (
                    <a
                      href={o.website_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-accent underline"
                    >
                      {o.website_url}
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(o)} aria-label="Edit offer">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteOffer.mutate(o.id)}
                    aria-label="Archive offer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {o.short_description && <p className="text-muted-foreground">{o.short_description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{o.status}</Badge>
                  <Badge variant="outline">
                    Website analysis: {o.website_analysis_status.replace("_", " ")}
                  </Badge>
                </div>
                {o.website_analysis_summary && (
                  <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    {o.website_analysis_summary}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={analyse.isPending || !o.website_url}
                  onClick={() => handleAnalyse(o)}
                >
                  {analyse.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  Analyse public website
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit offer" : "New offer"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="offer-name">Offer name *</Label>
              <Input
                id="offer-name"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-site">Website (https only)</Label>
              <Input
                id="offer-site"
                placeholder="https://yourcompany.com"
                value={draft.website_url ?? ""}
                onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-desc">What do you sell?</Label>
              <Textarea
                id="offer-desc"
                rows={3}
                value={draft.short_description ?? ""}
                onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-problem">What problem does it solve?</Label>
              <Textarea
                id="offer-problem"
                rows={2}
                value={draft.customer_problem ?? ""}
                onChange={(e) => setDraft({ ...draft, customer_problem: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-benefits">Key benefits (one per line)</Label>
              <Textarea
                id="offer-benefits"
                rows={3}
                value={draft.key_benefitsText ?? ""}
                onChange={(e) => setDraft({ ...draft, key_benefitsText: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="offer-pricing">Pricing model</Label>
                <Input
                  id="offer-pricing"
                  value={draft.pricing_model ?? ""}
                  onChange={(e) => setDraft({ ...draft, pricing_model: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="offer-value">Typical contract value</Label>
                <Input
                  id="offer-value"
                  type="number"
                  value={draft.typical_contract_value ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, typical_contract_value: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-countries">Countries served (comma separated)</Label>
              <Input
                id="offer-countries"
                value={draft.countriesText ?? ""}
                onChange={(e) => setDraft({ ...draft, countriesText: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-proof">Proof points (real results only)</Label>
              <Textarea
                id="offer-proof"
                rows={2}
                value={draft.proof_points ?? ""}
                onChange={(e) => setDraft({ ...draft, proof_points: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-booking">Booking link</Label>
              <Input
                id="offer-booking"
                value={draft.booking_url ?? ""}
                onChange={(e) => setDraft({ ...draft, booking_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveOffer.isPending}>
              {saveOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
