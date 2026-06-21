import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Goal, GoalProgress } from "@/lib/goalProgress";

/**
 * Card that either lets the user set a new 30-day reduction goal or
 * shows progress against the active goal.
 */
export function GoalCard({
  goal,
  progress,
  baselineMonth,
  pct,
  minPct,
  maxPct,
  onPctChange,
  onStart,
}: {
  goal: Goal | null;
  progress: GoalProgress;
  baselineMonth: number;
  pct: number;
  minPct: number;
  maxPct: number;
  onPctChange: (raw: number) => void;
  onStart: () => void;
}) {
  return (
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
                min={minPct}
                max={maxPct}
                value={pct}
                onChange={(e) => onPctChange(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Button onClick={onStart}>Start goal</Button>
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
          <Progress
            value={progress.achievedPct}
            className="mt-3"
            aria-label={`${progress.achievedPct}% of reduction achieved`}
          />
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Flame className="size-4 text-clay" aria-hidden="true" />
            <span><strong>{progress.streak}</strong> day logging streak</span>
          </div>
        </div>
      )}
    </section>
  );
}
