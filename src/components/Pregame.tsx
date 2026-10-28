import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ChevronLeft,Flag,Search,Shield,Target,Trophy,X,Zap} from 'lucide-react';
import {HISTORICAL_CHALLENGES,NFL_TEAMS,TEAM_BY_ID,STYLE_LABEL} from '../logic/nfl';
type Props={canClose:boolean;onClose:()=>void;onChallenge:(id:string)=>void;onExhibition:(team:string,opponent:string)=>void};
const fmt=(seconds:number)=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
export default function Pregame({canClose,onClose,onChallenge,onExhibition}:Props){
 const [mode,setMode]=useState<'moments'|'exhibition'>('moments');
 const [selected,setSelected]=useState(HISTORICAL_CHALLENGES[0].id);
 const [team,setTeam]=useState('PHI');
 const [opponent,setOpponent]=useState('DAL');
 const [query,setQuery]=useState('');
 const [choose,setChoose]=useState<'offense'|'defense'>('offense');
 const challenge=HISTORICAL_CHALLENGES.find(s=>s.id===selected)??HISTORICAL_CHALLENGES[0];
 const visible=useMemo(()=>NFL_TEAMS.filter(t=>t.name.toLowerCase().includes(query.toLowerCase())||t.id.toLowerCase().includes(query.toLowerCase())),[query]);
 const own=TEAM_BY_ID[mode==='moments'?challenge.offense:team],opp=TEAM_BY_ID[mode==='moments'?challenge.opponent:opponent];
 const chooseTeam=(id:string)=>{if(choose==='offense'){setTeam(id);if(id===opponent)setOpponent(id==='DAL'?'PHI':'DAL');}else{setOpponent(id);if(id===team)setTeam(id==='PHI'?'DAL':'PHI');}};
 const start=()=>{if(mode==='moments')onChallenge(selected);else onExhibition(team,opponent);};
 return <div className="pregame-screen" role="dialog" aria-modal="true" aria-label="Choose a football challenge">
   <div className="pregame-backdrop"/>
   <div className="pregame-wrap">
     <div className="pregame-top">
       <div className="pregame-brand"><span className="brand-spark">ϟ</span><span className="pregame-overline">THE TABLETOP FOOTBALL EXPERIENCE</span><h1>THE TWO<br/><em>MINUTE DRILL.</em></h1></div>
       {canClose&&<button className="pregame-close" onClick={onClose}><X size={19}/> BACK TO GAME</button>}
     </div>
     <div className="pregame-below">
       <div className="pregame-picks">
         <div className="pregame-tabs">
           <button className={mode==='moments'?'active':''} onClick={()=>setMode('moments')}><Trophy size={16}/> NFL MOMENTS</button>
           <button className={mode==='exhibition'?'active':''} onClick={()=>setMode('exhibition')}><Shield size={16}/> PICK YOUR TEAMS</button>
         </div>
         {mode==='moments'?<>
           <div className="menu-section-label">REAL GAMES · YOUR OWN OUTCOME</div>
           <div className="moments-list">
             {HISTORICAL_CHALLENGES.map(s=><button className={'moment-tile '+(s.id===selected?'chosen':'')} key={s.id} onClick={()=>setSelected(s.id)}>
               <div className="moment-badges"><span>{s.eyebrow}</span><small>{s.difficulty}</small></div>
               <strong>{s.title}</strong><p>{TEAM_BY_ID[s.offense].name} vs {TEAM_BY_ID[s.opponent].name}</p>
               <div className="moment-bottom"><span>{s.quarter} · {fmt(s.initial.seconds)} LEFT</span><span>DOWN {s.initial.theirs-s.initial.ours} PTS</span></div>
             </button>)}
           </div>
         </>:<>
           <div className="team-side-buttons">
             <button className={choose==='offense'?'active':''} onClick={()=>setChoose('offense')}><span>YOU COACH</span><b>{TEAM_BY_ID[team].name}</b></button>
             <button className={choose==='defense'?'active':''} onClick={()=>setChoose('defense')}><span>OPPONENT</span><b>{TEAM_BY_ID[opponent].name}</b></button>
           </div>
           <label className="club-search"><Search size={15}/><input aria-label="Search teams" placeholder="Search 32 NFL teams..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
           <div className="team-menu-list">{visible.map(t=><button className={(choose==='offense'?team:opponent)===t.id?'picked':''} key={t.id} onClick={()=>chooseTeam(t.id)}>
             <i style={{background:t.primary,borderColor:t.secondary}}>{t.abbr.slice(0,2)}</i><span><b>{t.name}</b><small>{t.conference} {t.division}</small></span>
           </button>)}</div>
         </>}
       </div>
       <div className="pregame-preview">
         <div className="game-preview-top"><span className="label-pip"><Zap size={13}/> {mode==='moments'?'HISTORICAL CHALLENGE':'CUSTOM MATCHUP'}</span><span>FOOTBALL LAB / V4</span></div>
         <div className="pregame-match">
           <div className="pregame-club"><span className="pregame-shield" style={{background:own.primary,color:'#fff',borderColor:own.secondary}}>{own.abbr}</span><strong>{own.name}</strong><small>YOUR OFFENSE</small></div>
           <div className="pregame-vs">VS</div>
           <div className="pregame-club"><span className="pregame-shield" style={{background:opp.primary,color:'#fff',borderColor:opp.secondary}}>{opp.abbr}</span><strong>{opp.name}</strong><small>OPPONENT</small></div>
         </div>
         <div className="pregame-situation">
           <div className="label-pip"><Flag size={13}/> SITUATION ROOM</div>
           <h2>{mode==='moments'?challenge.title:'YOUR FRANCHISE. YOUR DRIVE.'}</h2>
           <p>{mode==='moments'?challenge.story:'Take over with 1:46 left, trailing by three. You call the formations, design the routes and deliver the throws.'}</p>
           <div className="situation-numbers">
             <div><small>CLOCK</small><b>{mode==='moments'?fmt(challenge.initial.seconds):'1:46'}</b></div>
             <div><small>SCORE</small><b>{mode==='moments'?challenge.initial.ours+'–'+challenge.initial.theirs:'20–23'}</b></div>
             <div><small>FIELD</small><b>{mode==='moments'?('OWN '+challenge.initial.yard):'OWN 32'}</b></div>
             <div><small>QTR</small><b>{mode==='moments'?challenge.quarter:'Q4'}</b></div>
           </div>
         </div>
         <div className="pregame-playbook-hint"><BookOpen size={19}/><div><b>{STYLE_LABEL[own.style]}</b><small>8 designed plays · editable routes · custom audibles · live coverage</small></div></div>
         <button className="pregame-start" onClick={start}><Target size={22}/>{mode==='moments'?'TAKE OVER THIS DRIVE':'START THE MATCHUP'}<ArrowRight size={21}/></button>
         <p className="pregame-disclaimer">Independent, unofficial football simulation. Real teams and historical starting situations are used for reference; subsequent play outcomes and team-style playbooks are original simulations. No team logos or licensed likenesses.</p>
         {mode==='moments'&&<a href={challenge.source} target="_blank" rel="noreferrer" className="source-link">Historical source: verify the real game <ChevronLeft size={14}/></a>}
       </div>
     </div>
   </div>
 </div>;
}
