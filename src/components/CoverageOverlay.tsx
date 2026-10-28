import { useMemo } from 'react';
import type { World } from '../logic/spatial';
type Patch={x:number;depth:number;width:number;height:number;deep:boolean};
const clip=(v:number,a:number,b:number)=>Math.max(a,Math.min(v,b));
function zonePatches(world:World):Patch[]{
 const shell=world.coverage;
 if(shell==='cover0'||shell==='cover1')return [];
 const third=(x:number):Patch=>({x,depth:23,width:17,height:34,deep:true});
 const flat=(x:number):Patch=>({x,depth:7,width:17,height:15,deep:false});
 if(shell==='cover2')return [
  {x:-14,depth:24,width:25,height:37,deep:true},{x:14,depth:24,width:25,height:37,deep:true},
  flat(-21),flat(21),flat(-7),flat(7)
 ];
 if(shell==='cover3')return [third(-18),third(0),third(18),flat(-21),flat(-7),flat(7),flat(21)];
 return [-20,-7,7,20].map(x=>({x,depth:24,width:12,height:35,deep:true})).concat([-15,0,15].map(x=>({x,depth:7,width:16,height:16,deep:false})));
}
/** Deliberately subtle animated-coach-film overlay: boxes mark responsibility zones,
 * not calculated completion probabilities. Hidden in the standard broadcast camera.
 */
export default function CoverageOverlay({world}:{world:World}){
 const patches=useMemo(()=>zonePatches(world),[world.coverage,world.yard]);
 if(!patches.length)return null;
 return <group>{patches.map((zone,i)=>{
   const position=clip(world.yard+zone.depth,zone.height/2,100-zone.height/2);
   return <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[zone.x,.68,position]}>
     <planeGeometry args={[zone.width,zone.height]}/>
     <meshBasicMaterial color={zone.deep?'#7caed9':'#efc477'} transparent opacity={zone.deep?.095:.075} side={2} depthWrite={false}/>
   </mesh>;
 })}</group>;
}
