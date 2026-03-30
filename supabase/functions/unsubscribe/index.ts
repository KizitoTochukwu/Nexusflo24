import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get("lid");
    const workspaceId = url.searchParams.get("wid");

    if (!leadId || !workspaceId) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch lead
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, tags, full_name, email")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !lead) {
      return new Response(renderPage("Not Found", "We couldn't find your subscription record."), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const existingTags: string[] = lead.tags || [];
    if (existingTags.includes("unsubscribed")) {
      return new Response(renderPage("Already Unsubscribed", "You have already been unsubscribed from our marketing emails."), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Add "unsubscribed" tag
    await supabase
      .from("leads")
      .update({ tags: [...existingTags, "unsubscribed"] })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);

    // Log the event
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      workspace_id: workspaceId,
      user_id: "00000000-0000-0000-0000-000000000000",
      type: "email_unsubscribe",
      meta: { source: "email_footer" },
    });

    return new Response(renderPage("Unsubscribed", "You have been successfully unsubscribed from our marketing emails. You will no longer receive promotional content from us."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("unsubscribe error:", err);
    return new Response(renderPage("Error", "Something went wrong. Please try again later."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} &mdash; NexusFlo24</title>
  <style>
    body { margin: 0; font-family: 'Inter', Arial, sans-serif; background: #f9fafb; color: #0B1F3B; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; padding: 48px 40px; max-width: 440px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #65758B; line-height: 1.6; margin: 0 0 24px; }
    .brand { font-size: 12px; color: #C9A227; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="brand">© NexusFlo24 · AI-Powered Marketing Automation</span>
  </div>
</body>
</html>`;
}
