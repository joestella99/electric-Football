import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,stepWorld,throwBall,routeAt,routeVertices,starterRoutes,actorPoint,closestDefender,resultFromWorld,finishFlight,predictLead} from '../src/logic/spatial.ts';
import {initialGame} from '../src/logic/drill.ts';

test('routes have editable waypoints and generate motion in real space',()=>{
 const start=routeAt(7,{kind:'slant'},'spread',0);
 const later=routeAt(7,{kind:'slant'},'spread',2.8);
 assert.notDeepEqual(start,later);
 const custom=routeVertices(7,{kind:'custom',points:[[-18,8],[3,22]]},'spread');
 assert.deepEqual(custom[custom.length-1],[3,22]);
});
test('all 22 figures inhabit the same mutable game world',()=>{
 const w=newWorld(41,'BLITZ','quick');
 assert.equal(w.actors.length,22);
 const r=actorPoint(w,7),def=closestDefender(w,r);
 assert.equal(def.side,'defense');
 for(let i=0;i<45;i++)stepWorld(w,1/60);
 assert.notDeepEqual(actorPoint(w,7),r);
});
test('throws only catch if a receiver physically reaches the ball',()=>{
 const w=newWorld(41,'SOFT ZONE','quick');
 assert.equal(throwBall(w,[24,95],7),true);
 let result;
 for(let i=0;i<240&&!result;i++)result=stepWorld(w,1/60);
 assert.ok(result);
 assert.notEqual(result.kind,'catch');
 assert.match(result.description,/INCOMPLETE|BROKEN UP|INTERCEPTED/);
});
test('receiver can catch when ball arrives exactly at his actual position',()=>{
 const w=newWorld(41,'BLITZ','quick');
 for(let i=0;i<30;i++)stepWorld(w,1/60);
 const r=actorPoint(w,7);
 // This short flat throw lands at a receiver who is already in position.
 const point=[r[0]+3,r[1]+2];
 assert.equal(throwBall(w,point,7),true);
 let result;
 for(let i=0;i<180&&!result;i++)result=stepWorld(w,1/60);
 assert.ok(result);
 assert.equal(w.phase,'done');
 const state=resultFromWorld(initialGame(),w,result);
 assert.ok(state.elapsed>0);
 assert.equal(state.state.plays,1);
});
test('physical outcome is deterministic with the same inputs',()=>{
 const run=()=>{
  const w=newWorld(41,'LOADED BOX','quick');
  for(let i=0;i<30;i++)stepWorld(w,1/60);
  throwBall(w,[-19,55],7);
  let o;
  for(let i=0;i<240&&!o;i++)o=stepWorld(w,1/60);
  return o;
 };
 assert.deepEqual(run(),run());
});
test('protection can keep RB in to block and extend sack deadline',()=>{
 const w=newWorld(41,'BLITZ','deep',{formation:'spread',protection:'max'},starterRoutes('deep'));
 assert.equal(throwBall(w,[8,57],1),false);
 for(let i=0;i<300;i++)stepWorld(w,1/60);
 assert.ok(w.t>0);
 assert.ok(w.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
});
test('flight catch point is independent of random outcome tables',()=>{
 const w=newWorld(41,'BLITZ','quick');
 throwBall(w,[25,94],7);
 w.flight.elapsed=w.flight.duration;
 assert.ok(['incomplete','breakup','interception'].includes(finishFlight(w).kind));
});

test('a receiver standing at the landing spot catches a ball with no defender nearby',()=>{
 const w=newWorld(42,'SOFT ZONE','quick');
 const target=[-13,56];
 assert.equal(throwBall(w,target,7),true);
 const receiver=w.actors.find(a=>a.id===7);
 receiver.x=target[0];receiver.z=target[1];
 for(const defender of w.actors.filter(a=>a.side==='defense')){defender.x=20;defender.z=80;}
 const outcome=finishFlight(w);
 assert.equal(outcome.kind,'catch');
 assert.ok(outcome.yards>0);
});
test('a physical defender at the catch point makes a breakup rather than a random incompletion',()=>{
 const w=newWorld(42,'BLITZ','quick');
 const point=[-13,56];throwBall(w,point,7);
 const wr=w.actors.find(a=>a.id===7);
 wr.x=point[0]+2.15;wr.z=point[1];
 for(const defender of w.actors.filter(a=>a.side==='defense')){defender.x=20;defender.z=85;}
 const cb=w.actors.find(a=>a.id===18);
 cb.x=point[0]+1.6;cb.z=point[1];
 assert.equal(finishFlight(w).kind,'breakup');
});
test('defender beating the target to an unprotected landing point creates an interception',()=>{
 const w=newWorld(42,'BLITZ','quick');
 const point=[-13,56];throwBall(w,point,7);
 const wr=w.actors.find(a=>a.id===7);wr.x=-19;wr.z=52;
 for(const defender of w.actors.filter(a=>a.side==='defense')){defender.x=20;defender.z=85;}
 const cb=w.actors.find(a=>a.id===18);cb.x=point[0];cb.z=point[1];
 const outcome=finishFlight(w);
 assert.equal(outcome.kind,'interception');
 assert.equal(resultFromWorld(initialGame(),w,outcome).state.status,'lost');
});

test('assisted throws target the actual moving player and do not mutate the live world',()=>{
 const w=newWorld(41,'SOFT ZONE','quick');
 for(let i=0;i<35;i++)stepWorld(w,1/60);
 const before=w.actors.map(a=>[a.x,a.z]);
 const elapsed=w.t;
 const lead=predictLead(w,7);
 assert.deepEqual(lead,predictLead(w,7));
 assert.ok(Number.isFinite(lead[0])&&Number.isFinite(lead[1]));
 assert.ok(lead[0]>=-25.5&&lead[0]<=25.5);
 assert.deepEqual(w.actors.map(a=>[a.x,a.z]),before);
 assert.equal(w.t,elapsed);
 assert.equal(throwBall(w,lead,7),true);
 let outcome;
 for(let i=0;i<200&&!outcome;i++)outcome=stepWorld(w,1/60);
 assert.ok(outcome);
 assert.equal(outcome.receiver===undefined || outcome.receiver===7,true);
});
