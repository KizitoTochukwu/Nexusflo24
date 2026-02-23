import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/planLimits";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredPlan?: PlanTier;
}

const features = [
  { label: "Leads", free: "100", pro: "Unlimited", agency: "Unlimited" },
  { label: "Funnels", free: "1", pro: "5", agency: "Unlimited" },
  { label: "Campaigns", free: "1", pro: "Unlimited", agency: "Unlimited" },
  { label: "WhatsApp Automation", free: false, pro: true, agency: true },
  { label: "AI Copy Generation", free: "10/day", pro: "Unlimited", agency: "Unlimited" },
  { label: "Behaviour Triggers", free: false, pro: true, agency: true },
  { label: "Advanced Analytics", free: false, pro: false, agency: true },
  { label: "Multi-Workspace", free: false, pro: false, agency: true },
  { label: "White-Label Branding", free: false, pro: false, agency: true },
  { label: "Team Invites", free: false, pro: false, agency: true },
  { label: "API Access", free: false, pro: false, agency: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-xs font-medium">{value}</span>;
  return value ? <Check className="h-4 w-4 text-accent mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
}

export default function UpgradeModal({ open, onOpenChange, feature, requiredPlan }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-accent" />
            Upgrade to Unlock
          </DialogTitle>
          <DialogDescription>
            {feature
              ? `"${feature}" requires a ${requiredPlan === "agency" ? "Agency" : "Pro"} plan.`
              : "Compare plans and choose the right one for your business."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium text-muted-foreground">Feature</th>
                <th className="py-2 text-center font-medium text-muted-foreground">Free</th>
                <th className="py-2 text-center font-medium text-accent">Pro</th>
                <th className="py-2 text-center font-medium">
                  <span className="text-gradient-gold">Agency</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-2.5 text-xs font-medium">{f.label}</td>
                  <td className="py-2.5 text-center"><Cell value={f.free} /></td>
                  <td className="py-2.5 text-center"><Cell value={f.pro} /></td>
                  <td className="py-2.5 text-center"><Cell value={f.agency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link to="/pricing" onClick={() => onOpenChange(false)}>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              View Pricing & Upgrade
            </Button>
          </Link>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
