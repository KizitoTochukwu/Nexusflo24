// Protected access to a call recording: members get a short-lived link,
// workspace admins can delete the recording and its stored file.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";

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
    const recordingId = String(body.recording_id || "").trim();
    const action = String(body.action || "link").trim();
    if (!/^[0-9a-f-]{36}$/i.test(recordingId)) {
      return json({ error: "A valid recording_id is required" }, 400);
    }

    const { data: rec } = await admin
      .from("voice_call_recordings")
      .select("id, workspace_id, storage_path, deleted_at")
      .eq("id", recordingId)
      .maybeSingle();
    if (!rec || rec.deleted_at) return json({ error: "Recording not found" }, 404);

    const denied = await requireInternalOrWorkspaceMember(req, admin, rec.workspace_id);
    if (denied) return denied;

    if (action === "delete") {
      // Deleting is an admin action; the row policy enforces this for members,
      // so check membership role explicitly here.
      const auth = req.headers.get("authorization") || "";
      const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
      if (token) {
        const { data: userData } = await admin.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: isAdmin } = await admin.rpc("is_workspace_admin", {
            _user_id: userId,
            _workspace_id: rec.workspace_id,
          });
          const { data: isPlatformAdmin } = await admin.rpc("has_role", {
            _user_id: userId,
            _role: "admin",
          });
          if (isAdmin !== true && isPlatformAdmin !== true) {
            return json({ error: "Only workspace admins can delete recordings" }, 403);
          }
        }
      }
      await admin.storage.from("voice-recordings").remove([rec.storage_path]);
      await admin
        .from("voice_call_recordings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", rec.id);
      return json({ ok: true, deleted: true });
    }

    const { data: signed, error } = await admin.storage
      .from("voice-recordings")
      .createSignedUrl(rec.storage_path, 600);
    if (error) return json({ error: "Recording file is unavailable" }, 404);
    return json({ ok: true, url: signed?.signedUrl, expires_in: 600 });
  } catch (err) {
    console.error("[voice-recording-access] error", err);
    return json({ error: "Could not open this recording" }, 500);
  }
});
