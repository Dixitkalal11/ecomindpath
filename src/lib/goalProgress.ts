/**
 * Pure helpers for goal progress + streak math, extracted from the goals
 * route so the route file stays presentation-only and the math is unit-testable.
 */
import { aggregate, totalKg } from "@/lib/carbonEngine";
import { round } from "@/lib/math";
import type { Activity } from "@/types/carbon";

/** Milliseconds in one day. */
export const MS_PER_DAY = 86_400_000;
/** Maximum window (in days) over which streaks are computed. */
export const STREAK_WINDOW_DAYS = 60;

/** Active reduction goal as stored in the `goals` table. */
export interface Goal {
  id: string;
  reduction_pct: number;
  period_start: string;
  period_days: number;
  baseline_kg: number;
  active: boolean;
}

/** Computed progress for a single goal. */
export interface GoalProgress {
  logged: number;
  target: number;
  periodEnd: string;
  daysLeft: number;
  achievedPct: number;
  streak: number;
}

/** Empty progress used when there is no active goal. */
export const EMPTY_PROGRESS: GoalProgress = {
  logged: 0,
  target: 0,
  periodEnd: "",
  daysLeft: 0,
  achievedPct: 0,
  streak: 0,
};

/**
 * Compute consecutive-day logging streak ending today.
 * @param activities Activity rows.
 * @returns Number of consecutive days (0 if today has no entry).
 */
export function computeStreak(activities: Activity[]): number {
  const days = new Set(activities.map((a) => a.occurred_on));
  let streak = 0;
  for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
    const d = new Date(Date.now() - i * MS_PER_DAY).toISOString().slice(0, 10);
    if (days.has(d)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/**
 * Compute the progress of a goal against a list of activities.
 * @param goal Active goal row, or null if none.
 * @param activities Activities to evaluate against.
 * @returns Progress snapshot for rendering.
 */
export function computeGoalProgress(
  goal: Goal | null,
  activities: Activity[],
): GoalProgress {
  if (!goal) return EMPTY_PROGRESS;
  const start = new Date(goal.period_start);
  const end = new Date(start.getTime() + goal.period_days * MS_PER_DAY);
  const now = new Date();
  const inPeriod = activities.filter(
    (a) =>
      a.occurred_on &&
      a.occurred_on >= goal.period_start &&
      new Date(a.occurred_on) <= end,
  );
  const logged = round(totalKg(aggregate(inPeriod)));
  const target = round(goal.baseline_kg * (1 - goal.reduction_pct / 100));
  const daysLeft = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY),
  );
  const achievedPct =
    goal.baseline_kg > 0
      ? round(Math.max(0, Math.min(100, (1 - logged / goal.baseline_kg) * 100)))
      : 0;
  return {
    logged,
    target,
    periodEnd: end.toISOString().slice(0, 10),
    daysLeft,
    achievedPct,
    streak: computeStreak(activities),
  };
}
