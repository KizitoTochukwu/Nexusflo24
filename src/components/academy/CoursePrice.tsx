import { useLocalCoursePrice } from "@/hooks/useAcademy";

export default function CoursePrice({ course }: { course: { premium: boolean; priceMinor: number; currency: string } }) {
  return <>{useLocalCoursePrice(course).label}</>;
}
