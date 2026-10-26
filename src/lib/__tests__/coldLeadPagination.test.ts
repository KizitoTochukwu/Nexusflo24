import { describe, expect, it } from "vitest";
import { paginatedRows } from "../../../supabase/functions/_shared/paginatedRows";

const id = (n: number) => String(n).padStart(6, "0");
const source = (count: number) => Array.from({ length: count }, (_, n) => ({ id: id(n) }));
const fetcher = (rows: { id: string }[]) => async (after: string | null, limit: number) => ({
  data: rows.filter((row) => after === null || row.id > after).slice(0, limit), error: null,
});

describe("cold-lead pagination", () => {
  it("reaches eligible leads after 500 excluded rows and keeps the 50-enrolment cap", async () => {
    const selected: string[] = [];
    for await (const row of paginatedRows(fetcher(source(1100)))) {
      if (row.id < id(1000)) continue;
      selected.push(row.id);
      if (selected.length >= 50) break;
    }
    expect(selected).toEqual(source(50).map((_, n) => id(1000 + n)));
  });

  it("continues beyond the old 10000-row enrolment history limit", async () => {
    const history = new Set<string>();
    for await (const row of paginatedRows(fetcher(source(10001)))) history.add(row.id);
    expect(history.size).toBe(10001);
    expect(history.has(id(10000))).toBe(true);
  });

  it("fails on a page error instead of treating unknown history as eligible", async () => {
    const scan = async () => {
      for await (const row of paginatedRows(async () => ({ data: null, error: new Error("unavailable") }))) {
        void row;
      }
    };
    await expect(scan()).rejects.toThrow("unavailable");
  });
});