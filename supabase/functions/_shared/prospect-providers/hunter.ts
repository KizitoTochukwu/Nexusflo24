// Hunter.io adapter — professional email verification.
// Server-only. The API key is read from the edge function environment.

const HUNTER_BASE = "https://api.hunter.io/v2";

export function hunterConfigured(): boolean {
  return !!Deno.env.get("HUNTER_API_KEY");
}

export type VerificationResult = "deliverable" | "risky" | "undeliverable" | "unknown";

export interface EmailVerification {
  email: string;
  result: VerificationResult;
  confidence: number | null;
  raw: Record<string, unknown>;
}

function mapStatus(status: string): VerificationResult {
  switch (status) {
    case "valid":
    case "deliverable":
      return "deliverable";
    case "invalid":
    case "undeliverable":
      return "undeliverable";
    case "accept_all":
    case "webmail":
    case "disposable":
    case "risky":
      return "risky";
    default:
      return "unknown";
  }
}

/** Credential probe against the account endpoint — does not consume verification credits. */
export async function hunterHealth(): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get("HUNTER_API_KEY");
  if (!key) return { ok: false, error: "No API key configured." };
  try {
    const res = await fetch(`${HUNTER_BASE}/account?api_key=${encodeURIComponent(key)}`);
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Hunter rejected the key (${res.status}): ${text.slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function hunterVerifyEmail(email: string): Promise<EmailVerification> {
  const key = Deno.env.get("HUNTER_API_KEY");
  if (!key) throw new Error("Hunter is not configured on this platform.");

  const res = await fetch(
    `${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(key)}`,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Hunter verification failed (${res.status}): ${text.slice(0, 300)}`);
  }
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("Hunter returned a response that could not be read.");
  }
  const d = body?.data ?? {};
  return {
    email,
    result: mapStatus(String(d.status ?? d.result ?? "")),
    confidence: typeof d.score === "number" ? d.score : null,
    raw: {
      status: d.status ?? null,
      result: d.result ?? null,
      score: d.score ?? null,
      disposable: d.disposable ?? null,
      accept_all: d.accept_all ?? null,
      mx_records: d.mx_records ?? null,
      smtp_check: d.smtp_check ?? null,
    },
  };
}
