import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {World,Actor} from '../logic/spatial';

/** Fixed-size number plates above every miniature. No labels follow React state:
 * three.js updates 22 world transforms directly while the simulation advances.
 */
export default function JerseyNumbers({world}:{world:World}){
 const sprites=useRef<(THREE.Sprite|null)[]>([]);
 const textures=useMemo(()=>{
  const cache=new Map<string,THREE.CanvasTexture>();
  if(typeof document==='undefined')return cache;
  for(const a of world.actors){
   const text=String(a.number);
   const key=(a.side==='offense'?'O':'D')+text;
   if(cache.has(key))continue;
   const canvas=document.createElement('canvas');
   canvas.width=128;canvas.height=90;
   const ctx=canvas.getContext('2d');
   if(!ctx)continue;
   const isOffense=a.side==='offense';
   ctx.fillStyle=isOffense?'#132c25':'#301e20';
   ctx.beginPath();ctx.roundRect(5,8,118,69,13);ctx.fill();
   ctx.strokeStyle=isOffense?'#f6d68b':'#f8b8ac';ctx.lineWidth=6;ctx.stroke();
   ctx.font='900 56px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle='#fffbee';ctx.fillText(text,64,43);
   const t=new THREE.CanvasTexture(canvas);
   t.colorSpace=THREE.SRGBColorSpace;
   t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;
   cache.set(key,t);
  }
  return cache;
 },[world]);
 useEffect(()=>()=>{for(const texture of textures.values())texture.dispose();},[textures]);
 useFrame(()=>{
  for(let i=0;i<world.actors.length;i++){
   const sprite=sprites.current[i];if(!sprite)continue;
   const actor=world.actors[i];
   sprite.position.set(actor.x,4.55,actor.z);
  }
 });
 return <group>
  {world.actors.map((a:Actor,i)=>{
   const texture=textures.get((a.side==='offense'?'O':'D')+a.number);
   return <sprite key={a.id} ref={node=>{sprites.current[i]=node;}} position={[a.x,4.55,a.z]} scale={[2.28,1.6,1]}>
    <spriteMaterial map={texture??null} transparent depthTest={false} depthWrite={false} toneMapped={false}/>
   </sprite>;
  })}
 </group>;
}
