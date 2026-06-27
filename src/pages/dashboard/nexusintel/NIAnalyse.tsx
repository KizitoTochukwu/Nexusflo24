import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useGenerateReport } from "@/lib/nexusintel/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  "Collecting company information",
  "Reviewing website and funnel",
  "Identifying marketing gaps",
  "Mapping sales opportunities",
  "Reviewing competitor positioning",
  "Preparing outreach strategy",
  "Scoring CRM opportunity",
  "Generating intelligence report",
];

export default function NIAnalyse() {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const generate = useGenerateReport();

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [offer, setOffer] = useState("");
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [stage, setStage] = useState(-1);

  const [sections, setSections] = useState({
    identity: true, websiteAudit: true, marketing: true, leadGen: true, automation: true,
    competitors: true, techStack: true, decisionMakers: true, outreach: true, followUp: true, dealScore: true,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim() || !offer.trim()) {
      toast.error("Website URL and what to sell are required.");
      return;
    }
    try {
      // Animate stages
      for (let i = 0; i < STAGES.length; i++) {
        setStage(i);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 350));
      }
      const result = await generate.mutateAsync({
        workspaceId,
        input: {
          companyName, websiteUrl, location, industry, size,
          servicesOffer: offer, targetCustomerType: target, notes, depth, sections,
        },
      });
      toast.success("Report generated.");
      navigate(`/dashboard/${workspaceId}/nexusintel/reports/${result.report.id}`);
    } catch (err: any) {
      setStage(-1);
      toast.error(err?.message ?? "Failed to generate report.");
    }
  };

  if (stage >= 0 || generate.isPending) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12">
          <Card>
            <CardContent className="p-8 space-y-4">
              <h2 className="text-2xl font-bold">Researching...</h2>
              <p className="text-muted-foreground text-sm">This usually takes under 30 seconds.</p>
              <div className="space-y-2 pt-4">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    {i < stage ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : i === stage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted" />
                    )}
                    <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analyse New Company</h1>
          <p className="text-muted-foreground">Enter a website and what you'd like to sell them.</p>
        </div>

        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader><CardTitle>Company details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Company name</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>Company website URL *</Label>
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} required placeholder="https://example.com" />
                </div>
                <div>
                  <Label>Country / Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div>
                  <Label>Company size</Label>
                  <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 11-50" />
                </div>
                <div>
                  <Label>Analysis depth</Label>
                  <Select value={depth} onValueChange={(v: any) => setDepth(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick Scan</SelectItem>
                      <SelectItem value="standard">Standard Report</SelectItem>
                      <SelectItem value="deep">Deep Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>What do you want to sell them? *</Label>
                <Input value={offer} onChange={(e) => setOffer(e.target.value)} required placeholder="e.g. AI marketing automation" />
              </div>
              <div>
                <Label>Target customer type</Label>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <Label>Notes / context</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle>Report sections to include</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries({
                  identity: "Company Identity",
                  websiteAudit: "Website / Funnel Audit",
                  marketing: "Marketing Weaknesses",
                  leadGen: "Lead Generation Opportunities",
                  automation: "Automation Opportunities",
                  competitors: "Competitor Comparison",
                  techStack: "Technology Stack Signals",
                  decisionMakers: "Decision-Maker Role Recommendations",
                  outreach: "Outreach Messages",
                  followUp: "Follow-Up Sequence",
                  dealScore: "CRM Deal Score",
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(sections as any)[key]}
                      onCheckedChange={(c) => setSections((s) => ({ ...s, [key]: !!c }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button type="submit" size="lg" disabled={generate.isPending}>
              {generate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Intelligence Report
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
