import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCoursePrice, type AcademyCourse } from "@/hooks/useAcademy";

export default function EnrolDialog({ course, open, onOpenChange }: { course: AcademyCourse; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: (user?.user_metadata?.full_name as string) ?? "",
    email: user?.email ?? "",
    phone: "", businessType: "", goals: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const price = formatCoursePrice(course);
  const paid = course.priceMinor > 0;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("academy-enrol", { body: { courseSlug: course.slug, ...form } });
    setBusy(false);
    const msg = (data as any)?.error;
    if (error || msg) return toast.error(msg || "Couldn't submit. Please try again.");
    if ((data as any)?.url) { window.location.href = (data as any).url; return; }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDone(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a live class: {course.title}</DialogTitle>
          <DialogDescription>
            Fill in your details{paid ? `, pay ${price}` : ""}, and we'll contact you to agree a live class date that suits you.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-2 py-4 text-center">
            <p className="font-semibold">You're enrolled!</p>
            <p className="text-sm text-muted-foreground">We'll email {form.email} shortly to agree your live class date.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Full name *</Label><Input required value={form.fullName} onChange={set("fullName")} /></div>
              <div><Label>Email *</Label><Input required type="email" value={form.email} onChange={set("email")} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
              <div><Label>Business type</Label><Input placeholder="e.g. Online retailer" value={form.businessType} onChange={set("businessType")} /></div>
            </div>
            <div><Label>What do you want to learn?</Label><Textarea rows={3} value={form.goals} onChange={set("goals")} /></div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : paid ? `Continue to payment (${price})` : "Enrol for free"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {paid ? "Secure payments via Stripe. " : ""}The class date is agreed with you after enrolment.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
