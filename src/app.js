'use strict';
const $ = id => document.getElementById(id);
const canvas=$('preview');let ctx=canvas.getContext('2d',{alpha:false});const mainCtx=ctx;
let W=1920,H=1080;const assets=new Map(),layers=[document.createElement('canvas'),document.createElement('canvas')];
let project,defaults,selected=0,time=2.7,playing=false,clockStart=0,clockTime=0,saveTimer,toastTimer,dragScene=null,dragText=null,hitBoxes=[];
let startingPlayback=false,playbackRequest=0;
let audioContext,audioDestination,musicGain,musicElement,musicKey='',exporting=false,exportCancelled=false,recorder=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const total=()=>FilmTimeline.total(project.scenes);
const starts=()=>FilmTimeline.starts(project.scenes);
const locate=t=>FilmTimeline.locate(project.scenes,t);
const mediaKey=s=>s.id+'|'+s.media;
const sceneAsset=s=>assets.get(mediaKey(s));
const loadScene=s=>loadAsset(s.media,s.mediaType,mediaKey(s));
function scene(){return project.scenes[selected];}
function format(t){t=Math.max(0,t);return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.floor(t%1*100)).padStart(2,'0')}`;}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
async function api(url,options){if(window.FilmStorage)return FilmStorage.api(url,options);const response=await fetch(url,options);const data=await response.json();if(!response.ok||data.error)throw Error(data.error||'请求失败');return data;}
async function mediaURL(url){return window.FilmStorage?FilmStorage.resolve(url):url;}
async function setThumbnail(img,url){if(!url){img.hidden=true;return;}try{img.src=await mediaURL(url);}catch{img.style.visibility='hidden';}}
function safeText(value,max=500){return String(value??'').slice(0,max);}
function validateProject(p){
 if(!p||p.version!==1||!Array.isArray(p.scenes)||!p.scenes.length||p.scenes.length>100)throw Error('请选择片场导出的工程 JSON 文件');
 const validColor=v=>/^#[a-fA-F0-9]{6}$/.test(v);
 for(const k of ['background','accent','textColor','mutedColor'])if(!validColor(p[k]))p[k]=defaults[k];
 // Upgrade older silent projects once; retain an explicit choice to remove music.
 if(!p.music&&p.musicConfigured!==true){p.music=FilmCatalog.defaultMusic.url;p.musicName=FilmCatalog.defaultMusic.name;p.musicVolume=FilmCatalog.defaultMusic.volume;}
 p.musicConfigured=true;
 p.id=/^[a-zA-Z0-9-]+$/.test(p.id||'')?p.id:'project-'+crypto.randomUUID();p.aspect=['landscape','portrait','square'].includes(p.aspect)?p.aspect:'landscape';p.name=safeText(p.name,100);p.brand=safeText(p.brand,100);p.corner=safeText(p.corner,100);p.musicVolume=Math.max(0,Math.min(1,Number(p.musicVolume)||0));
 for(const s of p.scenes){
  if(!FilmLayouts.has(s.layout))s.layout='split';
  for(const k of ['title','description','kicker','tags','cta','name'])s[k]=safeText(s[k]);
  s.duration=Math.max(1,Math.min(120,Number(s.duration)||6));s.trim=Math.max(0,Number(s.trim)||0);s.rate=Math.max(.25,Math.min(4,Number(s.rate)||1));
  s.zoom=Math.max(.5,Math.min(2.5,Number(s.zoom)||1));s.panX=Math.max(-500,Math.min(500,Number(s.panX)||0));s.panY=Math.max(-500,Math.min(500,Number(s.panY)||0));
  s.titleSize=Math.max(36,Math.min(180,Number(s.titleSize)||108));s.descriptionSize=Math.max(24,Math.min(100,Number(s.descriptionSize)||58));
  s.volume=Math.max(0,Math.min(1,Number(s.volume)||0));for(const [k,fallback,max]of [['textX',110,1800],['textY',330,1000],['descriptionY',645,1000]])s[k]=Number.isFinite(Number(s[k]))?Math.max(0,Math.min(max,Number(s[k]))):fallback;
  s.mediaType=s.mediaType==='video'?'video':'image';s.id=safeText(s.id,100)||'scene-'+crypto.randomUUID();s.media=safeText(s.media,250);s.thumbnail=safeText(s.thumbnail,250);
  s.transition=['cut','fade','black'].includes(s.transition)?s.transition:'cut';s.transitionDuration=Math.max(.1,Math.min(2,Number(s.transitionDuration)||.4));s.mediaOnly=!!s.mediaOnly;
  s.rotation=[-90,0,90,180].includes(Number(s.rotation))?Number(s.rotation):0;
  for(const k of ['media','thumbnail'])if(s[k]&&!/^\/public\//.test(s[k]))throw Error('工程素材需要位于本机素材库；请通过替换素材重新导入文件');
 }
 if(p.music&&!/^\/public\//.test(p.music))throw Error('工程音乐需要位于本机素材库');
 return p;
}
function dirty(){
 $('saveStatus').innerHTML='<i></i> 正在保存…';clearTimeout(saveTimer);
 saveTimer=setTimeout(async()=>{try{await api('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});$('saveStatus').innerHTML='<i></i> '+(window.FilmStorage?(FilmStorage.volatile?'素材仅在当前页面 · 请备份':'已存浏览器 · 建议备份'):'已保存到本机');}catch(e){$('saveStatus').textContent='请保存工程备份';toast(e.message);}},500);
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);}
async function saveFile(){try{$('saveProject').disabled=true;toast('正在打包工程与素材…');const p=window.FilmStorage?await FilmStorage.pack(project):project;downloadBlob(new Blob([JSON.stringify(p)],{type:'application/json'}),`${project.name||'片场工程'}.json`);dirty();toast(window.FilmStorage?'工程与素材已一起下载，下次可直接打开':'工程已下载，素材保留在本机素材库');}catch(e){toast(e.message);}finally{$('saveProject').disabled=false;}}
function loadAsset(url,type,key=url){
 if(!url)return Promise.resolve(null);
 if(assets.has(key))return assets.get(key).promise;
 const a={type,ready:false,error:null,element:null,gain:null,node:null};assets.set(key,a);
 a.promise=new Promise((resolve,reject)=>{
  const e=type==='video'?document.createElement('video'):new Image();a.element=e;
  const timeout=setTimeout(()=>{a.error='素材加载超时';reject(Error('素材加载超时，请换成 MP4 或图片后重试'));},30000);
  function finish(){if(a.ready)return;a.ready=true;clearTimeout(timeout);resolve(a);}
  e.onerror=()=>{clearTimeout(timeout);a.error='浏览器无法读取素材';reject(Error('浏览器无法读取素材，请使用 H.264 MP4、WebM、PNG 或 JPG'));};
  if(type==='video'){e.preload='auto';e.playsInline=true;e.muted=true;e.addEventListener('loadeddata',finish,{once:true});}else e.onload=finish;
  mediaURL(url).then(src=>{e.src=src;if(type==='video')e.load();}).catch(error=>{clearTimeout(timeout);a.error=error.message;reject(error);});
 });
 a.promise.catch(()=>{});return a.promise;
}
async function ensureAudio(){
 if(!audioContext){
  audioContext=new (window.AudioContext||window.webkitAudioContext)();audioDestination=audioContext.createMediaStreamDestination();musicGain=audioContext.createGain();musicGain.gain.value=0;musicGain.connect(audioContext.destination);musicGain.connect(audioDestination);
 }
 if(audioContext.state==='suspended')await audioContext.resume();
 for(const a of assets.values())if(a.type==='video'&&a.ready&&!a.node){
  a.node=audioContext.createMediaElementSource(a.element);a.gain=audioContext.createGain();a.gain.gain.value=0;a.node.connect(a.gain);a.gain.connect(audioContext.destination);a.gain.connect(audioDestination);a.element.muted=false;
 }
 await ensureMusic();
}
async function ensureMusic(){
 if(musicKey===project.music)return;
 if(musicElement){musicElement.pause();musicElement.removeAttribute('src');musicElement.load();}
 musicElement=null;musicKey=project.music||'';
 if(!project.music||!audioContext)return;
 const e=new Audio();e.preload='auto';e.loop=true;e.src=await mediaURL(project.music);musicElement=e;
 const source=audioContext.createMediaElementSource(e);source.connect(musicGain);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('音乐加载超时')),30000);e.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});e.addEventListener('error',()=>{clearTimeout(timer);reject(Error('音乐文件无法播放'));},{once:true});e.load();});
}
function silence(){for(const a of assets.values())if(a.type==='video'){a.element.pause();if(a.gain)a.gain.gain.value=0;}if(musicElement)musicElement.pause();}
function desiredMediaTime(s,local,e){const dur=Number.isFinite(e.duration)?e.duration:0;const start=Math.min(Math.max(0,Number(s.trim)),Math.max(0,dur-.08));const length=Math.max(.08,dur-start);let d=local*Number(s.rate);if(s.loop)d%=length;else d=Math.min(d,Math.max(0,length-.045));return start+d;}
function syncMedia(force=false,allowMusic=true){
 if(!project)return;const frames=FilmTimeline.frames(project.scenes,time),active=new Set();
 for(const frame of frames){
  const s=project.scenes[frame.index],a=sceneAsset(s);if(!a?.ready||a.type!=='video'||!FilmLayouts.usesMedia(s))continue;active.add(a);
  const e=a.element,target=desiredMediaTime(s,frame.local,e);e.playbackRate=Number(s.rate);
  if(force||Math.abs(e.currentTime-target)>.28)try{e.currentTime=target;}catch{}
  const ended=!s.loop&&target>=e.duration-.06;
  if(playing&&!ended&&e.paused)e.play().catch(()=>{});if(!playing||ended)e.pause();
  if(a.gain)a.gain.gain.value=playing?Number(s.volume)*frame.weight:0;
 }
 for(const a of assets.values())if(a.type==='video'&&!active.has(a)){a.element.pause();if(a.gain)a.gain.gain.value=0;}
 if(musicElement&&project.music&&musicElement.readyState>=2){
  const target=time%musicElement.duration;if(force||Math.abs(musicElement.currentTime-target)>.35)musicElement.currentTime=target;
  const fade=Math.min(1,time/.3,Math.max(0,(total()-time)/.8));musicGain.gain.value=(playing&&allowMusic&&(exporting||$('previewAudio').checked))?Number(project.musicVolume)*fade:0;
  if(playing&&musicElement.paused)musicElement.play().catch(()=>{});if(!playing)musicElement.pause();
 }else if(musicGain)musicGain.gain.value=0;
}
async function seekActive(at){for(const frame of FilmTimeline.frames(project.scenes,at))await seekVideoAt(project.scenes[frame.index],frame.local);}
async function seekVideoAt(s,local){
 if(!FilmLayouts.usesMedia(s))return;
 const a=await loadScene(s);if(!a||a.type!=='video')return;
 const v=a.element,target=desiredMediaTime(s,local,v);if(Math.abs(v.currentTime-target)<.015&&v.readyState>=2)return;
 await new Promise(resolve=>{const done=()=>{clearTimeout(timer);v.removeEventListener('seeked',done);resolve();};const timer=setTimeout(done,3000);v.addEventListener('seeked',done);try{v.currentTime=target;}catch{done();}});
}
async function selectScene(index){
 if(exporting)return;pause();selected=Math.max(0,Math.min(project.scenes.length-1,index));time=starts()[selected]+Math.min(2.7,scene().duration*.5);renderUI();
 try{$('mediaLoading').hidden=false;await seekActive(time);syncMedia(true);}catch(e){toast(e.message);}finally{$('mediaLoading').hidden=true;draw();}
}
function inputValues(){
 const s=scene();document.querySelectorAll('[data-field]').forEach(el=>{const k=el.dataset.field;if(el.type==='checkbox')el.checked=!!s[k];else el.value=s[k]??'';});
 updateRangeLabels();$('assetName').textContent=s.mediaName||s.media.split('/').pop()||'未添加素材';$('transition').disabled=selected===project.scenes.length-1;$('transitionDuration').disabled=s.transition==='cut'||selected===project.scenes.length-1;const overlap=FilmTimeline.overlap(s,project.scenes[selected+1]);$('transitionNote').textContent=selected===project.scenes.length-1?'最后一个镜头无需设置过渡。':`与下一镜头重叠 ${overlap.toFixed(1)} 秒 · 过渡不会增加总时长。`;$('activeTitle').textContent=s.name;$('inspectorTitle').textContent=`镜头 ${String(selected+1).padStart(2,'0')}`;
 const a=sceneAsset(s);const dur=a?.ready&&s.mediaType==='video'?a.element.duration:null;$('mediaNote').textContent=dur?`素材 ${dur.toFixed(1)} 秒 · 当前镜头 ${s.duration} 秒`:'点击或拖动文字调整位置';
 $('durationWarning').textContent=dur&&s.trim+s.duration*s.rate>dur&&!s.loop?'当前镜头超出素材长度，超出部分将定格在尾帧。':'';
 $('trim').disabled=s.mediaType!=='video';$('rate').disabled=s.mediaType!=='video';$('loop').disabled=s.mediaType!=='video';$('volume').disabled=s.mediaType!=='video';
 $('layoutNote').textContent=s.mediaOnly?'仅素材模式：隐藏所有文字与装饰。选择其它布局会退出此模式。':FilmLayouts.items[s.layout].note;
}
function updateRangeLabels(){for(const [id,suffix,mul]of [['titleSize',' px',1],['descriptionSize',' px',1],['zoom','%',100],['volume','%',100],['panX','',1],['panY','',1]])$(id+'Value').textContent=Math.round(Number(scene()[id]||0)*mul)+suffix;}
function renderUI(){
 setDimensions();$('sceneCount').textContent=String(project.scenes.length).padStart(2,'0');$('scenesList').replaceChildren();$('timelineClips').replaceChildren();
 project.scenes.forEach((s,i)=>{
  const card=document.createElement('div');card.className='scene-card'+(i===selected?' active':'');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`镜头${i+1} ${s.name}`);card.draggable=true;
  const im=document.createElement('img');im.className='scene-thumb'+(s.mediaType==='image'?' product':'');setThumbnail(im,s.thumbnail||s.media);im.alt='';im.onerror=()=>im.style.visibility='hidden';
  const info=document.createElement('div');info.className='scene-info';const b=document.createElement('b');b.textContent=s.name;const small=document.createElement('small');small.textContent=`${Number(s.duration).toFixed(1)}s · ${s.layout==='text'?'文字':!s.media?'待添加':s.mediaType==='video'?'视频':'图片'}`;info.append(b,small);
  const idx=document.createElement('span');idx.className='scene-index';idx.textContent=String(i+1).padStart(2,'0');card.append(im,info,idx);card.onclick=()=>selectScene(i);card.onkeydown=e=>{if(e.key==='Enter')selectScene(i);};
  card.ondragstart=e=>{dragScene=i;e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move';};card.ondragover=e=>{e.preventDefault();card.classList.add('dragover');};card.ondragleave=()=>card.classList.remove('dragover');card.ondrop=e=>{e.preventDefault();card.classList.remove('dragover');const from=dragScene;if(from===null||from===i)return;pause();const item=project.scenes.splice(from,1)[0];project.scenes.splice(i,0,item);dragScene=null;dirty();selectScene(i);};card.ondragend=()=>dragScene=null;$('scenesList').append(card);
  const clip=document.createElement('div');clip.className='timeline-clip'+(i===selected?' active':'');clip.style.flex=String(Number(s.duration)-FilmTimeline.overlap(s,project.scenes[i+1]));const cim=im.cloneNode();setThumbnail(cim,s.thumbnail||s.media);const label=document.createElement('span');label.textContent=s.name;const d=document.createElement('small');d.textContent=s.duration+'s';clip.append(cim,label,d);if(FilmTimeline.overlap(s,project.scenes[i+1])){const mark=document.createElement('b');mark.className='transition-mark';mark.textContent='↔';clip.append(mark);}$('timelineClips').append(clip);
 });
 $('totalTime').textContent=format(total());$('timelineSummary').textContent=`${project.scenes.length} 个镜头 · ${total().toFixed(1)} 秒`;
 $('timelineTicks').replaceChildren();for(let i=0;i<=5;i++){const sp=document.createElement('span');sp.textContent=format(total()*i/5).slice(0,5);$('timelineTicks').append(sp);}
 $('deleteScene').disabled=project.scenes.length===1;inputValues();updateTransport();draw();
}
function updateTransport(){
 if(!project)return;$('currentTime').textContent=format(time);$('playhead').style.left=(time/total()*100)+'%';
 const active=playing||startingPlayback,label=active?'暂停预览':'播放预览',icon=active?'#i-pause':'#i-play';
 // Keep the same SVG node between pointer-down and pointer-up, including animation frames.
 if($('playBtn').getAttribute('aria-label')!==label)$('playBtn').setAttribute('aria-label',label);
 if($('playIcon').getAttribute('href')!==icon)$('playIcon').setAttribute('href',icon);
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function text(str,x,y,size,color,weight=400,alpha=1){if(!str||alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;ctx.textBaseline='top';ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}
function smooth(v){v=Math.max(0,Math.min(1,v));return 1-(1-v)**3;}
function ramp(f,a,b){return smooth((f-a)/(b-a));}
function imageDraw(element,s,x,y,w,h,contain=false,alpha=1,round=0){
 if(!element||alpha<=0)return;const sw=element.videoWidth||element.naturalWidth||element.width,sh=element.videoHeight||element.naturalHeight||element.height;if(!sw||!sh)return;
 const rotated=Math.abs(s.rotation)%180===90,rw=rotated?sh:sw,rh=rotated?sw:sh;const scale=(contain||s.fit==='contain'?Math.min(w/rw,h/rh):Math.max(w/rw,h/rh))*Number(s.zoom||1);
 ctx.save();ctx.globalAlpha=alpha;rounded(x,y,w,h,round);ctx.clip();ctx.translate(x+w/2+Number(s.panX||0),y+h/2+Number(s.panY||0));ctx.rotate(Number(s.rotation||0)*Math.PI/180);ctx.drawImage(element,-sw*scale/2,-sh*scale/2,sw*scale,sh*scale);ctx.restore();
}
function media(s){const a=sceneAsset(s);return a?.ready?a.element:null;}
function setDimensions(){
 const size=project.aspect==='portrait'?[1080,1920]:project.aspect==='square'?[1080,1080]:[1920,1080];
 if(W!==size[0]||H!==size[1]){[W,H]=size;canvas.width=W;canvas.height=H;}
 for(const layer of layers)if(layer.width!==W||layer.height!==H){layer.width=W;layer.height=H;}
 $('resolutionLabel').textContent=`${W} × ${H}`;canvas.parentElement.style.aspectRatio=String(W/H);
 canvas.parentElement.style.width=project.aspect==='portrait'?'min(100%, 32vh)':project.aspect==='square'?'min(100%, 57vh)':'100%';canvas.parentElement.style.alignSelf='center';
}
function draw(at=time,selection=true){
 if(!project)return;const frames=FilmTimeline.frames(project.scenes,at);const primary=locate(at).index;let boxes=[];
 if(frames.length===1){ctx=mainCtx;drawScene(frames[0].index,frames[0].local,selection);return;}
 mainCtx.fillStyle=project.background;mainCtx.fillRect(0,0,W,H);
 try{
  frames.forEach((frame,i)=>{ctx=layers[i].getContext('2d',{alpha:false});drawScene(frame.index,frame.local,selection&&frame.index===primary);if(frame.index===primary)boxes=hitBoxes;
   const black=frame.transition==='black';mainCtx.globalAlpha=black?Math.max(0,(frame.weight-.5)*2):i===0?1:frame.weight;mainCtx.drawImage(layers[i],0,0);});
 }finally{mainCtx.globalAlpha=1;ctx=mainCtx;hitBoxes=boxes;}
}
function pause(){playbackRequest++;startingPlayback=false;playing=false;silence();updateTransport();}
async function play(){
 if(exporting)return;if(playing||startingPlayback){pause();return;}if(time>=total()-.05)time=0;
 const request=++playbackRequest;startingPlayback=true;updateTransport();
 try{
  await loadAll();if(request!==playbackRequest)return;
  await ensureAudio();if(request!==playbackRequest)return;
  const pos=locate(time);await seekActive(time);if(request!==playbackRequest)return;
  playing=true;clockStart=performance.now();clockTime=time;syncMedia(true);
 }catch(e){if(request===playbackRequest)toast(e.message);}
 finally{if(request===playbackRequest){startingPlayback=false;updateTransport();}}
}
async function loadAll(){const pending=[];for(const s of project.scenes){if(FilmLayouts.usesMedia(s)&&s.media)pending.push(loadScene(s));if(s.thumbnail&&s.thumbnail!==s.media)pending.push(loadAsset(s.thumbnail,'image').catch(()=>null));}await Promise.all(pending);}
function loop(now){
 if(project){
  if(playing&&!exporting){time=Math.min(total(),clockTime+(now-clockStart)/1000);const pos=locate(time);if(pos.index!==selected){selected=pos.index;renderUI();}syncMedia(false);if(time>=total()){pause();}updateTransport();}
  if(!exporting)draw();
 }
 requestAnimationFrame(loop);
}
async function uploadFile(file){
 if(file.size>1024**3)throw Error('文件超过1GB，请分段后导入');
 const result=await api('/api/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});return result.url;
}
async function replaceMedia(file){
 if(!file)return;pause();const target=scene();const index=selected;const type=mediaType(file);if(!type){toast('请选择视频或图片文件');return;}
 try{$('mediaLoading').hidden=false;toast('正在导入素材…');const url=await uploadFile(file);const asset=await loadAsset(url,type,target.id+'|'+url);target.media=url;target.mediaType=type;target.mediaName=file.name;target.thumbnail=type==='image'?url:'';target.trim=0;target.rate=1;target.rotation=0;target.zoom=1;target.panX=0;target.panY=0;
  if(type==='video')target.thumbnail=await videoThumbnail(asset);
  selected=index;dirty();await selectScene(index);toast('素材已替换，可以调整起点、时长和取景');
 }catch(e){toast(e.message);}finally{$('mediaLoading').hidden=true;$('mediaFile').value='';}
}
function mediaType(file){return file.type.startsWith('image/')||/\.(png|jpe?g|webp|gif)$/i.test(file.name)?'image':file.type.startsWith('video/')||/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)?'video':null;}
async function videoThumbnail(asset){
 const v=asset.element;await new Promise(resolve=>{const done=()=>{clearTimeout(timer);v.removeEventListener('seeked',done);resolve();};const timer=setTimeout(done,1500);v.addEventListener('seeked',done);v.currentTime=Math.min(.25,v.duration/2);});
 const thumb=document.createElement('canvas');thumb.width=320;thumb.height=180;const scale=Math.max(320/v.videoWidth,180/v.videoHeight);thumb.getContext('2d').drawImage(v,(320-v.videoWidth*scale)/2,(180-v.videoHeight*scale)/2,v.videoWidth*scale,v.videoHeight*scale);
 const blob=await new Promise(resolve=>thumb.toBlob(resolve,'image/jpeg',.8));return blob?await uploadFile(new File([blob],'thumbnail.jpg',{type:'image/jpeg'})):'';
}
function addScene(){if(project.scenes.length>=100){toast('最多支持100个镜头');return;}project.scenes.splice(selected+1,0,FilmCatalog.shot({name:'新镜头'}));dirty();selectScene(selected+1);}

for(const [id,item]of Object.entries(FilmLayouts.items)){const option=document.createElement('option');option.value=id;option.textContent=item.label;$('layout').append(option);}
$('resetLayout').onclick=()=>{pause();FilmLayouts.reset(scene());dirty();inputValues();draw();toast('已恢复当前布局的文字位置');};
document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',()=>{
 const s=scene(),key=el.dataset.field;let value=el.type==='checkbox'?el.checked:el.hasAttribute('data-number')?Number(el.value):el.value;
 if(el.type==='number'&&!Number.isFinite(value))return;
 if(key==='duration')value=Math.max(1,Math.min(120,value));if(key==='trim')value=Math.max(0,value);if(key==='transitionDuration')value=Math.max(.1,Math.min(2,value));
 if(key==='layout'){FilmLayouts.apply(s,value);}else s[key]=value;
 dirty();updateRangeLabels();draw();if(['name','duration','layout','transition','transitionDuration'].includes(key)){pause();time=starts()[selected]+Math.min(2.7,s.duration*.5);renderUI();seekActive(time).then(()=>{syncMedia(true);draw();}).catch(e=>toast(e.message));}if(key==='mediaOnly'){pause();inputValues();seekActive(time).then(()=>{syncMedia(true);draw();}).catch(e=>toast(e.message));}if(['trim','rotation','rate'].includes(key)){syncMedia(true);seekActive(time).then(()=>draw()).catch(e=>toast(e.message));}
}));
document.querySelectorAll('[data-global]').forEach(el=>el.addEventListener('input',()=>{if(el.dataset.global==='aspect')pause();project[el.dataset.global]=el.hasAttribute('data-number')?Number(el.value):el.value;$('musicVolumeValue').textContent=Math.round(project.musicVolume*100)+'%';dirty();setDimensions();syncMedia();draw();}));
document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==btn.dataset.tab);});
$('playBtn').onclick=play;$('startBtn').onclick=()=>{pause();time=0;selected=0;renderUI();syncMedia(true);};$('previewAudio').onchange=()=>syncMedia();
$('addScene').onclick=addScene;$('copyScene').onclick=()=>{if(project.scenes.length>=100){toast('最多支持100个镜头');return;}const s=clone(scene());s.id='scene-'+crypto.randomUUID().slice(0,8);s.name+=' 副本';project.scenes.splice(selected+1,0,s);dirty();selectScene(selected+1);};
$('deleteScene').onclick=()=>{if(project.scenes.length<=1)return;const removed=scene();const index=selected;project.scenes.splice(selected,1);dirty();selectScene(Math.min(index,project.scenes.length-1));toast(`已删除「${removed.name}」`);};
$('dropZone').onclick=()=>$('mediaFile').click();$('mediaFile').onchange=e=>replaceMedia(e.target.files[0]);
for(const ev of ['dragenter','dragover'])$('dropZone').addEventListener(ev,e=>{e.preventDefault();$('dropZone').classList.add('dragover');});
$('dropZone').ondragleave=()=>$('dropZone').classList.remove('dragover');$('dropZone').ondrop=e=>{e.preventDefault();$('dropZone').classList.remove('dragover');replaceMedia(e.dataTransfer.files[0]);};
$('clearMedia').onclick=()=>{pause();scene().media='';scene().thumbnail='';delete scene().mediaName;scene().mediaType='image';dirty();selectScene(selected);};
$('projectName').oninput=()=>{project.name=$('projectName').value;dirty();};$('saveProject').onclick=saveFile;$('importProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async e=>{if(!e.target.files[0])return;try{let p=validateProject(JSON.parse(await e.target.files[0].text()));await persistCurrent();p=await FilmStorage.unpack(p);await activateProject(p);toast('工程已打开');}catch(err){toast(err.message);}finally{e.target.value='';}};
$('settingsBtn').onclick=()=>{document.querySelectorAll('[data-global]').forEach(el=>el.value=project[el.dataset.global]??'');$('musicName').textContent=project.musicName||'未添加音乐';$('musicVolumeValue').textContent=Math.round(project.musicVolume*100)+'%';$('settingsDialog').showModal();};
$('musicUpload').onclick=()=>$('musicFile').click();$('musicFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{pause();project.music=await uploadFile(file);project.musicName=file.name;project.musicConfigured=true;musicKey=null;$('musicName').textContent=file.name;dirty();if(audioContext)await ensureMusic();toast('配乐已替换');}catch(err){toast(err.message);}finally{e.target.value='';}};
$('defaultMusic').onclick=async()=>{try{pause();project.music=FilmCatalog.defaultMusic.url;project.musicName=FilmCatalog.defaultMusic.name;project.musicConfigured=true;musicKey=null;$('musicName').textContent=project.musicName;dirty();if(audioContext)await ensureMusic();toast('已恢复默认配乐');}catch(err){toast(err.message);}};
$('removeMusic').onclick=()=>{project.music='';project.musicName='';project.musicConfigured=true;if(musicElement)musicElement.pause();musicKey=null;if(audioContext)ensureMusic().catch(e=>toast(e.message));$('musicName').textContent='未添加音乐';dirty();};
$('timeline').onpointerdown=e=>{if(exporting)return;pause();const rect=$('timeline').getBoundingClientRect();time=Math.max(0,Math.min(total()-.001,(e.clientX-rect.left)/rect.width*total()));selected=locate(time).index;renderUI();syncMedia(true);const pos=locate(time);seekActive(time).then(()=>draw()).catch(err=>toast(err.message));};
canvas.onpointerdown=e=>{if(exporting||playing)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;const box=[...hitBoxes].reverse().find(b=>x>=b.x-12&&x<=b.x+b.w+12&&y>=b.y-12&&y<=b.y+b.h+12);if(!box)return;dragText={kind:box.kind,x,y,scaleX:compositionSpec(scene()).sx,scaleY:box.kind==='title'?compositionSpec(scene()).sy:compositionSpec(scene()).descSy,baseX:scene().textX,baseY:box.kind==='title'?scene().textY:scene().descriptionY};canvas.setPointerCapture(e.pointerId);draw();};
canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(dragText){const s=scene();s.textX=Math.round(Math.max(0,Math.min(1800,dragText.baseX+(x-dragText.x)/dragText.scaleX)));s[dragText.kind==='title'?'textY':'descriptionY']=Math.round(Math.max(0,Math.min(1000,dragText.baseY+(y-dragText.y)/dragText.scaleY)));inputValues();draw();}else canvas.style.cursor=hitBoxes.some(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?'move':'default';};
canvas.onpointerup=()=>{if(dragText){dragText=null;dirty();draw();}};
document.addEventListener('keydown',e=>{if(exporting)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveFile();}if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)&&!$('settingsDialog').open&&!$('exportDialog').open&&!$('newDialog').open){e.preventDefault();play();}});

function progress(value,label){$('progressBar').style.width=Math.max(0,Math.min(100,value))+'%';$('progressText').textContent=label;}
$('exportBtn').onclick=()=>{pause();$('exportTitle').textContent='导出成片';$('exportDescription').textContent=`当前 ${project.scenes.length} 个镜头，共 ${total().toFixed(1)} 秒。生成 ${W} × ${H} 视频。`;$('exportProgress').hidden=true;$('startExport').hidden=false;$('startExport').disabled=false;$('cancelExport').hidden=true;$('downloadExport').hidden=true;$('downloadExport').textContent='下载成片';$('exportHint').textContent='合成需要约一遍视频的时长，请保持这个页面在前台。';if(window.FilmStorage&&!preferredMime('mp4').startsWith('video/mp4')){$('exportFormat').value='webm';$('exportFormat').querySelector('[value="mp4"]').disabled=true;$('exportHint').textContent='当前浏览器可导出 WebM。若需要通用 MP4，将成片拖到项目文件夹内「转换为MP4.cmd」。请保持页面在前台。';}$('exportFormat').disabled=false;$('exportMusic').disabled=false;$('closeExport').disabled=false;$('exportDialog').showModal();};
$('closeExport').onclick=()=>{if(!exporting)$('exportDialog').close();};$('exportDialog').addEventListener('cancel',e=>{if(exporting)e.preventDefault();});
$('cancelExport').onclick=()=>{exportCancelled=true;if(recorder&&recorder.state==='recording')recorder.stop();};
function preferredMime(format='webm'){if(!window.MediaRecorder)return '';const list=format==='mp4'?['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4']:['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];for(const mime of list)if(MediaRecorder.isTypeSupported(mime))return mime;return '';}
async function exportFilm(){
 if(exporting)return;const missing=project.scenes.find(s=>FilmLayouts.usesMedia(s)&&!s.media);if(missing){toast(`请为「${missing.name}」添加素材，或改成纯文字布局`);return;}if(!canvas.captureStream||!window.MediaRecorder){toast('当前浏览器不支持视频导出，请使用最新版 Chrome 或 Edge');return;}
 const savedTime=time,savedSelected=selected,mime=preferredMime(window.FilmStorage?$('exportFormat').value:'webm');if(!mime){toast('浏览器没有可用的视频编码器，请使用 Chrome 或 Edge');return;}
 exporting=true;exportCancelled=false;document.body.classList.add('exporting');$('startExport').disabled=true;$('startExport').hidden=true;$('cancelExport').hidden=false;$('exportProgress').hidden=false;$('exportFormat').disabled=true;$('exportMusic').disabled=true;$('closeExport').disabled=true;progress(0,'正在准备素材…');
 let capture,wakeLock,resultBlob;
 try{
  await loadAll();await ensureAudio();if(exportCancelled)throw Error('已取消导出');
  if(navigator.wakeLock)try{wakeLock=await navigator.wakeLock.request('screen');}catch{}
  silence();time=0;selected=0;await seekActive(0);draw(0,false);
  capture=canvas.captureStream(30);for(const track of audioDestination.stream.getAudioTracks())capture.addTrack(track.clone());
  const chunks=[];recorder=new MediaRecorder(capture,{mimeType:mime,videoBitsPerSecond:10000000,audioBitsPerSecond:192000});
  const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=e=>reject(Error(e.error?.message||'录制失败'));});
  const includeMusic=$('exportMusic').checked;let lastIndex=-1;playing=true;recorder.start(500);const begin=performance.now();
  await new Promise(resolve=>{
   const tick=now=>{
    if(exportCancelled){if(recorder.state==='recording')recorder.stop();resolve();return;}
    time=Math.min(total(),(now-begin)/1000);const pos=locate(time);if(lastIndex!==pos.index){lastIndex=pos.index;syncMedia(true,includeMusic);}else syncMedia(false,includeMusic);
    draw(Math.min(total()-.001,time),false);updateTransport();progress(time/total()*85,`正在合成 ${format(time)} / ${format(total())} · 请保持页面打开`);
    if(time>=total()){recorder.stop();resolve();}else requestAnimationFrame(tick);
   };requestAnimationFrame(tick);
  });
  resultBlob=await done;playing=false;silence();if(exportCancelled)throw Error('已取消导出');
  const fileName=(project.name||'自定义宣传片').replace(/[\\/:*?"<>|]/g,'_');
  if($('exportFormat').value==='mp4'&&!window.FilmStorage){
   progress(86,'正在转换为通用 MP4 格式…');$('cancelExport').hidden=true;
   const job=await api('/api/convert?name=edited.webm&duration='+encodeURIComponent(total()),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:resultBlob});
   while(true){await new Promise(r=>setTimeout(r,600));const state=await api('/api/jobs/'+job.job);if(state.status==='error')throw Error(state.error);progress(86+state.progress*.14,'正在编码 MP4… '+Math.round(state.progress)+'%');if(state.status==='done'){$('downloadExport').href=state.url;$('downloadExport').download=fileName+'.mp4';break;}}
  }else{$('downloadExport').href=URL.createObjectURL(resultBlob);$('downloadExport').download=fileName+(mime.startsWith('video/mp4')?'.mp4':'.webm');}
  progress(100,'导出完成');$('downloadExport').hidden=false;$('exportTitle').textContent='你的成片已就绪';$('exportHint').textContent='点击「下载成片」保存视频。工程修改已自动保留，可以继续编辑。';toast('视频已导出');
 }catch(e){progress(0,e.message);$('exportHint').textContent=e.message;$('startExport').hidden=false;toast(e.message);
 if(resultBlob&&resultBlob.size&&!exportCancelled){const url=URL.createObjectURL(resultBlob);$('downloadExport').href=url;$('downloadExport').download=(project.name||'宣传片').replace(/[\\/:*?"<>|]/g,'_')+(mime.startsWith('video/mp4')?'.mp4':'.webm');$('downloadExport').textContent='下载已生成的视频';$('downloadExport').hidden=false;}
 }finally{
  playing=false;silence();if(capture)capture.getTracks().forEach(t=>t.stop());if(wakeLock)await wakeLock.release().catch(()=>{});recorder=null;exporting=false;document.body.classList.remove('exporting');$('cancelExport').hidden=true;$('startExport').disabled=false;$('closeExport').disabled=false;$('exportFormat').disabled=false;$('exportMusic').disabled=false;time=savedTime;selected=savedSelected;renderUI();await seekActive(time).catch(()=>{});draw();
 }
}
$('startExport').onclick=exportFilm;
let newPreset='product';
async function persistCurrent(){clearTimeout(saveTimer);if(!project)return;try{await api('/api/project',{method:'POST',body:JSON.stringify(project)});}catch(e){toast(e.message);}}
async function activateProject(p){
 pause();for(const a of assets.values())if(a.type==='video'){a.element.pause();a.element.removeAttribute('src');if(a.node)a.node.disconnect();if(a.gain)a.gain.disconnect();}assets.clear();
 if(musicElement){musicElement.pause();musicElement.removeAttribute('src');musicElement.load();}musicElement=null;musicKey=null;
 project=validateProject(p);selected=0;time=Math.min(2.7,scene().duration*.5);$('projectName').value=project.name;renderUI();await loadAll();await seekActive(time);renderUI();dirty();
}
$('newProject').onclick=async()=>{pause();$('recentProjects').replaceChildren();const rows=(await FilmStorage.listProjects()).sort((a,b)=>b.updatedAt-a.updatedAt);for(const r of rows){const btn=document.createElement('button');const title=document.createElement('span');title.textContent=r.name;const small=document.createElement('small');small.textContent=r.scenes+' 个镜头';btn.append(title,small);btn.onclick=async()=>{try{await persistCurrent();const p=await FilmStorage.getProject(r.id);if(!p)throw Error('工程不存在');await activateProject(p);$('newDialog').close();toast('项目已打开');}catch(e){toast(e.message);}};$('recentProjects').append(btn);}if(!rows.length)$('recentProjects').textContent='还没有保存的本机项目';$('newDialog').showModal();};
$('closeNew').onclick=()=>$('newDialog').close();
document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{newPreset=btn.dataset.preset;document.querySelectorAll('[data-preset]').forEach(el=>el.classList.toggle('active',el===btn));});
$('createProject').onclick=async()=>{try{await persistCurrent();const p=FilmCatalog.project(newPreset,$('newName').value.trim()||'我的产品宣传片',$('newBrand').value.trim()||'产品名称');await activateProject(p);$('newDialog').close();toast(newPreset==='merge'?'请选择两个镜头，分别添加视频素材':'项目已创建，开始添加素材与文字');}catch(e){toast(e.message);}};
$('batchImport').onclick=()=>$('batchFile').click();
$('batchFile').onchange=async e=>{
 const files=[...e.target.files];if(!files.length)return;pause();$('batchImport').disabled=true;$('mediaLoading').hidden=false;let count=0,errors=0,first=-1;
 for(const file of files){try{if(project.scenes.length>=100)throw Error('最多100个镜头');const type=mediaType(file);if(!type)throw Error('不支持的素材格式');toast(`正在导入 ${count+errors+1} / ${files.length} · ${file.name}`);const url=await uploadFile(file),s=FilmCatalog.shot({name:file.name.replace(/\.[^.]+$/,''),layout:'full',title:'',description:'',kicker:'',mediaOnly:true,media:url,mediaType:type,thumbnail:type==='image'?url:'',mediaName:file.name});const a=await loadScene(s);s.duration=type==='video'?Math.max(1,Math.min(6,a.element.duration)):6;if(type==='video')s.thumbnail=await videoThumbnail(a);if(first<0)first=project.scenes.length;project.scenes.push(s);count++;}catch(err){errors++;toast(file.name+'：'+err.message);}}
 $('mediaLoading').hidden=true;$('batchImport').disabled=false;e.target.value='';if(count){dirty();await selectScene(first);}toast(`已添加 ${count} 个镜头`+(errors?`，${errors} 个文件未导入`:''));
};
window.addEventListener('beforeunload',e=>{if(exporting){e.preventDefault();e.returnValue='';}});
window.addEventListener('studio-storage-warning',e=>toast(e.detail));
(async()=>{
 try{defaults=await api('/api/default');project=validateProject(await api('/api/project'));$('projectName').value=project.name;renderUI();await loadAll();await seekActive(time);renderUI();}
 catch(e){toast('加载失败：'+e.message);if(defaults&&!project){project=clone(defaults);renderUI();}}
 requestAnimationFrame(loop);
})();
