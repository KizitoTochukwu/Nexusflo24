import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, MessageCircle, Zap, Loader2 } from "lucide-react";
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
    message: subject === "demo" ? "I'd like to book a demo of NexusFlo24." : subject === "sales" ? "I'm interested in the Agency plan." : "",
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

  return (
    <Layout>
      <section className="bg-hero py-20 text-center">
        <div className="container">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
            <Zap className="h-3.5 w-3.5" /> Contact
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-primary-foreground md:text-5xl">
            Let's <span className="text-gradient-gold">Talk</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
            Questions, demo requests, or partnership ideas — we'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-8 shadow-card">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <Mail className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold">You're in — check your inbox!</h3>
                  <p className="mt-2 text-muted-foreground">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" maxLength={255} />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company (optional)" maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help…" rows={5} maxLength={1000} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            <div className="space-y-8">
              {[
                { icon: Mail, title: "Email", desc: "admin@nexusflo24.com\nkizitom.de@gmail.com", sub: "We respond within 24 hours." },
                { icon: MessageCircle, title: "WhatsApp", desc: "+447517327597", sub: "Chat with our team live." },
                { icon: MapPin, title: "Office", desc: "123 Innovation Way, Bury Road, Greater Manchester, United Kingdom. BL2", sub: "By appointment only." },
              ].map((c) => (
                <div key={c.title} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <c.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-sm font-medium whitespace-pre-line">{c.desc}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
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
