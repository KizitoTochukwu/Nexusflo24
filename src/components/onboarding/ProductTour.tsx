import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LayoutDashboard, Users, Megaphone, Workflow, CalendarDays, BarChart3, Sparkles } from "lucide-react";
import { useOnboarding, useSaveOnboarding } from "@/hooks/useOnboarding";

export const OPEN_TOUR_EVENT = "nexusflo:open-tour";

const TOUR = [
  { icon: LayoutDashboard, title: "Your command centre", body: "The overview shows leads, engagement and revenue at a glance, plus your Getting Started checklist." },
  { icon: Users, title: "CRM & pipeline", body: "Every lead lands here. Use folders, smart lists and the pipeline board to track deals to close." },
  { icon: Megaphone, title: "Campaigns", body: "Send email, WhatsApp and SMS broadcasts to segments of your list — with credits tracked per send." },
  { icon: Workflow, title: "Automations", body: "Trigger follow-up the moment a lead is captured, tagged or books a call. Describe it in plain English with AI." },
  { icon: CalendarDays, title: "Bookings", body: "Publish booking pages, sync your calendar and send automatic confirmations and reminders." },
  { icon: BarChart3, title: "Analytics", body: "See what's converting across capture, nurture and close — and export the numbers any time." },
];

const ProductTour = ({ workspaceId }: { workspaceId: string }) => {
  const { data: record } = useOnboarding(workspaceId);
  const save = useSaveOnboarding(workspaceId);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("nexusflo_start_tour") === "1") {
      sessionStorage.removeItem("nexusflo_start_tour");
      setI(0);
      setOpen(true);
      return;
    }
    if (record && record.completed && !record.tour_completed) {
      setI(0);
      setOpen(true);
    }
  }, [record]);

  useEffect(() => {
    const handler = () => { setI(0); setOpen(true); };
    window.addEventListener(OPEN_TOUR_EVENT, handler);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, handler);
  }, []);

  const finish = () => {
    setOpen(false);
    save.mutate({ tour_completed: true } as any);
  };

  const step = TOUR[i];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Product tour · {i + 1}/{TOUR.length}
        </div>
        <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-foreground">{step.title}</h2>
        <p className="text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex gap-1.5">
          {TOUR.map((_, idx) => (
            <span key={idx} className={`h-1.5 flex-1 rounded-full ${idx <= i ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={finish}>Skip tour</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setI(i - 1)}>Back</Button>}
            <Button className="flex-1 sm:flex-none" onClick={() => (i === TOUR.length - 1 ? finish() : setI(i + 1))}>
              {i === TOUR.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductTour;
