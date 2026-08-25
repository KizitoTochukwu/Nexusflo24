// Shared helpers for the multi-tenant Commerce (storefront) edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export const SITE_URL = Deno.env.get("SITE_URL") || "https://nexusflo24.com";

/** Resolve the calling user from the Authorization header, or null. */
export async function callerUserId(req: Request, admin: any): Promise<string | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error) return null;
    return data?.user?.id ?? null;
  } catch (_e) {
    return null;
  }
}

/** True when the caller may manage commerce settings for the workspace. */
export async function canManageCommerce(admin: any, userId: string, workspaceId: string) {
  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return ["owner", "admin", "commerce_manager"].includes(data?.role ?? "");
}

/** Zero-decimal currencies must not be multiplied by 100 again. */
export function stripeCurrency(code: string) {
  return (code || "GBP").toLowerCase();
}

export function orderNumber() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NF-${stamp}-${rand}`;
}

export function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAmount(amountMinor: number, currency: string) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦" };
  const sym = symbols[currency?.toUpperCase()] ?? `${currency?.toUpperCase()} `;
  return `${sym}${(amountMinor / 100).toFixed(2)}`;
}

/** Log a commerce event other modules (CRM, automations) can consume later. */
export async function logCommerceEvent(
  admin: any,
  row: {
    workspace_id: string;
    store_id?: string | null;
    event_type: string;
    order_id?: string | null;
    customer_id?: string | null;
    contact_id?: string | null;
    product_id?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  try {
    await admin.from("commerce_events").insert({ payload: {}, ...row });
  } catch (err) {
    console.error("[shop] commerce event log failed", err);
  }
}
