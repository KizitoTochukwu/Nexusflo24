import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePlatformAction, usePlatformSettings } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type PendingSave = { key: string; value: any; label: string } | null;

export default function PlatformSettings() {
  const settings = usePlatformSettings();
  const action = usePlatformAction();
  const [pending, setPending] = useState<PendingSave>(null);

  const maintenance = (settings.data ?? []).find((s) => s.key === "maintenance")?.value as any;
  const defaults = (settings.data ?? []).find((s) => s.key === "defaults")?.value as any;

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [trialDays, setTrialDays] = useState("14");

  useEffect(() => {
    if (maintenance) {
      setMaintenanceEnabled(!!maintenance.enabled);
      setMaintenanceMessage(maintenance.message ?? "");
    }
  }, [maintenance?.enabled, maintenance?.message]);

  useEffect(() => {
    if (defaults?.trial_days != null) setTrialDays(String(defaults.trial_days));
  }, [defaults?.trial_days]);

  const save = (key: string, value: any, label: string) => setPending({ key, value, label });

  return (
    <div>
      <PageHeader
        title="Platform Settings"
        description="Global platform defaults. Every change is validated, reasoned and audited."
      />

      {settings.isLoading ? (
        <LoadingBlock rows={3} />
      ) : settings.error ? (
        <ErrorBlock error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Maintenance mode</CardTitle>
              <CardDescription>Shows a banner across every workspace dashboard while enabled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance-toggle">Banner enabled</Label>
                <Switch id="maintenance-toggle" checked={maintenanceEnabled} onCheckedChange={setMaintenanceEnabled} />
              </div>
              <div>
                <Label htmlFor="maintenance-message">Message</Label>
                <Input
                  id="maintenance-message"
                  className="mt-1"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Scheduled maintenance tonight 23:00–23:30 UTC."
                />
              </div>
              <Button
                onClick={() => save("maintenance", { enabled: maintenanceEnabled, message: maintenanceMessage }, "maintenance settings")}
              >
                Save maintenance settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Platform defaults</CardTitle>
              <CardDescription>Defaults applied to new sign-ups. Existing accounts are unaffected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trial-days">Default trial length (days)</Label>
                <Input
                  id="trial-days"
                  className="mt-1"
                  type="number"
                  min={0}
                  max={90}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  const days = Number(trialDays);
                  if (!Number.isInteger(days) || days < 0 || days > 90) {
                    toast.error("Trial days must be a whole number between 0 and 90");
                    return;
                  }
                  save("defaults", { ...defaults, trial_days: days }, "platform defaults");
                }}
              >
                Save defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <HighRiskActionDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title="Update platform settings"
        description={`Apply changes to ${pending?.label}. This takes effect platform-wide.`}
        confirmLabel="Save settings"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "update_platform_settings", reason, payload: { key: pending!.key, value: pending!.value } },
            {
              onSuccess: () => {
                toast.success("Settings saved");
                setPending(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}
