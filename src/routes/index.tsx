import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf, LineChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoMind — Your personal carbon coach" },
      { name: "description", content: "A calm, smart sustainability coach. Log everyday actions, see your footprint, get logical, ranked tips to lower it." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <main className="min-h-dvh eco-grain">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <Leaf className="size-5 text-primary" aria-hidden="true" />
          EcoMind
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-10 pb-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" /> Your sustainability coach
        </span>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
          Smaller footprint,<br />
          <span className="text-primary">one habit at a time.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          EcoMind learns from what you log and turns it into ranked, realistic suggestions —
          not generic advice. See your weekly impact, project the savings of new habits, and
          stay on track.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Leaf className="size-4" aria-hidden="true" /> Start free
            </Button>
          </Link>
          <a href="#how" className="inline-flex">
            <Button size="lg" variant="outline">How it works</Button>
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Leaf, title: "Log lightly", body: "Tap to record a car trip, a meal, a kWh — calculations happen instantly with realistic emission factors." },
          { icon: LineChart, title: "See trends", body: "Per-category breakdown, week-over-week trend, and a benchmark against the national and global average." },
          { icon: Sparkles, title: "Act smart", body: "EcoMind weighs your patterns and ranks tips by impact × feasibility. Big easy wins surface first." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t bg-card/50">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-muted-foreground">
          Emission factors based on DEFRA, IEA, and Poore &amp; Nemecek (2018). Estimates only.
        </div>
      </footer>
    </main>
  );
}
