import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadFbSdk, launchEmbeddedSignup } from "@/lib/meta/fbSdk";

export interface WhatsAppConnection {
  configured: boolean;
  is_active: boolean;
  phone_number_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  business_account_name: string | null;
  waba_id: string | null;
  connection_method: "manual" | "embedded_signup" | null;
  token_expires_at: string | null;
  default_reengagement_template_id: string | null;
}

async function invoke(path: string, body: Record<string, unknown>) {
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess.session?.access_token;
  if (!accessToken) throw new Error("Please sign in again.");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
}

async function fetchEmbeddedConfig() {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-embedded-config`,
    { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
  );
  const data = await res.json();
  return data as { appId: string; configId: string; configured: boolean };
}

export function useWhatsAppConnection(workspaceId: string) {
  return useQuery({
    queryKey: ["whatsapp-connection", workspaceId],
    queryFn: async (): Promise<WhatsAppConnection> => {
      const { data } = await supabase
        .from("whatsapp_settings")
        .select(
          "phone_number_id, display_phone_number, verified_name, business_account_name, waba_id, connection_method, token_expires_at, is_active, default_reengagement_template_id",
        )
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return {
        configured: Boolean(data?.phone_number_id),
        is_active: Boolean(data?.is_active),
        phone_number_id: data?.phone_number_id ?? null,
        display_phone_number: (data as any)?.display_phone_number ?? null,
        verified_name: (data as any)?.verified_name ?? null,
        business_account_name: (data as any)?.business_account_name ?? null,
        waba_id: (data as any)?.waba_id ?? null,
        connection_method: ((data as any)?.connection_method ?? null) as
          | "manual"
          | "embedded_signup"
          | null,
        token_expires_at: (data as any)?.token_expires_at ?? null,
        default_reengagement_template_id: data?.default_reengagement_template_id ?? null,
      };
    },
    enabled: !!workspaceId,
  });
}

export function useConnectWhatsApp(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const cfg = await fetchEmbeddedConfig();
      if (!cfg.configured) {
        throw new Error(
          "Meta App credentials are not configured on the platform yet. Contact support.",
        );
      }
      await loadFbSdk(cfg.appId);
      const result = await launchEmbeddedSignup(cfg.configId);
      const res = await invoke("whatsapp-embedded-signup", {
        workspaceId,
        code: result.code,
        wabaId: result.wabaId,
        phoneNumberId: result.phoneNumberId,
        redirectUri: window.location.origin,
      });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-connection", workspaceId] });
      qc.invalidateQueries({ queryKey: ["whatsapp-templates", workspaceId] });
    },
  });
}

export function useSyncWhatsAppTemplates(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => invoke("whatsapp-sync-templates", { workspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-templates", workspaceId] });
    },
  });
}

export function useDisconnectWhatsApp(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => invoke("whatsapp-disconnect", { workspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-connection", workspaceId] });
    },
  });
}
