import { describe, it, expect } from "vitest";
import { parseCsv, decodeCsvBytes } from "./csvParse";

const meta = "id\tcreated_time\tad_name\tform_id\tplatform\temail\tfull_name\tphone_number\n" +
  "l:1\t2026-11-22\tNew Leads ad\tf:1\tfb\tjane@gmail.com\tJane Doe\tp:+2348169418653\n";

describe("lead CSV parsing", () => {
  it("reads tab-separated Meta exports with email, name and phone", () => {
    const [r] = parseCsv(meta);
    expect(r.email).toBe("jane@gmail.com");
    expect(r.full_name).toBe("Jane Doe");
    expect(r.phone).toBe("+2348169418653");
    expect(r.source).toBe("Facebook Ad");
    expect(r.tags).toBe("facebook-ads");
  });
  it("decodes UTF-16 Meta files", () => {
    const enc = new Uint8Array([0xff, 0xfe, ...Array.from(meta).flatMap((c) => [c.charCodeAt(0), 0])]);
    expect(parseCsv(decodeCsvBytes(enc.buffer))[0].email).toBe("jane@gmail.com");
  });
  it("still reads normal comma files", () => {
    const [r] = parseCsv("full_name,email,phone\nJohn,john@x.com,+447700900123\n");
    expect(r.email).toBe("john@x.com");
  });
});
