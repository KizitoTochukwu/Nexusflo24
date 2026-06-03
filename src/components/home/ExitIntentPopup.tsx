import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";
import { useExitIntent } from "@/hooks/useExitIntent";
import exitPopupIcon from "@/assets/exit-popup-icon.jpeg.asset.json";

const ExitIntentPopup = () => {
  const { open, setOpen, markDismissed, markConverted } = useExitIntent(true);
  const { capture, loading } = useCaptureLead();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    try {
      await capture({
        email: email.trim().toLowerCase(),
        source: "exit_intent_homepage",
        tags: ["quick-start-guide", "exit-intent"],
        notes: "Captured via homepage exit-intent popup",
        formId: "exit_intent_homepage",
        page: "/",
        lead_destination: {
          source: "exit_intent_homepage",
          apply_tags: ["quick-start-guide"],
        },
      });
      markConverted();
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (submitted) {
        setOpen(false);
      } else {
        markDismissed();
      }
    } else {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-0 shadow-[0_30px_80px_-20px_hsl(213_70%_14%/0.45)] rounded-2xl">
        {/* Decorative gold gradient header */}
        <div className="relative bg-hero px-8 pt-8 pb-14 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,hsl(46_67%_52%/0.5),transparent_60%)]" />
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-center gap-2 text-accent text-xs font-semibold tracking-[0.18em] uppercase">
            <span className="h-px w-6 bg-accent/60" />
            Exclusive offer
          </div>
        </div>

        {/* Floating icon badge */}
        <div className="relative -mt-10 mx-auto h-20 w-20 rounded-2xl overflow-hidden shadow-gold ring-4 ring-background">
          {submitted ? (
            <div className="h-full w-full bg-gradient-gold flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
          ) : (
            <img src={exitPopupIcon.url} alt="NexusFlo24" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="px-8 pb-8 pt-4">
          {!submitted ? (
            <>
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl font-bold text-primary tracking-tight leading-tight">
                  Wait — don't leave empty-handed
                </h2>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  Get our free <span className="font-semibold text-primary">2-minute Quick Start guide</span> and learn how to capture, nurture, and convert leads on autopilot.
                </p>
              </div>

              {/* Value pills */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { icon: Zap, label: "AI-powered" },
                  { icon: Clock, label: "2-min read" },
                  { icon: ShieldCheck, label: "100% free" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3"
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-[11px] font-medium text-primary">{label}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-12 px-4 rounded-xl border-border focus-visible:ring-accent/40 focus-visible:border-accent text-[15px]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-gold text-primary font-semibold text-[15px] hover:opacity-95 shadow-gold transition-all hover:translate-y-[-1px] text-slate-50 bg-[#0b0c28]"
                >
                  {loading ? "Sending..." : "Send me the Quick Start"}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    No credit card · Unsubscribe anytime
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markDismissed}
                  className="block mx-auto text-xs text-muted-foreground/70 hover:text-primary underline-offset-4 hover:underline transition-colors pt-1"
                >
                  No thanks, I'll explore on my own
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-5 py-2">
              <div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">Check your inbox!</h2>
                <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
                  Your Quick Start guide is on its way. While you wait, get a head start:
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link to="/register">
                  <Button className="w-full h-12 rounded-xl bg-gradient-gold text-primary font-semibold text-[15px] hover:opacity-95 shadow-gold transition-all hover:translate-y-[-1px] text-slate-50 bg-[#0b0c28]">
                    Start your free trial
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/academy">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-border hover:bg-surface">
                    Browse the Academy
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
