import { DEFAULT_CALL, matchingBonus, type TacticalCall } from './tactics.ts';

export type PlayId = 'inside' | 'outside' | 'quick' | 'sideline' | 'deep' | 'screen' | 'spike' | 'fieldgoal';
export type Defense = 'BLITZ' | 'LOADED BOX' | 'SOFT ZONE';
export type Tempo = 'hurry' | 'huddle';
export type Status = 'playing' | 'won' | 'tied' | 'lost';

export interface GameState {
  seconds: number;
  down: number;
  toGo: number;
  yard: number;
  ours: number;
  theirs: number;
  timeouts: number;
  clockRunning: boolean;
  defense: Defense;
  status: Status;
  message: string;
  plays: number;
}
export interface Result {
  state: GameState;
  description: string;
  yards: number;
  elapsed: number;
  complete: boolean;
  outOfBounds: boolean;
  turnover: boolean;
  grade: 'A' | 'B' | 'C' | 'D';
  play: PlayId;
}
export interface Scenario {
  id: string;
  label: string;
  detail: string;
  initial: GameState;
}

const base: GameState = {
  seconds: 106, down: 2, toGo: 7, yard: 41, ours: 24, theirs: 27,
  timeouts: 2, clockRunning: false, defense: 'SOFT ZONE',
  status: 'playing', message: 'One last drive. Make it count.', plays: 0
};

export const SCENARIOS: Scenario[] = [
  { id: 'the-comeback', label: 'THE COMEBACK', detail: 'Down 3 · 1:46 remaining', initial: { ...base } },
  { id: 'touchdown-or-bust', label: 'TD OR BUST', detail: 'Down 6 · :58 remaining', initial: { ...base, seconds: 58, yard: 36, down: 1, toGo: 10, ours: 21, theirs: 27, timeouts: 1, defense: 'BLITZ' } },
  { id: 'walk-off', label: 'THE WALK-OFF', detail: 'Tie game · :42 remaining', initial: { ...base, seconds: 42, yard: 59, down: 2, toGo: 4, ours: 20, theirs: 20, timeouts: 1, defense: 'LOADED BOX' } },
];

export const PLAYS: { id: PlayId; name: string; tag: string; description: string }[] = [
  { id: 'quick', name: 'QUICK SLANTS', tag: 'PASS · 3–10 YDS', description: 'Fast release. Beats a blitz.' },
  { id: 'sideline', name: 'SIDELINE OUT', tag: 'PASS · 6–16 YDS', description: 'Attack the boundary. Stop the clock.' },
  { id: 'deep', name: 'FOUR VERTICALS', tag: 'PASS · 15–35 YDS', description: 'Big play potential. Big risk.' },
  { id: 'screen', name: 'RB SCREEN', tag: 'PASS · 1–18 YDS', description: 'Let the pass rush come to you.' },
  { id: 'inside', name: 'DIVE RIGHT', tag: 'RUN · 1–7 YDS', description: 'Exploit a soft defensive front.' },
  { id: 'outside', name: 'JET SWEEP', tag: 'RUN · 0–14 YDS', description: 'Beat a crowded box outside.' },
];

const cap = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
export const formatClock = (seconds: number) => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
export const fieldSpot = (yard: number) => yard >= 50 ? 'OPP ' + (100 - yard) : 'OWN ' + yard;
export const kickDistance = (yard: number) => 117 - yard;
export const initialGame = (scenario = SCENARIOS[0]): GameState => ({ ...scenario.initial });
export const nextDefense = (random: () => number): Defense => {
  const v = random();
  return v < .29 ? 'BLITZ' : v < .59 ? 'LOADED BOX' : 'SOFT ZONE';
};

export function useTimeout(s: GameState): GameState {
  if (s.status !== 'playing' || s.timeouts < 1 || !s.clockRunning) return s;
  return { ...s, timeouts: s.timeouts - 1, clockRunning: false, message: 'TIMEOUT. Clock stopped.' };
}

function selectionGrade(play: PlayId, state: GameState): Result['grade'] {
  if (play === 'spike') return state.clockRunning && state.seconds < 35 ? 'A' : 'C';
  if (play === 'fieldgoal') return kickDistance(state.yard) <= 45 && state.ours >= state.theirs - 3 ? 'A' : 'C';
  const ideal = state.defense === 'BLITZ' ? ['quick', 'screen', 'sideline'] :
    state.defense === 'LOADED BOX' ? ['outside', 'quick', 'deep'] : ['inside', 'sideline', 'quick'];
  if (ideal[0] === play) return 'A';
  if (ideal.includes(play)) return 'B';
  return play === 'deep' && state.seconds < 20 ? 'B' : 'C';
}

/**
 * Original arcade resolution model, not a historical NFL-data predictor.
 * Inject random() for repeatable tests. Clock only advances on calls, not while browsing the playbook.
 */
