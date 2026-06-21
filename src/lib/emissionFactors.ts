/**
 * Emission factors (kg CO2e per unit).
 *
 * Sources (rough, public-domain averages; cited for transparency, not precision):
 *  - Transport: UK BEIS / DEFRA 2023 conversion factors, IEA.
 *  - Food: Poore & Nemecek (2018) "Reducing food's environmental impacts" (Science).
 *  - Energy: IEA global average grid intensity (~0.45 kg/kWh); renewables ~0.05.
 *  - Waste: EPA WARM model rough averages.
 *
 * These are approximations meant for awareness, not regulatory accounting.
 */

export const TRANSPORT_FACTORS_KG_PER_KM = {
  car: 0.192, // average petrol passenger car
  bus: 0.089, // per passenger-km
  train: 0.041,
  bike: 0,
  walk: 0,
  flight: 0.255, // short-haul economy per passenger-km
} as const;

export const FOOD_FACTORS_KG_PER_MEAL = {
  "beef-meal": 7.2, // ~300g serving
  "lamb-meal": 6.8,
  "pork-meal": 2.4,
  "chicken-meal": 1.8,
  "fish-meal": 1.6,
  "vegetarian-meal": 0.9,
  "vegan-meal": 0.5,
  "dairy-heavy-meal": 2.1,
} as const;

export const ENERGY_FACTORS_KG_PER_KWH = {
  grid: 0.45,
  renewable: 0.05,
  mixed: 0.25,
} as const;

export const WASTE_FACTORS_KG_PER_KG = {
  landfill: 0.58,
  recycled: 0.1,
  composted: 0.05,
} as const;

// National average annual per-capita footprint (kg CO2e). Source: Our World in Data 2022.
export const REGION_BASELINE_KG_PER_YEAR: Record<string, number> = {
  global: 4700,
  US: 14400,
  EU: 6800,
  UK: 5500,
  IN: 1900,
  CN: 7400,
  BR: 2200,
};

export const GLOBAL_AVG_KG_PER_YEAR = REGION_BASELINE_KG_PER_YEAR.global;
