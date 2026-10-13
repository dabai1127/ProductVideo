'use strict';
// Rectangles use fractions of the canvas, so each layout adapts to all three ratios.
window.FilmLayouts={
 items:{
  hero:{label:'产品登场 · 居中主体',note:'产品居中大幅展示，下方排列标题与说明。',fit:'contain'},
  split:{label:'左侧文字 · 右侧素材',note:'图文分区，适合介绍功能与使用场景。',fit:'contain'},
  right:{label:'左侧素材 · 右侧文字',note:'反向图文分区；竖屏自动调整为上素材、下文字。',fit:'contain'},
  top:{label:'上方文字 · 下方素材',note:'标题与说明置于上方，素材横向铺开。',fit:'contain'},
  bottom:{label:'上方素材 · 下方文字',note:'先展示实拍画面，下方补充产品信息。',fit:'contain'},
  full:{label:'全屏素材 · 左侧叠字',note:'素材覆盖画布，左侧渐变衬底让文字清晰可读。',fit:'cover'},
  banner:{label:'全屏素材 · 底部字幕',note:'全屏画面搭配底部文字，适合操作演示。',fit:'cover'},
  focus:{label:'全屏素材 · 居中标题',note:'文字居中叠在画面上，适合开场与重点卖点。',fit:'cover'},
  card:{label:'大幅素材 · 悬浮信息卡',note:'大幅画面叠加独立信息卡，适合重点功能说明。',fit:'cover'},
  cinema:{label:'电影宽幕 · 下方说明',note:'宽幅素材配留白与下方说明，强调画面表现。',fit:'cover'},
  text:{label:'纯文字 · 居中排版',note:'隐藏素材，以标题、说明与标签传递信息。',fit:'contain'},
  outro:{label:'品牌收尾 · 产品与行动引导',note:'产品与品牌文案分区，突出联系信息与行动引导。',fit:'contain'}
 },
 has(id){return Object.hasOwn(this.items,id);},
 usesMedia(scene){return !!scene.mediaOnly||scene.layout!=='text';},
 reset(scene){scene.textX=110;scene.textY=330;scene.descriptionY=645;},
 apply(scene,id){if(!this.has(id))return;scene.layout=id;scene.mediaOnly=false;scene.fit=this.items[id].fit;this.reset(scene);},
 geometry(id,aspect){
  const portrait=aspect==='portrait',square=aspect==='square';
  let media=null,area=[.057,.235,.43,.62],align='left',shade='',panel=null,frame=true,fontScale=1;
  switch(id){
   case 'hero':media=portrait?[.09,.19,.82,.43]:square?[.12,.18,.76,.40]:[.08,.19,.84,.43];area=portrait?[.09,.67,.82,.25]:square?[.10,.635,.80,.285]:[.15,.66,.70,.275];align='center';fontScale=.9;break;
   case 'split':media=portrait?[.06,.51,.88,.40]:[.55,.19,.393,.70];area=portrait?[.06,.15,.88,.29]:[.057,.235,.43,.62];break;
   case 'right':media=portrait?[.06,.155,.88,.40]:[.057,.19,.43,.70];area=portrait?[.06,.615,.88,.29]:[.55,.235,.393,.62];break;
   case 'top':media=portrait?[.06,.455,.88,.455]:square?[.057,.52,.886,.37]:[.057,.53,.886,.36];area=portrait?[.06,.145,.88,.25]:[.057,.20,.886,.285];fontScale=.9;break;
   case 'bottom':media=portrait?[.06,.14,.88,.455]:[.057,.19,.886,.38];area=portrait?[.06,.655,.88,.27]:[.057,.62,.886,.30];fontScale=.9;break;
   case 'full':media=[0,0,1,1];area=portrait?[.07,.29,.86,.40]:[.057,.26,.52,.60];shade='left';frame=false;break;
   case 'banner':media=[0,0,1,1];area=portrait?[.075,.70,.85,.215]:[.067,.625,.866,.29];shade='bottom';frame=false;fontScale=.9;break;
   case 'focus':media=[0,0,1,1];area=portrait?[.105,.36,.79,.37]:[.14,.32,.72,.43];shade='center';frame=false;align='center';break;
   case 'card':media=portrait?[.055,.15,.89,.63]:square?[.07,.20,.86,.60]:[.10,.19,.80,.60];area=portrait?[.10,.62,.80,.285]:square?[.13,.58,.74,.30]:[.58,.54,.32,.34];panel=portrait?[.06,.575,.88,.36]:square?[.085,.535,.83,.38]:[.55,.49,.38,.43];fontScale=.76;break;
   case 'cinema':media=portrait?[0,.20,1,.45]:[0,.21,1,.46];area=portrait?[.075,.735,.85,.18]:[.06,.705,.88,.225];fontScale=.85;frame=false;break;
   case 'text':area=portrait?[.105,.265,.79,.54]:[.14,.26,.72,.62];align='center';break;
   case 'outro':media=portrait?[.12,.17,.76,.34]:square?[.21,.18,.58,.33]:[.07,.22,.40,.60];area=portrait?[.09,.60,.82,.30]:square?[.12,.60,.76,.29]:[.54,.24,.40,.60];align=portrait||square?'center':'left';break;
  }
  const columns=!portrait&&['hero','top','bottom','banner','cinema'].includes(id);
  return {media,area,align,shade,panel,frame,fontScale,columns};
 }
};
