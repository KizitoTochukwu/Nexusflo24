import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  BookOpen,
  Play,
  Star,
  Users,
  Zap,
  BarChart3,
  Mail,
  MessageCircle,
  Target,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Quote,
} from "lucide-react";

import { courses, academyStats, PREMIUM_ACADEMY_LABEL } from "@/data/academyCourses";

const categoryIcons: Record<string, typeof Zap> = {
  "AI Marketing": Zap,
  Funnels: Target,
  "CRM Automation": Users,
  "Ads & Analytics": BarChart3,
  "Email Automation": Mail,
  "WhatsApp Automation": MessageCircle,
};
const stats = academyStats();
const categories = stats.categories.map((label) => ({
  label,
  icon: categoryIcons[label] ?? BookOpen,
  count: courses.filter((c) => c.category === label).length,
}));

const testimonials = [
  { name: "Sarah M.", role: "Digital Marketer", quote: "NexusFlo24 Academy transformed how I approach AI marketing. The courses are practical and immediately applicable.", rating: 5 },
  { name: "James K.", role: "Agency Owner", quote: "The funnel building course alone paid for itself 10x over. Highly recommend to any serious marketer.", rating: 5 },
  { name: "Amina O.", role: "SaaS Founder", quote: "I automated my entire WhatsApp follow-up sequence after taking the WhatsApp Marketing course. Game changer!", rating: 5 },
];

const Academy = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const visibleCourses = activeCategory ? courses.filter((c) => c.category === activeCategory) : courses;
  return (
  <Layout>
    <Seo
      title="NexusFlo24 Academy – Free AI Marketing & Automation Courses"
      description="Master AI marketing, funnels, CRM, WhatsApp and email automation with on-demand video courses, taught by NexusFlo24 experts."
    />

    {/* Hero */}
    <section className="relative overflow-hidden bg-hero py-24 text-center">
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
      <div className="container relative max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold backdrop-blur animate-fade-up">
          <GraduationCap className="h-3.5 w-3.5" /> NexusFlo24 Academy
        </span>
        <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-primary-foreground md:text-6xl animate-fade-up animation-delay-200">
          Master AI Marketing <span className="text-gradient-gold">Automation</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70 animate-fade-up animation-delay-400">
          Learn from experts. Build real campaigns. Grow your business with AI-powered strategies.
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-primary-foreground/60 animate-fade-up animation-delay-600">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> {stats.categories.length} categories</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> {stats.totalLessons} lessons</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> {stats.totalCourses} courses · free & premium</span>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up animation-delay-600">
          <Link to="/register?plan=academy&intent=learn">
            <Button size="lg" className="group h-12 bg-gradient-gold px-7 text-primary shadow-gold hover:opacity-95">
              <span className="font-semibold">Start Learning</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/register?plan=academy&intent=program">
            <Button size="lg" variant="outline" className="h-12 border-accent/40 bg-transparent px-7 text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
              Join the Program
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Categories */}
    <section id="categories" className="bg-surface py-20">
      <div className="container max-w-5xl">
        <h2 className="mb-3 text-center text-4xl font-bold">Course Categories</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          Pick your track. Each path is built to deliver results — not just theory.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <button
              type="button"
              key={c.label}
              aria-pressed={activeCategory === c.label}
              onClick={() => {
                setActiveCategory((cur) => (cur === c.label ? null : c.label));
                document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative cursor-pointer text-left ${activeCategory === c.label ? "!border-accent ring-2 ring-accent/40" : ""} overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/5 transition-all duration-500 group-hover:bg-accent/15" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">{c.label}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {c.count} {c.count === 1 ? "course" : "courses"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>

    {/* Featured Courses */}
    <section id="courses" className="scroll-mt-24 bg-background py-20">
      <div className="container max-w-6xl">
        <h2 className="mb-3 text-center text-4xl font-bold">{activeCategory ?? "Featured Courses"}</h2>
        <p className="mx-auto mb-4 max-w-xl text-center text-muted-foreground">
          On-demand, expert-led, and built around real campaigns.
        </p>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
          Free courses are open to every account. Premium courses are included with the {PREMIUM_ACADEMY_LABEL}.
          {activeCategory && (
            <button type="button" onClick={() => setActiveCategory(null)} className="ml-2 font-semibold text-accent underline-offset-4 hover:underline">
              Show all courses
            </button>
          )}
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((c) => (
            <Link
              to={`/academy/${c.slug}`}
              key={c.title}
              className={`group block rounded-2xl ${c.premium ? "bg-gradient-to-br from-accent/50 via-border to-accent/20" : "bg-border"} p-[1px] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}
            >
              <div className="overflow-hidden rounded-2xl bg-card">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
                  <span
                    className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
                      c.premium ? "bg-gradient-gold text-primary shadow-gold" : "bg-card/90 text-primary"
                    }`}
                  >
                    {c.premium ? "Premium" : "Free"}
                  </span>
                  <p className="absolute bottom-3 left-3 text-xs font-semibold uppercase tracking-wider text-accent">
                    {c.category}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
                      <Play className="h-5 w-5 translate-x-0.5 fill-primary text-primary" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="text-base font-bold leading-tight text-primary">{c.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c.lessons} lessons</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span>{c.duration}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {c.premium ? PREMIUM_ACADEMY_LABEL : "Free with any account"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="bg-surface py-20">
      <div className="container max-w-5xl">
        <h2 className="mb-3 text-center text-4xl font-bold">What Students Say</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          The kind of outcomes the Academy is built for. <span className="italic">Illustrative examples.</span>
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-gradient-to-br from-accent/40 via-border to-accent/20 p-[1px] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="relative h-full overflow-hidden rounded-2xl bg-card p-6">
                <Quote className="pointer-events-none absolute right-4 top-4 h-16 w-16 text-accent/10" />
                <div className="relative flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="relative mt-4 text-sm italic leading-relaxed text-muted-foreground">"{t.quote}"</p>
                <div className="relative mt-6 flex items-center gap-3 border-t pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary shadow-gold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="relative overflow-hidden bg-hero py-20 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div className="container relative max-w-2xl">
        <h2 className="text-4xl font-bold text-primary-foreground">Ready to Level Up Your Marketing?</h2>
        <p className="mx-auto mt-4 max-w-md text-primary-foreground/70">
          Start learning AI automation with NexusFlo24 Academy.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register?plan=academy&intent=enroll">
            <Button size="lg" className="group h-12 bg-gradient-gold px-7 text-primary shadow-gold hover:opacity-95">
              <span className="font-semibold">Join Academy Now</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#courses">
            <Button size="lg" variant="outline" className="h-12 border-accent/40 bg-transparent px-7 text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
              Browse Courses
            </Button>
          </a>
        </div>
        <p className="mt-5 text-xs text-primary-foreground/50">No credit card required · Cancel anytime</p>
      </div>
    </section>
  </Layout>
  );
};

export default Academy;
