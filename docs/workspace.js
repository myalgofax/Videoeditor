'use strict';
// Arrange the existing controls into one contextual tool panel.
const main=document.querySelector('main'),work=document.querySelector('.workspace'),library=document.querySelector('.library'),inspector=document.querySelector('.inspector'),musicPanel=document.querySelector('.music-panel'),timeline=document.querySelector('.timeline');
const rail=document.createElement('nav');rail.className='tool-rail';rail.setAttribute('aria-label','Editing tools');
const panels=document.createElement('aside');panels.className='tool-panels';const tabs={};
const timing=document.createElement('section'),looks=document.createElement('section'),titles=document.createElement('section');
function heading(panel,text){const h=document.createElement('h2');h.textContent=text;panel.append(h)}
heading(timing,'Clip properties');heading(looks,'Color & filters');heading(titles,'Text overlay');
function move(id,panel){panel.append($(id).closest('label'))}
['name'].forEach(id=>move(id,timing));timing.append($('in').closest('.pair'));['speed','volume'].forEach(id=>move(id,timing));timing.append($('delete'));
['preset','brightness','contrast'].forEach(id=>move(id,looks));move('title',titles);titles.append($('color').closest('.pair'));
const hint=document.createElement('p');hint.className='muted';hint.textContent='Select a video clip below to edit its title.';titles.prepend(hint);
// Keep the disabled fieldset from the original UI as a hidden compatibility hook.
inspector.hidden=true;main.append(inspector);
library.querySelector('.tip')?.remove();
const config=[['media','▣','Media',library],['audio','♫','Audio',musicPanel],['clip','✂','Clip',timing],['text','T','Text',titles],['looks','◐','Color',looks]];
function openTool(key){for(const [id,,,panel] of config){panel.hidden=id!==key;tabs[id].setAttribute('aria-pressed',String(id===key))}panels.dataset.active=key}
for(const [key,icon,label,panel] of config){const b=document.createElement('button');b.innerHTML='<span aria-hidden="true">'+icon+'</span>';const caption=document.createElement('small');caption.textContent=label;b.append(caption);b.onclick=()=>openTool(key);rail.append(b);tabs[key]=b;panel.classList.add('tool-panel');panels.append(panel)}
main.prepend(rail,panels);openTool('media');
// Full-width lower timeline, independent from the preview.
main.append(timeline);const statusNode=$('status');main.append(statusNode);
timeline.querySelector('.section h2').firstChild.textContent='Timeline ';
const zoomLabel=document.createElement('label');zoomLabel.className='timeline-zoom';zoomLabel.textContent='Zoom';const zoom=document.createElement('input');zoom.type='range';zoom.min=10;zoom.max=100;zoom.value=35;zoom.setAttribute('aria-label','Timeline zoom');zoomLabel.append(zoom);timeline.querySelector('.section').append(zoomLabel);
const scroll=document.createElement('div');scroll.className='track-scroll';const sheet=document.createElement('div');sheet.className='track-sheet';scroll.append(sheet);
const ruler=document.createElement('div');ruler.className='time-ruler';ruler.setAttribute('aria-label','Sequence time ruler');sheet.append(ruler);
function row(title,kind){const r=document.createElement('div');r.className='track-row '+kind;const label=document.createElement('div');label.className='track-label';label.textContent=title;const lane=document.createElement('div');lane.className='track-lane';r.append(label,lane);sheet.append(r);return lane}
const videoLane=row('▣ Video','video-row');videoLane.append($('clips'));const musicLane=row('♫ Music','audio-row');
const line=document.createElement('div');line.className='sequence-playhead';sheet.append(line);timeline.insertBefore(scroll,timeline.querySelector('.muted'));
timeline.querySelector('.muted').textContent='Select a clip to edit · Mute original audio on each clip · Drag the music track to change its start';
let pixels=35,drag=null,waveCache=null,waveBuffer=null;
function toggleClipMute(i){if(busy)return;save();const c=clips[i];if(c.volume>0){c.savedVolume=c.volume;c.volume=0}else c.volume=c.savedVolume||1;if(i===selected)applyAudio();refresh()}
function waveform(){if(waveBuffer===musicBuffer)return waveCache;waveBuffer=musicBuffer;if(!musicBuffer)return null;const data=musicBuffer.getChannelData(0),samples=256,stride=Math.max(1,Math.floor(data.length/samples));waveCache=[];for(let i=0;i<samples;i++){let peak=0;const end=Math.min(data.length,(i+1)*stride);for(let j=i*stride;j<end;j+=Math.max(1,Math.floor(stride/128)))peak=Math.max(peak,Math.abs(data[j]));waveCache.push(peak)}return waveCache}
function drawTracks(){pixels=Number(zoom.value);const width=Math.max(650,total()*pixels);sheet.style.width=(width+100)+'px';ruler.replaceChildren();for(let t=0;t<=Math.max(total(),650/pixels);t+=pixels<25?10:5){const tick=document.createElement('span');tick.textContent=fmt(t);tick.style.left=(100+t*pixels)+'px';ruler.append(tick)}
 const cards=[...$('clips').children];cards.forEach((card,i)=>{const c=clips[i];card.style.width=Math.max(12,(c.end-c.start)/c.speed*pixels)+'px';card.style.flex='0 0 auto';card.title=c.name+' · '+fmt((c.end-c.start)/c.speed);card.querySelector('.clip-mute')?.remove();const b=document.createElement('button');b.className='clip-mute';b.textContent=c.volume===0?'Unmute':'Mute';b.title=originalMuted?'All original audio is muted in Audio settings':(c.volume===0?'Restore original clip audio':'Mute original clip audio');b.setAttribute('aria-label',b.title+' — '+c.name);b.setAttribute('aria-pressed',String(c.volume===0));b.onclick=()=>toggleClipMute(i);card.append(b);card.classList.toggle('is-muted',c.volume===0);});
 for(const panel of [timing,looks,titles])panel.querySelectorAll('input,select,button').forEach(el=>el.disabled=!current());
 musicLane.replaceChildren();if(!musicBuffer){const add=document.createElement('button');add.className='empty-audio';add.textContent='＋ Add music to your timeline';add.onclick=()=>{openTool('audio');$('addMusic').click()};musicLane.append(add);return}
 const duration=music.loop?Math.max(0,total()-music.offset):Math.min(music.end-music.start,Math.max(0,total()-music.offset));const block=document.createElement('button');block.className='music-block';block.style.left=(music.offset*pixels)+'px';block.style.width=Math.max(20,duration*pixels)+'px';block.setAttribute('aria-label','Music track. Drag to move, or use arrow keys.');block.title='Drag to move music · Arrow keys adjust by 0.1 seconds';
 const wave=document.createElement('canvas');wave.width=800;wave.height=44;const x=wave.getContext('2d'),peaks=waveform();x.strokeStyle='#88edd3';x.lineWidth=2;for(let i=0;i<256;i++){const fraction=music.start/musicBuffer.duration+(i/256)*(music.end-music.start)/musicBuffer.duration;const v=peaks[Math.min(255,Math.floor(fraction*256))]||0;x.beginPath();x.moveTo(i*800/256,22-v*20);x.lineTo(i*800/256,22+v*20);x.stroke()}block.append(wave);const label=document.createElement('span');label.textContent=$('musicName').textContent+(music.loop?' · Loop':'');block.append(label);block.onclick=()=>openTool('audio');
 block.onpointerdown=e=>{if(busy)return;video.pause();drag={x:e.clientX,offset:music.offset};block.setPointerCapture(e.pointerId)};block.onpointermove=e=>{if(!drag)return;const max=Math.max(0,total()-.05);music.offset=Math.min(max,Math.max(0,drag.offset+(e.clientX-drag.x)/pixels));block.style.left=music.offset*pixels+'px';$('musicOffset').value=music.offset.toFixed(2)};const finish=()=>{if(!drag)return;drag=null;refreshMusic();drawTracks()};block.onpointerup=finish;block.onpointercancel=finish;block.onkeydown=e=>{if(busy||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();music.offset=Math.min(Math.max(0,total()-.05),Math.max(0,music.offset+(e.key==='ArrowLeft'?-.1:.1)));refreshMusic();drawTracks()};musicLane.append(block);
 if(music.offset>=total()){const warning=document.createElement('span');warning.className='muted';warning.textContent='Music starts after the video. Adjust its start in Audio.';musicLane.append(warning)}
}
let queued=false;function scheduleTracks(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;drawTracks()})}
// Watch direct children only: buttons added inside each clip must not retrigger this observer.
new MutationObserver(scheduleTracks).observe($('clips'),{childList:true});new MutationObserver(scheduleTracks).observe($('musicName'),{childList:true,characterData:true,subtree:true});musicPanel.addEventListener('change',scheduleTracks);zoom.oninput=drawTracks;
video.addEventListener('loadedmetadata',()=>{if(!busy)openTool('clip')});
ruler.onclick=e=>{if(busy||!clips.length)return;let target=Math.max(0,(e.clientX-ruler.getBoundingClientRect().left-100)/pixels),offset=0;for(let i=0;i<clips.length;i++){const c=clips[i],length=(c.end-c.start)/c.speed;if(target<offset+length||i===clips.length-1){const t=Math.min(c.end,c.start+Math.max(0,target-offset)*c.speed);select(i);video.addEventListener('loadeddata',()=>{video.currentTime=t},{once:true});return}offset+=length}};
function trackHead(){line.style.left=(100+sequenceTime()*pixels)+'px';requestAnimationFrame(trackHead)}drawTracks();trackHead();
