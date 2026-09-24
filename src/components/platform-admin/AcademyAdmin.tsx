import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Module } from "@/data/academyCourses";
import type { AcademyCourseRow } from "@/hooks/useAcademy";
import { ENROLMENT_STATUS_LABEL } from "@/hooks/useAcademy";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = supabase as any;

/* ---------- module text format ---------- */
// "## Module title" then one lesson per line: "Lesson title | 10m | https://video-link"
export function modulesToText(mods: Module[]) {
  return mods.map((m) => [`## ${m.title}`, ...m.lessons.map((l) => [l.title, l.duration, l.videoUrl].filter(Boolean).join(" | "))].join("\n")).join("\n\n");
}
export function textToModules(text: string): Module[] {
  const mods: Module[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("##")) { mods.push({ title: line.replace(/^#+\s*/, ""), lessons: [] }); continue; }
    if (!mods.length) mods.push({ title: "Module 1", lessons: [] });
    const [title, duration = "", videoUrl = ""] = line.split("|").map((s) => s.trim());
    mods[mods.length - 1].lessons.push({ title, duration, ...(videoUrl ? { videoUrl } : {}) });
  }
  return mods;
}

type Draft = {
  id?: string; slug: string; title: string; category: string; duration: string; premium: boolean;
  price: string; currency: string; image: string; tagline: string; description: string;
  outcomes: string; audience: string; instructor_name: string; instructor_title: string;
  modulesText: string; published: boolean; position: number;
};
const emptyDraft = (position: number): Draft => ({
  slug: "", title: "", category: "", duration: "", premium: false, price: "0", currency: "GBP", image: "",
  tagline: "", description: "", outcomes: "", audience: "", instructor_name: "", instructor_title: "",
  modulesText: "## Module 1\nFirst lesson | 10m", published: false, position,
});
const toDraft = (r: AcademyCourseRow): Draft => ({
  id: r.id, slug: r.slug, title: r.title, category: r.category, duration: r.duration, premium: r.premium,
  price: (r.price_minor / 100).toString(), currency: r.currency, image: r.image, tagline: r.tagline,
  description: r.description, outcomes: (r.outcomes ?? []).join("\n"), audience: (r.audience ?? []).join("\n"),
  instructor_name: r.instructor_name, instructor_title: r.instructor_title,
  modulesText: modulesToText(r.modules ?? []), published: r.published, position: r.position,
});
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function AcademyCoursesAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-academy-courses"],
    queryFn: async () => {
      const { data, error } = await db.from("academy_courses").select("*").order("position");
      if (error) throw error;
      return (data ?? []) as AcademyCourseRow[];
    },
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-academy-courses"] }); qc.invalidateQueries({ queryKey: ["academy-courses"] }); };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const price = Math.round(parseFloat(d.price || "0") * 100);
      if (!d.title.trim()) throw new Error("Title is required");
      if (Number.isNaN(price) || price < 0) throw new Error("Enter a valid price");
      if (d.premium && price <= 0) throw new Error("Premium courses need a price above 0");
      const row = {
        slug: slugify(d.slug || d.title), title: d.title.trim(), category: d.category.trim() || "General",
        duration: d.duration.trim(), premium: d.premium, price_minor: d.premium ? price : 0, currency: d.currency,
        image: d.image.trim(), tagline: d.tagline.trim(), description: d.description.trim(),
        outcomes: d.outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
        audience: d.audience.split("\n").map((s) => s.trim()).filter(Boolean),
        instructor_name: d.instructor_name.trim(), instructor_title: d.instructor_title.trim(),
        modules: textToModules(d.modulesText), published: d.published, position: d.position,
      };
      const { error } = d.id ? await db.from("academy_courses").update(row).eq("id", d.id) : await db.from("academy_courses").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Course saved"); setDraft(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("academy_courses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Course deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const togglePublish = useMutation({
    mutationFn: async (r: AcademyCourseRow) => { const { error } = await db.from("academy_courses").update({ published: !r.published }).eq("id", r.id); if (error) throw error; },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => d && { ...d, [k]: e.target.value });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base">Courses</CardTitle>
          <CardDescription>Add and edit courses, lessons, video links, prices and visibility. Changes go live immediately.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft(emptyDraft(q.data?.length ?? 0))}><Plus className="mr-1 h-4 w-4" />New course</Button>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingBlock rows={3} /> : q.error ? <ErrorBlock error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyBlock title="No courses yet" /> : (
          <ul className="divide-y text-sm">
            {q.data.map((c) => {
              const lessons = (c.modules ?? []).reduce((a, m) => a + (m.lessons?.length ?? 0), 0);
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.title}
                      {c.premium ? <Badge className="ml-2 border-accent/30 bg-accent/10 text-accent">{c.currency} {(c.price_minor / 100).toFixed(2)}</Badge> : <Badge variant="outline" className="ml-2">Free</Badge>}
                      {!c.published && <Badge variant="secondary" className="ml-2">Draft</Badge>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{c.category} · {(c.modules ?? []).length} modules · {lessons} lessons · /academy/{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={c.published} onCheckedChange={() => togglePublish.mutate(c)} aria-label="Published" />
                    <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(c))} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => confirm(`Delete "${c.title}"? This cannot be undone.`) && remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Title *</Label><Input value={draft.title} onChange={set("title")} /></div>
              <div><Label>Web address (slug)</Label><Input placeholder={slugify(draft.title) || "auto"} value={draft.slug} onChange={set("slug")} /></div>
              <div><Label>Category</Label><Input value={draft.category} onChange={set("category")} /></div>
              <div><Label>Duration</Label><Input placeholder="e.g. 2h 30m" value={draft.duration} onChange={set("duration")} /></div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch checked={draft.premium} onCheckedChange={(v) => setDraft({ ...draft, premium: v })} />
                <div><p className="text-sm font-medium">Premium (paid)</p><p className="text-xs text-muted-foreground">Students pay this price to enrol and book a live class.</p></div>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <div><Label>Price</Label><Input type="number" min="0" step="0.01" disabled={!draft.premium} value={draft.price} onChange={set("price")} /></div>
                <div><Label>Currency</Label>
                  <Select value={draft.currency} onValueChange={(v) => setDraft({ ...draft, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["GBP", "USD", "EUR", "NGN"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="sm:col-span-2"><Label>Image link</Label><Input value={draft.image} onChange={set("image")} /></div>
              <div className="sm:col-span-2"><Label>Tagline</Label><Input value={draft.tagline} onChange={set("tagline")} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={draft.description} onChange={set("description")} /></div>
              <div><Label>What you'll learn (one per line)</Label><Textarea rows={4} value={draft.outcomes} onChange={set("outcomes")} /></div>
              <div><Label>Who it's for (one per line)</Label><Textarea rows={4} value={draft.audience} onChange={set("audience")} /></div>
              <div><Label>Instructor name</Label><Input value={draft.instructor_name} onChange={set("instructor_name")} /></div>
              <div><Label>Instructor title</Label><Input value={draft.instructor_title} onChange={set("instructor_title")} /></div>
              <div className="sm:col-span-2">
                <Label>Modules & lessons</Label>
                <p className="mb-1 text-xs text-muted-foreground">Start each module with "## Module name". Then one lesson per line: <code>Lesson title | 10m | video link (optional)</code></p>
                <Textarea rows={12} className="font-mono text-xs" value={draft.modulesText} onChange={set("modulesText")} />
                <p className="mt-1 text-xs text-muted-foreground">{textToModules(draft.modulesText).length} modules · {textToModules(draft.modulesText).reduce((a, m) => a + m.lessons.length, 0)} lessons</p>
              </div>
              <div className="flex items-center gap-3"><Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} /><Label>Published (visible to the public)</Label></div>
              <div><Label>Display order</Label><Input type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: parseInt(e.target.value || "0") })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => draft && save.mutate(draft)}>{save.isPending ? "Saving…" : "Save course"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function AcademyEnrolmentsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-academy-enrolments"],
    queryFn: async () => {
      const { data, error } = await db.from("academy_enrolments").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await db.from("academy_enrolments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enrolment updated"); qc.invalidateQueries({ queryKey: ["admin-academy-enrolments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Enrolments & live classes</CardTitle>
        <CardDescription>Everyone who filled the enrolment form. After payment, agree a date with the student and record it here.</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingBlock rows={3} /> : q.error ? <ErrorBlock error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyBlock title="No enrolments yet" /> : (
          <ul className="divide-y text-sm">
            {q.data.map((e) => (
              <li key={e.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-medium">{e.full_name} <span className="font-normal text-muted-foreground">· {e.course_title}</span></p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.email}{e.phone ? ` · ${e.phone}` : ""}{e.business_type ? ` · ${e.business_type}` : ""} · {e.amount_minor > 0 ? `${e.currency} ${(e.amount_minor / 100).toFixed(2)}` : "Free"} · {new Date(e.created_at).toLocaleDateString("en-GB")}
                  </p>
                  {e.goals && <p className="mt-1 text-xs text-muted-foreground">"{e.goals}"</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="datetime-local" className="h-8 w-52" defaultValue={toLocal(e.agreed_date)}
                    onBlur={(ev) => {
                      const v = ev.target.value;
                      if (toLocal(e.agreed_date) === v) return;
                      update.mutate({ id: e.id, patch: v ? { agreed_date: new Date(v).toISOString(), ...(e.status === "awaiting_date" ? { status: "scheduled" } : {}) } : { agreed_date: null } });
                    }}
                  />
                  <Select value={e.status} onValueChange={(v) => update.mutate({ id: e.id, patch: { status: v } })}>
                    <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ENROLMENT_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AcademyTestimonialsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-academy-testimonials"],
    queryFn: async () => {
      const { data, error } = await db.from("academy_testimonials").select("*").order("position");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const [draft, setDraft] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-academy-testimonials"] }); qc.invalidateQueries({ queryKey: ["academy-testimonials"] }); };
  const save = useMutation({
    mutationFn: async (d: any) => {
      if (!d.name?.trim() || !d.quote?.trim()) throw new Error("Name and quote are required");
      const row = { name: d.name.trim(), role: d.role?.trim() ?? "", quote: d.quote.trim(), published: d.published, position: d.position ?? 0 };
      const { error } = d.id ? await db.from("academy_testimonials").update(row).eq("id", d.id) : await db.from("academy_testimonials").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Testimonial saved"); setDraft(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("academy_testimonials").delete().eq("id", id); if (error) throw error; },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div><CardTitle className="text-base">Testimonials</CardTitle><CardDescription>Shown in "What Students Say" on the Academy page.</CardDescription></div>
        <Button size="sm" onClick={() => setDraft({ name: "", role: "", quote: "", published: true, position: q.data?.length ?? 0 })}><Plus className="mr-1 h-4 w-4" />New testimonial</Button>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingBlock rows={3} /> : q.error ? <ErrorBlock error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyBlock title="No testimonials yet" /> : (
          <ul className="divide-y text-sm">
            {q.data.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span>{!t.published && <Badge variant="secondary" className="ml-2">Hidden</Badge>}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{t.quote}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setDraft(t)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => confirm("Delete this testimonial?") && remove.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit testimonial" : "New testimonial"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                <div><Label>Role</Label><Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></div>
              </div>
              <div><Label>Quote *</Label><Textarea rows={5} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} /></div>
              <div className="flex items-center gap-3"><Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} /><Label>Show on Academy page</Label></div>
              <div><Label>Display order</Label><Input type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: parseInt(e.target.value || "0") })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
