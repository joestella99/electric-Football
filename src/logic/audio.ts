type Cue='snap'|'throw'|'catch'|'incomplete'|'interception'|'sack'|'run'|'touchdown';
let audio:AudioContext|null=null;
function context():AudioContext|null{
 if(typeof window==='undefined'||!('AudioContext' in window))return null;
 try{
  audio??=new AudioContext();
  if(audio.state==='suspended')void audio.resume();
  return audio;
 }catch{return null;}
}
/** Original synthesized tabletop clicks and crowd cues: no external audio files. */
export function playCue(cue:Cue,enabled=true){
 if(!enabled)return;
 const ctx=context();if(!ctx)return;
 const start=ctx.currentTime+.008;
 const notes:Record<Cue,{f:number;end:number;gain:number;wave:OscillatorType;slide?:number}>={
  snap:{f:310,end:.06,gain:.062,wave:'triangle',slide:115},
  throw:{f:220,end:.16,gain:.035,wave:'sine',slide:540},
  catch:{f:165,end:.10,gain:.077,wave:'triangle',slide:86},
  incomplete:{f:180,end:.22,gain:.038,wave:'sawtooth',slide:75},
  interception:{f:340,end:.27,gain:.052,wave:'sawtooth',slide:90},
  sack:{f:105,end:.18,gain:.085,wave:'triangle',slide:48},
  run:{f:140,end:.1,gain:.035,wave:'triangle',slide:75},
  touchdown:{f:510,end:.38,gain:.043,wave:'triangle',slide:680}
 };
 const spec=notes[cue];
 try{
  const oscillator=ctx.createOscillator(),volume=ctx.createGain();
  oscillator.type=spec.wave;oscillator.frequency.setValueAtTime(spec.f,start);
  oscillator.frequency.exponentialRampToValueAtTime(spec.slide??spec.f,start+spec.end);
  volume.gain.setValueAtTime(.001,start);
  volume.gain.exponentialRampToValueAtTime(spec.gain,start+.007);
  volume.gain.exponentialRampToValueAtTime(.001,start+spec.end);
  oscillator.connect(volume);volume.connect(ctx.destination);
  oscillator.start(start);oscillator.stop(start+spec.end+.02);
 }catch{/* Audio is optional; never block an input or frame. */}
}
