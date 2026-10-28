import { type GameState, type PlayId, type Result, type Tempo, fieldSpot, nextDefense } from './drill.ts';
import { DEFAULT_CALL, isEligible, matchingBonus, protectionTime, routeStartingX, type TacticalCall, type Formation } from './tactics.ts';

export type Point = [number, number];
export type ReceiverId = 7 | 8 | 9 | 10 | 1;
/** The single source of truth for the five Madden-style throwing buttons. */
export const PASS_BUTTON_IDS: readonly ReceiverId[] = [7,8,9,10,1];
export const passingButtonFor=(id:number):number|null=>{
 const index=PASS_BUTTON_IDS.indexOf(id as ReceiverId);
 return index<0?null:index+1;
};
export const RECEIVERS: { id: ReceiverId; label: string; number: string; role: string }[] = [
  { id: 7, label: 'HARRIS', number: '81', role: 'X' },
  { id: 8, label: 'BANKS', number: '14', role: 'Z' },
  { id: 9, label: 'MILLER', number: '87', role: 'TE' },
  { id: 10, label: 'REED', number: '11', role: 'SLOT' },
  { id: 1, label: 'JONES', number: '22', role: 'RB' },
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(v, b));
export const passPlay = (play: PlayId) => ['quick', 'sideline', 'deep', 'screen'].includes(play);
export const pressureLimit = (defense: GameState['defense'], protection: TacticalCall['protection']='base') => protectionTime(defense,protection);
const start: Record<ReceiverId, Point> = { 7: [-22,-2.1], 8: [22,-2.1], 9: [13.3,-1], 10: [-14.4,-3.2], 1: [3.3,-9] };

export function receiverPoint(id: ReceiverId, play: PlayId, yard: number, t: number, formation: Formation='spread'): Point {
  const time = clamp(t,0,9.5);
  const [, sz] = start[id];
  const sx = routeStartingX(id, formation);
  const spd = id === 1 ? 5 : id === 9 ? 6.5 : 8.1;
  const travel = time * spd;
  let dx = 0;
  let dz = travel;
  if (play === 'quick') {
    dx = sx < -9 ? Math.min(travel * .72,12) : sx > 9 ? -Math.min(travel * .72,12) : travel * .4;
    dz = travel * .79;
  } else if (play === 'sideline') {
    dx = id === 10 ? -Math.min(travel * .56,8) : id === 9 ? Math.min(travel * .46,7) : id === 1 ? Math.min(travel,12) : 0;
    dz = travel * .94;
  } else if (play === 'deep') {
    dx = id === 9 ? -Math.min(6,time*1.8) : id === 10 ? time * 1.1 : 0;
    dz = travel * 1.17;
  } else if (play === 'screen') {
    dx = id === 1 ? Math.min(15,time*6) : (id===7||id===10 ? -1 : 1)*Math.min(2,time);
    dz = id === 1 ? time * 4.8 : time * spd;
  }
  return [clamp(sx+dx,-25.4,25.4),clamp(yard+sz+dz,1,99)];
}

export function coveragePoint(index: number, defense: GameState['defense'], yard: number, t: number, play: PlayId='quick', formation: Formation='spread'): Point {
  const x = [-22,-8,8,22][index];
  const depth = defense === 'SOFT ZONE' ? 23 : 16;
  const drop = defense === 'BLITZ' ? 2.4 : defense === 'SOFT ZONE' ? 4.5 : 3.4;
  const shell: Point = [x + (index<2 ? 1 : -1)*Math.min(t*1.3,4), clamp(yard+depth + t*drop,1,99)];
  const assignment: ReceiverId = [7,10,9,8][index] as ReceiverId;
  const [rx,rz] = receiverPoint(assignment,play,yard,t,formation);
  // Corners react to the route instead of sliding forever in place; zone defenders stay deeper.
  const trail = defense === 'SOFT ZONE' ? .34 : defense === 'BLITZ' ? .79 : .65;
  return [clamp(shell[0]*(1-trail)+rx*trail,-25.4,25.4),clamp(shell[1]*(1-trail)+(rz+2.6)*trail,1,99)];
}

function makeResult(s: GameState, play: PlayId, elapsed: number, yards: number, complete: boolean, outOfBounds: boolean, turnover: boolean, text: string, random:()=>number, grade:Result['grade'], tempo: Tempo): Result {
  const setup = s.clockRunning ? (tempo === 'huddle' ? 16 : 7) : 0;
  const time = clamp(Math.ceil(elapsed)+setup,1,s.seconds);
  const seconds = Math.max(0,s.seconds-time);
  const yard = clamp(s.yard+yards,1,100);
  const gain = yard-s.yard;
  const td = complete && yard===100;
  const first = gain>=s.toGo;
  const nextDown = first ? 1 : s.down+1;
  const toGo = first ? Math.max(1,Math.min(10,100-yard)) : Math.max(1,s.toGo-gain);
  let status: GameState['status']='playing';
  let ours=s.ours;
  let description=text;
  if(td) {
    ours+=7; // arcade prototype: successful PAT is automatic
    status=ours>s.theirs?'won':ours===s.theirs?'tied':'lost';
    description='TOUCHDOWN! THE CROWD GOES WILD!';
  } else if(turnover || nextDown>4) {
    status='lost';description=turnover?'INTERCEPTED! DRIVE OVER.':'TURNOVER ON DOWNS.';
  } else if(seconds===0) {
    status='lost';description='TIME EXPIRES. '+text;
  } else if(first) description+=' FIRST DOWN!';
  else if(outOfBounds) description+=' OUT OF BOUNDS!';
  return {
    play, yards:gain, elapsed:time, complete, outOfBounds, turnover, grade,
    description,
    state:{
      ...s, seconds, yard, down:td?1:nextDown, toGo:td?10:toGo,
      ours, clockRunning: complete && !outOfBounds, status,
      defense:nextDefense(random),plays:s.plays+1,message:description
    }
  };
}

