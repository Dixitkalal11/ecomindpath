/**
 * carbonEngine — pure, testable utilities for estimating CO2e footprints
 * and generating personalized, ranked recommendations.
 *
 * All functions are deterministic and side-effect free so they can be unit
 * tested in isolation (see carbonEngine.test.ts).
 */

import {
  TRANSPORT_FACTORS_KG_PER_KM,
  FOOD_FACTORS_KG_PER_MEAL,
  ENERGY_FACTORS_KG_PER_KWH,
  WASTE_FACTORS_KG_PER_KG,
  REGION_BASELINE_KG_PER_YEAR,
} from "./emissionFactors";
import type {
  Activity,
  CategoryBreakdown,
  Recommendation,
  UserProfile,
  Category,
} from "@/types/carbon";

// ---------- Calculations ----------

export function calcTransportKg(
  mode: keyof typeof TRANSPORT_FACTORS_KG_PER_KM,
  km: number,
): number {
  return Math.max(0, km) * TRANSPORT_FACTORS_KG_PER_KM[mode];
}

export function calcFoodKg(
  meal: keyof typeof FOOD_FACTORS_KG_PER_MEAL,
  servings = 1,
): number {
  return Math.max(0, servings) * FOOD_FACTORS_KG_PER_MEAL[meal];
}

export function calcEnergyKg(
  source: keyof typeof ENERGY_FACTORS_KG_PER_KWH,
  kwh: number,
): number {
  return Math.max(0, kwh) * ENERGY_FACTORS_KG_PER_KWH[source];
}

export function calcWasteKg(
  disposition: keyof typeof WASTE_FACTORS_KG_PER_KG,
  kg: number,
): number {
  return Math.max(0, kg) * WASTE_FACTORS_KG_PER_KG[disposition];
}

// ---------- Aggregation ----------

export function emptyBreakdown(): CategoryBreakdown {
  return { transport: 0, food: 0, energy: 0, waste: 0 };
}

export function aggregate(activities: Activity[]): CategoryBreakdown {
  return activities.reduce<CategoryBreakdown>((acc, a) => {
    acc[a.category] += Number(a.co2e_kg) || 0;
    return acc;
  }, emptyBreakdown());
}

export function totalKg(breakdown: CategoryBreakdown): number {
  return breakdown.transport + breakdown.food + breakdown.energy + breakdown.waste;
}

/** Group totals by ISO date; useful for trend lines. */
export function trendByDate(
  activities: Activity[],
): Array<{ date: string; total: number }> {
  const by = new Map<string, number>();
  for (const a of activities) {
    const d = a.occurred_on ?? new Date().toISOString().slice(0, 10);
    by.set(d, (by.get(d) ?? 0) + Number(a.co2e_kg));
  }
  return Array.from(by.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total: round(total) }));
}

// ---------- Baseline ----------

/**
 * Personalized baseline: starts from regional average, then tilts
 * by lifestyle inputs (diet, transport, energy). This is what we
 * compare logged emissions against before they have history.
 */
export function estimateBaselineKgPerYear(profile: UserProfile): number {
  const base =
    REGION_BASELINE_KG_PER_YEAR[profile.region] ??
    REGION_BASELINE_KG_PER_YEAR.global;

  let multiplier = 1;
  // Diet adjustment (~20% of footprint typically food-driven)
  multiplier += dietMultiplier(profile.diet);
  // Transport adjustment
  multiplier += transportMultiplier(profile.transport_mode);
  // Energy source adjustment
  multiplier += energyMultiplier(profile.energy_source);
  // Household sharing reduces per-capita by ~10% per extra person up to 4
  const sharing = Math.min(profile.household_size - 1, 3) * -0.05;
  multiplier += sharing;

  return Math.max(500, round(base * multiplier));
}

function dietMultiplier(d: UserProfile["diet"]): number {
  switch (d) {
    case "meat-heavy": return 0.1;
    case "moderate": return 0;
    case "vegetarian": return -0.07;
    case "vegan": return -0.12;
  }
}

function transportMultiplier(t: UserProfile["transport_mode"]): number {
  switch (t) {
    case "car": return 0.1;
    case "flight": return 0.25;
    case "bus":
    case "train": return -0.05;
    case "bike":
    case "walk": return -0.1;
    case "mixed":
    default: return 0;
  }
}

function energyMultiplier(e: UserProfile["energy_source"]): number {
  switch (e) {
    case "renewable": return -0.1;
    case "mixed": return -0.04;
    case "grid":
    default: return 0;
  }
}

// ---------- Recommendations ----------

/**
 * Logical, weighted recommendations.
 *
 * The engine inspects:
 *  - profile (diet, transport, energy)
 *  - the breakdown of recent emissions (which category dominates)
 *  - patterns within activities (e.g. lots of short car trips)
 *
 * Each candidate produces an estimated weekly CO2 saving and a
 * feasibility score. They are ranked by impactScore = saving * feasibility
 * so high-impact AND realistic suggestions surface first.
 */
