import type { ReactNode } from "react";

/** Generic card container shared across dashboard sections. */
export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>;
}

/** Header with title + optional subtitle / icon, used inside dashboard cards. */
export function CardHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
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
