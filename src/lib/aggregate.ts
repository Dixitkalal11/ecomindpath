/**
 * Aggregation helpers: combine an activity list into category totals or a
 * date-keyed trend. Pure functions, fully tested.
 */
import type { Activity, CategoryBreakdown } from "@/types/carbon";
import { round } from "./math";

/** Empty breakdown initialiser used as the reduce seed and for empty UI states. */
export function emptyBreakdown(): CategoryBreakdown {
  return { transport: 0, food: 0, energy: 0, waste: 0 };
}

/**
 * Sum activities by category. NaN values in `co2e_kg` are treated as 0 so
 * a single bad row can't poison the dashboard total.
 *
 * @param activities Activity rows.
 * @returns Per-category totals in kg CO₂e.
 */
export function aggregate(activities: Activity[]): CategoryBreakdown {
  return activities.reduce<CategoryBreakdown>((acc, a) => {
    acc[a.category] += Number(a.co2e_kg) || 0;
    return acc;
  }, emptyBreakdown());
}

/**
 * Sum a category breakdown into a single number.
 * @param breakdown Output of {@link aggregate}.
 * @returns Total kg CO₂e across all categories.
 */
export function totalKg(breakdown: CategoryBreakdown): number {
  return breakdown.transport + breakdown.food + breakdown.energy + breakdown.waste;
}

/**
 * Group totals by ISO date for trend lines.
 * @param activities Activity rows (unsorted).
 * @returns Date-sorted [{ date, total }] entries.
 */
export function trendByDate(
  activities: Activity[],
): Array<{ date: string; total: number }> {
  const by = new Map<string, number>();
  for (const a of activities) {
    const d = a.occurred_on ?? new Date().toISOString().slice(0, 10);
    by.set(d, (by.get(d) ?? 0) + Number(a.co2e_kg));
  }
  return Array.from(by.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total: round(total) }));
}
