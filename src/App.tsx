import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, ChevronDown, ChevronRight,
  CircleDot, Download, Info, Layers3, MousePointer2,
  Play, RotateCcw, ScanLine, Settings2, Shield, Target, Zap,
} from 'lucide-react';
import PitchScene, { type PassAnimation } from './components/PitchScene';
import {
  clampToPitch, makeLineup, makeOpponents,
  type Formation, type Point2, type Press,
} from './data/football';
import { passingLanes } from './logic/passing';

const FORMATIONS: Formation[] = ['4-3-3', '4-2-3-1', '3-5-2'];

function Logo() {
  return <div className="brand">
    <div className="brand-mark">
      <svg viewBox="0 0 36 36" aria-hidden="true" fill="none">
        <path d="M6 20 16 6l15 9-11 16L6 20Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="6" cy="20" r="3" fill="currentColor" />
        <circle cx="16" cy="6" r="3" fill="currentColor" />
        <circle cx="31" cy="15" r="3" fill="currentColor" />
        <circle cx="20" cy="31" r="3" fill="currentColor" />
      </svg>
    </div>
    <span>PITCH<span className="brand-light">CRAFT</span><span className="brand-dot">.</span></span>
  </div>;
}

function App() {
  const [formation, setFormation] = useState<Formation>('4-3-3');
  const [press, setPress] = useState<Press>('low-block');
  const [players, setPlayers] = useState(() => makeLineup('4-3-3'));
  const [selectedId, setSelectedId] = useState(8);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [view, setView] = useState<'broadcast' | 'overhead'>('broadcast');
  const [showLanes, setShowLanes] = useState(true);
  const [showPressure, setShowPressure] = useState(false);
  const [animation, setAnimation] = useState<PassAnimation | null>(null);
  const [eventNumber, setEventNumber] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [exported, setExported] = useState(false);
  const opponents = useMemo(() => makeOpponents(press), [press]);
  const selected = players.find(p => p.id === selectedId) ?? players[0];
  const lanes = useMemo(() => passingLanes(selected, players, opponents), [selected, players, opponents]);
  const openLanes = lanes.filter(lane => lane.score >= 70).length;
  const avgScore = Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(lanes.length, 1));
  const bestLane = lanes[0];

  function changeFormation(next: Formation) {
    setFormation(next);
    setPlayers(makeLineup(next));
    setDraggingId(null);
    setAnimation(null);
    setHistory([]);
  }

  function movePlayer(id: number, point: Point2) {
    const next = clampToPitch(point);
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, point: next } : p));
  }

  function reset() {
    setPlayers(makeLineup(formation));
    setSelectedId(8);
    setDraggingId(null);
    setAnimation(null);
    setHistory([]);
  }

  function runPass() {
    if (!bestLane || animation) return;
    const next = eventNumber + 1;
    setEventNumber(next);
    setAnimation({
      id: next,
      from: { ...selected.point },
      to: { ...bestLane.receiver.point },
    });
    setHistory(prev => [
      `${selected.name} → ${bestLane.receiver.name} · ${bestLane.score} lane score`,
      ...prev,
    ].slice(0, 4));
  }

  function exportPlay() {
    const payload = {
      title: 'Pitchcraft tactical scenario',
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      formation, opponentShape: press, players, opponents, selectedPlayerId: selectedId,
      spatialHeuristic: { type: 'illustrative, not trained on real match data', lanes },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitchcraft-${formation}-${press}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 1800);
  }

  return <div className="app-shell">
    <header className="global-header">
      <Logo />
      <div className="header-center"><span className="nav-active">Tactical Lab</span><span> / </span><span>Experiment 001</span></div>
      <div className="header-right">
        <span className="header-version"><span className="live-dot" /> INTERACTIVE DEMO</span>
        <button className="header-export" onClick={exportPlay} type="button"><Download size={14} /> {exported ? 'Exported' : 'Export setup'}</button>
      </div>
    </header>

    <main>
      <section className="intro">
        <div className="intro-left">
          <div className="intro-eyebrow"><span className="little-line" /> A NEW PERSPECTIVE ON THE PITCH <span className="eyebrow-index">/ 001</span></div>
          <h1>See the game <span className="headline-accent">differently<span className="headline-period">.</span></span></h1>
          <p>Build formations. Read the space. Find the next pass. An interactive 3D football tactics sandbox designed for curious minds.</p>
        </div>
        <div className="intro-annotation"><span className="annotation-cross">✳</span><span>THE GAME IS MORE<br />THAN THE SCORELINE.</span></div>
      </section>

      <section className="workspace" aria-label="Football tactical workspace">
        <aside className="controls-panel">
          <div className="sidebar-heading"><Settings2 size={16} /> <span>TACTICAL SETUP</span><span className="section-count">01 / 03</span></div>
          <div className="control-group">
            <div className="control-title"><span>FORMATION</span><span className="control-subtitle">Your XI</span></div>
            <div className="formation-grid">
              {FORMATIONS.map(item => <button
                key={item} onClick={() => changeFormation(item)}
                className={`formation-option ${formation === item ? 'selected' : ''}`}
                type="button" aria-pressed={formation === item}
              >
                <FormationGlyph formation={item} />
                <span>{item}</span>
              </button>)}
            </div>
          </div>

          <div className="control-group shape-group">
            <div className="control-title"><span>OPPOSITION</span><span className="control-subtitle">Defensive shape</span></div>
            <div className="stacked-options">
              <button type="button" onClick={() => setPress('low-block')} aria-pressed={press === 'low-block'} className={`shape-option ${press === 'low-block' ? 'chosen' : ''}`}>
                <Shield size={17} /><span><strong>Low block</strong><small>Compact and defensive</small></span><span className="choice-circle" />
              </button>
              <button type="button" onClick={() => setPress('high-press')} aria-pressed={press === 'high-press'} className={`shape-option ${press === 'high-press' ? 'chosen' : ''}`}>
                <Zap size={17} /><span><strong>High press</strong><small>Close down the ball</small></span><span className="choice-circle" />
              </button>
            </div>
          </div>

          <div className="control-group layers-group">
            <div className="control-title"><span>VISUAL LAYERS</span><Layers3 size={15} /></div>
            <label className="toggle-item"><span><span className="toggle-dot lime" /> Passing lanes</span><input type="checkbox" checked={showLanes} onChange={e => setShowLanes(e.target.checked)} /><span className="switch" /></label>
            <label className="toggle-item"><span><span className="toggle-dot salmon" /> Defensive radius</span><input type="checkbox" checked={showPressure} onChange={e => setShowPressure(e.target.checked)} /><span className="switch" /></label>
          </div>

          <div className="aside-tip"><div className="tip-icon"><MousePointer2 size={16} /></div><strong>Make your move</strong><p>Drag a lime player to reposition them, or select one and click anywhere on the pitch.</p></div>
          <button type="button" className="reset-button" onClick={reset}><RotateCcw size={15} /> Reset formation <ArrowRight size={14} /></button>
        </aside>

        <div className="pitch-column">
          <div className="pitch-topbar">
            <div className="pitch-title"><div className="pulse-icon"><Activity size={18} /></div><span><strong>Live tactical canvas</strong><small>Playground / Scenario 01</small></span></div>
            <div className="camera-switch" role="group" aria-label="Camera view">
              <button type="button" onClick={() => setView('broadcast')} className={view === 'broadcast' ? 'active' : ''} aria-pressed={view === 'broadcast'}>3D VIEW</button>
              <button type="button" onClick={() => setView('overhead')} className={view === 'overhead' ? 'active' : ''} aria-pressed={view === 'overhead'}>TOP DOWN</button>
            </div>
          </div>
          <div className="pitch-viewport">
            <div className="pitch-decor-grid" />
            <PitchScene
              players={players} opponents={opponents} selectedId={selectedId} selectedPlayer={selected}
              lanes={lanes} view={view} showLanes={showLanes} showPressure={showPressure}
              draggingId={draggingId} animation={animation} onSelect={setSelectedId}
              onMove={movePlayer} onDragging={setDraggingId} onPassDone={() => setAnimation(null)}
            />
            <div className="viewport-top-left"><span className="signal-icon"><span /></span><span>3D SPATIAL ENGINE</span></div>
            <div className="viewport-top-right"><span>ATTACK</span><span className="attack-arrow">↑</span></div>
            <div className="viewport-bottom-left"><div><span className="legend-dot home" /> YOUR XI</div><div><span className="legend-dot away" /> OPPONENT</div><div><span className="legend-line" /> PASSING LANE</div></div>
            <div className="viewport-bottom-right"><ScanLine size={14} /> ORBIT TO EXPLORE</div>
          </div>
          <div className="pitch-bottombar"><div><CircleDot size={15} /> <span>MOVE PLAYERS TO RECALCULATE SPACE</span></div><div><span className="stage-status" /> <span>ANALYSIS ACTIVE</span></div></div>
          <div className="stage-stat-grid">
            <div className="stage-stat"><span>TEAM SHAPE</span><strong>{formation}</strong><small>Formation in use</small></div>
            <div className="stage-stat"><span>OPEN LANES</span><strong>{String(openLanes).padStart(2, '0')}<i> / 10</i></strong><small>Score ≥ 70</small></div>
            <div className="stage-stat"><span>AVG. LANE SCORE</span><strong>{avgScore}<i> / 100</i></strong><small>Illustrative index</small></div>
          </div>
        </div>

        <aside className="insights-panel">
          <div className="sidebar-heading"><Target size={17} /> <span>SPATIAL INTELLIGENCE</span><span className="section-count">02 / 03</span></div>
          <div className="player-card">
            <div className="player-card-top"><span>SELECTED PLAYER</span><span className="selected-light" /></div>
            <div className="selected-profile"><div className="player-avatar">{selected.id.toString().padStart(2, '0')}</div><div><strong>{selected.name}</strong><span>#{selected.id} <span className="profile-separator">·</span> {selected.role} <span className="profile-separator">·</span> YOUR XI</span></div></div>
            <div className="player-location"><span>POSITION ON PITCH</span><span>X {selected.point.x.toFixed(1)} &nbsp; / &nbsp; Z {selected.point.z.toFixed(1)}</span></div>
          </div>
          <div className="lane-heading"><span>PASSING OPTIONS</span><span className="lane-count">TOP 04 <ChevronDown size={12} /></span></div>
          <div className="lane-list">
            {lanes.slice(0, 4).map((lane, index) => <button type="button" key={lane.receiver.id} className="lane-entry" onClick={() => setSelectedId(lane.receiver.id)} title={`Analyze ${lane.receiver.name} next`}>
              <span className="lane-number">0{index + 1}</span>
              <div className="lane-middle"><div className="lane-name"><strong>{lane.receiver.name}</strong><small>{lane.receiver.role}</small></div><div className="lane-track"><span style={{ width: `${lane.score}%`, background: lane.score >= 70 ? '#baf475' : lane.score >= 50 ? '#72cabb' : '#738d81' }} /></div></div>
              <div className={`lane-score ${lane.score >= 70 ? 'strong-score' : ''}`}>{lane.score}<ChevronRight size={12} /></div>
            </button>)}
          </div>
          <div className="lane-context"><Info size={14} /><span>Scores estimate spatial openness using distance, progression, and defender proximity. Not real-world pass probabilities.</span></div>
          <div className="pass-panel">
            <div className="pass-panel-label"><span><Zap size={15} /> RECOMMENDED ACTION</span><span className="tag-heuristic">HEURISTIC</span></div>
            <strong className="action-name">{bestLane ? `Find ${bestLane.receiver.name}` : 'Select a player'}</strong>
            <p>{bestLane ? `${bestLane.distance.toFixed(1)}m lane · ${Math.max(0, bestLane.forwardMeters).toFixed(1)}m forward progression` : 'Choose a player to explore passing options.'}</p>
            <button type="button" onClick={runPass} disabled={!bestLane || !!animation} className="simulate-btn"><Play size={15} fill="currentColor" /> {animation ? 'Playing sequence...' : 'SIMULATE BEST PASS'} <ArrowUpRight size={15} /></button>
          </div>
          <div className="session-log"><span><Activity size={14} /> SESSION LOG</span>{history.length ? history.slice(0, 2).map((item, index) => <div key={`${item}-${index}`} className="log-entry"><span className="log-dot" />{item}</div>) : <p>Your play-by-play will appear here.</p>}</div>
        </aside>
      </section>

      <div className="bottom-note"><span><span className="note-square" /> BUILT FOR THE WAY WE SEE THE GAME.</span><span>THREE.JS <span>×</span> REACT THREE FIBER <span>×</span> TYPESCRIPT <span className="bottom-nudge">↗</span></span></div>
    </main>
    <footer><span>© PITCHCRAFT LAB — AN EXPERIMENT IN SPATIAL THINKING</span><span>NO LIVE MATCH DATA <span>·</span> V 0.1.0</span></footer>
  </div>;
}

function FormationGlyph({ formation }: { formation: Formation }) {
  const rows = formation === '4-3-3' ? [3, 3, 4, 1] : formation === '4-2-3-1' ? [1, 3, 2, 4, 1] : [2, 5, 3, 1];
  return <div className="formation-glyph" aria-hidden="true">{rows.map((count, i) => <div key={i}>{Array.from({ length: count }, (_, j) => <span key={j} />)}</div>)}</div>;
}

export default App;
