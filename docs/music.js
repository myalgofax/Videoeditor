'use strict';
let originalMuted=false,musicBuffer=null,musicNode=null,musicGain=null,importVersion=0;
const music={start:0,end:0,offset:0,volume:.6,loop:false,fadeIn:0,fadeOut:0};
async function ensureAudio(){
  const AudioAPI=window.AudioContext||window.webkitAudioContext;
  if(!AudioAPI)throw new Error('Audio mixing is unavailable in this browser.');
  audioContext??=new AudioAPI();await audioContext.resume();
  if(!audioSource){audioSource=audioContext.createMediaElementSource(video);audioGain=audioContext.createGain();audioDestination=audioContext.createMediaStreamDestination();audioSource.connect(audioGain);audioGain.connect(audioDestination);audioGain.connect(audioContext.destination)}
  applyAudio();
}
function sequenceTime(){return clips.slice(0,selected).reduce((s,c)=>s+(c.end-c.start)/c.speed,0)+(current()?Math.max(0,video.currentTime-current().start)/current().speed:0)}
function musicPlan(t,length,m){const span=m.end-m.start;if(span<=0||length<=m.offset)return null;const end=m.loop?length:Math.min(length,m.offset+span);if(t>=end)return null;const begin=Math.max(t,m.offset);return {delay:Math.max(0,m.offset-t),offset:m.start+((begin-m.offset)%span),duration:end-begin,begin,end}}
function fadeLevel(t,p,m){const fi=Math.min(m.fadeIn,(p.end-m.offset)/2),fo=Math.min(m.fadeOut,(p.end-m.offset)/2);return m.volume*Math.max(0,Math.min(1,fi?(t-m.offset)/fi:1,fo?(p.end-t)/fo:1))}
function stopMusic(){if(musicNode){musicNode.onended=null;try{musicNode.stop()}catch{}musicNode.disconnect();musicNode=null}if(musicGain){musicGain.disconnect();musicGain=null}}
function startMusic(){stopMusic();if(!musicBuffer||!audioContext||!audioDestination||!current()||video.paused||video.seeking)return;const p=musicPlan(sequenceTime(),total(),music);if(!p||p.duration<=0)return;
  const node=audioContext.createBufferSource(),gain=audioContext.createGain();musicNode=node;musicGain=gain;node.buffer=musicBuffer;node.loop=music.loop;node.loopStart=music.start;node.loopEnd=music.end;node.connect(gain);gain.connect(audioDestination);gain.connect(audioContext.destination);
  const when=audioContext.currentTime+p.delay;gain.gain.setValueAtTime(0,audioContext.currentTime);gain.gain.setValueAtTime(fadeLevel(p.begin,p,music),when);
  const points=[music.offset+Math.min(music.fadeIn,(p.end-music.offset)/2),p.end-Math.min(music.fadeOut,(p.end-music.offset)/2),p.end].filter(t=>t>p.begin).sort((a,b)=>a-b);
  for(const t of points)gain.gain.linearRampToValueAtTime(fadeLevel(t,p,music),when+t-p.begin);
  node.start(when,p.offset,p.duration);node.onended=()=>{if(musicNode===node){node.disconnect();gain.disconnect();musicNode=null;musicGain=null}};
}
function refreshMusic(){for(const [id,key] of [['musicIn','start'],['musicOut','end'],['musicOffset','offset'],['musicVolume','volume'],['musicFadeIn','fadeIn'],['musicFadeOut','fadeOut']])$(id).value=music[key];$('musicLoop').checked=music.loop;$('musicVolumeLabel').textContent=Math.round(music.volume*100)+'%';$('musicSettings').disabled=!musicBuffer;}
$('addMusic').onclick=()=>$('musicFile').click();
$('musicFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file||busy)return;const version=++importVersion;if(file.size>80*1024*1024){status('Choose an audio file under 80 MB to limit browser memory use.');return}video.pause();$('addMusic').disabled=true;$('render').disabled=true;$('musicName').textContent='Loading '+file.name+'…';try{await ensureAudio();const decoded=await audioContext.decodeAudioData(await file.arrayBuffer());if(version!==importVersion)return;if(!decoded.duration||decoded.duration>1800)throw new Error('Choose a soundtrack shorter than 30 minutes.');stopMusic();musicBuffer=decoded;music.start=0;music.end=decoded.duration;music.offset=0;music.fadeIn=0;music.fadeOut=0;$('musicName').textContent=file.name+' · '+fmt(decoded.duration);refreshMusic();status('Music added. Choose “Mute original” to replace the video audio.')}catch(err){$('musicName').textContent=musicBuffer?'Previous soundtrack kept.':'No soundtrack loaded.';status('Cannot load music: '+err.message)}finally{if(version===importVersion){$('addMusic').disabled=false;$('render').disabled=false}}};
for(const [id,key] of [['musicIn','start'],['musicOut','end'],['musicOffset','offset'],['musicVolume','volume'],['musicFadeIn','fadeIn'],['musicFadeOut','fadeOut']])$(id).onchange=()=>{if(busy||!musicBuffer)return;const next={...music,[key]:Number($(id).value)};if(!Number.isFinite(next[key])||next.start<0||next.end>musicBuffer.duration||next.end-next.start<.05||next.offset<0||next.volume<0||next.volume>1||next.fadeIn<0||next.fadeOut<0||next.fadeIn>30||next.fadeOut>30){status('Use valid music trim points, nonnegative timing, and fades from 0 to 30 seconds.');refreshMusic();return}Object.assign(music,next);refreshMusic();startMusic()};
$('musicLoop').onchange=()=>{if(busy)return;music.loop=$('musicLoop').checked;startMusic()};
$('originalAudio').onchange=()=>{if(busy)return;originalMuted=$('originalAudio').value==='mute';applyAudio();status(originalMuted?'All original video sound is muted in preview and edited export.':'Original clip audio is mixed with your music.')};
$('muteClip').onclick=()=>{if(busy||!current()){status('Select a video clip first.');return}save();current().volume=0;applyAudio();refresh();status('Selected clip muted. Raise Original clip volume to restore it.')};
$('removeMusic').onclick=()=>{if(busy)return;stopMusic();musicBuffer=null;refreshMusic();$('musicName').textContent='No soundtrack loaded.';status(originalMuted?'Music removed. Original audio is still muted; use the dropdown to restore it.':'Music removed; original video audio kept.')};
video.addEventListener('playing',startMusic);video.addEventListener('pause',stopMusic);video.addEventListener('ended',stopMusic);video.addEventListener('waiting',stopMusic);video.addEventListener('seeking',stopMusic);video.addEventListener('seeked',startMusic);video.addEventListener('ratechange',startMusic);
window.addEventListener('pagehide',stopMusic);refreshMusic();
