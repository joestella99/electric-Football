import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Defense, PlayId, Result } from '../logic/drill';
import { coveragePoint, passPlay, pressureLimit, receiverPoint, RECEIVERS, type Point, type ReceiverId } from '../logic/throwing';

export type Live = { id: number; play: PlayId };
export type Motion = { id: number; result: Result; startYard: number; aim?: Point; releaseAt?: number };
type View = 'sideline' | 'coach';
type Props = {
  yard: number; toGo: number; defense: Defense; play: PlayId; view: View;
  live: Live | null; motion: Motion | null; aim: Point; receiver: ReceiverId;
  onAim: (point: Point) => void; onThrow: (point: Point, id?: ReceiverId) => void;
  onSelect: (id: ReceiverId) => void; onTick: (seconds: number) => void;
  onSack: (seconds: number) => void; onDone: () => void;
};
const clip = (v: number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const O = '#f5d58e', D = '#d9634b';
const ballGeometry = new THREE.SphereGeometry(.58,10,8);

function CameraRig({yard,view,live,elapsed}:{yard:number;view:View;live:Live|null;elapsed:React.RefObject<number>}) {
  const camera=useThree(s=>s.camera);
  const size=useThree(s=>s.size);
  const target=useRef(new THREE.Vector3());
  useFrame((_,dt)=>{
    const aspect=size.width/Math.max(1,size.height);
    const mobile=aspect<1.12;
    const focus=clip(yard+12+(live?Math.min(29,elapsed.current*3.7):0),23,85);
    target.current.set(0,0,focus);
    const pose = view==='coach' ?
      new THREE.Vector3(0,(mobile?88:76)+(live?elapsed.current*1.4:0),focus+.01) :
      new THREE.Vector3(mobile?0:7,(mobile?65:49)+(live?Math.min(18,elapsed.current*2.4):0),focus-(mobile?44:36)-(live?Math.min(14,elapsed.current*1.8):0));
    const k=1-Math.exp(-dt*3.5);
    camera.position.lerp(pose,k);
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
    {Array.from({length:99},(_,i)=>i+1).map(z=><group key={z}>{[-1,1].map(s=><mesh key={s} position={[s*8,.41,z]}><boxGeometry args={[1,.02,.15]}/><meshBasicMaterial color="#f3e5cd" transparent opacity={.74}/></mesh>)}</group>)}
    <Text position={[0,.43,4]} rotation={[-Math.PI/2,0,0]} fontSize={4} letterSpacing={.19} color="#e8dfc3">HOME</Text>
    <Text position={[0,.43,96]} rotation={[-Math.PI/2,0,Math.PI]} fontSize={4} letterSpacing={.19} color="#f2c9a6">AWAY</Text>
    <mesh position={[0,.54,clip(yard,1,99)]}><boxGeometry args={[54,.12,.29]}/><meshBasicMaterial color="#5ddaff" transparent opacity={.94}/></mesh>
    <mesh position={[0,.54,clip(yard+toGo,1,99)]}><boxGeometry args={[54,.12,.31]}/><meshBasicMaterial color="#f7d161" transparent opacity={.98}/></mesh>
    <Text position={[-23,.61,clip(yard+toGo+2,1,99)]} rotation={[-Math.PI/2,0,0]} fontSize={1.45} color="#ffe28d">1ST DOWN</Text>
  </group>;
}
function Figure({number,side,x,z,role,living,select}:{number:number;side:'o'|'d';x:number;z:number;role:string;living:boolean;select:boolean}){
  return <group position={[x,0,z]} rotation={[0,side==='o'?0:Math.PI,0]}>
    <mesh position={[0,.51,0]}><boxGeometry args={[1.84,.30,1.62]}/><meshStandardMaterial color={side==='o'?'#b78031':'#9c3029'} roughness={.39}/></mesh>
    {[.67,-.67].map(e=><mesh key={e} position={[e,.22,0]}><boxGeometry args={[.2,.13,1.75]}/><meshStandardMaterial color="#292621" roughness={.94}/></mesh>)}
    {select&&<mesh position={[0,.67,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.2,1.49,24]}/><meshBasicMaterial color="#fff2ac" depthTest={false} side={THREE.DoubleSide}/></mesh>}
    {[-.47,.47].map(s=><group key={s}>
      <mesh position={[s,.98,0]}><boxGeometry args={[.45,.72,.55]}/><meshStandardMaterial color={side==='o'?'#d8a452':'#b74a3d'}/></mesh>
      <mesh position={[s,1.2,-.28]}><boxGeometry args={[.48,.27,.66]}/><meshStandardMaterial color="#3a322d"/></mesh>
    </group>)}
    <mesh position={[0,1.78,0]}><boxGeometry args={[1.38,1.1,.88]}/><meshStandardMaterial color={side==='o'?O:D} roughness={.52}/></mesh>
    <mesh position={[0,2.20,0]}><boxGeometry args={[1.77,.28,1.05]}/><meshStandardMaterial color={side==='o'?'#9f793d':'#a03931'}/></mesh>
    {[-1,1].map(s=><mesh key={s} position={[s*.95,1.75,.15]} rotation={[.2,0,s*.23]}><boxGeometry args={[.34,.96,.42]}/><meshStandardMaterial color={side==='o'?O:D}/></mesh>)}
    <mesh position={[0,2.86,0]}><sphereGeometry args={[.61,8,6]}/><meshStandardMaterial flatShading color={side==='o'?'#e5b668':'#bb4b3c'} roughness={.4}/></mesh>
    <mesh position={[0,2.79,.49]}><boxGeometry args={[1.02,.18,.25]}/><meshStandardMaterial color="#f7e5c6" metalness={.2}/></mesh>
    <Text position={[0,1.81,.452]} fontSize={.58} color={side==='o'?'#593e22':'#ffe5cf'}>{number}</Text>
    {role==='QB'&&living&&<pointLight color="#ffdb8c" position={[0,3,0]} intensity={.5} distance={6}/>}
  </group>;
}
type Member={id:number;side:'o'|'d';x:number;z:number;num:number;role:string};
function lineup(yard:number,defense:Defense):Member[]{
  const offense:Member[]=[
    {id:0,side:'o',x:0,z:yard-5,num:12,role:'QB'},
    {id:1,side:'o',x:3.5,z:yard-9,num:22,role:'RB'},
    ...[-8,-4,0,4,8].map((x,i)=>({id:2+i,side:'o' as const,x,z:yard-1,num:60+i,role:'OL'})),
    {id:7,side:'o',x:-22,z:yard-2,num:81,role:'WR'},
    {id:8,side:'o',x:22,z:yard-2,num:14,role:'WR'},
    {id:9,side:'o',x:13,z:yard-1,num:87,role:'TE'},
    {id:10,side:'o',x:-13,z:yard-3,num:11,role:'SLOT'}
  ];
  const front=defense==='BLITZ'?1.9:2.4;
  const lb=defense==='BLITZ'?4.7:defense==='LOADED BOX'?6:10;
  const deep=defense==='SOFT ZONE'?23:16;
  return [...offense,
    ...[-8,-2,4,10].map((x,i)=>({id:11+i,side:'d' as const,x,z:yard+front,num:90+i,role:'DL'})),
    ...[-12,0,12].map((x,i)=>({id:15+i,side:'d' as const,x,z:yard+lb,num:50+i,role:'LB'})),
    ...[-22,-8,8,22].map((x,i)=>({id:18+i,side:'d' as const,x,z:yard+deep+(i%2)*3,num:20+i,role:'DB'}))
  ];
}
function Player({member,yard,defense,live,motion,elapsed,progress,selected}:{member:Member;yard:number;defense:Defense;live:Live|null;motion:Motion|null;elapsed:React.RefObject<number>;progress:React.RefObject<number>;selected:ReceiverId}){
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{
    if(!ref.current)return;
    const p=motion?progress.current:0;
    const t=live?elapsed.current:motion?.releaseAt!==undefined?motion.releaseAt+p*1.5:0;
    let x=member.x,z=member.z;
    const pass=live?.play??motion?.result.play;
    if((live || (motion?.releaseAt!==undefined)) && pass && passPlay(pass)){
      if(member.side==='o' && [1,7,8,9,10].includes(member.id)){
        [x,z]=receiverPoint(member.id as ReceiverId,pass,yard,t);
      }else if(member.side==='o'&&member.role==='QB'){
        z=yard-5-Math.min(t*1.15,2.5);
      }else if(member.side==='d' && member.role==='DB'){
        [x,z]=coveragePoint(member.id-18,defense,yard,t);
      }else if(member.side==='d'){
        z=member.z-Math.min(t*(member.role==='DL'?4.5:3),15);
      }else if(member.side==='o'&&member.role==='OL')z=member.z+Math.min(t*1.15,3.5);
    } else if(motion){
      if(member.side==='o'){
        if(member.role==='RB'){x+=motion.result.play==='outside'?12*p:0;z+=Math.max(0,motion.result.yards+8)*p;}
        else if(member.role==='OL')z+=2*p;
        else if(member.role==='QB')z-=1.5*p;
        else z+=Math.min(8,Math.max(0,motion.result.yards))*p;
      } else z-=3*p;
    }
    ref.current.position.set(x, Math.abs(Math.sin(clock.elapsedTime*26+member.id))*(live||motion?.result?.play? .06:.014),clip(z,1,99));
  });
  return <group ref={ref}>
    <Figure x={0} z={0} side={member.side} number={member.num} role={member.role} living={!!live} select={!!live&&member.id===selected}/>
  </group>;
}
function Routes({yard,play,receiver}:{yard:number;play:PlayId;receiver:ReceiverId}){
  if(!passPlay(play))return null;
  return <group>{RECEIVERS.map(r=>{
    const points=Array.from({length:18},(_,i)=>{
      const [x,z]=receiverPoint(r.id,play,yard,i*.34);
      return [x,.61,z] as [number,number,number];
    });
    return <Line key={r.id} points={points} color={r.id===receiver?'#ffe09a':'#b7dcac'} opacity={r.id === receiver ? .95 : .36} transparent lineWidth={1.5} dashed dashSize={.7} gapSize={.45}/>;
  })}</group>;
}
function Clock({live,motion,defense,elapsed,progress,onTick,onSack,onDone}:{live:Live|null;motion:Motion|null;defense:Defense;elapsed:React.RefObject<number>;progress:React.RefObject<number>;onTick:(n:number)=>void;onSack:(n:number)=>void;onDone:()=>void}){
  const fired=useRef(false);
  const lastTick=useRef(-1);
  useEffect(()=>{elapsed.current=0;lastTick.current=-1;fired.current=false;},[live?.id,elapsed]);
  useEffect(()=>{progress.current=0;fired.current=false;},[motion?.id,progress]);
  useFrame((_,dt)=>{
    if(live&&!fired.current){
      elapsed.current=Math.min(pressureLimit(defense),elapsed.current+Math.min(dt,.07));
      const tenth=Math.floor(elapsed.current*10);
      if(lastTick.current!==tenth){lastTick.current=tenth;onTick(elapsed.current);}
      if(elapsed.current>=pressureLimit(defense)){fired.current=true;onSack(elapsed.current);}
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
function Beacon({id,play,yard,live,elapsed,selected,onSelect}:{id:ReceiverId;play:PlayId;yard:number;live:Live|null;elapsed:React.RefObject<number>;selected:boolean;onSelect:(id:ReceiverId)=>void}){
  const grp=useRef<THREE.Group>(null);
  const receiver=RECEIVERS.find(r=>r.id===id)!;
  useFrame(()=>{
    if(!grp.current||!live)return;
    const [x,z]=receiverPoint(id,play,yard,elapsed.current);
    grp.current.position.set(x,4.8,z);
  });
  if(!live)return null;
  return <group ref={grp}>
    <Html center distanceFactor={21} zIndexRange={[50,10]} style={{pointerEvents:'auto'}}>
      <button type="button" className={'player-beacon '+(selected?'is-selected':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(id);}} title={'Target #'+receiver.number+' '+receiver.label}>
        <span>{receiver.number}</span><strong>{receiver.label}</strong>
      </button>
    </Html>
  </group>;
}
function Target({aim,active}:{aim:Point;active:boolean}){
  if(!active)return null;
  return <group position={[aim[0],.65,aim[1]]}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.22,1.6,24]}/><meshBasicMaterial color="#ffeb9a" transparent opacity={.93} depthTest={false} side={THREE.DoubleSide}/></mesh>
    <mesh><sphereGeometry args={[.18,8,6]}/><meshBasicMaterial color="#fff5ba" depthTest={false}/></mesh>
  </group>;
}
function Scene(props:Props){
  const {yard,toGo,defense,play,view,live,motion,aim,receiver,onAim,onThrow,onSelect,onTick,onSack,onDone}=props;
  const elapsed=useRef(0);
  const progress=useRef(0);
  const displayYard=motion?.startYard??yard;
  const members=useMemo(()=>lineup(displayYard,defense),[displayYard,defense]);
  return <>
    <color attach="background" args={['#151b1a']}/>
    <ambientLight intensity={1.75} color="#fff1d7"/>
    <directionalLight position={[28,70,-16]} intensity={2.15} color="#fce8c6"/>
    <directionalLight position={[-20,30,70]} intensity={.7} color="#9bdbd5"/>
    <CameraRig yard={displayYard} view={view} live={live} elapsed={elapsed}/>
    <WoodCabinet/>
    <Field yard={displayYard} toGo={toGo}/>
    {!motion&&<Routes yard={displayYard} play={play} receiver={receiver}/>}
    <Clock live={live} motion={motion} defense={defense} elapsed={elapsed} progress={progress} onTick={onTick} onSack={onSack} onDone={onDone}/>
    {members.map(m=><Player key={m.id} member={m} yard={displayYard} defense={defense} live={live} motion={motion} elapsed={elapsed} progress={progress} selected={receiver}/>)}
    <Ball yard={displayYard} motion={motion} progress={progress}/>
    {RECEIVERS.map(r=><Beacon key={r.id} id={r.id} play={play} yard={displayYard} elapsed={elapsed} live={live} selected={r.id===receiver} onSelect={onSelect}/>)}
    <Target aim={aim} active={!!live}/>
    {!!live && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.78,50]}
      onPointerMove={e=>{e.stopPropagation();onAim([clip(e.point.x,-25,25),clip(e.point.z,1,99)]);}}
      onPointerDown={e=>{e.stopPropagation();onThrow([clip(e.point.x,-25,25),clip(e.point.z,1,99)]);}}>
      <planeGeometry args={[53.9,99]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>}
  </>;
}
export default function Board3D(props:Props){
  return <Canvas camera={{position:[7,50,props.yard-25],fov:43,near:.1,far:260}}
    dpr={[.85,1.4]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
    style={{width:'100%',height:'100%',touchAction:'none'}}
    fallback={<div className="webgl-error">3D requires a WebGL-capable browser with hardware acceleration.</div>}>
    <Scene {...props}/>
  </Canvas>;
}
