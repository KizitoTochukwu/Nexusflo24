import { supabase } from "@/integrations/supabase/client";

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an image to the public `funnel-assets` bucket.
 * The storage policy requires the first folder segment to be a workspace the
 * user belongs to, so every upload must be workspace-scoped.
 */
export async function uploadImageAsset(
  file: File,
  workspaceId: string,
  folder: string
): Promise<string> {
  if (!workspaceId) throw new Error("No workspace selected — open this from your workspace.");
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG, GIF, WEBP or SVG images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5MB.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${workspaceId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("funnel-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    const msg = /row-level security|not authorized|Unauthorized/i.test(error.message)
      ? "You don't have permission to upload to this workspace."
      : error.message;
    throw new Error(msg);
  }

  const { data } = supabase.storage.from("funnel-assets").getPublicUrl(path);
  return data.publicUrl;
}
