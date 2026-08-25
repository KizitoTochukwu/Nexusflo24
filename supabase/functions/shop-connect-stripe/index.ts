// Stripe Connect (Standard) onboarding for workspace storefronts.
// Sellers connect their own Stripe account; NexusFlo24 only stores the account id.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient, callerUserId, canManageCommerce, corsHeaders, json, SITE_URL } from "../_shared/shop.ts";

const CLIENT_ID = Deno.env.get("STRIPE_CONNECT_CLIENT_ID") || "";
const SECRET = Deno.env.get("STRIPE_SECRET_KEY") || "";

const encoder = new TextEncoder();

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeState(workspaceId: string) {
  const payload = `${workspaceId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

async function readState(state: string) {
  const parts = (state || "").split(".");
  if (parts.length !== 3) return null;
  const [workspaceId, ts, sig] = parts;
  if (await sign(`${workspaceId}.${ts}`) !== sig) return null;
  if (Date.now() - Number(ts) > 1000 * 60 * 30) return null;
  return workspaceId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = adminClient();
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const workspaceIdInput = String(body.workspaceId || "");

    const userId = await callerUserId(req, admin);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    if (action === "start") {
      if (!CLIENT_ID) {
        return json({
          error: "Stripe Connect is not configured yet. Add STRIPE_CONNECT_CLIENT_ID to enable seller payouts.",
        }, 400);
      }
      if (!await canManageCommerce(admin, userId, workspaceIdInput)) return json({ error: "Forbidden" }, 403);

      const state = await makeState(workspaceIdInput);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: "read_write",
        state,
        redirect_uri: `${SITE_URL}/stripe/connect/callback`,
      });
      return json({ url: `https://connect.stripe.com/oauth/authorize?${params.toString()}` });
    }

    if (action === "callback") {
      const workspaceId = await readState(String(body.state || ""));
      if (!workspaceId) return json({ error: "This connection link has expired. Please try again." }, 400);
      if (!await canManageCommerce(admin, userId, workspaceId)) return json({ error: "Forbidden" }, 403);

      const stripe = new Stripe(SECRET, { apiVersion: "2025-08-27.basil" });
      const token = await stripe.oauth.token({
        grant_type: "authorization_code",
        code: String(body.code || ""),
      });
      const accountId = token.stripe_user_id as string;
      const account = await stripe.accounts.retrieve(accountId);

      const { error } = await admin.from("seller_payment_accounts").upsert({
        workspace_id: workspaceId,
        provider: "stripe",
        stripe_account_id: accountId,
        livemode: Boolean(token.livemode),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
        default_currency: account.default_currency ?? null,
        country: account.country ?? null,
        connected_by: userId,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });
      if (error) throw error;

      return json({ ok: true, workspaceId, accountId, charges_enabled: Boolean(account.charges_enabled) });
    }

    if (action === "refresh" || action === "disconnect") {
      if (!await canManageCommerce(admin, userId, workspaceIdInput)) return json({ error: "Forbidden" }, 403);
      const { data: acct } = await admin
        .from("seller_payment_accounts")
        .select("stripe_account_id")
        .eq("workspace_id", workspaceIdInput)
        .maybeSingle();
      if (!acct?.stripe_account_id) return json({ error: "No Stripe account connected." }, 404);

      const stripe = new Stripe(SECRET, { apiVersion: "2025-08-27.basil" });

      if (action === "disconnect") {
        try {
          await stripe.oauth.deauthorize({ client_id: CLIENT_ID, stripe_user_id: acct.stripe_account_id });
        } catch (err) {
          console.error("[shop-connect-stripe] deauthorize failed", err);
        }
        await admin.from("seller_payment_accounts").update({
          stripe_account_id: null,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          disconnected_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceIdInput);
        return json({ ok: true, disconnected: true });
      }

      const account = await stripe.accounts.retrieve(acct.stripe_account_id);
      await admin.from("seller_payment_accounts").update({
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
        default_currency: account.default_currency ?? null,
        country: account.country ?? null,
        last_synced_at: new Date().toISOString(),
      }).eq("workspace_id", workspaceIdInput);

      return json({
        ok: true,
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shop-connect-stripe] error", message);
    return json({ error: message }, 500);
  }
});
