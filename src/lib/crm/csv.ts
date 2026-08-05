/** Shared CSV export helpers for the CRM module. */

export const csvEscape = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T | string; label?: string; value?: (row: T) => unknown }[],
) {
  const header = columns.map((c) => csvEscape(c.label ?? String(c.key))).join(",");
  const body = rows.map((r) =>
    columns.map((c) => csvEscape(c.value ? c.value(r) : r[c.key as keyof T])).join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T | string; label?: string; value?: (row: T) => unknown }[],
) {
  downloadCsv(filename, buildCsv(rows, columns));
}
