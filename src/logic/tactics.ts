import type { Defense, GameState, PlayId } from './drill.ts';

export type Formation = 'spread' | 'trips' | 'bunch';
export type Protection = 'base' | 'max' | 'slide';
export type TacticalCall = { formation: Formation; protection: Protection };
export const DEFAULT_CALL: TacticalCall = { formation: 'spread', protection: 'base' };

export const FORMATIONS: { id: Formation; name: string; detail: string }[] = [
  { id: 'spread', name: '2×2 SPREAD', detail: 'Wide spacing. Isolate coverage.' },
  { id: 'trips', name: 'TRIPS RIGHT', detail: 'Flood the right side. Stress zone rules.' },
  { id: 'bunch', name: 'BUNCH LEFT', detail: 'Condensed split. Rub and cross.' }
];
export const PROTECTIONS: { id: Protection; name: string; detail: string }[] = [
  { id: 'base', name: '5-MAN', detail: 'All five targets available.' },
  { id: 'max', name: 'MAX PROTECT', detail: 'RB stays in to block. More pocket time.' },
  { id: 'slide', name: 'SLIDE', detail: 'Shift protection toward pressure.' }
];
export const isEligible = (id: number, call: TacticalCall) => !(call.protection === 'max' && id === 1);

/** Informed pre-snap cues, not perfect post-snap knowledge. */
export function presnapRead(defense: Defense) {
  if (defense === 'BLITZ') return { shell: 'SINGLE-HIGH LOOK', cue: 'EDGE PRESSURE SHOWING', advice: 'Quick game or extra protection', intensity: 'HIGH' };
  if (defense === 'LOADED BOX') return { shell: 'HEAVY FRONT', cue: 'EIGHT NEAR THE BOX', advice: 'Attack the flats or space outside', intensity: 'MED' };
  return { shell: 'TWO-HIGH SHELL', cue: 'CORNERS PLAYING OFF', advice: 'Take underneath space, work the sideline', intensity: 'LOW' };
}
export function protectionTime(defense: Defense, protection: Protection): number {
  const base = defense === 'BLITZ' ? 5.8 : defense === 'LOADED BOX' ? 7 : 8.2;
  if (protection === 'max') return base + (defense === 'BLITZ' ? 2.2 : 1.5);
  if (protection === 'slide') return base + (defense === 'BLITZ' ? 1.1 : .5);
  return base;
}
export function routeStartingX(id: number, formation: Formation): number {
  const spread: Record<number, number> = { 7: -22, 8: 22, 9: 13.3, 10: -14.4, 1: 3.3 };
  const trips: Record<number, number> = { 7: -22, 8: 22, 9: 13.5, 10: 18, 1: 3.3 };
  const bunch: Record<number, number> = { 7: -20, 8: 21, 9: -14.2, 10: -17.5, 1: 3.3 };
  return (formation === 'spread' ? spread : formation === 'trips' ? trips : bunch)[id] ?? 0;
}
export function matchingBonus(play: PlayId, defense: Defense, call: TacticalCall): number {
  // Small, explainable matchup differences. All are arcade heuristics.
  let bonus = 0;
  if (call.formation === 'trips' && defense === 'SOFT ZONE' && (play === 'sideline' || play === 'screen')) bonus += .09;
  if (call.formation === 'bunch' && defense === 'BLITZ' && play === 'quick') bonus += .11;
  if (call.formation === 'spread' && defense === 'LOADED BOX' && play === 'outside') bonus += .08;
  if (call.protection === 'max' && play === 'deep') bonus += .04;
  return bonus;
}
export function coachingCue(s: GameState, play: PlayId, call: TacticalCall): string {
  const read = presnapRead(s.defense);
  if (s.seconds <= 23 && !s.clockRunning && s.yard >= 63 && s.ours >= s.theirs - 3) return 'KICK RANGE. YOU CAN TAKE THE POINTS.';
  if (s.clockRunning && s.seconds <= 28) return 'CLOCK RUNNING. HURRY TO THE LINE OR USE A TIMEOUT.';
  if (s.down >= 3 && s.toGo >= 8) return 'LONG YARDAGE. PROTECT THE POCKET AND FIND THE STICKS.';
  if (call.protection === 'max') return 'SIX IN PROTECTION. THE RB IS STAYING HOME.';
  if (play === 'inside' && s.defense === 'LOADED BOX') return 'CROWDED BOX. AN AUDIBLE COULD CREATE SPACE.';
  return read.advice.toUpperCase()+'.';
}
