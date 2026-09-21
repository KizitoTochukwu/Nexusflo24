import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicFormRenderer from "@/components/forms/PublicFormRenderer";
import type { FormRecord } from "@/hooks/useForms";
import WorkspacePixelLoader from "@/components/analytics/WorkspacePixelLoader";

export default function PublicForm() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isPopup = searchParams.get("display") === "popup";
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_public_form" as any, { p_slug: slug! });
      const row = Array.isArray(data) ? data[0] : data;
      if (!cancelled) {
        setForm((row ?? null) as unknown as FormRecord | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (form) document.title = `${form.name} – NexusFlo24`;
  }, [form]);

  useEffect(() => {
    if (!isPopup || !form) return;
    const notifyHeight = () => {
      const renderedForm = document.querySelector("form");
      const renderedHeight = renderedForm
        ? Math.ceil(renderedForm.getBoundingClientRect().height)
        : document.body.scrollHeight;
      window.parent?.postMessage(
        { type: "nexusflo-popup-resize", height: renderedHeight },
        "*",
      );
    };
    const handleResizeRequest = (event: MessageEvent) => {
      if (event.data?.type === "nexusflo-popup-request-size") notifyHeight();
    };
    notifyHeight();
    window.addEventListener("message", handleResizeRequest);
    const observer = new ResizeObserver(notifyHeight);
    const renderedForm = document.querySelector("form");
    observer.observe(renderedForm ?? document.body);
    return () => {
      observer.disconnect();
      window.removeEventListener("message", handleResizeRequest);
    };
  }, [form, isPopup]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Form not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This form may be inactive or no longer exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={isPopup
        ? "flex items-start justify-center p-0"
        : "flex min-h-screen items-center justify-center p-4 sm:p-8"}
      style={{ background: form.theme.bg_color || "#f8fafc" }}
    >
      <WorkspacePixelLoader workspaceId={form.workspace_id} />
      <div className={isPopup ? "w-full" : "w-full max-w-xl"}>
        <PublicFormRenderer form={form} compact={isPopup} />
        {!isPopup && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Powered by NexusFlo24
          </p>
        )}
      </div>
    </div>
  );
}
