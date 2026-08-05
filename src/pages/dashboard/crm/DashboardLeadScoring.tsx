import { Gauge, ArrowRight, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

const RULES = [
  { label: "Form submission", points: 10 },
  { label: "Email open", points: 5 },
  { label: "Link click", points: 10 },
  { label: "Lead magnet download", points: 20 },
  { label: "Website visit", points: 5 },
  { label: "Pricing page visit", points: 25 },
  { label: "Webinar registration", points: 30 },
  { label: "Call booking", points: 50 },
  { label: "Email unsubscribe", points: -50 },
];

const BANDS = [
  { label: "Hot", range: "81 – 100", className: "bg-destructive/10 text-destructive" },
  { label: "Warm", range: "21 – 80", className: "bg-accent/15 text-accent-foreground" },
  { label: "New", range: "0 – 20", className: "bg-muted text-muted-foreground" },
];

const DashboardLeadScoring = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Seo title="Lead Scoring Settings | NexusFlo24 CRM" description="See how NexusFlo24 scores leads from engagement activity, and how scores decay over time." />

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Gauge className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Lead Scoring Settings</h1>
          <p className="text-sm text-muted-foreground">
            Scores update automatically as leads engage across your funnels, emails and bookings.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold">Activity points</h2>
              <p className="text-sm text-muted-foreground">Applied the moment an activity is recorded on a lead.</p>
            </div>
            <ul className="divide-y divide-border">
              {RULES.map((r) => (
                <li key={r.label} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.label}</span>
                  <span className={`font-semibold ${r.points < 0 ? "text-destructive" : "text-primary"}`}>
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-base font-semibold">Status bands</h2>
                <p className="text-sm text-muted-foreground">Lead status follows the score automatically.</p>
              </div>
              <div className="space-y-2">
                {BANDS.map((b) => (
                  <div key={b.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <Badge className={b.className} variant="secondary">{b.label}</Badge>
                    <span className="text-sm text-muted-foreground">Score {b.range}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Score decay</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Leads with no activity for 30 days lose 20 points and are re-banded, so your hot list stays honest.
              </p>
              <Button variant="outline" className="gap-1.5" onClick={() => navigate(`/dashboard/${workspaceId}/automations`)}>
                Build score-based automations <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardLeadScoring;
