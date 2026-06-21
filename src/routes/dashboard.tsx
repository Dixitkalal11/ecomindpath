import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import {
  aggregate,
  estimateBaselineKgPerYear,
  generateRecommendations,
  projectReduction,
  round,
  totalKg,
  trendByDate,
} from "@/lib/carbonEngine";
import {
  GLOBAL_AVG_KG_PER_YEAR,
  REGION_BASELINE_KG_PER_YEAR,
} from "@/lib/emissionFactors";
import { StatCard } from "@/components/dashboard/StatCard";
import { BreakdownChart, type BreakdownDatum } from "@/components/dashboard/BreakdownChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RecommendationsList } from "@/components/dashboard/RecommendationsList";
import { CATEGORY_META } from "@/components/dashboard/CategoryMeta";
import type { Category } from "@/types/carbon";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <Protected>
      <AppHeader />
      <Dashboard />
    </Protected>
  ),
});

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, onboarded, loading: pl } = useProfile(user?.id);
  const { activities, loading: al } = useActivities(user?.id, 30);

  useEffect(() => {
    if (!pl && profile && !onboarded) navigate({ to: "/onboarding" });
  }, [pl, profile, onboarded, navigate]);

  const breakdown = useMemo(() => aggregate(activities), [activities]);
  const total30 = useMemo(() => totalKg(breakdown), [breakdown]);
  const last7 = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return activities.filter((a) => (a.occurred_on ?? "") >= cutoff);
  }, [activities]);
  const weekly = useMemo(() => totalKg(aggregate(last7)), [last7]);
  const trend = useMemo(() => trendByDate(activities), [activities]);

  const baselineYear = profile ? estimateBaselineKgPerYear(profile) : null;
  const regionAvgWeek = profile
    ? round((REGION_BASELINE_KG_PER_YEAR[profile.region] ?? GLOBAL_AVG_KG_PER_YEAR) / 52)
    : null;

  const recs = useMemo(
    () => (profile ? generateRecommendations(profile, last7) : []),
    [profile, last7],
  );
  const projection = projectReduction(weekly || 0, recs, 3);

  const breakdownData: BreakdownDatum[] = (
    Object.keys(CATEGORY_META) as Category[]
  ).map((k) => ({
    name: CATEGORY_META[k].label,
    key: k,
    kg: round(breakdown[k]),
    fill: CATEGORY_META[k].color,
  }));

  if (al || pl) {
    return <div className="p-8 text-muted-foreground">Loading your footprint…</div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Hello again 🌱</h1>
      <p className="mt-1 text-muted-foreground">
        Here's your footprint at a glance — from the last 7 and 30 days.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Footprint summary">
        <StatCard
          title="This week"
          value={`${round(weekly)} kg CO₂e`}
          sub={
            regionAvgWeek != null
              ? `${weekly < regionAvgWeek ? "Below" : "Above"} regional avg (${regionAvgWeek} kg/wk)`
              : ""
          }
          tone={regionAvgWeek != null && weekly < regionAvgWeek ? "good" : "warn"}
        />
        <StatCard
          title="Last 30 days"
          value={`${round(total30)} kg CO₂e`}
          sub={`${activities.length} activities logged`}
        />
        <StatCard
          title="Estimated baseline"
          value={baselineYear ? `${(baselineYear / 1000).toFixed(1)} t/yr` : "—"}
          sub="Personalized starting point"
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <BreakdownChart data={breakdownData} />
        <TrendChart trend={trend} />
      </section>

      <section className="mt-6">
        <RecommendationsList recs={recs} reductionPct={projection.reductionPct} />
      </section>
    </main>
  );
}
