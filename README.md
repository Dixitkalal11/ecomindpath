# EcoMind — Carbon Footprint Awareness Platform

EcoMind is a personal carbon-footprint coach. Log everyday activities, see where your emissions actually come from, and get **logical, ranked** suggestions for what to change next.

> **Submission vertical:** Carbon Footprint Awareness Platform.

---

## Why this design

Most footprint trackers are static calculators that hand you a generic list of tips. EcoMind reacts to *your* behaviour:

- It computes a **personalized baseline** from your profile (region, household, diet, transport, energy).
- It calculates each activity with realistic per-unit emission factors so you can trust the breakdown.
- A **recommendation engine** inspects your recent log, weighs the dominant categories, looks for behaviour patterns (e.g. multiple short car trips), and ranks tips by **impact × feasibility** — biggest *easy* wins first.

## Architecture

```
src/
  lib/
    emissionFactors.ts   # Constants (kg CO2e per unit) with cited rough sources
    carbonEngine.ts      # Pure functions: calculate, aggregate, baseline, recommend, project
    carbonEngine.test.ts # Vitest unit tests (15 cases)
  types/carbon.ts        # Domain types
  hooks/
    useAuth.ts           # Supabase auth state
    useEcoData.ts        # Profile + activities loaders
  components/
    Protected.tsx        # Auth gate
    AppHeader.tsx
    ui/                  # shadcn/ui primitives
  routes/                # TanStack Router file-based routes
    index.tsx            # Landing
    auth.tsx             # Email + password
    onboarding.tsx       # Profile setup
    dashboard.tsx        # Stats, charts, recommendations
    log.tsx              # Activity logging (4 categories)
    goals.tsx            # Reduction goals + streak + badges
```

All carbon math lives in `src/lib/carbonEngine.ts` — **no calculations inside components**. The engine is pure (no I/O, no React) so it is fully unit-tested.

## How the recommendation engine works

`generateRecommendations(profile, recentActivities)` performs these steps:

1. **Aggregate** the user's recent activities into a per-category breakdown.
2. **Inspect patterns** in the raw activity list (e.g. car trips under 5 km, count of beef meals).
3. **Generate candidates** by combining profile traits and patterns:
   - *Transport heavy + short car trips* → "swap to bike/walk"
   - *Meat-heavy diet* → "one meat-free day per week"
   - *3+ beef meals* → "swap half your beef for chicken/fish"
   - *Grid energy with high share* → "switch to renewable tariff"
   - *High kWh use* → "thermostat -1 °C + unplug standby"
   - *Waste > 10% of footprint* → "compost & separate recycling"
4. **Estimate weekly CO₂ savings** using the same emission factors used for logging — so projections match reality.
5. **Score** each: `impactScore = saving × feasibility (1..3)`. Suggestions are sorted by this score so high-impact *and* realistic tips surface first.
6. **Project**: `projectReduction(weeklyTotal, recs, top=3)` shows the user what their footprint would look like if they adopt the top suggestions.

The dashboard uses these projections to display things like _"Adopting the top 3 could lower your weekly footprint by 22%."_

## Emission factor sources (rough averages)

- **Transport:** UK DEFRA / BEIS 2023 conversion factors; IEA per-mode averages.
- **Food:** Poore & Nemecek (2018) "Reducing food's environmental impacts through producers and consumers", *Science*.
- **Energy:** IEA global average grid intensity (~0.45 kg/kWh); renewables ~0.05.
- **Waste:** EPA WARM model rough averages.
- **Per-capita country baselines:** Our World in Data (2022).

These are public-domain approximations meant for **awareness**, not regulatory accounting.

## Assumptions

- A "meal" is roughly a single 250–300 g serving.
- "Short" car trips are < 5 km.
- Household sharing reduces per-capita baseline by ~5% per extra person, capped at 4.
- Streak counts consecutive days with at least one logged activity, ending today.

## Security & responsible implementation

- **No secrets in client code.** Supabase publishable key only; service role never exposed.
- **Row Level Security** is enabled on `profiles`, `activities`, `goals` — users can only read/write rows where `user_id = auth.uid()`.
- **Auth-gated routes** through a `<Protected>` wrapper that redirects unauthenticated users to `/auth`.
- **Input validation** with Zod on the email/password form and number coercion on activity quantities (clamped server-side via CHECK constraints).
- **HIBP password check** enabled via auth settings to reject leaked passwords.
- **Minimal PII**: only email + region (country-level), household size, diet, transport, energy source.

## Accessibility

- Semantic `<main>`, `<header>`, `<nav>`, `<section>`, `<h1>`–`<h3>` hierarchy.
- All icons marked `aria-hidden="true"` with text labels alongside; nothing communicated by colour alone (each chart category has icon + text in the legend).
- Focus-visible outlines via shadcn defaults; full keyboard navigation.
- Form inputs have associated `<Label htmlFor>`; radio groups use `<RadioGroup>` (Radix) for proper roving tabindex.
- Earthy palette tested for WCAG AA contrast on text + UI surfaces.

## Stack

- TanStack Start v1 (React 19, file-based routing, SSR-capable)
- Tailwind v4 (CSS-first design tokens in `src/styles.css`)
- shadcn/ui + Radix UI primitives
- Recharts for visualizations
- Lovable Cloud (Supabase) for auth + data
- Zod for runtime validation
- Vitest for unit tests

## Setup

```bash
bun install
bun run dev          # start dev server
bun run test         # run carbon engine tests
bun run build        # production build
```

Environment variables (auto-injected by Lovable Cloud — no manual setup needed locally):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Tests

```
✓ src/lib/carbonEngine.test.ts (15 tests)
  ✓ emission calculators · clamps negatives, scales linearly, vegan < beef …
  ✓ aggregation · sums by category, totals, trend grouped by date
  ✓ baseline · vegan+bike+renewable < meat+car+grid; respects regional baseline
  ✓ recommendation engine · flags short car trips, suggests meatless day for
    meat-heavy, skips it for vegans, ranks by impact × feasibility, projects
    non-negative savings
```
