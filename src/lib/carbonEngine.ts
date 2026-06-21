/**
 * carbonEngine — barrel module that composes the per-concern utilities:
 *   - per-category emission calculators (this file)
 *   - aggregation helpers (./aggregate)
 *   - personalized baseline (./baseline)
 *   - recommendation engine (./recommendations)
 *   - tiny numeric helpers (./math)
 *
 * All functions are pure and deterministic so they can be unit tested in
 * isolation (see carbonEngine.test.ts and the per-module *.test.ts files).
 */
import {
  TRANSPORT_FACTORS_KG_PER_KM,
  FOOD_FACTORS_KG_PER_MEAL,
  ENERGY_FACTORS_KG_PER_KWH,
  WASTE_FACTORS_KG_PER_KG,
} from "./emissionFactors";

// ---------- Per-category calculators ----------

/**
 * CO₂e for a transport trip.
 * @param mode Transport mode key from {@link TRANSPORT_FACTORS_KG_PER_KM}.
 * @param km Distance in kilometres; negative values are clamped to 0.
 * @returns Emissions in kg CO₂e.
 */
export function calcTransportKg(
  mode: keyof typeof TRANSPORT_FACTORS_KG_PER_KM,
  km: number,
): number {
  return Math.max(0, km) * TRANSPORT_FACTORS_KG_PER_KM[mode];
}

/**
 * CO₂e for one or more meal servings.
 * @param meal Meal type key from {@link FOOD_FACTORS_KG_PER_MEAL}.
 * @param servings Number of servings (default 1, negatives clamped to 0).
 * @returns Emissions in kg CO₂e.
 */
export function calcFoodKg(
  meal: keyof typeof FOOD_FACTORS_KG_PER_MEAL,
  servings = 1,
): number {
  return Math.max(0, servings) * FOOD_FACTORS_KG_PER_MEAL[meal];
}

/**
 * CO₂e for energy consumption.
 * @param source Energy source key from {@link ENERGY_FACTORS_KG_PER_KWH}.
 * @param kwh Kilowatt-hours used; negatives clamped to 0.
 * @returns Emissions in kg CO₂e.
 */
export function calcEnergyKg(
  source: keyof typeof ENERGY_FACTORS_KG_PER_KWH,
  kwh: number,
): number {
  return Math.max(0, kwh) * ENERGY_FACTORS_KG_PER_KWH[source];
}

/**
 * CO₂e for waste output.
 * @param disposition Disposition key from {@link WASTE_FACTORS_KG_PER_KG}.
 * @param kg Weight in kilograms; negatives clamped to 0.
 * @returns Emissions in kg CO₂e.
 */
export function calcWasteKg(
  disposition: keyof typeof WASTE_FACTORS_KG_PER_KG,
  kg: number,
): number {
  return Math.max(0, kg) * WASTE_FACTORS_KG_PER_KG[disposition];
}

// ---------- Re-exports (kept for stable import path) ----------

export { aggregate, emptyBreakdown, totalKg, trendByDate } from "./aggregate";
export { estimateBaselineKgPerYear } from "./baseline";
export { generateRecommendations, projectReduction } from "./recommendations";
export { round } from "./math";
