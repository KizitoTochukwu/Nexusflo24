import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_page_id, date } = await req.json();

    if (!booking_page_id || !date) {
      return new Response(JSON.stringify({ error: "Missing booking_page_id or date" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({ error: "Booking page not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const requestedDate = new Date(date + "T00:00:00");
    const dayKey = DAY_KEYS[requestedDate.getDay()];
    const availability = page.availability as Record<string, { start: string; end: string }[]>;
    const daySlots = availability[dayKey] || [];

    if (daySlots.length === 0) {
      return new Response(JSON.stringify({ slots: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get existing bookings for that day
    const dayStart = date + "T00:00:00.000Z";
    const dayEnd = date + "T23:59:59.999Z";

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_page_id", booking_page_id)
      .neq("status", "cancelled")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd);

    const bookings = (existingBookings || []).map((b) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
    }));

    const duration = page.duration_minutes;
    const buffer = page.buffer_minutes || 0;
    const slotStep = duration; // generate slots every `duration` minutes

    const availableSlots: string[] = [];

    for (const window of daySlots) {
      const [startH, startM] = window.start.split(":").map(Number);
      const [endH, endM] = window.end.split(":").map(Number);

      const windowStart = new Date(requestedDate);
      windowStart.setHours(startH, startM, 0, 0);
      const windowEnd = new Date(requestedDate);
      windowEnd.setHours(endH, endM, 0, 0);

      let cursor = windowStart.getTime();
      const windowEndMs = windowEnd.getTime();

      while (cursor + duration * 60000 <= windowEndMs) {
        const slotStart = cursor;
        const slotEnd = cursor + duration * 60000;

        // Check conflicts including buffer
        const hasConflict = bookings.some((b) => {
          const bStartBuf = b.start - buffer * 60000;
          const bEndBuf = b.end + buffer * 60000;
          return slotStart < bEndBuf && slotEnd > bStartBuf;
        });

        // Skip past slots
        const now = Date.now();
        if (!hasConflict && slotStart > now) {
          const dt = new Date(slotStart);
          availableSlots.push(dt.toISOString());
        }

        cursor += slotStep * 60000;
      }
    }

    return new Response(JSON.stringify({ slots: availableSlots, duration, timezone: page.timezone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
