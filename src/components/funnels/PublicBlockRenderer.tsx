import { useState } from "react";
import type { Block } from "@/components/funnels/builder/blockTypes";

interface Props {
  blocks: Block[];
  onFormSubmit?: (data: Record<string, string>) => Promise<void>;
  formSubmitting?: boolean;
}

function RenderBlock({ block, onFormSubmit, formSubmitting }: { block: Block; onFormSubmit?: Props["onFormSubmit"]; formSubmitting?: boolean }) {
  const p = block.props;

  switch (block.type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const sizes: Record<string, string> = { h1: "text-4xl md:text-5xl", h2: "text-3xl md:text-4xl", h3: "text-2xl md:text-3xl" };
      return (
        <Tag className={`${sizes[p.level as string] || "text-3xl"} font-bold leading-tight`} style={{ color: p.color as string, textAlign: p.align as any }}>
          {(p.text as string) || "Heading"}
        </Tag>
      );
    }
    case "text":
      return <p className="text-base md:text-lg leading-relaxed" style={{ color: p.color as string, textAlign: p.align as any }}>{(p.text as string) || ""}</p>;
    case "image":
      return (p.src as string) ? (
        <img src={p.src as string} alt={p.alt as string} style={{ width: p.width as string, borderRadius: p.borderRadius as string }} className="mx-auto" />
      ) : null;
    case "button":
      return (
        <div style={{ textAlign: p.align as any }}>
          <a
            href={p.link as string || "#"}
            className={`inline-block rounded-lg px-8 py-3 font-semibold transition-opacity hover:opacity-90 ${p.size === "sm" ? "text-sm px-5 py-2" : "text-base"}`}
            style={{ backgroundColor: p.backgroundColor as string, color: p.textColor as string, borderRadius: p.borderRadius as string }}
          >
            {(p.text as string) || "Button"}
          </a>
        </div>
      );
    case "divider":
      return <hr style={{ borderColor: p.color as string, borderTopWidth: p.thickness as string, margin: p.margin as string }} />;
    case "spacer":
      return <div style={{ height: p.height as string }} />;
    case "section":
      return (
        <div style={{ backgroundColor: p.backgroundColor as string, padding: p.padding as string }}>
          <div style={{ maxWidth: p.maxWidth as string }} className="mx-auto">
            {block.children?.map((child) => (
              <RenderBlock key={child.id} block={child} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
            ))}
          </div>
        </div>
      );
    case "columns2":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: p.gap as string }}>
          {block.children?.map((child) => (
            <RenderBlock key={child.id} block={child} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
          ))}
        </div>
      );
    case "columns3":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: p.gap as string }}>
          {block.children?.map((child) => (
            <RenderBlock key={child.id} block={child} onFormSubmit={onFormSubmit} formSubmitting={formSubmitting} />
          ))}
        </div>
      );
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
    case "embed":
      return (p.src as string) ? (
        <iframe src={p.src as string} style={{ height: p.height as string }} className="w-full rounded-lg border" title="Embed" />
      ) : null;
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

  const labelMap: Record<string, string> = {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
  };

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
