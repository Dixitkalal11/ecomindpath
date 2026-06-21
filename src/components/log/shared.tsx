/**
 * Shared primitives for the activity-logging forms.
 *
 * - `QUANTITY_SCHEMA` is the Zod schema reused by every category form.
 * - `insertActivity` writes a row into the `activities` table for the
 *   current user; throws on failure so callers can surface a toast.
 * - `FormShell` is the shared card-style wrapper.
 */
import type { FormEvent, ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/types/carbon";

/** Maximum quantity accepted in any single log entry. */
export const MAX_QUANTITY = 10_000;

/** Shared Zod schema for the numeric quantity field of every form. */
export const QUANTITY_SCHEMA = z.coerce.number().min(0).max(MAX_QUANTITY);

/** Shape of a row that will be inserted into the `activities` table. */
export interface ActivityPayload {
  category: Category;
  subtype: string;
  quantity: number;
  unit: string;
  co2e_kg: number;
}

/**
 * Insert a logged activity row for the current user.
 * @param userId Supabase auth user id.
 * @param payload Activity fields (everything except user_id and date).
 * @returns Promise that resolves once the row is written. Throws on error.
 */
export async function insertActivity(
  userId: string,
  payload: ActivityPayload,
): Promise<void> {
  const { error } = await supabase.from("activities").insert({
    ...payload,
    user_id: userId,
    occurred_on: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

/**
 * Card-style wrapper used by every category form.
 * @param children Form fields to render.
 * @param onSubmit Submit handler.
 * @param busy Whether the form is currently submitting.
 * @param label Submit-button label (typically includes a live CO₂ preview).
 */
export function FormShell({
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
