/**
 * Extended coverage for carbonEngine.ts — edge cases, boundary values,
 * and behavioural guarantees of the recommendation engine.
 *
 * Tests use descriptive names so failures are self-explanatory.
 */
import { describe, it, expect } from "vitest";
import {
  calcTransportKg,
  calcFoodKg,
  calcEnergyKg,
  calcWasteKg,
  aggregate,
  totalKg,
  trendByDate,
  estimateBaselineKgPerYear,
  generateRecommendations,
  projectReduction,
  emptyBreakdown,
  round,
} from "./carbonEngine";
import {
  TRANSPORT_FACTORS_KG_PER_KM,
  FOOD_FACTORS_KG_PER_MEAL,
  REGION_BASELINE_KG_PER_YEAR,
} from "./emissionFactors";
import type { Activity, UserProfile } from "@/types/carbon";

const profile: UserProfile = {
  household_size: 1,
  region: "global",
  transport_mode: "car",
  diet: "meat-heavy",
  energy_source: "grid",
};

// ---------- Per-category emission calculators ----------

describe("calcTransportKg — per-category transport math", () => {
  it("returns 0 for zero or negative kilometres", () => {
    expect(calcTransportKg("car", 0)).toBe(0);
    expect(calcTransportKg("flight", -100)).toBe(0);
  });

  it("scales long-haul flights linearly to large totals", () => {
    const longHaul = calcTransportKg("flight", 10_000);
    expect(longHaul).toBeCloseTo(10_000 * TRANSPORT_FACTORS_KG_PER_KM.flight);
    expect(longHaul).toBeGreaterThan(2_000); // > 2 tonnes for a 10k km flight
  });

  it("treats walking and cycling as zero-emission no matter the distance", () => {
    expect(calcTransportKg("walk", 999_999)).toBe(0);
    expect(calcTransportKg("bike", 999_999)).toBe(0);
  });
});

describe("calcFoodKg — meals never crash on bad input", () => {
  it("returns 0 for negative or zero servings", () => {
    expect(calcFoodKg("beef-meal", 0)).toBe(0);
    expect(calcFoodKg("beef-meal", -5)).toBe(0);
  });

  it("ranks footprints in the expected order: beef > chicken > vegetarian > vegan", () => {
    expect(calcFoodKg("beef-meal")).toBeGreaterThan(calcFoodKg("chicken-meal"));
    expect(calcFoodKg("chicken-meal")).toBeGreaterThan(calcFoodKg("vegetarian-meal"));
    expect(calcFoodKg("vegetarian-meal")).toBeGreaterThan(calcFoodKg("vegan-meal"));
  });
});

describe("calcEnergyKg & calcWasteKg — clamps and ordering", () => {
  it("renewable < mixed < grid for the same kWh", () => {
    expect(calcEnergyKg("renewable", 100)).toBeLessThan(calcEnergyKg("mixed", 100));
    expect(calcEnergyKg("mixed", 100)).toBeLessThan(calcEnergyKg("grid", 100));
  });
  it("composted < recycled < landfill for the same kg", () => {
    expect(calcWasteKg("composted", 5)).toBeLessThan(calcWasteKg("recycled", 5));
    expect(calcWasteKg("recycled", 5)).toBeLessThan(calcWasteKg("landfill", 5));
  });
  it("clamps negative inputs to zero rather than throwing", () => {
    expect(calcEnergyKg("grid", -10)).toBe(0);
    expect(calcWasteKg("landfill", -1)).toBe(0);
  });
});

// ---------- Aggregation edge cases ----------

describe("aggregate / totalKg — empty + malformed activity logs", () => {
  it("returns an empty breakdown when no activities are logged", () => {
    const b = aggregate([]);
    expect(b).toEqual(emptyBreakdown());
    expect(totalKg(b)).toBe(0);
  });

  it("ignores NaN co2e values rather than poisoning the total", () => {
    const acts = [
      { category: "food", subtype: "x", quantity: 1, unit: "meal", co2e_kg: NaN },
      { category: "food", subtype: "y", quantity: 1, unit: "meal", co2e_kg: 2 },
    ] as Activity[];
    expect(totalKg(aggregate(acts))).toBe(2);
  });

  it("trendByDate returns an empty array for empty input", () => {
    expect(trendByDate([])).toEqual([]);
  });
});

// ---------- Baseline boundary values ----------

