import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decrypt(cipherB64: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["decrypt"]);
  const combined = base64ToBytes(cipherB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

export async function findWorkspaceByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
  if (!encryptionKey) return null;

  const normalizedPhoneNumberId = phoneNumberId.replace(/[^\d]/g, "");
  if (!normalizedPhoneNumberId) return null;

  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows } = await adminClient
    .from("workspace_channel_settings")
    .select("workspace_id, config_encrypted")
    .eq("channel", "whatsapp")
    .eq("is_active", true);

  for (const row of rows || []) {
    try {
      const config = JSON.parse(await decrypt(row.config_encrypted, encryptionKey));
      const configuredPhoneNumberId = String(config?.phone_number_id || "").replace(/[^\d]/g, "");
      if (configuredPhoneNumberId && configuredPhoneNumberId === normalizedPhoneNumberId) {
        return row.workspace_id;
      }
    } catch (err) {
      console.warn("Failed to inspect workspace WhatsApp credentials for phone number lookup:", err);
    }
  }

  return null;
}

export interface ChannelCredentials {
  source: "workspace" | "platform" | "none";
  config: Record<string, string>;
}

/**
 * Resolve credentials for a channel: workspace-specific first, then platform ENV fallback.
 */
export async function resolveChannelCredentials(
  workspaceId: string,
  channel: "email" | "sms" | "whatsapp",
  platformFallback: Record<string, string | undefined>,
): Promise<ChannelCredentials> {
  const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");

  if (encryptionKey) {
    try {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await adminClient
        .from("workspace_channel_settings")
        .select("config_encrypted, is_active")
        .eq("workspace_id", workspaceId)
        .eq("channel", channel)
        .eq("is_active", true)
        .maybeSingle();

      if (data?.config_encrypted) {
        const config = JSON.parse(await decrypt(data.config_encrypted, encryptionKey));
        // Validate that required fields have values
        const hasValues = Object.values(config).some((v) => v && String(v).trim().length > 0);
        if (hasValues) {
          return { source: "workspace", config };
        }
      }
    } catch (err) {
      console.warn(`Failed to resolve workspace ${channel} credentials, falling back to platform:`, err);
    }
  }

  // Platform fallback
  const config: Record<string, string> = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(platformFallback)) {
    if (v) {
      config[k] = v;
      hasAny = true;
    }
  }

  if (hasAny) {
    return { source: "platform", config };
  }

  return { source: "none", config: {} };
}
