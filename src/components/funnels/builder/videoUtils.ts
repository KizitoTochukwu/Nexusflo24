export interface VideoInfo {
  provider: "youtube" | "vimeo" | "mp4";
  embedUrl: string;
}

export function parseVideoUrl(url: string): VideoInfo | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // MP4 / direct video
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
    return { provider: "mp4", embedUrl: trimmed };
  }

  return null;
}

export function buildEmbedParams(opts: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean }): string {
  const params: string[] = [];
  if (opts.autoplay) params.push("autoplay=1");
  if (opts.mute) params.push("mute=1");
  if (opts.loop) params.push("loop=1");
  return params.length ? `?${params.join("&")}` : "";
}
