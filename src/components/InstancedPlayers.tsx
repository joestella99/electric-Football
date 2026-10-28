import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { World, Actor } from '../logic/spatial';
import type { Motion } from './Board3D';

type Props={world:World;active:boolean;motion:Motion|null;progress:React.RefObject<number>;selected:number;offenseColor:string;opponentColor:string};
const BOX=new THREE.BoxGeometry(1,1,1);
const HELMET=new THREE.IcosahedronGeometry(1,1);
const SHADOW=new THREE.PlaneGeometry(1,1);
const palette={
  base:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.38,metalness:.14}),
  torso:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.59,metalness:.04}),
  shoulders:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.41}),
  limbs:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65}),
  helmet:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.32,metalness:.15,flatShading:true}),
  mask:new THREE.MeshStandardMaterial({color:'#e7ddc7',roughness:.42,metalness:.4}),
  stripe:new THREE.MeshStandardMaterial({color:'#e5d6b6',roughness:.52}),
  shadow:new THREE.MeshBasicMaterial({color:'#091612',transparent:true,opacity:.27,depthWrite:false})
};
const HOME='#f4d48c',AWAY='#cd6047',BASE_HOME='#b68b45',BASE_AWAY='#973d32';
type Piece='base'|'torso'|'shoulder'|'helmet'|'armLeft'|'armRight'|'legLeft'|'legRight'|'mask'|'stripe'|'shadow';
const dummy=new THREE.Object3D();
const tmpColor=new THREE.Color();
function isHome(actor:Actor){return actor.side==='offense';}
function shape(ref:THREE.InstancedMesh|undefined,index:number,x:number,z:number,ox:number,oy:number,oz:number,sx:number,sy:number,sz:number,angle:number,rotateShadow=false){
  if(!ref)return;
  const sin=Math.sin(angle),cos=Math.cos(angle);
  dummy.position.set(x+ox*cos+oz*sin,oy,z+oz*cos-ox*sin);
  dummy.rotation.set(rotateShadow?-Math.PI/2:0,angle,0);
  dummy.scale.set(sx,sy,sz);
  dummy.updateMatrix();
  ref.setMatrixAt(index,dummy.matrix);
}
/** Eleven GPU-instanced parts render all 22 miniature figures (instead of hundreds of individual meshes). */
export default function InstancedPlayers({world,active,motion,progress,selected,offenseColor,opponentColor}:Props){
  const meshes=useRef<Partial<Record<Piece,THREE.InstancedMesh>>>({});
  const ring=useRef<THREE.Mesh>(null);
  const lastDrawn=useRef<{world:World|null;selected:number}>({world:null,selected:-1});
  const bindings=(key:Piece)=>(node:THREE.InstancedMesh|null)=>{if(node)meshes.current[key]=node;};
  useEffect(()=>{
    for(const [key,mesh] of Object.entries(meshes.current) as [Piece,THREE.InstancedMesh][]){
      for(let i=0;i<world.actors.length;i++){
        const home=isHome(world.actors[i]);
        const color=key==='base'?(home?BASE_HOME:BASE_AWAY):
          key==='shadow'?'#111111':
          key==='stripe'||key==='mask'?'#ffffff':
          key==='helmet'?(home?'#ecc16c':'#c04d3d'):
          home?HOME:AWAY;
        mesh.setColorAt(i,tmpColor.set(color));
      }
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  },[world]);
  useFrame(({clock})=>{
    const cached=lastDrawn.current;
    if(!active&&!motion&&cached.world===world&&cached.selected===selected)return;
    cached.world=world;cached.selected=selected;
    const parts=meshes.current;
    const p=motion?progress.current:0;
    let picked:Actor|undefined;
    world.actors.forEach((actor,i)=>{
      let x=actor.x,z=actor.z;
      if(motion&&!active){
        if(actor.id===0)z-=p*1.6;
        else if(actor.id===1){
          x+=(motion.result.play==='outside'?12:1)*p;
          z+=Math.max(0,motion.result.yards+6)*p;
        } else if(actor.side==='offense'){z+=Math.min(7,Math.max(0,motion.result.yards))*p*.7;}
        else z-=2.7*p;
      }
      const bob=active?Math.sin(clock.elapsedTime*22+i*1.8)*.035:motion?Math.sin(clock.elapsedTime*17+i)*.055:0;
      const orientation=active?actor.heading*(actor.side==='defense'?1:1):(actor.side==='offense'?0:Math.PI);
      const y=bob;
      shape(parts.shadow,i,x,z,0,.424,0,2.5,2.1,1,0,true);
      shape(parts.base,i,x,z,0,.60+y,0,1.9,.35,1.75,orientation);
      shape(parts.torso,i,x,z,0,1.76+y,0,1.40,1.04,.93,orientation);
      shape(parts.shoulder,i,x,z,0,2.19+y,0,1.81,.34,1.07,orientation);
      shape(parts.helmet,i,x,z,0,2.92+y,-.09,.70,.71,.66,orientation);
      shape(parts.armLeft,i,x,z,-.91,1.77+y,.12,.38,.96,.48,orientation);
      shape(parts.armRight,i,x,z,.91,1.77+y,.12,.38,.96,.48,orientation);
      shape(parts.legLeft,i,x,z,-.40,.99+y,-.02,.45,.70,.58,orientation);
      shape(parts.legRight,i,x,z,.40,.99+y,-.02,.45,.70,.58,orientation);
      shape(parts.mask,i,x,z,0,2.78+y,.55,1.07,.19,.22,orientation);
      shape(parts.stripe,i,x,z,0,2.61+y,.57,.87,.11,.2,orientation);
      if(actor.id===selected)picked={...actor,x,z};
    });
    for(const mesh of Object.values(parts))if(mesh)mesh.instanceMatrix.needsUpdate=true;
    if(ring.current){
      ring.current.visible=active&&!!picked;
      if(picked){
        ring.current.position.set(picked.x,.91,picked.z);
        const scale=1.10+.09*Math.sin(clock.elapsedTime*7);
        ring.current.scale.set(scale,scale,scale);
      }
    }
  });
  return <group>
    <instancedMesh ref={bindings('shadow')} args={[SHADOW,palette.shadow,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('base')} args={[BOX,palette.base,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('torso')} args={[BOX,palette.torso,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('shoulder')} args={[BOX,palette.shoulders,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('helmet')} args={[HELMET,palette.helmet,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('armLeft')} args={[BOX,palette.limbs,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('armRight')} args={[BOX,palette.limbs,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('legLeft')} args={[BOX,palette.limbs,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('legRight')} args={[BOX,palette.limbs,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('mask')} args={[BOX,palette.mask,22]} frustumCulled={false}/>
    <instancedMesh ref={bindings('stripe')} args={[BOX,palette.stripe,22]} frustumCulled={false}/>
    <mesh ref={ring} visible={false} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[1.2,1.48,24]}/><meshBasicMaterial color="#ffe9a1" side={THREE.DoubleSide} depthTest={false}/>
    </mesh>
  </group>;
}
