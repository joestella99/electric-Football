import { useMemo } from 'react';
import * as THREE from 'three';

/** A single low-cost texture replaces multiple oversized, flat striped meshes.
 * Seeded grain, alternating mowing direction, and soft wear create miniature turf
 * without fetching artwork or adding draw calls.
 */
export default function FieldTurf(){
 const texture=useMemo(()=>{
   const width=256,height=512;
   const pixels=new Uint8Array(width*height*4);
   for(let j=0;j<height;j++){
     const fieldY=(j/height)*100;
     const stripe=Math.floor(fieldY/10)%2;
     for(let i=0;i<width;i++){
       const k=(j*width+i)*4;
       const noise=((i*92821+j*68917+i*j*13)%53)-26;
       const grain=(Math.floor(i/2)%3===0?3:-2)+(j%8===0?2:0);
       const wear=Math.abs(i-width*.5)<width*.2&&Math.abs(fieldY-50)<32?-5:0;
       const l=noise*.33+grain+wear;
       pixels[k]=Math.max(0,Math.min(255,(stripe?46:38)+l));
       pixels[k+1]=Math.max(0,Math.min(255,(stripe?96:105)+l*1.55));
       pixels[k+2]=Math.max(0,Math.min(255,(stripe?70:75)+l));
       pixels[k+3]=255;
     }
   }
   const t=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
   t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
   t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
   t.generateMipmaps=true;t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;
   return t;
 },[]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.344,50]}>
   <planeGeometry args={[54.9,100]}/>
   <meshStandardMaterial map={texture} roughness={1} metalness={0}/>
 </mesh>;
}
