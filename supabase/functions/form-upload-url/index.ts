import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "upload";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const formId = typeof body.form_id === "string" ? body.form_id : "";
    const fieldName = typeof body.field === "string" ? body.field.slice(0, 60) : "file";
    const fileName = typeof body.file_name === "string" ? body.file_name : "";
    const size = Number(body.size) || 0;

    if (!formId || !fileName) return json({ error: "form_id and file_name are required" }, 400);

    const { data: form } = await supabase
      .from("forms")
      .select("id, workspace_id, status, schema")
      .eq("id", formId)
      .maybeSingle();

    if (!form || form.status !== "active") return json({ error: "Form not available" }, 404);

    // Validate against the field definition stored on the form
    const fields = (form.schema?.steps ?? []).flatMap((s: any) => s.fields ?? []);
    const field = fields.find((f: any) => f.name === fieldName && f.type === "file");
    if (!field) return json({ error: "Unknown upload field" }, 400);

    const maxBytes = (Number(field.max_size_mb) || 10) * 1024 * 1024;
    if (size > maxBytes) {
      return json({ error: `File is larger than ${Math.round(maxBytes / 1048576)}MB` }, 400);
    }

    const accept = String(field.accept ?? "").trim();
    if (accept) {
      const lower = fileName.toLowerCase();
      const patterns = accept.split(",").map((p: string) => p.trim().toLowerCase()).filter(Boolean);
      const ok = patterns.some((p) => {
        if (p.startsWith(".")) return lower.endsWith(p);
        if (p.endsWith("/*")) return true; // mime family checked client-side
        return true;
      });
      if (!ok) return json({ error: "File type is not allowed" }, 400);
    }

    const path = `${form.workspace_id}/${formId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(fileName)}`;

    const { data, error } = await supabase.storage
      .from("form-uploads")
      .createSignedUploadUrl(path);

    if (error) throw error;

    return json({ path, token: data.token, signed_url: data.signedUrl });
  } catch (e) {
    console.error("[form-upload-url]", e);
    return json({ error: "Could not prepare upload" }, 500);
  }
});
