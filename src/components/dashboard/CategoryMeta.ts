import { Car, CookingPot, Lightbulb, Recycle } from "lucide-react";
import type { Category } from "@/types/carbon";

/** Visual metadata (label, icon, theme color) for each footprint category. */
export const CATEGORY_META: Record<
  Category,
  { label: string; icon: typeof Car; color: string }
> = {
  transport: { label: "Transport", icon: Car, color: "var(--chart-1)" },
  food: { label: "Food", icon: CookingPot, color: "var(--chart-2)" },
  energy: { label: "Energy", icon: Lightbulb, color: "var(--chart-3)" },
  waste: { label: "Waste", icon: Recycle, color: "var(--chart-4)" },
};