export function generateRecommendations(
  profile: UserProfile,
  activities: Activity[],
): Recommendation[] {
  const breakdown = aggregate(activities);
  const total = totalKg(breakdown);
  const recs: Recommendation[] = [];

  const share = (c: Category) => (total > 0 ? breakdown[c] / total : 0);

  // --- Transport ---
  const shortCarTrips = activities.filter(
    (a) => a.category === "transport" && a.subtype === "car" && a.quantity > 0 && a.quantity < 5,
  );
  if (shortCarTrips.length >= 2 && share("transport") > 0.3) {
    const km = shortCarTrips.reduce((s, a) => s + a.quantity, 0);
    const saving = km * TRANSPORT_FACTORS_KG_PER_KM.car; // replace with bike (0)
    recs.push({
      id: "swap-short-car-trips",
      title: "Swap short car trips for cycling or walking",
      body: `You logged ${shortCarTrips.length} car trips under 5km recently. Replacing them with cycling or walking would save roughly ${round(saving)} kg CO₂.`,
      category: "transport",
      estimatedSavingKgPerWeek: round(saving),
      feasibility: 3,
      impactScore: 0,
    });
  }
  if (profile.transport_mode === "car" && share("transport") > 0.4) {
    const weeklyTransport = breakdown.transport;
    const saving = weeklyTransport * 0.5;
    recs.push({
      id: "carpool-or-transit",
      title: "Try public transit or carpool 2 days a week",
      body: `Transport is ${pct(share("transport"))}% of your footprint. Bus/train cuts per-km emissions by more than half.`,
      category: "transport",
      estimatedSavingKgPerWeek: round(saving),
      feasibility: 2,
      impactScore: 0,
    });
  }

  // --- Food ---
  if (profile.diet === "meat-heavy") {
    // One meat-free day a week ≈ replacing ~3 beef-equivalent meals
    const saving = 3 * (FOOD_FACTORS_KG_PER_MEAL["beef-meal"] - FOOD_FACTORS_KG_PER_MEAL["vegetarian-meal"]);
    recs.push({
      id: "meatless-day",
      title: "Add one meat-free day per week",
      body: `One meat-free day saves roughly ${round(saving)} kg CO₂/week — about as much as skipping a 30km car trip.`,
      category: "food",
      estimatedSavingKgPerWeek: round(saving),
      feasibility: 3,
      impactScore: 0,
    });
  }
  const beefMeals = activities.filter((a) => a.subtype === "beef-meal").length;
  if (beefMeals >= 3) {
    const saving = beefMeals * (FOOD_FACTORS_KG_PER_MEAL["beef-meal"] - FOOD_FACTORS_KG_PER_MEAL["chicken-meal"]);
    recs.push({
      id: "beef-to-chicken",
      title: "Swap half your beef meals for chicken or fish",
      body: `Beef is ~4× the footprint of chicken. Swapping ${Math.ceil(beefMeals / 2)} meals saves ~${round(saving / 2)} kg CO₂.`,
      category: "food",
      estimatedSavingKgPerWeek: round(saving / 2),
      feasibility: 3,
      impactScore: 0,
    });
  }

  // --- Energy ---
  if (profile.energy_source === "grid" && share("energy") > 0.25) {
    const saving = breakdown.energy * 0.6;
    recs.push({
      id: "switch-renewable",
      title: "Switch to a renewable electricity tariff",
      body: `Most providers offer green tariffs. Based on your usage that would cut roughly ${round(saving)} kg CO₂/week.`,
      category: "energy",
      estimatedSavingKgPerWeek: round(saving),
      feasibility: 2,
      impactScore: 0,
    });
  }
  const highKwh = activities
    .filter((a) => a.category === "energy")
    .reduce((s, a) => s + a.quantity, 0);
  if (highKwh > 70) {
    recs.push({
      id: "thermostat",
      title: "Lower thermostat by 1°C and unplug standby loads",
      body: "Each degree of heating cuts ~6% of energy use. Unplugging standby devices saves another 5–10%.",
      category: "energy",
      estimatedSavingKgPerWeek: round(highKwh * 0.08 * (ENERGY_FACTORS_KG_PER_KWH[profile.energy_source])),
      feasibility: 3,
      impactScore: 0,
    });
  }

  // --- Waste ---
  if (share("waste") > 0.1) {
    recs.push({
      id: "compost-recycle",
      title: "Compost food scraps and separate recycling",
      body: "Diverting food waste from landfill cuts methane. Composting can reduce waste emissions by ~70%.",
      category: "waste",
      estimatedSavingKgPerWeek: round(breakdown.waste * 0.5),
      feasibility: 2,
      impactScore: 0,
    });
  }

  // Score and rank: impact = saving × feasibility (so easy big wins beat hard small ones).
  for (const r of recs) {
    r.impactScore = round(r.estimatedSavingKgPerWeek * r.feasibility);
  }
  recs.sort((a, b) => b.impactScore - a.impactScore);
  return recs;
}

/**
 * Project a "what if" footprint after adopting the top N recommendations.
 * Returns the % reduction relative to current weekly total.
 */
export function projectReduction(
  weeklyTotalKg: number,
  recs: Recommendation[],
  topN = 3,
): { newTotal: number; reductionPct: number } {
  const saving = recs
    .slice(0, topN)
    .reduce((s, r) => s + r.estimatedSavingKgPerWeek, 0);
  const newTotal = Math.max(0, weeklyTotalKg - saving);
  const rawPct = weeklyTotalKg > 0 ? (saving / weeklyTotalKg) * 100 : 0;
  // Cap at 100 — savings can exceed a tiny weekly total but a >100% cut is meaningless.
  const reductionPct = Math.min(100, Math.max(0, rawPct));
  return { newTotal: round(newTotal), reductionPct: round(reductionPct) };
}

// ---------- helpers ----------

export function round(n: number, digits = 2): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

function pct(x: number): number {
  return Math.round(x * 100);
}
