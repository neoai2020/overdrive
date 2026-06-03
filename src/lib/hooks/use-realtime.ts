"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Subscribe to a single row's changes and invalidate the matching query.
 * Usage:
 *   useRealtimeRow("batches", batchId, ["batches", batchId]);
 */
export function useRealtimeRow(table: string, id: string | undefined, queryKey: unknown[]) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`row:${table}:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, id, qc, JSON.stringify(queryKey)]);
}

/**
 * Subscribe to all changes on a table within the workspace and invalidate the matching query.
 */
export function useRealtimeTable(table: string, queryKey: unknown[], filter?: string) {
  const qc = useQueryClient();
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`table:${table}:${filter ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => qc.invalidateQueries({ queryKey })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, filter, qc, JSON.stringify(queryKey)]);
}
