/** The quarterback cannot start a play until the coach has set it
 * and the player has seen the line-of-scrimmage field.
 */
export type DrivePhase='calling'|'ready'|'live'|'result'|'finished';
export type SnapTempo='hurry'|'huddle'|'drain';
export const canSetPlay=(stage:DrivePhase)=>stage==='calling';
export const canSnap=(stage:DrivePhase)=>stage==='ready';
export const snapSetupSeconds=(clockRunning:boolean,tempo:SnapTempo):number=>
 clockRunning?(tempo==='drain'?12:tempo==='huddle'?5:1):0;
export const audibleSeconds=(clockRunning:boolean):number=>clockRunning?2:0;
