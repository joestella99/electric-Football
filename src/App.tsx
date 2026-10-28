import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleHelp, Clock3, Crosshair, Eye, Flag, Fullscreen, Goal, Keyboard, RotateCcw, Shield, Target, TimerReset, Zap, Gauge, Volume2, VolumeX, SlidersHorizontal, X, ScanEye, ClipboardList } from 'lucide-react';
import Board3D, { type Live, type Motion, type ThrowRequest } from './components/Board3D';
import Pregame from './components/Pregame';
import { HISTORICAL_CHALLENGES,TEAM_BY_ID,STYLE_LABEL,practiceGame,teamPlaybook } from './logic/nfl';
import { fieldSpot, formatClock, initialGame, kickDistance, simulate, useTimeout, type GameState, type PlayId, type Result } from './logic/drill';
import { RECEIVERS, passPlay, pressureLimit, type Point, type ReceiverId } from './logic/throwing';
import { ROUTE_OPTIONS, starterRoutes, routeAt, type RouteKind, type RouteBook } from './logic/spatial';
import { DEFAULT_CALL, FORMATIONS, PROTECTIONS, isEligible, presnapRead, coachingCue, type TacticalCall } from './logic/tactics';
import { COVERAGES, selectCoverage, type CoverageId } from './logic/coverage';
import { playCue } from './logic/audio';

