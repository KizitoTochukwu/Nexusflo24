import { useState, useMemo } from "react";
import type { Block } from "@/components/funnels/builder/blockTypes";
import { parseVideoUrl, buildEmbedParams } from "@/components/funnels/builder/videoUtils";

interface Props {
  blocks: Block[];
  onFormSubmit?: (data: Record<string, string>) => Promise<void>;
  formSubmitting?: boolean;
  leadData?: Record<string, string>;
}

const ASPECT_MAP: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%", "21:9": "42.86%" };

/** Interpolate {{variable}} placeholders and process conditional blocks */
function interpolate(text: string, data: Record<string, string>): string {
  let result = text;
  // Process conditionals: {{#if variable > value}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\s*(==|!=|>|<|>=|<=)\s*"?([^}"]*)"?\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName, op, val, content) => {
      const actual = data[`{{${varName}}}`] || "";
      let show = false;
      const numActual = Number(actual);
      const numVal = Number(val);
      if (!isNaN(numActual) && !isNaN(numVal)) {
        switch (op) {
          case ">": show = numActual > numVal; break;
          case "<": show = numActual < numVal; break;
          case ">=": show = numActual >= numVal; break;
          case "<=": show = numActual <= numVal; break;
          case "==": show = numActual === numVal; break;
          case "!=": show = numActual !== numVal; break;
        }
      } else {
        switch (op) {
          case "==": show = actual.toLowerCase() === val.toLowerCase(); break;
          case "!=": show = actual.toLowerCase() !== val.toLowerCase(); break;
          default: show = false;
        }
      }
      return show ? content : "";
    }
  );
  // Simple existence conditional: {{#if variable}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName, content) => {
      const actual = data[`{{${varName}}}`] || "";
      return actual ? content : "";
    }
  );
  // Replace variables
  for (const [key, val] of Object.entries(data)) {
    result = result.split(key).join(val);
  }
  return result;
}

