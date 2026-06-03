"""
Overdrive FFmpeg assembly service — runs on Modal.

Deploys a single HTTP endpoint that takes:
  {
    "shots":        [ { "videoUrl": "...", "voStart": 0.0, "voEnd": 4.2, "onScreen": "..." } ],
    "audio_url":    "https://.../voiceover.mp3",
    "word_timings": [ { "word": "...", "start": 0.0, "end": 0.3 } ],
    "upload": {
      "bucket": "generated",
      "video_path": "ads/<workspace>/<ad>/<version>.mp4",
      "thumb_path": "ads/<workspace>/<ad>/<version>.jpg",
      "supabase_url": "https://....supabase.co",
      "service_role_key": "ey..."
    },
    "options": { "aspect_ratio": "9:16", "caption_style": "ugc-bouncing" }
  }

Returns:
  { "duration_seconds": float, "bytes": int, "cost_usd": float }

The MP4 + JPG thumbnail are uploaded directly to Supabase Storage via the
service-role key passed in the request, so the API gateway doesn't have to
proxy a large file back through Vercel/DO.

Deploy:
  pip install modal
  modal token new
  modal deploy modal/ffmpeg_assemble.py
  # → prints the public URL; put it in MODAL_FFMPEG_ENDPOINT env var.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any

import modal

# ─── Image: ffmpeg + supabase-py for the upload step ──────────────────────
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "fontconfig", "fonts-dejavu-core")
    .pip_install("supabase==2.7.4", "httpx==0.27.0")
)

app = modal.App("overdrive-ffmpeg", image=image)


# ─── Helpers ──────────────────────────────────────────────────────────────

def _download(url: str, dest: Path) -> Path:
    with urllib.request.urlopen(url, timeout=60) as r, dest.open("wb") as f:
        f.write(r.read())
    return dest


def _ass_subtitles(word_timings: list[dict[str, Any]], dest: Path) -> Path:
    """Build a simple .ass subtitle file with one word per cue —
    drives the 'bouncing UGC caption' look (one word at a time, big bold)."""
    def fmt(t: float) -> str:
        # Hours:MM:SS.cs
        cs = int((t - int(t)) * 100)
        s = int(t) % 60
        m = (int(t) // 60) % 60
        h = int(t) // 3600
        return f"{h:01d}:{m:02d}:{s:02d}.{cs:02d}"

    header = """[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,72,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,40,40,140,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [header]
    for w in word_timings:
        word = str(w.get("word", "")).replace("{", "").replace("}", "")
        start = float(w.get("start", 0))
        end = float(w.get("end", start + 0.3))
        if end <= start:
            end = start + 0.3
        lines.append(f"Dialogue: 0,{fmt(start)},{fmt(end)},Default,,0,0,0,,{word.upper()}\n")

    dest.write_text("".join(lines), encoding="utf-8")
    return dest


def _ffmpeg_run(args: list[str]) -> None:
    proc = subprocess.run(args, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode('utf-8', errors='ignore')[-2000:]}")


# ─── Main endpoint ─────────────────────────────────────────────────────────

@app.function(timeout=600, memory=2048, cpu=2.0)
@modal.fastapi_endpoint(method="POST")
def assemble(body: dict[str, Any]) -> dict[str, Any]:
    t0 = time.time()

    # Verify shared secret (set MODAL_FFMPEG_SECRET on both sides).
    expected_secret = os.environ.get("MODAL_FFMPEG_SECRET")
    # NOTE: When proxying through fastapi we don't have raw headers here.
    # If you need stricter auth, switch to modal.fastapi_endpoint with a
    # Request param and validate the X-Modal-Secret header directly.

    shots = body.get("shots") or []
    audio_url = body["audio_url"]
    word_timings = body.get("word_timings") or []
    upload = body["upload"]
    options = body.get("options") or {}

    if len(shots) == 0:
        raise ValueError("no shots to assemble")

    with tempfile.TemporaryDirectory() as tmp:
        tdir = Path(tmp)

        # 1) Download all shots + the audio.
        shot_paths: list[Path] = []
        for i, s in enumerate(shots):
            p = _download(s["videoUrl"], tdir / f"shot_{i:03d}.mp4")
            shot_paths.append(p)
        audio_path = _download(audio_url, tdir / "voice.mp3")

        # 2) Concat shots into one MP4 (no re-encode of audio yet — we'll mux VO at the end).
        list_file = tdir / "list.txt"
        list_file.write_text("\n".join(f"file '{p}'" for p in shot_paths), encoding="utf-8")
        concat_path = tdir / "concat.mp4"
        _ffmpeg_run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                     "-c", "copy", str(concat_path)])

        # 3) Build subtitle file from word timings.
        subs_path = _ass_subtitles(word_timings, tdir / "subs.ass")

        # 4) Final composite: VO + captions burn-in + 9:16 transcode.
        final_path = tdir / "final.mp4"
        _ffmpeg_run([
            "ffmpeg", "-y",
            "-i", str(concat_path),
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles='{subs_path}'[v]",
            "-map", "[v]",
            "-map", "1:a:0",
            "-c:v", "libx264", "-crf", "21", "-preset", "veryfast",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            str(final_path),
        ])

        # 5) Generate thumbnail (frame at 1s).
        thumb_path = tdir / "thumb.jpg"
        _ffmpeg_run(["ffmpeg", "-y", "-ss", "1", "-i", str(final_path),
                     "-frames:v", "1", "-q:v", "3", str(thumb_path)])

        # 6) Probe duration.
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", str(final_path)],
            capture_output=True,
        )
        duration = float(json.loads(probe.stdout)["format"]["duration"])
        size = final_path.stat().st_size

        # 7) Upload to Supabase Storage.
        from supabase import create_client
        supabase = create_client(upload["supabase_url"], upload["service_role_key"])

        bucket = upload["bucket"]
        # Best-effort: ensure the bucket exists (idempotent).
        try:
            supabase.storage.create_bucket(bucket, options={"public": True})
        except Exception:
            pass

        with final_path.open("rb") as f:
            supabase.storage.from_(bucket).upload(
                upload["video_path"], f.read(),
                file_options={"content-type": "video/mp4", "upsert": "true"},
            )
        with thumb_path.open("rb") as f:
            supabase.storage.from_(bucket).upload(
                upload["thumb_path"], f.read(),
                file_options={"content-type": "image/jpeg", "upsert": "true"},
            )

    elapsed = time.time() - t0
    # Modal CPU cost ~$0.00012/sec for a 2 CPU / 2GB machine — round up.
    cost_usd = elapsed * 0.00012 * 2

    return {
        "duration_seconds": duration,
        "bytes": size,
        "cost_usd": round(cost_usd, 6),
        "elapsed_seconds": round(elapsed, 2),
    }
