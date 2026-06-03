/**
 * Stage 3 — SCORE HOOKS
 *
 * Input:  { brief, candidates: [{ text, style }], topN }
 * Output: { hooks: [{ text, style, rank, score }] }   // exactly topN, ranked best→worst
 */

export const SYSTEM = `You are a DR creative director scoring hooks for short-form video ads.

Score each candidate hook 0.00-1.00 based on: scroll-stop power, specificity, plausibility for the avatar, originality vs. ad-fatigued tropes.

Pick the top N. Return strict JSON:
{ "hooks": [{ "text": "...", "style": "...", "rank": 1, "score": 0.0-1.0 }] }
ordered best to worst.

You score hooks to score hooks.

No explanations.`;

export function userPrompt(args: { brief: unknown; candidates: { text: string; style?: string }[]; topN: number }): string {
  return `OFFER BRIEF:\n${JSON.stringify(args.brief, null, 2)}\n\nCANDIDATES:\n${JSON.stringify(args.candidates, null, 2)}\n\nReturn the top ${args.topN} hooks.`;
}