/** Resolve a user-released throw. Aim accuracy, defender proximity and time-to-sack affect completion.
 * Prototype probabilities are authored arcade rules, NOT stats from actual NFL footage.
 */
export function resolveThrow(s:GameState,play:PlayId,tempo:Tempo,id:ReceiverId,aim:Point,releaseAt:number,random:()=>number=Math.random,call:TacticalCall=DEFAULT_CALL):Result {
  if(!passPlay(play))throw new Error('Not a passing play');
  if(s.status!=='playing')throw new Error('Drive ended');
  const limit=pressureLimit(s.defense,call.protection);
  if(releaseAt>=limit)return resolveSack(s,tempo,limit,random);
  if(!isEligible(id,call))throw new Error('Receiver stays in protection');
  const targetNow=receiverPoint(id,play,s.yard,releaseAt,call.formation);
  const flight=clamp(Math.hypot(aim[0],aim[1]-(s.yard-5))/39,.45,1.55);
  const targetAtCatch=receiverPoint(id,play,s.yard,releaseAt+flight,call.formation);
  const miss=Math.hypot(aim[0]-targetAtCatch[0],aim[1]-targetAtCatch[1]);
  const closeDefenders=[0,1,2,3].map(i=>coveragePoint(i,s.defense,s.yard,releaseAt+flight,play,call.formation));
  const nearest=Math.min(...closeDefenders.map(([x,z])=>Math.hypot(x-targetAtCatch[0],z-targetAtCatch[1])));
  const targetDepth=targetAtCatch[1]-s.yard;
  const timed=releaseAt<1.05 && targetDepth>15;
  const earlyOrLate=timed ? .19 : 0;
  const pressure=clamp((releaseAt-2.1)*.075,0,.2)+(s.defense==='BLITZ'?.08:0);
  const coverage=clamp((5-nearest)*.083,0,.34);
  const accuracy=clamp(.96-miss*.065-coverage-pressure-earlyOrLate+matchingBonus(play,s.defense,call),.05,.98);
  const picked=random()<clamp(.008+(miss>10?.035:0)+(nearest<2?.045:0),.005,.1);
  const complete=!picked && random()<accuracy;
  const yards=complete? Math.round(targetAtCatch[1]-s.yard):0;
  const boundary=complete && (Math.abs(targetAtCatch[0])>22.7||Math.abs(aim[0])>23.6) && random()<.88;
  const quality=miss<=3.3 && nearest>=4 ? 'A' : miss<=7 ? 'B' : miss<=11 ? 'C' : 'D';
  const receiver=RECEIVERS.find(p=>p.id===id)!.label;
  const desc=picked?'PICKED OFF! THE DEFENDER JUMPS THE ROUTE.':complete?
    receiver+' MAKES THE CATCH! +'+yards+' YDS.':
    (miss>8?'OFF TARGET! PASS INCOMPLETE.':'BROKEN UP! PASS INCOMPLETE.');
  void targetNow;
  return makeResult(s,play,releaseAt+flight+1, yards,complete,boundary,picked,desc,random,quality,tempo);
}
export function resolveSack(s:GameState,tempo:Tempo,releaseAt:number,random:()=>number=Math.random):Result {
  const yards=-(3+Math.floor(random()*6));
  const result=makeResult(s,'quick',releaseAt+2,yards,true,false,false,'SACKED! '+yards+' YARDS. '+fieldSpot(s.yard)+'.',random,'D',tempo);
  result.state.clockRunning=true;
  return result;
}


export type CoverageRead = { feet: number; label: 'OPEN' | 'WINDOW' | 'CONTESTED'; color: 'green' | 'amber' | 'red' };
/** A readable estimate of route separation, not a real NFL completion model. */
export function coverageRead(id: ReceiverId, play: PlayId, yard: number, t: number, defense: GameState['defense'], call: TacticalCall=DEFAULT_CALL): CoverageRead {
  const receiver=receiverPoint(id,play,yard,t,call.formation);
  const nearest=Math.min(...[0,1,2,3].map(i=>{
    const defender=coveragePoint(i,defense,yard,t,play,call.formation);
    return Math.hypot(receiver[0]-defender[0],receiver[1]-defender[1]);
  }));
  if(nearest>8)return {feet:Math.round(nearest),label:'OPEN',color:'green'};
  if(nearest>4)return {feet:Math.round(nearest),label:'WINDOW',color:'amber'};
  return {feet:Math.round(nearest),label:'CONTESTED',color:'red'};
}
