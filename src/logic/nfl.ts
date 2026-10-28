import type {GameState,PlayId} from './drill.ts';
import type {Formation,Protection} from './tactics.ts';
import type {RouteBook,RouteKind} from './spatial.ts';
export type TeamStyle='west-coast'|'spread'|'power'|'vertical'|'motion';
export type NflTeam={id:string;name:string;abbr:string;conference:'AFC'|'NFC';division:string;primary:string;secondary:string;style:TeamStyle};
const entries=[
 'BUF|Buffalo Bills|AFC East|00338d|c60c30|spread','MIA|Miami Dolphins|AFC East|008e97|fc4c02|motion','NE|New England Patriots|AFC East|002244|c60c30|west-coast','NYJ|New York Jets|AFC East|125740|ffffff|power',
 'BAL|Baltimore Ravens|AFC North|241773|9e7c0c|power','CIN|Cincinnati Bengals|AFC North|fb4f14|111111|vertical','CLE|Cleveland Browns|AFC North|311d00|ff3c00|power','PIT|Pittsburgh Steelers|AFC North|ffb612|101820|power',
 'HOU|Houston Texans|AFC South|03202f|a71930|west-coast','IND|Indianapolis Colts|AFC South|002c5f|ffffff|spread','JAX|Jacksonville Jaguars|AFC South|006778|d7a22a|spread','TEN|Tennessee Titans|AFC South|0c2340|4b92db|power',
 'DEN|Denver Broncos|AFC West|fb4f14|002244|west-coast','KC|Kansas City Chiefs|AFC West|e31837|ffb81c|motion','LV|Las Vegas Raiders|AFC West|a5acaf|000000|vertical','LAC|Los Angeles Chargers|AFC West|0080c6|ffc20e|spread',
 'DAL|Dallas Cowboys|NFC East|003594|869397|vertical','NYG|New York Giants|NFC East|0b2265|a71930|power','PHI|Philadelphia Eagles|NFC East|004c54|a5acaf|spread','WAS|Washington Commanders|NFC East|5a1414|ffb612|spread',
 'CHI|Chicago Bears|NFC North|0b162a|c83803|power','DET|Detroit Lions|NFC North|0076b6|b0b7bc|vertical','GB|Green Bay Packers|NFC North|203731|ffb612|west-coast','MIN|Minnesota Vikings|NFC North|4f2683|ffc62f|vertical',
 'ATL|Atlanta Falcons|NFC South|a71930|000000|motion','CAR|Carolina Panthers|NFC South|0085ca|101820|vertical','NO|New Orleans Saints|NFC South|d3bc8d|101820|west-coast','TB|Tampa Bay Buccaneers|NFC South|d50a0a|34302b|vertical',
 'ARI|Arizona Cardinals|NFC West|97233f|000000|spread','LAR|Los Angeles Rams|NFC West|003594|ffd100|motion','SF|San Francisco 49ers|NFC West|aa0000|b3995d|motion','SEA|Seattle Seahawks|NFC West|002244|69be28|west-coast'
];
const styles:TeamStyle[]=['spread','motion','west-coast','power','vertical'];
export const NFL_TEAMS:NflTeam[]=entries.map(r=>{const [id,name,location,primary,secondary,style]=r.split('|');const [conference,division]=location.split(' ');
 return {id,name,abbr:id,conference:conference as 'AFC'|'NFC',division,primary:'#'+primary,secondary:'#'+secondary,style:styles.includes(style as TeamStyle)?style as TeamStyle:'spread'};});
