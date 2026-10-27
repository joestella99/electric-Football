import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const hash=(n:number)=>((Math.sin(n*127.1+43.7)*43758.5453)%1+1)%1;
function Spectators({side,color,offset}:{side:number;color:string;offset:number}){
  const {matrices}=useMemo(()=>{
    const matrices:THREE.Matrix4[]=[];
    const obj=new THREE.Object3D();
    for(let tier=0;tier<4;tier++){
      for(let i=0;i<76;i++){
        if(hash(i+tier*83+offset*53)>.82)continue;
        obj.position.set(side*(33.5+tier*2.65),3.9+tier*2.2,1.0+i*1.31);
        obj.scale.set(.42,.66+hash(i*11+tier*9)*.55,.41);
        obj.rotation.y=hash(i*7+tier*4)*.5;
        obj.updateMatrix();matrices.push(obj.matrix.clone());
      }
    }
    return {matrices};
  },[side,offset]);
  return <instancedMesh args={[undefined,undefined,matrices.length]} frustumCulled={false}
    onUpdate={mesh=>{matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;}}>
    <boxGeometry args={[1.25,1.25,1.25]}/><meshStandardMaterial color={color} roughness={.88} metalness={0}/>
  </instancedMesh>;
}
export function StadiumDiorama(){
  return <group>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*39.5,1.15,50]}><boxGeometry args={[19,3.4,114]}/><meshStandardMaterial color="#1b2424" metalness={.24} roughness={.75}/></mesh>
      {[0,1,2,3].map(i=><group key={i}>
        <mesh position={[side*(34.5+i*2.65),3.05+i*2.2,50]}>
          <boxGeometry args={[3.3,.85,106]}/><meshStandardMaterial color={i%2?'#31423d':'#354b44'} metalness={.28} roughness={.62}/>
        </mesh>
        <mesh position={[side*(33.1+i*2.65),3.5+i*2.2,50]}>
          <boxGeometry args={[.11,.36,108]}/><meshStandardMaterial color="#c5ac6d" metalness={.71} roughness={.24}/>
        </mesh>
      </group>)}
      <Spectators side={side} color={side===1?'#b9a271':'#a78b79'} offset={side}/>
      {[10,30,50,70,90].map((z,i)=><group key={z}>
        <mesh position={[side*29.8,1.6,z]}><boxGeometry args={[.22,1.1,16]}/><meshStandardMaterial emissive={i%2?'#c44b31':'#dfb75b'} emissiveIntensity={.42} color={i%2?'#aa4938':'#eacb83'} roughness={.45}/></mesh>
        <mesh position={[side*29.94,1.66,z]}><boxGeometry args={[.055,.1,13]}/><meshBasicMaterial color="#f4e3ba"/></mesh>
      </group>)}
    </group>)}
    {[2,98].map((z,i)=><group key={z}>
      <mesh position={[0,0,z]}><boxGeometry args={[3,1,3]}/><meshStandardMaterial color="#ab844d" roughness={.5}/></mesh>
      <mesh position={[0,5,z]}><cylinderGeometry args={[.18,.18,10,8]}/><meshStandardMaterial color="#f1ce6f" metalness={.66} roughness={.23}/></mesh>
      <mesh position={[0,10,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.19,.19,15,8]}/><meshStandardMaterial color="#f1ce6f" metalness={.7} roughness={.2}/></mesh>
      {[-7.5,7.5].map(x=><mesh key={x} position={[x,13.3,z]}><cylinderGeometry args={[.17,.17,6.6,8]}/><meshStandardMaterial color="#f1ce6f" metalness={.7} roughness={.2}/></mesh>)}
      <Text position={[0,6,i===1?114:-13]} rotation={[0,i===1?Math.PI:0,0]} color="#e3c78d" fontSize={2.4} letterSpacing={.13} anchorX="center">VIBRA BOWL</Text>
    </group>)}
    {[-1,1].flatMap(x=>[0,1].map((_,i)=><group key={x+'-'+i} position={[x*45,1,i?101:-1]}>
      <mesh position={[0,13,0]}><cylinderGeometry args={[.55,.7,26,9]}/><meshStandardMaterial color="#425451" metalness={.75} roughness={.32}/></mesh>
      <mesh position={[0,26,0]} rotation={[0,0,x*.35]}>
        <boxGeometry args={[5,1.3,3]}/><meshStandardMaterial color="#d7b977" emissive="#b89453" emissiveIntensity={.4} metalness={.5}/>
      </mesh>
      <pointLight position={[0,25,0]} color="#ffe5b8" intensity={30} distance={75} decay={2}/>
    </group>))}
    <mesh position={[0,-3,50]} receiveShadow><boxGeometry args={[150,1,180]}/><meshStandardMaterial color="#191d1b" roughness={.85}/></mesh>
  </group>;
}
