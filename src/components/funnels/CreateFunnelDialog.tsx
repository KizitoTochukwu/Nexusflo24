import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCreateFunnel, OBJECTIVE_OPTIONS, STEP_TYPE_OPTIONS } from "@/hooks/useFunnels";
import { Badge } from "@/components/ui/badge";

const DEFAULT_STEPS: Record<string, string[]> = {
  lead_capture: ["landing", "optin", "thankyou"],
  webinar: ["landing", "optin", "thankyou"],
  product_sale: ["landing", "sales", "checkout", "thankyou"],
  upsell: ["sales", "upsell", "checkout", "thankyou"],
  booking: ["landing", "optin", "thankyou"],
};

export default function CreateFunnelDialog() {
  const workspaceId = useWorkspaceId();
  const createFunnel = useCreateFunnel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("lead_capture");

  const suggestedSteps = DEFAULT_STEPS[objective] || DEFAULT_STEPS.lead_capture;

  const handleSubmit = () => {
    if (!name.trim()) return;
    createFunnel.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim(),
        description,
        objective,
        steps: suggestedSteps.map((st) => ({ step_type: st })),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setDescription("");
          setObjective("lead_capture");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Funnel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Funnel Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Launch Funnel" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description…" rows={2} />
          </div>
          <div>
            <Label>Objective</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OBJECTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Suggested Steps</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {suggestedSteps.map((st, i) => {
                const label = STEP_TYPE_OPTIONS.find((o) => o.value === st)?.label || st;
                return (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {i + 1}. {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createFunnel.isPending}>
            {createFunnel.isPending ? "Creating…" : "Create Funnel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
