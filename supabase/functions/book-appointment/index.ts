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

    return new Response(JSON.stringify({ success: true, booking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
