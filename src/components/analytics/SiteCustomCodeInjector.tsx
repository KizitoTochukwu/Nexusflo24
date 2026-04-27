import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEAD_MARK = "data-nf24-custom-head";
const BODY_MARK = "data-nf24-custom-body";

function clearTagged(mark: string) {
  document.querySelectorAll(`[${mark}]`).forEach((el) => el.remove());
}

function injectHtml(html: string, target: HTMLElement, mark: string) {
  if (!html?.trim()) return;
  const doc = new DOMParser().parseFromString(`<!doctype html><html><head></head><body>${html}</body></html>`, "text/html");
  const nodes = Array.from(doc.head.childNodes).concat(Array.from(doc.body.childNodes));
  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // re-create scripts so they execute
      if (el.tagName === "SCRIPT") {
        const src = el.getAttribute("src");
        const s = document.createElement("script");
        for (const attr of Array.from(el.attributes)) s.setAttribute(attr.name, attr.value);
        if (src && !s.hasAttribute("async") && !s.hasAttribute("defer")) s.async = true;
        s.text = el.textContent || "";
        s.setAttribute(mark, "1");
        target.appendChild(s);
      } else {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.setAttribute(mark, "1");
        target.appendChild(clone);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      // skip stray whitespace text nodes
    } else if (node.nodeType === Node.COMMENT_NODE) {
      const c = document.createComment(node.nodeValue || "");
      // can't tag a comment; wrap not needed — they'll be cleared via re-fetch overwrite
      target.appendChild(c);
    }
  }
}

async function applyCustomCode() {
  const { data, error } = await supabase
    .from("site_custom_code")
    .select("head_code, body_code, head_enabled, body_enabled")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) return;

  clearTagged(HEAD_MARK);
  clearTagged(BODY_MARK);

  if (data.head_enabled && data.head_code) {
    injectHtml(data.head_code, document.head, HEAD_MARK);
  }
  if (data.body_enabled && data.body_code) {
    injectHtml(data.body_code, document.body, BODY_MARK);
  }
}

export default function SiteCustomCodeInjector() {
  useEffect(() => {
    applyCustomCode();

    const channel = supabase
      .channel("site_custom_code_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_custom_code" },
        () => { applyCustomCode(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return null;
}
