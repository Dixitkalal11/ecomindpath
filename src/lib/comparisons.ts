/**
 * Comparison helpers: how a user's footprint stacks up against a benchmark
 * (regional or global average). Pure utilities, no side effects.
 */

/**
 * Compute the signed percentage difference between a user's footprint
 * and an average benchmark.
 *
 * - Positive value = user is ABOVE the average by that percent.
 * - Negative value = user is BELOW the average by that percent.
 * - 0 when the average is not positive (avoids division-by-zero).
 *
 * @param userKg User's measured footprint over the period (kg CO2e).
 * @param averageKg Benchmark footprint over the same period (kg CO2e).
 * @returns Signed percentage difference, rounded to 1 decimal.
 */
export function vsAveragePct(userKg: number, averageKg: number): number {
  if (!isFinite(userKg) || !isFinite(averageKg) || averageKg <= 0) return 0;
  const safeUser = Math.max(0, userKg);
  const diff = ((safeUser - averageKg) / averageKg) * 100;
  return Math.round(diff * 10) / 10;
}

/**
 * Human-readable label for {@link vsAveragePct}, e.g. "12% below average".
 *
 * @param userKg User's measured footprint.
 * @param averageKg Benchmark footprint.
 */
export function vsAverageLabel(userKg: number, averageKg: number): string {
  const pct = vsAveragePct(userKg, averageKg);
  if (pct === 0 && averageKg <= 0) return "no benchmark available";
  if (pct === 0) return "on par with average";
  return pct > 0 ? `${pct}% above average` : `${Math.abs(pct)}% below average`;
}