export function simulate(s: GameState, play: PlayId, tempo: Tempo, random: () => number = Math.random, call: TacticalCall = DEFAULT_CALL): Result {
  if (s.status !== 'playing') throw new Error('Drive has ended');
  const grade = selectionGrade(play, s);
  const setup = s.clockRunning ? (tempo === 'hurry' ? 7 : 16) : 0;
  const out = (description: string, yards: number, elapsed: number, complete: boolean, bounds: boolean, turnover: boolean, state: GameState): Result =>
    ({ description, yards, elapsed, complete, outOfBounds: bounds, turnover, grade, play, state: { ...state, plays: s.plays + 1, message: description } });
  if (setup >= s.seconds) {
    const state = { ...s, seconds: 0, status: 'lost' as Status };
    return out('TIME EXPIRES BEFORE THE SNAP.', 0, s.seconds, false, false, false, state);
  }
  const timeLeft = s.seconds - setup;
  if (play === 'spike') {
    const remaining = Math.max(0, timeLeft - 1);
    const down = s.down + 1;
    const state: GameState = { ...s, seconds: remaining, clockRunning: false, down, status: remaining === 0 || down > 4 ? 'lost' : 'playing' };
    return out('SPIKE! Clock stopped. Down lost.', 0, setup + 1, false, false, false, state);
  }
  if (play === 'fieldgoal') {
    const distance = kickDistance(s.yard);
    const chance = cap(.96 - Math.max(0, distance - 28) * .018, .08, .98);
    const made = random() < chance;
    const remaining = Math.max(0, timeLeft - 5);
    const ours = s.ours + (made ? 3 : 0);
    const state: GameState = { ...s, ours, seconds: remaining, clockRunning: false, status: made ? (ours > s.theirs ? 'won' : ours === s.theirs ? 'tied' : 'lost') : 'lost' };
    return out(made ? 'IT IS GOOD! ' + distance + '-YARD FIELD GOAL.' : 'NO GOOD! ' + distance + '-YARD ATTEMPT.', 0, setup + 5, made, false, !made, state);
  }
  const pass = ['quick', 'sideline', 'deep', 'screen'].includes(play);
  const blitz = s.defense === 'BLITZ';
  const loaded = s.defense === 'LOADED BOX';
  const soft = s.defense === 'SOFT ZONE';
  const turnoverRate = pass ? (play === 'deep' ? .075 : .029) : .014;
  const intercepted = random() < turnoverRate;
  const chance = play === 'quick' ? .80 : play === 'sideline' ? .68 : play === 'deep' ? .46 : play === 'screen' ? .84 : 1;
  const adj = play === 'quick' && blitz ? .08 : play === 'screen' && blitz ? .10 : play === 'deep' && soft ? -.08 : 0;
  const complete = !intercepted && (!pass || random() < chance + adj);
  let yards = 0;
  let description = '';
  let turnover = intercepted;
  const name = PLAYS.find(p => p.id === play)?.name ?? play.toUpperCase();
  if (intercepted) {
    description = pass ? 'INTERCEPTED! THE DEFENSE TAKES OVER.' : 'FUMBLE! THE BALL IS LOST.';
  } else if (!complete) {
    description = name + '. PASS FALLS INCOMPLETE.';
  } else {
    const roll = random();
    if (play === 'inside') yards = Math.round(-2 + roll * 9 + (soft ? 3 : 0) - (loaded ? 2 : 0) + (call.formation === 'spread' ? 1 : -1));
    else if (play === 'outside') yards = Math.round(-3 + roll * 16 + (loaded ? 2 : 0) + (call.formation === 'trips' ? 2 : 0) + Math.round(matchingBonus(play,s.defense,call)*12));
    else if (play === 'quick') yards = Math.round(3 + roll * 10 + (blitz ? 3 : 0));
    else if (play === 'sideline') yards = Math.round(5 + roll * 15);
    else if (play === 'deep') yards = Math.round(15 + roll * 27 - (soft ? 5 : 0));
    else yards = Math.round(-2 + roll * 19 + (blitz ? 4 : 0));
    description = name + '! ' + (yards >= 0 ? '+' : '') + yards + ' YARDS.';
  }
  const duration = pass ? (complete ? (play === 'deep' ? 7 : 5) : 4) : 6;
  const elapsed = Math.min(s.seconds, setup + duration);
  const remaining = Math.max(0, s.seconds - elapsed);
  const endYard = cap(s.yard + yards, 1, 100);
  const gained = endYard - s.yard;
  const touchdown = complete && endYard >= 100;
  const firstDown = gained >= s.toGo;
  const nextDown = firstDown ? 1 : s.down + 1;
  const toGo = firstDown ? Math.min(10, 100 - endYard) : Math.max(1, s.toGo - gained);
  const outOfBounds = complete && (play === 'sideline' || (play === 'outside' && random() < .55));
  const clockRunning = !pass || complete ? !outOfBounds : false;
  let status: Status = 'playing';
  let ours = s.ours;
  if (touchdown) {
    ours += 7; // automatic PAT in this arcade prototype
    status = ours > s.theirs ? 'won' : 'tied';
    description = 'TOUCHDOWN! YOU FOUND THE END ZONE.';
  } else if (turnover || nextDown > 4) {
    status = 'lost';
    description = turnover ? description : 'TURNOVER ON DOWNS. DRIVE OVER.';
    turnover = true;
  } else if (remaining === 0) {
    status = 'lost';
    description = 'FINAL WHISTLE. ' + description;
  } else if (firstDown) description += ' FIRST DOWN!';
  else if (outOfBounds) description += ' OUT OF BOUNDS.';
  const state: GameState = {
    ...s, seconds: remaining, down: touchdown ? 1 : nextDown,
    toGo: touchdown ? 10 : toGo, yard: endYard, ours, clockRunning,
    status, defense: nextDefense(random)
  };
  return out(description, gained, elapsed, complete, outOfBounds, turnover, state);
}
