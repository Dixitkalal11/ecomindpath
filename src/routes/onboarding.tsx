import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Protected } from "@/components/Protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DietType, EnergySource, TransportMode } from "@/types/carbon";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <Protected>
      <Onboarding />
    </Protected>
  ),
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [householdSize, setHouseholdSize] = useState(1);
  const [region, setRegion] = useState("global");
  const [transport, setTransport] = useState<TransportMode>("mixed");
  const [diet, setDiet] = useState<DietType>("moderate");
  const [energy, setEnergy] = useState<EnergySource>("grid");
  const [busy, setBusy] = useState(false);

  // If already onboarded, skip ahead.
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("onboarded").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.onboarded) navigate({ to: "/dashboard" });
    });
  }, [user, navigate]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      household_size: householdSize,
      region,
      transport_mode: transport,
      diet,
      energy_source: energy,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-dvh eco-grain px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="size-4 text-primary" aria-hidden="true" /> Quick setup
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Tell EcoMind a bit about you</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We use these to estimate your baseline footprint. No personal info needed.
        </p>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hh">Household size</Label>
              <Input id="hh" type="number" min={1} max={20} value={householdSize}
                onChange={(e) => setHouseholdSize(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global average</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="EU">European Union</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Primary transport</Label>
            <RadioGroup value={transport} onValueChange={(v) => setTransport(v as TransportMode)} className="grid grid-cols-3 gap-2">
              {(["car", "bus", "train", "bike", "walk", "mixed"] as TransportMode[]).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value={t} id={`t-${t}`} />{t}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Diet</Label>
            <RadioGroup value={diet} onValueChange={(v) => setDiet(v as DietType)} className="grid grid-cols-2 gap-2">
              {(["meat-heavy", "moderate", "vegetarian", "vegan"] as DietType[]).map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value={d} id={`d-${d}`} />{d.replace("-", " ")}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Home energy</Label>
            <RadioGroup value={energy} onValueChange={(v) => setEnergy(v as EnergySource)} className="grid grid-cols-3 gap-2">
              {(["grid", "mixed", "renewable"] as EnergySource[]).map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value={e} id={`e-${e}`} />{e}
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Continue to dashboard"}
          </Button>
        </div>
      </div>
    </main>
  );
}
