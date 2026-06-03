import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, Upload, FileText, FileAudio } from "lucide-react";
import type { VoiceFile } from "@/lib/types/database";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_ICONS = {
  swipe: FileText, script: FileText, brand_voice: Mic2, transcript: FileAudio, other: FileText,
} as const;

export default async function VoicePage() {
  const supabase = await createClient();
  let files: VoiceFile[] = [];
  try {
    const { data } = await supabase.from("voice_files").select("*").order("created_at", { ascending: false });
    files = (data ?? []) as VoiceFile[];
  } catch { /* */ }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="My voice"
        title="Knowledge base"
        description="Upload swipe files, scripts and your brand voice. The engine learns your style and writes ads that sound like you."
        actions={<Button><Upload className="w-4 h-4" /> Upload</Button>}
      />

      <DocCallout title="What lives here">
        Three things: <strong className="text-[color:var(--color-ink)]">swipes</strong> (winning competitor ads you screenshotted), <strong className="text-[color:var(--color-ink)]">scripts</strong> (your own past winners), and <strong className="text-[color:var(--color-ink)]">brand voice</strong> (tone guide, do/don'ts). All get vectorized so generation pulls from them.
      </DocCallout>

      {files.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="Nothing uploaded yet"
          description="Drop in 5–10 of your winning scripts and the engine starts writing in your voice immediately."
          action={<Button><Upload className="w-4 h-4" /> Upload your first</Button>}
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => {
            const Icon = KIND_ICONS[f.kind] ?? FileText;
            return (
              <Card key={f.id}>
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-white/5 inline-flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[color:var(--color-acid)]" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{f.name}</CardTitle>
                    <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)] mt-1 font-medium">{f.kind.replace(/_/g, " ")}</div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-[color:var(--color-muted)] flex items-center justify-between">
                  <span>{f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : "—"}</span>
                  <span>{formatRelativeTime(f.created_at)}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
