import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCESS_LABELS, PERMISSION_GROUPS, type AccessLevel } from "@/lib/mcp/capabilities";
import type { McpPermission } from "@/hooks/useAiAgentConnections";
import { ShieldAlert } from "lucide-react";

interface Props {
  permissions: McpPermission[];
  canEdit: boolean;
  onChange: (
    group: McpPermission["permission_group"],
    patch: Partial<Pick<McpPermission, "access_level" | "require_approval">>,
  ) => void;
}

export default function McpPermissionsPanel({ permissions, canEdit, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissions</CardTitle>
        <CardDescription>
          Decide what a connected AI assistant may do in each area of your workspace. Write actions in
          high-risk areas stay behind approval until you turn that off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PERMISSION_GROUPS.map((group) => {
          const perm = permissions.find((p) => p.permission_group === group.key);
          if (!perm) return null;
          return (
            <div key={group.key} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{group.label}</p>
                    {group.highRisk && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <ShieldAlert className="h-3 w-3" /> High risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
                <Select
                  value={perm.access_level}
                  disabled={!canEdit}
                  onValueChange={(v) => onChange(group.key, { access_level: v as AccessLevel })}
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCESS_LABELS) as AccessLevel[]).map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {ACCESS_LABELS[lvl]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {perm.access_level !== "none" && perm.access_level !== "view" && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <Label htmlFor={`approve-${group.key}`} className="text-sm font-normal">
                    Require approval before execution
                  </Label>
                  <Switch
                    id={`approve-${group.key}`}
                    checked={perm.require_approval}
                    disabled={!canEdit}
                    onCheckedChange={(v) => onChange(group.key, { require_approval: v })}
                  />
                </div>
              )}
            </div>
          );
        })}
        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Only workspace owners and admins can change AI assistant permissions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