type View = 'sideline' | 'coach';
type Feed = { id: number; label: string; clock: number; gain: number; grade: string };
const PASS_PROGRESSIONS:Record<string,ReceiverId[]>={
  quick:[7,10,1,9,8],sideline:[9,8,1,7,10],deep:[9,7,8,10,1],screen:[1,10,9,7,8]
};
function progression(play:PlayId,coverage:CoverageId,call:TacticalCall):ReceiverId[]{
  const initial:ReceiverId[]=PASS_PROGRESSIONS[play]??PASS_PROGRESSIONS.quick;
  const adjusted:ReceiverId[]=coverage==='cover0'?[10,...initial]:coverage==='cover2'?[9,...initial]:coverage==='cover3'?[1,...initial]:initial;
  return [...new Set<ReceiverId>(adjusted)].filter(id=>isEligible(id,call)).slice(0,3);
}
const ICON: Record<PlayId,string> = {
  quick:'↗',sideline:'⌝',deep:'↑',screen:'↘',inside:'⇧',outside:'↝',spike:'⏱',fieldgoal:'⌁'
};
function App() {
  const [scenarioId,setScenarioId]=useState('lviii-final');
  const [offenseId,setOffenseId]=useState('KC');
  const [opponentId,setOpponentId]=useState('SF');
  const [lobbyOpen,setLobbyOpen]=useState(true);
  const [started,setStarted]=useState(false);
  const [selectedConcept,setSelectedConcept]=useState('outsidezone');
  const [game,setGame]=useState<GameState>(()=>initialGame());
  const [play,setPlay]=useState<PlayId>('quick');
  const [routes,setRoutes]=useState<RouteBook>(()=>starterRoutes('quick'));
  const [drawing,setDrawing]=useState<ReceiverId|null>(null);
  const [coverage,setCoverage]=useState<Record<number,number>>({});
  const [fps,setFps]=useState<number|null>(null);
  const [soundOn,setSoundOn]=useState(true);
  const [quality,setQuality]=useState<'performance'|'balanced'|'high'>(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches?'performance':'balanced');
  const [throwRequest,setThrowRequest]=useState<ThrowRequest|null>(null);
  const [routeEditor,setRouteEditor]=useState<ReceiverId>(7);
  const [call,setCall]=useState<TacticalCall>({...DEFAULT_CALL});
  const [tacticsOpen,setTacticsOpen]=useState(false);
  const [view,setView]=useState<View>('sideline');
  const [receiver,setReceiver]=useState<ReceiverId>(7);
  const [live,setLive]=useState<Live|null>(null);
  const [motion,setMotion]=useState<Motion|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [aim,setAim]=useState<Point>(()=>{const p=routeAt(7,starterRoutes('quick')[7],'spread',2);return [p[0],41+p[1]];});
  const [autoLead,setAutoLead]=useState(true);
  const [last,setLast]=useState<Result|null>(null);
  const [feed,setFeed]=useState<Feed[]>([]);
  const [help,setHelp]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const sequence=useRef(0);
  const keyboardRef=useRef<(event:KeyboardEvent)=>void>(()=>{});
  const active=!!live||!!motion;
  const ownTeam=TEAM_BY_ID[offenseId],opposingTeam=TEAM_BY_ID[opponentId];
  const teamBook=teamPlaybook(offenseId);
  const currentConcept=teamBook.find(c=>c.id===selectedConcept);
  const finished=game.status!=='playing';
  const pressure=pressureLimit(game.defense,call.protection);
  const read=presnapRead(game.defense);
  const coverageCall=selectCoverage(game.defense,game.plays);
  const coverageInfo=COVERAGES[coverageCall];
  const postSnap=!!live&&elapsed>=.5;
  const runInProgress=!!live&&!passPlay(live.play);
  const suggested=progression(play,coverageCall,call);
  const coachNote=coachingCue(game,play,call);
  const remaining=Math.max(0,game.seconds-(live?Math.ceil(elapsed):0)-(live&&game.clockRunning?7:0));
  const progress=live? Math.min(100,(elapsed/pressure)*100):0;
  const throwing=throwRequest!==null;
  const selectedName=RECEIVERS.find(r=>r.id===receiver)?.label??'HARRIS';

  const setupDrive=(fresh:GameState,teamId:string,opponent:string,id:string)=>{
    const concept=teamPlaybook(teamId)[0];
    setOffenseId(teamId);setOpponentId(opponent);setScenarioId(id);
    setGame({...fresh});setPlay(concept.play);setReceiver(7);setSelectedConcept(concept.id);
    setCall({formation:concept.formation,protection:concept.protection});
    setRoutes(concept.routes);setDrawing(null);setThrowRequest(null);setCoverage({});setRouteEditor(7);
    setTacticsOpen(false);setLobbyOpen(false);setStarted(true);
    const p=routeAt(7,concept.routes[7],concept.formation,2);
    setAim([p[0],Math.max(1,Math.min(99,fresh.yard+p[1]))]);setAutoLead(true);
    setLive(null);setMotion(null);setElapsed(0);setLast(null);setFeed([]);
    sequence.current+=1;
  };
  const startHistorical=(id:string)=>{
    const s=HISTORICAL_CHALLENGES.find(v=>v.id===id)??HISTORICAL_CHALLENGES[0];
    setupDrive(s.initial,s.offense,s.opponent,s.id);
  };
  const startPractice=(teamId:string,opponent:string)=>setupDrive(practiceGame(teamId,opponent),teamId,opponent,'practice');
  const reset=()=>{
    if(scenarioId==='practice')startPractice(offenseId,opponentId);
    else startHistorical(scenarioId);
  };

  const completePlay=useCallback((result:Result)=>{
    const cue=result.description.startsWith('TOUCHDOWN')?'touchdown':result.turnover?'interception':(result.play==='inside'||result.play==='outside')?'run':result.description.includes('SACKED')?'sack':result.complete?'catch':'incomplete';
    playCue(cue,soundOn);
    setGame(result.state);setThrowRequest(null);setCoverage({});setDrawing(null);
    setFeed(items=>[{id:++sequence.current,label:result.description,clock:result.state.seconds,gain:result.yards,grade:result.grade},...items].slice(0,8));
    setLast(result);setMotion(null);setLive(null);setElapsed(0);setAutoLead(true);
  },[soundOn]);

  const snap=useCallback(()=>{
    if(active||finished)return;
    playCue('snap',soundOn);
    setLast(null);
    if(passPlay(play)||play==='inside'||play==='outside'){
      setElapsed(0);setAutoLead(true);setTacticsOpen(false);setDrawing(null);setAim(lead(receiver,2));
      setLive({id:++sequence.current,play});
    } else {
      const result=simulate(game,play,'hurry',Math.random,call);
      setMotion({id:++sequence.current,result,startYard:game.yard});
    }
  },[active,finished,play,receiver,game,call,routes,soundOn]);

  const lead=useCallback((id:ReceiverId,t:number):Point=>{
    const p=routeAt(id,routes[id],call.formation,t);
    return [p[0],Math.max(1,Math.min(99,game.yard+p[1]))];
  },[routes,call.formation,game.yard]);
  const choose=useCallback((id:ReceiverId)=>{
    if(!isEligible(id,call))return;
    setReceiver(id);setAutoLead(true);setAim(lead(id,live?elapsed+1:2));
  },[call,lead,live,elapsed]);
  const throwNow=useCallback((point:Point,id?:ReceiverId,assisted=false)=>{
    if(!live||!passPlay(live.play)||throwRequest)return;
    const selected=id??receiver;
    if(!isEligible(selected,call))return;
    playCue('throw',soundOn);
    setThrowRequest({id:++sequence.current,point,receiver:selected,assisted});
  },[live,throwRequest,receiver,call,soundOn]);
  const onTick=useCallback((seconds:number)=>setElapsed(seconds),[]);
  const chooseRoute=(kind:RouteKind)=>{
    if(active||finished)return;
    setDrawing(null);setRoutes(prev=>({...prev,[routeEditor]:{kind}}));
  };
  const drawPoint=(point:Point)=>{
    if(drawing===null||active)return;
    setRoutes(prev=>{
      const prevPoints=prev[drawing].kind==='custom'?prev[drawing].points??[]:[];
      return {...prev,[drawing]:{kind:'custom',points:[...prevPoints.slice(-4),[point[0],Math.max(0,Math.min(72,point[1]-game.yard))]]}};
    });
  };
  const changePlay=(id:string)=>{
    if(active||finished)return;
    const concept=teamBook.find(p=>p.id===id);
    if(!concept)return;
    setSelectedConcept(concept.id);
    setPlay(concept.play);
    setRoutes(concept.routes);setDrawing(null);setReceiver(7);
    setCall({formation:concept.formation,protection:concept.protection});
    const point=routeAt(7,concept.routes[7],concept.formation,2);
    setAim([point[0],Math.max(1,Math.min(99,game.yard+point[1]))]);
    setAutoLead(true);
  };
  const special=(id:'spike'|'fieldgoal')=>{
    if(active||finished)return;
    completePlay(simulate(game,id,'hurry',Math.random,call));
  };
  const timeout=()=>setGame(state=>useTimeout(state));
  const chooseFormation=(formation:TacticalCall['formation'])=>{
    if(active||finished)return;
    setCall(prev=>({...prev,formation}));setAim([routeAt(receiver,routes[receiver],formation,2)[0],game.yard+routeAt(receiver,routes[receiver],formation,2)[1]]);setAutoLead(true);
  };
  const chooseProtection=(protection:TacticalCall['protection'])=>{
    if(active||finished)return;
    setCall(prev=>({...prev,protection}));
    if(protection==='max' && receiver===1){setReceiver(7);setAim(lead(7,2));}
  };
  const fullscreen=()=>{
    if(document.fullscreenElement)void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  // Real late-game urgency: a running clock continues while you choose your next play.
  useEffect(()=>{
    if(!game.clockRunning||active||finished||help||lobbyOpen)return;
    const handle=window.setInterval(()=>{
      setGame(old=>{
        if(!old.clockRunning||old.status!=='playing')return old;
        const seconds=Math.max(0,old.seconds-1);
        return {...old,seconds,status:seconds?old.status:'lost',message:seconds?old.message:'THE CLOCK HITS ZERO. DRIVE OVER.'};
      });
    },1000);
    return ()=>window.clearInterval(handle);
  },[game.clockRunning,active,finished,help,lobbyOpen]);

  useEffect(()=>{
    const listener=(event:KeyboardEvent)=>{
      const element=event.target;
      if(element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement)return;
      if(event.code==='Escape'){setHelp(false);return;}
      if(help||lobbyOpen)return;
      if(event.code==='Space'){
        event.preventDefault();
        if(event.repeat)return;
        if(live&&passPlay(live.play))throwNow(aim,undefined,true);
        else if(!active&&!finished)snap();
      }
      const digit=event.code.startsWith('Digit')?Number(event.code.slice(-1)):0;
      if(digit>=1&&digit<=8){
        event.preventDefault();
        if(live&&digit<=5 && isEligible(RECEIVERS[digit-1].id,call))choose(RECEIVERS[digit-1].id);
        else if(!active&&!finished&&digit<=8&&teamBook[digit-1])changePlay(teamBook[digit-1].id);
      }
      if(event.code==='KeyV')setView(v=>v==='sideline'?'coach':'sideline');
      if(event.code==='KeyC'&&!active)setTacticsOpen(v=>!v);
    };
    keyboardRef.current=listener;
  });
  useEffect(()=>{
    const listener=(event:KeyboardEvent)=>keyboardRef.current(event);
    window.addEventListener('keydown',listener);
    return ()=>window.removeEventListener('keydown',listener);
  },[]);

  const runPlay=!passPlay(play);
  return <div className="game-shell">
    <header className="topbar">
      <div className="wordmark"><span className="bolt">ϟ</span><span>ELECTRIC<strong>FOOTBALL</strong></span><i>ARCADE</i></div>
      <div className="scorebug">
        <div className="team-score"><span className="team-emblem home" style={{background:ownTeam.primary,borderColor:ownTeam.secondary,color:'#fff'}}>{ownTeam.abbr}</span><span className="team-name">{ownTeam.abbr}</span><b>{game.ours}</b></div>
        <div className="score-middle"><span>{scenarioId==='practice'?'4TH QUARTER':HISTORICAL_CHALLENGES.find(s=>s.id===scenarioId)?.quarter+' · HISTORIC'}</span><strong className={remaining<31?'critical':''}>{formatClock(remaining)}</strong></div>
        <div className="team-score away-score"><b>{game.theirs}</b><span className="team-name">{opposingTeam.abbr}</span><span className="team-emblem away" style={{background:opposingTeam.primary,borderColor:opposingTeam.secondary,color:'#fff'}}>{opposingTeam.abbr}</span></div>
      </div>
      <div className="toolbar">
        <button className="matchup-switch" onClick={()=>setLobbyOpen(true)} title="Choose NFL teams or historical challenge"><Shield size={15}/><span>CHANGE MATCHUP</span></button>
        <button className="quality-toggle" onClick={()=>setQuality(q=>q==='performance'?'balanced':q==='balanced'?'high':'performance')} title="Switch between performance, balanced and high graphics settings" aria-label={'Graphics: '+quality+', '+(fps??'--')+' FPS'}><Gauge size={15}/><span>{quality.toUpperCase()} · {fps??'--'} FPS</span></button>
        <button className="icon-button" aria-label={soundOn?'Mute game audio':'Enable game audio'} title={soundOn?'Mute sounds':'Enable sounds'} onClick={()=>setSoundOn(v=>!v)}>{soundOn?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
        <button className="icon-button" aria-label="How to play" title="How to play" onClick={()=>setHelp(true)}><CircleHelp size={19}/></button>
        <button className="icon-button fullscreen-icon" aria-label="Full screen" title="Full screen" onClick={fullscreen}><Fullscreen size={18}/></button>
      </div>
    </header>
    <div className="arena">
      <Board3D offenseColor={ownTeam.primary} opponentColor={opposingTeam.primary} yard={game.yard} toGo={game.toGo} defense={game.defense} play={play} view={view} call={call} game={game}
        live={live} motion={motion} aim={aim} receiver={receiver} routes={routes} drawTarget={drawing} throwRequest={throwRequest}
        onSelect={choose} onAim={point=>{if(!throwing){setAutoLead(false);setAim(point);}}}
        onDrawPoint={drawPoint} onThrow={throwNow} onAutoThrow={id=>throwNow(aim,id,true)} onLead={setAim} assistAim={autoLead}
        quality={quality} onFps={setFps} onTick={onTick} onCoverage={setCoverage}
        onSpatialResult={completePlay} onDone={()=>{if(motion)completePlay(motion.result);}}/>
      <div className="screen-grain" aria-hidden="true"/>
      <div className="arena-header">
        <div className="down-flag"><b>{game.down}<sup>{game.down===1?'ST':game.down===2?'ND':game.down===3?'RD':'TH'}</sup> &amp; {game.toGo}</b><span>{fieldSpot(game.yard)}</span></div>
        <div className="defense-read"><Shield size={15}/><span>{postSnap?'DEFENSE ROTATED':'PRE-SNAP LOOK'}</span><strong>{postSnap?coverageInfo.name:read.shell}</strong></div>
      </div>
      {!active&&!finished&&!lobbyOpen&&currentConcept&&<div className="play-brief"><div><small>{ownTeam.abbr} OFFENSE · {STYLE_LABEL[ownTeam.style]}</small><b>{currentConcept.name}</b><span>{currentConcept.tip}</span></div><button onClick={()=>setTacticsOpen(true)}>EDIT ROUTES</button></div>}
      {!live&&!motion&&!finished&&<div className="coach-banner"><ScanEye size={14}/><span><strong>{read.cue}</strong><small>{coachNote}</small></span><button onClick={()=>setTacticsOpen(true)}><ClipboardList size={14}/> COACH'S BOARD</button></div>}
      {postSnap&&<div className="coverage-coach-strip"><b>{coverageInfo.name}</b><span>{coverageInfo.description}</span><small>ATTACK: {coverageInfo.weakness}</small></div>}
      <div className="camera-switch">
        <button className={view==='sideline'?'active':''} onClick={()=>setView('sideline')}><Eye size={14}/> FIELD</button>
        <button className={view==='coach'?'active':''} onClick={()=>setView('coach')}><Target size={14}/> TACTICAL</button>
      </div>

      {tacticsOpen&&!active&&!finished&&<div className="tactics-sheet">
        <div className="sheet-top"><div><span>{ownTeam.name.toUpperCase()} / OFFENSE</span><h3>COACH'S BOARD</h3></div><button onClick={()=>setTacticsOpen(false)} aria-label="Close tactics"><X size={20}/></button></div>
        <p className="sheet-cue">{read.shell} · {read.cue}</p>
        <div className="coaching-identity"><strong>{ownTeam.name}</strong><span>{STYLE_LABEL[ownTeam.style]}</span><small>{currentConcept?.tip??"Read the defense and call the right play."}</small></div>
        <label>OFFENSIVE FORMATION</label>
        <div className="scheme-grid">{FORMATIONS.map(option=><button key={option.id} className={call.formation===option.id?'active':''} onClick={()=>chooseFormation(option.id)}><strong>{option.name}</strong><small>{option.detail}</small></button>)}</div>
        <label>PASS PROTECTION</label>
        <div className="scheme-grid">{PROTECTIONS.map(option=><button key={option.id} className={call.protection===option.id?'active':''} onClick={()=>chooseProtection(option.id)}><strong>{option.name}</strong><small>{option.detail}</small></button>)}</div>
        <label>RECEIVER ROUTE DESIGN / {RECEIVERS.find(r=>r.id===routeEditor)?.label}</label>
        <div className="route-players">{RECEIVERS.filter(r=>isEligible(r.id,call)).map(r=><button key={r.id} className={routeEditor===r.id?'active':''} onClick={()=>{setRouteEditor(r.id);setReceiver(r.id);setDrawing(null);}}>
          #{r.number} {r.role}</button>)}</div>
        <div className="route-presets">{ROUTE_OPTIONS.map(r=><button key={r.kind} className={routes[routeEditor].kind===r.kind&&!drawing?'active':''} onClick={()=>chooseRoute(r.kind)} title={r.description}>{r.name}</button>)}</div>
        <div className="draw-tools">
          <button className={drawing!==null?'drawing':''} onClick={()=>{setDrawing(routeEditor);setTacticsOpen(false);setRoutes(prev=>({...prev,[routeEditor]:{kind:'custom',points:[]}}));}}><Crosshair size={15}/> {drawing!==null?'DRAWING — TAP FIELD':'DRAW CUSTOM ROUTE'}</button>
          {drawing!==null&&<button onClick={()=>setDrawing(null)}>DONE DRAWING</button>}
        </div>
        <small className="route-explainer">{drawing!==null?'Tap the tabletop to add waypoints from the selected receiver. Add several points, then choose Done Drawing.':'Every receiver runs the route shown on the tabletop. Change any route, then snap and throw when separation develops.'}</small>
        <div className="sheet-footer"><span><Zap size={15}/> PROJECTED POCKET: <b>{pressure.toFixed(1)}s</b></span><span>{call.protection==='max'?'RB stays home to block':'ALL FIVE TARGETS ELIGIBLE'}</span></div>
        <button className="sheet-done" onClick={()=>{setDrawing(null);setTacticsOpen(false);}}>SET THE PLAY <ArrowRight size={16}/></button>
      </div>}
      {live&&passPlay(live.play)&&<div className="pressure-panel"><div className="pressure-heading"><span className="hot-dot"/> POCKET COLLAPSING <strong>{Math.max(0,pressure-elapsed).toFixed(1)}s</strong></div>
        <div className="pressure-track"><i style={{width:progress+'%'}}/></div><small>{throwing?'FOOTBALL IN THE AIR — WATCH THE CATCH POINT':'THROW INTO REAL SPACE AS RECEIVERS BREAK OPEN'}</small></div>}
      {drawing!==null&&!active&&<div className="drawing-tip"><span>DRAWING #{RECEIVERS.find(r=>r.id===drawing)?.number} · TAP FIELD FOR WAYPOINTS</span><button onClick={()=>setDrawing(null)}>FINISH ROUTE <ArrowRight size={14}/></button></div>}
      {!active&&!finished&&!last&&drawing===null&&<div className="floating-tip"><span className="keycap">SPACE</span> SNAP THE BALL <span className="tip-separator"/> THEN READ YOUR RECEIVERS</div>}
      {motion&&<div className="action-hint"><span className="hot-dot"/> PLAY IN MOTION</div>}
      {last&&!active&&!finished&&<div className="play-result" key={last.state.plays}><span className={'grade grade-'+last.grade}>{last.grade}</span><div><strong>{last.description}</strong><small>{last.yards>=0?'+':''}{last.yards} YARDS · -{last.elapsed}s · {formatClock(game.seconds)} LEFT</small></div></div>}
      {finished&&<div className="finish-overlay"><span className="final-eyebrow">FINAL WHISTLE</span><h1>{game.status==='won'?'DRIVE COMPLETE.':game.status==='tied'?'ALL TIED UP.':'GAME OVER.'}</h1><p>{game.message}</p><button onClick={()=>reset()}><RotateCcw size={17}/> PLAY AGAIN</button></div>}
      <div className="drive-access"><button className={historyOpen?'opened':''} onClick={()=>setHistoryOpen(v=>!v)}><Flag size={14}/> DRIVE LOG <span>{feed.length}</span></button>
        {historyOpen&&<div className="drive-popover"><strong>THIS DRIVE</strong>{feed.length?feed.map(item=><div key={item.id}><b>{item.grade}</b><span>{item.label}<small>{formatClock(item.clock)} · {item.gain>=0?'+':''}{item.gain} YDS</small></span></div>):<p>YOUR DRIVE STARTS HERE.</p>}</div>}
      </div>
      <div className="game-corner">VIBRA-BOWL / COACH'S VIEW <span>·</span> V3.0</div>
    </div>

    <section className={'control-deck '+(live?'deck-live':'')}>
      <div className="deck-meta">
        <div className="label-tiny"><span className="live-led"/> {live?'QUARTERBACK MODE':active?'PLAYING':'OFFENSIVE COORDINATOR'}</div>
        <h2>{runInProgress?'FOLLOW THE BLOCKS.':live?'READ THE COVERAGE.':finished?'THE FINAL DRIVE.':motion?'WATCH THE PLAY.':'CALL YOUR SHOT.'}</h2>
        <p>{runInProgress?'Real pursuit and tackle detection—no yardage roll.':live?'Progress through the reads, then hit the window.':motion?'Players are in motion.':finished?'Run it back or try a different scenario.':STYLE_LABEL[ownTeam.style]+' · '+(currentConcept?.name??'CHOOSE A PLAY')}</p>
        {!live&&!active&&!finished&&<button className="coach-dock-button" onClick={()=>setTacticsOpen(true)}><SlidersHorizontal size={15}/> CHANGE SCHEME <span>C</span></button>}
      </div>

      {runInProgress?<div className="run-live">
        <div className="run-live-label"><Zap size={21}/><strong>LIVE HANDOFF</strong><span>THE DEFENSE IS PURSUING THE BALL</span></div>
        <div className="run-live-bands"><span>GAP {play==='outside'?'EDGE / OUTSIDE':'B GAP / INSIDE'}</span><span>{elapsed.toFixed(1)} SEC</span></div>
      </div> : live ? <>
        <div className="receiver-picker">
          {RECEIVERS.map((r,i)=><button disabled={!isEligible(r.id,call)} className={'receiver-choice '+(receiver===r.id?'selected':'')} key={r.id} onClick={()=>choose(r.id)}>
            <kbd>{i+1}</kbd><span className="jersey">#{r.number}</span><b>{r.label}</b><small className={'receiver-status status-'+((coverage[r.id]??0)>7?'green':(coverage[r.id]??0)>3.5?'amber':'red')}>{isEligible(r.id,call)?(coverage[r.id]===undefined?'READING':coverage[r.id]>7?'OPEN':coverage[r.id]>3.5?'WINDOW':'COVERED'):'BLOCKING'}</small>
          </button>)}
        </div>
        <div className="action-stack live-actions">
          <span className="action-label"><Crosshair size={13}/> {autoLead?'AUTO-LEADING':'MANUAL AIM'} · {selectedName}</span>
          <button className="primary-action throw-action" disabled={throwing} onClick={()=>throwNow(aim,undefined,true)}><Target size={19}/> THROW NOW <kbd>SPACE</kbd></button>
          <span className="action-foot">{throwing?'BALL RELEASED':suggested.map((id,i)=>`${i+1}. ${RECEIVERS.find(r=>r.id===id)?.label}`).join(' → ')}</span>
        </div>
      </> : <>
        <div className="play-selector nfl-playbook">
          {teamBook.map((p,i)=><button key={p.id} title={p.tip} className={'play-choice '+(selectedConcept===p.id?'picked':'')} disabled={active||finished}
            onClick={()=>changePlay(p.id)}>
            <span className="play-index">{i+1}</span><span className="route-icon">{ICON[p.play]}</span><b>{p.name}</b><small>{p.family}</small>
          </button>)}
        </div>
        <div className="action-stack">
          <span className="action-label">{active?'PLAY IN PROGRESS':(runPlay?'RUNNING PLAY':'PASSING PLAY')+' · '+game.defense}</span>
          <button className="primary-action" onClick={snap} disabled={active||finished}><Zap size={20} fill="currentColor"/> SNAP BALL <kbd>SPACE</kbd></button>
          <div className="secondary-actions">
            <button disabled={active||finished||!game.clockRunning||game.timeouts<1} onClick={timeout}><TimerReset size={14}/> TIMEOUT <b>{game.timeouts}</b></button>
            <button disabled={active||finished} onClick={()=>special('spike')}><Clock3 size={14}/> SPIKE</button>
            <button disabled={active||finished} onClick={()=>special('fieldgoal')}><Goal size={14}/> KICK <small>{kickDistance(game.yard)}YD</small></button>
          </div>
        </div>
      </>}
    </section>

    <footer className="micro-footer"><span>32 NFL TEAMS · ORIGINAL TEAM-STYLE PLAYBOOKS · HISTORICAL SCENARIOS</span><button onClick={()=>reset()}><RotateCcw size={12}/> RESET DRIVE</button><span>UNOFFICIAL · NOT AFFILIATED WITH THE NFL OR ITS CLUBS</span></footer>

    {lobbyOpen&&<Pregame canClose={started} onClose={()=>setLobbyOpen(false)} onChallenge={startHistorical} onExhibition={startPractice}/>}
    {help&&<div className="modal-scrim" onClick={()=>setHelp(false)} role="presentation">
      <div className="help-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={e=>e.stopPropagation()}>
        <button className="close-help" onClick={()=>setHelp(false)} aria-label="Close">×</button>
        <span className="help-kicker">FIELD MANUAL / NO. 001</span><h2>YOU'RE THE<br/><em>QUARTERBACK.</em></h2>
        <p>One drive to win. Call your plays, read the defense, and make every throw yourself.</p>
        <div className="help-steps"><div><b>01</b><span><strong>PICK A PLAY</strong><small>Team-flavored football concepts. Choose based on down and defensive look.</small></span></div>
          <div><b>02</b><span><strong>SNAP — SPACE</strong><small>Players come to life. Passing plays put you in QB control.</small></span></div>
          <div><b>03</b><span><strong>THROW — CLICK OR SPACE</strong><small>Choose receivers 1–5. Click exactly where to throw, or press Space to lead the selected target. Timing matters.</small></span></div>
          <div><b>04</b><span><strong>BEAT THE CLOCK</strong><small>The clock keeps running after in-bounds catches. Timeouts, spikes and kicks matter.</small></span></div></div>
        <div className="help-keys"><Keyboard size={17}/> KEYS: 1–8 PLAYS · 1–5 RECEIVERS · C COACH'S BOARD · V CAMERA · SPACE SNAP/THROW</div>
        <button className="help-start" onClick={()=>setHelp(false)}>GOT IT. LET'S PLAY <ArrowRight size={19}/></button>
      </div>
    </div>}
  </div>;
}
export default App;
