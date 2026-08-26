import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Ctx = {
  admin: ReturnType<typeof createClient>;
  actorId: string;
  reason: string;
  correlationId: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function audit(
  ctx: Ctx,
  entry: {
    action: string;
    entity_type?: string;
    entity_id?: string;
    workspace_id?: string | null;
    before_summary?: unknown;
    after_summary?: unknown;
    result?: string;
  },
) {
  await ctx.admin.from("platform_audit_logs").insert({
    actor_user_id: ctx.actorId,
    action: entry.action,
    entity_type: entry.entity_type ?? null,
    entity_id: entry.entity_id ?? null,
    workspace_id: entry.workspace_id ?? null,
    before_summary: entry.before_summary ?? null,
    after_summary: entry.after_summary ?? null,
    reason: ctx.reason,
    result: entry.result ?? "success",
    correlation_id: ctx.correlationId,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const actorId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const reason = String(body.reason ?? "").trim();
    const payload = body.payload ?? {};
    const correlationId = crypto.randomUUID();

    if (!action) return json({ error: "Missing action" }, 400);
    if (reason.length < 5) return json({ error: "A written reason (min 5 characters) is required" }, 400);

    const requires: Record<string, string> = {
      suspend_user: "platform.users.suspend",
      reactivate_user: "platform.users.suspend",
      send_password_reset: "platform.users.read",
      assign_platform_role: "platform.roles.manage",
      revoke_platform_role: "platform.roles.manage",
      adjust_credits: "platform.credits.adjust",
      start_support_session: "platform.support.access",
      end_support_session: "platform.support.access",
    };
    const permission = requires[action];
    if (!permission) return json({ error: "Unknown action" }, 400);

    const { data: allowed, error: permErr } = await admin.rpc("has_platform_permission", {
      _user_id: actorId,
      _key: permission,
    });
    if (permErr) return json({ error: "Permission check failed" }, 500);
    if (allowed !== true) return json({ error: "Permission denied" }, 403);

    const ctx: Ctx = { admin, actorId, reason, correlationId };

    switch (action) {
      case "suspend_user":
      case "reactivate_user": {
        const userId = String(payload.user_id ?? "");
        if (!userId) return json({ error: "user_id required" }, 400);
        if (userId === actorId) return json({ error: "You cannot change your own account status" }, 400);
        const suspend = action === "suspend_user";

        const { data: before } = await admin
          .from("profiles").select("account_status").eq("id", userId).maybeSingle();

        const { error } = await admin
          .from("profiles")
          .update({
            account_status: suspend ? "suspended" : "active",
            suspended_at: suspend ? new Date().toISOString() : null,
            suspension_reason: suspend ? reason : null,
          })
          .eq("id", userId);
        if (error) throw error;

        // Suspension also revokes active sessions so access stops immediately.
        if (suspend) await admin.auth.admin.signOut(userId, "global").catch(() => {});

        await audit(ctx, {
          action,
          entity_type: "user",
          entity_id: userId,
          before_summary: before ?? null,
          after_summary: { account_status: suspend ? "suspended" : "active" },
        });
        return json({ success: true, correlation_id: correlationId });
      }

      case "send_password_reset": {
        const email = String(payload.email ?? "");
        if (!email) return json({ error: "email required" }, 400);
        const { error } = await admin.auth.admin.generateLink({ type: "recovery", email });
        if (error) throw error;
        await audit(ctx, { action, entity_type: "user", entity_id: email });
        return json({ success: true, correlation_id: correlationId });
      }

      case "assign_platform_role":
      case "revoke_platform_role": {
        const userId = String(payload.user_id ?? "");
        const role = String(payload.role ?? "");
        if (!userId || !role) return json({ error: "user_id and role required" }, 400);
        if (userId === actorId) return json({ error: "You cannot change your own platform roles" }, 400);

        if (action === "assign_platform_role") {
          const { error } = await admin
            .from("platform_staff_assignments")
            .upsert(
              { user_id: userId, role, is_active: true, granted_by: actorId, reason, revoked_at: null },
              { onConflict: "user_id,role" },
            );
          if (error) throw error;
        } else {
          const { count } = await admin
            .from("platform_staff_assignments")
            .select("id", { count: "exact", head: true })
            .eq("role", "super_admin")
            .eq("is_active", true);
          if (role === "super_admin" && (count ?? 0) <= 1) {
            return json({ error: "Cannot remove the last active Super Admin" }, 400);
          }
          const { error } = await admin
            .from("platform_staff_assignments")
            .update({ is_active: false, revoked_at: new Date().toISOString(), reason })
            .eq("user_id", userId)
            .eq("role", role);
          if (error) throw error;
        }

        await audit(ctx, {
          action,
          entity_type: "platform_role",
          entity_id: userId,
          after_summary: { role, active: action === "assign_platform_role" },
        });
        return json({ success: true, correlation_id: correlationId });
      }

      case "adjust_credits": {
        const workspaceId = String(payload.workspace_id ?? "");
        const quantity = Number(payload.quantity ?? 0);
        const category = String(payload.category ?? "email");
        const columns: Record<string, string> = {
          email: "email_balance",
          sms: "sms_balance",
          whatsapp: "whatsapp_balance",
        };
        const column = columns[category];
        if (!column) return json({ error: "category must be email, sms or whatsapp" }, 400);
        if (!workspaceId || !Number.isFinite(quantity) || quantity === 0) {
          return json({ error: "workspace_id and a non-zero quantity are required" }, 400);
        }

        const { data: current } = await admin
          .from("message_credits")
          .select(`id, ${column}`)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        const previous = Number((current as Record<string, unknown> | null)?.[column] ?? 0);
        const next = Math.max(previous + quantity, 0);

        if (current?.id) {
          const { error } = await admin.from("message_credits").update({ [column]: next }).eq("id", current.id);
          if (error) throw error;
        } else {
          const { error } = await admin
            .from("message_credits")
            .insert({ workspace_id: workspaceId, [column]: next });
          if (error) throw error;
        }


        const { error: ledgerErr } = await admin.from("credit_adjustment_ledger").insert({
          workspace_id: workspaceId,
          category,
          adjustment_type: quantity > 0 ? "grant" : "deduction",
          quantity,
          previous_balance: previous,
          new_balance: next,
          reason,
          source: "platform_admin",
          actor_user_id: actorId,
          correlation_id: correlationId,
        });
        if (ledgerErr) throw ledgerErr;

        await audit(ctx, {
          action,
          entity_type: "workspace",
          entity_id: workspaceId,
          workspace_id: workspaceId,
          before_summary: { balance: previous },
          after_summary: { balance: next },
        });
        return json({ success: true, previous_balance: previous, new_balance: next, correlation_id: correlationId });
      }

      case "start_support_session": {
        const workspaceId = String(payload.workspace_id ?? "");
        const minutes = Math.min(Math.max(Number(payload.minutes ?? 60), 5), 480);
        if (!workspaceId) return json({ error: "workspace_id required" }, 400);
        const expires = new Date(Date.now() + minutes * 60_000).toISOString();
        const { data, error } = await admin
          .from("platform_support_access_sessions")
          .insert({
            staff_user_id: actorId,
            workspace_id: workspaceId,
            reason,
            read_only: payload.read_only !== false,
            expires_at: expires,
          })
          .select("id, expires_at")
          .maybeSingle();
        if (error) throw error;
        await audit(ctx, {
          action,
          entity_type: "workspace",
          entity_id: workspaceId,
          workspace_id: workspaceId,
          after_summary: { expires_at: expires, read_only: payload.read_only !== false },
        });
        return json({ success: true, session: data, correlation_id: correlationId });
      }

      case "end_support_session": {
        const sessionId = String(payload.session_id ?? "");
        if (!sessionId) return json({ error: "session_id required" }, 400);
        const { error } = await admin
          .from("platform_support_access_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("staff_user_id", actorId);
        if (error) throw error;
        await audit(ctx, { action, entity_type: "support_session", entity_id: sessionId });
        return json({ success: true, correlation_id: correlationId });
      }
    }

    return json({ error: "Unhandled action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[platform-admin-action]", message);
    return json({ error: message }, 500);
  }
});
