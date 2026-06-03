"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Event = {
  id: string;
  batch_id: string | null;
  ad_id: string | null;
  shot_id: string | null;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  data: Record<string, unknown>;
  created_at: string;
};

export default function AdminRuns() {
  const [levelFilter, setLevelFilter] = React.useState<"all" | "info" | "warn" | "error">("all");
  const [batchFilter, setBatchFilter] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "events", levelFilter, batchFilter, stageFilter],
    queryFn: async (): Promise<Event[]> => {
      const supabase = createClient();
      let qb = supabase.from("generation_events").select("*").order("created_at", { ascending: false }).limit(200);
      if (levelFilter !== "all") qb = qb.eq("level", levelFilter);
      if (batchFilter) qb = qb.eq("batch_id", batchFilter);
      if (stageFilter) qb = qb.eq("stage", stageFilter);
      const { data } = await qb;
      return (data ?? []) as Event[];
    },
    refetchInterval: 5000, // live tail
  });

  const events = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
        Live tail of <code>generation_events</code>. Refreshes every 5s. Click a row to inspect <code>data</code>.
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Level</span>
          <select className="bg-transparent border rounded h-8 px-2 text-sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as "all" | "info" | "warn" | "error")}>
            <option value="all">all</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Batch id</span>
          <input className="bg-transparent border rounded h-8 px-2 text-sm font-mono" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} placeholder="uuid" />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Stage</span>
          <input className="bg-transparent border rounded h-8 px-2 text-sm" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} placeholder="write_script" />
        </label>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Stage</th>
              <th className="px-4 py-2">Message</th>
              <th className="px-4 py-2">Batch / Ad / Shot</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 && !q.isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No events match.</td></tr>
            )}
            {events.map((e) => (
              <React.Fragment key={e.id}>
                <tr onClick={() => setOpenId(openId === e.id ? null : e.id)} className="cursor-pointer hover:bg-white/5">
                  <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{new Date(e.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${e.level === "error" ? "bg-red-500/20 text-red-300" : e.level === "warn" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-muted-foreground"}`}>
                      {e.level}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.stage}</td>
                  <td className="px-4 py-2">{e.message}</td>
                  <td className="px-4 py-2 text-[10px] font-mono text-muted-foreground">
                    {e.batch_id && <div>b: {e.batch_id.slice(0, 8)}</div>}
                    {e.ad_id && <div>a: {e.ad_id.slice(0, 8)}</div>}
                    {e.shot_id && <div>s: {e.shot_id.slice(0, 8)}</div>}
                  </td>
                </tr>
                {openId === e.id && (
                  <tr><td colSpan={5} className="px-4 py-3 bg-black/30">
                    <pre className="text-[11px] font-mono whitespace-pre-wrap">{JSON.stringify(e.data, null, 2)}</pre>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
