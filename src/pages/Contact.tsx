import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail,
  MapPin,
  MessageCircle,
  Zap,
  Loader2,
  User,
  Building2,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  Globe2,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";

const Contact = () => {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message:
      subject === "demo"
        ? "I'd like to book a demo of NexusFlo24."
        : subject === "sales"
          ? "I'm interested in the Agency plan."
          : "",
  });
  const { capture, loading, success } = useCaptureLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      await capture({
        full_name: form.name,
        email: form.email,
        source: "Contact",
        tags: ["website-signup", "contact-form", ...(subject ? [`contact-${subject}`] : [])],
        notes: `Contact form submission (${subject || "general"}). Company: ${form.company || "N/A"}. Message: ${form.message}`,
        formId: "contact-form",
        page: "/contact",
      });
      toast.success("Message sent! We'll get back to you within 24 hours.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const channels = [
    {
      icon: Mail,
      title: "Email us",
      lines: ["admin@nexusflo24.com", "kizitom.de@gmail.com"],
      sub: "We respond within 24 hours.",
      action: { label: "Open inbox", href: "mailto:admin@nexusflo24.com" },
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      lines: ["+44 7517 327597"],
      sub: "Chat with our team live.",
      action: { label: "Start chat", href: "https://wa.me/447517327597" },
    },
    {
      icon: MapPin,
      title: "Office",
      lines: ["123 Innovation Way, Bury Road", "Greater Manchester, UK · BL2"],
      sub: "By appointment only.",
      action: { label: "Get directions", href: "https://maps.google.com/?q=Bury+Road+Greater+Manchester+BL2" },
    },
    {
      icon: Clock,
      title: "Response time",
      lines: ["Typically replies in under 2 hours"],
      sub: "Mon–Fri · 9am–6pm GMT",
      badge: "Online now",
    },
  ];

  const trustItems = [
    { icon: Lock, label: "Secure by design" },
    { icon: ShieldCheck, label: "GDPR compliant" },
    { icon: Globe2, label: "UK-based team" },
    { icon: CheckCircle2, label: "24/7 monitoring" },
  ];

  return (
    <Layout>
      <Seo
        title="Contact NexusFlo24 – Talk to Sales or Support"
        description="Get in touch with the NexusFlo24 team. Book a demo, ask about pricing or reach our support specialists for help with your account."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero py-24">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="container relative text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold backdrop-blur animate-fade-up">
            <Zap className="h-3.5 w-3.5" /> Contact
          </span>
          <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-primary-foreground md:text-6xl animate-fade-up animation-delay-200">
            Let's <span className="text-gradient-gold">build something</span> together
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70 animate-fade-up animation-delay-400">
            Questions, demo requests, or partnership ideas — our team replies fast and personally.
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-primary-foreground/60 animate-fade-up animation-delay-600">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Trusted by creators & SMBs</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Replies in under 24h</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> GDPR-ready</span>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="relative bg-surface py-20">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl bg-gradient-to-br from-accent/40 via-border to-accent/20 p-[1px] shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                <div className="relative overflow-hidden rounded-2xl bg-card p-8 md:p-10">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />

                  {success ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold">You're in — check your inbox!</h3>
                      <p className="mt-2 max-w-sm text-muted-foreground">
                        Thanks for reaching out. A real human from our team will get back to you within 24 hours.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-7">
                        <h2 className="text-2xl font-bold md:text-3xl">Send us a message</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Fill out the form and we'll route your request to the right specialist.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div>
                            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Name *
                            </Label>
                            <div className="relative mt-1.5">
                              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Your name"
                                maxLength={100}
                                className="h-12 pl-10 focus-visible:ring-accent"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Email *
                            </Label>
                            <div className="relative mt-1.5">
                              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="you@company.com"
                                maxLength={255}
                                className="h-12 pl-10 focus-visible:ring-accent"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Company
                          </Label>
                          <div className="relative mt-1.5">
                            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="company"
                              value={form.company}
                              onChange={(e) => setForm({ ...form, company: e.target.value })}
                              placeholder="Your company (optional)"
                              maxLength={100}
                              className="h-12 pl-10 focus-visible:ring-accent"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Message *
                          </Label>
                          <div className="relative mt-1.5">
                            <MessageSquare className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Textarea
                              id="message"
                              value={form.message}
                              onChange={(e) => setForm({ ...form, message: e.target.value })}
                              placeholder="Tell us how we can help…"
                              rows={5}
                              maxLength={1000}
                              className="resize-none pl-10 pt-3 focus-visible:ring-accent"
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="group h-12 w-full bg-gradient-gold text-primary shadow-gold transition-all hover:opacity-95 hover:shadow-card-hover"
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          <span className="font-semibold">Send message</span>
                          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                          By submitting, you agree to our privacy policy. We never share your details.
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="lg:col-span-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {channels.map((c) => (
                  <a
                    key={c.title}
                    href={(c as any).action?.href}
                    target={(c as any).action?.href?.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group relative block overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/5 transition-all duration-500 group-hover:bg-accent/10" />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                        <c.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-primary">{c.title}</h3>
                          {(c as any).badge && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {(c as any).badge}
                            </span>
                          )}
                        </div>
                        {c.lines.map((line) => (
                          <p key={line} className="mt-0.5 text-sm font-medium text-foreground">
                            {line}
                          </p>
                        ))}
                        <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                        {(c as any).action && (
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                            {(c as any).action.label}
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-14 rounded-2xl border bg-card/60 px-6 py-5 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
              {trustItems.map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-accent" />
                  <span className="font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
