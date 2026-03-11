import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlanTier } from "@/lib/billing/planLimits";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredPlan?: PlanTier;
}

const features = [
  { label: "Contacts", starter: "250", plus: "2,500", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "Funnels", starter: "1", plus: "3", pro: "10", enterprise: "Unlimited" },
  { label: "Campaigns", starter: "2", plus: "10", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "WhatsApp", starter: false, plus: true, pro: true, enterprise: true },
  { label: "SMS", starter: false, plus: false, pro: true, enterprise: true },
  { label: "AI Copywriter", starter: "10/day", plus: "50/day", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "Behaviour Triggers", starter: false, plus: true, pro: true, enterprise: true },
  { label: "Advanced Analytics", starter: false, plus: false, pro: true, enterprise: true },
  { label: "Multi-Workspace", starter: false, plus: false, pro: false, enterprise: true },
  { label: "White-Label", starter: false, plus: false, pro: false, enterprise: true },
  { label: "API Access", starter: false, plus: false, pro: false, enterprise: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-xs font-medium">{value}</span>;
  return value ? <Check className="h-4 w-4 text-accent mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
}

const planLabels: Record<string, string> = {
  starter: "Starter",
  plus: "Plus",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function UpgradeModal({ open, onOpenChange, feature, requiredPlan }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-accent" />
            Upgrade to Unlock
          </DialogTitle>
          <DialogDescription>
            {feature
              ? `"${feature}" requires a ${planLabels[requiredPlan || "pro"]} plan or higher.`
              : "Compare plans and choose the right one for your business."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium text-muted-foreground">Feature</th>
                <th className="py-2 text-center font-medium text-muted-foreground">Starter</th>
                <th className="py-2 text-center font-medium">Plus</th>
                <th className="py-2 text-center font-medium text-accent">Pro</th>
                <th className="py-2 text-center font-medium">
                  <span className="text-gradient-gold">Enterprise</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-2.5 text-xs font-medium">{f.label}</td>
                  <td className="py-2.5 text-center"><Cell value={f.starter} /></td>
                  <td className="py-2.5 text-center"><Cell value={f.plus} /></td>
                  <td className="py-2.5 text-center"><Cell value={f.pro} /></td>
                  <td className="py-2.5 text-center"><Cell value={f.enterprise} /></td>
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
