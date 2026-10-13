'use strict';
window.FilmCatalog={
 defaultMusic:{url:'/public/audio/default-music.mp3',name:'默认配乐 · House Vibez',volume:.65},
 shot(options={}){return {id:'scene-'+crypto.randomUUID(),name:'产品亮点',layout:'split',duration:6,title:'填写产品亮点\n展示真实价值',description:'添加功能说明与使用场景',kicker:'产品亮点',tags:'',cta:'',media:'',mediaType:'image',thumbnail:'',trim:0,rate:1,loop:false,zoom:1,panX:0,panY:0,rotation:0,fit:'contain',titleSize:108,descriptionSize:58,textX:110,textY:330,descriptionY:645,volume:0,transition:'fade',transitionDuration:.4,mediaOnly:false,...options};},
 project(preset='product',name='我的产品宣传片',brand='产品名称'){
  let scenes;
  if(preset==='blank')scenes=[this.shot({name:'开始创作',layout:'text',title:brand||'你的产品\n值得被看见',description:'添加镜头，导入素材，讲述产品价值。',kicker:'PRODUCT STORY',duration:6,transition:'cut'})];
  else if(preset==='merge')scenes=[this.shot({name:'视频片段 01',layout:'full',title:'',description:'',kicker:'',duration:3.5,mediaOnly:true,volume:1,transition:'fade'}),this.shot({name:'视频片段 02',layout:'full',title:'',description:'',kicker:'',duration:3.5,mediaOnly:true,volume:1,transition:'cut'})];
  else scenes=[this.shot({name:'产品开场',layout:'text',title:brand+'\n让价值被看见',description:'一句话介绍你的产品与目标用户',kicker:'PRODUCT STORY',duration:5,titleSize:120}),this.shot({name:'核心亮点',title:'核心功能\n展示产品价值',description:'用实拍画面与具体功能\n说明产品能解决什么问题。',kicker:'01 / 产品亮点'}),this.shot({name:'使用场景',title:'真实场景\n看见使用体验',description:'展示产品如何使用\n让观众直观了解操作过程。',kicker:'02 / 场景演示'}),this.shot({name:'更多功能',title:'更多功能\n按需灵活应用',description:'补充关键卖点\n突出与你的用户相关的价值。',kicker:'03 / 更多功能'}),this.shot({name:'品牌收尾',layout:'text',title:brand,description:'填写产品定位与联系信息',kicker:'了解更多',cta:'了解产品 · 洽谈合作',duration:5,transition:'cut'})];
  return {version:1,id:'project-'+crypto.randomUUID(),name,aspect:'landscape',brand:preset==='merge'?'':brand,corner:preset==='merge'?'':'产品展示 · 功能演示',background:'#101411',accent:'#b5c98b',textColor:'#f0f3e9',mutedColor:'#bac4b5',music:this.defaultMusic.url,musicName:this.defaultMusic.name,musicVolume:this.defaultMusic.volume,musicConfigured:true,scenes};
 }
};
