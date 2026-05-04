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

    // Cancel pending automation jobs for any active automation in this workspace
    // whose exit_criteria contains { type: "appointment_booked" }. This stops the
    // nurture sequence immediately, mirroring fireAutomationsForLeads' sweep.
    if (leadId) {
      try {
        const { data: activeAutos } = await supabase
          .from("automations")
          .select("id, exit_criteria")
          .eq("workspace_id", page.workspace_id)
          .eq("status", "active");
        const exitAutoIds = (activeAutos || [])
          .filter((a: any) => Array.isArray(a.exit_criteria) && a.exit_criteria.some((c: any) => c?.type === "appointment_booked"))
          .map((a: any) => a.id);
        if (exitAutoIds.length > 0) {
          const { data: cancelled } = await supabase
            .from("scheduled_jobs")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
              error: "Exit criteria met: appointment_booked",
            })
            .eq("workspace_id", page.workspace_id)
            .in("automation_id", exitAutoIds)
            .eq("lead_id", leadId)
            .eq("status", "pending")
            .select("id, automation_id, lead_id");
          if (cancelled && cancelled.length > 0) {
            await supabase.from("automation_logs").insert(
              cancelled.map((c: any) => ({
                automation_id: c.automation_id,
                workspace_id: page.workspace_id,
                lead_id: c.lead_id,
                event_type: "exit_criteria:appointment_booked",
                status: "cancelled",
                details: { reason: "Booking created", booking_id: booking.id },
              }))
            );
          }
        }
      } catch (e) {
        console.error("[book-appointment] exit-criteria sweep error:", e);
      }
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

      const brandColor = page.color || "#C9A227";
      const navyColor = "#0B1F3B";
      const goldColor = "#C9A227";
      const mutedColor = "#64748b";
      const borderColor = "#e2e8f0";
      const surfaceColor = "#f8fafc";

      // Inline SVG icons (email-safe, served as data URIs)
      const icon = (svg: string) =>
        `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      const iconCalendar = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`);
      const iconClock = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`);
      const iconGlobe = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>`);
      const iconUser = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`);
      const iconMail = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>`);
      const iconPhone = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`);
      const iconNote = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${goldColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`);
      const iconCheck = icon(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`);

      const row = (iconUrl: string, label: string, value: string) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${borderColor};">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;"><img src="${iconUrl}" width="18" height="18" alt="" style="display:block;"></td>
                <td valign="top">
                  <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:2px;">${label}</div>
                  <div style="font-size:15px;color:${navyColor};font-weight:600;line-height:1.4;">${value}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

      const lastRow = (iconUrl: string, label: string, value: string) => `
        <tr>
          <td style="padding:10px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;"><img src="${iconUrl}" width="18" height="18" alt="" style="display:block;"></td>
                <td valign="top">
                  <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:2px;">${label}</div>
                  <div style="font-size:15px;color:${navyColor};font-weight:600;line-height:1.4;">${value}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

      const summaryCard = (extraRows = "") => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#ffffff;border:1px solid ${borderColor};border-radius:12px;border-top:3px solid ${goldColor};">
          <tr><td style="padding:20px 24px;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${goldColor};font-weight:700;margin-bottom:4px;">Appointment</div>
            <div style="font-size:18px;color:${navyColor};font-weight:700;line-height:1.3;margin-bottom:14px;">${page.name}</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row(iconCalendar, "Date", formattedDate)}
              ${row(iconClock, "Time", `${formattedTime} – ${endTime} <span style="font-weight:400;color:${mutedColor};">· ${page.duration_minutes} min</span>`)}
              ${extraRows ? row(iconGlobe, "Timezone", page.timezone) : lastRow(iconGlobe, "Timezone", page.timezone)}
              ${extraRows}
            </table>
            ${notes ? `
              <div style="margin-top:16px;padding:14px 16px;background:${surfaceColor};border-radius:8px;border-left:3px solid ${goldColor};">
                <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:4px;">Notes</div>
                <div style="font-size:14px;color:${navyColor};line-height:1.5;">${notes}</div>
              </div>` : ""}
          </td></tr>
        </table>`;

      const emailLayout = (preheader: string, headerTitle: string, headerSub: string, bodyContent: string) => `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${headerTitle}</title></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;color:${navyColor};">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
            <tr><td align="center" style="padding:32px 16px;">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,31,59,0.08);">
                <!-- Header -->
                <tr><td style="background:${navyColor};padding:32px 32px 28px;text-align:center;">
                  <div style="display:inline-block;width:56px;height:56px;line-height:56px;background:${goldColor};border-radius:50%;text-align:center;margin-bottom:16px;">
                    <img src="${iconCheck}" width="22" height="22" alt="" style="display:inline-block;vertical-align:middle;">
                  </div>
                  <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.01em;">${headerTitle}</h1>
                  <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">${headerSub}</p>
                </td></tr>
                <!-- Gold accent bar -->
                <tr><td style="height:3px;background:${goldColor};line-height:0;font-size:0;">&nbsp;</td></tr>
                <!-- Body -->
                <tr><td style="padding:32px;">${bodyContent}</td></tr>
                <!-- Footer -->
                <tr><td style="background:${surfaceColor};padding:24px 32px;border-top:1px solid ${borderColor};text-align:center;">
                  <p style="margin:0 0 4px;font-size:13px;color:${navyColor};font-weight:600;">NexusFlo24</p>
                  <p style="margin:0;font-size:12px;color:${mutedColor};">Automate. Convert. Grow.</p>
                </td></tr>
              </table>
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} NexusFlo24. All rights reserved.</p>
            </td></tr>
          </table>
        </body></html>`;

      // Build reschedule + cancel links
      const siteUrl = Deno.env.get("SITE_URL") || "https://nexusflo24.lovable.app";
      const rescheduleUrl = `${siteUrl}/reschedule/${booking.reschedule_token}`;
      const cancelUrl = `${siteUrl}/cancel/${booking.reschedule_token}`;

      // Guest confirmation email
      const guestHtml = emailLayout(
        `Your booking for ${page.name} on ${formattedDate} is confirmed.`,
        "Booking Confirmed",
        `${formattedDate} · ${formattedTime}`,
        `
        <p style="margin:0 0 8px;font-size:16px;color:${navyColor};font-weight:600;">Hi ${guest_name},</p>
        <p style="margin:0 0 4px;font-size:15px;color:${mutedColor};line-height:1.6;">
          Your appointment is locked in. We've added the details below — see you soon.
        </p>
        ${summaryCard()}
        <div style="margin:24px 0 8px;font-size:13px;color:${mutedColor};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Manage your booking</div>
        <table cellpadding="0" cellspacing="0" style="margin:0;">
          <tr>
            <td style="padding-right:10px;">
              <a href="${rescheduleUrl}" style="display:inline-block;padding:12px 24px;background:${navyColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reschedule</a>
            </td>
            <td>
              <a href="${cancelUrl}" style="display:inline-block;padding:12px 24px;background:#ffffff;color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid ${borderColor};">Cancel</a>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
          Trouble with the buttons? Reschedule: <a href="${rescheduleUrl}" style="color:${navyColor};">${rescheduleUrl}</a><br>
          Cancel: <a href="${cancelUrl}" style="color:${navyColor};">${cancelUrl}</a>
        </p>
        `
      );

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
        `✓ Booking confirmed — ${page.name} on ${formattedDate}`,
        guestHtml
      );

      // Send owner email
      if (ownerProfile?.email) {
        const guestRows = `
          ${row(iconUser, "Guest", guest_name)}
          ${guest_phone ? row(iconMail, "Email", guest_email) : lastRow(iconMail, "Email", guest_email)}
          ${guest_phone ? lastRow(iconPhone, "Phone", guest_phone) : ""}
        `;
        const ownerHtml = emailLayout(
          `${guest_name} just booked ${page.name}.`,
          "New Appointment",
          `${guest_name} · ${formattedDate}`,
          `
          <p style="margin:0 0 8px;font-size:16px;color:${navyColor};font-weight:600;">Hi ${ownerProfile.full_name || "there"},</p>
          <p style="margin:0 0 4px;font-size:15px;color:${mutedColor};line-height:1.6;">
            A new appointment has been booked. Here are the full details.
          </p>
          ${summaryCard(guestRows)}
          <p style="margin:20px 0 0;font-size:13px;color:${mutedColor};line-height:1.6;">
            Log in to your dashboard to manage this booking, message the guest, or update your availability.
          </p>
          `
        );

        await sendEmail(
          ownerProfile.email,
          `New booking · ${guest_name} — ${page.name} on ${formattedDate}`,
          ownerHtml
        );
      }
    }

    return new Response(JSON.stringify({ success: true, booking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
