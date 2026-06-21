// Domain types for the carbon footprint engine.

export type Category = "transport" | "food" | "energy" | "waste";

export type TransportMode = "car" | "bus" | "train" | "bike" | "walk" | "flight" | "mixed";
export type DietType = "meat-heavy" | "moderate" | "vegetarian" | "vegan";
export type EnergySource = "grid" | "renewable" | "mixed";

export interface UserProfile {
  household_size: number;
  region: string;
  transport_mode: TransportMode;
  diet: DietType;
  energy_source: EnergySource;
}

export interface Activity {
  id?: string;
  category: Category;
  subtype: string; // e.g. "car", "beef-meal", "electricity-kwh"
  quantity: number;
  unit: string; // km, meal, kWh, kg
  co2e_kg: number;
  occurred_on?: string; // ISO date
  notes?: string | null;
}

export interface CategoryBreakdown {
  transport: number;
  food: number;
  energy: number;
  waste: number;
}

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  category: Category;
  estimatedSavingKgPerWeek: number;
  feasibility: 1 | 2 | 3; // 3 = easy, 1 = hard
  impactScore: number; // computed: saving * feasibility
}
