import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  workspaceId: string;
  channel: "whatsapp" | "sms" | "email";
  value?: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}

export function SenderProfilePicker({ workspaceId, channel, value, onChange, label = "Send as" }: Props) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["approved-senders", workspaceId, channel],
    queryFn: async () => {
      const { data } = await supabase
        .from("sender_profiles" as any)
        .select("id, label, display_name, address, is_default")
        .eq("workspace_id", workspaceId)
        .eq("channel", channel)
        .eq("status", "approved")
        .order("is_default", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!workspaceId,
  });

  if (profiles.length === 0) {
    return <p className="text-xs text-muted-foreground">No approved {channel} senders. Workspace will use platform defaults.</p>;
  }

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value || "__default__"} onValueChange={(v) => onChange(v === "__default__" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="Default sender" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__default__">Default (workspace)</SelectItem>
          {profiles.map((p: any) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}{p.is_default ? " ★" : ""} — <span className="font-mono">{p.address}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
