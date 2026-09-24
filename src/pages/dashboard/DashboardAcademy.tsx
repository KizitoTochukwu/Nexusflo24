import { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, GraduationCap, Lock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { usePlanGating } from "@/hooks/usePlanGating";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  courses, getCourseBySlug, lessonKey, PREMIUM_ACADEMY_TIERS, PREMIUM_ACADEMY_LABEL, type Course,
} from "@/data/academyCourses";

function useAcademyProgress(userId?: string) {
  return useQuery({
    queryKey: ["academy-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_progress")
        .select("course_slug, lesson_key, completed_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function toEmbed(url?: string) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function DashboardAcademy() {
  const { slug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const wsId = useWorkspaceId();
  const { tier, isAdmin, loading: planLoading } = usePlanGating();
  const progress = useAcademyProgress(user?.id);
  const canPremium = isAdmin || (PREMIUM_ACADEMY_TIERS as readonly string[]).includes(tier);

  const done = useMemo(() => {
    const m = new Map<string, Set<string>>();
    (progress.data ?? []).forEach((r) => {
      if (!m.has(r.course_slug)) m.set(r.course_slug, new Set());
      m.get(r.course_slug)!.add(r.lesson_key);
    });
    return m;
  }, [progress.data]);

  const course = getCourseBySlug(slug);
  if (slug && !course) {
    return <div className="p-6"><p className="text-sm text-muted-foreground">Course not found.</p><Link className="text-accent" to={`/dashboard/${wsId}/academy`}>Back to Academy</Link></div>;
  }

  if (course) {
    return (
      <CoursePlayer
        course={course}
        wsId={wsId}
        userId={user?.id}
        completed={done.get(course.slug) ?? new Set()}
        locked={course.premium && !canPremium && !planLoading}
      />
    );
  }

  const lastSlug = [...(progress.data ?? [])].sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0]?.course_slug;
  const lastCourse = getCourseBySlug(lastSlug);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><GraduationCap className="h-6 w-6 text-accent" /> Academy</h1>
        <p className="text-sm text-muted-foreground">Learn marketing automation at your own pace. Premium courses are included with the {PREMIUM_ACADEMY_LABEL}.</p>
      </div>

      {progress.error && <p className="text-sm text-destructive">Couldn't load your progress. Please refresh.</p>}

      {lastCourse && (
        <Card className="border-accent/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Continue where you left off</p>
              <p className="font-semibold">{lastCourse.title}</p>
            </div>
            <Button asChild><Link to={`/dashboard/${wsId}/academy/${lastCourse.slug}`}>Continue</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => {
          const n = done.get(c.slug)?.size ?? 0;
          const pct = Math.round((n / c.lessons) * 100);
          const locked = c.premium && !canPremium;
          return (
            <Link key={c.slug} to={`/dashboard/${wsId}/academy/${c.slug}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-card-hover">
                <img src={c.image} alt={c.title} loading="lazy" className="h-32 w-full object-cover" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.category}</Badge>
                    {c.premium && <Badge className="bg-accent/15 text-accent">{locked ? <><Lock className="mr-1 h-3 w-3" />Premium</> : "Premium"}</Badge>}
                  </div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <CardDescription>{c.lessons} lessons · {c.duration}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{n}/{c.lessons} complete</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CoursePlayer({ course, wsId, userId, completed, locked }: {
  course: Course; wsId: string; userId?: string; completed: Set<string>; locked: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const flat = course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, key: lessonKey(mi, li), module: m.title })));
  const params = new URLSearchParams(window.location.search);
  const current = flat.find((l) => l.key === params.get("lesson")) ?? flat.find((l) => !completed.has(l.key)) ?? flat[0];
  const pct = Math.round((completed.size / flat.length) * 100);

  const toggle = useMutation({
    mutationFn: async ({ key, isDone }: { key: string; isDone: boolean }) => {
      if (!userId) throw new Error("Not signed in");
      if (isDone) {
        const { error } = await supabase.from("academy_progress").delete()
          .eq("user_id", userId).eq("course_slug", course.slug).eq("lesson_key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academy_progress")
          .upsert({ user_id: userId, course_slug: course.slug, lesson_key: key }, { onConflict: "user_id,course_slug,lesson_key" });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["academy-progress", userId] });
      if (!v.isDone) {
        const next = flat[flat.findIndex((l) => l.key === v.key) + 1];
        if (next) navigate(`?lesson=${next.key}`, { replace: true });
        else toast.success("Course complete — well done!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const embed = toEmbed(current?.videoUrl);
  const isDone = current ? completed.has(current.key) : false;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link to={`/dashboard/${wsId}/academy`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> All courses
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.tagline}</p>
        </div>
        <div className="w-48 space-y-1">
          <Progress value={pct} className="h-2" />
          <p className="text-right text-xs text-muted-foreground">{pct}% complete</p>
        </div>
      </div>

      {locked ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Lock className="h-8 w-8 text-accent" />
            <p className="font-semibold">This is a Premium course</p>
            <p className="max-w-md text-sm text-muted-foreground">Premium Academy courses are included with the {PREMIUM_ACADEMY_LABEL}. Upgrade to unlock every lesson.</p>
            <Button asChild><Link to={`/dashboard/${wsId}/settings?tab=billing`}>Upgrade plan</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="aspect-video overflow-hidden rounded-lg bg-primary">
                {embed ? (
                  <iframe src={embed} title={current?.title} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-primary-foreground/70">
                    <PlayCircle className="h-12 w-12 text-accent" />
                    <p className="text-sm">Lesson video coming soon</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{current?.module}</p>
                  <p className="font-semibold">{current?.title} <span className="text-xs font-normal text-muted-foreground">({current?.duration})</span></p>
                </div>
                <Button
                  variant={isDone ? "outline" : "default"}
                  disabled={toggle.isPending || !current}
                  onClick={() => current && toggle.mutate({ key: current.key, isDone })}
                >
                  {isDone ? "Mark as not done" : "Mark complete"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
              {course.modules.map((m, mi) => (
                <div key={mi}>
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.title}</p>
                  <ul className="mt-1">
                    {m.lessons.map((l, li) => {
                      const key = lessonKey(mi, li);
                      const active = key === current?.key;
                      return (
                        <li key={key}>
                          <Link
                            to={`?lesson=${key}`}
                            replace
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-accent/10 font-medium" : "hover:bg-muted"}`}
                          >
                            {completed.has(key) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className="flex-1">{l.title}</span>
                            <span className="text-xs text-muted-foreground">{l.duration}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
