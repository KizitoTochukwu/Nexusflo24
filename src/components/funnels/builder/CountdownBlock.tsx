import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate?: string; // ISO datetime string
  expiredText?: string;
  showLabels?: boolean;
  showDateTime?: boolean;
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
  numberSize?: number; // px
  labelSize?: number; // px
  introSize?: number; // px
  gap?: number; // px between pills
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

export default function CountdownBlock(props: CountdownProps) {
  const {
    targetDate,
    expiredText = "Event has started",
    showLabels = true,
    showDateTime = true,
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

  const target = targetDate ? new Date(targetDate).getTime() : 0;
  const diff = Math.max(0, target - now);
  const expired = target > 0 && diff <= 0;

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

  return (
    <div style={{ width: "100%" }}>
      {showDateTime && targetDate && (
        <div style={{ display: "flex", flexWrap: "wrap", gap, justifyContent: justify, marginBottom: 16 }}>
          <div style={{ ...pillStyle, display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "10px 16px" }}>
            <span aria-hidden style={{ color: numberColor }}>📅</span>
            <span style={{ color: numberColor, fontSize: 14, fontWeight: 600 }}>
              {dateLabel || formatDate(targetDate)}
            </span>
          </div>
          <div style={{ ...pillStyle, display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "10px 16px" }}>
            <span aria-hidden style={{ color: numberColor }}>🕒</span>
            <span style={{ color: numberColor, fontSize: 14, fontWeight: 600 }}>
              {timeLabel || formatTime(targetDate)}
            </span>
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
    expiredText: p.expiredText as string | undefined,
    showLabels: p.showLabels !== false,
    showDateTime: p.showDateTime !== false,
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
