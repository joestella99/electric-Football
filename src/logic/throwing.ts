import { type GameState, type PlayId, type Result, type Tempo, fieldSpot, nextDefense } from './drill.ts';

export type Point = [number, number];
export type ReceiverId = 7 | 8 | 9 | 10 | 1;
export const RECEIVERS: { id: ReceiverId; label: string; number: string; role: string }[] = [
  { id: 7, label: 'HARRIS', number: '81', role: 'X' },
  { id: 8, label: 'BANKS', number: '14', role: 'Z' },
  { id: 9, label: 'MILLER', number: '87', role: 'TE' },
  { id: 10, label: 'REED', number: '11', role: 'SLOT' },
  { id: 1, label: 'JONES', number: '22', role: 'RB' },
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(v, b));
export const passPlay = (play: PlayId) => ['quick', 'sideline', 'deep', 'screen'].includes(play);
export const pressureLimit = (defense: GameState['defense']) => defense === 'BLITZ' ? 3.25 : defense === 'LOADED BOX' ? 4.1 : 5.15;
const start: Record<ReceiverId, Point> = { 7: [-22,-2.1], 8: [22,-2.1], 9: [13.3,-1], 10: [-14.4,-3.2], 1: [3.3,-9] };

export function receiverPoint(id: ReceiverId, play: PlayId, yard: number, t: number): Point {
  const time = clamp(t,0,7);
  const [sx, sz] = start[id];
  const spd = id === 1 ? 5 : id === 9 ? 6.5 : 8.1;
  const travel = time * spd;
  let dx = 0;
  let dz = travel;
  if (play === 'quick') {
    dx = id === 7 || id === 10 ? Math.min(travel * .72,12) : id === 8 || id === 9 ? -Math.min(travel * .72,12) : travel * .4;
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

export function coveragePoint(index: number, defense: GameState['defense'], yard: number, t: number): Point {
  const x = [-22,-8,8,22][index];
  const depth = defense === 'SOFT ZONE' ? 23 : 16;
  const drop = defense === 'BLITZ' ? 2.4 : defense === 'SOFT ZONE' ? 4.5 : 3.4;
  return [x + (index<2 ? 1 : -1)*Math.min(t*1.3,4), clamp(yard+depth + t*drop,1,99)];
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
export function resolveThrow(s:GameState,play:PlayId,tempo:Tempo,id:ReceiverId,aim:Point,releaseAt:number,random:()=>number=Math.random):Result {
  if(!passPlay(play))throw new Error('Not a passing play');
  if(s.status!=='playing')throw new Error('Drive ended');
  const limit=pressureLimit(s.defense);
  if(releaseAt>=limit)return resolveSack(s,tempo,limit,random);
  const targetNow=receiverPoint(id,play,s.yard,releaseAt);
  const flight=clamp(Math.hypot(aim[0],aim[1]-(s.yard-5))/39,.45,1.55);
  const targetAtCatch=receiverPoint(id,play,s.yard,releaseAt+flight);
  const miss=Math.hypot(aim[0]-targetAtCatch[0],aim[1]-targetAtCatch[1]);
  const closeDefenders=[0,1,2,3].map(i=>coveragePoint(i,s.defense,s.yard,releaseAt+flight));
  const nearest=Math.min(...closeDefenders.map(([x,z])=>Math.hypot(x-targetAtCatch[0],z-targetAtCatch[1])));
  const targetDepth=targetAtCatch[1]-s.yard;
  const timed=releaseAt<1.05 && targetDepth>15;
  const earlyOrLate=timed ? .19 : 0;
  const pressure=clamp((releaseAt-2.1)*.075,0,.2)+(s.defense==='BLITZ'?.08:0);
  const coverage=clamp((5-nearest)*.083,0,.34);
  const accuracy=clamp(.96-miss*.065-coverage-pressure-earlyOrLate,.05,.98);
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
