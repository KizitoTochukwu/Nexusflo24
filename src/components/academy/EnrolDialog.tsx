import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_LIST, type CurrencyCode } from "@/lib/currency/config";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocalCoursePrice, type AcademyCourse } from "@/hooks/useAcademy";
import { cn } from "@/lib/utils";

export default function EnrolDialog({ course, open, onOpenChange }: { course: AcademyCourse; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [form, setForm] = useState({
    fullName: (user?.user_metadata?.full_name as string) ?? "",
    email: user?.email ?? "",
    phone: "", businessType: "", goals: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const price = useLocalCoursePrice(course).label;
  const paid = course.priceMinor > 0;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("academy-enrol", { body: { courseSlug: course.slug, currency, ...form } });
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
            Fill in your details{paid ? `, pay ${price}` : ""}, then pick a live class time that suits you.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-2 py-4 text-center">
            <p className="font-semibold">You're enrolled!</p>
            <p className="text-sm text-muted-foreground">We'll email {form.email} shortly with your class booking link.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {paid && (
              <div>
                <Label>Pay in</Label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {CURRENCY_LIST.map((c) => (
                    <button type="button" key={c.code} onClick={() => setCurrency(c.code as CurrencyCode)}
                      className={cn("rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                        currency === c.code ? "border-accent bg-accent/10 text-primary" : "text-muted-foreground hover:border-accent/50")}>
                      {c.symbol} {c.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              {paid ? (currency === "NGN" ? "Secure Naira payments via Paystack. " : "Secure payments via Stripe. ") : ""}You'll choose your class date after enrolment.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
