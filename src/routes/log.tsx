import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Bike, Car, CookingPot, Lightbulb, Recycle } from "lucide-react";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import {
  calcEnergyKg, calcFoodKg, calcTransportKg, calcWasteKg, round,
} from "@/lib/carbonEngine";
import {
  ENERGY_FACTORS_KG_PER_KWH, FOOD_FACTORS_KG_PER_MEAL,
  TRANSPORT_FACTORS_KG_PER_KM, WASTE_FACTORS_KG_PER_KG,
} from "@/lib/emissionFactors";
import { toast } from "sonner";

export const Route = createFileRoute("/log")({
  component: () => (
    <Protected>
      <AppHeader />
      <Log />
    </Protected>
  ),
});

const qtySchema = z.coerce.number().min(0).max(10000);

function Log() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { activities, refresh } = useActivities(user?.id, 7);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Log an activity</h1>
      <p className="mt-1 text-muted-foreground">Quick estimates from realistic emission factors.</p>

      <Tabs defaultValue="transport" className="mt-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="transport"><Car className="size-4 mr-1.5" aria-hidden="true" /> Transport</TabsTrigger>
          <TabsTrigger value="food"><CookingPot className="size-4 mr-1.5" aria-hidden="true" /> Food</TabsTrigger>
          <TabsTrigger value="energy"><Lightbulb className="size-4 mr-1.5" aria-hidden="true" /> Energy</TabsTrigger>
          <TabsTrigger value="waste"><Recycle className="size-4 mr-1.5" aria-hidden="true" /> Waste</TabsTrigger>
        </TabsList>

        <TabsContent value="transport"><TransportForm onSaved={refresh} /></TabsContent>
        <TabsContent value="food"><FoodForm onSaved={refresh} /></TabsContent>
        <TabsContent value="energy"><EnergyForm energySource={profile?.energy_source ?? "grid"} onSaved={refresh} /></TabsContent>
        <TabsContent value="waste"><WasteForm onSaved={refresh} /></TabsContent>
      </Tabs>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent (7 days)</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border bg-card">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium capitalize">{a.subtype.replace(/-/g, " ")}</span>
                  <span className="ml-2 text-muted-foreground">{a.quantity} {a.unit} · {a.occurred_on}</span>
                </div>
                <span className="font-mono text-sm">{round(a.co2e_kg)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

async function insert(userId: string, payload: {
  category: "transport" | "food" | "energy" | "waste";
  subtype: string; quantity: number; unit: string; co2e_kg: number;
}) {
  const { error } = await supabase.from("activities").insert({
    ...payload,
    user_id: userId,
    occurred_on: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

function FormShell({ children, onSubmit, busy, label }: {
  children: React.ReactNode; onSubmit: (e: React.FormEvent) => void; busy: boolean; label: string;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 rounded-2xl border bg-card p-5">
      {children}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : label}</Button>
    </form>
  );
}

function TransportForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<keyof typeof TRANSPORT_FACTORS_KG_PER_KM>("car");
  const [km, setKm] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcTransportKg(mode, Number(km) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(km);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid distance");
    setBusy(true);
    try {
      await insert(user.id, { category: "transport", subtype: mode, quantity: parsed.data, unit: "km", co2e_kg: calcTransportKg(mode, parsed.data) });
      toast.success(`Logged: ${co2} kg CO₂`);
      setKm(""); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log trip · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="mode">Mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(TRANSPORT_FACTORS_KG_PER_KM).map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="km">Distance (km)</Label>
        <Input id="km" type="number" inputMode="decimal" min={0} step="0.1" value={km} onChange={(e) => setKm(e.target.value)} required />
      </div>
    </FormShell>
  );
}

function FoodForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [meal, setMeal] = useState<keyof typeof FOOD_FACTORS_KG_PER_MEAL>("chicken-meal");
  const [servings, setServings] = useState("1");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcFoodKg(meal, Number(servings) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(servings);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid serving count");
    setBusy(true);
    try {
      await insert(user.id, { category: "food", subtype: meal, quantity: parsed.data, unit: "meal", co2e_kg: calcFoodKg(meal, parsed.data) });
      toast.success(`Logged: ${co2} kg CO₂`); setServings("1"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log meal · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="meal">Meal type</Label>
        <Select value={meal} onValueChange={(v) => setMeal(v as typeof meal)}>
          <SelectTrigger id="meal"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(FOOD_FACTORS_KG_PER_MEAL).map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m.replace(/-/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="servings">Servings</Label>
        <Input id="servings" type="number" min={0} step="1" value={servings} onChange={(e) => setServings(e.target.value)} required />
      </div>
    </FormShell>
  );
}

function EnergyForm({ energySource, onSaved }: { energySource: keyof typeof ENERGY_FACTORS_KG_PER_KWH; onSaved: () => void }) {
  const { user } = useAuth();
  const [kwh, setKwh] = useState("");
  const [source, setSource] = useState(energySource);
  const [busy, setBusy] = useState(false);
  const co2 = round(calcEnergyKg(source, Number(kwh) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(kwh);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid kWh value");
    setBusy(true);
    try {
      await insert(user.id, { category: "energy", subtype: source, quantity: parsed.data, unit: "kWh", co2e_kg: calcEnergyKg(source, parsed.data) });
      toast.success(`Logged: ${co2} kg CO₂`); setKwh(""); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log energy · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="src">Source</Label>
        <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
          <SelectTrigger id="src"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(ENERGY_FACTORS_KG_PER_KWH).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kwh">Energy used (kWh)</Label>
        <Input id="kwh" type="number" inputMode="decimal" min={0} step="0.1" value={kwh} onChange={(e) => setKwh(e.target.value)} required />
      </div>
    </FormShell>
  );
}

function WasteForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [disp, setDisp] = useState<keyof typeof WASTE_FACTORS_KG_PER_KG>("landfill");
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcWasteKg(disp, Number(kg) || 0));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = qtySchema.safeParse(kg);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid weight");
    setBusy(true);
    try {
      await insert(user.id, { category: "waste", subtype: disp, quantity: parsed.data, unit: "kg", co2e_kg: calcWasteKg(disp, parsed.data) });
      toast.success(`Logged: ${co2} kg CO₂`); setKg(""); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <FormShell onSubmit={submit} busy={busy} label={`Log waste · ${co2} kg CO₂`}>
      <div className="space-y-2">
        <Label htmlFor="disp">Disposition</Label>
        <Select value={disp} onValueChange={(v) => setDisp(v as typeof disp)}>
          <SelectTrigger id="disp"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(WASTE_FACTORS_KG_PER_KG).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kg">Weight (kg)</Label>
        <Input id="kg" type="number" inputMode="decimal" min={0} step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} required />
      </div>
    </FormShell>
  );
}
