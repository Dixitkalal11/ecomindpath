/**
 * Personalized baseline estimation. Pure functions, fully tested via
 * carbonEngine tests. Kept separate from the calculator/aggregator so
 * each module owns a single concern.
 */
import { REGION_BASELINE_KG_PER_YEAR } from "./emissionFactors";
import type { UserProfile } from "@/types/carbon";
import { round } from "./math";

/** Hard floor (kg/yr) so degenerate inputs never produce an unrealistic baseline. */
export const BASELINE_FLOOR_KG_PER_YEAR = 500;

/** Lifestyle multipliers, expressed as deltas added to a baseline of 1.0. */
const DIET_MULTIPLIER = {
  "meat-heavy": 0.1,
  moderate: 0,
  vegetarian: -0.07,
  vegan: -0.12,
} as const satisfies Record<UserProfile["diet"], number>;

const TRANSPORT_MULTIPLIER = {
  car: 0.1,
  flight: 0.25,
  bus: -0.05,
  train: -0.05,
  bike: -0.1,
  walk: -0.1,
  mixed: 0,
} as const satisfies Record<UserProfile["transport_mode"], number>;

const ENERGY_MULTIPLIER = {
  renewable: -0.1,
  mixed: -0.04,
  grid: 0,
} as const satisfies Record<UserProfile["energy_source"], number>;

/** Per-extra-person sharing reduction (capped at 3 extra people). */
const HOUSEHOLD_SHARING_PER_PERSON = -0.05;
const MAX_HOUSEHOLD_SHARING_PEOPLE = 3;

/**
 * Personalized yearly baseline footprint. Starts from the regional average
 * (or global if the region is unknown) and tilts by lifestyle inputs.
 *
 * @param profile Onboarding profile inputs.
 * @returns Estimated kg CO₂e per year, never below {@link BASELINE_FLOOR_KG_PER_YEAR}.
 */
export function estimateBaselineKgPerYear(profile: UserProfile): number {
  const base =
    REGION_BASELINE_KG_PER_YEAR[profile.region] ??
    REGION_BASELINE_KG_PER_YEAR.global;

  const sharing =
    Math.min(profile.household_size - 1, MAX_HOUSEHOLD_SHARING_PEOPLE) *
    HOUSEHOLD_SHARING_PER_PERSON;

  const multiplier =
    1 +
    DIET_MULTIPLIER[profile.diet] +
    TRANSPORT_MULTIPLIER[profile.transport_mode] +
    ENERGY_MULTIPLIER[profile.energy_source] +
    sharing;

  return Math.max(BASELINE_FLOOR_KG_PER_YEAR, round(base * multiplier));
}
