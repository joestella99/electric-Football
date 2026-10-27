import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Defense, PlayId, Result } from '../logic/drill';

export type Motion = { id: number; result: Result; startYard: number };
type Props = { yard: number; defense: Defense; selectedPlay: PlayId; view: 'angled' | 'top'; motion: Motion | null; onDone: () => void };

type Figure = { id: number; side: 'offense' | 'defense'; position: [number, number]; number: number; role: string };
const GOLD = '#f9ca66', OFF = '#ead29e', DEF = '#c74c43', INK = '#193a39';
const formation = (yard: number, defense: Defense): Figure[] => {
  const o: Figure[] = [
    { id: 0, role: 'QB', number: 12, position: [0, yard - 5], side: 'offense' },
    { id: 1, role: 'RB', number: 22, position: [3.3, yard - 9], side: 'offense' },
    ...[-9,-4.5,0,4.5,9].map((x,i) => ({ id: 2+i, role: 'OL', number: 60+i, position: [x, yard-.9] as [number,number], side: 'offense' as const })),
    { id: 7, role: 'WR', number: 81, position: [-22, yard - 2.1], side: 'offense' },
    { id: 8, role: 'WR', number: 14, position: [22, yard - 2.1], side: 'offense' },
    { id: 9, role: 'TE', number: 87, position: [13.3, yard - 1], side: 'offense' },
    { id: 10, role: 'SLOT', number: 11, position: [-14.4, yard - 3.2], side: 'offense' },
  ];
  const front = defense === 'BLITZ' ? 1.8 : 2.3;
  const second = defense === 'BLITZ' ? 4.5 : defense === 'LOADED BOX' ? 5.5 : 10;
  const deep = defense === 'SOFT ZONE' ? 23 : 16;
  const d: Figure[] = [
    ...[-8,-2.5,3.5,9].map((x,i)=>({id:11+i,role:'DL',number:90+i,position:[x,yard+front] as [number,number],side:'defense' as const})),
    ...[-12,0,12].map((x,i)=>({id:15+i,role:'LB',number:50+i,position:[x,yard+second] as [number,number],side:'defense' as const})),
    ...[-22,-8,8,22].map((x,i)=>({id:18+i,role:'DB',number:20+i,position:[x,yard+deep+(i%2)*3] as [number,number],side:'defense' as const})),
  ];
  return [...o,...d];
};
const clamp = (n:number, min:number,max:number)=> Math.max(min,Math.min(max,n));

