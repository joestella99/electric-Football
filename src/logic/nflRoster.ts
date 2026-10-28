import type {ReceiverId} from './throwing.ts';
export type HistoricalPlayer={last:string;number:string;role:string};
export type HistoricalPersonnel={qb:HistoricalPlayer;skill:Record<ReceiverId,HistoricalPlayer>;era:string;source:string};
/** Historic featured players from the teams' actual Super Bowl squads.
 * They are selectable player identities for alternate-outcome simulations,
 * not a reproduction of exact personnel participation on every snap.
 */
const chiefs:HistoricalPersonnel={era:'2023 SEASON',source:'https://www.chiefs.com/super-bowl-lviii/',
 qb:{last:'MAHOMES',number:'15',role:'QB'},skill:{
  7:{last:'RICE',number:'4',role:'X'},8:{last:'VALDES-SCANTLING',number:'11',role:'Z'},
  9:{last:'KELCE',number:'87',role:'TE'},10:{last:'HARDMAN',number:'12',role:'SLOT'},
  1:{last:'PACHECO',number:'10',role:'RB'}
 }};
const patriots:HistoricalPersonnel={era:'2017 SEASON',source:'https://www.patriots.com/press-room/super-bowl-lii',
 qb:{last:'BRADY',number:'12',role:'QB'},skill:{
  7:{last:'AMENDOLA',number:'80',role:'X'},8:{last:'HOGAN',number:'15',role:'Z'},
  9:{last:'GRONKOWSKI',number:'87',role:'TE'},10:{last:'DORSETT',number:'13',role:'SLOT'},
  1:{last:'WHITE',number:'28',role:'RB'}
 }};
const rams:HistoricalPersonnel={era:'2021 SEASON',source:'https://www.therams.com/news/how-the-rams-super-bowl-lvi-roster-was-built',
 qb:{last:'STAFFORD',number:'9',role:'QB'},skill:{
  7:{last:'KUPP',number:'10',role:'X'},8:{last:'JEFFERSON',number:'12',role:'Z'},
  9:{last:'HOPKINS',number:'88',role:'TE'},10:{last:'SKOWRONEK',number:'18',role:'SLOT'},
  1:{last:'AKERS',number:'23',role:'RB'}
 }};
export const historicalPersonnel=(challengeId:string):HistoricalPersonnel|null=>{
 if(challengeId==='lviii-final'||challengeId==='lviii-ot')return chiefs;
 if(challengeId==='lii-patriots')return patriots;
 if(challengeId==='lvi-rams')return rams;
 return null;
};
