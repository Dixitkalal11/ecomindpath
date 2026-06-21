import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Flame, Target } from "lucide-react";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import { aggregate, estimateBaselineKgPerYear, round, totalKg } from "@/lib/carbonEngine";
import { toast } from "sonner";

export const Route = createFileRoute("/goals")({
  component: () => (
    <Protected>
      <AppHeader />
      <Goals />
    </Protected>
  ),
});

interface Goal {
  id: string;
  reduction_pct: number;
  period_start: string;
  period_days: number;
  baseline_kg: number;
  active: boolean;
}

function Goals() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { activities } = useActivities(user?.id, 60);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [pct, setPct] = useState(10);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("goals").select("*").eq("user_id", user.id).eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setGoal(data as Goal | null);
  };
  useEffect(() => { void refresh(); }, [user]);

  const baselineMonth = profile ? round(estimateBaselineKgPerYear(profile) / 12) : 0;

  const progress = useMemo(() => {
    if (!goal) return { logged: 0, target: 0, periodEnd: "", daysLeft: 0, achievedPct: 0, streak: 0 };
    const start = new Date(goal.period_start);
    const end = new Date(start.getTime() + goal.period_days * 86400000);
    const now = new Date();
    const inPeriod = activities.filter((a) => a.occurred_on && a.occurred_on >= goal.period_start && new Date(a.occurred_on) <= end);
    const logged = round(totalKg(aggregate(inPeriod)));
    const target = round(goal.baseline_kg * (1 - goal.reduction_pct / 100));
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    const achievedPct = goal.baseline_kg > 0
      ? round(Math.max(0, Math.min(100, (1 - logged / goal.baseline_kg) * 100)))
      : 0;
    // Streak: consecutive days with at least one activity, ending today
    const days = new Set(activities.map((a) => a.occurred_on));
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (days.has(d)) streak++; else if (i > 0) break;
    }
    return { logged, target, periodEnd: end.toISOString().slice(0, 10), daysLeft, achievedPct, streak };
  }, [goal, activities]);

  async function setGoalNow() {
    if (!user) return;
    const baseline = baselineMonth || 250;
    const { error } = await supabase.from("goals").insert({
      user_id: user.id, reduction_pct: pct, period_days: 30, baseline_kg: baseline,
    });
    if (error) return toast.error(error.message);
    // Deactivate previous
    await supabase.from("goals").update({ active: false }).eq("user_id", user.id).neq("active", false).is("active", true);
    toast.success("Goal set"); void refresh();
  }

  const badges = useMemo(() => {
    const list: { id: string; label: string; earned: boolean }[] = [
      { id: "first-log", label: "First log", earned: activities.length >= 1 },
      { id: "week-streak", label: "7-day streak", earned: progress.streak >= 7 },
      { id: "halfway", label: "Halfway there", earned: progress.achievedPct >= 50 },
      { id: "goal-met", label: "Goal achieved", earned: !!goal && progress.logged <= progress.target },
    ];
    return list;
  }, [activities.length, progress, goal]);

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
                <Input id="pct" type="number" min={1} max={50} value={pct} onChange={(e) => setPct(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="w-32" />
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

      <section className="mt-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="size-5 text-primary" aria-hidden="true" /> Badges
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => (
            <li
              key={b.id}
              className={`rounded-xl border p-4 text-center text-sm ${b.earned ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}
              aria-label={`${b.label} ${b.earned ? "earned" : "locked"}`}
            >
              <div className="text-2xl" aria-hidden="true">{b.earned ? "🏅" : "🔒"}</div>
              <div className="mt-1 font-medium">{b.label}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