describe("estimateBaselineKgPerYear — boundary behaviour", () => {
  it("falls back to the global average for an unknown region", () => {
    const unknown = estimateBaselineKgPerYear({ ...profile, region: "ATLANTIS" });
    const global = estimateBaselineKgPerYear({ ...profile, region: "global" });
    expect(unknown).toBe(global);
  });

  it("never falls below a hard floor of 500 kg/yr", () => {
    const tiny = estimateBaselineKgPerYear({
      household_size: 8,
      region: "IN",
      transport_mode: "walk",
      diet: "vegan",
      energy_source: "renewable",
    });
    expect(tiny).toBeGreaterThanOrEqual(500);
  });

  it("a large household reduces per-capita baseline (sharing effect)", () => {
    const solo = estimateBaselineKgPerYear({ ...profile, household_size: 1 });
    const family = estimateBaselineKgPerYear({ ...profile, household_size: 4 });
    expect(family).toBeLessThan(solo);
  });

  it("frequent-flyer profile has the highest baseline of all transport modes", () => {
    const flyer = estimateBaselineKgPerYear({ ...profile, transport_mode: "flight" });
    const driver = estimateBaselineKgPerYear({ ...profile, transport_mode: "car" });
    const cyclist = estimateBaselineKgPerYear({ ...profile, transport_mode: "bike" });
    expect(flyer).toBeGreaterThan(driver);
    expect(driver).toBeGreaterThan(cyclist);
  });

  it("uses every region in the table without producing NaN", () => {
    for (const region of Object.keys(REGION_BASELINE_KG_PER_YEAR)) {
      const v = estimateBaselineKgPerYear({ ...profile, region });
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

// ---------- Recommendation engine ----------

describe("generateRecommendations — adapts to user habits", () => {
  it("returns no recommendations for a fully sustainable lifestyle with no activity", () => {
    const recs = generateRecommendations(
      { ...profile, diet: "vegan", transport_mode: "bike", energy_source: "renewable" },
      [],
    );
    expect(recs).toEqual([]);
  });

  it("excludes the meatless-day tip for users who have already adopted a vegan diet", () => {
    const recs = generateRecommendations({ ...profile, diet: "vegan" }, []);
    expect(recs.find((r) => r.id === "meatless-day")).toBeUndefined();
  });

  it("excludes the renewable-tariff tip for users already on a renewable source", () => {
    const acts: Activity[] = [
      { category: "energy", subtype: "renewable", quantity: 200, unit: "kWh", co2e_kg: 10 },
    ];
    const recs = generateRecommendations({ ...profile, energy_source: "renewable" }, acts);
    expect(recs.find((r) => r.id === "switch-renewable")).toBeUndefined();
  });

  it("ranks tips by impactScore = saving × feasibility, descending", () => {
    const acts: Activity[] = [
      { category: "transport", subtype: "car", quantity: 4, unit: "km", co2e_kg: 0.8 },
      { category: "transport", subtype: "car", quantity: 3, unit: "km", co2e_kg: 0.6 },
      { category: "transport", subtype: "car", quantity: 2, unit: "km", co2e_kg: 0.4 },
      { category: "food", subtype: "beef-meal", quantity: 1, unit: "meal", co2e_kg: FOOD_FACTORS_KG_PER_MEAL["beef-meal"] },
      { category: "food", subtype: "beef-meal", quantity: 1, unit: "meal", co2e_kg: FOOD_FACTORS_KG_PER_MEAL["beef-meal"] },
      { category: "food", subtype: "beef-meal", quantity: 1, unit: "meal", co2e_kg: FOOD_FACTORS_KG_PER_MEAL["beef-meal"] },
    ];
    const recs = generateRecommendations(profile, acts);
    expect(recs.length).toBeGreaterThan(1);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].impactScore).toBeGreaterThanOrEqual(recs[i].impactScore);
    }
  });

  it("ranking changes when the underlying activity data changes", () => {
    const noActs = generateRecommendations(profile, []);
    const heavyCar: Activity[] = Array.from({ length: 4 }).map(() => ({
      category: "transport" as const, subtype: "car", quantity: 3, unit: "km", co2e_kg: 0.6,
    }));
    const withActs = generateRecommendations(profile, heavyCar);
    // Different inputs should produce different rankings or different sets.
    expect(JSON.stringify(noActs.map((r) => r.id))).not.toBe(
      JSON.stringify(withActs.map((r) => r.id)),
    );
  });

  it("does not crash when given malformed activity rows", () => {
    const messy = [
      { category: "transport", subtype: "car", quantity: NaN, unit: "km", co2e_kg: NaN },
      { category: "food", subtype: "beef-meal", quantity: -1, unit: "meal", co2e_kg: -2 },
    ] as unknown as Activity[];
    expect(() => generateRecommendations(profile, messy)).not.toThrow();
  });
});

// ---------- projectReduction ----------

describe("projectReduction — what-if math", () => {
  it("returns 0% reduction when there are no recommendations", () => {
    const { newTotal, reductionPct } = projectReduction(50, [], 3);
    expect(newTotal).toBe(50);
    expect(reductionPct).toBe(0);
  });

  it("never produces a negative new total even if savings exceed weekly", () => {
    const recs = generateRecommendations(profile, []);
    const { newTotal } = projectReduction(0.1, recs, 5);
    expect(newTotal).toBeGreaterThanOrEqual(0);
  });

  it("respects topN and only sums the top-ranked tips", () => {
    const recs = generateRecommendations(profile, []);
    const all = projectReduction(100, recs, recs.length);
    const top1 = projectReduction(100, recs, 1);
    expect(all.reductionPct).toBeGreaterThanOrEqual(top1.reductionPct);
  });
});

describe("round helper", () => {
  it("rounds to 2 decimals by default", () => {
    expect(round(1.2345)).toBe(1.23);
  });
  it("respects an explicit digits argument", () => {
    expect(round(1.2345, 3)).toBe(1.235);
  });
});
