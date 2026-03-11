import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendResend(apiKey: string, from: string, to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Resend error: ${res.status}`);
  return { messageId: data.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    const body = await req.json();
    const { workspaceId, to, subject, html, templateSettings } = body;

    if (!workspaceId || !to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, subject, html" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // If called with service role key (internal/campaign calls), skip user auth
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Platform-managed credentials from ENV
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email provider not configured. Contact platform admin." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const from = `NexusFlo24 <${fromEmail}>`;

    // Inject tracking pixel and rewrite links for tracking
    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    // Try to extract lead_id and campaign_id from request body for tracking
    const leadId = body.leadId || body.lead_id || "";
    const campaignId = body.campaignId || body.campaign_id || "";

    // Format and wrap in branded template with optional user settings
    const ts = templateSettings as Record<string, any> | undefined;
    const unsubUrl = leadId && workspaceId ? `${baseUrl}/functions/v1/unsubscribe?lid=${leadId}&wid=${workspaceId}` : undefined;
    let trackedHtml = wrapEmailTemplate(formatEmailBody(html), {
      logo: ts?.logo,
      unsubscribe: ts?.unsubscribe,
      footer: ts?.footer,
      unsubUrl,
    });

    if (leadId && workspaceId) {
      // Rewrite <a href="..."> links to go through track-click
      trackedHtml = trackedHtml.replace(
        /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
        (_match: string, before: string, href: string, after: string) => {
          // Skip mailto: and tel: and tracking URLs and unsubscribe URLs
          if (href.startsWith("mailto:") || href.startsWith("tel:") || href.includes("track-click") || href.includes("track-open") || href.includes("unsubscribe")) {
            return `<a ${before}href="${href}"${after}>`;
          }
          const trackUrl = `${baseUrl}/functions/v1/track-click?lid=${leadId}&wid=${workspaceId}&url=${encodeURIComponent(href)}${campaignId ? `&cid=${campaignId}` : ""}`;
          return `<a ${before}href="${trackUrl}"${after}>`;
        }
      );

      // Append tracking pixel before </body> or at end
      const pixelUrl = `${baseUrl}/functions/v1/track-open?lid=${leadId}&wid=${workspaceId}${campaignId ? `&cid=${campaignId}` : ""}`;
      const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

      if (trackedHtml.includes("</body>")) {
        trackedHtml = trackedHtml.replace("</body>", `${pixel}</body>`);
      } else {
        trackedHtml += pixel;
      }
    }

    const replyTo = body.replyTo || "NexusFlo24 Support <support@nexusflo24.com>";
    const result = await sendResend(apiKey, from, to, subject, trackedHtml, replyTo);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("email-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
