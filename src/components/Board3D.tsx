import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { StadiumDiorama } from './Stadium';
import { isEligible, type TacticalCall } from '../logic/tactics';
import InstancedPlayers from './InstancedPlayers';
import { actorPoint, closestDefender, newWorld, predictLead, routeVertices, stepWorld, throwBall as releaseSpatialBall, resultFromWorld, TARGETS, type RouteBook, type World } from '../logic/spatial';
import type { GameState } from '../logic/drill';
import type { Defense, PlayId, Result } from '../logic/drill';
import { passPlay, pressureLimit, RECEIVERS, type Point, type ReceiverId } from '../logic/throwing';

export type Live = { id: number; play: PlayId };
export type ThrowRequest = { id: number; point: Point; receiver: ReceiverId; assisted?: boolean };
export type Motion = { id: number; result: Result; startYard: number; aim?: Point; releaseAt?: number };
type View = 'sideline' | 'coach';
type Props = {
  yard: number; toGo: number; defense: Defense; play: PlayId; view: View; call: TacticalCall;
  game: GameState; routes: RouteBook; drawTarget: ReceiverId|null; throwRequest:ThrowRequest|null;
  onDrawPoint:(point:Point)=>void; onSpatialResult:(result:Result)=>void;
  onAutoThrow:(receiver:ReceiverId)=>void;
  onLead:(point:Point)=>void; assistAim:boolean;
  quality:'performance'|'balanced'|'high'; onFps:(fps:number)=>void;
  onCoverage:(read:Record<number,number>)=>void;
  live: Live | null; motion: Motion | null; aim: Point; receiver: ReceiverId;
  onAim: (point: Point) => void; onThrow: (point: Point, id?: ReceiverId) => void;
  onSelect: (id: ReceiverId) => void; onTick: (seconds: number) => void;
  onDone: () => void;
};
const clip = (v: number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const ballGeometry = new THREE.SphereGeometry(.58,10,8);

function CameraRig({yard,view,live,elapsed}:{yard:number;view:View;live:Live|null;elapsed:React.RefObject<number>}) {
  const camera=useThree(s=>s.camera);
  const size=useThree(s=>s.size);
  const target=useRef(new THREE.Vector3(0,0,clip(yard+12,23,85)));
  const pose=useRef(new THREE.Vector3());
  useFrame((_,dt)=>{
    const aspect=size.width/Math.max(1,size.height);
    const mobile=aspect<1.12;
    const focus=clip(yard+12+(live?Math.min(29,elapsed.current*3.7):0),23,85);
    const k=1-Math.exp(-dt*4.3);
    target.current.z+=(focus-target.current.z)*k;
    if(view==='coach')pose.current.set(0,(mobile?88:76)+(live?elapsed.current*1.4:0),focus+.01);
    else pose.current.set(mobile?0:7,(mobile?65:49)+(live?Math.min(18,elapsed.current*2.4):0),focus-(mobile?44:36)-(live?Math.min(14,elapsed.current*1.8):0));
    camera.position.lerp(pose.current,k);
    camera.lookAt(target.current);
    if(camera instanceof THREE.PerspectiveCamera){
      const fov=mobile?53:43;
      if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    }
  });
  return null;
}
function WoodCabinet(){
  return <group>
    <mesh position={[0,-1.2,50]} receiveShadow>
      <boxGeometry args={[62,2.4,112]}/><meshStandardMaterial color="#963e31" roughness={.44} metalness={.18}/>
    </mesh>
    <mesh position={[0,.025,50]}><boxGeometry args={[57,.55,105]}/><meshStandardMaterial color="#ccae78" metalness={.13} roughness={.6}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*28.5,.65,50]}><boxGeometry args={[2.4,1.4,108]}/><meshStandardMaterial color="#a54738" roughness={.48}/></mesh>)}
    {[0,100].map(z=><mesh key={z} position={[0,.65,z]}><boxGeometry args={[59,1.4,2.4]}/><meshStandardMaterial color="#a54738" roughness={.48}/></mesh>)}
    <mesh position={[0,-2.48,50]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[220,220]}/><meshStandardMaterial color="#161a18" roughness={1}/></mesh>
    <Text position={[-26.35,1.4,50]} rotation={[-Math.PI/2,0,-Math.PI/2]} color="#f5d09a" fontSize={1.2} letterSpacing={.15}>ELECTRIC FOOTBALL</Text>
    <Text position={[26.35,1.4,50]} rotation={[-Math.PI/2,0,Math.PI/2]} color="#f5d09a" fontSize={1.2} letterSpacing={.15}>THE TWO MINUTE DRILL</Text>
  </group>;
}
function HashMarks(){
  const mesh=useRef<THREE.InstancedMesh>(null);
  useEffect(()=>{
    if(!mesh.current)return;
    const obj=new THREE.Object3D();
    let count=0;
    for(let z=1;z<100;z++)for(const side of [-1,1]){
      obj.position.set(side*8,.418,z);
      obj.scale.set(1,.018,.15);
      obj.rotation.set(0,0,0);
      obj.updateMatrix();mesh.current.setMatrixAt(count++,obj.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  },[]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,198]} frustumCulled={false}>
    <boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#e7ddc6"/>
  </instancedMesh>;
}
function Field({yard,toGo}:{yard:number;toGo:number}){
  return <group>
    <mesh position={[0,.34,50]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[55,101]}/><meshStandardMaterial color="#275e49" roughness={.94}/>
    </mesh>
    {Array.from({length:10},(_,i)=><mesh key={i} position={[0,.348,5+i*10]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[54.8,10]}/><meshBasicMaterial color={i%2===0?'#306d52':'#285c45'}/>
    </mesh>)}
    {[5,95].map((z,i)=><mesh key={z} position={[0,.37,z]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[54.7,10]}/><meshBasicMaterial color={i?'#b04f3f':'#273e53'}/>
    </mesh>)}
    {Array.from({length:21},(_,i)=>{
      const z=i*5;
      return <group key={i}>
        <mesh position={[0,.397,z]}><boxGeometry args={[54,.027,i%2===0?.2:.085]}/><meshBasicMaterial color="#f1e4c5" transparent opacity={i%2===0?.96:.6}/></mesh>
        {i>0&&i<20&&i%2===0&&[-1,1].map(side=><Text key={side} position={[side*20,.405,z+2.1]} rotation={[-Math.PI/2,0,side<0?Math.PI:0]} fontSize={2.85} anchorX="center" color="#e4e5c9">{Math.min(i,20-i)*5}</Text>)}
      </group>;
    })}
    <HashMarks/>
    <Text position={[0,.43,4]} rotation={[-Math.PI/2,0,0]} fontSize={4} letterSpacing={.19} color="#e8dfc3">HOME</Text>
    <Text position={[0,.43,96]} rotation={[-Math.PI/2,0,Math.PI]} fontSize={4} letterSpacing={.19} color="#f2c9a6">AWAY</Text>
    <mesh position={[0,.54,clip(yard,1,99)]}><boxGeometry args={[54,.12,.29]}/><meshBasicMaterial color="#5ddaff" transparent opacity={.94}/></mesh>
    <mesh position={[0,.54,clip(yard+toGo,1,99)]}><boxGeometry args={[54,.12,.31]}/><meshBasicMaterial color="#f7d161" transparent opacity={.98}/></mesh>
    <Text position={[-23,.61,clip(yard+toGo+2,1,99)]} rotation={[-Math.PI/2,0,0]} fontSize={1.45} color="#ffe28d">1ST DOWN</Text>
  </group>;
}
function Clock({live,motion,defense,protection,elapsed,progress,onTick,onSack,onDone}:{live:Live|null;motion:Motion|null;defense:Defense;protection:TacticalCall['protection'];elapsed:React.RefObject<number>;progress:React.RefObject<number>;onTick:(n:number)=>void;onSack:(n:number)=>void;onDone:()=>void}){
  const fired=useRef(false);
  const lastTick=useRef(-1);
  useEffect(()=>{elapsed.current=0;lastTick.current=-1;fired.current=false;},[live?.id,elapsed]);
  useEffect(()=>{progress.current=0;fired.current=false;},[motion?.id,progress]);
  useFrame((_,dt)=>{
    if(live&&!fired.current){
      elapsed.current=Math.min(pressureLimit(defense,protection),elapsed.current+Math.min(dt,.07));
      const tenth=Math.floor(elapsed.current*10);
      if(lastTick.current!==tenth){lastTick.current=tenth;onTick(elapsed.current);}
      if(elapsed.current>=pressureLimit(defense,protection)){fired.current=true;onSack(elapsed.current);}
    }
    if(motion&&!fired.current){
      progress.current=Math.min(1,progress.current+Math.min(dt,.08)/1.15);
      if(progress.current>=1){fired.current=true;onDone();}
    }
  });
  return null;
}
function Ball({yard,motion,progress}:{yard:number;motion:Motion|null;progress:React.RefObject<number>}){
  const ref=useRef<THREE.Mesh>(null);
  useFrame(()=>{
    if(!ref.current)return;
    const p=progress.current;
    if(!motion){ref.current.position.set(0,3.12,yard-5);ref.current.rotation.z=0;return;}
    const target=motion.aim??[motion.result.play==='outside'?16:4,clip(yard+motion.result.yards,1,99)];
    const airborne=passPlay(motion.result.play)||motion.result.play==='fieldgoal';
    ref.current.position.set(target[0]*p,3.1+(airborne?Math.sin(Math.PI*p)*Math.min(8,3+Math.abs(target[1]-yard)*.15):.25*Math.sin(p*Math.PI)),yard-5+(target[1]-(yard-5))*p);
    ref.current.rotation.z=p*7.1;
  });
  return <mesh ref={ref} geometry={ballGeometry} scale={[1.3,.72,.75]}><meshStandardMaterial color="#7f3b21" roughness={.55}/></mesh>;
}
function Target({aim,active}:{aim:Point;active:boolean}){
  if(!active)return null;
  return <group position={[aim[0],.65,aim[1]]}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.22,1.6,24]}/><meshBasicMaterial color="#ffeb9a" transparent opacity={.93} depthTest={false} side={THREE.DoubleSide}/></mesh>
    <mesh><sphereGeometry args={[.18,8,6]}/><meshBasicMaterial color="#fff5ba" depthTest={false}/></mesh>
  </group>;
}
function SpatialBall({world}:{world:World}){
  const mesh=useRef<THREE.Mesh>(null);
  useFrame(()=>{
    if(!mesh.current)return;
    if(world.flight){
      const [x,y,z]=world.flight.position;
      mesh.current.position.set(x,y,z);
      mesh.current.rotation.x=world.flight.elapsed*19;
    }else{
      const [x,z]=actorPoint(world,0);
      mesh.current.position.set(x,2.7,z);
      mesh.current.rotation.x=0;
    }
  });
  return <mesh ref={mesh} geometry={ballGeometry} scale={[1.2,.7,.7]} castShadow>
    <meshStandardMaterial color="#864123" roughness={.56}/>
  </mesh>;
}
function CatchFlash({world}:{world:World}){
  const ring=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{
    if(!ring.current)return;
    ring.current.visible=!!world.outcome&&!!world.flight;
    if(!world.outcome||!world.flight)return;
    const [x,z]=world.flight.target;
    ring.current.position.set(x,.97,z);
    const pulse=1.2+(Math.sin(clock.elapsedTime*13)+1)*.2;
    ring.current.scale.setScalar(pulse);
    const material=ring.current.material as THREE.MeshBasicMaterial;
    material.color.set(world.outcome.kind==='catch'?'#b9f19b':world.outcome.kind==='interception'?'#ef735c':'#ffe08f');
  });
  return <mesh ref={ring} visible={false} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[1.1,1.47,24]}/><meshBasicMaterial color="#ffe09a" side={THREE.DoubleSide} transparent opacity={.95} depthTest={false}/>
  </mesh>;
}
function BallTrail({world}:{world:World}){
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{
    if(!ref.current)return;
    const flight=world.flight;
    ref.current.visible=!!flight&&world.phase==='flight';
    if(!flight)return;
    const p=flight.elapsed/flight.duration;
    for(let i=0;i<ref.current.children.length;i++){
      const fraction=Math.max(0,p-(i+1)*.035);
      const arc=Math.sin(Math.PI*fraction)*Math.min(8.5,2.5+Math.hypot(flight.target[0]-flight.from[0],flight.target[1]-flight.from[1])*.15);
      ref.current.children[i].position.set(
        flight.from[0]+(flight.target[0]-flight.from[0])*fraction,
        2.5+arc,
        flight.from[1]+(flight.target[1]-flight.from[1])*fraction
      );
    }
  });
  return <group ref={ref} visible={false}>{[.19,.15,.12,.09,.06].map((size,i)=><mesh key={i}>
    <sphereGeometry args={[size,8,6]}/><meshBasicMaterial color={i<2?'#f2d49d':'#d7a66d'} transparent opacity={.72-i*.11} depthWrite={false}/>
  </mesh>)}</group>;
}
function SpatialClock({world,request,game,onTick,onCoverage,onSpatialResult,onLead,assistAim,selected,elapsed}:{world:World;request:ThrowRequest|null;game:GameState;onTick:(n:number)=>void;onCoverage:(read:Record<number,number>)=>void;onSpatialResult:(result:Result)=>void;onLead:(point:Point)=>void;assistAim:boolean;selected:ReceiverId;elapsed:React.RefObject<number>}){
  const reported=useRef(false);
  const resolvedHold=useRef(0);
  const lastTick=useRef(-1);
  const lastCoverage=useRef(-1);
  useEffect(()=>{reported.current=false;resolvedHold.current=0;lastTick.current=-1;lastCoverage.current=-1;elapsed.current=0;},[world,elapsed]);
  useEffect(()=>{
    if(!request||world.phase!=='live')return;
    releaseSpatialBall(world,request.assisted?predictLead(world,request.receiver):request.point,request.receiver);
  },[request?.id,world]);
  useFrame((_,dt)=>{
    if(reported.current)return;
    const frame=Math.min(.10,Math.max(0,dt));
    const steps=Math.max(1,Math.min(6,Math.ceil(frame/(1/60))));
    let outcome=null;
    for(let i=0;i<steps&&!outcome;i++)outcome=stepWorld(world,frame/steps);
    elapsed.current=world.t;
    const ticks=Math.floor(world.t*5);
    if(ticks!==lastTick.current){lastTick.current=ticks;onTick(world.t);}
    const coverageTick=Math.floor(world.t*2);
    if(coverageTick!==lastCoverage.current){
      lastCoverage.current=coverageTick;
      const read:Record<number,number>={};
      for(const id of TARGETS){
        const spot=actorPoint(world,id);
        const defender=closestDefender(world,spot);
        read[id]=Math.round(Math.hypot(defender.x-spot[0],defender.z-spot[1])*10)/10;
      }
      onCoverage(read);
      if(assistAim&&world.phase==='live'&&isEligible(selected,world.call))onLead(predictLead(world,selected));
    }
    if(outcome){
      resolvedHold.current+=dt;
      if(resolvedHold.current>=.43){
        reported.current=true;
        onSpatialResult(resultFromWorld(game,world,outcome));
      }
    }
  });
  return null;
}
function SpatialBeacon({world,id,selected,onAutoThrow}:{world:World;id:ReceiverId;selected:boolean;onAutoThrow:(id:ReceiverId)=>void}){
  const marker=useRef<THREE.Group>(null);
  const receiver=RECEIVERS.find(r=>r.id===id)!;
  useFrame(()=>{
    if(!marker.current)return;
    const [x,z]=actorPoint(world,id);
    marker.current.position.set(x,5.4,z);
  });
  if(!isEligible(id,world.call)||world.phase!=='live')return null;
  const spot=actorPoint(world,id);
  const defender=closestDefender(world,spot);
  const gap=Math.hypot(defender.x-spot[0],defender.z-spot[1]);
  const window=gap>7?'is-open':gap>3.5?'is-window':'is-covered';
  return <group ref={marker}>
    <Html center distanceFactor={22} style={{pointerEvents:'auto'}}>
      <button className={'player-beacon '+window+' '+(selected?'is-selected':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onAutoThrow(id);}}>
        <span>{receiver.number}</span><strong>{receiver.label}</strong>
      </button>
    </Html>
  </group>;
}
function RouteLines({yard,play,call,routes,selected,live}:{yard:number;play:PlayId;call:TacticalCall;routes:RouteBook;selected:ReceiverId;live:boolean}){
  if(!passPlay(play))return null;
  return <group>{TARGETS.filter(id=>isEligible(id,call)).map(id=>{
    const vertices=routeVertices(id,routes[id],call.formation);
    const points=vertices.map(([x,z])=>[x,.85,Math.max(1,Math.min(99,yard+z))] as [number,number,number]);
    return <group key={id}>
      <Line points={points} color={id===selected?'#ffe1a4':'#95d3c3'} transparent opacity={id===selected ? .92 : live ? .22 : .4}
        lineWidth={id===selected?3:1.5} dashed dashSize={1.1} gapSize={.6}/>
      {!live && <mesh position={[points.at(-1)![0],.9,points.at(-1)![2]]} rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[.38,.64,12]}/><meshBasicMaterial color={id===selected?'#ffe1a4':'#b6ddd0'} side={THREE.DoubleSide}/>
      </mesh>}
    </group>;
  })}</group>;
}
const MemoField=memo(Field);
const MemoCabinet=memo(WoodCabinet);
function PerformanceSampler({onFps}:{onFps:(fps:number)=>void}){
  const samples=useRef({elapsed:0,frames:0});
  useFrame((_,dt)=>{
    const s=samples.current;
    s.elapsed+=Math.min(.2,dt);s.frames++;
    if(s.elapsed>=2){
      onFps(Math.round(s.frames/s.elapsed));
      s.frames=0;s.elapsed=0;
    }
  });
  return null;
}
function Scene(props:Props){
  const {yard,toGo,defense,play,view,call,live,motion,aim,receiver,routes,drawTarget,throwRequest,game,onAim,onDrawPoint,onThrow,onAutoThrow,onLead,assistAim,onTick,onCoverage,onSpatialResult,onDone,quality,onFps}=props;
  const elapsed=useRef(0),progress=useRef(0),lastHover=useRef(0);
  const displayYard=motion?.startYard??yard;
  const previewWorld=useMemo(()=>newWorld(displayYard,defense,play,call,routes),[displayYard,defense,play,call,routes]);
  const world=useMemo(()=>live?newWorld(yard,defense,play,call,routes):null,[live?.id]);
  return <>
    <color attach="background" args={['#111a18']}/>
    <fog attach="fog" args={['#111a18',125,235]}/>
    <ambientLight intensity={1.35} color="#fff0d2"/>
    <directionalLight position={[28,70,-16]} intensity={2.05} color="#fce8c6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
    <directionalLight position={[-20,30,70]} intensity={.7} color="#9bdbd5"/>
    <CameraRig yard={displayYard} view={view} live={live} elapsed={elapsed}/>
    <PerformanceSampler onFps={onFps}/>
    <StadiumDiorama crowd={quality!=='performance'}/>
    <MemoCabinet/>
    <MemoField yard={displayYard} toGo={toGo}/>
    {!motion && <RouteLines yard={displayYard} play={play} call={call} routes={routes} selected={receiver} live={!!live}/>}
    {world ? <>
      <SpatialClock world={world} request={throwRequest} game={game} elapsed={elapsed} selected={receiver} assistAim={assistAim} onLead={onLead}
        onTick={onTick} onCoverage={onCoverage} onSpatialResult={onSpatialResult}/>
      <InstancedPlayers world={world} active={true} motion={null} progress={progress} selected={receiver}/>
      <SpatialBall world={world}/>
      <BallTrail world={world}/>
      <CatchFlash world={world}/>
      {TARGETS.map(id=><SpatialBeacon key={id} world={world} id={id} selected={id===receiver} onAutoThrow={onAutoThrow}/>)}
      <Target aim={aim} active={world.phase==='live'}/>
    </> : <>
      <Clock live={null} motion={motion} defense={defense} protection={call.protection} elapsed={elapsed} progress={progress} onTick={onTick} onSack={()=>{}} onDone={onDone}/>
      <InstancedPlayers world={previewWorld} active={false} motion={motion} progress={progress} selected={receiver}/>
      <Ball yard={displayYard} motion={motion} progress={progress}/>
    </>}
    {(drawTarget!==null&&!live&&!motion||!!world&&world.phase==='live') &&
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,1.2,50]}
        onPointerMove={e=>{
          if(!world||world.phase!=='live')return;
          if(performance.now()-lastHover.current<185)return;
          lastHover.current=performance.now();onAim([clip(e.point.x,-25,25),clip(e.point.z,1,99)]);
        }}
        onPointerDown={e=>{
          e.stopPropagation();
          const point:Point=[clip(e.point.x,-25,25),clip(e.point.z,1,99)];
          if(drawTarget!==null&&!world)onDrawPoint(point);
          else if(world?.phase==='live')onThrow(point);
        }}>
        <planeGeometry args={[54,99]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide}/>
      </mesh>}
  </>;
}
export default function Board3D(props:Props){
  return <Canvas camera={{position:[7,50,props.yard-25],fov:43,near:.1,far:260}}
    dpr={props.quality==='performance'?[.6,.75]:props.quality==='high'?[1,1.45]:[.7,1.05]} gl={{antialias:props.quality!=='performance',alpha:false,powerPreference:'high-performance'}}
    style={{width:'100%',height:'100%',touchAction:'none'}}
    fallback={<div className="webgl-error">3D requires a WebGL-capable browser with hardware acceleration.</div>}>
    <Scene {...props}/>
  </Canvas>;
}
