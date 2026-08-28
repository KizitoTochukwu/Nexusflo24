import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CONNECTOR_ID = "google_mail";

export default function GmailReturn() {
  const [message, setMessage] = useState("Finishing your Gmail connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspaceId = window.localStorage.getItem("cf_gmail_workspace_id") ?? "";

    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", reason?: string) => {
      window.opener?.postMessage({ type, connectorId: CONNECTOR_ID, reason }, window.location.origin);
      if (type === "appUserConnectorOAuthComplete") window.close();
    };

    if (params.get("success") !== "true") {
      const reason = params.get("error") ?? "Google did not complete the connection.";
      setMessage(reason);
      notify("appUserConnectorOAuthFailed", reason);
      return;
    }

    const code = params.get("code");
    if (!code) {
      const reason = params.get("offline_access_allowed") === "false"
        ? "This connection cannot be used yet: an administrator must enable offline access on the Gmail connector client."
        : "Google finished without returning a connection code.";
      setMessage(reason);
      notify("appUserConnectorOAuthFailed", reason);
      return;
    }

    void supabase.functions
      .invoke("client-finder-gmail", { body: { workspace_id: workspaceId, action: "complete", code } })
      .then(({ data, error }) => {
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setMessage("Gmail connected. You can close this window.");
        notify("appUserConnectorOAuthComplete");
      })
      .catch((e: Error) => {
        setMessage(e.message || "Could not finish the Gmail connection.");
        notify("appUserConnectorOAuthFailed", e.message);
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
