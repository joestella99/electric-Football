import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Crosshair, Eye, Flag, Fullscreen, Goal, Keyboard, RotateCcw, Shield, Target, TimerReset, Zap } from 'lucide-react';
import Board3D, { type Live, type Motion } from './components/Board3D';
import { SCENARIOS, PLAYS, fieldSpot, formatClock, initialGame, kickDistance, simulate, useTimeout, type GameState, type PlayId, type Result } from './logic/drill';
import { RECEIVERS, passPlay, pressureLimit, receiverPoint, resolveSack, resolveThrow, type Point, type ReceiverId } from './logic/throwing';

type View = 'sideline' | 'coach';
type Feed = { id: number; label: string; clock: number; gain: number; grade: string };
const DRIVE_NAMES: Record<string,string> = {
  'the-comeback':'THE COMEBACK',
  'touchdown-or-bust':'TOUCHDOWN OR BUST',
  'walk-off':'THE WALK-OFF'
};
const ICON: Record<PlayId,string> = {
  quick:'↗',sideline:'⌝',deep:'↑',screen:'↘',inside:'⇧',outside:'↝',spike:'⏱',fieldgoal:'⌁'
};
const abbrev=(value:number)=>Math.max(0,Math.round(value)).toString().padStart(2,'0');
function App() {
  const [scenarioId,setScenarioId]=useState('the-comeback');
  const [game,setGame]=useState<GameState>(()=>initialGame());
  const [play,setPlay]=useState<PlayId>('quick');
  const [view,setView]=useState<View>('sideline');
  const [receiver,setReceiver]=useState<ReceiverId>(7);
  const [live,setLive]=useState<Live|null>(null);
  const [motion,setMotion]=useState<Motion|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [aim,setAim]=useState<Point>(()=>receiverPoint(7,'quick',41,2));
  const [autoLead,setAutoLead]=useState(true);
  const [last,setLast]=useState<Result|null>(null);
  const [feed,setFeed]=useState<Feed[]>([]);
  const [help,setHelp]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const sequence=useRef(0);
  const active=!!live||!!motion;
  const finished=game.status!=='playing';
  const pressure=pressureLimit(game.defense);
  const remaining=Math.max(0,game.seconds-(live?Math.ceil(elapsed):0)-(live&&game.clockRunning?7:0));
  const progress=live? Math.min(100,(elapsed/pressure)*100):0;
  const selectedName=RECEIVERS.find(r=>r.id===receiver)?.label??'HARRIS';

  const reset=useCallback((id=scenarioId)=>{
    const scenario=SCENARIOS.find(s=>s.id===id)??SCENARIOS[0];
    const fresh=initialGame(scenario);
    setScenarioId(scenario.id);setGame(fresh);setPlay('quick');setReceiver(7);
    setAim(receiverPoint(7,'quick',fresh.yard,2));setAutoLead(true);
    setLive(null);setMotion(null);setElapsed(0);setLast(null);setFeed([]);
    sequence.current+=1;
  },[scenarioId]);

  const completePlay=useCallback((result:Result)=>{
    setGame(result.state);
    setFeed(items=>[{id:++sequence.current,label:result.description,clock:result.state.seconds,gain:result.yards,grade:result.grade},...items].slice(0,8));
    setLast(result);setMotion(null);setLive(null);setElapsed(0);setAutoLead(true);
  },[]);

  const snap=useCallback(()=>{
    if(active||finished)return;
    setLast(null);
    if(passPlay(play)){
      setElapsed(0);setAutoLead(true);setAim(receiverPoint(receiver,play,game.yard,2));
      setLive({id:++sequence.current,play});
    } else {
      const result=simulate(game,play,'hurry');
      setMotion({id:++sequence.current,result,startYard:game.yard});
    }
  },[active,finished,play,receiver,game]);

  const choose=useCallback((id:ReceiverId)=>{
    setReceiver(id);setAutoLead(true);
    setAim(receiverPoint(id,play,game.yard,live?elapsed+1.1:2));
  },[game.yard,live,elapsed,play]);

  const throwNow=useCallback((point:Point,id?:ReceiverId)=>{
    if(!live)return;
    const target=id??receiver;
    const result=resolveThrow(game,live.play,'hurry',target,point,elapsed);
    setLive(null);setMotion({id:++sequence.current,result,startYard:game.yard,aim:point,releaseAt:elapsed});
  },[live,receiver,game,elapsed]);

  const sack=useCallback((seconds:number)=>{
    if(!live)return;
    completePlay(resolveSack(game,'hurry',seconds));
  },[live,game,completePlay]);

  const onTick=useCallback((seconds:number)=>{
    setElapsed(seconds);
    if(live&&autoLead)setAim(receiverPoint(receiver,live.play,game.yard,seconds+1.15));
  },[live,autoLead,receiver,game.yard]);

  const changePlay=(id:PlayId)=>{
    if(active||finished)return;
    setPlay(id);setAim(receiverPoint(receiver,id,game.yard,2));setAutoLead(true);
  };
  const special=(id:'spike'|'fieldgoal')=>{
    if(active||finished)return;
    completePlay(simulate(game,id,'hurry'));
  };
  const timeout=()=>setGame(state=>useTimeout(state));
  const fullscreen=()=>{
    if(document.fullscreenElement)void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  // Real late-game urgency: a running clock continues while you choose your next play.
  useEffect(()=>{
    if(!game.clockRunning||active||finished)return;
    const handle=window.setInterval(()=>{
      setGame(old=>{
        if(!old.clockRunning||old.status!=='playing')return old;
        const seconds=Math.max(0,old.seconds-1);
        return {...old,seconds,status:seconds?old.status:'lost',message:seconds?old.message:'THE CLOCK HITS ZERO. DRIVE OVER.'};
      });
    },1000);
    return ()=>window.clearInterval(handle);
  },[game.clockRunning,active,finished]);

  useEffect(()=>{
    const listener=(event:KeyboardEvent)=>{
      const element=event.target;
      if(element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement)return;
      if(event.code==='Escape'){setHelp(false);return;}
      if(event.code==='Space'){
        event.preventDefault();
        if(event.repeat)return;
        if(live)throwNow(aim);
        else if(!active&&!finished)snap();
      }
      const digit=event.code.startsWith('Digit')?Number(event.code.slice(-1)):0;
      if(digit>=1&&digit<=6){
        event.preventDefault();
        if(live&&digit<=5)choose(RECEIVERS[digit-1].id);
        else if(!active&&!finished&&digit<=6)changePlay(PLAYS[digit-1].id);
      }
      if(event.code==='KeyV')setView(v=>v==='sideline'?'coach':'sideline');
    };
    window.addEventListener('keydown',listener);
    return ()=>window.removeEventListener('keydown',listener);
  });

  const runPlay=!passPlay(play);
  return <div className="game-shell">
    <header className="topbar">
      <div className="wordmark"><span className="bolt">ϟ</span><span>ELECTRIC<strong>FOOTBALL</strong></span><i>ARCADE</i></div>
      <div className="scorebug">
        <div className="team-score"><span className="team-emblem home">H</span><span className="team-name">HOME</span><b>{game.ours}</b></div>
        <div className="score-middle"><span>4TH QUARTER</span><strong className={remaining<31?'critical':''}>{formatClock(remaining)}</strong></div>
        <div className="team-score away-score"><b>{game.theirs}</b><span className="team-name">AWAY</span><span className="team-emblem away">A</span></div>
      </div>
      <div className="toolbar">
        <label className="scenario-select"><span>SCENARIO</span><select value={scenarioId} disabled={active} onChange={e=>reset(e.target.value)}>
          {SCENARIOS.map(s=><option key={s.id} value={s.id}>{DRIVE_NAMES[s.id]}</option>)}
        </select><ChevronDown size={13}/></label>
        <button className="icon-button" aria-label="How to play" title="How to play" onClick={()=>setHelp(true)}><CircleHelp size={19}/></button>
        <button className="icon-button fullscreen-icon" aria-label="Full screen" title="Full screen" onClick={fullscreen}><Fullscreen size={18}/></button>
      </div>
    </header>
    <div className="arena">
      <Board3D yard={game.yard} toGo={game.toGo} defense={game.defense} play={play} view={view}
        live={live} motion={motion} aim={aim} receiver={receiver}
        onSelect={choose} onAim={point=>{setAutoLead(false);setAim(point);}}
        onThrow={throwNow} onTick={onTick} onSack={sack}
        onDone={()=>{if(motion)completePlay(motion.result);}}/>
      <div className="screen-grain" aria-hidden="true"/>
      <div className="arena-header">
        <div className="down-flag"><b>{game.down}<sup>{game.down===1?'ST':game.down===2?'ND':game.down===3?'RD':'TH'}</sup> &amp; {game.toGo}</b><span>{fieldSpot(game.yard)}</span></div>
        <div className="defense-read"><Shield size={15}/><span>DEFENSE</span><strong>{game.defense}</strong></div>
      </div>
      <div className="camera-switch">
        <button className={view==='sideline'?'active':''} onClick={()=>setView('sideline')}><Eye size={14}/> FIELD</button>
        <button className={view==='coach'?'active':''} onClick={()=>setView('coach')}><Target size={14}/> TACTICAL</button>
      </div>

      {live&&<div className="pressure-panel"><div className="pressure-heading"><span className="hot-dot"/> POCKET COLLAPSING <strong>{(pressure-elapsed).toFixed(1)}s</strong></div>
        <div className="pressure-track"><i style={{width:progress+'%'}}/></div><small>CLICK THE FIELD TO PLACE YOUR THROW</small></div>}
      {!active&&!finished&&!last&&<div className="floating-tip"><span className="keycap">SPACE</span> SNAP THE BALL <span className="tip-separator"/> THEN READ YOUR RECEIVERS</div>}
      {motion&&<div className="action-hint"><span className="hot-dot"/> PLAY IN MOTION</div>}
      {last&&!active&&!finished&&<div className="play-result" key={last.state.plays}><span className={'grade grade-'+last.grade}>{last.grade}</span><div><strong>{last.description}</strong><small>{last.yards>=0?'+':''}{last.yards} YARDS · -{last.elapsed}s · {formatClock(game.seconds)} LEFT</small></div></div>}
      {finished&&<div className="finish-overlay"><span className="final-eyebrow">FINAL WHISTLE</span><h1>{game.status==='won'?'DRIVE COMPLETE.':game.status==='tied'?'ALL TIED UP.':'GAME OVER.'}</h1><p>{game.message}</p><button onClick={()=>reset()}><RotateCcw size={17}/> PLAY AGAIN</button></div>}
      <div className="drive-access"><button className={historyOpen?'opened':''} onClick={()=>setHistoryOpen(v=>!v)}><Flag size={14}/> DRIVE LOG <span>{feed.length}</span></button>
        {historyOpen&&<div className="drive-popover"><strong>THIS DRIVE</strong>{feed.length?feed.map(item=><div key={item.id}><b>{item.grade}</b><span>{item.label}<small>{formatClock(item.clock)} · {item.gain>=0?'+':''}{item.gain} YDS</small></span></div>):<p>YOUR DRIVE STARTS HERE.</p>}</div>}
      </div>
      <div className="game-corner">TOY TABLETOP ENGINE <span>·</span> V1.1</div>
    </div>

    <section className={'control-deck '+(live?'deck-live':'')}>
      <div className="deck-meta">
        <div className="label-tiny"><span className="live-led"/> {live?'QUARTERBACK MODE':active?'PLAYING':'OFFENSIVE COORDINATOR'}</div>
        <h2>{live?'FIND YOUR MAN.':finished?'THE FINAL DRIVE.':motion?'WATCH THE PLAY.':'CALL YOUR SHOT.'}</h2>
        <p>{live?'Pick a receiver below, then click a spot on the field to throw. The rush is coming.':motion?'Players are in motion.':finished?'Run it back or try a different scenario.':'Choose a play. When the ball is snapped, you take over.'}</p>
      </div>

      {live ? <>
        <div className="receiver-picker">
          {RECEIVERS.map((r,i)=><button className={'receiver-choice '+(receiver===r.id?'selected':'')} key={r.id} onClick={()=>choose(r.id)}>
            <kbd>{i+1}</kbd><span className="jersey">#{r.number}</span><b>{r.label}</b><small>{r.role}</small>
          </button>)}
        </div>
        <div className="action-stack live-actions">
          <span className="action-label"><Crosshair size={13}/> {autoLead?'AUTO-LEADING':'MANUAL AIM'} · {selectedName}</span>
          <button className="primary-action throw-action" onClick={()=>throwNow(aim)}><Target size={19}/> THROW NOW <kbd>SPACE</kbd></button>
          <span className="action-foot">OR TAP ANYWHERE ON THE FIELD</span>
        </div>
      </> : <>
        <div className="play-selector">
          {PLAYS.map((p,i)=><button key={p.id} className={'play-choice '+(play===p.id?'picked':'')} disabled={active||finished}
            onClick={()=>changePlay(p.id)}>
            <span className="play-index">{i+1}</span><span className="route-icon">{ICON[p.id]}</span><b>{p.name}</b><small>{passPlay(p.id)?'PASS':'RUN'}</small>
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

    <footer className="micro-footer"><span>MADE FOR THE LOVE OF THE GAME · A FICTIONAL, INDEPENDENT TABLETOP FOOTBALL PROTOTYPE</span><button onClick={()=>reset()}><RotateCcw size={12}/> RESET DRIVE</button><span>NOT AFFILIATED WITH TUDOR GAMES OR THE NFL</span></footer>

    {help&&<div className="modal-scrim" onClick={()=>setHelp(false)} role="presentation">
      <div className="help-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={e=>e.stopPropagation()}>
        <button className="close-help" onClick={()=>setHelp(false)} aria-label="Close">×</button>
        <span className="help-kicker">FIELD MANUAL / NO. 001</span><h2>YOU'RE THE<br/><em>QUARTERBACK.</em></h2>
        <p>One drive to win. Call your plays, read the defense, and make every throw yourself.</p>
        <div className="help-steps"><div><b>01</b><span><strong>PICK A PLAY</strong><small>Six run and pass concepts. Choose based on down and defensive look.</small></span></div>
          <div><b>02</b><span><strong>SNAP — SPACE</strong><small>Players come to life. Passing plays put you in QB control.</small></span></div>
          <div><b>03</b><span><strong>THROW — CLICK OR SPACE</strong><small>Choose receivers 1–5. Click exactly where to throw, or press Space to lead the selected target. Timing matters.</small></span></div>
          <div><b>04</b><span><strong>BEAT THE CLOCK</strong><small>The clock keeps running after in-bounds catches. Timeouts, spikes and kicks matter.</small></span></div></div>
        <div className="help-keys"><Keyboard size={17}/> KEYS: 1–6 CALL PLAYS · 1–5 CHOOSE RECEIVERS · V CAMERA · SPACE SNAP/THROW</div>
        <button className="help-start" onClick={()=>setHelp(false)}>GOT IT. LET'S PLAY <ArrowRight size={19}/></button>
      </div>
    </div>}
  </div>;
}
export default App;
