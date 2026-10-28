import type { Defense } from './drill.ts';
import type { Point } from './throwing.ts';

export type CoverageId='cover0'|'cover1'|'cover2'|'cover3'|'quarters';
export type CoverageFamily={id:CoverageId;name:string;shell:'ONE HIGH'|'TWO HIGH'|'PRESS ZERO';description:string;weakness:string;pressure:string;};
export const COVERAGES:Record<CoverageId,CoverageFamily>={
 cover0:{id:'cover0',name:'COVER 0',shell:'PRESS ZERO',description:'Everybody matched. No free safety.',weakness:'Crossers and quick separation',pressure:'HEAVY'},
 cover1:{id:'cover1',name:'COVER 1',shell:'ONE HIGH',description:'Man underneath, safety in the post.',weakness:'Rub routes and crossers',pressure:'MEDIUM'},
 cover2:{id:'cover2',name:'COVER 2',shell:'TWO HIGH',description:'Corners squat in the flats, two safeties deep.',weakness:'Seams and the hole behind flat defenders',pressure:'LIGHT'},
 cover3:{id:'cover3',name:'COVER 3',shell:'ONE HIGH',description:'Three deep, four underneath.',weakness:'Curl/flat and three-level flood',pressure:'MEDIUM'},
 quarters:{id:'quarters',name:'QUARTERS',shell:'TWO HIGH',description:'Four deep quarters, shallow underneath.',weakness:'Hitches, drags and quick underneath',pressure:'LIGHT'}
};
export function selectCoverage(defense:Defense,driveSeed=0):CoverageId {
 if(defense==='BLITZ')return driveSeed%3===0?'cover0':'cover1';
 if(defense==='LOADED BOX')return driveSeed%3===0?'cover1':'cover3';
 return driveSeed%3===0?'quarters':'cover2';
}
export function getShell(defense:Defense):string{
 return defense==='BLITZ'?'PRESSURE / SINGLE HIGH':defense==='LOADED BOX'?'HEAVY BOX / ONE HIGH':'TWO HIGH / SOFT CORNERS';
}
export type CoverActor={id:number;x:number;z:number;role:string;targetId?:number};
const clip=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const manTarget=(receiver:CoverActor|undefined,side:number,yard:number):Point=>{
 if(!receiver)return [side*12,yard+8];
 return [clip(receiver.x+side*.8,-24,24),clip(receiver.z+1.2,1,99)];
};
export function defenderAlignment(id:number,coverage:CoverageId,yard:number):Point{
 const shell=coverage;
 if(id===18)return [-21,yard+(shell==='cover2'?5:shell==='quarters'?12:7)];
 if(id===21)return [21,yard+(shell==='cover2'?5:shell==='quarters'?12:7)];
 if(id===19)return [shell==='cover2'||shell==='quarters'?-10:0,yard+(shell==='cover0'?8:19)];
 if(id===20)return [shell==='cover2'||shell==='quarters'?10:-10,yard+(shell==='cover0'?7:shell==='cover3'?8:16)];
 if(id===15)return [-12,yard+7];
 if(id===16)return [0,yard+7];
 if(id===17)return [12,yard+7];
 return [0,yard+4];
}
/** Position responsibility, not a random movement instruction.
 * Defensive backs hold deep thirds/halves/quarters or mirror a designated man.
 * Underneath defenders squeeze passing lanes rather than mindlessly chasing receivers.
 */
