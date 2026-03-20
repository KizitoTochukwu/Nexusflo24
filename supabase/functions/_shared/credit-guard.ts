import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CreditChannel = "email" | "sms" | "whatsapp";

interface DeductResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

const BALANCE_COL: Record<CreditChannel, string> = {
  email: "email_balance",
  sms: "sms_balance",
  whatsapp: "whatsapp_balance",
};

const USED_COL: Record<CreditChannel, string> = {
  email: "email_used",
  sms: "sms_used",
  whatsapp: "whatsapp_used",
};

async function isAdminUser(userId: string): Promise<boolean> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function deductCredit(
  workspaceId: string,
  channel: CreditChannel,
  referenceId?: string,
  userId?: string,
): Promise<DeductResult> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const balCol = BALANCE_COL[channel];
  const usedCol = USED_COL[channel];

  // Fetch current balance
  const { data: credits, error: fetchErr } = await adminClient
    .from("message_credits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[credit-guard] fetch error:", fetchErr);
    return { allowed: false, remaining: 0, error: "Failed to check credits" };
  }

  if (!credits) {
    // Auto-allocate starter credits for workspaces that have none yet
    const starterCredits = PLAN_CREDITS.starter;
    const { error: seedErr } = await adminClient
      .from("message_credits")
      .insert({
        workspace_id: workspaceId,
        email_balance: starterCredits.email,
        sms_balance: starterCredits.sms,
        whatsapp_balance: starterCredits.whatsapp,
      });

    if (seedErr) {
      console.error("[credit-guard] auto-seed error:", seedErr);
      return { allowed: false, remaining: 0, error: "Failed to initialise credits. Please try again." };
    }

    // Log the auto-allocation
    const channels: CreditChannel[] = ["email", "sms", "whatsapp"];
    for (const ch of channels) {
      if (starterCredits[ch] > 0) {
        await adminClient.from("credit_transactions").insert({
          workspace_id: workspaceId,
          channel: ch,
          amount: starterCredits[ch],
          reason: "plan_allocation",
          reference_id: "starter_auto_seed",
        });
      }
    }

    // Re-check: the channel we need might still be 0 (e.g. SMS on starter)
    const newBalance = starterCredits[channel] ?? 0;
    if (newBalance <= 0) {
      return { allowed: false, remaining: 0, error: `Insufficient ${channel} credits. Upgrade your plan or buy more in Settings → Usage.` };
    }

    // Continue with the freshly-seeded balance
    return deductCredit(workspaceId, channel, referenceId);
  }

  const currentBalance = (credits as Record<string, number>)[balCol] ?? 0;
  if (currentBalance <= 0) {
    return { allowed: false, remaining: 0, error: `Insufficient ${channel} credits. Buy more in Settings → Usage.` };
  }

  // Atomically decrement balance and increment used
  const { error: updateErr } = await adminClient
    .from("message_credits")
    .update({
      [balCol]: currentBalance - 1,
      [usedCol]: ((credits as Record<string, number>)[usedCol] ?? 0) + 1,
    })
    .eq("workspace_id", workspaceId)
    .eq(balCol, currentBalance); // optimistic lock

  if (updateErr) {
    console.error("[credit-guard] update error:", updateErr);
    return { allowed: false, remaining: 0, error: "Failed to deduct credit (contention). Retry." };
  }

  // Log transaction
  await adminClient.from("credit_transactions").insert({
    workspace_id: workspaceId,
    channel,
    amount: -1,
    reason: "message_sent",
    reference_id: referenceId || null,
  });

  return { allowed: true, remaining: currentBalance - 1 };
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
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Upsert credits row
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

  // Log allocations
  const channels: CreditChannel[] = ["email", "sms", "whatsapp"];
  for (const ch of channels) {
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

export async function addCredits(
  workspaceId: string,
  channel: CreditChannel,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<void> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const balCol = BALANCE_COL[channel];

  // Fetch current
  const { data: credits } = await adminClient
    .from("message_credits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (credits) {
    await adminClient
      .from("message_credits")
      .update({ [balCol]: ((credits as Record<string, number>)[balCol] ?? 0) + amount })
      .eq("workspace_id", workspaceId);
  } else {
    await adminClient
      .from("message_credits")
      .insert({
        workspace_id: workspaceId,
        [balCol]: amount,
      });
  }

  await adminClient.from("credit_transactions").insert({
    workspace_id: workspaceId,
    channel,
    amount,
    reason,
    reference_id: referenceId || null,
  });
}
