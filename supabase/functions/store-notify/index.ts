// Automation Store transactional notifications.
// Sends order confirmations, onboarding reminders, progress updates, go-live and
// approval-request emails to the customer, plus a new-order alert to the team.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://nexusflo24.com";
const TEAM_EMAIL = Deno.env.get("STORE_TEAM_EMAIL") || "support@nexusflo24.com";

type EventType =
  | "order_paid"
  | "onboarding_invite"
  | "admin_new_order"
  | "onboarding_reminder"
  | "project_update"
  | "approval_requested"
  | "project_live";

interface Body {
  event: EventType;
  order_id?: string;
  project_id?: string;
  title?: string;
  body?: string;
}

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦" };
const money = (minor: number, currency = "GBP") =>
  `${SYMBOLS[currency] ?? "£"}${Math.round((minor ?? 0) / 100).toLocaleString("en-GB")}`;

function shell(heading: string, intro: string, inner: string, ctaLabel?: string, ctaUrl?: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fa;padding:24px;font-family:Inter,Arial,sans-serif;color:#0B1F3B">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e9f0">
    <div style="background:#0B1F3B;padding:20px 24px">
      <span style="color:#fff;font-size:18px;font-weight:700">NexusFlo24</span>
      <span style="color:#C9A227;font-size:12px;letter-spacing:.08em;margin-left:8px">AUTOMATION STORE</span>
    </div>
    <div style="padding:28px 24px">
      <h1 style="margin:0 0 12px;font-size:20px">${esc(heading)}</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#41506b">${intro}</p>
      ${inner}
      ${
        ctaLabel && ctaUrl
          ? `<p style="margin:24px 0 0"><a href="${ctaUrl}" style="background:#C9A227;color:#0B1F3B;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;display:inline-block;font-size:14px">${esc(ctaLabel)}</a></p>`
          : ""
      }
      <p style="margin:24px 0 0;font-size:12px;color:#8b95a8">
        We will never ask for your passwords. Any access we need is requested through secure invitations only.
      </p>
    </div>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("[store-notify] RESEND_API_KEY missing — skipping email to", to);
    return { skipped: true };
  }
  const from = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: TEAM_EMAIL }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[store-notify] send failed", res.status, text);
    return { sent: false, error: text };
  }
  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = (await req.json()) as Body;
    const results: unknown[] = [];

    if (body.event === "order_paid" || body.event === "onboarding_invite" || body.event === "admin_new_order") {
      if (!body.order_id) throw new Error("order_id is required");
      const { data: order } = await supabase
        .from("store_orders")
        .select("*")
        .eq("id", body.order_id)
        .maybeSingle();
      if (!order) throw new Error("Order not found");
      const { data: items } = await supabase
        .from("store_order_items")
        .select("name,unit_price_pence,quantity")
        .eq("order_id", order.id);

      const rows = (items ?? [])
        .map(
          (i: any) =>
            `<tr><td style="padding:8px 0;font-size:14px">${esc(i.name)}${
              i.quantity > 1 ? ` × ${i.quantity}` : ""
            }</td><td style="padding:8px 0;text-align:right;font-size:14px">${money(
              i.unit_price_pence * (i.quantity ?? 1),
              order.currency,
            )}</td></tr>`,
        )
        .join("");

      const table = `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e6e9f0">${rows}
        <tr><td style="padding:10px 0;border-top:1px solid #e6e9f0;font-weight:700">Setup total</td>
        <td style="padding:10px 0;border-top:1px solid #e6e9f0;text-align:right;font-weight:700">${money(order.total_pence, order.currency)}</td></tr>
        ${
          order.monthly_total_pence
            ? `<tr><td style="padding:6px 0;font-size:13px;color:#41506b">Managed support</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#41506b">${money(order.monthly_total_pence, order.currency)}/month</td></tr>`
            : ""
        }</table>
        <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#41506b">
          Next step: complete your onboarding questions so our team can start building. You will get an
          update at every stage — build, testing, your approval, then go live.</p>`;

      results.push(
        await sendEmail(
          order.email,
          "Your automation order is confirmed",
          shell(
            "Thank you — your order is confirmed",
            `Hi ${esc(order.full_name || "there")}, we have received your payment and your delivery project is open.`,
            table,
            "Complete onboarding",
            `${SITE_URL}/dashboard`,
          ),
        ),
      );

      results.push(
        await sendEmail(
          TEAM_EMAIL,
          `New Automation Store order — ${gbp(order.total_pence)}`,
          shell(
            "New order received",
            `${esc(order.full_name || order.email)} (${esc(order.email)}) has paid for an automation setup.`,
            `${table}<p style="margin:14px 0 0;font-size:13px;color:#41506b">Business: ${esc(
              order.business_name || "—",
            )} · Phone: ${esc(order.phone || "—")} · Website: ${esc(order.website || "—")}</p>`,
          ),
        ),
      );
    } else {
      if (!body.project_id) throw new Error("project_id is required");
      const { data: project } = await supabase
        .from("store_projects")
        .select("*, store_orders(email, full_name)")
        .eq("id", body.project_id)
        .maybeSingle();
      if (!project) throw new Error("Project not found");

      const to = (project as any).store_orders?.email;
      if (!to) throw new Error("No customer email on this project");
      const name = (project as any).store_orders?.full_name || "there";
      const link = `${SITE_URL}/dashboard`;

      const copy: Record<Exclude<EventType, "order_paid">, { subject: string; heading: string; intro: string }> = {
        onboarding_reminder: {
          subject: `Quick step needed for ${project.name}`,
          heading: "We need a few details to start building",
          intro: `Hi ${esc(name)}, your onboarding questions for <strong>${esc(project.name)}</strong> are still open. Once they are in, we can begin the build.`,
        },
        project_update: {
          subject: `Update on ${project.name}`,
          heading: esc(body.title || "Progress update"),
          intro: `Hi ${esc(name)}, here is the latest on <strong>${esc(project.name)}</strong>.`,
        },
        approval_requested: {
          subject: `${project.name} is ready for your approval`,
          heading: "Your automation is built and tested",
          intro: `Hi ${esc(name)}, <strong>${esc(project.name)}</strong> has passed our testing. Review it and approve when you are happy, and we will switch it on.`,
        },
        project_live: {
          subject: `${project.name} is now live`,
          heading: "Your automation is live",
          intro: `Hi ${esc(name)}, <strong>${esc(project.name)}</strong> is switched on and running. We will keep an eye on it and you can message us any time.`,
        },
      };

      const c = copy[body.event as Exclude<EventType, "order_paid">];
      const inner = body.body
        ? `<div style="background:#f7f9fc;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#41506b">${esc(body.body)}</div>`
        : "";

      results.push(
        await sendEmail(
          to,
          c.subject,
          shell(c.heading, c.intro, inner, "Open my automations", link),
        ),
      );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[store-notify] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
