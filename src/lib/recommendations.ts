/**
 * Recommendation engine. Inspects the user's profile and recent activity
 * patterns, produces a list of weighted, ranked suggestions.
 *
 * Each recommendation is scored as `impactScore = saving × feasibility`
 * so that "easy big wins" surface above "hard small wins".
 */
import {
  TRANSPORT_FACTORS_KG_PER_KM,
  FOOD_FACTORS_KG_PER_MEAL,
  ENERGY_FACTORS_KG_PER_KWH,
} from "./emissionFactors";
import type {
  Activity,
  Category,
  Recommendation,
  UserProfile,
} from "@/types/carbon";
import { aggregate, totalKg } from "./aggregate";
import { round, pct } from "./math";

// ---- Heuristic thresholds (named so they're auditable) -------------------

/** A car trip below this many km is considered "short" and easily replaceable. */
const SHORT_CAR_TRIP_KM = 5;
/** Need at least this many short car trips before we suggest swapping them. */
const MIN_SHORT_CAR_TRIPS = 2;
/** Transport must be at least this share of the total to suggest transport swaps. */
const TRANSPORT_DOMINANCE_THRESHOLD = 0.3;
/** Stronger threshold before we suggest carpool/transit. */
const TRANSPORT_HEAVY_THRESHOLD = 0.4;
/** Approximate emissions reduction from carpool / public transit (50%). */
const CARPOOL_SAVING_RATIO = 0.5;
/** Number of beef meals before we suggest swapping half to chicken. */
const BEEF_MEAL_THRESHOLD = 3;
/** Energy share above which we suggest switching tariffs. */
const ENERGY_DOMINANCE_THRESHOLD = 0.25;
/** Approximate emissions reduction from a green tariff. */
const RENEWABLE_TARIFF_SAVING_RATIO = 0.6;
/** kWh threshold (over the analysed window) before we suggest a thermostat tweak. */
const HIGH_KWH_THRESHOLD = 70;
/** Approximate energy reduction from 1°C lower thermostat + standby unplug. */
const THERMOSTAT_SAVING_RATIO = 0.08;
/** Waste share above which composting/recycling tips are worthwhile. */
const WASTE_DOMINANCE_THRESHOLD = 0.1;
/** Approximate emissions reduction from composting + better recycling. */
const COMPOST_SAVING_RATIO = 0.5;
/** Number of meat-free meals approximated by "one meat-free day". */
const MEALS_PER_MEATLESS_DAY = 3;

/**
 * Generate ranked, personalized recommendations.
 *
 * @param profile Onboarding profile (diet, transport, energy).
 * @param activities Recent logged activities.
 * @returns Recommendations sorted by `impactScore` descending.
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
    (a) =>
      a.category === "transport" &&
      a.subtype === "car" &&
      a.quantity > 0 &&
      a.quantity < SHORT_CAR_TRIP_KM,
  );
  if (
    shortCarTrips.length >= MIN_SHORT_CAR_TRIPS &&
    share("transport") > TRANSPORT_DOMINANCE_THRESHOLD
  ) {
    const km = shortCarTrips.reduce((s, a) => s + a.quantity, 0);
    const saving = km * TRANSPORT_FACTORS_KG_PER_KM.car; // replace with bike (0)
    recs.push({
      id: "swap-short-car-trips",
      title: "Swap short car trips for cycling or walking",
      body: `You logged ${shortCarTrips.length} car trips under ${SHORT_CAR_TRIP_KM}km recently. Replacing them with cycling or walking would save roughly ${round(saving)} kg CO₂.`,
      category: "transport",
      estimatedSavingKgPerWeek: round(saving),
      feasibility: 3,
      impactScore: 0,
    });
  }
  if (
    profile.transport_mode === "car" &&
    share("transport") > TRANSPORT_HEAVY_THRESHOLD
  ) {
    const saving = breakdown.transport * CARPOOL_SAVING_RATIO;
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
    const saving =
      MEALS_PER_MEATLESS_DAY *
      (FOOD_FACTORS_KG_PER_MEAL["beef-meal"] -
        FOOD_FACTORS_KG_PER_MEAL["vegetarian-meal"]);
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
  if (beefMeals >= BEEF_MEAL_THRESHOLD) {
    const saving =
      beefMeals *
      (FOOD_FACTORS_KG_PER_MEAL["beef-meal"] -
        FOOD_FACTORS_KG_PER_MEAL["chicken-meal"]);
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
  if (
    profile.energy_source === "grid" &&
    share("energy") > ENERGY_DOMINANCE_THRESHOLD
  ) {
    const saving = breakdown.energy * RENEWABLE_TARIFF_SAVING_RATIO;
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
  if (highKwh > HIGH_KWH_THRESHOLD) {
    recs.push({
      id: "thermostat",
      title: "Lower thermostat by 1°C and unplug standby loads",
      body: "Each degree of heating cuts ~6% of energy use. Unplugging standby devices saves another 5–10%.",
      category: "energy",
      estimatedSavingKgPerWeek: round(
        highKwh *
          THERMOSTAT_SAVING_RATIO *
          ENERGY_FACTORS_KG_PER_KWH[profile.energy_source],
      ),
      feasibility: 3,
      impactScore: 0,
    });
  }

  // --- Waste ---
  if (share("waste") > WASTE_DOMINANCE_THRESHOLD) {
    recs.push({
      id: "compost-recycle",
      title: "Compost food scraps and separate recycling",
      body: "Diverting food waste from landfill cuts methane. Composting can reduce waste emissions by ~70%.",
      category: "waste",
      estimatedSavingKgPerWeek: round(breakdown.waste * COMPOST_SAVING_RATIO),
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
 * Project a "what-if" footprint after adopting the top N recommendations.
 *
 * @param weeklyTotalKg Current weekly footprint in kg CO₂e.
 * @param recs Ranked recommendations (typically from {@link generateRecommendations}).
 * @param topN How many recommendations to assume the user adopts (default 3).
 * @returns The projected new total and reduction percentage (capped 0..100).
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
  const reductionPct = Math.min(100, Math.max(0, rawPct));
  return { newTotal: round(newTotal), reductionPct: round(reductionPct) };
}
