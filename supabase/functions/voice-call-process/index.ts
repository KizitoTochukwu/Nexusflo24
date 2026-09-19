// Post-call processing: summary, intent, sentiment, captured details,
// recording ingest and CRM sync. Runs once per call unless a re-run is asked for.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";
import { processCall } from "../_shared/voiceCallProcessing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const callSessionId = String(body.call_session_id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(callSessionId)) {
      return json({ error: "A valid call_session_id is required" }, 400);
    }

    const { data: call } = await admin
      .from("voice_call_sessions")
      .select("id, workspace_id")
      .eq("id", callSessionId)
      .maybeSingle();
    if (!call) return json({ error: "Call not found" }, 404);

    const denied = await requireInternalOrWorkspaceMember(req, admin, call.workspace_id);
    if (denied) return denied;

    const result = await processCall(admin, callSessionId, { force: body.force === true });
    return json(result);
  } catch (err) {
    console.error("[voice-call-process] error", err);
    return json({ error: "Could not process this call" }, 500);
  }
});
