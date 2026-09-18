/**
 * NexusFlo Voice — phone number management (Milestone 8).
 *
 * Provider-agnostic surface, Twilio Programmable Voice as the first provider.
 * Every write is workspace-admin only and checked against the workspace's
 * voice entitlement. Live call answering is not enabled yet, so numbers are
 * pointed at the inbound webhook only once the gateway exists — until then the
 * routing status is reported honestly as "pending".
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";

/** Flipped on in Milestone 9, once the Cloud Run gateway is deployed. */
// Live calling turns on by itself once the gateway and its signing key exist.
const gatewayConfigured = () => {
  const url = (Deno.env.get("VOICE_GATEWAY_URL") || "").trim();
  const key = (Deno.env.get("VOICE_GATEWAY_SIGNING_KEY") || "").trim();
  return url.length > 8 && key.length >= 16;
};
const VOICE_LIVE_CALLING_ENABLED = gatewayConfigured();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface TwilioCreds {
  accountSid: string;
  authToken: string;
  source: "workspace" | "platform";
  accountName?: string | null;
  reachable?: boolean;
}


/**
 * Prefer the workspace's own telephone account, fall back to the platform
 * account when the workspace one is missing or no longer active.
 */
async function resolveTwilio(workspaceId: string): Promise<TwilioCreds | null> {
  const creds = await resolveChannelCredentials(workspaceId, "sms", {
    account_sid: Deno.env.get("TWILIO_ACCOUNT_SID"),
    auth_token: Deno.env.get("TWILIO_AUTH_TOKEN"),
  });

  const candidates: TwilioCreds[] = [];
  const push = (sid?: string | null, tok?: string | null, source: "workspace" | "platform" = "platform") => {
    const accountSid = String(sid || "").trim();
    const authToken = String(tok || "").trim();
    if (!accountSid || !authToken) return;
    if (candidates.some((c) => c.accountSid === accountSid)) return;
    candidates.push({ accountSid, authToken, source });
  };
  push(creds.config.account_sid, creds.config.auth_token, creds.source === "workspace" ? "workspace" : "platform");
  push(Deno.env.get("TWILIO_ACCOUNT_SID"), Deno.env.get("TWILIO_AUTH_TOKEN"), "platform");
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const probe = await twilio(candidate, ".json");
    if (probe.ok && probe.data?.status !== "suspended" && probe.data?.status !== "closed") {
      return { ...candidate, accountName: probe.data?.friendly_name ?? null, reachable: true };
    }
  }
  return { ...candidates[0], reachable: false };
}


