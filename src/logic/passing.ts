import type { Player, Point2 } from '../data/football';

export type Lane = {
  receiver: Player;
  score: number;
  distance: number;
  clearance: number;
  forwardMeters: number;
};

export const distance = (a: Point2, b: Point2): number =>
  Math.hypot(b.x - a.x, b.z - a.z);

// Minimum 2D distance from a defender to a segment between passer and receiver.
export function segmentClearance(defender: Point2, from: Point2, to: Point2): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const squared = dx * dx + dz * dz;
  if (squared < 1e-9) return distance(defender, from);
  const t = Math.min(1, Math.max(0,
    ((defender.x - from.x) * dx + (defender.z - from.z) * dz) / squared,
  ));
  return distance(defender, { x: from.x + t * dx, z: from.z + t * dz });
}

// An illustrative spatial heuristic, NOT a trained pass-completion model.
// Combines length, vertical progression, and distance from nearby defenders.
export function scoreLane(from: Point2, to: Point2, opponents: Player[]): Omit<Lane, 'receiver'> {
  const travel = distance(from, to);
  const clearance = opponents.length
    ? Math.min(...opponents.map((p) => segmentClearance(p.point, from, to)))
    : 20;
  const forwardMeters = from.z - to.z; // Attacking the goal at z=-35.
  const distancePenalty = Math.max(0, travel - 7) * 0.73;
  const defenderPenalty = Math.max(0, 7 - clearance) * 7.8;
  const progressionBonus = Math.max(-9, Math.min(13, forwardMeters * 0.30));
  const score = Math.round(Math.min(98, Math.max(4,
    83 - distancePenalty - defenderPenalty + progressionBonus,
  )));
  return {
    score,
    // Render coordinates are normalized: 1 scene unit ~= 1.5 metres.
    distance: Math.round(travel * 15) / 10,
    clearance: Math.round(clearance * 15) / 10,
    forwardMeters: Math.round(forwardMeters * 15) / 10,
  };
}

export function passingLanes(selected: Player, teammates: Player[], opponents: Player[]): Lane[] {
  return teammates
    .filter((p) => p.id !== selected.id)
    .map((receiver) => ({ receiver, ...scoreLane(selected.point, receiver.point, opponents) }))
    .sort((a, b) => b.score - a.score);
}
