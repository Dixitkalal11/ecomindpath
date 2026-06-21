import { createFileRoute } from "@tanstack/react-router";
import { Car, CookingPot, Lightbulb, Recycle } from "lucide-react";
import { Protected } from "@/components/Protected";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, useProfile } from "@/hooks/useEcoData";
import { round } from "@/lib/carbonEngine";
import {
  TransportForm,
  FoodForm,
  EnergyForm,
  WasteForm,
} from "@/components/log/forms";

export const Route = createFileRoute("/log")({
  component: () => (
    <Protected>
      <AppHeader />
      <Log />
    </Protected>
  ),
});

function Log() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { activities, refresh } = useActivities(user?.id, 7);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Log an activity</h1>
      <p className="mt-1 text-muted-foreground">
        Quick estimates from realistic emission factors.
      </p>

      <Tabs defaultValue="transport" className="mt-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="transport">
            <Car className="size-4 mr-1.5" aria-hidden="true" /> Transport
          </TabsTrigger>
          <TabsTrigger value="food">
            <CookingPot className="size-4 mr-1.5" aria-hidden="true" /> Food
          </TabsTrigger>
          <TabsTrigger value="energy">
            <Lightbulb className="size-4 mr-1.5" aria-hidden="true" /> Energy
          </TabsTrigger>
          <TabsTrigger value="waste">
            <Recycle className="size-4 mr-1.5" aria-hidden="true" /> Waste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transport">
          <TransportForm onSaved={refresh} />
        </TabsContent>
        <TabsContent value="food">
          <FoodForm onSaved={refresh} />
        </TabsContent>
        <TabsContent value="energy">
          <EnergyForm
            energySource={profile?.energy_source ?? "grid"}
            onSaved={refresh}
          />
        </TabsContent>
        <TabsContent value="waste">
          <WasteForm onSaved={refresh} />
        </TabsContent>
      </Tabs>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent (7 days)</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border bg-card">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium capitalize">
                    {a.subtype.replace(/-/g, " ")}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {a.quantity} {a.unit} · {a.occurred_on}
                  </span>
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
