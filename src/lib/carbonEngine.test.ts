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
} from "./carbonEngine";
import type { Activity, UserProfile } from "@/types/carbon";

const baseProfile: UserProfile = {
  household_size: 1,
  region: "global",
  transport_mode: "car",
  diet: "meat-heavy",
  energy_source: "grid",
};

describe("emission calculators", () => {
  it("zero distance and walk/bike yield zero emissions", () => {
    expect(calcTransportKg("car", 0)).toBe(0);
    expect(calcTransportKg("bike", 100)).toBe(0);
    expect(calcTransportKg("walk", 50)).toBe(0);
  });

  it("car emissions scale linearly with distance", () => {
    const a = calcTransportKg("car", 10);
    const b = calcTransportKg("car", 20);
    expect(b).toBeCloseTo(a * 2, 5);
  });

  it("beef meal has higher footprint than vegan", () => {
    expect(calcFoodKg("beef-meal")).toBeGreaterThan(calcFoodKg("vegan-meal"));
  });

  it("renewable energy is far lower than grid", () => {
    expect(calcEnergyKg("renewable", 10)).toBeLessThan(calcEnergyKg("grid", 10));
  });

  it("clamps negative quantities to zero", () => {
    expect(calcTransportKg("car", -5)).toBe(0);
    expect(calcWasteKg("landfill", -3)).toBe(0);
  });
});

describe("aggregation", () => {
  const acts: Activity[] = [
    { category: "transport", subtype: "car", quantity: 10, unit: "km", co2e_kg: 1.92, occurred_on: "2025-01-01" },
    { category: "food", subtype: "beef-meal", quantity: 1, unit: "meal", co2e_kg: 7.2, occurred_on: "2025-01-01" },
    { category: "food", subtype: "vegan-meal", quantity: 1, unit: "meal", co2e_kg: 0.5, occurred_on: "2025-01-02" },
  ];

  it("sums by category", () => {
    const b = aggregate(acts);
    expect(b.transport).toBeCloseTo(1.92);
    expect(b.food).toBeCloseTo(7.7);
    expect(b.energy).toBe(0);
  });

  it("totalKg sums everything", () => {
    expect(totalKg(aggregate(acts))).toBeCloseTo(9.62);
  });

  it("trendByDate groups and sorts by date", () => {
    const t = trendByDate(acts);
    expect(t).toHaveLength(2);
    expect(t[0].date).toBe("2025-01-01");
    expect(t[0].total).toBeCloseTo(9.12);
  });
});

describe("baseline", () => {
  it("vegan + bike + renewable < meat + car + grid", () => {
    const dirty = estimateBaselineKgPerYear(baseProfile);
    const clean = estimateBaselineKgPerYear({
      ...baseProfile,
      diet: "vegan",
      transport_mode: "bike",
      energy_source: "renewable",
    });
    expect(clean).toBeLessThan(dirty);
  });

  it("respects regional baseline", () => {
    const us = estimateBaselineKgPerYear({ ...baseProfile, region: "US" });
    const ind = estimateBaselineKgPerYear({ ...baseProfile, region: "IN" });
    expect(us).toBeGreaterThan(ind);
  });
});

describe("recommendation engine", () => {
  it("flags short car trips when there are multiple under 5km", () => {
    const acts: Activity[] = [
      { category: "transport", subtype: "car", quantity: 3, unit: "km", co2e_kg: 0.6 },
      { category: "transport", subtype: "car", quantity: 4, unit: "km", co2e_kg: 0.8 },
      { category: "transport", subtype: "car", quantity: 2, unit: "km", co2e_kg: 0.4 },
    ];
    const recs = generateRecommendations(baseProfile, acts);
    expect(recs.some((r) => r.id === "swap-short-car-trips")).toBe(true);
  });

  it("suggests meatless day for meat-heavy diets", () => {
    const recs = generateRecommendations(baseProfile, []);
    expect(recs.some((r) => r.id === "meatless-day")).toBe(true);
  });

  it("does NOT suggest meatless day to vegans", () => {
    const recs = generateRecommendations({ ...baseProfile, diet: "vegan" }, []);
    expect(recs.some((r) => r.id === "meatless-day")).toBe(false);
  });

  it("ranks recommendations by impact (saving × feasibility) descending", () => {
    const acts: Activity[] = Array.from({ length: 5 }).map(() => ({
      category: "transport" as const, subtype: "car", quantity: 3, unit: "km", co2e_kg: 0.6,
    }));
    const recs = generateRecommendations(baseProfile, acts);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].impactScore).toBeGreaterThanOrEqual(recs[i].impactScore);
    }
  });

  it("projectReduction calculates non-negative savings", () => {
    const recs = generateRecommendations(baseProfile, []);
    const { newTotal, reductionPct } = projectReduction(50, recs, 3);
    expect(newTotal).toBeGreaterThanOrEqual(0);
    expect(reductionPct).toBeGreaterThanOrEqual(0);
  });
});
