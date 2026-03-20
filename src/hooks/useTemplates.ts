import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TemplateCategory = "email" | "automation" | "funnel";

export interface Template {
  id: string;
  category: TemplateCategory;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  config: Record<string, unknown>;
  tags: string[];
  popularity: number;
  is_premium: boolean;
  created_at: string;
}

export function useTemplates(category?: TemplateCategory) {
  return useQuery({
    queryKey: ["templates", category],
    queryFn: async () => {
      let query = supabase
        .from("templates" as any)
        .select("*")
        .order("popularity", { ascending: false });
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });
}
