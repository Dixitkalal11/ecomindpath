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
import { calcEnergyKg, round } from "@/lib/carbonEngine";
import { ENERGY_FACTORS_KG_PER_KWH } from "@/lib/emissionFactors";
import { FormShell, QUANTITY_SCHEMA, insertActivity } from "./shared";

type EnergySource = keyof typeof ENERGY_FACTORS_KG_PER_KWH;

/**
 * Form for logging electricity / energy consumption.
 * @param energySource Default source pre-selected from the user profile.
 * @param onSaved Callback invoked after a successful save.
 */
export function EnergyForm({
  energySource,
  onSaved,
}: {
  energySource: EnergySource;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [kwh, setKwh] = useState("");
  const [source, setSource] = useState<EnergySource>(energySource);
  const [busy, setBusy] = useState(false);
  const co2 = round(calcEnergyKg(source, Number(kwh) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = QUANTITY_SCHEMA.safeParse(kwh);
    if (!parsed.success || parsed.data <= 0)
      return toast.error("Enter a valid kWh value");
    setBusy(true);
    try {
      await insertActivity(user.id, {
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
        <Select value={source} onValueChange={(v) => setSource(v as EnergySource)}>
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
