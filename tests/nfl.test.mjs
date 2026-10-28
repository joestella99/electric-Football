import test from 'node:test';
import assert from 'node:assert/strict';
import {NFL_TEAMS,TEAM_BY_ID,STYLE_LABEL,HISTORICAL_CHALLENGES,teamPlaybook,practiceGame} from '../src/logic/nfl.ts';
import {routeVertices,newWorld,routeAt} from '../src/logic/spatial.ts';

test('all 32 real NFL clubs appear once with usable colors and divisions',()=>{
 assert.equal(NFL_TEAMS.length,32);
 assert.equal(new Set(NFL_TEAMS.map(t=>t.id)).size,32);
 assert.equal(NFL_TEAMS.filter(t=>t.conference==='AFC').length,16);
 assert.equal(NFL_TEAMS.filter(t=>t.conference==='NFC').length,16);
 for(const t of NFL_TEAMS){
  assert.ok(/#[0-9a-f]{6}$/i.test(t.primary));
  assert.ok(/#[0-9a-f]{6}$/i.test(t.secondary));
  assert.ok(STYLE_LABEL[t.style]);assert.equal(TEAM_BY_ID[t.id],t);
  assert.ok(['East','West','North','South'].includes(t.division));
 }
});
test('each NFL club has eight original, usable formation-and-route play calls',()=>{
 for(const t of NFL_TEAMS){
  const book=teamPlaybook(t.id);
  assert.equal(book.length,8,t.name);
  assert.equal(new Set(book.map(b=>b.id)).size,8);
  assert.ok(book.some(p=>p.family==='RUN'));assert.ok(book.some(p=>p.family==='PASS'));
  for(const call of book){
   for(const id of [7,8,9,10,1]){
    assert.ok(call.routes[id]);
    const verts=routeVertices(id,call.routes[id],call.formation);
    assert.ok(verts.length>=2);
    const pt=routeAt(id,call.routes[id],call.formation,2);
    assert.ok(pt.every(Number.isFinite));
   }
   const w=newWorld(41,'SOFT ZONE',call.play,{formation:call.formation,protection:call.protection},call.routes);
   assert.equal(w.actors.length,22);
  }
 }
});
test('verified Super Bowl challenges have real clubs, valid initial drives and sources',()=>{
 assert.ok(HISTORICAL_CHALLENGES.length>=4);
 for(const s of HISTORICAL_CHALLENGES){
  assert.ok(TEAM_BY_ID[s.offense]);assert.ok(TEAM_BY_ID[s.opponent]);
  assert.notEqual(s.offense,s.opponent);
  assert.ok(s.initial.yard>0&&s.initial.yard<100);
  assert.ok(s.initial.seconds>0);
  assert.equal(s.initial.down,1);
  assert.equal(s.initial.status,'playing');
  assert.match(s.source,/^https:\/\//);
 }
 const lviii=HISTORICAL_CHALLENGES.find(s=>s.id==='lviii-final');
 assert.equal(lviii.offense,'KC');assert.equal(lviii.opponent,'SF');
 assert.equal(lviii.initial.seconds,113);assert.equal(lviii.initial.yard,25);
 assert.equal(lviii.initial.ours,16);assert.equal(lviii.initial.theirs,19);
});
test('practice generator accepts all 32 teams and prevents self-matchups',()=>{
 assert.equal(practiceGame('PHI','DAL').seconds,106);
 assert.equal(practiceGame('KC','SF').ours,20);
 assert.throws(()=>practiceGame('PHI','PHI'),/distinct clubs/);
});