export const TEAM_BY_ID:Record<string,NflTeam>=Object.fromEntries(NFL_TEAMS.map(t=>[t.id,t]));
export const STYLE_LABEL:Record<TeamStyle,string>={
 'west-coast':'West Coast · Quick Rhythm',spread:'Spread · Space & RPO',power:'Power · Play Action',vertical:'Vertical · Deep Shots',motion:'Motion · Wide Zone'
};
export type HistoricalChallenge={id:string;title:string;eyebrow:string;date:string;offense:string;opponent:string;objective:string;story:string;source:string;quarter:string;initial:GameState;difficulty:'PRO'|'ALL-MADDEN'};
const game=(seconds:number,yard:number,ours:number,theirs:number,defense:GameState['defense'],timeouts=2):GameState=>({
 seconds,yard,ours,theirs,timeouts,down:1,toGo:10,defense,clockRunning:false,status:'playing',message:'Your drive. Your decisions.',plays:0
});
export const HISTORICAL_CHALLENGES:HistoricalChallenge[]=[
 {id:'lviii-final',title:'THE 1:53 DRIVE',eyebrow:'SUPER BOWL LVIII',date:'2024-02-11',quarter:'Q4',offense:'KC',opponent:'SF',objective:'Tie or win with 1:53 left',story:'Kansas City trails 19–16 and takes over at its own 25. Rewrite the final drive.',source:'https://www.chiefs.com/super-bowl-lviii/',difficulty:'PRO',initial:game(113,25,16,19,'SOFT ZONE')},
 {id:'lviii-ot',title:'WIN IN OVERTIME',eyebrow:'SUPER BOWL LVIII',date:'2024-02-11',quarter:'OT',offense:'KC',opponent:'SF',objective:'Drive for the winning touchdown',story:'San Francisco kicks a field goal. Kansas City trails 22–19, starting at its own 25.',source:'https://www.chiefs.com/super-bowl-lviii/',difficulty:'ALL-MADDEN',initial:game(442,25,19,22,'LOADED BOX')},
 {id:'lii-patriots',title:"BRADY'S LAST CHANCE",eyebrow:'SUPER BOWL LII',date:'2018-02-04',quarter:'Q4',offense:'NE',opponent:'PHI',objective:'Score a touchdown in 2:21',story:'New England takes over at its own 25, trailing Philadelphia 38–33.',source:'https://www.patriots.com/press-room/super-bowl-lii',difficulty:'ALL-MADDEN',initial:game(141,25,33,38,'BLITZ',1)},
 {id:'lvi-rams',title:"STAFFORD'S FINAL DRIVE",eyebrow:'SUPER BOWL LVI',date:'2022-02-13',quarter:'Q4',offense:'LAR',opponent:'CIN',objective:'Take the lead with a touchdown',story:'The Rams trail 20–16 at their own 21 with 6:13 remaining. Recreate or rewrite the championship finish.',source:'https://www.therams.com/news/super-bowl-lvi-game-recap-vs-bengals-matthew-stafford-cooper-kupp-aaron-donald',difficulty:'PRO',initial:game(373,21,16,20,'SOFT ZONE')}
];
export function practiceGame(teamId:string,opponentId:string):GameState{
 if(!TEAM_BY_ID[teamId]||!TEAM_BY_ID[opponentId]||teamId===opponentId)throw new Error('Choose two distinct clubs');
 return game(106,32,20,23,'LOADED BOX');
}
export type TeamConcept={id:string;name:string;callout:string;family:'PASS'|'RUN';play:PlayId;formation:Formation;protection:Protection;routes:RouteBook;tip:string};
type Spec=[string,string,PlayId,Formation,Protection,RouteKind[],string];
const templates:Spec[]=[
 ['stick','STICK / FLAT','quick','spread','base',['slant','go','curl','out','flat'],'Read the flat defender. Throw stick if the corner widens.'],
 ['mesh','MESH CROSS','quick','bunch','base',['drag','go','curl','drag','flat'],'Crossers create picks against man. Lead into space.'],
 ['spacing','SPACING','quick','spread','base',['curl','out','curl','slant','flat'],'Stress hook defenders with five short windows.'],
 ['flood','SAIL / FLOOD','sideline','trips','slide',['post','out','corner','flat','flat'],'Three levels. Force the corner to choose.'],
 ['dagger','DAGGER','deep','spread','max',['go','in','post','drag','flat'],'Clear the safety vertically then strike the dig.'],
 ['fourverts','FOUR VERTICALS','deep','spread','max',['go','go','post','corner','wheel'],'Attack safety leverage and the deep seams.'],
 ['smash','SMASH','sideline','spread','base',['curl','curl','corner','out','flat'],'High-low the boundary corner.'],
 ['ycross','Y-CROSS','deep','trips','slide',['go','post','in','drag','flat'],'Attack the open lane behind linebackers.'],
 ['rbscreen','RB SCREEN','screen','spread','base',['go','go','curl','drag','flat'],'Invite rush, throw under it.'],
 ['insidezone','INSIDE ZONE','inside','spread','base',['slant','go','curl','drag','flat'],'Attack the interior B gap.'],
 ['outsidezone','OUTSIDE ZONE','outside','trips','slide',['go','go','out','drag','flat'],'Stretch pursuit and attack the edge.'],
 ['power','POWER / COUNTER','inside','bunch','max',['curl','go','out','drag','flat'],'Condense splits and hit the downhill lane.'],
 ['pashot','PLAY ACTION SHOT','deep','bunch','max',['go','post','corner','drag','flat'],'Sell the run then break behind the safeties.'],
 ['levels','LEVELS','sideline','spread','slide',['in','out','corner','drag','flat'],'Read the shallow and intermediate crossers.'],
 ['drive','DRIVE','quick','bunch','base',['slant','go','in','drag','flat'],'Shallow cross pulls coverage from the dig.'],
 ['slotfade','SLOT FADE','deep','trips','max',['post','go','flat','go','wheel'],'Attack the slot mismatch vertically.']
];
const schemes:Record<TeamStyle,string[]>={
 'west-coast':['stick','mesh','spacing','flood','drive','levels','insidezone','rbscreen'],
 spread:['spacing','stick','fourverts','slotfade','levels','mesh','insidezone','outsidezone'],
 power:['insidezone','power','pashot','mesh','smash','fourverts','outsidezone','stick'],
 vertical:['fourverts','dagger','slotfade','smash','ycross','flood','outsidezone','insidezone'],
 motion:['outsidezone','flood','mesh','pashot','ycross','rbscreen','insidezone','drive']
};
export function teamPlaybook(teamId:string):TeamConcept[]{
 const team=TEAM_BY_ID[teamId]??TEAM_BY_ID.PHI;
 return schemes[team.style].map((id,i)=>{
  const s=templates.find(t=>t[0]===id)!;
  const [nameId,name,play,formation,protection,kinds,tip]=s;
  return {id:nameId,name,callout:i<3?'FEATURED':'SITUATIONAL',family:play==='inside'||play==='outside'?'RUN':'PASS',
   play,formation,protection,routes:{7:{kind:kinds[0]},8:{kind:kinds[1]},9:{kind:kinds[2]},10:{kind:kinds[3]},1:{kind:kinds[4]}},tip};
 });
}
