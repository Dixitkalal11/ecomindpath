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
import { calcWasteKg, round } from "@/lib/carbonEngine";
import { WASTE_FACTORS_KG_PER_KG } from "@/lib/emissionFactors";
import { FormShell, QUANTITY_SCHEMA, insertActivity } from "./shared";

type WasteDisposition = keyof typeof WASTE_FACTORS_KG_PER_KG;

/**
 * Form for logging waste output by disposition (landfill, recycled, composted).
 * @param onSaved Callback invoked after a successful save.
 */
export function WasteForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [disp, setDisp] = useState<WasteDisposition>("landfill");
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcWasteKg(disp, Number(kg) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = QUANTITY_SCHEMA.safeParse(kg);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid weight");
    setBusy(true);
    try {
      await insertActivity(user.id, {
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
        <Select value={disp} onValueChange={(v) => setDisp(v as WasteDisposition)}>
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
