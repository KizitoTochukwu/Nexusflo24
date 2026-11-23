import { describe, expect, it } from "vitest";
import { planVideoImage } from "./prepareVideoImage";

const ratio = (p: { width: number; height: number }) => p.width / p.height;

describe("planVideoImage", () => {
  it("enlarges the 383x182 photo that failed so every side is at least 300px", () => {
    const p = planVideoImage(383, 182);
    expect(p.upscaled).toBe(true);
    expect(Math.min(p.width, p.height)).toBeGreaterThanOrEqual(300);
    expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(6000);
  });

  it("leaves a normal 1080x1350 photo at its size", () => {
    const p = planVideoImage(1080, 1350);
    expect(p).toMatchObject({ width: 1080, height: 1350, upscaled: false, downscaled: false, padded: false });
  });

  it("shrinks a huge 8000x6000 photo below the 6000px limit", () => {
    const p = planVideoImage(8000, 6000);
    expect(p.downscaled).toBe(true);
    expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(6000);
  });

  it("pads a very wide 3000x600 banner to a 2.5 shape or narrower", () => {
    const p = planVideoImage(3000, 600);
    expect(p.padded).toBe(true);
    expect(ratio(p)).toBeLessThanOrEqual(2.5 + 0.01);
  });

  it("pads a very tall 400x2000 photo to a 0.4 shape or wider", () => {
    const p = planVideoImage(400, 2000);
    expect(p.padded).toBe(true);
    expect(ratio(p)).toBeGreaterThanOrEqual(0.4 - 0.01);
  });
});
