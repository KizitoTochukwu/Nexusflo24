import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductCard from "@/components/store/ProductCard";
import { SectionHeading } from "@/components/store/StorePrimitives";
import { INDUSTRIES } from "@/lib/store/constants";
import { supabase } from "@/integrations/supabase/client";
import {
  useStoreProblems, useStoreProducts, useSubmitStoreRequest, type StoreProduct,
} from "@/hooks/useStore";

const BUDGETS = ["Under £250", "£250 – £500", "£500 – £1,000", "£1,000+", "Not sure yet"];
const GOALS = [
  "Get more leads",
  "Respond to enquiries faster",
  "Close more sales",
  "Fill my calendar",
  "Reduce admin work",
  "Improve customer service",
  "Understand my numbers",
];

export default function AutomationFinder() {
  const { data: problems = [] } = useStoreProblems();
  const { data: products = [] } = useStoreProducts();
  const submit = useSubmitStoreRequest();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string>("");
  const [problemSlugs, setProblemSlugs] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [budget, setBudget] = useState("");
  const [contact, setContact] = useState({ full_name: "", email: "", business_name: "" });
  const [submitted, setSubmitted] = useState(false);

  const [aiSummary, setAiSummary] = useState("");
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiSlugs, setAiSlugs] = useState<string[] | null>(null);
  const [thinking, setThinking] = useState(false);

  const fallbackRecommendations = useMemo(() => {
    const scored = products.map((product) => {
      let score = 0;
      if (problemSlugs.some((slug) => (product.problem_slugs ?? []).includes(slug))) score += 4;
      if (industry && (product.industries ?? []).includes(industry)) score += 2;
      if (goal && `${product.outcome} ${product.summary ?? ""}`.toLowerCase().includes(goal.toLowerCase().split(" ").slice(-2).join(" ")))
        score += 1;
      if (product.is_popular) score += 1;
      if (budget === "Under £250" && product.base_price_pence <= 25000) score += 2;
      if (budget === "£250 – £500" && product.base_price_pence <= 50000) score += 2;
      if (budget === "£500 – £1,000" && product.base_price_pence <= 100000) score += 2;
      return { product, score };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((item) => item.score > 0)
      .map((item) => item.product) as StoreProduct[];
  }, [products, problemSlugs, industry, goal, budget]);

  const recommendations: StoreProduct[] = aiSlugs
    ? (aiSlugs.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean) as StoreProduct[])
    : fallbackRecommendations;

  const runAiRecommendation = async () => {
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("store-recommend", {
        body: {
          mode: "finder",
          goal,
          problems: problemSlugs,
          industry,
          budget,
          business_name: contact.business_name,
        },
      });
      if (error) throw error;
      const recs = (data?.recommendations ?? []) as { slug: string; reason: string }[];
      if (recs.length) {
        setAiSlugs(recs.map((r) => r.slug));
        setAiReasons(Object.fromEntries(recs.map((r) => [r.slug, r.reason])));
      }
      if (data?.summary) setAiSummary(data.summary);
    } catch {
      // Silently fall back to the rule-based match so the user always gets results.
    } finally {
      setThinking(false);
    }
  };

  const handleFinish = async () => {
    if (!contact.email.trim() || !contact.full_name.trim()) {
      toast.error("Add your name and email so we can send your recommendations.");
      return;
    }
    await runAiRecommendation();
    try {
      await submit.mutateAsync({
        request_type: "finder",
        full_name: contact.full_name,
        email: contact.email,
        business_name: contact.business_name || null,
        industry: industry || null,
        answers: {
          goal,
          problems: problemSlugs,
          budget,
          recommended: (aiSlugs ?? fallbackRecommendations.map((p) => p.slug)),
          ai_summary: aiSummary || null,
        },
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };


  const steps = [
    { title: "What is your main goal right now?", canNext: !!goal },
    { title: "Which problems do you recognise?", canNext: problemSlugs.length > 0 },
    { title: "What industry are you in?", canNext: !!industry },
    { title: "What is your setup budget?", canNext: !!budget },
    { title: "Where should we send your recommendations?", canNext: true },
  ];

  const chip = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition-colors ${
      selected ? "border-accent bg-accent/10 font-medium text-accent" : "hover:bg-muted"
    }`;


  return (
    <Layout>
      <Seo
        title="Automation Finder | Find the Right Automation for Your Business"
        description="Answer a few short questions about your business and we will recommend the automations that will make the biggest difference."
        path="/automation-finder"
      />

      <section className="bg-hero py-14">
        <div className="container text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Find My Automation</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Five short questions. Personalised recommendations. No technical knowledge needed.
          </p>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="container max-w-3xl">
          {submitted ? (
            <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-accent" />
              <h2 className="text-2xl font-bold">Here is what we recommend</h2>
              <p className="mt-3 text-muted-foreground">
                {aiSummary || "We have also emailed these to you along with a short explanation of why they fit."}
              </p>
              {aiSlugs && (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Matched by Nexus AI
                </span>
              )}
              <div className="mt-8 grid gap-6 text-left md:grid-cols-2">
                {recommendations.map((product) => (
                  <div key={product.id} className="space-y-2">
                    <ProductCard product={product} />
                    {aiReasons[product.slug] && (
                      <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
                        <strong className="text-foreground">Why this fits: </strong>
                        {aiReasons[product.slug]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {recommendations.length === 0 && (
                <p className="mt-6 text-sm text-muted-foreground">
                  Your needs look bespoke — our team will design a custom automation for you.
                </p>
              )}
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/automations/all">
                  <Button variant="outline">Browse all automations</Button>
                </Link>
                <Link to="/build-my-automation">
                  <Button className="bg-accent text-accent-foreground hover:bg-gold-dark">
                    Request something custom
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
              <div className="mb-6 flex items-center gap-2">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted"}`}
                  />
                ))}
              </div>

              <h2 className="text-xl font-semibold">{steps[step].title}</h2>

              <div className="mt-6">
                {step === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((option) => (
                      <button key={option} type="button" className={chip(goal === option)} onClick={() => setGoal(option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="flex flex-wrap gap-2">
                    {problems.map((problem) => (
                      <button
                        key={problem.slug}
                        type="button"
                        className={chip(problemSlugs.includes(problem.slug))}
                        onClick={() =>
                          setProblemSlugs((prev) =>
                            prev.includes(problem.slug)
                              ? prev.filter((s) => s !== problem.slug)
                              : [...prev, problem.slug],
                          )
                        }
                      >
                        {problem.title}
                      </button>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((option) => (
                      <button key={option} type="button" className={chip(industry === option)} onClick={() => setIndustry(option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((option) => (
                      <button key={option} type="button" className={chip(budget === option)} onClick={() => setBudget(option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="finder-name">Full name</Label>
                      <Input
                        id="finder-name"
                        value={contact.full_name}
                        onChange={(e) => setContact({ ...contact, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="finder-email">Business email</Label>
                      <Input
                        id="finder-email"
                        type="email"
                        value={contact.email}
                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="finder-business">Business name</Label>
                      <Input
                        id="finder-business"
                        value={contact.business_name}
                        onChange={(e) => setContact({ ...contact, business_name: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
                {step < steps.length - 1 ? (
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-gold-dark"
                    disabled={!steps[step].canNext}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Continue
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-gold-dark"
                    onClick={handleFinish}
                    disabled={submit.isPending}
                  >
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Show my recommendations
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {!submitted && (
        <section className="bg-surface py-14">
          <div className="container">
            <SectionHeading
              eyebrow="Popular right now"
              title="Automations most businesses start with"
            />
            <div className="grid gap-6 md:grid-cols-3">
              {products.filter((p) => p.is_popular).slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
