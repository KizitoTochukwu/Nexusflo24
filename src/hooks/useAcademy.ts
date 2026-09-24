import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { courses as staticCourses, type Course, type Module } from "@/data/academyCourses";

export type AcademyCourse = Course & { id?: string; priceMinor: number; currency: string; published: boolean };

export type AcademyCourseRow = {
  id: string; slug: string; title: string; category: string; duration: string; premium: boolean;
  price_minor: number; currency: string; image: string; tagline: string; description: string;
  outcomes: string[]; audience: string[]; instructor_name: string; instructor_title: string;
  modules: Module[]; published: boolean; position: number;
};

export function rowToCourse(r: AcademyCourseRow): AcademyCourse {
  const modules = Array.isArray(r.modules) ? r.modules : [];
  return {
    id: r.id, slug: r.slug, title: r.title, category: r.category, duration: r.duration,
    lessons: modules.reduce((a, m) => a + (m.lessons?.length ?? 0), 0),
    rating: 0, students: 0, premium: r.premium, image: r.image, tagline: r.tagline,
    description: r.description, outcomes: r.outcomes ?? [], audience: r.audience ?? [],
    instructor: { name: r.instructor_name, title: r.instructor_title },
    modules, priceMinor: r.price_minor, currency: r.currency, published: r.published,
  };
}

const fallback: AcademyCourse[] = staticCourses.map((c) => ({ ...c, priceMinor: 0, currency: "GBP", published: true }));

export function useAcademyCourses() {
  return useQuery({
    queryKey: ["academy-courses"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("academy_courses").select("*").eq("published", true).order("position");
      if (error || !data?.length) return fallback;
      return (data as unknown as AcademyCourseRow[]).map(rowToCourse);
    },
    placeholderData: fallback,
  });
}

export function useAcademyTestimonials() {
  return useQuery({
    queryKey: ["academy-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academy_testimonials").select("id,name,role,quote").eq("published", true).order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyEnrolments(userId?: string) {
  return useQuery({
    queryKey: ["academy-my-enrolments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("academy_enrolments")
        .select("id,course_slug,status,agreed_date,created_at").eq("user_id", userId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function formatCoursePrice(c: { premium: boolean; priceMinor: number; currency: string }) {
  if (!c.premium && c.priceMinor <= 0) return "Free";
  if (c.priceMinor <= 0) return "Price coming soon";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: c.currency || "GBP" }).format(c.priceMinor / 100);
}

export const ENROLMENT_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  awaiting_date: "Paid — agreeing class date",
  scheduled: "Live class scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};
