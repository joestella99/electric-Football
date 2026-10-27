import { type Defense, type GameState, type PlayId, type Result } from './drill.ts';
import { DEFAULT_CALL, isEligible, protectionTime, routeStartingX, type TacticalCall } from './tactics.ts';
import { type Point, type ReceiverId } from './throwing.ts';

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
export type Actor={id:number;side:'offense'|'defense';role:string;x:number;z:number;y:number;heading:number;number:number;targetId?:number};
export type Flight={target:Point;receiver:ReceiverId;from:Point;duration:number;elapsed:number;position:[number,number,number]};
export type SpatialOutcome={kind:'catch'|'incomplete'|'breakup'|'interception'|'sack';receiver?:ReceiverId;yards:number;outOfBounds:boolean;elapsed:number;description:string;defenderId?:number};
export type World={
 yard:number;defense:Defense;call:TacticalCall;play:PlayId;routes:RouteBook;actors:Actor[];
 t:number;flight:Flight|null;outcome:SpatialOutcome|null;phase:'live'|'flight'|'done';
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const approach=(actor:Actor,to:Point,seconds:number,speed:number)=>{
 const dx=to[0]-actor.x,dz=to[1]-actor.z;
 const len=Math.hypot(dx,dz);if(len<.001)return;
 const d=Math.min(len,speed*seconds);
 actor.x+=dx/len*d;actor.z+=dz/len*d;
 actor.heading=Math.atan2(dx,dz);
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
export function newWorld(yard:number,defense:Defense,play:PlayId,call:TacticalCall=DEFAULT_CALL,routes:RouteBook=starterRoutes(play)):World{
 const starts:Actor[]=[
  {id:0,side:'offense',role:'QB',x:0,z:yard-5,y:0,heading:0,number:12},
  {id:1,side:'offense',role:'RB',x:routeStartingX(1,call.formation),z:yard-8.7,y:0,heading:0,number:22},
  ...[-8,-4,0,4,8].map((x,i):Actor=>({id:i+2,side:'offense',role:'OL',x,z:yard-.9,y:0,heading:0,number:60+i})),
  ...([7,8,9,10] as ReceiverId[]).map((id,i):Actor=>({id,side:'offense',role:'WR',x:routeStartingX(id,call.formation),z:yard+(id===10?-3:id===9?-1:-2),y:0,heading:0,number:[81,14,87,11][i]}))
 ];
 const depth=defense==='SOFT ZONE'?18:11;
 const front=defense==='BLITZ'?2.1:2.8;
 const def:Actor[]=[
  ...[-8,-3,3,9].map((x,i):Actor=>({id:11+i,side:'defense',role:'DL',x,z:yard+front,y:0,heading:Math.PI,number:90+i})),
  ...[-14,0,14].map((x,i):Actor=>({id:15+i,side:'defense',role:'LB',x,z:yard+(defense==='BLITZ'?4.5:7),y:0,heading:Math.PI,number:50+i})),
  ...[-22,-8,8,22].map((x,i):Actor=>({id:18+i,side:'defense',role:'DB',x,z:yard+depth+(i%2)*3,y:0,heading:Math.PI,number:20+i,targetId:[7,10,9,8][i]}))
 ];
 return {yard,defense,call,play,routes,actors:[...starts,...def],t:0,flight:null,outcome:null,phase:'live'};
}
export function actorPoint(world:World,id:number):Point{
 const actor=world.actors.find(a=>a.id===id);
 if(!actor)throw Error('Missing actor '+id);
 return [actor.x,actor.z];
}
export function closestDefender(world:World,point:Point){
 return [...world.actors.filter(a=>a.side==='defense')].sort((a,b)=>distance([a.x,a.z],point)-distance([b.x,b.z],point))[0];
}
export function pocketDistance(world:World):number{
 const qb=actorPoint(world,0);return Math.min(...world.actors.filter(a=>a.role==='DL'||(world.defense==='BLITZ'&&a.role==='LB')).map(a=>distance([a.x,a.z],qb)));
}
function updateActors(w:World,dt:number){
 const defenders=w.actors.filter(a=>a.side==='defense');
 for(const a of w.actors){
  if(a.role==='WR'||a.role==='RB'){
   if(a.role==='RB'&&!isEligible(a.id,w.call)){
    approach(a,[a.x*.5,w.yard+2],dt,6);continue;
   }
   const id=a.id as ReceiverId;
   const [x,dz]=routeAt(id,w.routes[id],w.call.formation,w.t);
   approach(a,[x,clamp(w.yard+dz,1,99)],dt, id===1?5.9:9.2);
  } else if(a.role==='OL'){
    // Each lineman engages a specific advancing rusher; protection changes pass-rush lanes.
    const rusher=defenders.find(d=>d.id===11+(a.id-2)%4);
    const block=rusher?[rusher.x,w.yard+1.7] as Point:[a.x,w.yard+2];
    approach(a,block,dt,3.2);
  } else if(a.role==='QB'){
    approach(a,[0,w.yard-6],dt,.6);
  } else if(a.role==='DL'){
    const lineman=w.actors.find(o=>o.id===2+(a.id-11));
    const guard=[lineman?.x??0,lineman?.z??w.yard] as Point;
    const separation=distance([a.x,a.z],guard);
    const rushSpeed=w.call.protection==='max'?1.5:w.call.protection==='slide'?2:2.6;
    approach(a,[0,w.yard-5],dt,separation<3.3?rushSpeed:4.3);
  } else if(a.role==='LB'){
    if(w.defense==='BLITZ'&&a.id===16){
      approach(a,[0,w.yard-5],dt,4.6);
    }else{
      const target=w.actors.find(o=>o.id===[10,1,9][a.id-15]);
      const to:Point=target?[target.x,target.z+2]:[a.x,w.yard+10];
      approach(a,to,dt,w.defense==='SOFT ZONE'?3.8:5.4);
    }
  } else if(a.role==='DB'){
    const target=w.actors.find(o=>o.id===a.targetId);
    if(!target)continue;
    // Quarterbacks can exploit the inside/outside leverage while man defenders trail.
    const zone=w.defense==='SOFT ZONE';
    const desired:Point=zone?
      [clamp(target.x*.68+(a.id%2?-4:4),-23,23),Math.max(w.yard+12,target.z+3.7)]:
      [clamp(target.x+(a.id%2?1.1:-1.1),-24,24),target.z+(w.defense==='BLITZ'?.4:2.2)];
    approach(a,desired,dt,zone?6.1:w.defense==='BLITZ'?7.1:6.65);
  }
  a.z=clamp(a.z,1,99);a.x=clamp(a.x,-25.5,25.5);
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
