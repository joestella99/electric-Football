export type Point2 = { x: number; z: number };
export type Player = {
  id: number;
  name: string;
  role: string;
  point: Point2;
};
export type Formation = '4-3-3' | '4-2-3-1' | '3-5-2';
export type Press = 'low-block' | 'high-press';

const names = [
  'L. Porter', 'O. Hayes', 'J. Silva', 'D. Brooks', 'E. Costa',
  'A. Reed', 'M. Ellis', 'N. Finch', 'S. Clark', 'T. Morgan', 'J. Quinn',
];

type Slot = [number, string, number, number];

const formations: Record<Formation, Slot[]> = {
  '4-3-3': [
    [1, 'GK', 0, 30], [2, 'RB', 17, 17], [3, 'LB', -17, 17],
    [4, 'CB', -7, 20], [5, 'CB', 7, 20], [6, 'CDM', 0, 8],
    [7, 'CM', 12, 1], [8, 'CM', -12, 1], [9, 'ST', 0, -21],
    [10, 'LW', -18, -15], [11, 'RW', 18, -15],
  ],
  '4-2-3-1': [
    [1, 'GK', 0, 30], [2, 'RB', 17, 17], [3, 'LB', -17, 17],
    [4, 'CB', -7, 20], [5, 'CB', 7, 20], [6, 'CDM', -8, 8],
    [7, 'CDM', 8, 8], [8, 'CAM', 0, -7], [9, 'ST', 0, -24],
    [10, 'LW', -18, -12], [11, 'RW', 18, -12],
  ],
  '3-5-2': [
    [1, 'GK', 0, 30], [2, 'RCB', 12, 19], [3, 'LCB', -12, 19],
    [4, 'CB', 0, 22], [5, 'LWB', -20, 0], [6, 'CDM', 0, 9],
    [7, 'RWB', 20, 0], [8, 'CM', -9, -2], [9, 'ST', -7, -21],
    [10, 'CAM', 9, -6], [11, 'ST', 9, -21],
  ],
};

export function makeLineup(formation: Formation): Player[] {
  return formations[formation].map(([id, role, x, z]) => ({
    id, role, name: names[id - 1], point: { x, z },
  }));
}

export function makeOpponents(press: Press): Player[] {
  const low = press === 'low-block';
  const back = low ? -23 : -7;
  const mid = low ? -13 : 7;
  const front = low ? -4 : 19;
  const slots: Slot[] = [
    [1, 'GK', 0, -31], [2, 'RB', 17, back], [3, 'LB', -17, back],
    [4, 'CB', -7, back - 2], [5, 'CB', 7, back - 2],
    [6, 'RM', 18, mid], [7, 'CM', 6, mid - 2], [8, 'CM', -6, mid - 2],
    [9, 'LM', -18, mid], [10, 'ST', -7, front], [11, 'ST', 7, front],
  ];
  return slots.map(([id, role, x, z]) => ({
    id, role, name: `Opponent ${id}`, point: { x, z },
  }));
}

export function clampToPitch(point: Point2): Point2 {
  return {
    x: Math.min(21.5, Math.max(-21.5, point.x)),
    z: Math.min(33.5, Math.max(-33.5, point.z)),
  };
}
