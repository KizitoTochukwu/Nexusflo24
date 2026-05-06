// Shared helper: detect provider auth/credential failures and emit a workspace
// notification (deduped to once per 6h per workspace+channel) so the user is
// alerted immediately when sends start failing because of bad credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Channel = "email" | "sms" | "whatsapp";

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const CHANNEL_FIX: Record<Channel, string> = {
  email:
    "Open Settings → Channels → Email and paste a valid Resend API key (or contact support if using the platform key).",
  sms:
    "Open Settings → Channels → SMS and verify your Twilio Account SID and Auth Token.",
  whatsapp:
    "Open Settings → Channels → WhatsApp and verify your Access Token and Phone Number ID.",
};

export function isCredentialError(channel: Channel, message: string, statusCode?: number): boolean {
  const m = String(message || "").toLowerCase();
  if (statusCode === 401 || statusCode === 403) return true;
  if (channel === "email") {
    return /api\s*key\s*is\s*invalid|invalid_api_key|missing api key|unauthorized|invalid api key/i.test(m);
  }
  if (channel === "sms") {
    return /authenticate|authentication error|invalid username|invalid access token|20003|20404/i.test(m);
  }
  if (channel === "whatsapp") {
    // Graph API auth/permission codes: 190 (invalid token), 200 (permission), 10 (permission), 100 (param/token)
    return /invalid oauth|access token|session has expired|permissions error|\(#190\)|\(#200\)|\(#10\)/i.test(m);
  }
  return false;
}

/**
 * Emit a workspace-level notification when a provider credential failure is detected.
 * Deduped: skips if a `channel_error` notification for the same workspace+channel
 * was created within the last 6 hours.
 */
export async function notifyCredentialFailure(opts: {
  workspaceId: string;
  channel: Channel;
  errorMessage: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { workspaceId, channel, errorMessage, meta } = opts;
  if (!workspaceId) return;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve target user (workspace owner) for notification
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle();
    const userId = ws?.owner_user_id;
    if (!userId) return;

    // Dedup: skip if we already notified this workspace+channel in last 6h
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("notifications")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("type", "channel_error")
      .gte("created_at", sixHoursAgo)
      .contains("meta", { channel })
      .limit(1);

    if (recent && recent.length > 0) return;

    const label = CHANNEL_LABEL[channel];
    await admin.from("notifications").insert({
      workspace_id: workspaceId,
      user_id: userId,
      title: `${label} sending paused — invalid provider credentials`,
      body: `${label} sends are failing: "${errorMessage.slice(0, 180)}". ${CHANNEL_FIX[channel]}`,
      type: "channel_error",
      meta: { channel, error: errorMessage.slice(0, 500), ...(meta || {}) },
    });
  } catch (e) {
    console.error("notifyCredentialFailure error:", (e as Error)?.message);
  }
}
