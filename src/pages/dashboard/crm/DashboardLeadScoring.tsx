import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gauge, Plus, RotateCcw, Save, Trash2, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useLeadScoringSettings, useSaveLeadScoringSettings } from "@/hooks/useLeadScoringSettings";
import {
  BUILT_IN_ACTIVITIES,
  DEFAULT_CONFIG,
  LeadScoringConfig,
  SCORING_PRESETS,
  activityLabel,
  slugifyActivity,
  validateConfig,
} from "@/lib/crm/leadScoring";

const DashboardLeadScoring = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { canManage } = useWorkspaceRole();
  const { data, isLoading } = useLeadScoringSettings(workspaceId);
  const save = useSaveLeadScoringSettings(workspaceId);

  const [config, setConfig] = useState<LeadScoringConfig>(DEFAULT_CONFIG);
  const [newActivity, setNewActivity] = useState("");

  useEffect(() => {
    if (data) setConfig(data);
  }, [data]);

  const customKeys = useMemo(
    () => Object.keys(config.rules).filter((k) => !BUILT_IN_ACTIVITIES.some((a) => a.key === k)),
    [config.rules],
  );

  const setPoints = (key: string, raw: string) => {
    const value = raw === "" || raw === "-" ? 0 : Number(raw);
    if (Number.isNaN(value)) return;
    setConfig((c) => ({ ...c, rules: { ...c.rules, [key]: value } }));
  };

  const addActivity = () => {
    const label = newActivity.trim();
    if (!label) return;
    const key = slugifyActivity(label);
    if (!key) return;
    if (config.rules[key] !== undefined) {
      toast.error("That activity already exists");
      return;
    }
    setConfig((c) => ({
      ...c,
      rules: { ...c.rules, [key]: 10 },
      custom_labels: { ...c.custom_labels, [key]: label },
    }));
    setNewActivity("");
  };

  const removeActivity = (key: string) => {
    setConfig((c) => {
      const rules = { ...c.rules };
      const custom_labels = { ...c.custom_labels };
      delete rules[key];
      delete custom_labels[key];
      return { ...c, rules, custom_labels };
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = SCORING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((c) => ({
      ...c,
      rules: { ...preset.config.rules, ...Object.fromEntries(customKeys.map((k) => [k, c.rules[k]])) },
      bands: { ...preset.config.bands },
      decay: { ...preset.config.decay },
    }));
    toast.success(`${preset.name} applied — review and save`);
  };

  const handleSave = () => {
    const error = validateConfig(config);
    if (error) {
      toast.error(error);
      return;
    }
    save.mutate(config);
  };

  const rows = [
    ...BUILT_IN_ACTIVITIES.map((a) => ({ key: a.key, label: a.label, custom: false })),
    ...customKeys.map((k) => ({ key: k, label: activityLabel(k, config.custom_labels), custom: true })),
  ];

  return (
    <div className="space-y-6">
      <Seo
        title="Lead Scoring Settings | NexusFlo24 CRM"
        description="Set your own lead scoring points, status bands and score decay to match how your business qualifies leads."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lead Scoring Settings</h1>
            <p className="text-sm text-muted-foreground">
              Tune the points, bands and decay so scoring matches your business.
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setConfig(DEFAULT_CONFIG)}>
              <RotateCcw className="h-4 w-4" /> Reset to defaults
            </Button>
            <Button className="gap-1.5" onClick={handleSave} disabled={save.isPending || isLoading}>
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </div>

      {!canManage && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          You can view these settings. Ask a workspace owner or admin to change them.
        </p>
      )}

      <Card className="rounded-xl">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-base font-semibold">Start from a business type</h2>
            <p className="text-sm text-muted-foreground">
              Fills in sensible points and bands — you can still fine-tune everything below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCORING_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage}
                title={p.description}
                onClick={() => applyPreset(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold">Activity points</h2>
              <p className="text-sm text-muted-foreground">
                Applied the moment an activity is recorded on a lead. Set 0 to switch an activity off.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={String(config.rules[r.key] ?? 0)}
                      disabled={!canManage}
                      onChange={(e) => setPoints(r.key, e.target.value)}
                    />
                    {r.custom && canManage && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeActivity(r.key)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm">Add a custom activity</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Quote requested"
                  value={newActivity}
                  disabled={!canManage}
                  onChange={(e) => setNewActivity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActivity();
                    }
                  }}
                />
                <Button variant="outline" className="gap-1.5" disabled={!canManage} onClick={addActivity}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Custom activities score when an automation or integration records that activity type on a lead.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-base font-semibold">Status bands</h2>
                <p className="text-sm text-muted-foreground">Lead status follows the score automatically.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <Badge className="bg-destructive/10 text-destructive" variant="secondary">Hot</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Score from</span>
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={String(config.bands.hot)}
                      disabled={!canManage}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, bands: { ...c.bands, hot: Number(e.target.value || 0) } }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <Badge className="bg-accent/15 text-accent-foreground" variant="secondary">Warm</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Score from</span>
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={String(config.bands.warm)}
                      disabled={!canManage}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, bands: { ...c.bands, warm: Number(e.target.value || 0) } }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Badge className="bg-muted text-muted-foreground" variant="secondary">New</Badge>
                  <span className="text-sm text-muted-foreground">
                    Score 0 – {Math.max(0, config.bands.warm - 1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold">Score decay</h2>
                </div>
                <Switch
                  checked={config.decay.enabled}
                  disabled={!canManage}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, decay: { ...c.decay, enabled: v } }))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Quiet leads lose points and are re-banded, so your hot list stays honest.
              </p>

              {config.decay.enabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Inactive for (days)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={String(config.decay.days)}
                      disabled={!canManage}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, decay: { ...c.decay, days: Number(e.target.value || 0) } }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Points removed</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={String(config.decay.points)}
                      disabled={!canManage}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, decay: { ...c.decay, points: Number(e.target.value || 0) } }))
                      }
                    />
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => navigate(`/dashboard/${workspaceId}/automations`)}
              >
                Build score-based automations <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardLeadScoring;
