import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CONNECTOR_ID = "google_mail";

async function callGmail(workspaceId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("client-finder-gmail", {
    body: { workspace_id: workspaceId, ...payload },
  });
  if (error) {
    const detail = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    let message = detail;
    try {
      message = JSON.parse(detail)?.error ?? detail;
    } catch { /* plain text */ }
    throw new Error(message || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export function useCfGmailStatus(workspaceId?: string) {
  return useQuery({
    queryKey: ["cf-gmail-status", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () =>
      (await callGmail(workspaceId!, { action: "status" })) as { configured: boolean; connected: boolean },
  });
}

function waitForOAuthCompletion(popup: Window) {
  return new Promise<void>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") return resolve();
      popup.close();
      reject(new Error(event.data?.reason ?? "The Gmail connection did not complete."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Gmail window was closed before the connection finished."));
    }, 500);
  });
}

export function useCfGmailActions(workspaceId?: string) {
  const qc = useQueryClient();

  const connect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "nexusflo-gmail", "width=600,height=720");
      if (!popup) throw new Error("Your browser blocked the Gmail window. Allow pop-ups and try again.");
      try {
        const res = await callGmail(workspaceId!, { action: "start", origin: window.location.origin });
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = res.authorization_url;
        await completion;
      } catch (e) {
        popup.close();
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cf-gmail-status"] });
      qc.invalidateQueries({ queryKey: ["cf-mailboxes"] });
      toast.success("Gmail is now connected for sending.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: (mailboxId: string) => callGmail(workspaceId!, { action: "disconnect", mailbox_id: mailboxId }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["cf-gmail-status"] });
      qc.invalidateQueries({ queryKey: ["cf-mailboxes"] });
      toast.success(
        res?.campaigns_paused
          ? `Gmail disconnected. ${res.campaigns_paused} campaign(s) paused.`
          : "Gmail disconnected.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { connect, disconnect };
}
