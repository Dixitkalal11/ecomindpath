import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, UserProfile } from "@/types/carbon";

/**
 * Load the current user's onboarding/profile row. Errors are swallowed so
 * the UI can render a sensible empty state rather than crashing.
 */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "household_size, region, transport_mode, diet, energy_source, onboarded",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
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
    } catch (err) {
      // Profile fetch failures shouldn't crash the app; surface in console.
      console.error("useProfile: failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { profile, onboarded, loading, refresh };
}

/**
 * Load the current user's activity history for the last `days` days.
 * Returned activities are normalized to numeric quantities so the
 * carbonEngine never has to handle string-typed numbers.
 */
export function useActivities(userId: string | undefined, days = 30) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const since = new Date(Date.now() - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase
        .from("activities")
        .select(
          "id, category, subtype, quantity, unit, co2e_kg, occurred_on, notes",
        )
        .eq("user_id", userId)
        .gte("occurred_on", since)
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      setActivities(
        (data ?? []).map((d) => ({
          ...d,
          category: d.category as Activity["category"],
          quantity: Number(d.quantity),
          co2e_kg: Number(d.co2e_kg),
        })),
      );
    } catch (err) {
      console.error("useActivities: failed to fetch activities", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { activities, loading, refresh };
}
