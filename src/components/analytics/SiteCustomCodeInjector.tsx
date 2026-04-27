import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEAD_ATTR = "data-nf24-custom-head";
const BODY_ATTR = "data-nf24-custom-body";

/** Remove all previously-injected nodes for a given slot. */
function clearSlot(attr: string) {
  document.querySelectorAll(`[${attr}]`).forEach((n) => n.remove());
}

/**
 * Parse pasted HTML and inject it into the target container.
 * Re-creates <script> nodes so they actually execute (innerHTML scripts don't run).
 */
function injectHtml(html: string, target: "head" | "body", attr: string) {
  if (!html.trim()) return;

  // DOMParser is the safest way to parse arbitrary HTML fragments.
  // Wrap in a template body so <noscript>, <script>, etc. all parse correctly.
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><head></head><body>${html}</body></html>`,
    "text/html"
  );

  // Collect everything from <head> + <body> (DOMParser will sort tags appropriately).
  const sourceNodes: Node[] = [
    ...Array.from(doc.head.childNodes),
    ...Array.from(doc.body.childNodes),
  ];

  const container = target === "head" ? document.head : document.body;
  const insertBefore =
    target === "body" ? null /* append to end */ : null;

  for (const node of sourceNodes) {
    let toInsert: Node | null = null;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      if (el.tagName.toLowerCase() === "script") {
        // Re-create the script element so the browser executes it
        const src = el as HTMLScriptElement;
        const newScript = document.createElement("script");
        // Copy all attributes
        for (const a of Array.from(src.attributes)) {
          newScript.setAttribute(a.name, a.value);
        }
        if (src.src) {
          // External — let it load async by default unless the original opted out
          if (!src.hasAttribute("async") && !src.hasAttribute("defer")) {
            newScript.async = true;
          }
        } else {
          newScript.text = src.textContent || "";
        }
        newScript.setAttribute(attr, "1");
        toInsert = newScript;
      } else {
        // Clone other elements (noscript, link, meta, img, etc.) as-is
        const clone = el.cloneNode(true) as Element;
        clone.setAttribute(attr, "1");
        toInsert = clone;
      }
    }

    if (toInsert) {
      if (target === "body") {
        container.appendChild(toInsert);
      } else {
        container.appendChild(toInsert);
      }
    }
  }
}

/**
 * Mounts once at the app root. Loads the global custom code row, injects it
 * into <head> / end of <body>, and re-injects whenever the row changes.
 */
export default function SiteCustomCodeInjector() {
  useEffect(() => {
    let cancelled = false;

    const apply = (row: {
      head_code: string;
      body_code: string;
      head_enabled: boolean;
      body_enabled: boolean;
    } | null) => {
      // Always clear previous injections first
      clearSlot(HEAD_ATTR);
      clearSlot(BODY_ATTR);
      if (!row) return;
      if (row.head_enabled && row.head_code) {
        injectHtml(row.head_code, "head", HEAD_ATTR);
      }
      if (row.body_enabled && row.body_code) {
        injectHtml(row.body_code, "body", BODY_ATTR);
      }
    };

    const load = async () => {
      const { data } = await supabase
        .from("site_custom_code")
        .select("head_code, body_code, head_enabled, body_enabled")
        .eq("id", "global")
        .maybeSingle();
      if (cancelled) return;
      apply(data as any);
    };

    load();

    const channel = supabase
      .channel("site-custom-code")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_custom_code" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row) apply(row);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