function Frame() {
  return <group>
    <mesh position={[0,-1.45,50]} receiveShadow>
      <boxGeometry args={[61,2.4,110]}/><meshStandardMaterial color="#a12b22" metalness={.37} roughness={.43}/>
    </mesh>
    <mesh position={[0,-.12,50]}><boxGeometry args={[55,.45,103]}/><meshStandardMaterial color="#d6b06f" roughness={.65}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*28.1,.5,50]}>
      <boxGeometry args={[3,1.5,110]}/><meshStandardMaterial color="#c44836" roughness={.38} metalness={.28}/>
    </mesh>)}
    {[0,100].map(z=><mesh key={z} position={[0,.5,z]}>
      <boxGeometry args={[59.5,1.5,3.6]}/><meshStandardMaterial color="#c44836" roughness={.38} metalness={.28}/>
    </mesh>)}
    {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={x+'-'+z} position={[x*28.5,1.37,z===1?102: -2]}>
      <cylinderGeometry args={[.6,.6,.28,10]}/><meshStandardMaterial color="#dfb77a" metalness={.75} roughness={.25}/>
    </mesh>))}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.24,50]}>
      <planeGeometry args={[53.3,100]}/><meshStandardMaterial color="#285f4b" roughness={.9}/>
    </mesh>
    {Array.from({length:10},(_,i)=><mesh key={'stripe'+i} rotation={[-Math.PI/2,0,0]} position={[0,.251,i*10+5]}>
      <planeGeometry args={[53.3,10]}/><meshBasicMaterial color={i%2===0?'#31715a':'#275b48'}/>
    </mesh>)}
    {[5,95].map(z=><mesh key={'zone'+z} rotation={[-Math.PI/2,0,0]} position={[0,.27,z]}>
      <planeGeometry args={[53.3,10]}/><meshBasicMaterial color={z===95?'#933b30':'#244657'}/>
    </mesh>)}
    {Array.from({length:21},(_,i)=>{
      const z=i*5;return <group key={'line'+i}>
        <mesh position={[0,.285,z]}><boxGeometry args={[53.2,.035,i%2===0?.22:.085]}/><meshBasicMaterial color="#d3dec7" transparent opacity={i%2===0?.92:.5}/></mesh>
        {i%2===0 && i!==0 && i!==20 && [-1,1].map(x=><Text key={x} position={[x*20,.32,z+2]} rotation={[-Math.PI/2,0,x===-1?Math.PI:0]} fontSize={2.3} color="#cadbc4" anchorX="center" anchorY="middle">
          {i<=10?i*5:(20-i)*5}
        </Text>)}
      </group>;
    })}
    {Array.from({length:101},(_,i)=>i%1===0 && i>0 && i<100 ? <group key={'hash'+i}>
      {[-1,1].map(x=><mesh key={x} position={[x*8,.3,i]}><boxGeometry args={[1,.035,.14]}/><meshBasicMaterial color="#e5e8d6" transparent opacity={.72}/></mesh>)}
    </group> : null)}
    <Text position={[0,.335,4.6]} rotation={[-Math.PI/2,0,0]} fontSize={5.5} letterSpacing={.15} color="#acc9c8">GRIDIRON</Text>
    <Text position={[0,.335,95]} rotation={[-Math.PI/2,0,0]} fontSize={5.6} letterSpacing={.17} color="#f6d8b4">ELECTRIC</Text>
    <Text position={[0,1.48,-1.95]} rotation={[-Math.PI/2,0,0]} fontSize={1.5} letterSpacing={.23} color="#f5dbaf">V I B R A - B O W L  •  1 9 7 4</Text>
    <mesh position={[-25.6,1.44,109.8]} rotation={[0,0,0]}><cylinderGeometry args={[1.7,1.7,.45,18]}/><meshStandardMaterial color="#eeb75d" metalness={.45} roughness={.3}/></mesh>
  </group>;
}

function Goalpost({ z }: {z:number}) {
  return <group position={[0,0,z]}>
    <mesh position={[0,5,0]}><cylinderGeometry args={[.24,.24,10,8]}/><meshStandardMaterial color="#f4c04d" metalness={.6}/></mesh>
    <mesh position={[0,10,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.19,.19,16,8]}/><meshStandardMaterial color="#f4c04d" metalness={.6}/></mesh>
    {[-8,8].map(x=><mesh key={x} position={[x,14,0]}><cylinderGeometry args={[.19,.19,8,8]}/><meshStandardMaterial color="#f4c04d" metalness={.6}/></mesh>)}
  </group>;
}

