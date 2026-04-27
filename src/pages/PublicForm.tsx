import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicFormRenderer from "@/components/forms/PublicFormRenderer";
import type { FormRecord } from "@/hooks/useForms";
import WorkspacePixelLoader from "@/components/analytics/WorkspacePixelLoader";

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("forms")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "active")
        .maybeSingle();
      if (!cancelled) {
        setForm(data as unknown as FormRecord | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (form) document.title = `${form.name} – NexusFlo24`;
  }, [form]);

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
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: form.theme.bg_color || "#f8fafc" }}
    >
      <WorkspacePixelLoader workspaceId={form.workspace_id} />
      <div className="w-full max-w-xl">
        <PublicFormRenderer form={form} />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Powered by NexusFlo24
        </p>
      </div>
    </div>
  );
}
