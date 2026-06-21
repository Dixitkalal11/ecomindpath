import { Award } from "lucide-react";

/** A single badge entry shown in the goals grid. */
export interface Badge {
  id: string;
  label: string;
  earned: boolean;
}

/**
 * Grid of achievement badges. Purely presentational.
 * @param badges Badges to render (earned + locked).
 */
export function BadgesGrid({ badges }: { badges: Badge[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Award className="size-5 text-primary" aria-hidden="true" /> Badges
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={`rounded-xl border p-4 text-center text-sm ${
              b.earned
                ? "border-primary bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground"
            }`}
            aria-label={`${b.label} ${b.earned ? "earned" : "locked"}`}
          >
            <div className="text-2xl" aria-hidden="true">{b.earned ? "🏅" : "🔒"}</div>
            <div className="mt-1 font-medium">{b.label}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
