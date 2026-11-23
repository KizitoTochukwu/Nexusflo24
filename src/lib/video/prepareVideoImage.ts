// Prepares an uploaded photo so the AI video model accepts it.
// Seedance needs every side between 300 and 6000 px and a width/height ratio between 0.4 and 2.5.

export const VIDEO_IMAGE_MIN_SIDE = 300;
export const VIDEO_IMAGE_MAX_SIDE = 6000;
export const VIDEO_IMAGE_MIN_RATIO = 0.4;
export const VIDEO_IMAGE_MAX_RATIO = 2.5;
/** Small images are enlarged so their shortest side reaches this size. */
export const VIDEO_IMAGE_UPSCALE_TARGET = 720;
/** Large images are reduced so their longest side stays at or under this size (keeps uploads light). */
export const VIDEO_IMAGE_DOWNSCALE_TARGET = 2048;

export type ImagePlan = {
  width: number;
  height: number;
  /** Where the original photo is drawn inside the output canvas. */
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  upscaled: boolean;
  downscaled: boolean;
  padded: boolean;
};

export function planVideoImage(srcW: number, srcH: number): ImagePlan {
  if (!(srcW > 0 && srcH > 0)) throw new Error("This image has no size. Try another photo.");

  // 1. Pad very wide or very tall photos so the shape is acceptable.
  let canvasW = srcW;
  let canvasH = srcH;
  const ratio = srcW / srcH;
  if (ratio > VIDEO_IMAGE_MAX_RATIO) canvasH = Math.ceil(srcW / VIDEO_IMAGE_MAX_RATIO);
  else if (ratio < VIDEO_IMAGE_MIN_RATIO) canvasW = Math.ceil(srcH * VIDEO_IMAGE_MIN_RATIO);
  const padded = canvasW !== srcW || canvasH !== srcH;

  // 2. Scale up small photos, scale down huge ones.
  let scale = 1;
  const minSide = Math.min(canvasW, canvasH);
  const maxSide = Math.max(canvasW, canvasH);
  if (minSide < VIDEO_IMAGE_MIN_SIDE) scale = VIDEO_IMAGE_UPSCALE_TARGET / minSide;
  if (maxSide * scale > VIDEO_IMAGE_DOWNSCALE_TARGET) scale = VIDEO_IMAGE_DOWNSCALE_TARGET / maxSide;

  const width = Math.max(VIDEO_IMAGE_MIN_SIDE, Math.round(canvasW * scale));
  const height = Math.max(VIDEO_IMAGE_MIN_SIDE, Math.round(canvasH * scale));
  const drawW = Math.round(srcW * scale);
  const drawH = Math.round(srcH * scale);
  return {
    width,
    height,
    drawX: Math.round((width - drawW) / 2),
    drawY: Math.round((height - drawH) / 2),
    drawW,
    drawH,
    upscaled: scale > 1,
    downscaled: scale < 1,
    padded,
  };
}

export type PreparedImage = { dataUrl: string; width: number; height: number; originalWidth: number; originalHeight: number; changed: boolean; note: string | null };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This photo could not be opened. Use a PNG, JPG or WebP image."));
    img.src = src;
  });
}

const readAsDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("This photo could not be read."));
    r.readAsDataURL(f);
  });

/** Reads a photo, fixes its size/shape when needed, and returns a JPEG data URL ready for the video model. */
export async function prepareVideoImage(file: File): Promise<PreparedImage> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const plan = planVideoImage(w, h);
  const changed = plan.upscaled || plan.downscaled || plan.padded;

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare this photo.");
  ctx.fillStyle = "#FFFFFF"; // plain backdrop for padding and transparent areas
  ctx.fillRect(0, 0, plan.width, plan.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, plan.drawX, plan.drawY, plan.drawW, plan.drawH);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  let note: string | null = null;
  if (plan.upscaled) note = `Your photo was small (${w}×${h}px), so we enlarged it to ${plan.width}×${plan.height}px. A sharper, larger photo gives better results.`;
  else if (plan.padded) note = `Your photo was very wide or tall, so we added a plain border to make it ${plan.width}×${plan.height}px.`;
  return { dataUrl, width: plan.width, height: plan.height, originalWidth: w, originalHeight: h, changed, note };
}
