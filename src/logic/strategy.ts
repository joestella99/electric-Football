import type {GameState,Defense,PlayId} from './drill.ts';
import type {TeamConcept} from './nfl.ts';
import type {TacticalCall} from './tactics.ts';

export type DriveSnap={
 family:TeamConcept['family'];concept:string;play:PlayId;
 yards:number;clock:number;down:number;toGo:number;
 defense:Defense;turnover:boolean;
};
export type DefensiveScout={
 front:string;shell:string;pressure:string;note:string;
 runRate:number;passRate:number;recommendation:string;
};
export type CoachGrade={
 points:number;letter:'A'|'B'|'C'|'D';delta:number;
 reason:string;bestCall:string;idealScore:number;
};

/** Opponent observes only PREVIOUS plays and current down, distance, score and clock.
 * It does not inspect the upcoming play selection or receiver routes.
 */
export function planDefense(state:GameState,history:readonly DriveSnap[]):Defense{
 const last=history.slice(-4);
 const rushes=last.filter(x=>x.play==='inside'||x.play==='outside').length;
 const shots=last.filter(x=>x.play==='deep').length;
 const passes=last.filter(x=>!['inside','outside'].includes(x.play)).length;
 const short=state.toGo<=3;
 const long=state.toGo>=10;
 // Avoid simply repeating the same look on every snap; football adjustments
 // depend on what the offense has shown and what a first down would cost.
 const salt=(state.plays*7+Math.floor(state.yard/11))%5;
 if(short&&(rushes>=passes||state.down>=3))return 'LOADED BOX';
 if(rushes>=3&&last.length>=3)return 'LOADED BOX';
 if(long&&(shots>=2||passes>=3))return salt<=2?'SOFT ZONE':'BLITZ';
 if(state.down>=3&&state.toGo>=5)return salt===0?'SOFT ZONE':'BLITZ';
 if(state.seconds<=35&&state.yard>=52)return 'SOFT ZONE';
 if(passes>=3)return salt<=2?'BLITZ':'SOFT ZONE';
 return salt===0?'BLITZ':salt===1?'LOADED BOX':'SOFT ZONE';
}
export function scoutDefense(state:GameState,history:readonly DriveSnap[]):DefensiveScout{
 const last=history.slice(-5);
 const run=last.filter(x=>x.play==='inside'||x.play==='outside').length;
 const pass=last.length-run;
 const front=state.defense==='BLITZ'?'PRESSURE / CROWDED EDGE':
  state.defense==='LOADED BOX'?'HEAVY FRONT / ONE HIGH':'LIGHT BOX / TWO HIGH';
 const note=state.defense==='BLITZ'?'Expect pressure. Quick rhythm, backs and protection are important.':
  state.defense==='LOADED BOX'?'Eight defenders can fit the run. Attack outside leverage or isolate the corners.':
  'Safeties protect deep space. Create underneath conflicts and protect the clock.';
 const trend=last.length===0?'No tendencies recorded yet. The coordinator is using the situation.':
  run>=3?'You have run repeatedly. The defense is anticipating another handoff.':
  pass>=4?'You have passed on nearly every snap. Expect disguise and additional pressure.':
  'The defense is balancing your recent calls against down and distance.';
 return {front,shell:state.defense==='BLITZ'?'PRESS / ROTATION':state.defense==='LOADED BOX'?'SINGLE-HIGH LOOK':'TWO-HIGH LOOK',
  pressure:state.defense==='BLITZ'?'HIGH':state.defense==='LOADED BOX'?'MODERATE':'LOW',
  note,runRate:last.length?run/last.length:0,passRate:last.length?pass/last.length:0,
  recommendation:trend};
}
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
export function estimateCallFit(state:GameState,concept:TeamConcept,call:TacticalCall,history:readonly DriveSnap[]=[]):{score:number;reason:string}{
 let score=65;
 const needs=state.toGo;
 const short=state.seconds<=38;
 const downFour=state.down===4;
 const deficit=state.theirs-state.ours;
 const deep=concept.play==='deep';
 const run=concept.play==='inside'||concept.play==='outside';
 const quick=concept.play==='quick'||concept.play==='screen';
 const sideline=concept.play==='sideline'||concept.play==='outside';
 let reason='Balanced attack for the current look.';
 if(state.defense==='BLITZ'){
   if(quick){score+=17;reason='Quick release attacks the space vacated by the rush.';}
   else if(run){score+=3;reason='A run can punish pressure, but a free defender may be waiting.';}
   else if(deep){score-=16;reason='Long-developing routes invite a free rusher.';}
   if(call.protection==='max')score+=5;
 }else if(state.defense==='LOADED BOX'){
   if(concept.play==='outside'){score+=15;reason='Stretch the loaded front toward the perimeter.';}
   if(quick){score+=9;reason='Spread the heavy box and get the ball out.';}
   if(deep){score+=12;reason='Single-high coverage leaves isolated outside matchups.';}
   if(concept.play==='inside'){score-=15;reason='The middle is crowded; there may be no downhill crease.';}
 }else{
   if(quick){score+=10;reason='Take efficient underneath space against soft coverage.';}
   if(concept.play==='inside'){score+=13;reason='Light defensive box gives blockers a numbers advantage.';}
   if(deep){score-=9;reason='Two high safeties are guarding against the shot.';}
   if(concept.play==='sideline'){score+=8;reason='Flood creates a three-level sideline conflict.';}
 }
 if(needs<=3&&run){score+=11;reason='Short yardage rewards a reliable downhill first down.';}
 if(needs>=9&&run){score-=17;reason='A run on long yardage leaves a difficult next down.';}
 if(needs>=10&&deep&&state.defense!=='BLITZ')score+=5;
 if(short&&state.clockRunning&&run){score-=23;reason='A run risks precious seconds if tackled in bounds.';}
 if(short&&sideline){score+=13;reason='The boundary creates a chance to preserve the clock.';}
 if(short&&quick&&!sideline)score-=3;
 if(downFour&&needs>=5&&run){score-=23;reason='Fourth-and-long asks for yardage beyond a typical run.';}
 if(downFour&&needs<=2&&run)score+=7;
 if(deficit>=4&&state.seconds<=40&&run){score-=14;reason='You need a touchdown quickly; vertical yards are more valuable.';}
 if(deficit>=4&&state.seconds<=40&&deep)score+=9;
 if(call.playAction&&state.defense==='BLITZ'){score-=8;reason='The fake delays the release against pressure.';}
 if(call.playAction&&state.defense==='LOADED BOX')score+=7;
 if(call.rollout&&call.rollout!=='none'&&state.defense==='BLITZ')score-=5;
 const recent=history.slice(-3);
 const repeats=recent.filter(x=>x.concept===concept.id).length;
 if(repeats>0){score-=repeats*8;reason='Repeated calls make your tendencies easier to anticipate.';}
 if(concept.family==='TRICK'){score-=5;reason='A trick play can change the matchup but adds execution risk.';}
 return {score:clamp(score,8,98),reason};
}
/** Compare a coach's BEFORE-SNAP decision with the best alternative in the same playbook.
 * This is an original heuristic score, NOT an NFL-calibrated win probability.
 */
export function gradeDecision(state:GameState,concept:TeamConcept,call:TacticalCall,book:readonly TeamConcept[],history:readonly DriveSnap[]=[]):CoachGrade{
 const chosen=estimateCallFit(state,concept,call,history);
 const all=book.map(p=>({concept:p,score:estimateCallFit(state,p,{...call,formation:p.formation,protection:p.protection,concept:p.id},history).score}));
 all.sort((a,b)=>b.score-a.score);
 const best=all[0];
 const diff=Math.max(0,best.score-chosen.score);
 const letter:CoachGrade['letter']=diff<=6?'A':diff<=14?'B':diff<=26?'C':'D';
 return {points:Math.round(chosen.score),letter,delta:Math.round(diff),reason:chosen.reason,bestCall:best.concept.name,idealScore:best.score};
}
export function driveCoachScore(grades:readonly CoachGrade[]):number{
 if(!grades.length)return 0;
 return Math.round(grades.reduce((sum,g)=>sum+g.points,0)/grades.length);
}
