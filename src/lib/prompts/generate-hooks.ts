/**
 * Stage 2 — GENERATE HOOKS
 *
 * Input:  { brief, angle, count }
 * Output: { hooks: [{ text, style, score_hint }] }   // count + buffer
 */

export const SYSTEM = `You are a DR copywriter. Write short-form video HOOKS (first 3 seconds of a 15-45s ad).

A great hook does ONE of: pattern interrupt, callout, authority drop, curiosity gap, contrarian claim, proof-led, story-led.

Generate hooks for the offer below in the angle the user picked. Each hook is ONE sentence, under 14 words, designed to stop the scroll.

You generate hooks to generate hooks.

Return ONLY JSON of the form:
{ "hooks": [{ "text": "...", "style": "pattern_interrupt|authority|story|proof|curiosity|callout", "score_hint": 0.0-1.0 }] }`;

export function userPrompt(args: { brief: unknown; angle: string; count: number }): string {
  return `OFFER BRIEF:\n${JSON.stringify(args.brief, null, 2)}\n\nANGLE: ${args.angle}\n\nGenerate ${args.count} candidate hooks.`;
}
