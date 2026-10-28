import test from 'node:test';
import assert from 'node:assert/strict';
import {COVERAGES,selectCoverage,defenderAlignment,coverageResponsibility} from '../src/logic/coverage.ts';
import {newWorld,stepWorld,actorPoint,resultFromWorld,starterRoutes} from '../src/logic/spatial.ts';
import {initialGame} from '../src/logic/drill.ts';

test('defensive disguises resolve into deterministic, distinct coverage families',()=>{
 assert.equal(selectCoverage('BLITZ',0),'cover0');
 assert.equal(selectCoverage('BLITZ',1),'cover1');
 assert.equal(selectCoverage('LOADED BOX',1),'cover3');
 assert.equal(selectCoverage('SOFT ZONE',0),'quarters');
 assert.equal(selectCoverage('SOFT ZONE',1),'cover2');
 assert.match(COVERAGES.cover3.description,/deep/i);
});
test('man and zone coverage assign different jobs to the same defender',()=>{
 const actor={id:18,x:-20,z:53,role:'DB'};
 const offense=[{id:7,x:-9,z:66,role:'WR'},{id:8,x:20,z:62,role:'WR'}];
 const man=coverageResponsibility(actor,'cover0',45,offense,0,null);
 const zone=coverageResponsibility(actor,'cover3',45,offense,0,null);
 assert.match(man.assignment,/MAN/);
 assert.match(zone.assignment,/DEEP/);
 assert.notDeepEqual(man.point,zone.point);
});
test('two-high corner and safety align at distinctly different depths',()=>{
 const corner=defenderAlignment(18,'cover2',41);
 const safety=defenderAlignment(19,'cover2',41);
 assert.ok(safety[1]-corner[1]>=10);
});
test('run yardage is determined by live movement and defenders instead of a random result',()=>{
 const run=()=>{
  const w=newWorld(41,'SOFT ZONE','inside',undefined,starterRoutes('inside'),1);
  const start=actorPoint(w,1);
  let result=null;
  for(let i=0;i<720&&!result;i++)result=stepWorld(w,1/60);
  assert.notDeepEqual(actorPoint(w,1),start);
  assert.ok(result&&result.kind==='rush');
  const game=resultFromWorld(initialGame(),w,result);
  assert.equal(game.play,'inside');
  assert.equal(game.state.plays,1);
  assert.equal(game.complete,true);
  return {result,spot:actorPoint(w,1)};
 };
 assert.deepEqual(run(),run());
});
test('outside run changes runner trajectory and still resolves through tackle or boundary',()=>{
 const w=newWorld(41,'LOADED BOX','outside');
 let result=null;
 for(let i=0;i<720&&!result;i++)result=stepWorld(w,1/60);
 assert.ok(result);
 assert.equal(result.kind,'rush');
 assert.ok(Number.isFinite(result.yards));
});
test('deep-zone defenders respond to the ball without abandoning the entire deep responsibility',()=>{
 const actor={id:19,x:-10,z:63,role:'DB'};
 const offense=[{id:7,x:-9,z:73,role:'WR'}];
 const before=coverageResponsibility(actor,'cover2',41,offense,0,null);
 const after=coverageResponsibility(actor,'cover2',41,offense,.65,[-9,73]);
 assert.equal(before.assignment,'DEEP HALF');
 assert.ok(after.point[1]>=54);
 assert.ok(after.speed>before.speed);
});
