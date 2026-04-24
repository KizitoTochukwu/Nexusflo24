import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { reschedule_token, new_start_time } = body;

    if (!reschedule_token) {
      return new Response(JSON.stringify({ error: "Missing reschedule_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the booking by token
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("reschedule_token", reschedule_token)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found or invalid token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "This booking has been cancelled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no new_start_time, return the booking info (for the GET-like lookup)
    if (!new_start_time) {
      // Fetch booking page details
      const { data: page } = await supabase
        .from("booking_pages")
        .select("*")
        .eq("id", booking.booking_page_id)
        .single();

      return new Response(JSON.stringify({ booking, page }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate new time
    const { data: page } = await supabase
      .from("booking_pages")
      .select("*")
      .eq("id", booking.booking_page_id)
      .eq("status", "active")
      .single();

    if (!page) {
      return new Response(JSON.stringify({ error: "Booking page no longer active" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStart = new Date(new_start_time);
    const newEnd = new Date(newStart.getTime() + page.duration_minutes * 60 * 1000);

    // Check conflicts (excluding this booking)
    const bufferMs = (page.buffer_minutes || 0) * 60 * 1000;
    const checkStart = new Date(newStart.getTime() - bufferMs).toISOString();
    const checkEnd = new Date(newEnd.getTime() + bufferMs).toISOString();

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_page_id", booking.booking_page_id)
      .neq("status", "cancelled")
      .neq("id", booking.id)
      .lt("start_time", checkEnd)
      .gt("end_time", checkStart);

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ error: "The selected time slot is no longer available" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the booking
    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Update Google Calendar event if exists
    if (booking.google_event_id && page.google_token_id) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (clientId && clientSecret) {
        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens")
          .select("*")
          .eq("id", page.google_token_id)
          .single();

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
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  start: { dateTime: newStart.toISOString(), timeZone: page.timezone },
                  end: { dateTime: newEnd.toISOString(), timeZone: page.timezone },
                }),
              }
            );
          } catch (_) { /* best effort */ }
        }
      }
    }

    // Send reschedule notification emails (best effort)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
    if (resendApiKey) {
      const formattedDate = newStart.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = newStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const navyColor = "#0B1F3B";

      const emailLayout = (title: string, bodyContent: string) => `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
            <tr><td align="center" style="padding:40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr><td style="background:${navyColor};padding:24px 32px;border-radius:12px 12px 0 0;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🔄 ${title}</h1>
                </td></tr>
                <tr><td style="background:#f8f9fa;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                  ${bodyContent}
                </td></tr>
                <tr><td style="padding:24px 32px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by NexusFlo24</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
      `;

      const sendEmail = async (to: string, subject: string, html: string) => {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: `NexusFlo24 <${fromEmail}>`, to: [to], subject, html }),
          });
        } catch (_) { /* best effort */ }
      };

      // Guest email
      await sendEmail(
        booking.guest_email,
        `Booking Rescheduled: ${page.name} – ${formattedDate}`,
        emailLayout("Booking Rescheduled", `
          <p style="margin:0 0 16px;font-size:16px;color:${navyColor};">Hi ${booking.guest_name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">Your appointment has been rescheduled to:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
            <tr><td style="padding:12px 16px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">📅 ${formattedDate}</p>
              <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">🕐 ${formattedTime} (${page.duration_minutes} min)</p>
              <p style="margin:0;font-size:14px;color:${navyColor};">🌍 ${page.timezone}</p>
            </td></tr>
          </table>
        `)
      );

      // Owner email
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", page.user_id)
        .single();

      if (ownerProfile?.email) {
        await sendEmail(
          ownerProfile.email,
          `Booking Rescheduled: ${booking.guest_name} – ${page.name}`,
          emailLayout("Appointment Rescheduled", `
            <p style="margin:0 0 16px;font-size:16px;color:${navyColor};">Hi ${ownerProfile.full_name || "there"},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>${booking.guest_name}</strong> rescheduled their appointment:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
              <tr><td style="padding:12px 16px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">📅 ${formattedDate}</p>
                <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">🕐 ${formattedTime} (${page.duration_minutes} min)</p>
                <p style="margin:0;font-size:14px;color:${navyColor};">📋 ${page.name}</p>
              </td></tr>
            </table>
          `)
        );
      }
    }

    // Notification for owner
    await supabase.from("notifications").insert({
      workspace_id: page.workspace_id,
      user_id: page.user_id,
      title: "🔄 Booking Rescheduled",
      body: `${booking.guest_name} rescheduled "${page.name}" to ${newStart.toLocaleDateString()} at ${newStart.toLocaleTimeString()}.`,
      type: "booking",
      meta: { booking_id: booking.id },
    });

    return new Response(JSON.stringify({ success: true, booking: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