/** Check if text has HTML tags */
function hasHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function RenderBlock({ block, onFormSubmit, formSubmitting, leadData = {} }: { block: Block; onFormSubmit?: Props["onFormSubmit"]; formSubmitting?: boolean; leadData?: Record<string, string> }) {
  const p = block.props;

  switch (block.type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const sizes: Record<string, string> = { h1: "text-4xl md:text-5xl", h2: "text-3xl md:text-4xl", h3: "text-2xl md:text-3xl" };
      const rawText = (p.text as string) || "Heading";
      const resolvedText = Object.keys(leadData).length > 0 ? interpolate(rawText, leadData) : rawText;
      const useHtml = hasHtml(resolvedText);
      const baseStyle: React.CSSProperties = {
        color: p.color as string,
        textAlign: p.align as any,
        fontSize: (p.fontSize as string) || undefined,
        fontWeight: (p.fontWeight as string) || "bold",
        lineHeight: (p.lineHeight as string) || undefined,
        maxWidth: (p.maxWidth as string) || undefined,
      };
      if (useHtml) {
        return (
          <Tag
            className={`${!p.fontSize ? sizes[p.level as string] || "text-3xl" : ""} leading-tight`}
            style={baseStyle}
            dangerouslySetInnerHTML={{ __html: resolvedText }}
          />
        );
      }
      return (
        <Tag
          className={`${!p.fontSize ? sizes[p.level as string] || "text-3xl" : ""} leading-tight`}
          style={baseStyle}
        >
          {resolvedText}
        </Tag>
      );
    }
    case "text": {
      const rawText = (p.text as string) || "";
      const resolvedText = Object.keys(leadData).length > 0 ? interpolate(rawText, leadData) : rawText;
      const useHtml = hasHtml(resolvedText);
      const textStyle: React.CSSProperties = {
        color: p.color as string,
        textAlign: p.align as any,
        fontSize: (p.fontSize as string) || undefined,
        lineHeight: (p.lineHeight as string) || undefined,
      };
      if (useHtml) {
        return (
          <div
            className="text-base md:text-lg leading-relaxed"
            style={textStyle}
            dangerouslySetInnerHTML={{ __html: resolvedText }}
          />
        );
      }
      return (
        <p className="text-base md:text-lg leading-relaxed" style={textStyle}>
          {resolvedText}
        </p>
      );
    }
    case "image": {
      const imgEl = (p.src as string) ? (
        <img
          src={p.src as string}
          alt={p.alt as string}
          style={{
            width: p.width as string,
            borderRadius: p.borderRadius as string,
            objectFit: (p.objectFit as any) || "cover",
            boxShadow: p.shadow ? "0 4px 12px rgba(0,0,0,0.15)" : undefined,
          }}
          className="mx-auto"
        />
      ) : null;
      if (!imgEl) return null;
      if (p.linkUrl) {
        return <div style={{ textAlign: (p.alignment as any) || "center" }}><a href={p.linkUrl as string} target="_blank" rel="noopener noreferrer">{imgEl}</a></div>;
      }
      return <div style={{ textAlign: (p.alignment as any) || "center" }}>{imgEl}</div>;
    }
    case "button":
      return (
        <div style={{ textAlign: p.align as any }}>
          <a
            href={p.link as string || "#"}
            target={p.openNewTab ? "_blank" : undefined}
            rel={p.openNewTab ? "noopener noreferrer" : undefined}
            className="inline-block font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: p.backgroundColor as string,
              color: p.textColor as string,
              borderRadius: (p.borderRadius as string) || "8px",
              padding: `${p.paddingY ?? 12}px ${p.paddingX ?? 32}px`,
              fontSize: p.size === "sm" ? "14px" : "16px",
            }}
          >
            {(p.text as string) || "Button"}
          </a>
        </div>
      );
    case "divider":
      return (
        <hr style={{
          borderColor: p.color as string,
          borderTopWidth: p.thickness as string,
          borderStyle: (p.style as string) || "solid",
          width: (p.width as string) || "100%",
          margin: p.margin as string,
        }} />
      );
    case "spacer":
      return <div style={{ height: p.height as string }} />;
    case "section": {
      const bgType = (p.backgroundType as string) || "solid";
      const style: React.CSSProperties = {
        padding: `${p.paddingTop ?? 40}px ${p.paddingRight ?? 20}px ${p.paddingBottom ?? 40}px ${p.paddingLeft ?? 20}px`,
        marginTop: `${p.marginTop ?? 0}px`,
        marginBottom: `${p.marginBottom ?? 0}px`,
        borderRadius: `${p.borderRadius ?? 0}px`,
        borderWidth: Number(p.borderWidth ?? 0) > 0 ? `${p.borderWidth}px` : undefined,
        borderColor: (p.borderColor as string) || undefined,
        borderStyle: Number(p.borderWidth ?? 0) > 0 ? "solid" : undefined,
        position: "relative",
        overflow: "hidden",
      };
      if (bgType === "solid") style.backgroundColor = (p.backgroundColor as string) || "#ffffff";
      if (bgType === "gradient") style.background = `linear-gradient(135deg, ${p.gradientFrom || "#ffffff"}, ${p.gradientTo || "#f0f0f0"})`;
      if (bgType === "image") {
        style.backgroundImage = `url(${p.backgroundImage})`;
        style.backgroundSize = (p.backgroundSize as string) || "cover";
        style.backgroundPosition = (p.backgroundPosition as string) || "center";
        style.backgroundRepeat = (p.backgroundRepeat as string) || "no-repeat";
      }
      const intensity = (p.shadowIntensity as string) || "medium";
      const shadowMap: Record<string, string> = {
        light: "0 2px 10px rgba(0,0,0,0.06)",
        medium: "0 4px 20px rgba(0,0,0,0.12)",
        heavy: "0 8px 40px rgba(0,0,0,0.2)",
      };
      if (p.shadow) style.boxShadow = shadowMap[intensity] || shadowMap.medium;

      return (
        <div style={style}>
          {bgType === "image" && Number(p.backgroundOverlay ?? 0) > 0 && (
            <div className="absolute inset-0" style={{
              backgroundColor: (p.overlayColor as string) || "#000000",
              opacity: Number(p.backgroundOverlay) / 100,
              borderRadius: `${p.borderRadius ?? 0}px`,
            }} />
          )}
          <div style={{ maxWidth: (p.maxWidth as string) || "960px", position: "relative" }} className="mx-auto">
            {block.children?.map((child) => (
              <RenderBlock key={child.id} block={child} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
            ))}
          </div>
        </div>
      );
    }
    case "columns2":
    case "columns3": {
      const widths = ((p.columnWidths as string) || (block.type === "columns2" ? "50/50" : "33/33/33")).split("/");
      const cols = widths.map((w) => `${w.trim()}%`);
      const vAlign = p.verticalAlign === "center" ? "center" : p.verticalAlign === "bottom" ? "flex-end" : "flex-start";
      const colCount = widths.length;
      // Split children into columns
      const childrenPerCol: Block[][] = Array.from({ length: colCount }, () => []);
      (block.children || []).forEach((child, i) => {
        childrenPerCol[i % colCount].push(child);
      });

      return (
        <div
          className={p.stackOnMobile !== false ? "flex flex-col md:grid" : "grid"}
          style={{ gridTemplateColumns: cols.join(" "), gap: p.gap as string, alignItems: vAlign }}
        >
          {childrenPerCol.map((colChildren, colIdx) => (
            <div key={colIdx} className="space-y-4">
              {colChildren.map((child) => (
                <RenderBlock key={child.id} block={child} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
              ))}
            </div>
          ))}
        </div>
      );
    }
    case "form":
      return <FormBlock props={p} onSubmit={onFormSubmit} submitting={formSubmitting} />;
    case "testimonials": {
      const items = (p.items as { name: string; text: string; role: string }[]) || [];
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border bg-white/50 p-6 shadow-sm">
              <p className="mb-3 text-base italic text-gray-700">"{item.text}"</p>
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.role}</p>
            </div>
          ))}
        </div>
      );
    }
    case "pricing":
      return (
        <div className={`mx-auto max-w-sm rounded-2xl border-2 p-8 text-center ${p.highlighted ? "border-[#D4AF37] shadow-xl" : "border-gray-200"}`}>
          <h4 className="text-xl font-bold text-gray-900">{(p.title as string) || "Plan"}</h4>
          <p className="mt-2 text-4xl font-bold text-[#D4AF37]">{(p.price as string) || "$0"}</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {((p.features as string[]) || []).map((f, i) => <li key={i}>✓ {f}</li>)}
          </ul>
          <button className="mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: p.buttonColor as string }}>
            {(p.buttonText as string) || "Choose Plan"}
          </button>
        </div>
      );
    case "faq": {
      const items = (p.items as { q: string; a: string }[]) || [];
      return (
        <div className="space-y-3 mx-auto max-w-2xl">
          {items.map((item, i) => (
            <details key={i} className="rounded-xl border p-4 open:shadow-sm">
              <summary className="cursor-pointer font-semibold text-gray-900">{item.q}</summary>
              <p className="mt-2 text-sm text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      );
    }
    case "embed": {
      const wrapStyle: React.CSSProperties = {
        maxWidth: (p.maxWidth as string) || undefined,
        marginTop: p.marginTop ? `${p.marginTop}px` : undefined,
        marginBottom: p.marginBottom ? `${p.marginBottom}px` : undefined,
      };
      if ((p.alignment as string) === "center") { wrapStyle.marginLeft = "auto"; wrapStyle.marginRight = "auto"; }
      else if ((p.alignment as string) === "right") { wrapStyle.marginLeft = "auto"; }

      if (p.useAspectRatio && p.src) {
        const pad = ASPECT_MAP[(p.aspectRatio as string) || "16:9"] || "56.25%";
        return (
          <div style={wrapStyle}>
            <div className="relative w-full" style={{ paddingBottom: pad }}>
              <iframe src={p.src as string} className="absolute inset-0 h-full w-full rounded-lg border" title="Embed" />
            </div>
          </div>
        );
      }
      return (p.src as string) ? (
        <div style={wrapStyle}><iframe src={p.src as string} style={{ height: p.height as string }} className="w-full rounded-lg border" title="Embed" /></div>
      ) : null;
    }
    case "video": {
      const info = parseVideoUrl((p.src as string) || "");
      if (!info) return null;
      const pad = ASPECT_MAP[(p.aspectRatio as string) || "16:9"] || "56.25%";
      if (info.provider === "mp4") {
        return (
          <div className="relative w-full" style={{ paddingBottom: pad }}>
            <video src={info.embedUrl} controls={p.controls !== false} muted={!!p.mute} loop={!!p.loop} autoPlay={!!p.autoplay} className="absolute inset-0 h-full w-full rounded-lg object-cover" />
          </div>
        );
      }
      const params = buildEmbedParams({ autoplay: !!p.autoplay, mute: !!p.mute, loop: !!p.loop });
      return (
        <div className="relative w-full" style={{ paddingBottom: pad }}>
          <iframe src={`${info.embedUrl}${params}`} className="absolute inset-0 h-full w-full rounded-lg" title="Video" allow="autoplay; fullscreen" allowFullScreen />
        </div>
      );
    }
    case "booking": {
      const bpId = p.booking_page_id as string;
      if (!bpId) return (
        <div className="mx-auto max-w-sm rounded-xl border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">No booking page selected.</p>
        </div>
      );
      const bookUrl = `${window.location.origin}/book/${bpId}`;
      return (
        <div className="text-center">
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: (p.buttonColor as string) || "#D4AF37" }}
          >
            {(p.buttonText as string) || "Book a Call"}
          </a>
        </div>
      );
    }
    default:
      return null;
  }
}

function FormBlock({ props: p, onSubmit, submitting }: { props: Record<string, unknown>; onSubmit?: Props["onFormSubmit"]; submitting?: boolean }) {
  const fields = (p.fields as string[]) || ["email"];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.email) return;
    await onSubmit?.(values);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-700">Thank you!</p>
        <p className="text-sm text-green-600">Your submission has been received.</p>
      </div>
    );
  }

  const labelMap: Record<string, string> = { firstName: "First Name", lastName: "Last Name", email: "Email", phone: "Phone" };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-3">
      {fields.map((f) => (
        <input
          key={f}
          type={f === "email" ? "email" : f === "phone" ? "tel" : "text"}
          placeholder={labelMap[f] || f}
          required={f === "email"}
          value={values[f] || ""}
          onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
        />
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: (p.buttonColor as string) || "#D4AF37" }}
      >
        {submitting ? "Submitting…" : (p.buttonText as string) || "Submit"}
      </button>
    </form>
  );
}

export default function PublicBlockRenderer({ blocks, onFormSubmit, formSubmitting }: Props) {
  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
      ))}
    </div>
  );
}
