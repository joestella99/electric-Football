import assert from 'node:assert/strict';
import test from 'node:test';
import { distance, segmentClearance, scoreLane, passingLanes } from '../src/logic/passing.ts';
import { makeLineup, makeOpponents, clampToPitch } from '../src/data/football.ts';

test('all formations have eleven unique numbered players', () => {
  for (const formation of ['4-3-3', '4-2-3-1', '3-5-2']) {
    const players = makeLineup(formation);
    assert.equal(players.length, 11);
    assert.equal(new Set(players.map(p => p.id)).size, 11);
  }
});

test('squared projection yields correct clearance', () => {
  assert.equal(segmentClearance({ x: 2, z: 3 }, { x: 0, z: 0 }, { x: 4, z: 0 }), 3);
  assert.equal(segmentClearance({ x: 9, z: 0 }, { x: 0, z: 0 }, { x: 4, z: 0 }), 5);
  assert.equal(distance({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
});

test('opponent in passing channel penalizes the lane', () => {
  const from = { x: 0, z: 20 };
  const to = { x: 0, z: -5 };
  const clear = scoreLane(from, to, []);
  const blocked = scoreLane(from, to, [{ id: 7, name: 'Blocker', role: 'CB', point: { x: 0, z: 5 } }]);
  assert.ok(blocked.score < clear.score);
  assert.equal(blocked.clearance, 0);
});

test('passing lanes exclude self and are sorted by score', () => {
  const players = makeLineup('4-3-3');
  const selected = players.find(p => p.id === 8);
  const lanes = passingLanes(selected, players, makeOpponents('low-block'));
  assert.equal(lanes.length, 10);
  assert.ok(lanes.every(l => l.receiver.id !== selected.id));
  assert.ok(lanes.every((l, i) => i === 0 || lanes[i - 1].score >= l.score));
  assert.ok(lanes.every(l => l.score >= 4 && l.score <= 98));
});

test('pitch clamp maintains playable bounds', () => {
  assert.deepEqual(clampToPitch({ x: 200, z: -200 }), { x: 21.5, z: -33.5 });
  assert.deepEqual(clampToPitch({ x: 4, z: 8 }), { x: 4, z: 8 });
});
