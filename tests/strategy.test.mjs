import test from 'node:test';
import assert from 'node:assert/strict';
import {planDefense,scoutDefense,estimateCallFit,gradeDecision,driveCoachScore} from '../src/logic/strategy.ts';
import {teamPlaybook,practiceGame} from '../src/logic/nfl.ts';
const state=(extra={})=>({...practiceGame('PHI','DAL'),...extra});
const snap=(concept,play)=>({family:play==='inside'||play==='outside'?'RUN':'PASS',concept,play,yards:3,clock:80,down:1,toGo:10,defense:'SOFT ZONE',turnover:false});
test('opponent DC anticipates repeated runs, but does not inspect future selected plays',()=>{
 const g=state({down:2,toGo:2,plays:5});
 const history=[snap('insidezone','inside'),snap('power','inside'),snap('outsidezone','outside')];
 assert.equal(planDefense(g,history),'LOADED BOX');
 const same=history.map(h=>({...h,yards:99}));
 assert.equal(planDefense(g,same),'LOADED BOX');
});
test('defense adjusts to down and distance as well as historical pass trends',()=>{
 assert.equal(planDefense(state({down:4,toGo:8,plays:4}),[]),'BLITZ');
 assert.equal(planDefense(state({down:2,toGo:10,plays:4}),[
  snap('fourverts','deep'),snap('dagger','deep'),snap('mesh','quick'),snap('flood','sideline')
 ]),'SOFT ZONE');
});
test('pre-snap scout reports real declared pressure and player tendencies',()=>{
 const g=state({defense:'BLITZ'});
 const read=scoutDefense(g,[snap('mesh','quick'),snap('flood','sideline')]);
 assert.equal(read.pressure,'HIGH');
 assert.match(read.note,/pressure/i);
 assert.equal(read.passRate,1);
});
test('coach quality is graded before the outcome and does not depend on the result',()=>{
 const g=state({defense:'BLITZ',toGo:7,seconds:33,clockRunning:true});
 const book=teamPlaybook('PHI');
 const quick=book.find(x=>x.id==='stick');
 const deep=book.find(x=>x.id==='fourverts');
 const q=gradeDecision(g,quick,{formation:quick.formation,protection:quick.protection},book);
 const d=gradeDecision(g,deep,{formation:deep.formation,protection:deep.protection},book);
 assert.ok(q.points>d.points);
 assert.ok(d.delta>=q.delta);
 assert.ok(['A','B','C','D'].includes(q.letter));
 assert.equal(driveCoachScore([q,d]),Math.round((q.points+d.points)/2));
});
test('coordinator can punish repetition but not predict an unknown next call',()=>{
 const book=teamPlaybook('KC');const target=book.find(x=>x.id==='flood');
 const game=state({defense:'SOFT ZONE'});
 const first=estimateCallFit(game,target,{formation:target.formation,protection:target.protection});
 const repeated=estimateCallFit(game,target,{formation:target.formation,protection:target.protection},[
  snap('flood','sideline'),snap('flood','sideline')
 ]);
 assert.ok(repeated.score<first.score);
});
test('coaching scores distinguish when clock and distance make runs unsuitable',()=>{
 const book=teamPlaybook('PHI');
 const run=book.find(x=>x.id==='insidezone');
 const g=state({defense:'SOFT ZONE',clockRunning:true,seconds:16,toGo:14,down:4,ours:17,theirs:24});
 const risk=estimateCallFit(g,run,{formation:run.formation,protection:run.protection});
 assert.ok(risk.score<40);
});