async function twilio(
  creds: TwilioCreds,
  path: string,
  init?: { method?: string; body?: Record<string, string> },
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}${path}`;
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: "Basic " + btoa(`${creds.accountSid}:${creds.authToken}`),
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init?.body ? new URLSearchParams(init.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) console.error(`[voice-numbers] Twilio ${path} failed [${res.status}]: ${text}`);
  return { ok: res.ok, status: res.status, data };
}

function providerMessage(data: any, fallback: string): string {
  return typeof data?.message === "string" && data.message ? data.message : fallback;
}

const inboundWebhookUrl = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1/voice-inbound-call`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const workspaceId = String(body.workspace_id || "");
    if (!workspaceId) return json({ error: "workspace_id is required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- auth: workspace admin (or platform admin) ----------------------
    const auth = req.headers.get("Authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const { data: platformAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: wsAdmin } = await admin.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    const { data: wsMember } = await admin.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    const isAdmin = platformAdmin === true || wsAdmin === true;
    if (!isAdmin && wsMember !== true) return json({ error: "Forbidden" }, 403);
    const requireAdmin = () =>
      isAdmin ? null : json({ error: "Only workspace admins can change phone numbers" }, 403);

    // --- entitlement ----------------------------------------------------
    const { data: settings } = await admin
      .from("voice_settings")
      .select("max_numbers, enabled")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const maxNumbers = Number(settings?.max_numbers ?? 1);

    const countNumbers = async () => {
      const { count } = await admin
        .from("voice_phone_numbers")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      return count ?? 0;
    };

    const creds = await resolveTwilio(workspaceId);

    // --- status ---------------------------------------------------------
    if (action === "status") {
      return json({
        ok: true,
        connected: creds?.reachable === true,
        credentials_found: !!creds,
        credentials_source: creds?.source ?? null,
        account_name: creds?.accountName ?? null,
        live_calling_enabled: VOICE_LIVE_CALLING_ENABLED,
        webhook_url: inboundWebhookUrl(),
        max_numbers: maxNumbers,
        numbers_in_use: await countNumbers(),
      });
    }

    if (!creds || creds.reachable !== true) {
      return json(
        {
          error: "Your telephone account isn't connected yet. Add working details in Settings → Channels.",
          code: "not_connected",
        },
        400,
      );
    }


    // --- search available numbers ---------------------------------------
    if (action === "search") {
      const country = String(body.country || "GB").toUpperCase().slice(0, 2);
      const type = body.number_type === "Mobile" ? "Mobile" : "Local";
      const params = new URLSearchParams({ VoiceEnabled: "true", PageSize: "10" });
      if (body.contains) params.set("Contains", String(body.contains).trim());
      if (body.area_code) params.set("AreaCode", String(body.area_code).replace(/\D/g, ""));
      const res = await twilio(creds, `/AvailablePhoneNumbers/${country}/${type}.json?${params}`);
      if (!res.ok) {
        return json(
          { error: providerMessage(res.data, "Could not search for numbers"), status: res.status },
          res.status,
        );
      }
      const results = (res.data?.available_phone_numbers ?? []).map((n: any) => ({
        phone_number: n.phone_number,
        friendly_name: n.friendly_name,
        locality: n.locality ?? null,
        region: n.region ?? null,
        country: n.iso_country ?? country,
        capabilities: n.capabilities ?? {},
      }));
      return json({ ok: true, results });
    }

    // --- list numbers already on the Twilio account ----------------------
    if (action === "list_provider_numbers") {
      const res = await twilio(creds, "/IncomingPhoneNumbers.json?PageSize=50");
      if (!res.ok) {
        return json(
          { error: providerMessage(res.data, "Could not read your Twilio numbers"), status: res.status },
          res.status,
        );
      }
      const { data: existing } = await admin
        .from("voice_phone_numbers")
        .select("provider_sid")
        .eq("workspace_id", workspaceId);
      const used = new Set((existing ?? []).map((r: any) => r.provider_sid));
      const results = (res.data?.incoming_phone_numbers ?? [])
        .filter((n: any) => n.capabilities?.voice === true)
        .map((n: any) => ({
          sid: n.sid,
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          country: n.iso_country ?? null,
          capabilities: n.capabilities ?? {},
          already_added: used.has(n.sid),
        }));
      return json({ ok: true, results });
    }

    // --- buy a new number -------------------------------------------------
    if (action === "buy") {
      const denied = requireAdmin();
      if (denied) return denied;
      const phoneNumber = String(body.phone_number || "").trim();
      if (!/^\+[1-9]\d{6,15}$/.test(phoneNumber)) {
        return json({ error: "Enter the number in full international format, e.g. +442012345678" }, 400);
      }
      if ((await countNumbers()) >= maxNumbers) {
        return json(
          { error: `Your plan allows ${maxNumbers} phone number${maxNumbers === 1 ? "" : "s"}.`, code: "limit_reached" },
          403,
        );
      }
      const form: Record<string, string> = {
        PhoneNumber: phoneNumber,
        FriendlyName: `NexusFlo Voice — ${phoneNumber}`,
      };
      if (VOICE_LIVE_CALLING_ENABLED) {
        form.VoiceUrl = inboundWebhookUrl();
        form.VoiceMethod = "POST";
      }
      const res = await twilio(creds, "/IncomingPhoneNumbers.json", { method: "POST", body: form });
      if (!res.ok) {
        return json(
          { error: providerMessage(res.data, "Could not buy that number"), status: res.status },
          res.status,
        );
      }
      const { data: row, error } = await admin
        .from("voice_phone_numbers")
        .insert({
          workspace_id: workspaceId,
          phone_number: res.data.phone_number,
          provider: "twilio",
          provider_sid: res.data.sid,
          country: res.data.iso_country ?? null,
          capabilities: res.data.capabilities ?? {},
          webhook_status: VOICE_LIVE_CALLING_ENABLED ? "configured" : "pending",
          status: "inactive",
          assistant_id: body.assistant_id ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, number: row });
    }

    // --- import a number already on the account ---------------------------
    if (action === "import") {
      const denied = requireAdmin();
      if (denied) return denied;
      const sid = String(body.provider_sid || "").trim();
      if (!sid) return json({ error: "provider_sid is required" }, 400);
      if ((await countNumbers()) >= maxNumbers) {
        return json(
          { error: `Your plan allows ${maxNumbers} phone number${maxNumbers === 1 ? "" : "s"}.`, code: "limit_reached" },
          403,
        );
      }
      const res = await twilio(creds, `/IncomingPhoneNumbers/${sid}.json`);
      if (!res.ok) {
        return json({ error: providerMessage(res.data, "Could not find that number"), status: res.status }, res.status);
      }
      if (res.data?.capabilities?.voice !== true) {
        return json({ error: "That number cannot take calls — choose a voice-capable number." }, 400);
      }
      const { data: row, error } = await admin
        .from("voice_phone_numbers")
        .insert({
          workspace_id: workspaceId,
          phone_number: res.data.phone_number,
          provider: "twilio",
          provider_sid: res.data.sid,
          country: res.data.iso_country ?? null,
          capabilities: res.data.capabilities ?? {},
          webhook_status: "pending",
          status: "inactive",
          assistant_id: body.assistant_id ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, number: row });
    }

    // --- everything below works on one stored number ----------------------
    const numberId = String(body.number_id || "");
    if (!numberId) return json({ error: "Unknown action" }, 400);
    const { data: number } = await admin
      .from("voice_phone_numbers")
      .select("*")
      .eq("id", numberId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!number) return json({ error: "Number not found" }, 404);

    if (action === "assign") {
      const denied = requireAdmin();
      if (denied) return denied;
      const assistantId = body.assistant_id ? String(body.assistant_id) : null;
      if (assistantId) {
        const { data: assistant } = await admin
          .from("voice_assistants")
          .select("id")
          .eq("id", assistantId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (!assistant) return json({ error: "Assistant not found" }, 404);
      }
      const { data: row, error } = await admin
        .from("voice_phone_numbers")
        .update({ assistant_id: assistantId })
        .eq("id", numberId)
        .select("*")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, number: row });
    }

    if (action === "check_routing") {
      if (!number.provider_sid) return json({ error: "This number has no provider reference" }, 400);
      const res = await twilio(creds, `/IncomingPhoneNumbers/${number.provider_sid}.json`);
      if (!res.ok) {
        await admin.from("voice_phone_numbers").update({ webhook_status: "error" }).eq("id", numberId);
        return json({ error: providerMessage(res.data, "Could not reach the provider"), status: res.status }, res.status);
      }
      const expected = inboundWebhookUrl();
      const current = String(res.data?.voice_url || "");
      const status = !VOICE_LIVE_CALLING_ENABLED
        ? "pending"
        : current === expected
          ? "configured"
          : "not_configured";
      await admin
        .from("voice_phone_numbers")
        .update({ webhook_status: status, capabilities: res.data?.capabilities ?? number.capabilities })
        .eq("id", numberId);
      return json({ ok: true, webhook_status: status, current_voice_url: current || null, expected_voice_url: expected });
    }

    if (action === "configure_routing") {
      const denied = requireAdmin();
      if (denied) return denied;
      if (!VOICE_LIVE_CALLING_ENABLED) {
        return json(
          {
            error: "Call routing is switched on once the calling service is connected.",
            code: "live_calling_disabled",
          },
          409,
        );
      }
      const res = await twilio(creds, `/IncomingPhoneNumbers/${number.provider_sid}.json`, {
        method: "POST",
        body: { VoiceUrl: inboundWebhookUrl(), VoiceMethod: "POST" },
      });
      if (!res.ok) {
        return json({ error: providerMessage(res.data, "Could not set up call routing"), status: res.status }, res.status);
      }
      await admin.from("voice_phone_numbers").update({ webhook_status: "configured" }).eq("id", numberId);
      return json({ ok: true, webhook_status: "configured" });
    }

    if (action === "release") {
      const denied = requireAdmin();
      if (denied) return denied;
      const releaseAtProvider = body.release_at_provider !== false;
      if (releaseAtProvider && number.provider_sid) {
        const res = await twilio(creds, `/IncomingPhoneNumbers/${number.provider_sid}.json`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          return json({ error: providerMessage(res.data, "Could not release the number"), status: res.status }, res.status);
        }
      }
      const { error } = await admin.from("voice_phone_numbers").delete().eq("id", numberId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, released: releaseAtProvider });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[voice-numbers] error", err);
    return json({ error: (err as Error)?.message || "Failed" }, 500);
  }
});
