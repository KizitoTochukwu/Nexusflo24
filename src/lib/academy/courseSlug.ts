/**
 * Clean a course slug taken from the web address so badly copied links
 * (e.g. from Facebook, with invisible characters, "�" or trailing punctuation)
 * still resolve to the right course.
 */
export function cleanCourseSlug(raw: string | undefined | null): string {
  if (!raw) return "";
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep raw value if it is not valid percent-encoding
  }
  return s
    .normalize("NFKC")
    .toLowerCase()
    // drop invisible/formatting characters and the replacement character anywhere
    .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFFD\u00AD]/g, "")
    .trim()
    // strip any trailing characters that can't be part of a slug
    .replace(/[^a-z0-9]+$/, "")
    .replace(/^[^a-z0-9]+/, "");
}

export function findCourseBySlug<T extends { slug: string }>(
  courses: T[],
  raw: string | undefined | null,
): T | undefined {
  const exact = courses.find((c) => c.slug === raw);
  if (exact) return exact;
  const cleaned = cleanCourseSlug(raw);
  if (!cleaned) return undefined;
  return courses.find((c) => c.slug.toLowerCase() === cleaned);
}
