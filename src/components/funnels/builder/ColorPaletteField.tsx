import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPaletteFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Optional swatch palette override */
  palette?: string[];
}

/**
 * Curated, brand-aligned palette inspired by premium SaaS landing pages.
 * Includes neutrals, brand navy/gold, and high-impact accent hues.
 */
export const DEFAULT_COLOR_PALETTE = [
  // Neutrals
  "#FFFFFF", "#F5F5F5", "#D4D4D4", "#737373", "#404040", "#1A1A1A", "#000000",
  // Brand
  "#0B1F3B", "#1E3A5F", "#D4AF37", "#F4D77A", "#C9A227",
  // Accents (vibrant)
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  // Soft pastels
  "#FCA5A5", "#FDBA74", "#FCD34D", "#86EFAC",
  "#93C5FD", "#C4B5FD", "#F9A8D4",
];

function normalizeHex(v: string): string {
  return (v || "").trim().toLowerCase();
}

export default function ColorPaletteField({
  label,
  value,
  onChange,
  palette = DEFAULT_COLOR_PALETTE,
}: ColorPaletteFieldProps) {
  const current = value || "";
  const normalized = normalizeHex(current);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-9 w-9 shrink-0 rounded-md border border-border shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                backgroundColor: current || "transparent",
                backgroundImage: !current
                  ? "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%)"
                  : undefined,
                backgroundSize: !current ? "8px 8px" : undefined,
                backgroundPosition: !current ? "0 0, 4px 4px" : undefined,
              }}
              aria-label={`Open ${label} color picker`}
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] p-3">
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Palette
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {palette.map((swatch) => {
                    const active = normalizeHex(swatch) === normalized;
                    return (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => onChange(swatch)}
                        className={cn(
                          "relative h-7 w-7 rounded-md border border-border/50 shadow-sm transition-all hover:scale-110 hover:shadow-md",
                          active && "ring-2 ring-ring ring-offset-1",
                        )}
                        style={{ backgroundColor: swatch }}
                        title={swatch}
                        aria-label={swatch}
                      >
                        {active && (
                          <Check
                            className="absolute inset-0 m-auto h-3.5 w-3.5"
                            style={{
                              color: isLightColor(swatch) ? "#000" : "#fff",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={current || "#000000"}
                      onChange={(e) => onChange(e.target.value)}
                      className="absolute inset-0 h-9 w-9 cursor-pointer opacity-0"
                      aria-label="Pick custom color"
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9 pointer-events-none">
                      <Pipette className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={current}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="h-9 font-mono text-xs uppercase"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={current}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 flex-1 font-mono text-xs uppercase"
          maxLength={9}
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tip: Highlight text in the editor to color individual words.
      </p>
    </div>
  );
}

/** Quick luminance check to choose readable check-mark color. */
function isLightColor(hex: string): boolean {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 3) return true;
  const expanded =
    cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}
