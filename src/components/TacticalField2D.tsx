import {useEffect,useMemo,useRef,useState} from 'react';
import {newWorld,stepWorld,throwBall,predictLead,resultFromWorld,closestDefender,actorPoint,routeVertices,type World} from '../logic/spatial';
import {isEligible} from '../logic/tactics';
import type {Live,ThrowRequest} from './Board3D';
import type {GameState,Result,PlayId} from '../logic/drill';
import type {TacticalCall} from '../logic/tactics';
import type {RouteBook,Actor} from '../logic/spatial';
import type {ReceiverId} from '../logic/throwing';
import type {HistoricalPersonnel} from '../logic/nflRoster';

type Props={
 game:GameState;play:PlayId;call:TacticalCall;routes:RouteBook;live:Live|null;
 request:ThrowRequest|null;onTick:(n:number)=>void;onCoverage:(read:Record<number,number>)=>void;
 onResult:(result:Result)=>void; offenseColor:string;opponentColor:string;
 personnel:HistoricalPersonnel|null;preview?:boolean;
};
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
const targetIds=[7,8,9,10,1] as ReceiverId[];
const actorName=(actor:Actor,personnel:HistoricalPersonnel|null)=>{
 if(actor.id===0)return personnel?.qb.number??String(actor.number);
 if(targetIds.includes(actor.id as ReceiverId))return personnel?.skill[actor.id as ReceiverId].number??String(actor.number);
 return String(actor.number);
};
export default function TacticalField2D({game,play,call,routes,live,request,onTick,onCoverage,onResult,offenseColor,opponentColor,personnel,preview=false}:Props){
 const world=useMemo(()=>newWorld(game.yard,game.defense,play,call,routes,game.plays),[live?.id,game.plays,game.yard,game.defense,play,call,routes]);
 const [version,setVersion]=useState(0);
 const [selected,setSelected]=useState<ReceiverId|null>(null);
 const requestSeen=useRef<number|null>(null);
 const completed=useRef(false);
 const resultPause=useRef(0);
 const callbacks=useRef({onTick,onCoverage,onResult});
 callbacks.current={onTick,onCoverage,onResult};
 useEffect(()=>{requestSeen.current=null;completed.current=false;resultPause.current=0;setSelected(null);},[world]);
 useEffect(()=>{
  if(!live||!request||requestSeen.current===request.id)return;
  requestSeen.current=request.id;setSelected(request.receiver);
  const target=request.assisted?predictLead(world,request.receiver,request.style):request.point;
  throwBall(world,target,request.receiver,request.style);
 },[world,live,request]);
 useEffect(()=>{
  if(!live)return;
  let raf=0,last=0,lastVisual=0,lastRead=0,lastClock=-1;
  const frame=(now:number)=>{
   const dt=last?Math.min(.09,(now-last)/1000):0;last=now;
   if(!completed.current){
    let outcome=world.outcome;
    if(!outcome){
     const steps=Math.max(1,Math.ceil(dt/(1/60)));
     for(let i=0;i<steps&&!outcome;i++)outcome=stepWorld(world,dt/steps);
    }
    if(outcome){
     resultPause.current+=dt;
     if(resultPause.current>.46){
      completed.current=true;
      callbacks.current.onResult(resultFromWorld(game,world,outcome));
     }
    }
    if(Math.floor(world.t*5)!==lastClock){lastClock=Math.floor(world.t*5);callbacks.current.onTick(world.t);}
    if(world.t-lastRead>.17){
     lastRead=world.t;
     const read:Record<number,number>={};
     for(const id of targetIds){
      const spot=actorPoint(world,id),def=closestDefender(world,spot);
      read[id]=Math.round(Math.hypot(def.x-spot[0],def.z-spot[1])*10)/10;
     }
     callbacks.current.onCoverage(read);
    }
   }
   if(now-lastVisual>33){lastVisual=now;setVersion(v=>v+1);}
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  return ()=>cancelAnimationFrame(raf);
 },[world,game,live?.id]);
 const start=clamp(game.yard-18,0,35);
 const end=start+70;
 const toX=(x:number)=>clamp((x+27.5)/55*100,0,100);
 const toY=(z:number)=>((z-start)/(end-start))*100;
 const ball=world.flight?.position;
 const candidates=world.actors;
 const yards=Array.from({length:15},(_,i)=>Math.ceil(start/5)*5+i*5).filter(z=>z<=100);
 const routesShown=preview||!live;
 // Version is deliberately read for React to re-evaluate mutable actor positions each animation tick.
 void version;
 return <div className={'tactical-field '+(preview?'tactical-field-preview':'')} role="img" aria-label="Playable overhead football field with miniature player positions">
  <div className="tactical-field-sky"/>
  <div className="tactical-field-frame">
   <div className="tactical-field-turf">
    {yards.map(z=><div className="tactical-field-yard" key={z} style={{bottom:toY(z)+'%'}}>
     <span>{z<=50?z:100-z}</span><i/><span>{z<=50?z:100-z}</span>
    </div>)}
    <div className="tactical-field-line tactical-field-scrimmage" style={{bottom:toY(game.yard)+'%'}}><span>LINE OF SCRIMMAGE</span></div>
    <div className="tactical-field-line tactical-field-sticks" style={{bottom:toY(game.yard+game.toGo)+'%'}}><span>FIRST DOWN</span></div>
    {routesShown&&targetIds.filter(id=>isEligible(id,call)).map(id=>{
     const points=routeVertices(id,routes[id],call.formation);
     const path=points.map(([x,z])=>[toX(x),toY(game.yard+z)] as const).filter(p=>p[1]>=-5&&p[1]<=105);
     return <svg key={id} className="tactical-field-route" viewBox="0 0 100 100" preserveAspectRatio="none">
       <polyline points={path.map(([x,y])=>x+','+(100-y)).join(' ')} fill="none" stroke={id===7?'#ffe3a2':'#c0e9d6'} strokeWidth=".65" strokeDasharray="1.5 .7" opacity=".75"/>
     </svg>;
    })}
    {candidates.map(actor=>{
     const y=toY(actor.z);if(y< -3||y>103)return null;
     return <div key={actor.id} className={'tactical-field-figure '+(actor.side==='offense'?'offense':'defense')+(selected===actor.id?' throwing':'')}
       style={{left:toX(actor.x)+'%',bottom:y+'%',backgroundColor:actor.side==='offense'?offenseColor:opponentColor}}>
       {actorName(actor,personnel)}
     </div>;
    })}
    {ball&&<div className="tactical-field-ball" style={{left:toX(ball[0])+'%',bottom:toY(ball[2])+'%'}}/>}
    <div className="tactical-field-label">ELECTRIC FOOTBALL · ALL-22</div>
   </div>
  </div>
  <div className="tactical-field-caption"><b>{preview?'PLAYBOOK PREVIEW':live?'LIVE FIELD':'PRE-SNAP FORMATION'}</b><span>{preview?'Choose a concept, then break the huddle.':live?'PRESS A RECEIVER BUTTON TO THROW':'Tap SNAP to begin the play.'}</span></div>
 </div>;
}
