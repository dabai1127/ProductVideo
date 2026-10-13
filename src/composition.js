'use strict';
function wrapped(str,size,width,weight=400){
 ctx.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;const result=[];
 for(const line of str.split('\n')){let current='';for(const char of line){if(current&&ctx.measureText(current+char).width>width){result.push(current);current=char;}else current+=char;}result.push(current);}
 return result;
}
function fitted(str,desired,width,height,weight=400,leading=1.22){
 if(!str)return {lines:[],size:desired,height:0,leading};
 let size=Math.max(8,desired),lines=wrapped(str,size,width,weight);
 if(lines.length*size*leading>height){let low=8,high=Math.floor(size);while(high-low>1){const mid=Math.floor((low+high)/2),candidate=wrapped(str,mid,width,weight);if(candidate.length*mid*leading<=height)low=mid;else high=mid;}size=low;lines=wrapped(str,size,width,weight);}
 const limit=Math.max(1,Math.floor(height/(size*leading)));
 if(lines.length>limit){lines=lines.slice(0,limit);let last=lines.at(-1);while(last&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[lines.length-1]=last+'…';}
 return {lines,size,height:lines.length*size*leading,leading};
}
function compositionSpec(s){
 const rule=FilmLayouts.geometry(s.layout,project.aspect),sx=W/1920,sy=H/1080,base=project.aspect==='portrait'?.85:sx;
 const rect=a=>a?{x:a[0]*W,y:a[1]*H,w:a[2]*W,h:a[3]*H}:null,area=rect(rule.area),margin=W*.057;
 const gap=Math.min(24*base,area.h*.035),kickerHeight=s.kicker?Math.min(56*base,area.h*.14):0,tagHeight=s.tags?Math.min(65*base,area.h*.14):0,ctaHeight=s.cta?Math.min(82*base,area.h*.17):0;
 const contentHeight=Math.max(40,area.h-kickerHeight-tagHeight-ctaHeight-gap*3);
 const x=Math.max(0,Math.min(W-30,area.x+(Number(s.textX)-110)*sx)),maxTextWidth=Math.max(30,Math.min(area.w,W-margin-x));
 const columns=rule.columns&&!!s.title&&!!s.description,columnGap=36*base,titleWidth=columns?(maxTextWidth-columnGap)*.51:maxTextWidth,descWidth=columns?maxTextWidth-titleWidth-columnGap:maxTextWidth;
 const title=fitted(s.title,s.titleSize*base*rule.fontScale,titleWidth,columns||!s.description?contentHeight:contentHeight*.62,700);
 const description=fitted(s.description,s.descriptionSize*base*rule.fontScale,descWidth,columns?contentHeight:Math.max(20,contentHeight-title.height-gap),400,1.4);
 const titleBase=area.y+kickerHeight,descBase=columns?titleBase+(title.height-description.height)/2:titleBase+title.height+gap;
 return {...rule,area,box:rect(rule.media),panel:rect(rule.panel),sx,sy,descSy:sy,margin,base,x,
  y:titleBase+(Number(s.textY)-330)*sy,descY:descBase+(Number(s.descriptionY)-645)*sy,
  title,description,titleSize:title.size,descSize:description.size,maxTextWidth,kickerY:area.y,titleWidth,descWidth,descX:columns?x+titleWidth+columnGap:x,
  kickerSize:Math.min(40*base,kickerHeight*.65),tagsY:(columns?titleBase+Math.max(title.height,description.height):descBase+description.height)+gap,
  tagSize:Math.min(38*base,tagHeight*.57),ctaY:area.y+area.h-ctaHeight,ctaSize:Math.min(58*base,ctaHeight*.6)};
}
function alignedTextX(spec,str,size,weight=400){
 if(spec.align!=='center')return spec.x;
 ctx.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;
 return spec.x+(spec.maxTextWidth-ctx.measureText(str).width)/2;
}
function drawScene(index,local,selection=true){
 const s=project.scenes[index],f=local*30,ink=project.background,green=project.accent,white=project.textColor,muted=project.mutedColor,p=ramp(f,0,21),element=media(s),spec=compositionSpec(s);
 ctx.fillStyle=ink;ctx.fillRect(0,0,W,H);hitBoxes=[];
 if(s.mediaOnly){imageDraw(element,s,0,0,W,H,false,1);if(!element&&!exporting)text('添加视频或图片',spec.margin,H/2,50*spec.base,muted);return;}
 const bg=ctx.createRadialGradient(W*.65,H*.45,0,W*.65,H*.45,Math.max(W,H)*.75);bg.addColorStop(0,green+'20');bg.addColorStop(1,ink+'00');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(s.layout==='hero'){ctx.fillStyle=green+'0b';rounded(W*.16,H*.18,W*.68,H*.48,Math.min(W,H)*.06);ctx.fill();}
 const b=spec.box;
 if(b){
  if(element)imageDraw(element,s,b.x,b.y,b.w,b.h,false,p,spec.frame?20*spec.base:0);
  else if(!exporting){ctx.fillStyle=green+'0c';rounded(b.x,b.y,b.w,b.h,spec.frame?20:0);ctx.fill();ctx.save();ctx.setLineDash([9,9]);ctx.strokeStyle=green+'55';ctx.stroke();ctx.restore();text('添加视频或图片',b.x+b.w*.07,b.y+b.h*.48,Math.min(40*spec.base,b.w/9),muted);}
  if(spec.frame){ctx.strokeStyle=green+'44';ctx.lineWidth=2;rounded(b.x,b.y,b.w,b.h,20*spec.base);ctx.stroke();}
 }
 if(spec.shade){
  let shade;
  if(spec.shade==='left'){shade=ctx.createLinearGradient(0,0,W,0);shade.addColorStop(0,'#000000e0');shade.addColorStop(.55,'#00000080');shade.addColorStop(1,'#00000015');}
  else if(spec.shade==='bottom'){shade=ctx.createLinearGradient(0,H*.35,0,H);shade.addColorStop(0,'#00000000');shade.addColorStop(.58,'#000000a0');shade.addColorStop(1,'#000000ef');}
  else{shade=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.65);shade.addColorStop(0,'#000000b0');shade.addColorStop(1,'#00000065');}
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const headerShade=ctx.createLinearGradient(0,0,0,H*.18);headerShade.addColorStop(0,'#000000a0');headerShade.addColorStop(1,'#00000000');ctx.fillStyle=headerShade;ctx.fillRect(0,0,W,H*.18);
 }
 if(spec.panel){const c=spec.panel;ctx.fillStyle=ink+'f2';rounded(c.x,c.y,c.w,c.h,20*spec.base);ctx.fill();ctx.strokeStyle=green+'66';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=green;ctx.fillRect(c.x,c.y+c.h*.12,5*spec.base,c.h*.32);}
 const headerY=project.aspect==='portrait'?H*.085:H*.145,m=spec.margin,brandSize=36*spec.base,cornerSize=29*spec.base;
 if(!spec.shade){ctx.strokeStyle=green+'2c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m,headerY);ctx.lineTo(W-m,headerY);ctx.stroke();}
 const brand=fitted(project.brand,brandSize,W*.51,brandSize*1.3,600).lines[0]||'',corner=fitted(project.corner,cornerSize,W*.31,cornerSize*1.3).lines[0]||'';
 text(brand,m,headerY*.5,brandSize,white,600);ctx.font=`${cornerSize}px "Microsoft YaHei",sans-serif`;text(corner,W-m-ctx.measureText(corner).width,headerY*.53,cornerSize,muted);
 const kicker=fitted(s.kicker,spec.kickerSize,spec.maxTextWidth,Math.max(12,spec.kickerSize*1.3)).lines[0]||'';
 text(kicker,alignedTextX(spec,kicker,spec.kickerSize),spec.kickerY+(1-p)*12*spec.base,spec.kickerSize,green,400,p);
 function drawBlock(block,kind,y,color,weight,start){
  const blockSpec={...spec,x:kind==='title'?spec.x:spec.descX,maxTextWidth:kind==='title'?spec.titleWidth:spec.descWidth};
  let left=Infinity,right=-Infinity;
  block.lines.forEach((line,i)=>{const x=alignedTextX(blockSpec,line,block.size,weight),q=ramp(f,start+i*5,start+18+i*5);text(line,x,y+i*block.size*block.leading+(1-q)*15*spec.base,block.size,kind==='title'&&i>0?green:color,weight,q);ctx.font=`${weight} ${block.size}px "Microsoft YaHei",sans-serif`;left=Math.min(left,x);right=Math.max(right,x+ctx.measureText(line).width);});
  if(block.lines.length)hitBoxes.push({kind,x:left,y,w:Math.max(20,right-left),h:block.height});
 }
 drawBlock(spec.title,'title',spec.y,white,700,9);drawBlock(spec.description,'description',spec.descY,muted,400,33);
 const tags=s.tags.split('/').map(x=>x.trim()).filter(Boolean).slice(0,8);let tagSize=spec.tagSize;
 const tagWidth=tag=>{ctx.font=`${tagSize}px "Microsoft YaHei",sans-serif`;return ctx.measureText(tag).width+22*spec.base;};
 let widths=tags.map(tagWidth),sum=widths.reduce((a,b)=>a+b,0)+Math.max(0,tags.length-1)*10*spec.base;
 while(sum>spec.maxTextWidth&&tagSize>8){tagSize--;widths=tags.map(tagWidth);sum=widths.reduce((a,b)=>a+b,0)+Math.max(0,tags.length-1)*10*spec.base;}
 let tagX=spec.x+(spec.align==='center'?Math.max(0,(spec.maxTextWidth-sum)/2):0);
 tags.forEach((tag,i)=>{const tw=Math.min(widths[i],spec.x+spec.maxTextWidth-tagX);if(tw<25*spec.base)return;ctx.save();ctx.globalAlpha=ramp(f,48,69);ctx.fillStyle=green+'18';ctx.strokeStyle=green+'44';rounded(tagX,spec.tagsY,tw,tagSize*1.7,6*spec.base);ctx.fill();ctx.stroke();const display=fitted(tag,tagSize,tw-18*spec.base,tagSize*1.3).lines[0]||'';text(display,tagX+9*spec.base,spec.tagsY+tagSize*.25,tagSize,green);ctx.restore();tagX+=tw+10*spec.base;});
 if(s.cta){const cta=fitted(s.cta,spec.ctaSize,spec.maxTextWidth,Math.max(15,spec.ctaSize*1.3)).lines[0]||'',x=alignedTextX(spec,cta,spec.ctaSize,s.layout==='outro'?600:400);if(s.layout==='outro'){ctx.font=`600 ${spec.ctaSize}px "Microsoft YaHei",sans-serif`;const width=ctx.measureText(cta).width;ctx.fillStyle=green;rounded(x-12*spec.base,spec.ctaY-9*spec.base,width+24*spec.base,spec.ctaSize*1.55,8*spec.base);ctx.fill();}text(cta,x,spec.ctaY,spec.ctaSize,s.layout==='outro'?ink:white,s.layout==='outro'?600:400,ramp(f,45,66));}
 text(`${String(index+1).padStart(2,'0')} / ${String(project.scenes.length).padStart(2,'0')}`,m,H-50*spec.base,25*spec.base,muted);
 for(let n=0;n<Math.min(project.scenes.length,20);n++){ctx.fillStyle=n===index?green:green+'30';ctx.fillRect(m+145*spec.base+n*28*spec.base,H-37*spec.base,18*spec.base,4*spec.base);}
 if(selection&&dragText){const box=hitBoxes.find(b=>b.kind===dragText.kind);if(box){ctx.save();ctx.strokeStyle='#d7e8b8';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.strokeRect(box.x-8,box.y-8,box.w+16,box.h+16);ctx.restore();}}
}
