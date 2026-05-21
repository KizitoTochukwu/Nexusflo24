import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail,
  MessageCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  Globe2,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
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
        phone: form.phone || undefined,
        source: "Contact",
        tags: ["website-signup", "contact-form", ...(subject ? [`contact-${subject}`] : [])],
        notes: `Contact form submission (${subject || "general"}). Company: ${form.company || "N/A"}. Message: ${form.message}`,
        formId: "contact-form",
        page: "/contact",
      });

      // Fire-and-forget admin notification (Email + WhatsApp). Never block UX.
      supabase.functions
        .invoke("notify-form-submission", {
          body: {
            form_id: "contact-page",
            form_name: "Contact Page",
            workspace_id: "624d5422-a619-47bd-ab77-8ec7b8208023",
            values: {
              Name: form.name,
              Email: form.email,
              Phone: form.phone || "—",
              Company: form.company || "—",
              Subject: subject || "general",
              Message: form.message,
            },
            lead_email: form.email,
            lead_name: form.name,
            notify_channels: { email: true, whatsapp: true, sms: false },
            notify_emails: ["admin@nexusflo24.com"],
            notify_phones: ["+447517327597"],
          },
        })
        .catch((err) => console.error("notify-form-submission error:", err));

      toast.success("Message sent! We'll get back to you within 24 hours.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const channels = [
    { icon: Mail, title: "Email us", value: "admin@nexusflo24.com", sub: "Reply within 24h" },
    { icon: MessageCircle, title: "WhatsApp", value: "+44 7517 327597", sub: "Chat live with our team" },
    { icon: Clock, title: "Response time", value: "Under 2 hours", sub: "Mon–Fri · 9–6 GMT" },
    { icon: Star, title: "Trusted", value: "10k+ businesses", sub: "Creators & SMBs" },
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

      <section className="bg-surface px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl bg-primary shadow-2xl">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-accent/10 to-transparent" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />

            <div className="relative z-10 grid lg:grid-cols-2">
              {/* LEFT — editorial */}
              <div className="flex flex-col justify-center p-8 md:p-14 lg:p-16">
                <span className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                    Get in touch
                  </span>
                </span>

                <h1 className="mb-6 text-4xl font-bold leading-[1.1] text-primary-foreground md:text-5xl lg:text-6xl">
                  Let's help you{" "}
                  <span className="bg-gradient-gold bg-clip-text text-transparent">automate your sales</span>{" "}
                  & follow-up
                </h1>
                <p className="mb-10 max-w-md text-lg leading-relaxed text-primary-foreground/70 md:text-xl">
                  Questions, demo requests, or partnership ideas — our team replies fast and personally.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {channels.map((c) => (
                    <div
                      key={c.title}
                      className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-accent/40"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 transition-transform group-hover:scale-110">
                        <c.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="text-sm font-medium text-primary-foreground">{c.title}</h3>
                      <p className="mt-1 text-xs text-primary-foreground/60">{c.value}</p>
                      <p className="mt-0.5 text-[10px] text-primary-foreground/40">{c.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-8">
                  {trustItems.map((t) => (
                    <div
                      key={t.label}
                      className="flex items-center gap-2 text-xs font-medium text-primary-foreground/60"
                    >
                      <t.icon className="h-4 w-4 text-accent" />
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — form */}
              <div className="flex items-center p-6 md:p-10 lg:p-12">
                <div className="relative w-full overflow-hidden rounded-3xl bg-card p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45)] md:p-10">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-gold" />

                  {success ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
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
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-foreground">Send us a message</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          We'll route your request to the right specialist.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="name"
                              className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                            >
                              Full Name
                            </Label>
                            <Input
                              id="name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              placeholder="John Doe"
                              maxLength={100}
                              className="h-12 rounded-xl text-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="email"
                              className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                            >
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              placeholder="john@company.com"
                              maxLength={255}
                              className="h-12 rounded-xl text-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="phone"
                              className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                            >
                              Phone (Optional)
                            </Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              placeholder="+44 7517 327597"
                              maxLength={30}
                              className="h-12 rounded-xl text-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="company"
                              className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                            >
                              Company (Optional)
                            </Label>
                            <Input
                              id="company"
                              value={form.company}
                              onChange={(e) => setForm({ ...form, company: e.target.value })}
                              placeholder="Your organization"
                              maxLength={100}
                              className="h-12 rounded-xl text-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="message"
                            className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            Message
                          </Label>
                          <Textarea
                            id="message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Tell us how we can help..."
                            rows={4}
                            maxLength={1000}
                            className="resize-none rounded-xl text-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="group h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/20"
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <span>Send message</span>
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>

                        <p className="px-4 text-center text-[10px] text-muted-foreground">
                          By submitting, you agree to our{" "}
                          <a href="/legal/privacy-policy" className="underline hover:text-accent">
                            Privacy Policy
                          </a>
                          . We never share your personal data.
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom support bar */}
          <div className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6 opacity-60 transition-opacity duration-500 hover:opacity-100">
            {trustItems.map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <t.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground/70">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
