import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,Clock3,Crosshair,Play,Shield,TimerReset,Zap} from 'lucide-react';
import {ROUTE_OPTIONS,routeVertices,type RouteBook,type RouteKind} from '../logic/spatial';
import {FORMATIONS,PROTECTIONS,isEligible,type TacticalCall} from '../logic/tactics';
import type {Point,ReceiverId} from '../logic/throwing';
import type {TeamConcept} from '../logic/nfl';

type Family='RUN'|'PASS'|'RPO'|'TRICK';
type Tempo='hurry'|'huddle'|'drain';
type Props={
 team:string;family:Family;onFamily:(v:Family)=>void;book:TeamConcept[];selected:TeamConcept;
 onPick:(c:TeamConcept)=>void;call:TacticalCall;onCall:(v:TacticalCall)=>void;
 routes:RouteBook;onRoute:(id:ReceiverId,kind:RouteKind)=>void;
 onWaypoint:(id:ReceiverId,point:Point)=>void;name:(id:ReceiverId)=>string;
 jersey:(id:ReceiverId)=>string;clock:string;clockRunning:boolean;downs:string;
 yards:string;timeouts:number;onTimeout:()=>void;onSnap:()=>void;
 tempo:Tempo;onTempo:(v:Tempo)=>void;rpoChoice:'give'|'pull';onRpoChoice:(v:'give'|'pull')=>void;
};
const targets=[7,8,9,10,1] as ReceiverId[];
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const colors=['#ffe3a0','#85d7e0','#f4a98c','#d4b5ff','#a5e5aa'];
function Diagram({concept,selectedId,onSelect,drawing,onWaypoint,jersey}:{concept:TeamConcept;selectedId:ReceiverId;onSelect:(id:ReceiverId)=>void;drawing:boolean;onWaypoint:(id:ReceiverId,p:Point)=>void;jersey:(id:ReceiverId)=>string}){
 const segments=useMemo(()=>targets.filter(id=>isEligible(id,{formation:concept.formation,protection:concept.protection}))
  .map(id=>({id,points:routeVertices(id,concept.routes[id],concept.formation)})),[concept]);
 const toScreen=([x,z]:Point):Point=>[250+x*8.1,434-z*7.2];
 return <svg className={'pc-field-svg '+(drawing?'pc-field-drawing':'')} viewBox="0 0 500 550" role="img" aria-label="Editable offensive route diagram"
  onClick={drawing?e=>{
    const r=e.currentTarget.getBoundingClientRect();
    const x=500*(e.clientX-r.left)/r.width,y=550*(e.clientY-r.top)/r.height;
    onWaypoint(selectedId,[clamp((x-250)/8.1,-25.5,25.5),clamp((434-y)/7.2,0,65)]);
  }:undefined}>
  <rect x="1" y="1" width="498" height="548" rx="10" fill="#204f3f"/>
  {Array.from({length:9},(_,i)=><g key={i}>
    <rect x="2" y={i*70+1} width="496" height="70" fill={i%2?'#2b6149':'#285a44'} opacity=".77"/>
    <line x1="8" x2="492" y1={i*70+18} y2={i*70+18} stroke="#dce9cf" strokeOpacity=".34" strokeWidth="1.8"/>
  </g>)}
  <line x1="60" x2="60" y1="0" y2="550" stroke="#f3e9cc" strokeOpacity=".7" strokeWidth="2"/>
  <line x1="440" x2="440" y1="0" y2="550" stroke="#f3e9cc" strokeOpacity=".7" strokeWidth="2"/>
  <line x1="5" x2="495" y1="434" y2="434" stroke="#90dff1" strokeWidth="5"/>
  <text x="14" y="425" fill="#dff7fe" fontSize="12" fontWeight="900">LOS</text>
  <g transform="translate(250 502)"><circle r="14" fill="#d8b87e" stroke="#fff1ca" strokeWidth="2"/><text textAnchor="middle" dy="5" fill="#203426" fontSize="14" fontWeight="900">QB</text></g>
  {segments.map(({id,points})=>{
    const idx=targets.indexOf(id);
    const start=toScreen(points[0]),end=toScreen(points[points.length-1]);
    return <g key={id}>
      <polyline points={points.map(p=>toScreen(p).join(',')).join(' ')} stroke={colors[idx]} opacity={selectedId===id?1:.62} strokeWidth={selectedId===id?5.5:3.3} fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={end[0]} cy={end[1]} r="7" fill={colors[idx]}/>
      <g role="button" tabIndex={0} aria-label={'Edit number '+jersey(id)+' route'} className={'pc-jersey-point '+(selectedId===id?'active':'')}
       onClick={e=>{e.stopPropagation();onSelect(id);}}
       onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}}>
       <circle cx={start[0]} cy={start[1]} r="21" fill={selectedId===id?'#f3cd83':'#15352a'} stroke={selectedId===id?'#ffffff':colors[idx]} strokeWidth="4"/>
       <text x={start[0]} y={start[1]+6} textAnchor="middle" fontSize="19" fontWeight="900" fill={selectedId===id?'#1d352a':'#fff9e9'}>{jersey(id)}</text>
      </g>
    </g>;
  })}
  <rect x="12" y="12" rx="4" width="167" height="27" fill="#0f3025" opacity=".92"/>
  <text x="22" y="31" fill="#eed4a5" fontSize="15" fontWeight="900" letterSpacing="1">TAP A JERSEY TO EDIT</text>
  {drawing&&<><rect x="305" y="13" width="178" height="27" rx="5" fill="#e9c07e"/><text x="315" y="31" fontSize="14" fill="#15372d" fontWeight="900">TAP FIELD FOR ROUTE</text></>}
 </svg>;
}
export default function PlayCallScreen(p:Props){
 const [editor,setEditor]=useState<ReceiverId>(7);
 const [drawing,setDrawing]=useState(false);
 const chosen=p.book.filter(x=>x.family===p.family);
 const display:TeamConcept={...p.selected,formation:p.call.formation,protection:p.call.protection,routes:p.routes};
 const editingAllowed=p.selected.family!=='RUN';
 const route=p.routes[editor];
 const onSelected=(id:ReceiverId)=>{setEditor(id);setDrawing(false);};
 const onRoute=(kind:RouteKind)=>{p.onRoute(editor,kind);setDrawing(false);};
 return <section className="pc-shell" aria-label="Offensive play calling">
   <header className="pc-head">
    <div className="pc-headline"><span><BookOpen size={16}/> {p.team} OFFENSE · GAME PLAN</span><h2>MAKE THE CALL.</h2><small>{p.downs} · {p.yards} · {p.clock} LEFT</small></div>
    <div className="pc-head-actions"><span className="pc-clock"><Clock3 size={15}/>{p.clock} {p.clockRunning?'· RUNNING':'· STOPPED'}</span><button className="pc-snap-button" onClick={p.onSnap}><Play size={18} fill="currentColor"/> SNAP <ArrowRight size={18}/></button></div>
   </header>
   <div className="pc-families" role="tablist" aria-label="Choose offensive play family">
    {(['RUN','PASS','RPO','TRICK'] as Family[]).map(f=><button key={f} role="tab" aria-selected={p.family===f} className={p.family===f?'active':''} onClick={()=>{p.onFamily(f);setEditor(7);setDrawing(false);}}>
       <span>{f}</span><small>{p.book.filter(c=>c.family===f).length} CALLS</small>
    </button>)}
   </div>
   <div className="pc-body">
    <div className="pc-plays">
      <div className="pc-section-title">CHOOSE A {p.family} CONCEPT <span>{chosen.length} PLAYS</span></div>
      <div className="pc-call-list">
      {chosen.map((c,i)=><button key={c.id} className={'pc-play-item '+(p.selected.id===c.id?'active':'')} onClick={()=>{p.onPick(c);setEditor(7);setDrawing(false);}}>
       <span className="pc-play-index">{String(i+1).padStart(2,'0')}</span><span className="pc-play-copy"><strong>{c.name}</strong><small>{c.callout==='TEAM FAVORITE'?'★ TEAM FAVORITE':c.formation.toUpperCase()+' · '+c.protection.toUpperCase()}</small></span><ArrowRight size={16}/>
      </button>)}
      </div>
    </div>
    <div className="pc-plan">
      <div className="pc-section-title">ON-FIELD ROUTES <span>{p.call.formation.toUpperCase()}</span></div>
      <div className="pc-diagram"><Diagram concept={display} selectedId={editor} onSelect={onSelected} drawing={drawing} onWaypoint={p.onWaypoint} jersey={p.jersey}/></div>
      <div className="pc-player-strip">{targets.filter(id=>isEligible(id,p.call)).map(id=><button key={id} className={editor===id?'active':''} onClick={()=>onSelected(id)}>
       <b>#{p.jersey(id)}</b><small>{p.name(id)}</small></button>)}</div>
    </div>
    <aside className="pc-adjust">
      <div className="pc-section-title">PLAY DETAILS <span><Shield size={14}/> COACH</span></div>
      <h3>{p.selected.name}</h3><p className="pc-note">{p.selected.tip}</p>
      <div className="pc-adjust-options">
        <label>FORMATION<select value={p.call.formation} onChange={e=>p.onCall({...p.call,formation:e.target.value as TacticalCall['formation']})}>{FORMATIONS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label>PASS PROTECTION<select value={p.call.protection} onChange={e=>p.onCall({...p.call,protection:e.target.value as TacticalCall['protection']})}>{PROTECTIONS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      </div>
      {editingAllowed&&<div className="pc-route-panel">
       <div className="pc-section-title">#{p.jersey(editor)} {p.name(editor)} <span>ROUTE</span></div>
       <div className="pc-route-choices">{ROUTE_OPTIONS.map(o=><button key={o.kind} className={route.kind===o.kind?'active':''} onClick={()=>onRoute(o.kind)}>{o.name}</button>)}</div>
       <button className={'pc-draw '+(drawing?'active':'')} onClick={()=>{if(!drawing)p.onRoute(editor,'custom');setDrawing(x=>!x);}}><Crosshair size={15}/>{drawing?'FINISH ROUTE':'DRAW CUSTOM ROUTE'}</button>
      </div>}
      {p.selected.family==='RPO'&&<div className="pc-option-split"><span>RPO READ</span><div><button className={p.rpoChoice==='give'?'active':''} onClick={()=>p.onRpoChoice('give')}>GIVE / RUN</button><button className={p.rpoChoice==='pull'?'active':''} onClick={()=>p.onRpoChoice('pull')}>PULL / PASS</button></div></div>}
      {p.selected.family!=='RUN'&&p.selected.family!=='RPO'&&<div className="pc-option-split"><span>PLAY ACTION</span><div><button className={!p.call.playAction?'active':''} onClick={()=>p.onCall({...p.call,playAction:false})}>OFF</button><button className={!!p.call.playAction?'active':''} onClick={()=>p.onCall({...p.call,playAction:true})}>ON</button></div></div>}
      {editingAllowed&&<div className="pc-option-split"><span>QB ROLLOUT</span><div>{(['none','left','right'] as const).map(v=><button key={v} className={(p.call.rollout??'none')===v?'active':''} onClick={()=>p.onCall({...p.call,rollout:v})}>{v.toUpperCase()}</button>)}</div></div>}
      <div className="pc-option-split"><span>TEMPO / CLOCK</span><div>{(['hurry','huddle','drain'] as Tempo[]).map(v=><button key={v} className={p.tempo===v?'active':''} onClick={()=>p.onTempo(v)}>{v==='hurry'?'NO HUDDLE':v==='drain'?'MILK':'HUDDLE'}</button>)}</div></div>
      <div className="pc-actions"><button disabled={!p.clockRunning||p.timeouts<1} onClick={p.onTimeout}><TimerReset size={15}/> TIMEOUT ({p.timeouts})</button><button onClick={p.onSnap} className="pc-primary"><Zap size={18}/> SNAP THE BALL <ArrowRight size={20}/></button></div>
    </aside>
   </div>
  </section>;
}
