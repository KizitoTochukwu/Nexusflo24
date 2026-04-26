import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FontSizeFieldProps {
  /** Current value, e.g. "36px", "2rem", "" */
  value: string;
  onChange: (next: string) => void;
  /** Preset map: label → CSS size string */
  presets?: { label: string; value: string }[];
  /** Step amount when using +/- buttons (in px). Default: 2 */
  step?: number;
  /** Min px value. Default: 8 */
  min?: number;
  /** Max px value. Default: 200 */
  max?: number;
  /** Default fallback when value is empty and user clicks +/-. Default: 16 */
  fallbackPx?: number;
}

/**
 * Parses a CSS size string. Returns { num, unit } or null if not parseable.
 * Supports px, rem, em, %, vw, vh.
 */
function parseSize(value: string): { num: number; unit: string } | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?\d*\.?\d+)\s*(px|rem|em|%|vw|vh)?$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  return { num, unit: (m[2] || "px").toLowerCase() };
}

export default function FontSizeField({
  value,
  onChange,
  presets,
  step = 2,
  min = 8,
  max = 200,
  fallbackPx = 16,
}: FontSizeFieldProps) {
  const parsed = parseSize(value);

  const adjust = (delta: number) => {
    // Only step when unit is px (or empty). For rem/em/%, fall back to typing.
    if (!parsed || parsed.unit === "px") {
      const current = parsed ? parsed.num : fallbackPx;
      const next = Math.min(max, Math.max(min, current + delta));
      onChange(`${next}px`);
    } else {
      // Non-px unit — adjust the number directly with same step
      const next = Math.max(0, parsed.num + delta * 0.1);
      onChange(`${parseFloat(next.toFixed(2))}${parsed.unit}`);
    }
  };

  const handleNumericKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      adjust(step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      adjust(-step);
    }
  };

  const handleChange = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    // If user types just a number, append "px"
    if (/^-?\d*\.?\d+$/.test(trimmed)) {
      onChange(`${trimmed}px`);
      return;
    }
    onChange(trimmed);
  };

  const isPresetActive = (presetValue: string) =>
    value.replace(/\s/g, "").toLowerCase() === presetValue.replace(/\s/g, "").toLowerCase();

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Font Size</Label>

      {/* Stepper input */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => adjust(-step)}
          aria-label="Decrease font size"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleNumericKey}
          placeholder="e.g. 36px"
          className="text-center"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => adjust(step)}
          aria-label="Increase font size"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Quick presets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={isPresetActive(preset.value) ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium",
                isPresetActive(preset.value) && "pointer-events-none",
              )}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export const HEADING_FONT_PRESETS = [
  { label: "S", value: "24px" },
  { label: "M", value: "36px" },
  { label: "L", value: "48px" },
  { label: "XL", value: "64px" },
  { label: "2XL", value: "80px" },
  { label: "3XL", value: "96px" },
  { label: "Hero", value: "120px" },
];

export const TEXT_FONT_PRESETS = [
  { label: "S", value: "14px" },
  { label: "M", value: "16px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "20px" },
];
