import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Search, Target, Sparkles, TrendingUp, Users, FileSearch, Workflow, Database, Mail } from "lucide-react";

const NexusIntelLanding = () => {
  return (
    <Layout>
      <div className="bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
          <div className="container mx-auto px-4 py-24 text-center">
            <Badge className="mb-6 bg-accent/20 text-accent border-accent/30">NexusIntel by NexusFlo24</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              AI Company Intelligence for <span className="text-accent">B2B Sales &amp; Marketing Teams</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-3xl mx-auto mb-8">
              Research any company, uncover sales opportunities, identify marketing gaps, understand competitors,
              and generate personalised outreach in minutes.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/register?next=/dashboard">Start Company Analysis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/nexusintel/sample">View Sample Report</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">The Problem</h2>
              <p className="text-lg text-muted-foreground">
                B2B teams waste hours researching companies manually, yet still miss the sales opportunities,
                marketing gaps, buyer signals, and campaign angles that close deals.
              </p>
            </div>
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">The Solution</h3>
                <p className="text-muted-foreground">
                  NexusIntel turns company data into practical sales and marketing intelligence. It helps you
                  understand who to target, what to sell, what to say, and what action to take next — all in one
                  structured report.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What it analyses */}
        <section className="bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What NexusIntel Analyses</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Search, label: "Company Identity" },
                { icon: FileSearch, label: "Website & Funnel Audit" },
                { icon: TrendingUp, label: "Marketing Weaknesses" },
                { icon: Target, label: "Sales Opportunities" },
                { icon: Users, label: "Decision-Maker Roles" },
                { icon: Sparkles, label: "Outreach Messages" },
                { icon: Workflow, label: "Automation Opportunities" },
                { icon: Database, label: "Tech Stack Signals" },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-6 flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-accent shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Enter a company website", desc: "Paste any URL and tell NexusIntel what you want to sell them." },
              { step: "2", title: "AI generates a full report", desc: "Get summary, audit, opportunities, competitors, outreach, and a CRM deal score." },
              { step: "3", title: "Act on the insights", desc: "Save to CRM, copy outreach messages, create follow-up tasks, export the report." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Built For</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                "B2B prospecting",
                "Lead generation",
                "Sales outreach",
                "Agency research",
                "Website / funnel audit",
                "Competitor analysis",
                "Campaign planning",
                "CRM lead scoring",
                "Automation discovery",
              ].map((u) => (
                <div key={u} className="flex items-center gap-2 bg-background rounded-lg px-4 py-3 border">
                  <Check className="h-4 w-4 text-accent" />
                  <span className="font-medium">{u}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample preview */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">See A Sample Report</h2>
            <p className="text-muted-foreground mb-8">
              A full intelligence report covers identity, business model, website audit, marketing,
              competitors, tech stack, decision-makers, outreach, a 5-step follow-up sequence, and a CRM deal score.
            </p>
            <Button asChild size="lg" variant="outline">
              <Link to="/nexusintel/sample">View Sample Report</Link>
            </Button>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                { name: "Starter", price: "£19", desc: "5 company reports per month." },
                { name: "Growth", price: "£59", desc: "50 reports, outreach copy, CRM export.", featured: true },
                { name: "Agency", price: "£109", desc: "100 reports, team access, lead scoring, automation." },
                { name: "Done-For-You", price: "£750+", desc: "We research 100 target companies and deliver full outreach strategy." },
              ].map((p) => (
                <Card key={p.name} className={p.featured ? "border-accent border-2" : ""}>
                  <CardContent className="p-6">
                    {p.featured && <Badge className="mb-2 bg-accent text-accent-foreground">Most Popular</Badge>}
                    <h3 className="font-bold text-xl mb-1">{p.name}</h3>
                    <p className="text-3xl font-bold mb-3">{p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                    <Button asChild className="w-full" variant={p.featured ? "default" : "outline"}>
                      <Link to="/register?next=/dashboard">Get Started</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <Mail className="h-10 w-10 mx-auto mb-4 text-accent" />
            <h2 className="text-3xl font-bold mb-4">Start Researching Smarter</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Generate your first AI company intelligence report in minutes.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/register?next=/dashboard">Start Company Analysis</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default NexusIntelLanding;