export function coverageResponsibility(
 actor:CoverActor,coverage:CoverageId,yard:number,offense:readonly CoverActor[],now:number,
 flightTarget:Point|null
):{point:Point;speed:number;assignment:string}{
 const locate=(id:number)=>offense.find(a=>a.id===id);
 const z=clip(yard,1,99);
 let point:Point=[actor.x,actor.z],assignment='HOOK';
 let speed=7.1;
 if(coverage==='cover0'||coverage==='cover1'){
   const match:Record<number,number>={18:7,19:9,20:10,21:8,15:1,16:9,17:10};
   if(coverage==='cover1'&&actor.id===19){
     const threats=offense.filter(a=>a.role==='WR'||a.role==='RB').sort((a,b)=>b.z-a.z);
     point=[clip((threats[0]?.x??0)*.30,-9,9),clip(Math.max(z+17,(threats[0]?.z??z)+4),z+15,99)];
     assignment='POST SAFETY';speed=8.5;
   }else{
     const id=match[actor.id];
     const man=locate(id);
     point=manTarget(man,actor.id%2?-.7:.7,z);
     assignment=id===undefined?'SPY':'MAN '+id;
     speed=actor.role==='DB'?9.3:7.5;
   }
   if(coverage==='cover0'&&actor.id===16){
     point=[0,z-5];assignment='GREEN DOG';speed=7.2;
   }
 }else{
   let anchor:Point=[0,z+8],width=10,depth=10;
   if(coverage==='cover2'){
     if(actor.id===18){anchor=[-20,z+5];width=8;depth=9;assignment='CLOUD / FLAT';}
     else if(actor.id===21){anchor=[20,z+5];width=8;depth=9;assignment='CLOUD / FLAT';}
     else if(actor.id===19){anchor=[-13,z+22];width=14;depth=25;assignment='DEEP HALF';}
     else if(actor.id===20){anchor=[13,z+22];width=14;depth=25;assignment='DEEP HALF';}
     else{anchor=[(actor.id-16)*13,z+10];width=9;depth=11;assignment='HOOK/CURL';}
   }else if(coverage==='cover3'){
     if(actor.id===18){anchor=[-20,z+23];width=11;depth=24;assignment='DEEP THIRD';}
     else if(actor.id===19){anchor=[0,z+24];width=12;depth=25;assignment='MIDDLE THIRD';}
     else if(actor.id===21){anchor=[20,z+23];width=11;depth=24;assignment='DEEP THIRD';}
     else{anchor=[(actor.id===20?19:(actor.id-16)*11),z+8];width=9;depth=10;assignment='CURL/FLAT';}
   }else{
     if(actor.id===18){anchor=[-21,z+22];width=9;depth=23;assignment='QUARTER';}
     else if(actor.id===19){anchor=[-7,z+24];width=10;depth=24;assignment='QUARTER';}
     else if(actor.id===20){anchor=[7,z+24];width=10;depth=24;assignment='QUARTER';}
     else if(actor.id===21){anchor=[21,z+22];width=9;depth=23;assignment='QUARTER';}
     else{anchor=[(actor.id-16)*12,z+7];width=10;depth=10;assignment='HOOK/CURL';}
   }
   let threat:CoverActor|undefined;
   let best=Infinity;
   for(const r of offense){
     if(r.role!=='WR'&&r.role!=='RB')continue;
     const dx=(r.x-anchor[0])/width, dz=(r.z-anchor[1])/depth;
     const score=dx*dx+dz*dz;
     if(score<best){best=score;threat=r;}
   }
   const mix=best<3.7&&threat?clip(1.2-best*.35,.15,.82):0;
   point=[anchor[0]*(1-mix)+(threat?.x??anchor[0])*mix,
          anchor[1]*(1-mix)+((threat?.z??anchor[1])+1.9)*mix];
   // Don't abandon deep responsibility to chase underneath crossers.
   if(assignment.includes('DEEP')||assignment==='QUARTER'||assignment==='MIDDLE THIRD')
     point[1]=Math.max(z+13,point[1]);
   speed=assignment.includes('DEEP')||assignment==='QUARTER'||assignment==='MIDDLE THIRD'?8.0:7.2;
 }
 // Once the quarterback releases, defenders can break on the actual descending ball,
 // but only if it enters a reachable vicinity of their assignment.
 if(flightTarget&&now>.12){
   const d=Math.hypot(flightTarget[0]-actor.x,flightTarget[1]-actor.z);
   if(d<12.8){const influence=clip((12.8-d)/13,.1,.67);
     point=[point[0]*(1-influence)+flightTarget[0]*influence,point[1]*(1-influence)+flightTarget[1]*influence];
     speed+=1.1;
   }
 }
 return {point:[clip(point[0],-25,25),clip(point[1],1,99)],speed,assignment};
}
export function coverageHint(coverage:CoverageId):string{return COVERAGES[coverage].weakness.toUpperCase();}
