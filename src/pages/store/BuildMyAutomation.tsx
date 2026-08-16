import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRIES, INTEGRATIONS } from "@/lib/store/constants";
import { useSubmitStoreRequest } from "@/hooks/useStore";

const BUDGETS = ["Under £250", "£250 – £500", "£500 – £1,000", "£1,000 – £3,000", "£3,000+"];
const TIMELINES = ["As soon as possible", "Within 2 weeks", "Within a month", "Just exploring"];

export default function BuildMyAutomation() {
  const submit = useSubmitStoreRequest();
  const [done, setDone] = useState(false);
  const [tools, setTools] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", business_name: "", website: "",
    industry: "", budget: "", timeline: "", process: "", outcome: "",
  });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.process.trim()) {
      toast.error("Please add your name, email and a short description of the process.");
      return;
    }
    try {
      await submit.mutateAsync({
        request_type: "custom",
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        business_name: form.business_name || null,
        website: form.website || null,
        industry: form.industry || null,
        message: form.process,
        answers: {
          desired_outcome: form.outcome,
          tools,
          budget: form.budget,
          timeline: form.timeline,
        },
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <Layout>
      <Seo
        title="Build My Automation | Custom Business Automation Requests"
        description="Describe the process you want automated and NexusFlo24 will design, build, test and launch a bespoke automation for your business."
        path="/build-my-automation"
      />

      <section className="bg-hero py-16">
        <div className="container text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Build My Automation</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Cannot find what you need in the catalogue? Describe the process in plain language and we
            will design a bespoke automation with a fixed price before you commit.
          </p>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="container max-w-3xl">
          {done ? (
            <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-accent" />
              <h2 className="text-2xl font-bold">Request received</h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Our automation team will review your process and come back with a proposed workflow,
                fixed price and delivery timeline. Nothing is charged until you approve it.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/automations/all">
                  <Button variant="outline">Browse the catalogue</Button>
                </Link>
                <Link to="/automations">
                  <Button className="bg-accent text-accent-foreground hover:bg-gold-dark">
                    Back to the store
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bma-name">Full name *</Label>
                  <Input id="bma-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bma-email">Business email *</Label>
                  <Input id="bma-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bma-phone">Phone</Label>
                  <Input id="bma-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bma-business">Business name</Label>
                  <Input id="bma-business" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bma-website">Website</Label>
                  <Input id="bma-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="bma-process">Describe the process you want automated *</Label>
                <Textarea
                  id="bma-process"
                  rows={5}
                  placeholder="For example: when someone fills in our website form, we manually add them to a spreadsheet, email them, and try to remember to follow up three days later."
                  value={form.process}
                  onChange={(e) => set("process", e.target.value)}
                />
              </div>

              <div className="mt-6">
                <Label htmlFor="bma-outcome">What outcome do you want?</Label>
                <Textarea
                  id="bma-outcome"
                  rows={3}
                  placeholder="For example: every enquiry gets a reply within two minutes and nothing is forgotten."
                  value={form.outcome}
                  onChange={(e) => set("outcome", e.target.value)}
                />
              </div>

              <div className="mt-6">
                <Label className="mb-3 block">Which tools do you already use?</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEGRATIONS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() =>
                        setTools((prev) =>
                          prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
                        )
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                        tools.includes(tool)
                          ? "border-accent bg-accent/10 font-medium text-accent"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Budget range</Label>
                  <Select value={form.budget} onValueChange={(v) => set("budget", v)}>
                    <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {BUDGETS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timeline</Label>
                  <Select value={form.timeline} onValueChange={(v) => set("timeline", v)}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {TIMELINES.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-8 w-full bg-accent text-accent-foreground hover:bg-gold-dark"
                onClick={handleSubmit}
                disabled={submit.isPending}
              >
                {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send my request
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No payment is taken now. We confirm scope, price and timeline in writing first.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
