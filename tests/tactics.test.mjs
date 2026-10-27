import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, simulate } from '../src/logic/drill.ts';
import { DEFAULT_CALL, FORMATIONS, PROTECTIONS, isEligible, matchingBonus, presnapRead, protectionTime, routeStartingX } from '../src/logic/tactics.ts';
import { pressureLimit, receiverPoint, resolveThrow, coveragePoint } from '../src/logic/throwing.ts';

test('every scheme has a working pre-snap option',()=>{
  assert.equal(FORMATIONS.length,3);
  assert.equal(PROTECTIONS.length,3);
  for(const formation of FORMATIONS) assert.notEqual(routeStartingX(10,formation.id),undefined);
  assert.match(presnapRead('SOFT ZONE').shell,/TWO-HIGH/);
});
test('moving from spread to trips changes offensive spacing and routes',()=>{
  const spread=receiverPoint(10,'quick',41,0,'spread');
  const trips=receiverPoint(10,'quick',41,0,'trips');
  assert.notEqual(spread[0],trips[0]);
  assert.deepEqual(receiverPoint(7,'quick',41,2),receiverPoint(7,'quick',41,2,DEFAULT_CALL.formation));
});
test('max protection grants pocket time but sacrifices the RB route',()=>{
  const base=pressureLimit('BLITZ','base');
  assert.ok(protectionTime('BLITZ','max')>base);
  assert.ok(protectionTime('BLITZ','slide')>base);
  assert.equal(isEligible(1,{formation:'spread',protection:'max'}),false);
  assert.equal(isEligible(7,{formation:'spread',protection:'max'}),true);
});
test('coverage adjusts to offensive concept instead of being static',()=>{
  assert.notDeepEqual(coveragePoint(1,'BLITZ',45,3,'quick'),coveragePoint(1,'BLITZ',45,3,'deep'));
});
test('high-pressure throwing gains time under max protect and respects eligibility',()=>{
  const s={...initialGame(),defense:'BLITZ'};
  const snap=6.1;
  const standard=resolveThrow(s,'quick','hurry',7,receiverPoint(7,'quick',s.yard,snap+1),snap,()=>.5);
  assert.ok(standard.yards<0);
  const max=resolveThrow(s,'quick','hurry',7,receiverPoint(7,'quick',s.yard,snap+1),snap,()=>.5,{formation:'spread',protection:'max'});
  assert.notEqual(max.description,standard.description);
  assert.throws(()=>resolveThrow(s,'quick','hurry',1,[5,60],1,()=>.5,{formation:'spread',protection:'max'}),/protection/);
});
test('run calls also react to offensive formation',()=>{
  const s={...initialGame(),defense:'LOADED BOX'};
  const baseline=simulate(s,'outside','hurry',()=>.55,{formation:'spread',protection:'base'});
  const trips=simulate(s,'outside','hurry',()=>.55,{formation:'trips',protection:'base'});
  assert.ok(trips.yards>baseline.yards);
  assert.ok(matchingBonus('quick','BLITZ',{formation:'bunch',protection:'base'})>0);
});
