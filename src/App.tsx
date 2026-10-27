import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Check, ChevronDown, Clock3, Crosshair, Flag, Gamepad2, Maximize2, Play, RotateCcw, Scan, Shield, Target, Volume2, Zap } from 'lucide-react';
import Board3D, { type Live, type Motion } from './components/Board3D';
import { SCENARIOS, PLAYS, initialGame, formatClock, fieldSpot, kickDistance, simulate, useTimeout, type GameState, type PlayId, type Result, type Tempo } from './logic/drill';
import { RECEIVERS, receiverPoint, pressureLimit, passPlay, resolveThrow, resolveSack, type Point, type ReceiverId } from './logic/throwing';

const VERSION='01.0';

type View='angled'|'top';
type HistoryItem={id:number;description:string;yards:number;grade:Result['grade'];time:string};

function EightBit({children}:{children:React.ReactNode}) {return <span className="eightbit">{children}</span>;}
function SmallLogo() {
  return <div className="logo-lockup">
    <div className="logo-square"><span>EV</span><span className="logo-volt">↯</span></div>
    <div className="logo-copy"><span>ELECTRIC</span><strong>FOOTBALL<span className="logo-reg">®-INSPIRED</span></strong></div>
  </div>;
}
function Digit({label,value,hot=false}:{label:string;value:string|number;hot?:boolean}) {
  return <div className={'digit '+(hot?'digit-hot':'')}><span className="digit-label">{label}</span><strong>{value}</strong></div>;
}
function App(){
  const [scenarioId,setScenarioId]=useState(SCENARIOS[0].id);
  const [game,setGame]=useState<GameState>(()=>initialGame());
  const [play,setPlay]=useState<PlayId>('quick');
  const [tempo,setTempo]=useState<Tempo>('hurry');
  const [view,setView]=useState<View>('angled');
  const [receiver,setReceiver]=useState<ReceiverId>(7);
  const [live,setLive]=useState<Live|null>(null);
  const [motion,setMotion]=useState<Motion|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [aim,setAim]=useState<Point>(()=>receiverPoint(7,'quick',initialGame().yard,1.5));
  const [autoLead,setAutoLead]=useState(true);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [last,setLast]=useState<Result|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const seq=useRef(0);
  const busy=!!live||!!motion;
  const selectedReceiver=RECEIVERS.find(r=>r.id===receiver)!;
  const terminal=game.status!=='playing';
  const visibleSeconds=Math.max(0,game.seconds-(live?Math.floor(elapsed):0)-(live&&game.clockRunning?7:0));
  const leadTarget=useCallback((id:ReceiverId,at=1.35)=>receiverPoint(id,play,game.yard,at),[play,game.yard]);

  const chooseReceiver=useCallback((id:ReceiverId)=>{
    setReceiver(id);
    setAutoLead(true);
    setAim(leadTarget(id,live?elapsed+.85:1.35));
  },[leadTarget,live,elapsed]);

  const reset=useCallback((id=scenarioId)=>{
    const scenario=SCENARIOS.find(s=>s.id===id)??SCENARIOS[0];
    const next=initialGame(scenario);
    setGame(next);setScenarioId(id);setPlay('quick');setTempo('hurry');
    setReceiver(7);setAim(receiverPoint(7,'quick',next.yard,1.35));
    setAutoLead(true);setLive(null);setMotion(null);setHistory([]);setElapsed(0);setLast(null);seq.current+=1;
  },[scenarioId]);

  const snap=useCallback(()=>{
    if(busy||terminal)return;
    setLast(null);
    if(passPlay(play)){
      setElapsed(0);setAutoLead(true);setAim(receiverPoint(receiver,play,game.yard,1.5));
      setLive({id:++seq.current,play});
    }else{
      const result=simulate(game,play,tempo);
      setMotion({id:++seq.current,result,startYard:game.yard});
    }
  },[busy,terminal,play,receiver,game,tempo]);

  const commit=useCallback((result:Result)=>{
    setGame(result.state);setLast(result);
    setHistory(items=>[{id:++seq.current,description:result.description,yards:result.yards,grade:result.grade,time:formatClock(result.state.seconds)},...items].slice(0,12));
    setLive(null);setMotion(null);setElapsed(0);
    setAutoLead(true);
  },[]);

  const throwBall=useCallback((point:Point)=>{
    if(!live||!passPlay(live.play))return;
    const result=resolveThrow(game,live.play,tempo,receiver,point,elapsed);
    setLive(null);
    setMotion({id:++seq.current,result,startYard:game.yard,aim:point,releaseAt:elapsed});
  },[live,game,tempo,receiver,elapsed]);

  const sack=useCallback((seconds:number)=>{
    if(!live)return;
    commit(resolveSack(game,tempo,seconds));
  },[live,game,tempo,commit]);

  const handleTick=useCallback((time:number)=>{
    setElapsed(time);
    if(autoLead&&live){setAim(receiverPoint(receiver,live.play,game.yard,time+.83));}
  },[autoLead,live,receiver,game.yard]);

  const handleAim=useCallback((p:Point)=>{setAim(p);setAutoLead(false);},[]);

  useEffect(()=>{
    if(busy)return;
    setAim(receiverPoint(receiver,play,game.yard,1.35));setAutoLead(true);
  },[play,game.yard,receiver,busy]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)return;
      if(['Space','Digit1','Digit2','Digit3','Digit4','Digit5'].includes(event.code))event.preventDefault();
      if(event.code.startsWith('Digit')&&live){
        const idx=Number(event.code.slice(-1))-1;
        if(idx>=0&&idx<RECEIVERS.length)chooseReceiver(RECEIVERS[idx].id);
      }
      if(event.code==='Space'&&!event.repeat) live ? throwBall(aim) : snap();
    };
    window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
  },[live,throwBall,aim,snap,chooseReceiver]);

  const playName=PLAYS.find(p=>p.id===play)?.name ?? play.toUpperCase();
  const danger=live? Math.min(100,elapsed/pressureLimit(game.defense)*100):0;
  const nearEnd=visibleSeconds<=30;

  return <div className="site">
    <header className="site-top">
      <SmallLogo/>
      <div className="top-center"><span className="pulse"></span> THE TABLETOP SERIES <span className="top-separator">/</span> VOL. 001</div>
      <div className="top-actions"><span className="version">BUILD {VERSION} // 3D</span>
        <button className="top-button" onClick={()=>setShowHelp(true)}><Gamepad2 size={15}/> HOW TO PLAY</button>
      </div>
    </header>

    <div className="ticker">
      <div className="ticker-inner"><span><Zap size={13} fill="currentColor"/> POWER ON</span>
        <span>EST. 1974 / REIMAGINED 2026</span><span>THE CLOCK IS TICKING. YOU CALL THE SHOTS.</span><span className="ticker-indicator">● ALL SYSTEMS GO</span></div>
    </div>

    <main className="dashboard">
      <section className="intro">
        <div><div className="eyebrow"><span className="eyebrow-square"/> WELCOME TO THE BIG MOMENT</div>
        <h1>THE <em>TWO-MINUTE</em> <br className="small-break"/> DRILL<span className="h1-period">.</span></h1>
        <p>One drive. One shot. A vibrating tabletop full of chaos.<br/> Call the play, read the defense, and <b>make the throw yourself.</b></p></div>
        <div className="intro-side"><div className="circle-mark">E<br/><span>F</span></div><div>HEAD COACH <b>YOU</b><span>INTERACTIVE FIELD GENERAL</span></div></div>
      </section>

      <div className="game-grid">
        <aside className="sidebar left-sidebar">
          <div className="side-section scene-picker">
            <div className="section-heading"><span>01 /</span> YOUR SITUATION</div>
            <label htmlFor="scenario">SELECT A CHALLENGE</label>
            <div className="select-wrap"><select id="scenario" disabled={busy} value={scenarioId} onChange={e=>reset(e.target.value)}>
              {SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.label} — {s.detail}</option>)}
            </select><ChevronDown size={14}/></div>
            <div className="scenario-note"><span className="orange-led"/> {SCENARIOS.find(s=>s.id===scenarioId)?.detail}</div>
          </div>

          <div className="side-section scoreboard-card">
            <div className="section-heading"><span>02 /</span> GAME CENTER</div>
            <div className="scoreboard">
              <div className="score-row"><div className="team-logo user-logo">H</div><div className="team-info"><span>YOUR TEAM</span><strong>HOME</strong></div><strong className="team-score">{game.ours}</strong></div>
              <div className="score-divider"><span>VS.</span><div/></div>
              <div className="score-row"><div className="team-logo away-logo">A</div><div className="team-info"><span>THE OPPONENT</span><strong>AWAY</strong></div><strong className="team-score">{game.theirs}</strong></div>
            </div>
            <div className="gameclock"><div className="clock-head"><span>Q4</span><span>GAME CLOCK</span><span className="clock-dot">●</span></div><strong className={nearEnd?'urgent':''}>{formatClock(visibleSeconds)}</strong><span className="two-min">TWO MINUTE WARNING</span></div>
            <div className="info-tiles"><Digit label="DOWN" value={game.down}/><Digit label="TO GO" value={game.toGo}/><Digit label="BALL ON" value={fieldSpot(game.yard)}/></div>
            <div className="timeouts"><span>TIMEOUTS</span><div>{[0,1,2].map(i=><div key={i} className={'timeout-dot '+(i<game.timeouts?'available':'')}/>)}</div><button disabled={busy||terminal||!game.clockRunning||game.timeouts===0} onClick={()=>setGame(g=>useTimeout(g))}>CALL TIMEOUT</button></div>
          </div>

          <div className="side-section defense-card">
            <div className="section-heading"><span>03 /</span> THE DEFENSE</div>
            <div className="defense-title"><Shield size={18}/><strong>{game.defense}</strong></div>
            <p>{game.defense==='BLITZ'?'Extra rushers are coming. Get the ball out fast.':game.defense==='LOADED BOX'?'The front is stacked. Attack space outside.':'Defenders are dropping into coverage. Take what they give.'}</p>
            <div className="defense-foot"><span>PRESSURE METER</span><div className="pressure-bars">{Array.from({length:10},(_,i)=><span key={i} className={i<Math.round((game.defense==='BLITZ'?9:game.defense==='LOADED BOX'?6:3))?'lit':''}/>)}</div></div>
          </div>
          <div className="side-footer"><Volume2 size={14}/> THE HUM OF A CLASSIC. THE THRILL OF THE CALL.</div>
        </aside>

        <section className="middle">
          <div className="board-header">
            <div><span className="mini-kicker">THE FIELD // LIVE SIMULATION</span><h2>ELECTRIC GRIDIRON <span> / 3D</span></h2></div>
            <div className="view-tabs"><button onClick={()=>setView('angled')} className={view==='angled'?'active':''}><Scan size={14}/> ANGLED</button><button onClick={()=>setView('top')} className={view==='top'?'active':''}><Maximize2 size={14}/> TOP-DOWN</button></div>
          </div>
          <div className={'board-stage '+(live?'board-live':'')}>
            <Board3D yard={game.yard} defense={game.defense} selectedPlay={play} view={view} motion={motion} live={live}
              aim={aim} selectedReceiver={receiver} onAim={handleAim} onThrow={throwBall} onTick={handleTick} onSack={sack}
              onDone={()=>{if(motion)commit(motion.result);}}/>
            <div className="board-corner top-left"><span className="signal"/> <span>{live?'● LIVE PLAY':motion?'● SIMULATING':'● PRE-SNAP'}</span> <span className="corner-muted">CAM 01 / TABLETOP</span></div>
            <div className="board-corner top-right"><span>NO. {String(game.plays+1).padStart(2,'0')}</span><span className="corner-muted">VIBRATION ACTIVE</span></div>
            {live&&<div className="board-warning"><div><b>QB IS LIVE</b><span>THROW BEFORE THE RUSH GETS HOME!</span></div><div className="sack-meter"><span style={{width:danger+'%'}}/></div><span>{Math.max(0,pressureLimit(game.defense)-elapsed).toFixed(1)}S TO PRESSURE</span></div>}
            {!live&&!motion&&!terminal&&<div className="board-tip"><Crosshair size={16}/> {passPlay(play)?'PREVIEW THE ROUTES. SNAP TO TAKE CONTROL.':'YOUR TEAM IS SET. READY TO SNAP.'}</div>}
            {motion&&<div className="play-animation"><span className="pulse"/> {passPlay(play)?'BALL IN THE AIR...':'PLAY IN MOTION...'}</div>}
            {terminal&&<div className="game-over"><div className="result-badge">FINAL WHISTLE</div><strong>{game.status==='won'?'YOU WON.':game.status==='tied'?'TIE BALLGAME.':'DRIVE OVER.'}</strong><p>{game.message}</p><button onClick={()=>reset()}><RotateCcw size={16}/> TRY AGAIN</button></div>}
            <div className="board-corner bottom-right">F/60 <span className="corner-muted">ELECTRIC FOOTBALL // PROTOTYPE</span></div>
          </div>
          <div className="field-legend"><span><i className="leg-home"/> HOME OFFENSE</span><span><i className="leg-away"/> AWAY DEFENSE</span><span><i className="leg-yellow"/> ROUTE / TARGET</span><span>DRAG TO ORBIT · SCROLL TO ZOOM</span></div>

          <div className="playbook-header">
            <div><div className="section-heading"><span>04 /</span> CALL THE PLAY</div><h2>YOUR PLAYBOOK <span> / CHOOSE WISELY</span></h2></div>
            <div className="tempo-wrap"><label>TEMPO</label><div className="tempo-buttons"><button disabled={busy} onClick={()=>setTempo('hurry')} className={tempo==='hurry'?'active':''}>NO HUDDLE</button><button disabled={busy} onClick={()=>setTempo('huddle')} className={tempo==='huddle'?'active':''}>HUDDLE</button></div></div>
          </div>
          <div className="play-cards">{PLAYS.map((item,index)=><button key={item.id} disabled={busy||terminal} className={'play-card '+(play===item.id?'selected':'')} onClick={()=>setPlay(item.id)}>
            <span className="card-top"><span>{String(index+1).padStart(2,'0')}</span><span className="card-type">{passPlay(item.id)?'P':'R'}</span></span>
            <strong>{item.name}</strong><span className="play-tag">{item.tag}</span><span className="card-desc">{item.description}</span>
            <span className="card-bottom">{play===item.id?<><Check size={13}/> SELECTED</>:<>CHOOSE PLAY <ArrowRight size={14}/></>}</span>
          </button>)}</div>

          <div className="specials">
            <div className="special-btns">
              <button disabled={busy||terminal||game.down>4} onClick={()=>{setPlay('spike');commit(simulate(game,'spike',tempo));}}><Clock3 size={15}/> SPIKE <span>STOP CLOCK</span></button>
              <button disabled={busy||terminal} onClick={()=>{setPlay('fieldgoal');commit(simulate(game,'fieldgoal',tempo));}}><Target size={15}/> KICK FIELD GOAL <span>{kickDistance(game.yard)} YDS</span></button>
            </div>
            <button className="reset-link" onClick={()=>reset()}><RotateCcw size={14}/> RESTART DRILL</button>
          </div>

          {!live&&!motion&&!terminal&&<button className="snap-button" onClick={snap}><div className="snap-icon"><Play size={21} fill="currentColor"/></div><div><span>READY AT THE LINE?</span><strong>SNAP THE BALL</strong></div><span className="snap-right"><ArrowRight size={23}/></span></button>}
          {motion&&<div className="busy-button"><Activity size={18}/> PLAY IN PROGRESS — WATCH THE FIELD</div>}
          {live&&<div className="throw-tray">
            <div className="tray-title"><div><span>QUARTERBACK CONTROL</span><strong>READ. AIM. <em>RELEASE.</em></strong></div><div><span>HOLDING THE BALL</span><strong>{elapsed.toFixed(1)}s</strong></div></div>
            <div className="receiver-list">{RECEIVERS.map((r,i)=><button key={r.id} className={receiver===r.id?'active':''} onClick={()=>chooseReceiver(r.id)}>
              <span className="receiver-key">{i+1}</span><strong>#{r.number} {r.label}</strong><small>{r.role}</small></button>)}</div>
            <div className="throw-controls"><div><Crosshair size={17}/><span>{autoLead?'LEAD TARGET — CLICK FIELD TO OVERRIDE':'MANUAL TARGET — POINT & CLICK FIELD'}<small>{selectedReceiver.label} · X {aim[0].toFixed(0)} / Y {aim[1].toFixed(0)}</small></span></div>
              <button onClick={()=>throwBall(aim)}><Target size={17}/> THROW NOW <span>SPACE ↵</span></button></div>
            <div className="throw-instructions">Click anywhere on the field to aim <b>and throw immediately</b>. Or select a receiver and press <b>SPACE</b> to lead him automatically.</div>
          </div>}
          {last&&!busy&&<div className={'last-result '+(last.grade==='A'?'great':'')}><span className="result-grade">{last.grade}</span><div><span>LAST PLAY / {last.yards>=0?'+':''}{last.yards} YARDS</span><strong>{last.description}</strong></div><span className="last-clock">-{last.elapsed} SEC</span></div>}
        </section>

        <aside className="sidebar right-sidebar">
          <div className="right-section label-section"><div className="section-heading"><span>05 /</span> COACH'S BOOTH</div><div className="coaching-card">
            <span className="coaching-light">● SYSTEM READY</span><div className="pixel-helmet"><EightBit>12</EightBit></div>
            <h3>YOU'RE IN CONTROL.</h3><p>You're not watching a highlight. You're the one making the call.</p><div className="coach-divider"/><span className="coach-note"><Zap size={15}/> EVERY SECOND MATTERS</span>
          </div></div>
          <div className="right-section instructions"><div className="section-heading"><span>06 /</span> THE CONTROLS</div>
            <div className="instruction-row"><span className="step">01</span><div><b>CALL YOUR PLAY</b><p>Choose a route concept or run.</p></div></div>
            <div className="instruction-row"><span className="step">02</span><div><b>SNAP THE BALL</b><p>Watch the miniature players come alive.</p></div></div>
            <div className="instruction-row highlight-step"><span className="step">03</span><div><b>MAKE THE THROW</b><p>Pick a receiver. Aim anywhere. Release before the pressure.</p></div></div>
            <div className="instruction-row"><span className="step">04</span><div><b>BEAT THE CLOCK</b><p>Manage downs, field position and timeouts.</p></div></div>
          </div>
          <div className="right-section history-section"><div className="section-heading"><span>07 /</span> DRIVE LOG</div>
            {history.length?history.map(item=><div className="history-item" key={item.id}><span className={'history-grade grade-'+item.grade}>{item.grade}</span><div><strong>{item.description}</strong><span>{item.time} LEFT · {item.yards>=0?'+':''}{item.yards} YDS</span></div></div>):<div className="empty-history"><Flag size={19}/><span>NO PLAYS YET.<br/>HISTORY WILL APPEAR HERE.</span></div>}
          </div>
          <div className="maker-note">INDEPENDENT FAN-MADE 3D FOOTBALL EXPERIMENT. NOT AFFILIATED WITH TUDOR GAMES, NFL, OR TWO-MINUTE DRILL.</div>
        </aside>
      </div>

      <footer><div><SmallLogo/><span>BUILT FOR THE LOVE OF THE GAME.</span></div><div>THREE.JS × REACT × VIBRATING IMAGINATION <span>© 2026</span></div></footer>
    </main>

    {showHelp&&<div className="modal-backdrop" role="presentation" onClick={()=>setShowHelp(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={()=>setShowHelp(false)}>×</button>
        <div className="eyebrow">THE COACH'S MANUAL / VOL. 001</div><h2>WELCOME TO THE <em>HOT SEAT.</em></h2>
        <p>Win the game with a single late drive. The players are animated tabletop miniatures—not real NFL play outcomes.</p>
        <div className="manual-grid"><div><span>01</span><strong>CALL</strong><p>Choose a run or passing concept. Defense and clock matter.</p></div>
          <div><span>02</span><strong>SNAP</strong><p>Press SNAP. Receivers run their routes while rushers close in.</p></div>
          <div><span>03</span><strong>THROW</strong><p>Select receiver 1–5, move your aim point, and click the field or press SPACE. Lead your receiver.</p></div>
          <div><span>04</span><strong>MANAGE</strong><p>A throw out of bounds or an incompletion stops the clock. Timeouts, spikes, and kicks are available.</p></div></div>
        <button className="manual-done" onClick={()=>setShowHelp(false)}>I'M READY. LET'S PLAY <ArrowRight size={17}/></button>
      </div>
    </div>}
  </div>;
}
export default App;
