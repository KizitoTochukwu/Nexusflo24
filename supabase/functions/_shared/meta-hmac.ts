/**
 * Constant-time HMAC-SHA256 verification for Meta (Facebook/Instagram/WhatsApp)
 * webhook payloads. Meta signs every POST with the `X-Hub-Signature-256` header,
 * computed as `sha256=<hex>` over the raw request body using the App Secret.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^sha256=/, "").toLowerCase();
  if (clean.length % 2 !== 0) return new Uint8Array();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const b = parseInt(clean.substring(i, i + 2), 16);
    if (Number.isNaN(b)) return new Uint8Array();
    out[i / 2] = b;
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify an `X-Hub-Signature-256: sha256=<hex>` header against the raw body
 * using one of the provided app secrets. Returns true if any secret matches.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecrets: string[],
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expectedHex = signatureHeader.replace(/^sha256=/, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedHex)) return false;
  if (!appSecrets.length) return false;

  const enc = new TextEncoder();
  for (const secret of appSecrets) {
    if (!secret) continue;
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
      const computedHex = bytesToHex(sig);
      if (timingSafeEqualHex(computedHex, expectedHex)) return true;
    } catch (_) { /* try next secret */ }
  }
  return false;
}

export { hexToBytes };
