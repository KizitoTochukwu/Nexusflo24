import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { upsertCanonicalContact, linkLeadToContact, recordContactTimeline } from "../_shared/canonicalContact.ts";


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
    const {
      booking_page_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      notes,
      sms_consent,
      sms_consent_text,
      sms_consent_timestamp,
      sms_consent_source,
    } = await req.json();

    if (!booking_page_id || !guest_name || !guest_email || !start_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const smsConsent = sms_consent === true;
    const consentFields = smsConsent
      ? {
          sms_consent: true,
          sms_consent_text: typeof sms_consent_text === "string" ? sms_consent_text.slice(0, 2000) : null,
          sms_consent_timestamp:
            typeof sms_consent_timestamp === "string" ? sms_consent_timestamp : new Date().toISOString(),
          sms_consent_source: typeof sms_consent_source === "string" ? sms_consent_source.slice(0, 200) : "Booking Page",
        }
      : {};

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
      if (smsConsent) {
        await supabase
          .from("leads")
          .update(consentFields)
          .eq("id", existingLead.id);
      }
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
          ...consentFields,
        })
        .select("id")
        .single();
      if (newLead) leadId = newLead.id;
    }

    // Canonical CRM contact for this guest
    let contactId: string | null = null;
    try {
      contactId = await upsertCanonicalContact(supabase, {
        workspaceId: page.workspace_id,
        email: guest_email,
        phone: guest_phone || null,
        fullName: guest_name,
        source: "Booking",
        attribution: { source: "Booking", booking_page: page.name },
        sourceTable: "bookings",
        sourceRecordId: booking_page_id,
      });
      if (contactId && leadId) await linkLeadToContact(supabase, leadId, contactId);
    } catch (contactErr) {
      console.error("[book-appointment] canonical contact failed:", String(contactErr));
    }

    // Resolve meeting location for non-Google-Meet types up front
    let meetingUrl: string | null = null;
    let meetingLocation: string | null = null;
    const locationType: string = (page as any).location_type || "custom_link";
    const locationValue: string | null = (page as any).location_value || null;
    if (locationType === "zoom" || locationType === "custom_link") {
      meetingUrl = locationValue;
    } else if (locationType === "in_person" || locationType === "phone_call") {
      meetingLocation = locationValue;
    }

    // Create booking
    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert({
        booking_page_id,
        workspace_id: page.workspace_id,
        lead_id: leadId,
        contact_id: contactId,
        guest_name,
        guest_email: guest_email.toLowerCase().trim(),
        guest_phone: guest_phone || null,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        status: "confirmed",
        ...consentFields,
        notes: notes || null,
        meeting_url: meetingUrl,
        meeting_location: meetingLocation,
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
              const wantMeet = locationType === "google_meet";
              const eventBody: Record<string, unknown> = {
                summary: `${page.name} - ${guest_name}`,
                description: `Booking with ${guest_name} (${guest_email})${notes ? `\nNotes: ${notes}` : ""}`,
                start: { dateTime: startDt.toISOString(), timeZone: page.timezone },
                end: { dateTime: endDt.toISOString(), timeZone: page.timezone },
                attendees: [{ email: guest_email }],
              };
              if (wantMeet) {
                eventBody.conferenceData = {
                  createRequest: {
                    requestId: `${booking.id}-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
                };
              } else if (meetingLocation) {
                eventBody.location = meetingLocation;
              } else if (meetingUrl) {
                eventBody.location = meetingUrl;
              }

              const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${wantMeet ? "?conferenceDataVersion=1" : ""}`;
              const eventRes = await fetch(url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(eventBody),
              });

              if (eventRes.ok) {
                const eventData = await eventRes.json();
                const meetLink: string | null =
                  eventData.hangoutLink ||
                  eventData?.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri ||
                  null;
                const update: Record<string, unknown> = { google_event_id: eventData.id };
                if (wantMeet && meetLink) {
                  meetingUrl = meetLink;
                  update.meeting_url = meetLink;
                }
                await supabase.from("bookings").update(update).eq("id", booking.id);
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
    if (contactId) {
      await recordContactTimeline(supabase, {
        workspaceId: page.workspace_id,
        contactId,
        activityType: "booking_created",
        title: "Appointment booked",
        description: page.name,
        source: "Booking",
        externalEventId: `booking:${booking.id}`,
        meta: { booking_id: booking.id, start_time: startDt.toISOString() },
      });
      await supabase
        .from("contacts")
        .update({ lifecycle_stage: "opportunity", last_activity_at: new Date().toISOString() })
        .eq("id", contactId)
        .in("lifecycle_stage", ["subscriber", "lead", "marketing_qualified"]);
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

    // Fire the booking event to BOTH engines through the shared dispatcher, so
    // scope (calendar, booking type, assigned user) is honoured consistently.
    if (leadId) {
      try {
        await dispatchTriggerEvent({
          supabase,
          supabaseUrl: Deno.env.get("SUPABASE_URL")!,
          serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          workspaceId: page.workspace_id,
          leadIds: [leadId],
          eventType: "book_appointment",
          eventConfig: {
            booking_id: booking.id,
            calendar_id: page.id,
            booking_type: appointmentTypeId ?? null,
            assigned_user: page.user_id,
            guest_name,
            guest_email,
          },
        });
      } catch (e) {
        console.error("[book-appointment] trigger dispatch failed:", String(e));
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

      // Email-safe Unicode glyph icons (Gmail mobile blocks inline SVG data URIs,
      // so we use text glyphs styled in gold which render reliably everywhere).
      const iconCalendar = "&#128197;"; // 📅
      const iconClock = "&#128340;";    // 🕔
      const iconGlobe = "&#127760;";    // 🌐
      const iconUser = "&#128100;";     // 👤
      const iconMail = "&#9993;";       // ✉
      const iconPhone = "&#128222;";    // 📞
      const iconNote = "&#128221;";     // 📝
      const iconCheck = "&#10004;";     // ✔

      const glyph = (char: string, size = 16) =>
        `<span style="font-size:${size}px;line-height:1;color:${goldColor};display:inline-block;">${char}</span>`;

      const row = (iconChar: string, label: string, value: string) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${borderColor};">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;">${glyph(iconChar)}</td>
                <td valign="top">
                  <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:2px;">${label}</div>
                  <div style="font-size:15px;color:${navyColor};font-weight:600;line-height:1.4;">${value}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

      const lastRow = (iconChar: string, label: string, value: string) => `
        <tr>
          <td style="padding:10px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;">${glyph(iconChar)}</td>
                <td valign="top">
                  <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:2px;">${label}</div>
                  <div style="font-size:15px;color:${navyColor};font-weight:600;line-height:1.4;">${value}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

      const summaryCard = (extraRows = "") => `
        <table width="100%" cellpadding="0" cellspacing="0" class="summary-card" style="margin:20px 0;background:#ffffff;border:1px solid ${borderColor};border-radius:12px;border-top:3px solid ${goldColor};">
          <tr><td class="summary-card-inner" style="padding:20px 24px;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${goldColor};font-weight:700;margin-bottom:4px;">Appointment</div>
            <div class="summary-title" style="font-size:18px;color:${navyColor};font-weight:700;line-height:1.3;margin-bottom:14px;">${page.name}</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row(iconCalendar, "Date", formattedDate)}
              ${row(iconClock, "Time", `${formattedTime} – ${endTime} <span style="font-weight:400;color:${mutedColor};">· ${page.duration_minutes} min</span>`)}
              ${extraRows ? row(iconGlobe, "Timezone", page.timezone) : lastRow(iconGlobe, "Timezone", page.timezone)}
              ${extraRows}
            </table>
            ${notes ? `
              <div style="margin-top:16px;padding:14px 16px;background:${surfaceColor};border-radius:8px;border-left:3px solid ${goldColor};">
                <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${mutedColor};font-weight:600;margin-bottom:4px;">Notes</div>
                <div style="font-size:14px;color:${navyColor};line-height:1.5;word-break:break-word;">${notes}</div>
              </div>` : ""}
          </td></tr>
        </table>`;

      const responsiveCss = `
        <style>
          @media only screen and (max-width:600px) {
            .email-outer-pad { padding: 16px 8px !important; }
            .email-card { border-radius: 12px !important; }
            .email-header { padding: 24px 20px 20px !important; }
            .email-header h1 { font-size: 20px !important; }
            .email-header p { font-size: 13px !important; }
            .email-body { padding: 20px !important; }
            .email-footer { padding: 20px !important; }
            .summary-card-inner { padding: 16px !important; }
            .summary-title { font-size: 16px !important; }
            .action-btn-table { width: 100% !important; }
            .action-btn-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
            .action-btn { display: block !important; width: 100% !important; box-sizing: border-box; text-align: center !important; padding: 14px 20px !important; }
            .fallback-links { font-size: 11px !important; word-break: break-all !important; }
          }
        </style>
      `;

      const emailLayout = (preheader: string, headerTitle: string, headerSub: string, bodyContent: string) => `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${headerTitle}</title>${responsiveCss}</head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;color:${navyColor};-webkit-text-size-adjust:100%;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
            <tr><td align="center" class="email-outer-pad" style="padding:32px 16px;">
              <table width="600" cellpadding="0" cellspacing="0" class="email-card" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,31,59,0.08);">
                <!-- Header -->
                <tr><td class="email-header" style="background:${navyColor};padding:28px 32px;text-align:center;">
                  <div style="margin-bottom:20px;"><img src="https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png" width="48" height="48" alt="NexusFlo24" style="display:inline-block;border-radius:10px;" /></div>
                  
                  <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.01em;">${headerTitle}</h1>
                  <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">${headerSub}</p>
                </td></tr>
                <!-- Gold accent bar -->
                <tr><td style="height:3px;background:${goldColor};line-height:0;font-size:0;">&nbsp;</td></tr>
                <!-- Body -->
                <tr><td class="email-body" style="padding:32px;">${bodyContent}</td></tr>
                <!-- Footer -->
                <tr><td class="email-footer" style="background:${surfaceColor};padding:24px 32px;border-top:1px solid ${borderColor};text-align:center;">
                  <p style="margin:0 0 4px;font-size:13px;color:${navyColor};font-weight:600;">NexusFlo24</p>
                  <p style="margin:0;font-size:12px;color:${mutedColor};">Automate. Convert. Grow.</p>
                </td></tr>
              </table>
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} NexusFlo24. All rights reserved.</p>
            </td></tr>
          </table>
        </body></html>`;

      // Build view + reschedule + cancel links
      const siteUrl = Deno.env.get("SITE_URL") || "https://nexusflo24.lovable.app";
      const viewUrl = `${siteUrl}/reschedule/${booking.reschedule_token}`;
      const rescheduleUrl = `${siteUrl}/reschedule/${booking.reschedule_token}`;
      const cancelUrl = `${siteUrl}/cancel/${booking.reschedule_token}`;


      // Build "Join meeting" card based on location type
      const platformLabel = locationType === "google_meet"
        ? "Google Meet"
        : locationType === "zoom"
        ? "Zoom"
        : locationType === "in_person"
        ? "In person"
        : locationType === "phone_call"
        ? "Phone call"
        : "Online meeting";

      const joinCard = (() => {
        if (meetingUrl) {
          return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${navyColor};border-radius:12px;">
          <tr><td style="padding:22px 24px;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${goldColor};font-weight:700;margin-bottom:6px;">${glyph("&#127909;", 12)} &nbsp;Join meeting</div>
            <div style="font-size:16px;color:#ffffff;font-weight:700;margin-bottom:14px;">${platformLabel}</div>
            <a href="${meetingUrl}" style="display:inline-block;padding:13px 26px;background:${goldColor};color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">Join meeting →</a>
            <p class="fallback-links" style="margin:14px 0 0;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5;word-break:break-all;">
              Or copy this link: <a href="${meetingUrl}" style="color:#ffffff;text-decoration:underline;">${meetingUrl}</a>
            </p>
          </td></tr>
        </table>`;
        }
        if (meetingLocation && locationType === "in_person") {
          return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${surfaceColor};border:1px solid ${borderColor};border-left:3px solid ${goldColor};border-radius:8px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${goldColor};font-weight:700;margin-bottom:4px;">${glyph(iconGlobe, 12)} &nbsp;Location</div>
            <div style="font-size:15px;color:${navyColor};font-weight:600;line-height:1.5;">${meetingLocation}</div>
          </td></tr>
        </table>`;
        }
        if (meetingLocation && locationType === "phone_call") {
          return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${surfaceColor};border:1px solid ${borderColor};border-left:3px solid ${goldColor};border-radius:8px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${goldColor};font-weight:700;margin-bottom:4px;">${glyph(iconPhone, 12)} &nbsp;We'll call you at</div>
            <div style="font-size:16px;color:${navyColor};font-weight:700;line-height:1.4;"><a href="tel:${meetingLocation}" style="color:${navyColor};text-decoration:none;">${meetingLocation}</a></div>
          </td></tr>
        </table>`;
        }
        return "";
      })();

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
        ${joinCard}
        <div style="margin:24px 0 8px;font-size:13px;color:${mutedColor};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Manage your booking</div>
        <table cellpadding="0" cellspacing="0" class="action-btn-table" style="margin:0;">
          <tr>
            <td class="action-btn-cell" style="padding-right:10px;">
              <a href="${viewUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:${goldColor};color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">View booking</a>
            </td>
            <td class="action-btn-cell" style="padding-right:10px;">
              <a href="${rescheduleUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:${navyColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reschedule</a>
            </td>
            <td class="action-btn-cell">
              <a href="${cancelUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:#ffffff;color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid ${borderColor};">Cancel</a>
            </td>
          </tr>
        </table>

        <p class="fallback-links" style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;word-break:break-word;">
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
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: `NexusFlo24 <${fromEmail}>`, to: [to], subject, html }),
          });
          const data = await resp.json().catch(() => ({} as any));
          if (!resp.ok) {
            console.error("book-appointment email failed", to, resp.status, data);
            await supabase.from("email_logs").insert({
              workspace_id: page.workspace_id, to_email: to, from_email: fromEmail,
              subject, direction: "outbound", status: "failed",
              error: (data as any)?.message || `Resend ${resp.status}`,
            });
            return;
          }
          await supabase.from("email_logs").insert({
            workspace_id: page.workspace_id, to_email: to, from_email: fromEmail,
            subject, direction: "outbound", status: "sent",
            provider_message_id: (data as any)?.id || null,
          });
        } catch (e) {
          console.error("book-appointment email exception", to, e);
        }
      };

      // Send guest email
      await sendEmail(
        guest_email,
        `✓ Booking confirmed — ${page.name} on ${formattedDate}`,
        guestHtml
      );

      // Send owner email (respect notify_host setting; defaults to true)
      const notifyHost = (page as any).notify_host !== false;
      if (notifyHost && ownerProfile?.email) {
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
          ${joinCard}
          <div style="margin:24px 0 8px;font-size:13px;color:${mutedColor};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Manage this booking</div>
          <table cellpadding="0" cellspacing="0" class="action-btn-table" style="margin:0;">
            <tr>
              <td class="action-btn-cell" style="padding-right:10px;">
                <a href="${viewUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:${goldColor};color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">View booking</a>
              </td>
              <td class="action-btn-cell" style="padding-right:10px;">
                <a href="${rescheduleUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:${navyColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reschedule</a>
              </td>
              <td class="action-btn-cell">
                <a href="${cancelUrl}" class="action-btn" style="display:inline-block;padding:12px 24px;background:#ffffff;color:${navyColor};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid ${borderColor};">Cancel</a>
              </td>
            </tr>
          </table>

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

    // ── WhatsApp confirmations (best effort) ──────────────────────────
    // Send an approved WhatsApp template to the guest and/or host when
    // the booking page has notify_guest_whatsapp / notify_host_whatsapp
    // enabled and a whatsapp_confirmation_template_id is configured.
    // Provider (Meta / Twilio) is auto-detected by whatsapp-send.
    try {
      const notifyGuestWA = (page as any).notify_guest_whatsapp === true;
      const notifyHostWA = (page as any).notify_host_whatsapp === true;
      const waTemplateId: string | null = (page as any).whatsapp_confirmation_template_id || null;

      if ((notifyGuestWA || notifyHostWA) && waTemplateId) {
        // Confirm workspace has an active WhatsApp provider (Meta or Twilio)
        const [{ data: metaActive }, { data: twilioActive }] = await Promise.all([
          supabase.from("whatsapp_settings").select("id").eq("workspace_id", page.workspace_id).eq("is_active", true).limit(1),
          supabase.from("workspace_channel_settings").select("id").eq("workspace_id", page.workspace_id).eq("channel", "whatsapp").eq("provider", "twilio").eq("is_active", true).limit(1),
        ]);
        const providerActive = (metaActive && metaActive.length > 0) || (twilioActive && twilioActive.length > 0);

        if (!providerActive) {
          console.warn("[book-appointment] WA notify enabled but no active WhatsApp provider");
        } else {
          // Owner profile (for host_name token and host phone lookup)
          const { data: ownerProfileWA } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", page.user_id)
            .maybeSingle();
          // Load template — must be approved and belong to workspace
          const { data: tpl } = await supabase
            .from("whatsapp_templates")
            .select("id, name, language, status, variable_count")
            .eq("id", waTemplateId)
            .eq("workspace_id", page.workspace_id)
            .maybeSingle();

          if (!tpl || tpl.status !== "approved") {
            await supabase.from("notifications").insert({
              workspace_id: page.workspace_id,
              user_id: page.user_id,
              title: "WhatsApp confirmation skipped",
              body: `The template configured on "${page.name}" is missing or no longer approved. Update it in the booking page settings.`,
              type: "system",
              meta: { booking_id: booking.id, template_id: waTemplateId },
            });
          } else {
            // Build booking token map
            const formattedDate = startDt.toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            });
            const formattedTime = startDt.toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit",
            });
            const bookingTokens: Record<string, string> = {
              guest_name,
              page_name: page.name,
              date: formattedDate,
              time: formattedTime,
              meeting_url: meetingUrl || meetingLocation || "See confirmation email",
              host_name: (ownerProfileWA as any)?.full_name || "your host",
              timezone: page.timezone,
            };

            const varTemplate: Record<string, string> =
              ((page as any).whatsapp_confirmation_variables as Record<string, string>) || {};

            // Interpolate {{token}} against booking tokens; positional map "1","2",…
            const interpolate = (v: string): string =>
              String(v).replace(
                /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g,
                (_m, key: string, fallback?: string) => {
                  const val = bookingTokens[key.toLowerCase()];
                  if (val !== undefined && val !== null && String(val).trim() !== "") return String(val);
                  return (fallback ?? "").trim();
                },
              );

            const interpolatedVars: Record<string, string> = {};
            for (let i = 1; i <= (tpl.variable_count || 0); i++) {
              const key = String(i);
              const raw = varTemplate[key];
              if (raw !== undefined) {
                interpolatedVars[key] = interpolate(raw);
              } else {
                // Fallback positional defaults: guest_name, page_name, date, time, meeting_url
                const fallbackByPos = [
                  bookingTokens.guest_name,
                  bookingTokens.page_name,
                  bookingTokens.date,
                  bookingTokens.time,
                  bookingTokens.meeting_url,
                ];
                interpolatedVars[key] = fallbackByPos[i - 1] ?? "";
              }
            }

            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const sendWA = async (toPhone: string, label: string) => {
              try {
                const resp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                  body: JSON.stringify({
                    workspaceId: page.workspace_id,
                    to: toPhone,
                    leadId: label === "guest" ? leadId : null,
                    template: {
                      id: tpl.id,
                      name: tpl.name,
                      language: tpl.language,
                      contentVariables: interpolatedVars,
                    },
                  }),
                });
                if (!resp.ok) {
                  const txt = await resp.text().catch(() => "");
                  console.error(`[book-appointment] whatsapp-send ${label} failed`, resp.status, txt);
                }
              } catch (e) {
                console.error(`[book-appointment] whatsapp-send ${label} exception`, e);
              }
            };

            if (notifyGuestWA && guest_phone) {
              await sendWA(guest_phone, "guest");
            }
            if (notifyHostWA) {
              const hostPhone = (ownerProfileWA as any)?.phone;
              if (hostPhone) {
                await sendWA(hostPhone, "host");
              } else {
                console.warn("[book-appointment] notify_host_whatsapp on but no host phone in profile");
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("[book-appointment] WhatsApp block failed", e);
    }

    return new Response(JSON.stringify({ success: true, booking: { ...booking, meeting_url: meetingUrl, meeting_location: meetingLocation } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