function CameraControls({view,yard}:{view:Props['view'];yard:number}) {
  const controls=useRef<any>(null);
  const targetY=clamp(yard+10,28,78);
  useEffect(()=>{
    if(!controls.current)return;
    const c=controls.current;
    c.target.set(0,0,targetY);
    const cam=c.object as THREE.PerspectiveCamera;
    if(view==='top')cam.position.set(0,101,targetY);
    else cam.position.set(43,59,targetY-42);
    cam.lookAt(0,0,targetY);
    c.update();
  },[view,targetY]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={34} maxDistance={144} maxPolarAngle={Math.PI/2.15} minPolarAngle={.22} target={[0,0,targetY]}/>;
}

function Lines({yard,play,defense,visible}:{yard:number;play:PlayId;defense:Defense;visible:boolean}) {
  if(!visible)return null;
  const routes: [number,number][][] = play==='inside' ? [[[3,yard-8],[4,yard+5]]] :
    play==='outside' ? [[[3,yard-8],[16,yard+1],[23,yard+13]]] :
    play==='screen' ? [[[-22,yard-2],[-23,yard+14]],[[3,yard-9],[17,yard+1],[21,yard+10]]] :
    play==='quick' ? [[[-22,yard-2],[-12,yard+9]],[[22,yard-2],[13,yard+8]],[[-14,yard-3],[-1,yard+9]]] :
    play==='sideline' ? [[[-22,yard-2],[-21,yard+13]],[[22,yard-2],[22,yard+14]],[[-14,yard-3],[-20,yard+12]]] :
    play==='deep' ? [[[-22,yard-2],[-20,yard+27]],[[22,yard-2],[21,yard+30]],[[-14,yard-3],[-7,yard+24]]] : [];
  return <group>
    {routes.map((route,i)=><Line key={i} points={route.map(([x,z])=>[x,.62,clamp(z,1,98)])} color="#f9d172" lineWidth={2.8} transparent opacity={.87} dashed dashSize={.85} gapSize={.55}/>)}
    {play!=='fieldgoal'&&play!=='spike'&&<mesh position={[0,.39,yard]}><boxGeometry args={[53,.12,.22]}/><meshBasicMaterial color="#66cbdf" transparent opacity={.9}/></mesh>}
    {play!=='fieldgoal'&&play!=='spike'&&<mesh position={[0,.39,Math.min(99,yard+10)]}><boxGeometry args={[53,.1,.13]}/><meshBasicMaterial color="#eeb764" transparent opacity={.8}/></mesh>}
    <Text position={[0,.44,clamp(yard+14,8,91)]} rotation={[-Math.PI/2,0,0]} fontSize={1.7} color="#f7c56a" outlineColor="#183d35" outlineWidth={.1}>{defense}</Text>
  </group>;
}

function FigureMesh({figure,now,motion}:{figure:Figure;now:React.RefObject<number>;motion:Motion|null}) {
  const ref=useRef<THREE.Group>(null);
  const side=figure.side==='offense';
  const primary=side?OFF:DEF;
  const secondary=side?GOLD:'#e2aaa2';
  useFrame(({clock})=>{
    if(!ref.current)return;
    const p=now.current??0;
    const [x,z]=figure.position;
    let dx=0,dz=0;
    if(motion){
      const {play,yards}=motion.result;
      if(side){
        if(figure.role==='OL'){dz=2+Math.min(2,p*3);dx=figure.id%2===0?.6:-.6;}
        else if(figure.role==='QB'){dz=play==='outside'?3:play==='inside'?1:-2;dx=play==='outside'?2:0;}
        else if(figure.role==='RB'){
          dx=play==='outside'?13:play==='screen'?11:0; dz=play==='inside'||play==='outside'?yards+8:play==='screen'?yards+7:2;
        }
        else {
          const wrIndex=figure.id-7;
          dx=play==='quick'?(x>0?-6:6):play==='sideline'?x>0?2:-2:play==='deep'?(x>0?3:-3):2;
          dz=play==='deep'?Math.max(19,yards):play==='sideline'?14:play==='quick'?9:play==='screen'?4:7;
          if(wrIndex===3)dz+=2;
        }
      } else {
        const look=figure.role==='DL'?.9:figure.role==='LB'?.7:.3;
        dz=-(3+look*7);
        if(motion.result.complete && figure.role==='DB') dz=-Math.min(11,Math.abs(yards)*.38);
        dx=(figure.id%2===0?-1:1)*1.4;
      }
      ref.current.position.set(x+dx*p, .2+Math.abs(Math.sin(clock.elapsedTime*26+figure.id))*.055*p,clamp(z+dz*p,1,99));
    }else ref.current.position.set(x,.2,clamp(z,1,99));
  });
  return <group ref={ref} rotation={[0,side?0:Math.PI,0]}>
    <mesh position={[0,.18,0]} castShadow><boxGeometry args={[2.15,.38,1.75]}/><meshStandardMaterial color={side?'#be8b38':'#9c2925'} roughness={.38}/></mesh>
    <mesh position={[0,.4,0]}><boxGeometry args={[1.72,.13,1.28]}/><meshStandardMaterial color="#342b23" roughness={.85}/></mesh>
    {[-.48,.48].map(x=><group key={x}>
      <mesh position={[x,.75,0]}><boxGeometry args={[.39,.78,.5]}/><meshStandardMaterial color={secondary}/></mesh>
      <mesh position={[x,1.27,-.16]}><boxGeometry args={[.45,.35,.85]}/><meshStandardMaterial color={primary}/></mesh>
    </group>)}
    <mesh position={[0,1.75,0]}><boxGeometry args={[1.45,1.12,.94]}/><meshStandardMaterial color={primary} roughness={.59}/></mesh>
    <mesh position={[0,2.22,.06]}><boxGeometry args={[2.05,.36,.98]}/><meshStandardMaterial color={secondary}/></mesh>
    {[-1,1].map(s=><group key={s}>
      <mesh position={[s*1.01,1.79,.12]} rotation={[.27,0,s*.26]}><boxGeometry args={[.37,1.05,.41]}/><meshStandardMaterial color={primary}/></mesh>
      <mesh position={[s*1.1,1.23,.31]}><sphereGeometry args={[.24,6,5]}/><meshStandardMaterial color={secondary}/></mesh>
    </group>)}
    <mesh position={[0,2.89,0]}><sphereGeometry args={[.69,9,7]}/><meshStandardMaterial color={side?'#edbb5d':'#b73431'} roughness={.48}/></mesh>
    <mesh position={[0,2.91,.5]}><boxGeometry args={[1.04,.23,.35]}/><meshStandardMaterial color={secondary} roughness={.4}/></mesh>
    <mesh position={[0,2.59,.7]}><boxGeometry args={[.74,.12,.12]}/><meshStandardMaterial color="#dfd4af" metalness={.3}/></mesh>
    <Text position={[0,1.81,.494]} fontSize={.58} color={side?'#613423':'#fff1cf'} anchorX="center" anchorY="middle">{figure.number}</Text>
  </group>;
}

function Football({yard,motion,now}:{yard:number;motion:Motion|null;now:React.RefObject<number>}) {
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{
    if(!ref.current)return;
    const p=now.current??0;
    if(!motion){ref.current.position.set(0,2.7,yard-5);return;}
    const {play,yards,complete}=motion.result;
    const toX=play==='outside'?16:play==='deep'?18:play==='sideline'?-21:play==='screen'?16:play==='inside'?3:-12;
    const toZ=clamp(yard+yards,1,100);
    const fromZ=yard-5;
    const flight=play==='fieldgoal'?13:play==='deep'?8:play==='inside'||play==='outside'?1.3:4;
    ref.current.position.set(toX*p,2.8+Math.sin(p*Math.PI)*flight,fromZ+(toZ-fromZ)*p);
    if(!complete&&play!=='inside'&&play!=='outside')ref.current.position.y=Math.max(.5,ref.current.position.y-1.6*p);
    ref.current.rotation.z=p*7;
  });
  return <group ref={ref}><mesh scale={[.55,.38,.34]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#88401f" roughness={.67}/></mesh>
    <mesh position={[0,.4,0]}><boxGeometry args={[.14,.06,.05]}/><meshBasicMaterial color="#f3d7a4"/></mesh></group>;
}

function ActionClock({motion,onDone,progress}:{motion:Motion|null;onDone:()=>void;progress:React.RefObject<number>}) {
  const fired=useRef(false);
  useEffect(()=>{progress.current=0;fired.current=false;},[motion,progress]);
  useFrame((_,delta)=>{
    if(!motion || fired.current)return;
    progress.current=Math.min(1,progress.current+delta/2.5);
    if(progress.current>=1){fired.current=true;onDone();}
  });
  return null;
}

function Scene({yard,defense,selectedPlay,view,motion,onDone}:Props) {
  const progress=useRef(0);
  const displayYard=motion?.startYard??yard;
  const figures=formation(displayYard,defense);
  return <>
    <color attach="background" args={['#141b19']}/>
    <fog attach="fog" args={['#141b19',100,220]}/>
    <ambientLight intensity={1.65}/>
    <directionalLight position={[24,68,20]} intensity={2.6} color="#fff1c9"/>
    <directionalLight position={[-12,24,69]} intensity={.55} color="#85cec2"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.75,50]}><planeGeometry args={[250,250]}/><meshStandardMaterial color="#151c1b" roughness={1}/></mesh>
    <Frame/>
    <Goalpost z={102}/>
    <Lines yard={displayYard} play={selectedPlay} defense={defense} visible={!motion}/>
    <ActionClock motion={motion} onDone={onDone} progress={progress}/>
    {figures.map(figure=><FigureMesh key={figure.id} figure={figure} now={progress} motion={motion}/>)}
    <Football yard={displayYard} motion={motion} now={progress}/>
    <CameraControls view={view} yard={displayYard}/>
  </>;
}

export default function Board3D(props: Props) {
  return <Canvas dpr={[.8,1]} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} shadows={false}
    camera={{position:[43,59,props.yard-32],fov:49,near:.1,far:400}} style={{width:'100%',height:'100%',imageRendering:'pixelated'}}
    fallback={<div className="canvas-fallback">3D requires WebGL. Try a modern browser with hardware acceleration.</div>}>
    <Scene {...props}/>
  </Canvas>;
}
