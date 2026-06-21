import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { calcFoodKg, round } from "@/lib/carbonEngine";
import { FOOD_FACTORS_KG_PER_MEAL } from "@/lib/emissionFactors";
import { FormShell, QUANTITY_SCHEMA, insertActivity } from "./shared";

type MealType = keyof typeof FOOD_FACTORS_KG_PER_MEAL;

/**
 * Form for logging a meal.
 * @param onSaved Callback invoked after a successful save.
 */
export function FoodForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [meal, setMeal] = useState<MealType>("chicken-meal");
  const [servings, setServings] = useState("1");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcFoodKg(meal, Number(servings) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = QUANTITY_SCHEMA.safeParse(servings);
    if (!parsed.success || parsed.data <= 0)
      return toast.error("Enter a valid serving count");
    setBusy(true);
    try {
      await insertActivity(user.id, {
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
        <Select value={meal} onValueChange={(v) => setMeal(v as MealType)}>
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
