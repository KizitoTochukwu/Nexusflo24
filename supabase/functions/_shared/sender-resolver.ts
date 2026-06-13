import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Channel = "whatsapp" | "sms" | "email";

export interface ResolvedSender {
  profile: any;
  detail: any | null;
}

const DETAIL_TABLE: Record<Channel, string> = {
  whatsapp: "whatsapp_senders",
  sms: "sms_senders",
  email: "email_senders",
};

/**
 * Resolve a sender profile for an outbound send.
 * Returns null when the workspace has no approved profile for that channel
 * (caller should fall back to existing workspace_channel_settings path).
 * Throws when an explicit senderProfileId is given but the profile is missing/unapproved.
 */
export async function resolveSenderProfile(
  workspaceId: string,
  channel: Channel,
  senderProfileId?: string | null,
): Promise<ResolvedSender | null> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let profile: any = null;

  if (senderProfileId) {
    const { data, error } = await admin
      .from("sender_profiles")
      .select("*")
      .eq("id", senderProfileId)
      .eq("workspace_id", workspaceId)
      .eq("channel", channel)
      .maybeSingle();
    if (error) throw new Error(`sender lookup failed: ${error.message}`);
    if (!data) throw new Error("Sender profile not found in this workspace");
    if (data.status !== "approved") {
      throw new Error(`Sender profile is ${data.status}, not approved`);
    }
    profile = data;
  } else {
    // Find default approved, else first approved
    const { data: rows } = await admin
      .from("sender_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("channel", channel)
      .eq("status", "approved")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    profile = rows?.[0] ?? null;
  }

  if (!profile) return null;

  const { data: detail } = await admin
    .from(DETAIL_TABLE[channel])
    .select("*")
    .eq("sender_profile_id", profile.id)
    .maybeSingle();

  return { profile, detail: detail ?? null };
}
