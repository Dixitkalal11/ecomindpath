import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, UserProfile } from "@/types/carbon";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("household_size, region, transport_mode, diet, energy_source, onboarded")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setOnboarded(!!data.onboarded);
      setProfile({
        household_size: data.household_size,
        region: data.region,
        transport_mode: data.transport_mode as UserProfile["transport_mode"],
        diet: data.diet as UserProfile["diet"],
        energy_source: data.energy_source as UserProfile["energy_source"],
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { profile, onboarded, loading, refresh };
}

export function useActivities(userId: string | undefined, days = 30) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("activities")
      .select("id, category, subtype, quantity, unit, co2e_kg, occurred_on, notes")
      .eq("user_id", userId)
      .gte("occurred_on", since)
      .order("occurred_on", { ascending: false });
    setActivities((data ?? []).map((d) => ({
      ...d,
      category: d.category as Activity["category"],
      quantity: Number(d.quantity),
      co2e_kg: Number(d.co2e_kg),
    })));
    setLoading(false);
  }, [userId, days]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { activities, loading, refresh };
}
