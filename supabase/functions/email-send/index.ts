import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { blocksToHtml, parseBlocksFromMessage } from "../_shared/email-blocks.ts";

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
    let callerUserId: string | undefined;
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      callerUserId = user.id;

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Preview / test sends: skip credits + tracking + recipient-side rewriting.
    // These are user-initiated tests from the editor (not service-role driven),
    // and we still log them to email_logs for visibility.
    const isPreview = templateSettings && (templateSettings as any).preview === true;

    // Check and deduct credits — only skip if (a) preview, or
    // (b) service-role + skipCredits + workspace owner is admin
    const skipCredits = body.skipCredits;
    let shouldDeductCredits = !isPreview;
    if (shouldDeductCredits && isServiceRole && skipCredits) {
      const { data: ws } = await adminClient.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
      if (ws?.owner_user_id && await isAdminUser(ws.owner_user_id)) {
        shouldDeductCredits = false;
      }
    }
    if (shouldDeductCredits) {
      const creditResult = await deductCredit(workspaceId, "email", undefined, callerUserId);
      if (!creditResult.allowed) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient email credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Resolve credentials: workspace-specific → platform ENV fallback
    const creds = await resolveChannelCredentials(workspaceId, "email", {
      api_key: Deno.env.get("RESEND_API_KEY"),
      from_email: Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com",
      from_name: "NexusFlo24",
    });

    if (creds.source === "none" || !creds.config.api_key) {
      return new Response(JSON.stringify({ error: "Email provider not configured. Contact platform admin or set up your own in Settings → Channels." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = creds.config.api_key;
    const fromEmail = creds.config.from_email || "noreply@nexusflo24.com";
    const fromName = creds.config.from_name || "NexusFlo24";
    const from = `${fromName} <${fromEmail}>`;

    // Inject tracking pixel and rewrite links for tracking
    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    // Try to extract lead_id and campaign_id from request body for tracking
    const leadId = body.leadId || body.lead_id || "";
    const campaignId = body.campaignId || body.campaign_id || "";

    // Format and wrap in branded template with optional user settings.
    // The body may be either: (a) a JSON array of visual-editor blocks, or
    // (b) plain text / inline HTML. Detect and render accordingly so blocks
    // never leak into the inbox as raw JSON.
    const ts = templateSettings as Record<string, any> | undefined;
    const appBaseUrl = "https://nexusflo24.lovable.app";
    const unsubUrl = leadId && workspaceId ? `${appBaseUrl}/unsubscribe?lid=${leadId}&wid=${workspaceId}` : undefined;
    const blocks = parseBlocksFromMessage(html);
    const renderedBody = blocks ? blocksToHtml(blocks) : formatEmailBody(html);
    let trackedHtml = wrapEmailTemplate(renderedBody, {
      logo: ts?.logo,
      unsubscribe: ts?.unsubscribe,
      footer: ts?.footer,
      unsubUrl,
    });

    if (leadId && workspaceId && !isPreview) {
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

    const finalSubject = isPreview ? `[TEST] ${subject}` : subject;
    const replyTo = body.replyTo || "NexusFlo24 Support <support@nexusflo24.com>";
    const result = await sendResend(apiKey, from, to, finalSubject, trackedHtml, replyTo);

    // Log outbound email
    try {
      await adminClient.from("email_logs").insert({
        workspace_id: workspaceId,
        to_email: to,
        from_email: fromEmail,
        subject: isPreview ? `[TEST] ${subject}` : subject,
        direction: "outbound",
        status: "sent",
        provider_message_id: result.messageId,
        lead_id: leadId || null,
      });
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("email-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
