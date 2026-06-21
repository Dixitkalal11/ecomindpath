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
import { calcTransportKg, round } from "@/lib/carbonEngine";
import { TRANSPORT_FACTORS_KG_PER_KM } from "@/lib/emissionFactors";
import { FormShell, QUANTITY_SCHEMA, insertActivity } from "./shared";

type TransportMode = keyof typeof TRANSPORT_FACTORS_KG_PER_KM;

/**
 * Form for logging a transport trip.
 * @param onSaved Callback invoked after a successful save so parents can refresh.
 */
export function TransportForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<TransportMode>("car");
  const [km, setKm] = useState("");
  const [busy, setBusy] = useState(false);
  const co2 = round(calcTransportKg(mode, Number(km) || 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = QUANTITY_SCHEMA.safeParse(km);
    if (!parsed.success || parsed.data <= 0) return toast.error("Enter a valid distance");
    setBusy(true);
    try {
      await insertActivity(user.id, {
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
        <Select value={mode} onValueChange={(v) => setMode(v as TransportMode)}>
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
