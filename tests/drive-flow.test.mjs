import test from 'node:test';
import assert from 'node:assert/strict';
import {PASS_BUTTON_IDS,passingButtonFor} from '../src/logic/throwing.ts';
import {isEligible} from '../src/logic/tactics.ts';
import {canSetPlay,canSnap,snapSetupSeconds,audibleSeconds} from '../src/logic/driveFlow.ts';

test('the five on-field throw keys exactly match the 1-5 controller order',()=>{
 assert.deepEqual([...PASS_BUTTON_IDS],[7,8,9,10,1]);
 for(let i=0;i<PASS_BUTTON_IDS.length;i++){
  assert.equal(passingButtonFor(PASS_BUTTON_IDS[i]),i+1);
 }
 assert.equal(passingButtonFor(0),null);
 assert.equal(passingButtonFor(2),null);
 assert.equal(passingButtonFor(11),null);
 assert.equal(passingButtonFor(21),null);
});
test('max protection removes RB throw eligibility without remapping the other four receivers',()=>{
 const five={formation:'spread',protection:'base'};
 const max={formation:'spread',protection:'max'};
 assert.equal(PASS_BUTTON_IDS.filter(id=>isEligible(id,five)).length,5);
 assert.deepEqual(PASS_BUTTON_IDS.filter(id=>isEligible(id,max)),[7,8,9,10]);
 assert.equal(passingButtonFor(1),5);
});
test('play selection never snaps the ball and players must set the offense first',()=>{
 assert.equal(canSetPlay('calling'),true);
 assert.equal(canSnap('calling'),false);
 assert.equal(canSetPlay('ready'),false);
 assert.equal(canSnap('ready'),true);
 for(const stage of ['live','result','finished']){
  assert.equal(canSnap(stage),false);
  assert.equal(canSetPlay(stage),false);
 }
});
test('strategy planning is untimed; game clock only charges according to chosen snap tempo and audibles',()=>{
 for(const tempo of ['hurry','huddle','drain']){
  assert.equal(snapSetupSeconds(false,tempo),0);
 }
 assert.equal(snapSetupSeconds(true,'hurry'),1);
 assert.equal(snapSetupSeconds(true,'huddle'),5);
 assert.equal(snapSetupSeconds(true,'drain'),12);
 assert.equal(audibleSeconds(false),0);
 assert.equal(audibleSeconds(true),2);
});
