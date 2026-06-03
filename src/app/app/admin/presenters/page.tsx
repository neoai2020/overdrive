"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Presenter = {
  id: string;
  name: string;
  persona: string | null;
  niche_fit: string[];
  gender: string | null;
  age_band: string | null;
  ethnicity: string | null;
  reference_image_url: string | null;
  voice_default: string | null;
  notes: string | null;
  active: boolean;
  is_system: boolean;
};

export default function AdminPresenters() {
  const q = useQuery({
    queryKey: ["admin", "presenters"],
    queryFn: async (): Promise<Presenter[]> => {
      const supabase = createClient();
      const { data } = await supabase.from("presenters").select("*").order("name");
      return (data ?? []) as Presenter[];
    },
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const presenters = q.data ?? [];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
        {presenters.length} presenters seeded. The pipeline picks one per ad based on the offer&apos;s niche.
        Edit-in-place coming in a later pass — for now manage via SQL or the seed migration.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {presenters.map((p) => (
          <div key={p.id} className="border rounded-lg overflow-hidden">
            {p.reference_image_url && (
              <div className="aspect-[9/16] bg-black/40 flex items-center justify-center overflow-hidden">
                <img src={p.reference_image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3 space-y-1">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.persona}</div>
              <div className="text-[11px] text-muted-foreground">{p.gender} · {p.age_band} · {p.ethnicity}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {p.niche_fit.map((n) => (
                  <span key={n} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded">{n}</span>
                ))}
              </div>
              {p.notes && <div className="text-[11px] text-muted-foreground mt-2 italic">{p.notes}</div>}
              <div className="text-[10px] text-muted-foreground mt-2">
                voice: <code>{p.voice_default ?? "—"}</code>
                {!p.active && <span className="ml-2 text-amber-400">inactive</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
