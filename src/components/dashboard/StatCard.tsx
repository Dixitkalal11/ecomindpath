/** Single highlighted KPI card on the dashboard summary row. */
export function StatCard({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  const subTone =
    tone === "good"
      ? "text-primary"
      : tone === "warn"
        ? "text-clay"
        : "text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      {sub && <div className={`mt-1 text-xs ${subTone}`}>{sub}</div>}
    </div>
  );
}
