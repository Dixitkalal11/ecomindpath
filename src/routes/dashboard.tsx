import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Bike, Car, CookingPot, Lightbulb, Recycle, Sparkles, TrendingDown } from "lucide-react";
import {
  Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import {
  aggregate, totalKg, trendByDate, estimateBaselineKgPerYear,
  generateRecommendations, projectReduction, round,
} from "@/lib/carbonEngine";
import { GLOBAL_AVG_KG_PER_YEAR, REGION_BASELINE_KG_PER_YEAR } from "@/lib/emissionFactors";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <Protected>
      <AppHeader />
      <Dashboard />
    </Protected>
  ),
});

const CATEGORY_META = {
  transport: { label: "Transport", icon: Car, color: "var(--chart-1)" },
  food: { label: "Food", icon: CookingPot, color: "var(--chart-2)" },
  energy: { label: "Energy", icon: Lightbulb, color: "var(--chart-3)" },
  waste: { label: "Waste", icon: Recycle, color: "var(--chart-4)" },
} as const;

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
  const baselineWeek = baselineYear ? round(baselineYear / 52) : null;
  const regionAvgWeek = profile
    ? round((REGION_BASELINE_KG_PER_YEAR[profile.region] ?? GLOBAL_AVG_KG_PER_YEAR) / 52)
    : null;

  const recs = useMemo(
    () => (profile ? generateRecommendations(profile, last7) : []),
    [profile, last7],
  );
  const projection = projectReduction(weekly || baselineWeek || 0, recs, 3);

  const breakdownData = (Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((k) => ({
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

      {/* Top stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Footprint summary">
        <StatCard title="This week" value={`${round(weekly)} kg CO₂e`} sub={
          regionAvgWeek != null
            ? `${weekly < regionAvgWeek ? "Below" : "Above"} regional avg (${regionAvgWeek} kg/wk)`
            : ""
        } tone={regionAvgWeek != null && weekly < regionAvgWeek ? "good" : "warn"} />
        <StatCard title="Last 30 days" value={`${round(total30)} kg CO₂e`} sub={`${activities.length} activities logged`} />
        <StatCard
          title="Estimated baseline"
          value={baselineYear ? `${(baselineYear / 1000).toFixed(1)} t/yr` : "—"}
          sub="Personalized starting point"
        />
      </section>

      {/* Charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Breakdown by category" subtitle="Last 30 days" />
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={breakdownData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" kg" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="kg" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm" aria-label="Category legend">
            {breakdownData.map((d) => {
              const Icon = CATEGORY_META[d.key].icon;
              return (
                <li key={d.key} className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" style={{ color: d.fill }} aria-hidden="true" />
                    {d.name}
                  </span>
                  <span className="font-medium">{d.kg} kg</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Trend" subtitle="Daily total CO₂e" />
          <div className="h-56">
            {trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Log your first activity to see your trend.
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" kg" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      {/* Recommendations */}
      <section className="mt-6">
        <Card>
          <CardHeader
            title="EcoMind suggests"
            subtitle="Ranked by impact × feasibility — biggest easy wins first"
            icon={<Sparkles className="size-5 text-primary" aria-hidden="true" />}
          />
          {recs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Log a few activities and EcoMind will tailor suggestions to you.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                <TrendingDown className="size-4" aria-hidden="true" />
                Adopting the top 3 could lower your weekly footprint by{" "}
                <strong>{projection.reductionPct}%</strong>.
              </div>
              <ul className="space-y-3">
                {recs.map((r, i) => {
                  const Icon = CATEGORY_META[r.category].icon;
                  return (
                    <li key={r.id} className="rounded-xl border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2" aria-hidden="true">
                          <Icon className="size-5" style={{ color: CATEGORY_META[r.category].color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">#{i + 1}</span>
                            <h3 className="font-medium">{r.title}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border px-2 py-0.5">≈ {r.estimatedSavingKgPerWeek} kg / week</span>
                            <span className="rounded-full border px-2 py-0.5" aria-label={`Feasibility ${r.feasibility} of 3`}>
                              {"●".repeat(r.feasibility)}{"○".repeat(3 - r.feasibility)} feasibility
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>;
}
function CardHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {icon}
    </div>
  );
}
function StatCard({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      {sub && (
        <div
          className={`mt-1 text-xs ${tone === "good" ? "text-primary" : tone === "warn" ? "text-clay" : "text-muted-foreground"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
