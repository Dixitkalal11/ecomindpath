import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "./Card";
import { CATEGORY_META } from "./CategoryMeta";
import type { Category } from "@/types/carbon";

export interface BreakdownDatum {
  name: string;
  key: Category;
  kg: number;
  fill: string;
}

/** Bar chart + legend showing kg CO₂e per category over the period. */
export function BreakdownChart({ data }: { data: BreakdownDatum[] }) {
  return (
    <Card>
      <CardHeader title="Breakdown by category" subtitle="Last 30 days" />
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" kg" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="kg" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm" aria-label="Category legend">
        {data.map((d) => {
          const Icon = CATEGORY_META[d.key].icon;
          return (
            <li
              key={d.key}
              className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5"
            >
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
  );
}
