import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Convert a wall-clock time (yyyy-mm-dd HH:MM) in a given IANA timezone
 * to a UTC Date by computing the offset that timezone has at that instant.
 */
function zonedWallClockToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  // First guess: assume the wall-clock matches UTC, then measure the actual offset
  // that timezone reports at that guessed instant, and correct.
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMs = getTimeZoneOffsetMs(new Date(guess), timeZone);
  // Correct once. (DST transitions: re-measure at the corrected instant for accuracy.)
  const corrected = guess - offsetMs;
  const offsetMs2 = getTimeZoneOffsetMs(new Date(corrected), timeZone);
  return new Date(guess - offsetMs2);
}

/** Returns the offset in ms that `timeZone` is ahead of UTC at the given instant. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Get the weekday index (0=Sun..6=Sat) for a date in a given timezone. */
function weekdayInZone(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[name] ?? 0;
}

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

    const hostTz = page.timezone || "UTC";

    // Parse the requested date as a wall-clock date in the host's timezone.
    const [reqY, reqMo, reqD] = date.split("-").map(Number);

    // Determine the weekday (in the host's timezone) for that calendar date.
    // Use noon UTC of the day so timezone shifts don't cross to the previous/next day.
    const noonUtc = new Date(Date.UTC(reqY, reqMo - 1, reqD, 12, 0, 0));
    const dayKey = DAY_KEYS[weekdayInZone(noonUtc, hostTz)];
    const availability = page.availability as Record<string, { start: string; end: string }[]>;
    const daySlots = availability[dayKey] || [];

    if (daySlots.length === 0) {
      return new Response(JSON.stringify({ slots: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bracket the host's local day in UTC for fetching conflicts.
    const dayStartInstant = zonedWallClockToUtc(reqY, reqMo, reqD, 0, 0, hostTz);
    const dayEndInstant = zonedWallClockToUtc(reqY, reqMo, reqD, 23, 59, hostTz);
    const dayStart = dayStartInstant.toISOString();
    const dayEnd = dayEndInstant.toISOString();

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_page_id", booking_page_id)
      .neq("status", "cancelled")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd);

    const bookings = (existingBookings || []).map((b: any) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
    }));

    // Fetch Google Calendar busy times if connected
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
              const freeBusyRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  timeMin: dayStart,
                  timeMax: new Date(date + "T23:59:59.999Z").toISOString(),
                  items: [{ id: calendarId }],
                }),
              });

              if (freeBusyRes.ok) {
                const freeBusyData = await freeBusyRes.json();
                const busyPeriods = freeBusyData.calendars?.[calendarId]?.busy || [];
                for (const busy of busyPeriods) {
                  bookings.push({
                    start: new Date(busy.start).getTime(),
                    end: new Date(busy.end).getTime(),
                  });
                }
              }
            } catch (_) { /* best effort — fall back to DB-only */ }
          }
        }
      }
    }

    const duration = page.duration_minutes;
    const buffer = page.buffer_minutes || 0;
    const slotStep = duration;

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
        const hasConflict = bookings.some((b: any) => {
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
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
