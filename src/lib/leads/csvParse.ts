/** CSV/TSV parsing for lead imports, including raw Meta (Facebook/Instagram) lead exports. */

export type ParsedRow = Record<string, string>;

const HEADER_ALIASES: Record<string, string> = {
  name: "full_name", fullname: "full_name", full_name: "full_name", contact: "full_name",
  contact_name: "full_name", customer: "full_name", customer_name: "full_name", lead: "full_name",
  lead_name: "full_name", first_name: "full_name", firstname: "full_name", last_name: "full_name", lastname: "full_name",
  email: "email", email_address: "email", e_mail: "email", work_email: "email",
  phone: "phone", phone_number: "phone", mobile: "phone", mobile_number: "phone",
  whatsapp: "phone", whatsapp_number: "phone", work_phone_number: "phone",
  source: "source", lead_source: "source", status: "status", lead_status: "status", tags: "tags", tag: "tags",
};

export function canonicalHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/[\s\-?]+/g, "_").replace(/^_+|_+$/g, "");
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  // Meta custom questions, e.g. "what_is_your_whatsapp_number"
  if (/(whatsapp|phone|mobile)/.test(key) && !/(id|opt)/.test(key)) return "phone";
  if (/e_?mail/.test(key)) return "email";
  return key;
}

/** Decode bytes, handling UTF-16 (Meta's default export) and UTF-8 BOMs. */
export function decodeCsvBytes(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  // UTF-16LE without BOM: every second byte is zero
  if (b.length > 4 && b[1] === 0 && b[3] === 0 && b[0] !== 0) return new TextDecoder("utf-16le").decode(b);
  return new TextDecoder("utf-8").decode(b);
}

/** Pick the delimiter that appears most in the header line (outside quotes). */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  let best = ",", bestCount = 0;
  for (const d of [",", "\t", ";", "|"]) {
    let count = 0, q = false;
    for (const ch of firstLine) { if (ch === '"') q = !q; else if (!q && ch === d) count++; }
    if (count > bestCount) { best = d; bestCount = count; }
  }
  return best;
}

/** Strip Meta value prefixes like "p:+234..." and "l:123". */
function cleanValue(header: string, v: string): string {
  if (header === "phone") return v.replace(/^p:/i, "");
  return v;
}

export function parseCsv(input: string): ParsedRow[] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delim = detectDelimiter(text);

  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(cur.trim()); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = []; cur = "";
    } else cur += ch;
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur.trim()); if (row.some((c) => c.length > 0)) rows.push(row); }
  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const headers = rows[0].map(canonicalHeader);
  const fi = rawHeaders.indexOf("first_name") !== -1 ? rawHeaders.indexOf("first_name") : rawHeaders.indexOf("firstname");
  const li = rawHeaders.indexOf("last_name") !== -1 ? rawHeaders.indexOf("last_name") : rawHeaders.indexOf("lastname");
  const hasSplit = fi !== -1 && li !== -1;
  const platformIdx = rawHeaders.indexOf("platform");
  const isMeta = platformIdx !== -1 && rawHeaders.includes("form_id");

  return rows.slice(1).map((values) => {
    const obj: ParsedRow = {};
    headers.forEach((h, i) => {
      if (hasSplit && (i === fi || i === li)) return;
      if (!obj[h]) obj[h] = cleanValue(h, values[i] || "");
    });
    if (hasSplit) {
      const combined = [values[fi], values[li]].map((s) => (s || "").trim()).filter(Boolean).join(" ");
      if (combined) obj.full_name = combined;
    }
    if (isMeta) {
      const p = (values[platformIdx] || "").toLowerCase();
      if (!obj.source) obj.source = p === "ig" ? "Instagram Ad" : "Facebook Ad";
      if (!obj.tags) obj.tags = p === "ig" ? "instagram-ads" : "facebook-ads";
    }
    return obj;
  });
}
