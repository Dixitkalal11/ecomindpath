import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "./Card";

/** Daily total CO₂e line chart over the activity history. */
export function TrendChart({ trend }: { trend: Array<{ date: string; total: number }> }) {
  return (
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
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
