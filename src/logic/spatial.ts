import { type Defense, type GameState, type PlayId, type Result } from './drill.ts';
import { DEFAULT_CALL, isEligible, protectionTime, routeStartingX, type TacticalCall } from './tactics.ts';
import { type Point, type ReceiverId } from './throwing.ts';
import { selectCoverage, defenderAlignment, coverageResponsibility, type CoverageId } from './coverage.ts';

export type RouteKind = 'slant'|'out'|'in'|'go'|'post'|'corner'|'curl'|'drag'|'flat'|'wheel'|'custom';
export type RouteSpec = { kind:RouteKind; points?:Point[] };
export type RouteBook = Record<ReceiverId,RouteSpec>;
export const TARGETS: ReceiverId[]=[7,8,9,10,1];
export const ROUTE_OPTIONS: {kind:RouteKind;name:string;description:string}[]=[
  {kind:'slant',name:'SLANT',description:'Fast inside break'},
  {kind:'out',name:'OUT',description:'Break to boundary'},
  {kind:'in',name:'DIG',description:'Deep inside break'},
  {kind:'go',name:'GO',description:'Vertical release'},
  {kind:'post',name:'POST',description:'Inside deep shot'},
  {kind:'corner',name:'CORNER',description:'Break toward sideline'},
  {kind:'curl',name:'CURL',description:'Stop and face QB'},
  {kind:'drag',name:'DRAG',description:'Shallow crossing'},
  {kind:'flat',name:'FLAT',description:'Quick out'},
  {kind:'wheel',name:'WHEEL',description:'RB up the rail'}
];
export const starterRoutes=(play:PlayId):RouteBook=>{
 const byPlay:Record<string,RouteKind[]> ={
 quick:['slant','slant','flat','drag','flat'],
 sideline:['out','out','corner','out','flat'],
 deep:['go','go','post','corner','wheel'],
 screen:['go','go','curl','drag','flat']
 };
 const choices=byPlay[play]??byPlay.quick;
 return {7:{kind:choices[0]},8:{kind:choices[1]},9:{kind:choices[2]},10:{kind:choices[3]},1:{kind:choices[4]}};
};
export type Actor={id:number;side:'offense'|'defense';role:string;x:number;z:number;y:number;heading:number;number:number;targetId?:number;vx?:number;vz?:number};
export type Flight={target:Point;receiver:ReceiverId;from:Point;duration:number;elapsed:number;position:[number,number,number]};
export type SpatialOutcome={kind:'catch'|'incomplete'|'breakup'|'interception'|'sack';receiver?:ReceiverId;yards:number;outOfBounds:boolean;elapsed:number;description:string;defenderId?:number};
export type World={
 yard:number;defense:Defense;coverage:CoverageId;call:TacticalCall;play:PlayId;routes:RouteBook;actors:Actor[];
 t:number;flight:Flight|null;outcome:SpatialOutcome|null;phase:'live'|'flight'|'done';
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const approach=(actor:Actor,to:Point,seconds:number,speed:number,agility=6.2)=>{
 const dx=to[0]-actor.x,dz=to[1]-actor.z;
 const len=Math.hypot(dx,dz);
 const oldX=actor.vx??0,oldZ=actor.vz??0;
 // Acceleration and a small braking radius make cuts readable rather than instantaneous.
 const desired=len>.001?Math.min(speed,len/Math.max(seconds,.18)):0;
 const targetX=len>.001?dx/len*desired:0,targetZ=len>.001?dz/len*desired:0;
 const blend=1-Math.exp(-agility*seconds);
 actor.vx=oldX+(targetX-oldX)*blend;
 actor.vz=oldZ+(targetZ-oldZ)*blend;
 const move=Math.hypot(actor.vx,actor.vz);
 if(move>.06)actor.heading=Math.atan2(actor.vx,actor.vz);
 if(move*seconds>len&&len>0){actor.x=to[0];actor.z=to[1];actor.vx=0;actor.vz=0;}
 else{actor.x+=actor.vx*seconds;actor.z+=actor.vz*seconds;}
};
const first=(id:number,formation:TacticalCall['formation']):Point=>{
 const x=routeStartingX(id,formation);
 return [x,id===1?-8.7:id===10?-3:id===7||id===8?-2:-1];
};
export const routeVertices=(id:ReceiverId,spec:RouteSpec,formation:TacticalCall['formation']):Point[]=>{
 const [x,z]=first(id,formation);
 const inside=x>0?-1:1; const outside=-inside;
 const v=(dx:number,dz:number):Point=>[clamp(x+dx,-25.5,25.5),z+dz];
 const kind=spec.kind;
 if(kind==='custom'&&spec.points?.length){
   return [[x,z],...spec.points.map(p=>[clamp(p[0],-25.5,25.5),clamp(p[1],0,72)] as Point)];
 }
 switch(kind){
  case 'slant':return [[x,z],v(0,5),v(inside*11,14),v(inside*18,27)];
  case 'out':return [[x,z],v(0,11),v(outside*10,12),v(outside*13,12)];
  case 'in':return [[x,z],v(0,14),v(inside*16,15),v(inside*22,16)];
  case 'go':return [[x,z],v(0,12),v(0,27),v(0,57)];
  case 'post':return [[x,z],v(0,15),v(inside*13,32),v(inside*17,48)];
  case 'corner':return [[x,z],v(0,14),v(outside*13,29),v(outside*15,43)];
  case 'curl':return [[x,z],v(0,12),v(inside*1,12),v(inside*1,12)];
  case 'drag':return [[x,z],v(inside*8,4),v(inside*23,7),v(inside*34,9)];
  case 'flat':return [[x,z],v(outside*7,2),v(outside*13,5),v(outside*13,5)];
  case 'wheel':return [[x,z],v(outside*11,5),v(outside*14,16),v(outside*14,39)];
  default:return [[x,z],v(0,10)];
 }
};
export function routeAt(id:ReceiverId,spec:RouteSpec,formation:TacticalCall['formation'],seconds:number):Point{
 const verts=routeVertices(id,spec,formation);
 let dist=Math.max(0,seconds)*(id===1?5.7:id===9?7.2:8.5);
 for(let i=1;i<verts.length;i++){
  const a=verts[i-1],b=verts[i],length=distance(a,b);
  if(dist<=length)return [a[0]+(b[0]-a[0])*dist/Math.max(length,.001),a[1]+(b[1]-a[1])*dist/Math.max(length,.001)];
  dist-=length;
 }
 return verts[verts.length-1];
}
export function newWorld(yard:number,defense:Defense,play:PlayId,call:TacticalCall=DEFAULT_CALL,routes:RouteBook=starterRoutes(play),driveSeed=0):World{
 const starts:Actor[]=[
  {id:0,side:'offense',role:'QB',x:0,z:yard-5,y:0,heading:0,number:12},
  {id:1,side:'offense',role:'RB',x:routeStartingX(1,call.formation),z:yard-8.7,y:0,heading:0,number:22},
  ...[-8,-4,0,4,8].map((x,i):Actor=>({id:i+2,side:'offense',role:'OL',x,z:yard-.9,y:0,heading:0,number:60+i})),
  ...([7,8,9,10] as ReceiverId[]).map((id,i):Actor=>({id,side:'offense',role:'WR',x:routeStartingX(id,call.formation),z:yard+(id===10?-3:id===9?-1:-2),y:0,heading:0,number:[81,14,87,11][i]}))
 ];
 const coverage=selectCoverage(defense,driveSeed);
 const front=defense==='BLITZ'?2.1:2.8;
 const def:Actor[]=[
  ...[-8,-3,3,9].map((x,i):Actor=>({id:11+i,side:'defense',role:'DL',x,z:yard+front,y:0,heading:Math.PI,number:90+i})),
  ...[15,16,17].map((id,i):Actor=>({id,side:'defense',role:'LB',x:defenderAlignment(id,coverage,yard)[0],z:defenderAlignment(id,coverage,yard)[1],y:0,heading:Math.PI,number:50+i})),
  ...[18,19,20,21].map((id,i):Actor=>({id,side:'defense',role:'DB',x:defenderAlignment(id,coverage,yard)[0],z:defenderAlignment(id,coverage,yard)[1],y:0,heading:Math.PI,number:20+i,targetId:[7,10,9,8][i]}))
 ];
 return {yard,defense,coverage,call,play,routes,actors:[...starts,...def],t:0,flight:null,outcome:null,phase:'live'};
}
export function actorPoint(world:World,id:number):Point{
 const actor=world.actors.find(a=>a.id===id);
 if(!actor)throw Error('Missing actor '+id);
 return [actor.x,actor.z];
}
export function closestDefender(world:World,point:Point){
 let best=world.actors[11],bestDistance=Infinity;
 for(let i=11;i<world.actors.length;i++){
  const a=world.actors[i];if(a.side!=='defense')continue;
  const d=(a.x-point[0])**2+(a.z-point[1])**2;
  if(d<bestDistance){best=a;bestDistance=d;}
 }
 return best;
}
export function pocketDistance(world:World):number{
 const qb=actorPoint(world,0);return Math.min(...world.actors.filter(a=>a.role==='DL'||(world.defense==='BLITZ'&&a.role==='LB')).map(a=>distance([a.x,a.z],qb)));
}
function updateActors(w:World,dt:number){
 const defenders=w.actors.slice(11);
 const offense=w.actors.slice(0,11);
 const ballTarget=w.phase==='flight'&&w.flight?w.flight.target:null;
 const flightElapsed=w.flight?.elapsed??0;
 // Update receivers first so corners can read the actual route stems.
 for(const a of offense){
   if(a.role==='WR'||a.role==='RB'){
     if(a.role==='RB'&&!isEligible(a.id,w.call)){
       approach(a,[a.x*.5,w.yard+1.4],dt,6.0);continue;
     }
     const id=a.id as ReceiverId;
     const [x,dz]=routeAt(id,w.routes[id],w.call.formation,w.t);
     const goal:Point=[x,clamp(w.yard+dz,1,99)];
     const isCut=Math.abs(goal[0]-a.x)>2;
     approach(a,goal,dt,id===1?7.0:id===9?8.3:9.3,isCut?4.3:8.0);
   }else if(a.role==='OL'){
     const rusher=defenders.find(d=>d.id===11+(a.id-2)%4);
     const block:Point=rusher?[rusher.x,w.yard+1.65]:[a.x,w.yard+1.8];
     approach(a,block,dt,3.5,9);
   }else if(a.role==='QB'){
     approach(a,[0,w.yard-5.7],dt,.6);
   }
 }
 // A protection matchup changes how fast a pass rusher wins the edge.
 for(const a of defenders.filter(d=>d.role==='DL')){
   const protector=offense.find(o=>o.id===2+(a.id-11));
   const gap=protector?Math.hypot(a.x-protector.x,a.z-protector.z):99;
   const base=w.call.protection==='max'?1.55:w.call.protection==='slide'?2.05:2.75;
   const rush=gap<2.7?base:4.7;
   approach(a,[0,w.yard-5],dt,rush,5.8);
 }
 // These are zone responsibilities and man assignments, not random movement.
 for(const a of defenders.filter(d=>d.role==='LB'||d.role==='DB')){
   const rule=coverageResponsibility(a,w.coverage,w.yard,offense,flightElapsed,ballTarget);
   approach(a,rule.point,dt,rule.speed,a.role==='DB'?6.5:5.6);
 }
 for(const a of w.actors){
   a.x=clamp(a.x,-25.5,25.5);
   a.z=clamp(a.z,1,99);
 }
}
export function throwBall(w:World,target:Point,receiver:ReceiverId):boolean{
 if(w.phase!=='live'||!isEligible(receiver,w.call))return false;
 const start:Point=[0,w.yard-5];
 const delta=distance(start,target);
 const duration=clamp(.30+delta/52,.42,1.56);
 w.flight={target:[clamp(target[0],-25.5,25.5),clamp(target[1],1,99)],receiver,from:start,duration,elapsed:0,position:[0,3,w.yard-5]};
 w.phase='flight';
 return true;
}
/** Forecast where a real moving receiver will be when a pass arrives.
 * Uses the SAME pursuit and route integration as the on-field simulation;
 * there is no scripted catch position or completion probability.
 */
export function predictLead(w:World,id:ReceiverId):Point{
  let target=actorPoint(w,id);
  for(let iteration=0;iteration<2;iteration++){
    const flightTime=clamp(.30+distance([0,w.yard-5],target)/52,.42,1.56);
    const projection:World={
      ...w,t:w.t,phase:'live',flight:null,outcome:null,
      actors:w.actors.map(a=>({...a}))
    };
    const steps=Math.ceil(flightTime*60);
    for(let i=0;i<steps;i++){
      // Approach math has no randomness. Don't stop projection for a future sack.
      const dt=Math.min(1/60,flightTime-i/60);
      if(dt<=0)break;
      projection.t+=dt;
      updateActors(projection,dt);
    }
    target=actorPoint(projection,id);
  }
  return [clamp(target[0],-25.5,25.5),clamp(target[1],1,99)];
}
export function finishFlight(w:World):SpatialOutcome{
 if(!w.flight)throw Error('No ball in flight');
 const f=w.flight;
 const receiver=w.actors.find(a=>a.id===f.receiver)!;
 const target=f.target;
 const receiverGap=distance([receiver.x,receiver.z],target);
 const defender=closestDefender(w,target);
 const defenderGap=distance([defender.x,defender.z],target);
 const withinCatch=receiverGap <= 3.25;
 const contested=defenderGap <= 2.65;
 let kind:SpatialOutcome['kind']='incomplete';
 if(defenderGap<=1.14 && (!withinCatch||defenderGap+.15<receiverGap))kind='interception';
 else if(contested && (!withinCatch||defenderGap+.35<receiverGap))kind='breakup';
 else if(withinCatch)kind='catch';
 const yards=kind==='catch'?Math.max(-10,Math.round(receiver.z-w.yard)):0;
 const outOfBounds=kind==='catch' && Math.abs(receiver.x)>=24.65;
 const label=kind==='catch'?'CAUGHT IN STRIDE! '+(yards>=0?'+':'')+yards+' YARDS.':
   kind==='breakup'?'PASS BROKEN UP — DEFENDER AT THE CATCH POINT.':
   kind==='interception'?'INTERCEPTED — DEFENDER BEAT THE BALL TO ITS SPOT.':
   'INCOMPLETE — BALL DID NOT REACH A RECEIVER.';
 return {kind,receiver:f.receiver,yards,outOfBounds,elapsed:w.t,description:label,defenderId:kind==='breakup'||kind==='interception'?defender.id:undefined};
}
export function stepWorld(w:World,delta:number):SpatialOutcome|null{
 if(w.phase==='done')return w.outcome;
 const dt=clamp(delta,0,.04);
 w.t+=dt;
 updateActors(w,dt);
 if(w.phase==='flight'&&w.flight){
   const f=w.flight;
   f.elapsed=Math.min(f.duration,f.elapsed+dt);
   const p=f.elapsed/f.duration;
   const arc=Math.sin(Math.PI*p)*Math.min(8.5,2.5+distance(f.from,f.target)*.15);
   f.position=[f.from[0]+(f.target[0]-f.from[0])*p,2.5+arc,f.from[1]+(f.target[1]-f.from[1])*p];
   if(f.elapsed>=f.duration){
     w.outcome=finishFlight(w);w.phase='done';return w.outcome;
   }
 }
 if(w.phase==='live'&&(pocketDistance(w)<2.55||w.t>=protectionTime(w.defense,w.call.protection))){
   w.outcome={kind:'sack',yards:-4,outOfBounds:false,elapsed:w.t,description:'SACKED. THE POCKET COLLAPSED.'};
   w.phase='done';return w.outcome;
 }
 return null;
}
export function resultFromWorld(s:GameState,w:World,outcome:SpatialOutcome):Result{
 const elapsed=Math.max(1,Math.ceil(outcome.elapsed+(!s.clockRunning?0:3)));
 const seconds=Math.max(0,s.seconds-elapsed);
 const yard=clamp(s.yard+outcome.yards,1,100);
 const yards=yard-s.yard;
 const catchMade=outcome.kind==='catch';
 const touchdown=catchMade&&yard>=100;
 const firstDown=catchMade&&yards>=s.toGo;
 const down=firstDown||touchdown?1:s.down+1;
 const toGo=firstDown?Math.max(1,Math.min(10,100-yard)):Math.max(1,s.toGo-yards);
 let ours=s.ours,status:GameState['status']='playing',description=outcome.description;
 if(touchdown){
   ours+=7;status=ours>s.theirs?'won':'tied';description='TOUCHDOWN! THE DRIVE IS ALIVE.';
 }else if(outcome.kind==='interception'){status='lost';}
 else if(down>4){status='lost';description='TURNOVER ON DOWNS. '+description;}
 else if(seconds===0){status='lost';description='TIME EXPIRES. '+description;}
 else if(firstDown){description+=' FIRST DOWN.';}
 else if(outcome.outOfBounds)description+=' OUT OF BOUNDS.';
 const grade:Result['grade']=outcome.kind==='catch'?'A':outcome.kind==='breakup'?'C':outcome.kind==='incomplete'?'C':'D';
 return {play:w.play,yards,elapsed,complete:catchMade,outOfBounds:outcome.outOfBounds,turnover:status==='lost'&&outcome.kind==='interception',grade,description,
  state:{...s,seconds,yard,toGo,down,ours,status,clockRunning:catchMade&&!outcome.outOfBounds||outcome.kind==='sack',plays:s.plays+1,message:description,
  defense:s.defense==='BLITZ'?'SOFT ZONE':s.defense==='SOFT ZONE'?'LOADED BOX':'BLITZ'}
 };
}
