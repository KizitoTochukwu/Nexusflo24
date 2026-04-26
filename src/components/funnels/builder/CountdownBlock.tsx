import { useEffect, useMemo, useState } from "react";

interface CountdownProps {
  targetDate?: string; // datetime-local "YYYY-MM-DDTHH:mm" — interpreted in `timezone`
  timezone?: string;   // IANA tz, "viewer-local", or "" (treat as viewer-local)
  expiredText?: string;
  showLabels?: boolean;
  showDateTime?: boolean;
  showTimezone?: boolean;
  dateLabel?: string;
  timeLabel?: string;
  introText?: string;
  align?: "left" | "center" | "right";
  // styling
  numberColor?: string;
  labelColor?: string;
  introColor?: string;
  pillBg?: string;
  pillBorderColor?: string;
  pillBorderWidth?: number;
  pillBorderRadius?: number;
  numberSize?: number;
  labelSize?: number;
  introSize?: number;
  gap?: number;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Resolve viewer-local IANA timezone (falls back gracefully). */
function getViewerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Convert a wall-clock datetime-local string ("YYYY-MM-DDTHH:mm") interpreted
 * in `tz` (IANA) into a real UTC epoch (ms). Uses the offset trick: format
 * a candidate UTC instant in the target tz, measure the delta, correct.
 */
function wallClockInTzToUtcMs(local: string, tz: string): number {
  if (!local) return 0;
  // Parse pieces from the datetime-local string.
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(local).getTime();
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  // Start by assuming the wall clock is UTC, then correct using the tz offset.
  const utcGuess = Date.UTC(y, (mo as number) - 1, d, h, mi, 0);
  const tzWall = getTzWallClock(utcGuess, tz);
  const desired = Date.UTC(y, (mo as number) - 1, d, h, mi, 0);
  const actual = Date.UTC(
    tzWall.year,
    tzWall.month - 1,
    tzWall.day,
    tzWall.hour,
    tzWall.minute,
    tzWall.second
  );
  // delta = how far off our guess was when expressed in tz wall clock.
  const delta = actual - desired;
  return utcGuess - delta;
}

/** Get the wall-clock parts of a UTC instant as seen in `tz`. */
function getTzWallClock(utcMs: number, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Intl can return "24" for midnight in some locales — normalize.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Format a UTC instant for display, in the given timezone. */
function formatDateInTz(utcMs: number, tz: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(utcMs));
  } catch {
    return "";
  }
}

function formatTimeInTz(utcMs: number, tz: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(utcMs));
  } catch {
    return "";
  }
}

/** Short timezone abbreviation (e.g. "GMT", "PDT") for display. */
function getTzAbbreviation(utcMs: number, tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date(utcMs));
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

