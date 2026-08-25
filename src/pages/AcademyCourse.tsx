import { Link, useParams, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  Star,
  Users,
} from "lucide-react";
import { getCourseBySlug, courses } from "@/data/academyCourses";
import { useAuth } from "@/contexts/AuthContext";
import { useHasEntitlement } from "@/hooks/useEntitlements";

const AcademyCourse = () => {
  const { slug } = useParams<{ slug: string }>();
  const course = getCourseBySlug(slug);
  const { user } = useAuth();
  const { data: hasAccess } = useHasEntitlement("course", slug, !!user);

  if (!course) return <Navigate to="/academy" replace />;

  const related = courses.filter((c) => c.slug !== course.slug).slice(0, 3);

  return (
    <Layout>
      <Seo
        title={`${course.title} – NexusFlo24 Academy`}
        description={course.tagline}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="container relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Link
              to="/academy"
              className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Academy
            </Link>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold backdrop-blur">
              <GraduationCap className="h-3.5 w-3.5" /> {course.category}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-primary-foreground/75">
              {course.tagline}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-accent text-accent" /> {course.rating} rating
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" /> {course.students.toLocaleString()} learners
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" /> {course.lessons} lessons
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" /> {course.duration}
              </span>
            </div>
            {hasAccess && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
                <CheckCircle2 className="h-3.5 w-3.5" /> You have full access to this course
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={
                  hasAccess
                    ? `/academy/${course.slug}#syllabus`
                    : `/register?plan=academy&intent=enroll&course=${course.slug}`
                }
              >
                <Button size="lg" className="group h-12 bg-gradient-gold px-7 text-primary shadow-gold hover:opacity-95">
                  <span className="font-semibold">
                    {hasAccess
                      ? "Continue Course"
                      : course.premium
                        ? "Enroll in Course"
                        : "Start Free Course"}
                  </span>
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#syllabus">
                <Button size="lg" variant="outline" className="h-12 border-accent/40 bg-transparent px-7 text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
                  View Syllabus
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-gradient-to-br from-accent/50 via-border to-accent/20 p-[1px] shadow-card">
              <div className="overflow-hidden rounded-2xl bg-card">
                <div className="relative h-64">
                  <img
                    src={course.image}
                    alt={course.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
                      <Play className="h-6 w-6 translate-x-0.5 fill-primary text-primary" />
                    </div>
                  </div>
                  <span
                    className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
                      course.premium ? "bg-gradient-gold text-primary shadow-gold" : "bg-card/90 text-primary"
                    }`}
                  >
                    {course.premium ? "Premium" : "Free"}
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <p className="text-sm text-muted-foreground">Instructor</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary shadow-gold">
                      {course.instructor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{course.instructor.name}</p>
                      <p className="text-xs text-muted-foreground">{course.instructor.title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-background py-16">
        <div className="container grid max-w-6xl gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-3xl font-bold text-primary">About this course</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{course.description}</p>

            <h3 className="mt-10 text-xl font-bold text-primary">What you'll learn</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm text-primary">{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="rounded-2xl border bg-card p-6 shadow-card h-fit">
            <h3 className="text-base font-bold text-primary">Who this is for</h3>
            <ul className="mt-4 space-y-2">
              {course.audience.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Includes</p>
              <ul className="mt-3 space-y-2 text-sm text-primary">
                <li className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> {course.lessons} on-demand lessons</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" /> {course.duration} of video</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Certificate of completion</li>
                <li className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Community access</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Syllabus */}
      <section id="syllabus" className="bg-surface py-20">
        <div className="container max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-primary">Course syllabus</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            {course.modules.length} modules · {course.lessons} lessons · {course.duration}
          </p>
          <div className="mt-10 space-y-5">
            {course.modules.map((m, mi) => (
              <div key={m.title} className="rounded-2xl border bg-card p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Module {mi + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-primary">{m.title}</h3>
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {m.lessons.length} lessons
                  </span>
                </div>
                <ul className="mt-5 divide-y border-t">
                  {m.lessons.map((l, li) => (
                    <li key={l.title} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                          <Play className="h-3.5 w-3.5 translate-x-px fill-accent text-accent" />
                        </div>
                        <span className="truncate text-sm text-primary">
                          {li + 1}. {l.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{l.duration}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="bg-background py-16">
        <div className="container max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold text-primary">More courses</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((c) => (
              <Link
                key={c.slug}
                to={`/academy/${c.slug}`}
                className="group rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover"
              >
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-accent">{c.category}</p>
                <p className="mt-1 text-sm font-bold text-primary">{c.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">{c.lessons} lessons · {c.duration}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-hero py-16 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
        </div>
        <div className="container relative max-w-2xl">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to start {course.title}?</h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/70">
            Join thousands of marketers building real campaigns with NexusFlo24 Academy.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={`/register?plan=academy&intent=enroll&course=${course.slug}`}>
              <Button size="lg" className="group h-12 bg-gradient-gold px-7 text-primary shadow-gold hover:opacity-95">
                <span className="font-semibold">
                  {course.premium ? "Enroll Now" : "Start Free"}
                </span>
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/academy">
              <Button size="lg" variant="outline" className="h-12 border-accent/40 bg-transparent px-7 text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
                Browse All Courses
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-primary-foreground/50">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </Layout>
  );
};

export default AcademyCourse;
