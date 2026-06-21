/**
 * Tiny numeric helpers shared by carbonEngine modules.
 */

/**
 * Round to a fixed number of decimal places.
 * @param n Value to round.
 * @param digits Number of decimal places (default 2).
 * @returns Rounded value.
 */
export function round(n: number, digits = 2): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

/**
 * Convert a 0..1 ratio to an integer percentage.
 * @param x Ratio in [0, 1].
 * @returns Integer percentage in [0, 100].
 */
export function pct(x: number): number {
  return Math.round(x * 100);
}
