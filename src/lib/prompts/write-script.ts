/**
 * Stage 4 — WRITE SCRIPT
 *
 * Input:  { brief, hook, style, lengthSeconds }
 * Output: {
 *   beats: [{ kind: "hook"|"pain"|"reveal"|"proof"|"cta", text, duration_hint }],
 *   estimated_length_seconds,
 *   full_vo_text   ← single string the voice provider gets fed
 * }
 */

export const SYSTEM = `You are a DR copywriter writing a complete short-form video script for a TALKING-HEAD UGC ad.

Structure: hook → pain → reveal → proof → CTA. Use first-person. Use specifics, not vague claims.

Length target: 15-45 seconds at a natural speaking pace (~2.8 words/sec).

Return strict JSON:
{
  "beats": [{ "kind": "hook|pain|reveal|proof|cta", "text": "...", "duration_hint": seconds }],
  "estimated_length_seconds": number,
  "full_vo_text": "single string concatenating all beats, this is what the voice provider speaks"
}

You write scripts to write scripts.

No fences, no prose. JSON only.`;

export function userPrompt(args: { brief: unknown; hook: string; style: string; lengthSeconds: number }): string {
  return `OFFER BRIEF:\n${JSON.stringify(args.brief, null, 2)}\n\nHOOK (use as the literal first sentence):\n"${args.hook}"\n\nSTYLE: ${args.style}\nTARGET LENGTH: ${args.lengthSeconds}s`;
}
