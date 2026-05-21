import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  form_id: string;
  workspace_id: string;
  values: Record<string, any>;
  lead_email?: string | null;
  lead_name?: string | null;
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload & {
      notify_channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
      notify_emails?: string[];
      notify_phones?: string[];
      form_name?: string;
    };
    const { form_id, workspace_id, values, lead_email, lead_name } = body;
    if (!form_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "form_id and workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, svcKey);

    // Synthetic/pseudo-form path (e.g. Contact page) — no DB row required.
    const isPseudo = form_id === "contact-page" || !!body.form_name;
    let form: any = null;
    if (!isPseudo) {
      const { data, error: formErr } = await admin
        .from("forms")
        .select("name, schema, settings, workspace_id")
        .eq("id", form_id)
        .maybeSingle();
      if (formErr || !data) {
        return new Response(JSON.stringify({ error: "Form not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      form = data;
    } else {
      form = {
        name: body.form_name || "Contact Page",
        schema: { steps: [] },
        settings: {},
        workspace_id,
      };
    }

    const settings: any = form.settings ?? {};
    const channels = body.notify_channels ?? settings.notify_channels ?? { email: true, sms: false, whatsapp: false };
    const recipientEmails: string[] = Array.isArray(body.notify_emails)
      ? body.notify_emails.filter(Boolean)
      : Array.isArray(settings.notify_emails) ? settings.notify_emails.filter(Boolean) : [];
    const recipientPhones: string[] = Array.isArray(body.notify_phones)
      ? body.notify_phones.filter(Boolean)
      : Array.isArray(settings.notify_phones) ? settings.notify_phones.filter(Boolean) : [];

    if (!channels.email && !channels.sms && !channels.whatsapp) {
      return new Response(JSON.stringify({ skipped: "all channels disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a labelled key/value list from schema
    const steps: any[] = (form.schema as any)?.steps ?? [];
    const fields = steps.flatMap((s) => s.fields ?? []);
    const rows: { label: string; value: string }[] = [];
    for (const f of fields) {
      if (["heading", "paragraph", "divider", "hidden"].includes(f.type)) continue;
      rows.push({ label: f.label || f.name, value: formatValue(values?.[f.name]) });
    }
    // Include any meta keys not in the schema
    for (const [k, v] of Object.entries(values ?? {})) {
      if (!fields.find((f) => f.name === k)) {
        rows.push({ label: k, value: formatValue(v) });
      }
    }

    // Default recipients: workspace owner + admins if no explicit recipients
    let emailTargets = [...recipientEmails];
    let phoneTargets = [...recipientPhones];

    if (emailTargets.length === 0 || phoneTargets.length === 0) {
      const { data: members } = await admin
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspace_id)
        .in("role", ["owner", "admin"]);

      const userIds = (members ?? []).map((m: any) => m.user_id);
      if (userIds.length > 0) {
        const { data: profs } = await admin
          .from("profiles")
          .select("id, email, phone")
          .in("id", userIds);
        if (emailTargets.length === 0) {
          emailTargets = (profs ?? []).map((p: any) => p.email).filter(Boolean);
        }
        if (phoneTargets.length === 0) {
          phoneTargets = (profs ?? []).map((p: any) => p.phone).filter(Boolean);
        }
      }
    }

    const summary = `New submission on "${form.name}"${lead_name ? ` from ${lead_name}` : lead_email ? ` from ${lead_email}` : ""}`;
    const dashUrl = `https://nexusflo24.lovable.app/dashboard/${workspace_id}/forms`;

    const result: Record<string, any> = { email: null, sms: null, whatsapp: null };

    // ---------- EMAIL ----------
    if (channels.email && emailTargets.length > 0) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";

        if (resendKey) {
          const tableRows = rows
            .map(
              (r) =>
                `<tr><td style="padding:6px 10px;font-weight:600;color:#0B1F3B;border-bottom:1px solid #eee;width:35%;">${escapeHtml(
                  r.label
                )}</td><td style="padding:6px 10px;color:#333;border-bottom:1px solid #eee;">${escapeHtml(r.value)}</td></tr>`
            )
            .join("");

          const html = `
            <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
              <div style="text-align:center;margin-bottom:20px;">
                <h2 style="color:#0B1F3B;margin:0 0 4px;">📝 New Form Submission</h2>
                <p style="color:#666;margin:0;font-size:14px;">${escapeHtml(summary)}</p>
              </div>
              <div style="background:#f8f9fa;border-radius:8px;padding:8px;margin-bottom:24px;">
                <table style="width:100%;font-size:14px;border-collapse:collapse;">${tableRows}</table>
              </div>
              <div style="text-align:center;">
                <a href="${dashUrl}" style="display:inline-block;background:#0B1F3B;color:#D4AF37;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View in CRM →</a>
              </div>
              <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">NexusFlo24 • AI-Powered Marketing Automation</p>
            </div>
          `;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: emailFrom,
              to: emailTargets,
              subject: `📝 ${summary}`,
              html,
            }),
          });
          result.email = res.ok ? "sent" : `error ${res.status}`;
        } else {
          result.email = "no resend key";
        }
      } catch (e) {
        console.error("[notify-form-submission] email error:", e);
        result.email = "error";
      }
    }

    // ---------- SMS / WHATSAPP ----------
    const textBody =
      `${summary}\n\n` +
      rows.slice(0, 10).map((r) => `${r.label}: ${r.value}`).join("\n");

    async function invokeChannel(fnName: "sms-send" | "whatsapp-send", to: string) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${svcKey}`,
          },
          body: JSON.stringify({
            workspace_id,
            to,
            body: textBody,
            // sms-send/whatsapp-send tolerate missing optional fields
          }),
        });
        return res.ok ? "sent" : `error ${res.status}`;
      } catch (e) {
        console.error(`[notify-form-submission] ${fnName} error:`, e);
        return "error";
      }
    }

    if (channels.sms && phoneTargets.length > 0) {
      result.sms = [];
      for (const p of phoneTargets) result.sms.push(await invokeChannel("sms-send", p));
    }
    if (channels.whatsapp && phoneTargets.length > 0) {
      result.whatsapp = [];
      for (const p of phoneTargets) result.whatsapp.push(await invokeChannel("whatsapp-send", p));
    }

    // ---------- CONFIRMATION EMAIL TO LEAD ----------
    if (body.send_confirmation && lead_email) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";
        if (resendKey) {
          const firstName = (lead_name || "there").split(" ")[0];
          const html = `
            <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;color:#0B1F3B;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#0B1F3B;margin:0 0 8px;font-size:24px;">Thanks for reaching out, ${escapeHtml(firstName)}! 👋</h1>
                <p style="color:#555;margin:0;font-size:15px;line-height:1.5;">We've received your message and a real human from the NexusFlo24 team will get back to you within 24 hours.</p>
              </div>
              <div style="background:#f7f8fb;border-radius:10px;padding:18px 20px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0B1F3B;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
                <ul style="margin:0;padding-left:18px;color:#333;font-size:14px;line-height:1.7;">
                  <li>Our team reviews your request (usually within a few hours)</li>
                  <li>We reply by email with next steps or a quick question</li>
                  <li>If you booked a demo, we'll confirm your time slot</li>
                </ul>
              </div>
              <div style="text-align:center;margin:28px 0 12px;">
                <a href="https://nexusflo24.com" style="display:inline-block;background:#0B1F3B;color:#D4AF37;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Visit NexusFlo24 →</a>
              </div>
              <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">
                Need us sooner? Email <a href="mailto:admin@nexusflo24.com" style="color:#0B1F3B;">admin@nexusflo24.com</a> or WhatsApp <a href="https://wa.me/447517327597" style="color:#0B1F3B;">+44 7517 327597</a>.
              </p>
              <p style="text-align:center;color:#bbb;font-size:11px;margin-top:16px;">NexusFlo24 • AI-Powered Marketing Automation</p>
            </div>
          `;
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: emailFrom,
              to: [lead_email],
              subject: `Thanks for contacting NexusFlo24, ${firstName}!`,
              html,
            }),
          });
          result.confirmation_email = res.ok ? "sent" : `error ${res.status}`;
        } else {
          result.confirmation_email = "no resend key";
        }
      } catch (e) {
        console.error("[notify-form-submission] confirmation email error:", e);
        result.confirmation_email = "error";
      }
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-form-submission] fatal:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