export default function CountdownBlock(props: CountdownProps) {
  const {
    targetDate,
    timezone,
    expiredText = "Event has started",
    showLabels = true,
    showDateTime = true,
    showTimezone = true,
    dateLabel,
    timeLabel,
    introText = "EVENT STARTS IN",
    align = "center",
    numberColor = "#D4AF37",
    labelColor = "#94a3b8",
    introColor = "#94a3b8",
    pillBg = "rgba(255,255,255,0.04)",
    pillBorderColor = "rgba(255,255,255,0.08)",
    pillBorderWidth = 1,
    pillBorderRadius = 12,
    numberSize = 32,
    labelSize = 11,
    introSize = 12,
    gap = 12,
  } = props;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Effective tz: explicit IANA, or viewer-local when blank/"viewer-local".
  const effectiveTz = useMemo(() => {
    if (!timezone || timezone === "viewer-local") return getViewerTimezone();
    return timezone;
  }, [timezone]);

  // Display tz: when "viewer-local" we show it in each viewer's tz.
  // Otherwise show in the configured tz (so all viewers see the same wall time).
  const displayTz = effectiveTz;

  const targetUtcMs = useMemo(
    () => (targetDate ? wallClockInTzToUtcMs(targetDate, effectiveTz) : 0),
    [targetDate, effectiveTz]
  );

  const diff = Math.max(0, targetUtcMs - now);
  const expired = targetUtcMs > 0 && diff <= 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const units = [
    { value: days, label: "DAYS" },
    { value: hours, label: "HOURS" },
    { value: minutes, label: "MINUTES" },
    { value: seconds, label: "SECONDS" },
  ];

  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  const pillStyle: React.CSSProperties = {
    backgroundColor: pillBg,
    borderColor: pillBorderColor,
    borderWidth: pillBorderWidth,
    borderStyle: "solid",
    borderRadius: pillBorderRadius,
    padding: "12px 16px",
    minWidth: 72,
    textAlign: "center",
  };

  const tzAbbrev = targetUtcMs ? getTzAbbreviation(targetUtcMs, displayTz) : "";
  const timeText = timeLabel
    || (targetUtcMs
      ? `${formatTimeInTz(targetUtcMs, displayTz)}${showTimezone && tzAbbrev ? ` ${tzAbbrev}` : ""}`
      : "");
  const dateText = dateLabel || (targetUtcMs ? formatDateInTz(targetUtcMs, displayTz) : "");

  return (
    <div style={{ width: "100%" }}>
      {showDateTime && targetDate && (
        <div style={{ display: "flex", flexWrap: "wrap", gap, justifyContent: justify, marginBottom: 16 }}>
          <div style={{ ...pillStyle, display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "10px 16px" }}>
            <span aria-hidden style={{ color: numberColor }}>📅</span>
            <span style={{ color: numberColor, fontSize: 14, fontWeight: 600 }}>{dateText}</span>
          </div>
          <div style={{ ...pillStyle, display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "10px 16px" }}>
            <span aria-hidden style={{ color: numberColor }}>🕒</span>
            <span style={{ color: numberColor, fontSize: 14, fontWeight: 600 }}>{timeText}</span>
          </div>
        </div>
      )}

      {introText && (
        <p
          style={{
            color: introColor,
            fontSize: introSize,
            letterSpacing: "0.12em",
            textAlign: align,
            margin: "0 0 10px 0",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {introText}
        </p>
      )}

      {expired ? (
        <p style={{ color: numberColor, textAlign: align, fontSize: numberSize / 1.6, fontWeight: 700, margin: 0 }}>
          {expiredText}
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap, justifyContent: justify }}>
          {units.map((u) => (
            <div key={u.label} style={pillStyle}>
              <div style={{ color: numberColor, fontSize: numberSize, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {pad(u.value)}
              </div>
              {showLabels && (
                <div style={{ color: labelColor, fontSize: labelSize, marginTop: 6, letterSpacing: "0.1em", fontWeight: 600 }}>
                  {u.label}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function getCountdownPropsFromBlock(p: Record<string, unknown>): CountdownProps {
  return {
    targetDate: p.targetDate as string | undefined,
    timezone: (p.timezone as string) || "viewer-local",
    expiredText: p.expiredText as string | undefined,
    showLabels: p.showLabels !== false,
    showDateTime: p.showDateTime !== false,
    showTimezone: p.showTimezone !== false,
    dateLabel: p.dateLabel as string | undefined,
    timeLabel: p.timeLabel as string | undefined,
    introText: p.introText as string | undefined,
    align: (p.align as CountdownProps["align"]) || "center",
    numberColor: (p.numberColor as string) || "#D4AF37",
    labelColor: (p.labelColor as string) || "#94a3b8",
    introColor: (p.introColor as string) || "#94a3b8",
    pillBg: (p.pillBg as string) || "rgba(255,255,255,0.04)",
    pillBorderColor: (p.pillBorderColor as string) || "rgba(255,255,255,0.08)",
    pillBorderWidth: Number(p.pillBorderWidth ?? 1),
    pillBorderRadius: Number(p.pillBorderRadius ?? 12),
    numberSize: Number(p.numberSize ?? 32),
    labelSize: Number(p.labelSize ?? 11),
    introSize: Number(p.introSize ?? 12),
    gap: Number(p.gap ?? 12),
  };
}

/** Common IANA timezones for the picker. */
export const TIMEZONE_OPTIONS: { label: string; value: string }[] = [
  { label: "Viewer's local timezone (auto)", value: "viewer-local" },
  { label: "UTC", value: "UTC" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Dublin", value: "Europe/Dublin" },
  { label: "Paris / Berlin / Madrid (CET)", value: "Europe/Paris" },
  { label: "Athens / Helsinki (EET)", value: "Europe/Athens" },
  { label: "Lagos / Accra (WAT)", value: "Africa/Lagos" },
  { label: "Johannesburg (SAST)", value: "Africa/Johannesburg" },
  { label: "Nairobi (EAT)", value: "Africa/Nairobi" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "Karachi (PKT)", value: "Asia/Karachi" },
  { label: "Mumbai / Delhi (IST)", value: "Asia/Kolkata" },
  { label: "Bangkok / Jakarta", value: "Asia/Bangkok" },
  { label: "Singapore / Hong Kong", value: "Asia/Singapore" },
  { label: "Tokyo / Seoul", value: "Asia/Tokyo" },
  { label: "Sydney (AEST/AEDT)", value: "Australia/Sydney" },
  { label: "Auckland (NZST/NZDT)", value: "Pacific/Auckland" },
  { label: "New York (ET)", value: "America/New_York" },
  { label: "Chicago (CT)", value: "America/Chicago" },
  { label: "Denver (MT)", value: "America/Denver" },
  { label: "Los Angeles (PT)", value: "America/Los_Angeles" },
  { label: "Toronto", value: "America/Toronto" },
  { label: "Mexico City", value: "America/Mexico_City" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Buenos Aires", value: "America/Argentina/Buenos_Aires" },
];
