import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Target } from "lucide-react";
import { toast } from "sonner";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import { estimateBaselineKgPerYear, round } from "@/lib/carbonEngine";
import { computeGoalProgress, type Goal } from "@/lib/goalProgress";
import { BadgesGrid, type Badge } from "@/components/goals/BadgesGrid";

/** Months per year — used to convert annual baseline into a monthly figure. */
const MONTHS_PER_YEAR = 12;
/** Default monthly baseline (kg) when the profile estimate is missing. */
const DEFAULT_MONTHLY_BASELINE_KG = 250;
/** Goal period in days. */
const GOAL_PERIOD_DAYS = 30;
/** Minimum and maximum reduction targets (percent). */
const MIN_REDUCTION_PCT = 1;
const MAX_REDUCTION_PCT = 50;
/** Streak length that earns the "weekly streak" badge. */
const WEEK_STREAK_DAYS = 7;
/** Achievement percentage that unlocks the "halfway" badge. */
const HALFWAY_PCT = 50;

export const Route = createFileRoute("/goals")({
  component: () => (
    <Protected>
      <AppHeader />
      <Goals />
    </Protected>
  ),
});

function Goals() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { activities } = useActivities(user?.id, 60);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [pct, setPct] = useState(10);

  const refresh = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("goals").select("*").eq("user_id", user.id).eq("active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      setGoal(data as Goal | null);
    } catch (err) {
      console.error("goals: failed to load active goal", err);
    }
  };
  useEffect(() => { void refresh(); }, [user]);

  const baselineMonth = profile
    ? round(estimateBaselineKgPerYear(profile) / MONTHS_PER_YEAR)
    : 0;

  const progress = useMemo(
    () => computeGoalProgress(goal, activities),
    [goal, activities],
  );

  async function setGoalNow() {
    if (!user) return;
    const baseline = baselineMonth || DEFAULT_MONTHLY_BASELINE_KG;
    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      reduction_pct: pct,
      period_days: GOAL_PERIOD_DAYS,
      baseline_kg: baseline,
    });
    if (error) return toast.error(error.message);
    // Deactivate previous
    await supabase.from("goals").update({ active: false }).eq("user_id", user.id).neq("active", false).is("active", true);
    toast.success("Goal set"); void refresh();
  }

  const badges = useMemo<Badge[]>(
    () => [
      { id: "first-log", label: "First log", earned: activities.length >= 1 },
      { id: "week-streak", label: "7-day streak", earned: progress.streak >= WEEK_STREAK_DAYS },
      { id: "halfway", label: "Halfway there", earned: progress.achievedPct >= HALFWAY_PCT },
      { id: "goal-met", label: "Goal achieved", earned: !!goal && progress.logged <= progress.target },
    ],
    [activities.length, progress, goal],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
        <Target className="size-7 text-primary" aria-hidden="true" /> Goals
      </h1>
      <p className="mt-1 text-muted-foreground">Set a monthly reduction target and track your streak.</p>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        {!goal ? (
          <div>
            <h2 className="font-semibold">Set a 30-day goal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baseline (from your profile): <strong>{baselineMonth} kg / month</strong>
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="pct">Reduction target (%)</Label>
                <Input
                  id="pct"
                  type="number"
                  min={MIN_REDUCTION_PCT}
                  max={MAX_REDUCTION_PCT}
                  value={pct}
                  onChange={(e) =>
                    setPct(
                      Math.max(
                        MIN_REDUCTION_PCT,
                        Math.min(MAX_REDUCTION_PCT, Number(e.target.value) || MIN_REDUCTION_PCT),
                      ),
                    )
                  }
                  className="w-32"
                />
              </div>
              <Button onClick={setGoalNow}>Start goal</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Cut {goal.reduction_pct}% in 30 days</h2>
              <span className="text-xs text-muted-foreground">{progress.daysLeft} days left</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Logged <strong>{progress.logged} kg</strong> · Target <strong>{progress.target} kg</strong>
            </p>
            <Progress value={progress.achievedPct} className="mt-3" aria-label={`${progress.achievedPct}% of reduction achieved`} />
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Flame className="size-4 text-clay" aria-hidden="true" />
              <span><strong>{progress.streak}</strong> day logging streak</span>
            </div>
          </div>
        )}
      </section>

      <BadgesGrid badges={badges} />
    </main>
  );
}
