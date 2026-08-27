import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, Package, Target, Users } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useIcps,
  useOffers,
  useProspectCompanies,
  useProspectContacts,
} from "@/hooks/useClientFinder";

export default function CfOverview() {
  const workspaceId = useWorkspaceId();
  const { data: offers = [], isLoading: lo } = useOffers(workspaceId);
  const { data: icps = [], isLoading: li } = useIcps(workspaceId);
  const { data: companies = [], isLoading: lc } = useProspectCompanies(workspaceId);
  const { data: contacts = [] } = useProspectContacts(workspaceId);

  const approvedIcps = icps.filter((i) => i.approval_status === "approved");
  const scored = companies.filter((c) => c.fit_score != null);
  const verified = contacts.filter((c) => c.email_status === "verified");

  const base = `/dashboard/${workspaceId}/client-finder`;

  const steps = [
    {
      done: offers.length > 0,
      title: "Describe your offer",
      body: "Tell the assistant what you sell and, optionally, let it read your public website.",
      to: `${base}/offers`,
      cta: "Add an offer",
    },
    {
      done: approvedIcps.length > 0,
      title: "Approve an ideal customer profile",
      body: "Generate a profile from your offer, edit it, then approve it before it is used.",
      to: `${base}/ideal-customers`,
      cta: "Define your customer",
    },
    {
      done: companies.length > 0,
      title: "Build a prospect list",
      body: "Import your own list, or connect a prospect data provider when one is available.",
      to: `${base}/prospects`,
      cta: "Add prospects",
    },
  ];

  const stats = [
    { label: "Offers", value: lo ? "—" : offers.length, icon: Package },
    { label: "Approved profiles", value: li ? "—" : approvedIcps.length, icon: Target },
    { label: "Companies", value: lc ? "—" : companies.length, icon: Building2 },
    { label: "Verified emails", value: verified.length, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Get set up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</span>
                  {step.done && <Badge variant="secondary">Done</Badge>}
                </div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
              <Button asChild variant={step.done ? "outline" : "default"} className="shrink-0">
                <Link to={step.to}>
                  {step.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fit scoring coverage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {companies.length === 0 ? (
            <p>No prospects yet. Import a list to start scoring fit against an approved profile.</p>
          ) : (
            <p>
              {scored.length} of {companies.length} companies have an explained fit score.{" "}
              {scored.length < companies.length && (
                <Link className="text-accent underline" to={`${base}/prospects`}>
                  Score the rest
                </Link>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
