import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UsageLogEntry {
  workspaceId: string;
  senderProfileId?: string | null;
  channel: "whatsapp" | "sms" | "email";
  messageId?: string | null;
  country?: string | null;
  creditsDeducted: number;
  costCents?: number | null;
  status: string;
}

export async function logCommunicationUsage(entry: UsageLogEntry): Promise<void> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin.from("communication_usage").insert({
    workspace_id: entry.workspaceId,
    sender_profile_id: entry.senderProfileId ?? null,
    channel: entry.channel,
    message_id: entry.messageId ?? null,
    country: entry.country ?? null,
    credits_deducted: entry.creditsDeducted,
    cost_cents: entry.costCents ?? null,
    status: entry.status,
  });
  if (error) console.error("[usage-logger] insert failed:", error);
}

export async function getDeductionAmount(
  channel: "whatsapp" | "sms" | "email",
  country?: string | null,
): Promise<number> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (country) {
    const { data: byCountry } = await admin
      .from("credit_pricing_rules")
      .select("credits_per_message")
      .eq("channel", channel)
      .eq("country", country.toUpperCase())
      .maybeSingle();
    if (byCountry?.credits_per_message != null) return byCountry.credits_per_message;
  }

  const { data: fallback } = await admin
    .from("credit_pricing_rules")
    .select("credits_per_message")
    .eq("channel", channel)
    .is("country", null)
    .maybeSingle();

  return fallback?.credits_per_message ?? 1;
}

/** Derive ISO-3166 country code from an E.164 phone number using a small prefix map. */
export function countryFromE164(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d]/g, "");
  if (!digits) return null;
  const prefixes: [string, string][] = [
    ["1", "US"], ["44", "GB"], ["33", "FR"], ["49", "DE"], ["34", "ES"],
    ["39", "IT"], ["31", "NL"], ["353", "IE"], ["351", "PT"], ["41", "CH"],
    ["46", "SE"], ["47", "NO"], ["45", "DK"], ["358", "FI"], ["48", "PL"],
    ["55", "BR"], ["52", "MX"], ["54", "AR"], ["56", "CL"], ["57", "CO"],
    ["91", "IN"], ["86", "CN"], ["81", "JP"], ["82", "KR"], ["62", "ID"],
    ["63", "PH"], ["65", "SG"], ["66", "TH"], ["60", "MY"], ["84", "VN"],
    ["61", "AU"], ["64", "NZ"], ["27", "ZA"], ["234", "NG"], ["254", "KE"],
    ["20", "EG"], ["971", "AE"], ["966", "SA"], ["972", "IL"], ["90", "TR"],
  ];
  // sort by length desc to match longer prefixes first
  prefixes.sort((a, b) => b[0].length - a[0].length);
  for (const [p, c] of prefixes) if (digits.startsWith(p)) return c;
  return null;
}
