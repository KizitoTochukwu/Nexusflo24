import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(supabase: any, tokenRow: any, clientId: string, clientSecret: string) {
  if (new Date(tokenRow.token_expires_at) > new Date(Date.now() + 60000)) {
    return tokenRow.access_token;
  }
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
  if (!res.ok || !data.access_token) return null;

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: data.access_token, token_expires_at: expiresAt })
    .eq("id", tokenRow.id);

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_page_id, guest_name, guest_email, guest_phone, start_time, notes } = await req.json();

    if (!booking_page_id || !guest_name || !guest_email || !start_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: page, error: pageErr } = await supabase
      .from("booking_pages")
      .select("*")
      .eq("id", booking_page_id)
      .eq("status", "active")
      .single();

    if (pageErr || !page) {
      return new Response(JSON.stringify({ error: "Booking page not found or inactive" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startDt = new Date(start_time);
    const endDt = new Date(startDt.getTime() + page.duration_minutes * 60 * 1000);

    // Check for overlapping bookings (including buffer)
    const bufferMs = (page.buffer_minutes || 0) * 60 * 1000;
    const checkStart = new Date(startDt.getTime() - bufferMs).toISOString();
    const checkEnd = new Date(endDt.getTime() + bufferMs).toISOString();

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_page_id", booking_page_id)
      .neq("status", "cancelled")
      .lt("start_time", checkEnd)
      .gt("end_time", checkStart);

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ error: "Time slot is no longer available" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up or create lead
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, user_id")
      .eq("workspace_id", page.workspace_id)
      .eq("email", guest_email.toLowerCase().trim())
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          workspace_id: page.workspace_id,
          user_id: page.user_id,
          email: guest_email.toLowerCase().trim(),
          full_name: guest_name,
          phone: guest_phone || null,
          source: "Booking",
          status: "New",
          score: 0,
        })
        .select("id")
        .single();
      if (newLead) leadId = newLead.id;
    }

    // Create booking
    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert({
        booking_page_id,
        workspace_id: page.workspace_id,
        lead_id: leadId,
        guest_name,
        guest_email: guest_email.toLowerCase().trim(),
        guest_phone: guest_phone || null,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        status: "confirmed",
        notes: notes || null,
      })
      .select()
      .single();

    if (bookErr) throw bookErr;

    // Google Calendar event creation
    if (page.google_token_id) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (clientId && clientSecret) {
        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens")
          .select("*")
          .eq("id", page.google_token_id)
          .single();

        if (tokenRow) {
          const accessToken = await refreshGoogleToken(supabase, tokenRow, clientId, clientSecret);
          if (accessToken) {
            try {
              const calendarId = tokenRow.calendar_id || "primary";
              const eventRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    summary: `${page.name} - ${guest_name}`,
                    description: `Booking with ${guest_name} (${guest_email})${notes ? `\nNotes: ${notes}` : ""}`,
                    start: { dateTime: startDt.toISOString(), timeZone: page.timezone },
                    end: { dateTime: endDt.toISOString(), timeZone: page.timezone },
                    attendees: [{ email: guest_email }],
                  }),
                }
              );

              if (eventRes.ok) {
                const eventData = await eventRes.json();
                await supabase
                  .from("bookings")
                  .update({ google_event_id: eventData.id })
                  .eq("id", booking.id);
              }
            } catch (_) { /* best effort */ }
          }
        }
      }
    }

    // Log call_booking activity to trigger scoring (+50)
    if (leadId) {
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        workspace_id: page.workspace_id,
        user_id: page.user_id,
        type: "call_booking",
        meta: { booking_id: booking.id, booking_page: page.name },
      });
    }

    // Fire matching automations with trigger_type = 'book_appointment'
    const { data: automations } = await supabase
      .from("automations")
      .select("id")
      .eq("workspace_id", page.workspace_id)
      .eq("trigger_type", "book_appointment")
      .eq("status", "active");

    if (automations && automations.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      for (const auto of automations) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
            body: JSON.stringify({
              automation_id: auto.id,
              workspace_id: page.workspace_id,
              lead_id: leadId,
              trigger_data: { booking_id: booking.id, guest_name, guest_email },
            }),
          });
        } catch (_) { /* best effort */ }
      }
    }

    // Create notification for workspace owner
    await supabase.from("notifications").insert({
      workspace_id: page.workspace_id,
      user_id: page.user_id,
      title: "📅 New Booking",
      body: `${guest_name} booked "${page.name}" for ${startDt.toLocaleDateString()} at ${startDt.toLocaleTimeString()}.`,
      type: "booking",
      meta: { booking_id: booking.id, lead_id: leadId },
    });

    // Send confirmation emails (best effort)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
    if (resendApiKey) {
      const formattedDate = startDt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = startDt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const endTime = endDt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const brandColor = page.color || "#D4AF37";
      const navyColor = "#0B1F3B";

      const emailLayout = (title: string, bodyContent: string) => `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
            <tr><td align="center" style="padding:40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr><td style="background:${navyColor};padding:24px 32px;border-radius:12px 12px 0 0;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📅 ${title}</h1>
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

      const detailsBlock = `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          <tr><td style="padding:12px 16px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">📋 <strong>${page.name}</strong></p>
            <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">📅 ${formattedDate}</p>
            <p style="margin:0 0 4px;font-size:14px;color:${navyColor};">🕐 ${formattedTime} – ${endTime} (${page.duration_minutes} min)</p>
            <p style="margin:0;font-size:14px;color:${navyColor};">🌍 ${page.timezone}</p>
            ${notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">📝 ${notes}</p>` : ""}
          </td></tr>
        </table>
      `;

      // Build reschedule link
      const siteUrl = Deno.env.get("SITE_URL") || "https://nexusflo24.lovable.app";
      const rescheduleUrl = `${siteUrl}/reschedule/${booking.reschedule_token}`;

      // Guest confirmation email
      const guestHtml = emailLayout("Booking Confirmed!", `
        <p style="margin:0 0 16px;font-size:16px;color:${navyColor};">Hi ${guest_name},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#374151;">Your appointment has been confirmed! Here are the details:</p>
        ${detailsBlock}
        <p style="margin:16px 0 0;font-size:13px;color:#374151;">Need to change the time?</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
          <tr><td>
            <a href="${rescheduleUrl}" style="display:inline-block;padding:10px 24px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Reschedule Booking</a>
          </td></tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Or copy this link: ${rescheduleUrl}</p>
      `);

      // Owner notification email
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", page.user_id)
        .single();

      const sendEmail = async (to: string, subject: string, html: string) => {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: `NexusFlo24 <${fromEmail}>`, to: [to], subject, html }),
          });
        } catch (_) { /* best effort */ }
      };

      // Send guest email
      await sendEmail(
        guest_email,
        `Booking Confirmed: ${page.name} on ${formattedDate}`,
        guestHtml
      );

      // Send owner email
      if (ownerProfile?.email) {
        const ownerHtml = emailLayout("New Appointment Booked", `
          <p style="margin:0 0 16px;font-size:16px;color:${navyColor};">Hi ${ownerProfile.full_name || "there"},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">A new appointment has been booked on your booking page:</p>
          ${detailsBlock}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
            <tr><td style="padding:12px 16px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:14px;color:${navyColor};"><strong>Guest:</strong> ${guest_name}</p>
              <p style="margin:0 0 4px;font-size:14px;color:${navyColor};"><strong>Email:</strong> ${guest_email}</p>
              ${guest_phone ? `<p style="margin:0;font-size:14px;color:${navyColor};"><strong>Phone:</strong> ${guest_phone}</p>` : ""}
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Log in to your dashboard to manage this booking.</p>
        `);

        await sendEmail(
          ownerProfile.email,
          `New Booking: ${guest_name} – ${page.name} on ${formattedDate}`,
          ownerHtml
        );
      }
    }

    return new Response(JSON.stringify({ success: true, booking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
