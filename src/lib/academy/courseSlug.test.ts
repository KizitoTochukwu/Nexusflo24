import { describe, it, expect } from "vitest";
import { cleanCourseSlug, findCourseBySlug } from "./courseSlug";

const courses = [
  { slug: "ai-video-production-for-small-businesses" },
  { slug: "crm-automation-masterclass" },
];

describe("findCourseBySlug", () => {
  it("opens the course for the exact address", () => {
    expect(findCourseBySlug(courses, "crm-automation-masterclass")?.slug).toBe("crm-automation-masterclass");
  });

  it("opens the course when Facebook appends an invisible word joiner and replacement character", () => {
    const fromFacebook = "ai-video-production-for-small-businesses%E2%81%A0%EF%BF%BD";
    expect(findCourseBySlug(courses, fromFacebook)?.slug).toBe("ai-video-production-for-small-businesses");
    expect(findCourseBySlug(courses, "ai-video-production-for-small-businesses\u2060\uFFFD")?.slug).toBe(
      "ai-video-production-for-small-businesses",
    );
  });

  it("opens the course when trailing punctuation or capitals are copied along", () => {
    expect(findCourseBySlug(courses, "CRM-Automation-Masterclass).")?.slug).toBe("crm-automation-masterclass");
  });

  it("does not guess a course for a different address", () => {
    expect(findCourseBySlug(courses, "ai-video-production")).toBeUndefined();
    expect(cleanCourseSlug("%E2%81%A0")).toBe("");
  });
});
