import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {passingButtonFor,passPlay} from '../logic/throwing';
import {isEligible} from '../logic/tactics';
import type {World,Actor} from '../logic/spatial';

/** Camera-facing identifiers with a big throw key (1–5) above an eligible
 * receiver, and a smaller actual jersey number. All 22 miniatures stay
 * identifiable, including defenders and linemen. Transforms update directly
 * in useFrame without generating React re-renders.
 */
export default function JerseyNumbers({world}:{world:World}){
 const sprites=useRef<(THREE.Sprite|null)[]>([]);
 const plates=useMemo(()=>{
  const cache=new Map<number,{texture:THREE.CanvasTexture,button:number|null}>();
  if(typeof document==='undefined')return cache;
  for(const actor of world.actors){
   const possible=passingButtonFor(actor.id);
   const button=passPlay(world.play)&&possible!==null&&isEligible(actor.id,world.call)?possible:null;
   const canvas=document.createElement('canvas');
   canvas.width=168;canvas.height=128;
   const ctx=canvas.getContext('2d');
   if(!ctx)continue;
   ctx.clearRect(0,0,168,128);
   ctx.fillStyle=button!==null?'#e9c585':actor.side==='offense'?'#163629':'#422a2b';
   ctx.beginPath();ctx.roundRect(7,8,154,112,15);ctx.fill();
   ctx.strokeStyle=button!==null?'#fff4d1':actor.side==='offense'?'#f6d68b':'#f6b5a9';
   ctx.lineWidth=5;ctx.stroke();
   if(button!==null){
     ctx.fillStyle='#102f25';
     ctx.font='900 78px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillText(String(button),84,51);
     ctx.font='800 22px Arial, sans-serif';
     ctx.fillText('THROW   #'+actor.number,84,101);
   }else{
     ctx.font='900 65px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillStyle='#fff8df';ctx.fillText(String(actor.number),84,65);
   }
   const texture=new THREE.CanvasTexture(canvas);
   texture.colorSpace=THREE.SRGBColorSpace;
   texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
   cache.set(actor.id,{texture,button});
  }
  return cache;
 },[world]);
 useEffect(()=>()=>{for(const plate of plates.values())plate.texture.dispose();},[plates]);
 useFrame(()=>{
  for(let i=0;i<world.actors.length;i++){
   const sprite=sprites.current[i];if(!sprite)continue;
   const actor=world.actors[i];
   sprite.position.set(actor.x,plates.get(actor.id)?.button!==null?5.8:4.6,actor.z);
  }
 });
 return <group>
  {world.actors.map((actor:Actor,i)=>{
   const plate=plates.get(actor.id);
   const isThrow=plate?.button!==null&&plate?.button!==undefined;
   return <sprite key={actor.id} ref={node=>{sprites.current[i]=node;}}
    position={[actor.x,isThrow?5.8:4.6,actor.z]}
    scale={isThrow?[3.7,2.8,1]:[2.15,1.65,1]}>
    <spriteMaterial map={plate?.texture??null} transparent depthTest={false} depthWrite={false} toneMapped={false}/>
   </sprite>;
  })}
 </group>;
}
