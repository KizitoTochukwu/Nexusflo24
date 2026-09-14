import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CreditChannel = "email" | "sms" | "whatsapp";

interface DeductResult {
  allowed: boolean;
  remaining: number;
  unlimited?: boolean;
  error?: string;
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Still used by platform-admin tooling; NOT used to waive message charges. */
export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await admin()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** True when the workspace is flagged for unlimited (uncharged) messaging. */
export async function isWorkspaceUnlimited(workspaceId: string): Promise<boolean> {
  const { data } = await admin()
    .from("message_credits")
    .select("unlimited")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return !!(data as { unlimited?: boolean } | null)?.unlimited;
}

const CHANNEL_LABEL: Record<CreditChannel, string> = {
  email: "email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

/**
 * Atomically deduct message credits. The balance change and the ledger row are
 * written by a single database function, so concurrent sends can never collide
 * or double-charge.
 */
export async function deductCredit(
  workspaceId: string,
  channel: CreditChannel,
  referenceId?: string,
  _userId?: string,
  amount: number = 1,
): Promise<DeductResult> {
  const adminClient = admin();

  const call = async () => adminClient.rpc("deduct_message_credit", {
    _workspace_id: workspaceId,
    _channel: channel,
    _amount: amount,
    _reason: "message_sent",
    _reference_id: referenceId ?? null,
  });

  let { data, error } = await call();

  if (error) {
    console.error("[credit-guard] deduct rpc error:", error);
    return { allowed: false, remaining: 0, error: "Failed to check credits" };
  }

  let result = data as { allowed: boolean; remaining: number; status: string };

  // No credits row yet — seed starter credits once, then retry.
  if (result?.status === "no_row") {
    const starter = PLAN_CREDITS.starter;
    const { error: seedErr } = await adminClient.from("message_credits").insert({
      workspace_id: workspaceId,
      email_balance: starter.email,
      sms_balance: starter.sms,
      whatsapp_balance: starter.whatsapp,
    });
    if (seedErr && !/duplicate key/i.test(seedErr.message || "")) {
      console.error("[credit-guard] auto-seed error:", seedErr);
      return { allowed: false, remaining: 0, error: "Failed to initialise credits. Please try again." };
    }
    for (const ch of ["email", "sms", "whatsapp"] as CreditChannel[]) {
      if (starter[ch] > 0) {
        await adminClient.from("credit_transactions").insert({
          workspace_id: workspaceId,
          channel: ch,
          amount: starter[ch],
          reason: "plan_allocation",
          reference_id: "starter_auto_seed",
        });
      }
    }
    ({ data, error } = await call());
    if (error) {
      console.error("[credit-guard] deduct retry error:", error);
      return { allowed: false, remaining: 0, error: "Failed to check credits" };
    }
    result = data as { allowed: boolean; remaining: number; status: string };
  }

  if (result?.status === "unlimited") {
    return { allowed: true, remaining: -1, unlimited: true };
  }

  if (!result?.allowed) {
    return {
      allowed: false,
      remaining: result?.remaining ?? 0,
      error: `You've run out of ${CHANNEL_LABEL[channel]} credits. Top up in Settings → Usage.`,
    };
  }

  return { allowed: true, remaining: result.remaining };
}

/** Plan-included monthly credits */
export const PLAN_CREDITS: Record<string, { email: number; sms: number; whatsapp: number }> = {
  starter: { email: 500, sms: 0, whatsapp: 0 },
  plus: { email: 2500, sms: 100, whatsapp: 100 },
  pro: { email: 10000, sms: 500, whatsapp: 500 },
  enterprise: { email: 50000, sms: 2000, whatsapp: 2000 },
};

export async function allocatePlanCredits(
  workspaceId: string,
  plan: string,
  referenceId?: string,
): Promise<void> {
  const credits = PLAN_CREDITS[plan] || PLAN_CREDITS.starter;
  const adminClient = admin();

  const { error: upsertErr } = await adminClient
    .from("message_credits")
    .upsert(
      {
        workspace_id: workspaceId,
        email_balance: credits.email,
        sms_balance: credits.sms,
        whatsapp_balance: credits.whatsapp,
      },
      { onConflict: "workspace_id" },
    );

  if (upsertErr) {
    console.error("[credit-guard] allocate upsert error:", upsertErr);
    return;
  }

  for (const ch of ["email", "sms", "whatsapp"] as CreditChannel[]) {
    if (credits[ch] > 0) {
      await adminClient.from("credit_transactions").insert({
        workspace_id: workspaceId,
        channel: ch,
        amount: credits[ch],
        reason: "plan_allocation",
        reference_id: referenceId || plan,
      });
    }
  }
}

/** Atomically add credits (top-up, refund, manual adjustment). */
export async function addCredits(
  workspaceId: string,
  channel: CreditChannel,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<void> {
  if (amount <= 0) return;
  const { error } = await admin().rpc("add_message_credit", {
    _workspace_id: workspaceId,
    _channel: channel,
    _amount: amount,
    _reason: reason,
    _reference_id: referenceId ?? null,
  });
  if (error) console.error("[credit-guard] add rpc error:", error);
}
