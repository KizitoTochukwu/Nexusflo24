import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function StripeConnectCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Connecting your Stripe account…");

  const workspaceId = params.get("state");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const errorDescription = params.get("error_description");

    if (errorDescription || !code) {
      setState("error");
      setMessage(errorDescription || "Stripe did not return an authorisation code.");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("shop-connect-stripe", {
          body: { action: "oauth_callback", code, workspaceId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setState("done");
        setMessage("Your Stripe account is connected. You can start taking payments.");
      } catch (err: any) {
        setState("error");
        setMessage(err?.message ?? "We could not complete the Stripe connection.");
      }
    })();
  }, [params, workspaceId]);

  const back = () =>
    navigate(workspaceId ? `/dashboard/${workspaceId}/commerce/settings` : "/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        {state === "working" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />}
        {state === "done" && <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />}
        {state === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
        <h1 className="mt-4 text-xl font-bold">
          {state === "done" ? "Stripe connected" : state === "error" ? "Connection failed" : "Please wait"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {state !== "working" && (
          <Button className="mt-6 w-full" onClick={back}>Back to commerce settings</Button>
        )}
      </div>
    </div>
  );
}
