/* Offline storage adapter. No network requests or local service are needed. */
'use strict';
if (window.FILM_OFFLINE) {
 const bootstrap=window.FILM_OFFLINE, cache=new Map(), objectURLs=new Map();
 let db=null,saveQueue=Promise.resolve();
 const ready=new Promise(resolve=>{
  if(!window.indexedDB){resolve();return;}
  const req=indexedDB.open('product-promo-studio',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('data');
  req.onsuccess=()=>{db=req.result;resolve();};
  req.onerror=()=>resolve();req.onblocked=()=>resolve();
 });
 function dataBlob(value){
  const match=/^data:((?:video|image|audio)\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
  if(!match)throw Error('工程包含无法识别的媒体文件');
  const raw=atob(match[2]),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return new Blob([bytes],{type:match[1]});
 }
 async function read(key){
  await ready;if(!db)return undefined;
  return new Promise((resolve,reject)=>{const req=db.transaction('data').objectStore('data').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('无法读取浏览器中的工程'));});
 }
 async function write(key,value){
  await ready;if(!db)throw Error('浏览器未允许自动保存，请点击「保存工程」下载备份');
  return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('本机存储空间不足，请保存工程备份'));tx.onabort=()=>reject(Error('本机存储空间不足，请保存工程备份'));});
 }
 async function blobFor(key){
  if(cache.has(key))return cache.get(key);
  let blob=bootstrap.media[key]?dataBlob(bootstrap.media[key]):await read('asset:'+key);
  if(!blob)throw Error('找不到素材，请重新选择文件或打开含素材的工程备份');
  cache.set(key,blob);return blob;
 }
 async function resolve(key){
  if(!key)return '';if(objectURLs.has(key))return objectURLs.get(key);
  const url=URL.createObjectURL(await blobFor(key));objectURLs.set(key,url);return url;
 }
 function asData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('素材备份失败'));r.readAsDataURL(blob);});}
 function references(p){const refs=new Set();if(p.music)refs.add(p.music);for(const s of p.scenes){if(s.media)refs.add(s.media);if(s.thumbnail)refs.add(s.thumbnail);}return refs;}
 async function pack(p){
  const copy=JSON.parse(JSON.stringify(p));copy._media={};
  for(const key of references(copy))copy._media[key]=await asData(await blobFor(key));
  return copy;
 }
 async function unpack(p){
  if(p._media){
   const entries=Object.entries(p._media);
   for(const [key,value]of entries){if(!/^\/public\/[a-zA-Z0-9_./-]+$/.test(key)||typeof value!=='string')throw Error('工程素材格式错误');dataBlob(value);}
   for(const [key,value]of entries){const blob=dataBlob(value);cache.set(key,blob);if(objectURLs.has(key)){URL.revokeObjectURL(objectURLs.get(key));objectURLs.delete(key);}try{await write('asset:'+key,blob);}catch{}}
   delete p._media;
  }
  return p;
 }
 async function api(path,options={}){
  await ready;
  if(path==='/api/default')return JSON.parse(JSON.stringify(bootstrap.project));
  if(path==='/api/project'&&options.method!=='POST')return await read('project')||JSON.parse(JSON.stringify(bootstrap.project));
  if(path==='/api/project'){
   const p=JSON.parse(options.body);
   const save=async()=>{const list=await read('catalog')||[];const row={id:p.id,name:p.name,updatedAt:Date.now(),scenes:p.scenes.length};const index=list.findIndex(x=>x.id===p.id);if(index<0)list.push(row);else list[index]=row;await write('project:'+p.id,p);await write('catalog',list);await write('project',p);return {ok:true};};
   const result=saveQueue.then(save);saveQueue=result.catch(()=>{});return result;
  }
  if(path.startsWith('/api/upload')){
   let blob=options.body;if(!(blob instanceof Blob)||!blob.size)throw Error('文件为空');
   const params=new URLSearchParams(path.split('?')[1]),name=params.get('name')||'media';
   const ext=(name.match(/\.([a-zA-Z0-9]{1,8})$/)||[])[1]||'bin';
   if(!/^(video|image|audio)\//.test(blob.type)){
    const types={mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4',mkv:'video/x-matroska',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',flac:'audio/flac'};
    const type=types[ext.toLowerCase()];if(!type)throw Error('请选择常见的视频、图片或音频文件');blob=new Blob([blob],{type});
   }
   const key='/public/custom/'+crypto.randomUUID()+'.'+ext;cache.set(key,blob);
   try{await write('asset:'+key,blob);}catch(e){window.FilmStorage.volatile=true;setTimeout(()=>window.dispatchEvent(new CustomEvent('studio-storage-warning',{detail:e.message})),0);}
   return {ok:true,url:key,name};
  }
  throw Error('离线版不使用服务器转换，请导出浏览器支持的视频格式');
 }
 window.FilmStorage={api,resolve,pack,unpack,ready,listProjects:async()=>await read('catalog')||[],getProject:id=>read('project:'+id)};
}
