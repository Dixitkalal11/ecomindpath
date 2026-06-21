import { Sparkles, TrendingDown } from "lucide-react";
import { Card, CardHeader } from "./Card";
import { CATEGORY_META } from "./CategoryMeta";
import type { Recommendation } from "@/types/carbon";

/** Ranked list of EcoMind tips with a projected weekly reduction banner. */
export function RecommendationsList({
  recs,
  reductionPct,
}: {
  recs: Recommendation[];
  reductionPct: number;
}) {
  return (
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
            <strong>{reductionPct}%</strong>.
          </div>
          <ul className="space-y-3">
            {recs.map((r, i) => {
              const Icon = CATEGORY_META[r.category].icon;
              return (
                <li key={r.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2" aria-hidden="true">
                      <Icon
                        className="size-5"
                        style={{ color: CATEGORY_META[r.category].color }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          #{i + 1}
                        </span>
                        <h3 className="font-medium">{r.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border px-2 py-0.5">
                          ≈ {r.estimatedSavingKgPerWeek} kg / week
                        </span>
                        <span
                          className="rounded-full border px-2 py-0.5"
                          aria-label={`Feasibility ${r.feasibility} of 3`}
                        >
                          {"●".repeat(r.feasibility)}
                          {"○".repeat(3 - r.feasibility)} feasibility
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
  );
}
