"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./use-realtime";
import type { Batch } from "@/lib/types/database";

export interface ActiveRun {
  id: string;
  label: string;
  progress_step: string | null;
  progress_pct: number | null;
  started_at: string | null;
}

export function useActiveRuns() {
  // Subscribe so the list refreshes the moment a job updates
  useRealtimeTable("batches", ["batches", "active"]);

  const { data } = useQuery({
    queryKey: ["batches", "active"],
    queryFn: async (): Promise<ActiveRun[]> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("batches")
          .select("id, angle, custom_angle, status, progress_step, progress_pct, created_at, size")
          .in("status", ["queued", "generating", "needs_review"])
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return ((data ?? []) as Array<Batch & { id: string }>).map((b) => ({
          id: b.id,
          label: b.custom_angle ?? b.angle ?? `Batch · ${b.size} ads`,
          progress_step: b.progress_step,
          progress_pct: b.progress_pct,
          started_at: b.created_at,
        }));
      } catch {
        // No supabase configured yet — surface as zero runs.
        return [];
      }
    },
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  return { runs: data ?? [] };
}
