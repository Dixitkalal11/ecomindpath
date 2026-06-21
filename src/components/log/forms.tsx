/**
 * Activity-logging forms for each category. Extracted from src/routes/log.tsx
 * so the route file stays presentation-only and each form is single-purpose.
 *
 * Each form:
 *  - Validates input with a shared Zod schema.
 *  - Computes a live CO₂e preview using carbonEngine.
 *  - Persists to Supabase via the local `insert` helper.
 *  - Surfaces success/failure with a toast.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  calcEnergyKg,
  calcFoodKg,
  calcTransportKg,
  calcWasteKg,
  round,
} from "@/lib/carbonEngine";
import {
  ENERGY_FACTORS_KG_PER_KWH,
  FOOD_FACTORS_KG_PER_MEAL,
  TRANSPORT_FACTORS_KG_PER_KM,
  WASTE_FACTORS_KG_PER_KG,
} from "@/lib/emissionFactors";
import type { Category } from "@/types/carbon";

/** Shared schema: positive numeric quantity with a sane upper bound. */
const qtySchema = z.coerce.number().min(0).max(10_000);

interface ActivityPayload {
  category: Category;
  subtype: string;
  quantity: number;
  unit: string;
  co2e_kg: number;
}

/** Insert a logged activity row for the current user. Throws on failure. */
async function insert(userId: string, payload: ActivityPayload): Promise<void> {
  const { error } = await supabase.from("activities").insert({
    ...payload,
    user_id: userId,
    occurred_on: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

/** Card-style wrapper used by all category forms. */
function FormShell({
  children,
  onSubmit,
  busy,
  label,
}: {
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  label: string;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 rounded-2xl border bg-card p-5">
      {children}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : label}
      </Button>
    </form>
  );
}

export function TransportForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] =
    useState<keyof typeof TRANSPORT_FACTORS_KG_PER_KM>("car");
  const [km, setKm] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcTransportKg(mode, Number(km) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(km);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid distance");
    setBusy(true);
    try {
      await insert(user.id, {
        category: "transport",
        subtype: mode,
        quantity: parsed.data,
        unit: "km",
        co2e_kg: calcTransportKg(mode, parsed.data),
      });
      toast.success(`Logged: ${co2} kg CO₂`);
      setKm("");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log trip · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="mode">Mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <SelectTrigger id="mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(TRANSPORT_FACTORS_KG_PER_KM).map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="km">Distance (km)</Label>
        <Input
          id="km"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          required
        />
      </div>
    </FormShell>
  );
}

export function FoodForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [meal, setMeal] =
    useState<keyof typeof FOOD_FACTORS_KG_PER_MEAL>("chicken-meal");
  const [servings, setServings] = useState("1");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcFoodKg(meal, Number(servings) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(servings);
    if (!parsed.success || parsed.data <= 0)
      return toast.error("Enter a valid serving count");
    setBusy(true);
    try {
      await insert(user.id, {
        category: "food",
        subtype: meal,
        quantity: parsed.data,
        unit: "meal",
        co2e_kg: calcFoodKg(meal, parsed.data),
      });
      toast.success(`Logged: ${co2} kg CO₂`);
      setServings("1");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log meal · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="meal">Meal type</Label>
        <Select value={meal} onValueChange={(v) => setMeal(v as typeof meal)}>
          <SelectTrigger id="meal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(FOOD_FACTORS_KG_PER_MEAL).map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m.replace(/-/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="servings">Servings</Label>
        <Input
          id="servings"
          type="number"
          min={0}
          step="1"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          required
        />
      </div>
    </FormShell>
  );
}

export function EnergyForm({
  energySource,
  onSaved,
}: {
  energySource: keyof typeof ENERGY_FACTORS_KG_PER_KWH;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [kwh, setKwh] = useState("");
  const [source, setSource] = useState(energySource);
  const [busy, setBusy] = useState(false);
  const co2 = round(calcEnergyKg(source, Number(kwh) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(kwh);
    if (!parsed.success || parsed.data <= 0)
      return toast.error("Enter a valid kWh value");
    setBusy(true);
    try {
      await insert(user.id, {
        category: "energy",
        subtype: source,
        quantity: parsed.data,
        unit: "kWh",
        co2e_kg: calcEnergyKg(source, parsed.data),
      });
      toast.success(`Logged: ${co2} kg CO₂`);
      setKwh("");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log energy · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="src">Source</Label>
        <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
          <SelectTrigger id="src">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ENERGY_FACTORS_KG_PER_KWH).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kwh">Energy used (kWh)</Label>
        <Input
          id="kwh"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          value={kwh}
          onChange={(e) => setKwh(e.target.value)}
          required
        />
      </div>
    </FormShell>
  );
}

export function WasteForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [disp, setDisp] =
    useState<keyof typeof WASTE_FACTORS_KG_PER_KG>("landfill");
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcWasteKg(disp, Number(kg) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(kg);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid weight");
    setBusy(true);
    try {
      await insert(user.id, {
        category: "waste",
        subtype: disp,
        quantity: parsed.data,
        unit: "kg",
        co2e_kg: calcWasteKg(disp, parsed.data),
      });
      toast.success(`Logged: ${co2} kg CO₂`);
      setKg("");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log waste · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="disp">Disposition</Label>
        <Select value={disp} onValueChange={(v) => setDisp(v as typeof disp)}>
          <SelectTrigger id="disp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(WASTE_FACTORS_KG_PER_KG).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kg">Weight (kg)</Label>
        <Input
          id="kg"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          required
        />
      </div>
    </FormShell>
  );
}
