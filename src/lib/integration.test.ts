/**
 * Integration-style tests that wire calculator → aggregator → recommendation
 * engine the same way the UI does, without rendering React.
 *
 * These guarantee that "logging an activity" propagates through the whole
 * data flow: it changes the dashboard totals AND can change recommendation
 * ranking.
 */
import { describe, it, expect } from "vitest";
import {
  aggregate,
  calcFoodKg,
  calcTransportKg,
  generateRecommendations,
  projectReduction,
  totalKg,
} from "./carbonEngine";
import { vsAveragePct } from "./comparisons";
import type { Activity, UserProfile } from "@/types/carbon";

const profile: UserProfile = {
  household_size: 2,
  region: "EU",
  transport_mode: "car",
  diet: "meat-heavy",
  energy_source: "grid",
};

function logTransport(km: number): Activity {
  return {
    category: "transport",
    subtype: "car",
    quantity: km,
    unit: "km",
    co2e_kg: calcTransportKg("car", km),
    occurred_on: new Date().toISOString().slice(0, 10),
  };
}

function logBeef(): Activity {
  return {
    category: "food",
    subtype: "beef-meal",
    quantity: 1,
    unit: "meal",
    co2e_kg: calcFoodKg("beef-meal"),
    occurred_on: new Date().toISOString().slice(0, 10),
  };
}

describe("end-to-end data flow", () => {
  it("logging activities increases the dashboard total", () => {
    const acts: Activity[] = [];
    const before = totalKg(aggregate(acts));
    acts.push(logTransport(10), logBeef());
    const after = totalKg(aggregate(acts));
    expect(after).toBeGreaterThan(before);
  });

  it("logging short car trips surfaces a transport-specific recommendation", () => {
    const baselineRecs = generateRecommendations(profile, []);
    const heavyCarRecs = generateRecommendations(profile, [
      logTransport(3),
      logTransport(2),
      logTransport(4),
      logTransport(3),
    ]);
    const hadShortTripTip = baselineRecs.some((r) => r.id === "swap-short-car-trips");
    const hasShortTripTip = heavyCarRecs.some((r) => r.id === "swap-short-car-trips");
    expect(hadShortTripTip).toBe(false);
    expect(hasShortTripTip).toBe(true);
  });

  it("projection from current week + ranked recommendations yields a reduction percentage between 0 and 100", () => {
    const acts = [logBeef(), logBeef(), logTransport(20)];
    const weekly = totalKg(aggregate(acts));
    const recs = generateRecommendations(profile, acts);
    const { reductionPct } = projectReduction(weekly, recs, 3);
    expect(reductionPct).toBeGreaterThanOrEqual(0);
    expect(reductionPct).toBeLessThanOrEqual(100);
  });

  it("vsAveragePct reflects whether logged total is above or below benchmark", () => {
    const acts = [logTransport(5)];
    const weekly = totalKg(aggregate(acts));
    expect(vsAveragePct(weekly, 200)).toBeLessThan(0);
    expect(vsAveragePct(weekly, 0.1)).toBeGreaterThan(0);
  });
});
