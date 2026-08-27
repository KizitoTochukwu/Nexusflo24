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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useApproveIcp, useGenerateIcp, useIcps, useOffers, useSaveIcp, type Icp,
} from "@/hooks/useClientFinder";

const LIST_FIELDS: Array<{ key: keyof Icp; label: string }> = [
  { key: "industries", label: "Industries" },
  { key: "countries", label: "Countries" },
  { key: "company_sizes", label: "Company sizes" },
  { key: "business_types", label: "Business types" },
  { key: "technologies", label: "Technologies" },
  { key: "buying_signals", label: "Buying signals" },
  { key: "job_titles", label: "Job titles" },
  { key: "seniority_levels", label: "Seniority" },
  { key: "pain_points", label: "Pain points" },
  { key: "excluded_industries", label: "Excluded industries" },
  { key: "disqualifiers", label: "Disqualifiers" },
];

type Draft = Partial<Icp> & Record<string, any>;

const toText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
const toList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export default function CfIdealCustomers() {
  const workspaceId = useWorkspaceId();
  const { data: icps = [], isLoading } = useIcps(workspaceId);
  const { data: offers = [] } = useOffers(workspaceId);
  const saveIcp = useSaveIcp(workspaceId);
  const approveIcp = useApproveIcp();
  const generate = useGenerateIcp(workspaceId);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [genOfferId, setGenOfferId] = useState<string>("");

  const openEdit = (icp?: Icp) => {
    setDraft(icp ? { ...icp } : { name: "", approval_status: "draft" });
    setOpen(true);
  };

  const handleGenerate = async () => {
    if (!genOfferId) {
      toast.error("Choose an offer first");
      return;
    }
    const generated = await generate.mutateAsync(genOfferId);
    setDraft({
      name: generated.name || "Generated profile",
      offer_id: genOfferId,
      countries: generated.countries ?? [],
      industries: generated.industries ?? [],
      company_sizes: generated.company_sizes ?? [],
      business_types: generated.business_types ?? [],
      technologies: generated.technologies ?? [],
      growth_stages: generated.growth_stages ?? [],
      buying_signals: generated.buying_signals ?? [],
      excluded_industries: generated.excluded_industries ?? [],
      job_functions: generated.job_functions ?? [],
      job_titles: generated.job_titles ?? [],
      seniority_levels: generated.seniority_levels ?? [],
      pain_points: generated.pain_points ?? [],
      disqualifiers: generated.disqualifiers ?? [],
      ai_rationale: generated.rationale ?? "",
      approval_status: "draft",
    });
    setOpen(true);
    toast.success("Draft profile generated — review and approve it before use");
  };

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      toast.error("Give the profile a name");
      return;
    }
    await saveIcp.mutateAsync(draft as any);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate from an offer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label>Offer</Label>
            <Select value={genOfferId} onValueChange={setGenOfferId}>
              <SelectTrigger>
                <SelectValue placeholder={offers.length ? "Choose an offer" : "Add an offer first"} />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending || offers.length === 0}>
            {generate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Draft a profile
          </Button>
          <Button variant="outline" onClick={() => openEdit()}>
            <Plus className="mr-2 h-4 w-4" /> Blank profile
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading profiles…</CardContent></Card>
      ) : icps.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No ideal customer profiles yet. Generate one from an offer, or start from a blank profile.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {icps.map((icp) => (
            <Card key={icp.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{icp.name}</CardTitle>
                  <div className="mt-1 flex gap-2">
                    <Badge variant={icp.approval_status === "approved" ? "default" : "secondary"}>
                      {icp.approval_status}
                    </Badge>
                    <Badge variant="outline">v{icp.version}</Badge>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(icp)} aria-label="Edit profile">
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {LIST_FIELDS.slice(0, 5).map((f) => {
                  const list = (icp[f.key] as string[]) ?? [];
                  if (!list.length) return null;
                  return (
                    <p key={String(f.key)} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{f.label}: </span>
                      {list.join(", ")}
                    </p>
                  );
                })}
                {icp.ai_rationale && (
                  <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{icp.ai_rationale}</p>
                )}
                {icp.approval_status !== "approved" && (
                  <Button size="sm" onClick={() => approveIcp.mutate(icp.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve profile
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit profile" : "New ideal customer profile"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="icp-name">Profile name *</Label>
              <Input
                id="icp-name"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            {LIST_FIELDS.map((f) => (
              <div key={String(f.key)} className="grid gap-2">
                <Label htmlFor={`icp-${String(f.key)}`}>{f.label} (comma separated)</Label>
                <Input
                  id={`icp-${String(f.key)}`}
                  value={toText(draft[f.key as string])}
                  onChange={(e) => setDraft({ ...draft, [f.key]: toList(e.target.value) })}
                />
              </div>
            ))}
            <div className="grid gap-2">
              <Label htmlFor="icp-rationale">Rationale</Label>
              <Textarea
                id="icp-rationale"
                rows={3}
                value={draft.ai_rationale ?? ""}
                onChange={(e) => setDraft({ ...draft, ai_rationale: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveIcp.isPending}>
              {saveIcp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
