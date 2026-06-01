import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";
import { useExitIntent } from "@/hooks/useExitIntent";

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
      <DialogContent className="sm:max-w-md border-accent/30">
        {!submitted ? (
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl text-primary">Not sure where to start?</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Grab our free 2-minute <strong>Quick Start guide</strong> — we'll show you exactly how to
                capture, nurture, and convert your first leads with NexusFlo24.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
              >
                {loading ? "Sending..." : "Send me the Quick Start"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free. No credit card. Unsubscribe anytime.
              </p>
              <button
                type="button"
                onClick={markDismissed}
                className="block mx-auto text-xs text-muted-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
              >
                No thanks, I'll explore on my own
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl text-primary">Check your inbox!</DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Your Quick Start guide is on its way. While you wait, get a head start:
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/register">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
                  Start your free trial
                </Button>
              </Link>
              <Link to="/academy">
                <Button variant="outline" className="w-full">
                  Browse the Academy
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
