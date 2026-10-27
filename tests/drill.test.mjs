import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, simulate, useTimeout, fieldSpot, formatClock, kickDistance } from '../src/logic/drill.ts';
import { RECEIVERS, receiverPoint, resolveThrow, resolveSack, pressureLimit } from '../src/logic/throwing.ts';
test('starting a comeback includes the correct two-minute clock',()=>{
  const s=initialGame();assert.equal(s.seconds,106);assert.equal(s.ours,24);assert.equal(s.theirs,27);
  assert.equal(formatClock(s.seconds),'1:46');assert.equal(fieldSpot(s.yard),'OWN 41');assert.equal(kickDistance(s.yard),76);
});
test('routes move off the line and remain within the field',()=>{
  const state=initialGame();
  for(const r of RECEIVERS){
    const atZero=receiverPoint(r.id,'quick',state.yard,0);
    const late=receiverPoint(r.id,'quick',state.yard,2);
    assert.notDeepEqual(atZero,late);
    assert.ok(late[0]<=25.4&&late[0]>=-25.4);
    assert.ok(late[1]<=99&&late[1]>=1);
  }
});
test('properly led receiver can make an interactive throw',()=>{
  const s=initialGame();const lead=receiverPoint(7,'quick',s.yard,2.15);
  const r=resolveThrow(s,'quick','hurry',7,lead,1.4,()=>.2);
  assert.equal(r.complete,true);assert.ok(r.yards>0);assert.equal(r.state.plays,1);assert.ok(r.state.seconds<s.seconds);
});
test('throw far away from the receiver is incomplete',()=>{
  const s=initialGame();const r=resolveThrow(s,'quick','hurry',7,[25,99],1.5,()=>.6);
  assert.equal(r.complete,false);assert.equal(r.yards,0);assert.equal(r.state.clockRunning,false);
});
test('late throw suffers a sack with lost yards',()=>{
  const s=initialGame();const r=resolveThrow(s,'quick','hurry',8,[3,65],pressureLimit(s.defense),()=>.5);
  assert.ok(r.yards<0);assert.equal(r.grade,'D');assert.equal(r.state.clockRunning,true);
});
test('time-out only works while game clock runs',()=>{
  const s=initialGame();assert.equal(useTimeout(s).timeouts,s.timeouts);
  const run={...s,clockRunning:true};const next=useTimeout(run);
  assert.equal(next.timeouts,s.timeouts-1);assert.equal(next.clockRunning,false);
});
test('a spike uses a down and kills the clock',()=>{
  const s={...initialGame(),clockRunning:true};
  const result=simulate(s,'spike','hurry',()=>.5);
  assert.equal(result.state.clockRunning,false);assert.equal(result.state.down,s.down+1);
  assert.ok(result.state.seconds<s.seconds);
});
test('pressure window shrinks for a blitz',()=>{
  assert.ok(pressureLimit('BLITZ')<pressureLimit('SOFT ZONE'));
});
test('sack resolver creates terminal state on failed fourth down',()=>{
  const s={...initialGame(),down:4};
  const result=resolveSack(s,'hurry',4,()=>.4);
  assert.equal(result.state.status,'lost');assert.equal(result.turnover,false);
});
