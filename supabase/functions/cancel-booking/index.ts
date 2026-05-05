import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { reschedule_token, reason } = body;

    if (!reschedule_token || typeof reschedule_token !== "string") {
      return new Response(JSON.stringify({ error: "Missing reschedule_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("reschedule_token", reschedule_token)
      .maybeSingle();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found or invalid token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ success: true, already_cancelled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: page } = await supabase
      .from("booking_pages")
      .select("*")
      .eq("id", booking.booking_page_id)
      .maybeSingle();

    // Mark cancelled
    const cancelNote = reason ? `\n\n[Cancelled by guest: ${String(reason).slice(0, 500)}]` : "\n\n[Cancelled by guest]";
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        notes: (booking.notes || "") + cancelNote,
      })
      .eq("id", booking.id);

    if (updateErr) throw updateErr;

    // Best-effort: delete Google Calendar event
    if (booking.google_event_id && page?.google_token_id) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      if (clientId && clientSecret) {
        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens")
          .select("*")
          .eq("id", page.google_token_id)
          .maybeSingle();
        if (tokenRow) {
          let accessToken = tokenRow.access_token;
          if (new Date(tokenRow.token_expires_at) <= new Date(Date.now() + 60000)) {
            const res = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: tokenRow.refresh_token,
                grant_type: "refresh_token",
              }),
            });
            const data = await res.json();
            if (res.ok && data.access_token) {
              accessToken = data.access_token;
              await supabase
                .from("google_calendar_tokens")
                .update({ access_token: data.access_token, token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() })
                .eq("id", tokenRow.id);
            }
          }
          try {
            const calendarId = tokenRow.calendar_id || "primary";
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${booking.google_event_id}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
            );
          } catch (_) { /* best effort */ }
        }
      }
    }

    // Best-effort: emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
    if (resendApiKey && page) {
      const start = new Date(booking.start_time);
      const formattedDate = start.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const navy = "#0B1F3B";

      const layout = (title: string, content: string) => `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#fff;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
              <tr><td style="background:${navy};padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
                <div style="margin-bottom:14px;"><img src="https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png" width="44" height="44" alt="NexusFlo24" style="display:inline-block;border-radius:10px;" /></div>
                <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">❌ ${title}</h1>
              </td></tr>
              <tr><td style="background:#f8f9fa;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                ${content}
              </td></tr>
              <tr><td style="padding:24px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by NexusFlo24</p>
              </td></tr>
            </table>
          </td></tr></table>
        </body></html>`;

      const send = async (to: string, subject: string, html: string) => {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: `NexusFlo24 <${fromEmail}>`, to: [to], subject, html }),
          });
        } catch (_) { /* best effort */ }
      };

      await send(
        booking.guest_email,
        `Booking Cancelled: ${page.name}`,
        layout("Booking Cancelled", `
          <p style="margin:0 0 16px;font-size:16px;color:${navy};">Hi ${booking.guest_name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">Your appointment has been cancelled:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
            <tr><td style="padding:12px 16px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:14px;color:${navy};">📅 ${formattedDate}</p>
              <p style="margin:0 0 4px;font-size:14px;color:${navy};">🕐 ${formattedTime}</p>
              <p style="margin:0;font-size:14px;color:${navy};">📋 ${page.name}</p>
            </td></tr>
          </table>
          ${reason ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;"><strong>Reason:</strong> ${String(reason).slice(0, 500)}</p>` : ""}
        `)
      );

      const { data: ownerProfile } = await supabase
        .from("profiles").select("email, full_name").eq("id", page.user_id).maybeSingle();
      if (ownerProfile?.email) {
        await send(
          ownerProfile.email,
          `Booking Cancelled: ${booking.guest_name} – ${page.name}`,
          layout("Appointment Cancelled", `
            <p style="margin:0 0 16px;font-size:16px;color:${navy};">Hi ${ownerProfile.full_name || "there"},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>${booking.guest_name}</strong> cancelled their appointment:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
              <tr><td style="padding:12px 16px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;font-size:14px;color:${navy};">📅 ${formattedDate}</p>
                <p style="margin:0 0 4px;font-size:14px;color:${navy};">🕐 ${formattedTime}</p>
                <p style="margin:0;font-size:14px;color:${navy};">📋 ${page.name}</p>
              </td></tr>
            </table>
            ${reason ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;"><strong>Reason:</strong> ${String(reason).slice(0, 500)}</p>` : ""}
          `)
        );
      }

      await supabase.from("notifications").insert({
        workspace_id: page.workspace_id,
        user_id: page.user_id,
        title: "❌ Booking Cancelled",
        body: `${booking.guest_name} cancelled "${page.name}" scheduled for ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.`,
        type: "booking",
        meta: { booking_id: booking.id },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
