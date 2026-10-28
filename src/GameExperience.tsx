import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,AudioLines,BookOpen,Check,ChevronRight,Clock3,Crosshair,Eye,Flag,Fullscreen,Gauge,Goal,Headphones,Layers,Play,RotateCcw,Shield,TimerReset,Trophy,Volume2,VolumeX,Zap} from 'lucide-react';
import Board3D,{type Live,type ThrowRequest} from './components/Board3D';
import TacticalField2D from './components/TacticalField2D';
import FieldErrorBoundary from './components/FieldErrorBoundary';
import Pregame from './components/Pregame';
import {TEAM_BY_ID,HISTORICAL_CHALLENGES,STYLE_LABEL,practiceGame,teamPlaybook,type TeamConcept} from './logic/nfl';
import {historicalPersonnel} from './logic/nflRoster';
import {fieldSpot,formatClock,kickDistance,simulate,useTimeout,type GameState,type Result} from './logic/drill';
import {RECEIVERS,passPlay,pressureLimit,type ReceiverId,type Point} from './logic/throwing';
import {ROUTE_OPTIONS,routeVertices,type RouteBook,type PassStyle} from './logic/spatial';
import {FORMATIONS,PROTECTIONS,isEligible,presnapRead,type TacticalCall} from './logic/tactics';
import {COVERAGES,selectCoverage} from './logic/coverage';
import {playCue} from './logic/audio';
type Stage='calling'|'ready'|'live'|'result'|'finished';
type Category='ALL'|'QUICK'|'SHOT'|'RUN';
type View='sideline'|'coach';
const ROSTER=RECEIVERS.map(r=>r.id);
const categorise=(c:TeamConcept):Category=>c.family==='RUN'?'RUN':c.play==='deep'?'SHOT':'QUICK';
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
function RoutePreview({concept,large=false,onWaypoint}:{concept:TeamConcept;large?:boolean;onWaypoint?:(point:Point)=>void}){
 const routes=([7,8,9,10,1] as ReceiverId[]).filter(id=>isEligible(id,{formation:concept.formation,protection:concept.protection}));
 const paths=routes.map((id,i)=>{
   const vertices=routeVertices(id,concept.routes[id],concept.formation);
   const points=vertices.map(([x,z])=>[73+x*2.35,129-z*1.57] as const);
   return {id,i,points};
 });
 return <svg className={'route-preview '+(large?'route-preview-large':'')+(onWaypoint?' route-drawing':'')} viewBox="0 0 146 142" role="img" aria-label={'Route diagram: '+concept.name}
   onClick={onWaypoint?e=>{const r=e.currentTarget.getBoundingClientRect();const x=146*(e.clientX-r.left)/r.width;const y=142*(e.clientY-r.top)/r.height;onWaypoint([clamp((x-73)/2.35,-25.5,25.5),clamp((129-y)/1.57,0,72)]);}:undefined}>
   <rect x="1" y="1" width="144" height="140" rx="5" fill="#173b32"/>
   {[26,51,76,101,126].map(y=><line key={y} x1="3" x2="143" y1={y} y2={y} stroke="#8cac8d" strokeOpacity=".24" strokeWidth="1"/>)}
   <line x1="3" x2="143" y1="129" y2="129" stroke="#c7e5ce" strokeOpacity=".85" strokeDasharray="5 2"/>
   <circle cx="73" cy="135" r="3.6" fill="#eac27b"/>
   {paths.map(p=><g key={p.id}>
     <polyline points={p.points.map(pt=>pt.join(',')).join(' ')} fill="none" stroke={['#f3d387','#a7d9e2','#f59f83','#d3bcf0','#b0d9a5'][p.i]} strokeWidth={large?2.6:2.2} strokeLinejoin="round" strokeLinecap="round"/>
     <circle cx={p.points[0][0]} cy={p.points[0][1]} r="4.2" fill="#f4e7cd" stroke="#0e2921" strokeWidth="1"/>
     <circle cx={p.points[p.points.length-1][0]} cy={p.points[p.points.length-1][1]} r="2.6" fill={['#f3d387','#a7d9e2','#f59f83','#d3bcf0','#b0d9a5'][p.i]}/>
   </g>)}
   <text x="8" y="12" fill="#d7e6d3" fontSize="8" fontWeight="700" letterSpacing="1">OFFENSE / ALL-22</text>
 </svg>;
}
function newBook(teamId:string){return teamPlaybook(teamId);}
function getFirst(teamId:string){return newBook(teamId)[0];}
function initialCustom(c:TeamConcept){return {formation:c.formation,protection:c.protection} as TacticalCall;}
function GameExperience(){
 const [lobbyOpen,setLobbyOpen]=useState(true);
 const [started,setStarted]=useState(false);
 const [stage,setStage]=useState<Stage>('calling');
 const [scenarioId,setScenarioId]=useState('lviii-final');
 const [teamId,setTeamId]=useState('KC');
 const [opponentId,setOpponentId]=useState('SF');
 const [game,setGame]=useState<GameState>(()=>HISTORICAL_CHALLENGES[0].initial);
 const [chosenId,setChosenId]=useState(()=>getFirst('KC').id);
 const [call,setCall]=useState<TacticalCall>(()=>initialCustom(getFirst('KC')));
 const [routes,setRoutes]=useState<RouteBook>(()=>getFirst('KC').routes);
 const [receiver,setReceiver]=useState<ReceiverId>(7);
 const [live,setLive]=useState<Live|null>(null);
 const [throwRequest,setThrowRequest]=useState<ThrowRequest|null>(null);
 const [elapsed,setElapsed]=useState(0);
 const [coverage,setCoverage]=useState<Record<number,number>>({});
 const [result,setResult]=useState<Result|null>(null);
 const [filter,setFilter]=useState<Category>('ALL');
 const [passStyle,setPassStyle]=useState<PassStyle>('bullet');
 const [view,setView]=useState<View>('sideline');
 const [quality,setQuality]=useState<'performance'|'balanced'|'high'>(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:760px)').matches?'performance':'balanced');
 const [fps,setFps]=useState<number|null>(null);
 const [fieldMode,setFieldMode]=useState<'3d'|'2d'>(()=>{
  if(typeof document==='undefined')return '2d';
  try{const canvas=document.createElement('canvas');return canvas.getContext('webgl2')||canvas.getContext('webgl')?'3d':'2d';}
  catch{return '2d';}
 });
 const [fieldLoaded,setFieldLoaded]=useState(false);
 const [fieldError,setFieldError]=useState<string|null>(null);
 const [rendererVersion,setRendererVersion]=useState(0);
 const [sound,setSound]=useState(true);
 const [routeEditor,setRouteEditor]=useState<ReceiverId>(7);
 const [editingRoutes,setEditingRoutes]=useState(false);
 const [drawingRoute,setDrawingRoute]=useState(false);
 const [history,setHistory]=useState<{id:number;label:string;gain:number;clock:number}[]>([]);
 const [driveInfo,setDriveInfo]=useState(false);
 const [showHelp,setShowHelp]=useState(false);
 const serial=useRef(0);
 const keyboardAction=useRef<(event:KeyboardEvent)=>void>(()=>{});
 const teams=useMemo(()=>[TEAM_BY_ID[teamId],TEAM_BY_ID[opponentId]],[teamId,opponentId]);
 const teamBook=useMemo(()=>newBook(teamId),[teamId]);
 const selected=teamBook.find(c=>c.id===chosenId)??teamBook[0];
 const customized=useMemo<TeamConcept>(()=>({...selected,formation:call.formation,protection:call.protection,routes}),[selected,call,routes]);
 const roster=historicalPersonnel(scenarioId);
 const read=presnapRead(game.defense);
 const coverageId=selectCoverage(game.defense,game.plays);
 const coverageInfo=COVERAGES[coverageId];
 const running=live&&!passPlay(live.play);
 const canThrow=stage==='live'&&!running&&!throwRequest;
 const remaining=clamp(game.seconds-(stage==='live'?Math.ceil(elapsed):0),0,9999);
 const pocket=pressureLimit(game.defense,call.protection);
 const playSeconds=clamp(pocket-elapsed,0,pocket);
 const challenge=HISTORICAL_CHALLENGES.find(s=>s.id===scenarioId);
 const shown=filter==='ALL'?teamBook:teamBook.filter(c=>categorise(c)===filter);
 const setup=(fresh:GameState,offense:string,defense:string,id:string)=>{
  const c=getFirst(offense);
  setTeamId(offense);setOpponentId(defense);setScenarioId(id);
  setGame({...fresh});setChosenId(c.id);setCall(initialCustom(c));setRoutes(c.routes);
  setReceiver(7);setRouteEditor(7);setEditingRoutes(false);setDrawingRoute(false);
  setStage('calling');setFilter('ALL');setLive(null);setThrowRequest(null);
  setResult(null);setHistory([]);setElapsed(0);setCoverage({});
  setView('sideline');setLobbyOpen(false);setStarted(true);setDriveInfo(false);setFieldLoaded(false);
  serial.current++;
 };
 const startChallenge=(id:string)=>{
  const s=HISTORICAL_CHALLENGES.find(c=>c.id===id)??HISTORICAL_CHALLENGES[0];
  setup(s.initial,s.offense,s.opponent,s.id);
 };
 const startExhibition=(offense:string,defense:string)=>setup(practiceGame(offense,defense),offense,defense,'practice');
 const replay=()=>scenarioId==='practice'?startExhibition(teamId,opponentId):startChallenge(scenarioId);
 const selectPlay=(concept:TeamConcept)=>{
  if(stage!=='calling')return;
  setChosenId(concept.id);setCall(initialCustom(concept));setRoutes(concept.routes);
  setReceiver(7);setRouteEditor(7);setEditingRoutes(false);setDrawingRoute(false);
 };
 const breakHuddle=()=>{if(stage==='calling'){setEditingRoutes(false);setDrawingRoute(false);setStage('ready');}};
 const snap=()=>{
  if(stage!=='ready'||game.status!=='playing')return;
  playCue('snap',sound);
  setCoverage({});setElapsed(0);setThrowRequest(null);setReceiver(7);
  setLive({id:++serial.current,play:selected.play});
  setStage('live');
 };
 const complete=useCallback((r:Result)=>{
  playCue(r.description.startsWith('TOUCHDOWN')?'touchdown':r.turnover?'interception':r.play==='inside'||r.play==='outside'?'run':r.description.includes('SACK')?'sack':r.complete?'catch':'incomplete',sound);
  setGame(r.state);setLive(null);setThrowRequest(null);setResult(r);setElapsed(0);setCoverage({});
  setHistory(h=>[{id:++serial.current,label:r.description,gain:r.yards,clock:r.state.seconds},...h].slice(0,12));
  setStage(r.state.status==='playing'?'result':'finished');
 },[sound]);
 const passTo=useCallback((id:ReceiverId)=>{
  if(!canThrow||!isEligible(id,call))return;
  setReceiver(id);
  setThrowRequest({id:++serial.current,receiver:id,point:[0,game.yard+6] as Point,assisted:true,style:passStyle});
  playCue('throw',sound);
 },[canThrow,call,game.yard,passStyle,sound]);
 const nextPlay=()=>{if(stage==='result'){setStage('calling');setResult(null);setFilter('ALL');}};
 const special=(id:'spike'|'fieldgoal')=>{
  if(stage!=='ready'&&stage!=='calling')return;
  const r=simulate(game,id,'hurry',Math.random,call);
  complete(r);
 };
 const callTimeout=()=>{if(game.clockRunning&&game.timeouts>0){setGame(s=>useTimeout(s));playCue('snap',sound);}};
 const changeFieldMode=()=>{
  if(stage==='live')return;
  if(fieldMode==='3d'){setFieldMode('2d');setFieldLoaded(false);}
  else{setFieldMode('3d');setRendererVersion(v=>v+1);setFieldLoaded(false);setFieldError(null);}
 };
 const fieldFailure=(message:string)=>{setFieldMode('2d');setFieldLoaded(false);setFieldError(message);};
 const editReceiverRoute=(id:ReceiverId,kind:RouteBook[ReceiverId]['kind'])=>{
  setRoutes(book=>({...book,[id]:{kind}}));setDrawingRoute(false);
 };
 const addWaypoint=(point:Point)=>setRoutes(book=>{
  const prior=book[routeEditor].kind==='custom'?book[routeEditor].points??[]:[];
  return {...book,[routeEditor]:{kind:'custom',points:[...prior,point].slice(-5)}};
 });
 const buttonLabel=(id:ReceiverId)=>roster?.skill[id].last??RECEIVERS.find(r=>r.id===id)?.label??'TARGET';
 const jersey=(id:ReceiverId)=>roster?.skill[id].number??RECEIVERS.find(r=>r.id===id)?.number??'--';
 useEffect(()=>{
  if(lobbyOpen||stage==='calling'||fieldMode!=='3d'||fieldLoaded)return;
  // A GPU can silently refuse to create a context without throwing to React.
  // Never strand a game behind an endless loading indicator.
  const handle=window.setTimeout(()=>{
   setFieldError('3D renderer did not finish initializing');
   setFieldMode('2d');
  },6500);
  return ()=>window.clearTimeout(handle);
 },[lobbyOpen,stage,fieldMode,fieldLoaded,rendererVersion]);
 useEffect(()=>{
  if(!game.clockRunning||lobbyOpen||showHelp||stage==='live'||stage==='finished')return;
  const interval=window.setInterval(()=>setGame(g=>{
   if(!g.clockRunning||g.status!=='playing')return g;
   const seconds=Math.max(0,g.seconds-1);
   return {...g,seconds,status:seconds?'playing':'lost',message:seconds?g.message:'TIME EXPIRES.'};
  }),1000);
  return ()=>window.clearInterval(interval);
 },[game.clockRunning,lobbyOpen,showHelp,stage]);
 useEffect(()=>{
  if(game.status!=='playing'&&stage!=='finished'&&!lobbyOpen){setStage('finished');}
 },[game.status,lobbyOpen,stage]);
 useEffect(()=>{
  keyboardAction.current=(e:KeyboardEvent)=>{
   const t=e.target;
   if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||e.altKey||e.metaKey||e.ctrlKey)return;
   if(lobbyOpen)return;
   if(e.code==='Escape'){
    if(showHelp)setShowHelp(false);
    else if(editingRoutes)setEditingRoutes(false);
    else if(stage==='calling')setStage('ready');
    else if(stage==='ready')setStage('calling');
    return;
   }
   if(showHelp)return;
   if(stage==='live'){
    if(e.code==='KeyQ'){setPassStyle('bullet');return;}
    if(e.code==='KeyE'){setPassStyle('touch');return;}
    const n=e.code.startsWith('Digit')?Number(e.code.slice(-1)):0;
    if(n>=1&&n<=5){e.preventDefault();if(!e.repeat)passTo(ROSTER[n-1]);return;}
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)passTo(receiver);}
   }else if(stage==='ready'){
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)snap();}
    if(e.code==='KeyP')setStage('calling');
   }else if(stage==='calling'){
    const n=e.code.startsWith('Digit')?Number(e.code.slice(-1)):0;
    if(n>=1&&n<=8&&teamBook[n-1])selectPlay(teamBook[n-1]);
    if(e.code==='Enter'||e.code==='Space'){e.preventDefault();breakHuddle();}
   }else if(stage==='result'&&(e.code==='Space'||e.code==='Enter')){
    e.preventDefault();nextPlay();
   }
   if(e.code==='KeyV')setView(v=>v==='coach'?'sideline':'coach');
  };
 });
 useEffect(()=>{
  const f=(event:KeyboardEvent)=>keyboardAction.current(event);
  window.addEventListener('keydown',f);
  return ()=>window.removeEventListener('keydown',f);
 },[]);
 return <div className="v5-shell" style={{'--team-color':teams[0].primary,'--opp-color':teams[1].primary} as React.CSSProperties}>
  <header className="v5-header">
   <div className="v5-brand"><span className="v5-bolt">ϟ</span><div><strong>ELECTRIC</strong><b>FOOTBALL</b></div><small>COACH'S CUT / V5</small></div>
   <div className="v5-score">
    <div className="v5-score-team"><span style={{background:teams[0].primary}}>{teams[0].abbr}</span><b>{game.ours}</b></div>
    <div className="v5-score-clock"><small>{scenarioId==='practice'?'4TH QUARTER':challenge?.quarter+' · '+challenge?.eyebrow}</small><strong className={remaining<=30?'urgent':''}>{formatClock(remaining)}</strong></div>
    <div className="v5-score-team v5-opponent"><b>{game.theirs}</b><span style={{background:teams[1].primary}}>{teams[1].abbr}</span></div>
   </div>
   <div className="v5-head-actions">
    <button className="v5-icon" onClick={()=>setView(v=>v==='coach'?'sideline':'coach')} aria-label="Toggle tactical camera" title="Camera V">{view==='coach'?<Layers size={18}/>:<Eye size={18}/>}</button>
    <button className="v5-icon v5-view-toggle" onClick={changeFieldMode} disabled={stage==='live'} title={fieldMode==='3d'?'Switch to reliable 2D tactical field':'Try 3D field again'} aria-label={'Field view: '+fieldMode}><span>{fieldMode.toUpperCase()}</span></button>
    <button className="v5-icon" onClick={()=>setQuality(v=>v==='performance'?'balanced':v==='balanced'?'high':'performance')} title={'Graphics: '+quality+' · '+(fps??'—')+' FPS'} aria-label="Cycle graphics quality"><Gauge size={18}/></button>
    <button className="v5-icon" onClick={()=>setSound(s=>!s)} aria-label={sound?'Mute sounds':'Enable sounds'} title="Toggle sound">{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
    <button className="v5-icon v5-desktop-only" onClick={()=>document.fullscreenElement?void document.exitFullscreen():void document.documentElement.requestFullscreen?.()} aria-label="Full screen"><Fullscreen size={18}/></button>
    <button className="v5-menu" onClick={()=>setLobbyOpen(true)} disabled={stage==='live'}>MATCHUP <ChevronRight size={14}/></button>
   </div>
  </header>
  <main className="v5-stage">
   {!lobbyOpen&&(stage==='calling'||fieldMode==='2d'?
    <TacticalField2D game={game} play={selected.play} call={call} routes={routes} live={stage==='calling'?null:live}
     request={throwRequest} onTick={setElapsed} onCoverage={setCoverage} onResult={complete}
     offenseColor={teams[0].primary} opponentColor={teams[1].primary} personnel={roster} preview={stage==='calling'}/>
    :<FieldErrorBoundary key={rendererVersion} onFailure={fieldFailure}
      fallback={<TacticalField2D game={game} play={selected.play} call={call} routes={routes} live={live}
        request={throwRequest} onTick={setElapsed} onCoverage={setCoverage} onResult={complete}
        offenseColor={teams[0].primary} opponentColor={teams[1].primary} personnel={roster}/>}>
      <Board3D yard={game.yard} toGo={game.toGo} defense={game.defense} play={selected.play}
       view={view} call={call} game={game} routes={routes} drawTarget={null} throwRequest={throwRequest}
       onDrawPoint={()=>{}} onSpatialResult={complete} onAutoThrow={passTo} onLead={()=>{}} assistAim={false}
       buttonPassing quality={quality} onFps={setFps} onReady={()=>setFieldLoaded(true)}
       offenseColor={teams[0].primary} opponentColor={teams[1].primary} personnel={roster}
       onCoverage={setCoverage} live={live} motion={null} aim={[0,game.yard+14]} receiver={receiver}
       onAim={()=>{}} onThrow={()=>{}} onSelect={setReceiver} onTick={setElapsed} onDone={()=>{}}/>
     </FieldErrorBoundary>)}
   {!lobbyOpen&&stage!=='calling'&&fieldMode==='3d'&&!fieldLoaded&&
     <div className="field-loading-cover" role="status"><strong>PREPARING THE FIELD</strong>
       <span>Initializing miniature players and stadium lighting…</span>
       <button onClick={()=>setFieldMode('2d')}>OPEN PLAYABLE 2D FIELD</button>
     </div>}
   {!lobbyOpen&&fieldMode==='2d'&&fieldError&&<div className="field-recovery-note">
     3D rendering failed on this device. The tactical field is playable in 2D.
   </div>}
   {stage==='calling'&&!lobbyOpen&&<div className="v5-call-situation">
    <span className="v5-eyebrow">SITUATION ROOM</span>
    <h3>{game.down}<sup>{game.down===1?'ST':game.down===2?'ND':game.down===3?'RD':'TH'}</sup> & {game.toGo}</h3>
    <p>{teams[0].abbr} BALL · {fieldSpot(game.yard)}</p>
    <div className="v5-field-mini"><div className="v5-field-track" style={{bottom:clamp(game.yard,4,94)+'%'}}><span/></div><span>GOAL</span><small>YOUR DRIVE</small><b>OWN 0</b></div>
    <div className="v5-clock-warning"><Clock3 size={15}/><span>{formatClock(game.seconds)}<small>{game.clockRunning?'CLOCK RUNNING':'CLOCK STOPPED'}</small></span></div>
    <small className="v5-difficulty">{challenge?.eyebrow??'CUSTOM MATCHUP'} · {game.timeouts} TIMEOUTS</small>
   </div>}
   <div className="v5-screen-vignette" aria-hidden="true"/>
   <div className="v5-field-ribbon">
    <div className="v5-down"><b>{game.down}<sup>{game.down===1?'ST':game.down===2?'ND':game.down===3?'RD':'TH'}</sup> & {game.toGo}</b><span>{fieldSpot(game.yard)}</span></div>
    <div className="v5-defense"><small>{stage==='live'&&elapsed>.6?'POST SNAP':'PRE SNAP'}</small><strong>{stage==='live'&&elapsed>.6?coverageInfo.name:read.shell}</strong></div>
   </div>
   {stage==='calling'&&!lobbyOpen&&<div className="v5-playcall">
    <div className="v5-call-top">
     <div><span className="v5-eyebrow"><BookOpen size={14}/> OFFENSIVE COORDINATOR · {teams[0].abbr}</span><h2>CALL THE PLAY.</h2><p>{STYLE_LABEL[teams[0].style]} · {game.clockRunning?'THE CLOCK IS RUNNING':'CLOCK STOPPED'}</p></div>
     <button className="v5-call-close" onClick={breakHuddle}><Check size={16}/> BREAK HUDDLE</button>
    </div>
    <div className="v5-call-layout">
     <div className="v5-play-list">
      <div className="v5-filter">{(['ALL','QUICK','SHOT','RUN'] as Category[]).map(cat=><button key={cat} className={filter===cat?'active':''} onClick={()=>setFilter(cat)}>{cat==='QUICK'?'PASS':cat==='SHOT'?'DEEP':cat==='RUN'?'RUN':'ALL'}</button>)}</div>
      <div className="v5-play-grid">{shown.map((c,i)=><button key={c.id} className={'v5-play-tile '+(chosenId===c.id?'active':'')} onClick={()=>selectPlay(c)}>
       <RoutePreview concept={c}/>
       <div className="v5-tile-label"><small>{c.family} · {c.formation.toUpperCase()}</small><b>{c.name}</b><span>{c.id===chosenId?'✓ SELECTED':'VIEW PLAY'}</span></div>
       <i>{i+1}</i>
      </button>)}</div>
     </div>
     <aside className="v5-call-detail">
      <div className="v5-detail-title"><div><small>THE CALL</small><h3>{selected.name}</h3></div><span>{selected.family}</span></div>
      <div className="v5-diagram-row"><RoutePreview concept={customized} large onWaypoint={editingRoutes&&drawingRoute?addWaypoint:undefined}/><div className="v5-read-detail"><strong><Zap size={15}/> QB'S NOTE</strong><p>{selected.tip}</p><small>{read.cue}</small></div></div>
      <div className="v5-coach-options">
       <label>FORMATION<select value={call.formation} onChange={e=>setCall(s=>({...s,formation:e.target.value as TacticalCall['formation']}))}>
        {FORMATIONS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
       <label>PROTECTION<select value={call.protection} onChange={e=>setCall(s=>({...s,protection:e.target.value as TacticalCall['protection']}))}>
        {PROTECTIONS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      <button className={'v5-route-toggle '+(editingRoutes?'active':'')} onClick={()=>setEditingRoutes(e=>!e)}>
       <Crosshair size={16}/> {editingRoutes?'DONE EDITING ROUTES':'CUSTOMIZE RECEIVER ROUTES'} <ChevronRight size={15}/>
      </button>
      {editingRoutes&&<div className="v5-route-editor">
       <div className="v5-target-tabs">{ROSTER.filter(id=>isEligible(id,call)).map(id=><button key={id} className={routeEditor===id?'active':''} onClick={()=>{setRouteEditor(id);setDrawingRoute(false);}}>{buttonLabel(id)}</button>)}</div>
       <div className="v5-route-options">{ROUTE_OPTIONS.map(o=><button key={o.kind} className={routes[routeEditor].kind===o.kind?'active':''} onClick={()=>editReceiverRoute(routeEditor,o.kind)}>{o.name}</button>)}</div>
       <button className={'v5-draw-button '+(drawingRoute?'active':'')} onClick={()=>{if(!drawingRoute)setRoutes(book=>({...book,[routeEditor]:{kind:'custom',points:[]}}));setDrawingRoute(v=>!v);}}><Crosshair size={14}/>{drawingRoute?'FINISH DRAWING':'DRAW ROUTE ON DIAGRAM'}</button>
       <small className="v5-draw-help">{drawingRoute?'Tap the large route diagram above to add up to five break points.':'Pick any preset or draw an original route.'}</small>
      </div>}
      <button className="v5-call-primary" onClick={breakHuddle}>CALL {selected.name}<ArrowRight size={21}/></button>
      {game.clockRunning&&<button className="v5-call-timeout" disabled={!game.timeouts} onClick={callTimeout}><TimerReset size={15}/> STOP THE CLOCK · {game.timeouts} TIMEOUT{game.timeouts===1?'':'S'}</button>}
     </aside>
    </div>
   </div>}
   {stage==='ready'&&!lobbyOpen&&<div className="v5-readyside"><span className="v5-eyebrow"><Shield size={15}/> PRE-SNAP · {teams[0].abbr} OFFENSE</span><h2>{selected.name}</h2><p>{selected.tip}</p><div><span>{FORMATIONS.find(f=>f.id===call.formation)?.name}</span><span>{PROTECTIONS.find(f=>f.id===call.protection)?.name}</span></div></div>}
   {stage==='live'&&!lobbyOpen&&<div className="v5-live-head">
    <div><span className="v5-eyebrow"><span className="v5-pulse"/> {running?'BALL CARRIER LIVE':'QB LIVE · READ & RELEASE'}</span>
     <strong>{running?'FIND THE CUTBACK':throwRequest?'BALL IN THE AIR':coverageInfo.name}</strong>
     <small>{running?'Watch the blocking and pursuit':throwRequest?'Follow the ball to the catch point':coverageInfo.weakness}</small></div>
    {!running&&<div className="v5-pocket"><small>POCKET</small><strong>{playSeconds.toFixed(1)}<span>s</span></strong><div><i style={{width:(100*playSeconds/pocket)+'%'}}/></div></div>}
   </div>}
   {stage==='result'&&result&&<div className="v5-result-card"><span>{result.complete?'PLAY COMPLETE':'NEXT DOWN'}</span><h2>{result.description}</h2><p>{result.yards>0?'+':''}{result.yards} YDS · {game.down} & {game.toGo} · {formatClock(game.seconds)} LEFT</p><button onClick={nextPlay}>CALL NEXT PLAY <ArrowRight size={17}/></button></div>}
   {stage==='finished'&&!lobbyOpen&&<div className="v5-finish">
    <span className="v5-eyebrow"><Trophy size={16}/> THE FINAL WHISTLE</span>
    <h1>{game.status==='won'?'DRIVE COMPLETE.':game.status==='tied'?'GAME TIED.':'DRIVE OVER.'}</h1>
    <p>{game.message}</p><strong>{teams[0].abbr} {game.ours} — {teams[1].abbr} {game.theirs}</strong>
    <div><button onClick={replay}><RotateCcw size={18}/> RETRY DRIVE</button><button onClick={()=>setLobbyOpen(true)}>NEW MATCHUP <ArrowRight size={18}/></button></div>
   </div>}
   {!lobbyOpen&&stage!=='calling'&&stage!=='finished'&&<div className="v5-camera-label">{view==='coach'?'ALL-22 · COACH CAM':'FIELD LEVEL · QB CAM'} <span>V TO SWITCH</span></div>}
  </main>
  {!lobbyOpen&&<footer className={'v5-controls v5-controls-'+stage}>
   {stage==='calling'&&<><div className="v5-control-copy"><span className="v5-eyebrow">READY TO PLAY</span><strong>{selected.name}</strong><small>Design a play, then break the huddle.</small></div><button className="v5-main-button" onClick={breakHuddle}>BREAK HUDDLE <ArrowRight size={21}/></button></>}
   {stage==='ready'&&<>
    <div className="v5-control-copy"><span className="v5-eyebrow"><Shield size={13}/> YOUR CALL</span><strong>{selected.name}</strong><small>{call.formation.toUpperCase()} · {call.protection.toUpperCase()} PROTECTION</small></div>
    <div className="v5-ready-actions"><button className="v5-secondary" onClick={()=>setStage('calling')}><BookOpen size={16}/> CHANGE PLAY</button><button className="v5-secondary" disabled={!game.clockRunning||!game.timeouts} onClick={callTimeout}><TimerReset size={16}/> TIMEOUT · {game.timeouts}</button><button className="v5-secondary" disabled={!game.clockRunning} onClick={()=>special('spike')}><Clock3 size={16}/> SPIKE</button><button className="v5-secondary" onClick={()=>special('fieldgoal')}><Goal size={16}/> KICK {kickDistance(game.yard)}</button></div>
    <button className="v5-main-button" onClick={snap}><Play size={21} fill="currentColor"/> SNAP THE BALL <kbd>SPACE</kbd></button>
   </>}
   {stage==='live'&&running&&<div className="v5-run-console"><div className="v5-pulse"/> <strong>RUN IN PROGRESS</strong><span>BLOCKING · PURSUIT · LIVE TACKLE ENGINE</span></div>}
   {stage==='live'&&!running&&<>
    <div className="v5-throw-toolbar">
     <span>PASS TYPE</span>
     <button className={passStyle==='bullet'?'active':''} onClick={()=>setPassStyle('bullet')}><Zap size={13}/> BULLET <kbd>Q</kbd></button>
     <button className={passStyle==='touch'?'active':''} onClick={()=>setPassStyle('touch')}><AudioLines size={13}/> TOUCH <kbd>E</kbd></button>
     <small>{passStyle==='bullet'?'QUICK & FLAT':'HIGHER ARC'}</small>
    </div>
    <div className="v5-pass-pad">
     {ROSTER.map((id,i)=>{
      const eligible=isEligible(id,call);
      const gap=coverage[id];
      const status=gap===undefined?'READ':gap>7?'OPEN':gap>3.5?'WINDOW':'COVERED';
      return <button key={id} className={'v5-receiver v5-receiver-'+status.toLowerCase()} disabled={!eligible||!canThrow} onClick={()=>passTo(id)}
       aria-label={'Throw to '+buttonLabel(id)+', '+(eligible?status:'blocking')}>
       <span className="v5-rcv-top"><kbd>{i+1}</kbd><small>#{jersey(id)}</small><span className="v5-status-dot"/></span>
       <strong>{buttonLabel(id)}</strong><span className="v5-rcv-status">{eligible?status:'BLOCKING'}</span>
      </button>;
     })}
    </div>
    <div className="v5-passing-tip">{throwRequest?'RELEASED':<><Crosshair size={15}/> TAP A RECEIVER TO THROW NOW</>}</div>
   </>}
   {stage==='result'&&<>
    <div className="v5-control-copy"><span className="v5-eyebrow">LAST PLAY</span><strong>{result?.complete?'MOVE THE CHAINS':'REGROUP'}</strong><small>{result?.description}</small></div>
    <div className="v5-ready-actions"><button className="v5-secondary" onClick={()=>setDriveInfo(v=>!v)}><Flag size={15}/> DRIVE LOG</button><button className="v5-secondary" disabled={!game.clockRunning||!game.timeouts} onClick={callTimeout}><TimerReset size={16}/> TIMEOUT · {game.timeouts}</button></div>
    <button className="v5-main-button" onClick={nextPlay}>NEXT PLAY <ArrowRight size={20}/></button>
   </>}
   {stage==='finished'&&<div className="v5-ending-controls"><b>{teams[0].name} · {game.status.toUpperCase()}</b><span>Unofficial football experience</span></div>}
  </footer>}
  {!lobbyOpen&&<div className="v5-utility">
   <button onClick={()=>setDriveInfo(d=>!d)} aria-label="Toggle drive history" title="Drive history"><Flag size={15}/> <span>{history.length} PLAYS</span></button>
   <button onClick={()=>setShowHelp(true)} aria-label="How to play">?</button>
  </div>}
  {driveInfo&&!lobbyOpen&&<div className="v5-history">
   <div><h3>DRIVE TRACKER</h3><button onClick={()=>setDriveInfo(false)}>×</button></div>
   {history.length?history.map(e=><p key={e.id}><strong>{formatClock(e.clock)}</strong> {e.label} <b>{e.gain>0?'+':''}{e.gain}</b></p>):<p>No plays run yet. Design a call and snap the ball.</p>}
  </div>}
  {showHelp&&<div className="v5-help-backdrop" onClick={()=>setShowHelp(false)}><div className="v5-help" onClick={e=>e.stopPropagation()}>
   <button className="v5-help-close" onClick={()=>setShowHelp(false)}>×</button><span className="v5-eyebrow"><Headphones size={14}/> THE COACH'S GUIDE</span>
   <h2>DESIGN. READ. RELEASE.</h2><p>Pick a play in the coach's book and adjust routes and protection. Break the huddle, then SNAP. When your QB goes live, the five receiver buttons are the entire passing interface.</p>
   <p><b>1–5</b> throws to receivers instantly · <b>Q/E</b> switch bullet/touch · <b>V</b> camera · <b>Space</b> snap or pass to the highlighted target.</p>
   <p>OPEN/WINDOW/COVERED reflect current defender distance, not a guaranteed catch. Throw as separation develops. Bullet passes arrive faster; touch passes arc higher and take longer.</p>
   <button className="v5-main-button" onClick={()=>setShowHelp(false)}>BACK TO THE GAME <Check size={16}/></button>
  </div></div>}
  {lobbyOpen&&<Pregame canClose={started} onClose={()=>setLobbyOpen(false)} onChallenge={startChallenge} onExhibition={startExhibition}/>}
 </div>;
}
export default GameExperience;
