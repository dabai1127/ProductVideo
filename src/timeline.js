'use strict';
// Outgoing transitions overlap two clips. All preview/export paths use this timeline.
window.FilmTimeline={
 overlap(s,next){if(!next||!['fade','black'].includes(s.transition))return 0;return Math.max(0,Math.min(Number(s.transitionDuration)||.4,Number(s.duration)/2,Number(next.duration)/2,2));},
 starts(scenes){let start=0;return scenes.map((s,i)=>{const at=start;start+=Number(s.duration)-this.overlap(s,scenes[i+1]);return at;});},
 total(scenes){const a=this.starts(scenes);return a[a.length-1]+Number(scenes.at(-1).duration);},
 locate(scenes,t){const a=this.starts(scenes);let i=0;while(i+1<a.length&&t>=a[i+1])i++;return {index:i,local:Math.max(0,Math.min(Number(scenes[i].duration),t-a[i])),start:a[i]};},
 frames(scenes,t){const p=this.locate(scenes,t),s=scenes[p.index];if(p.index>0){const prev=scenes[p.index-1],d=this.overlap(prev,s);if(d&&p.local<d){const progress=p.local/d;return [{index:p.index-1,local:Number(prev.duration)-d+p.local,weight:1-progress,transition:prev.transition},{index:p.index,local:p.local,weight:progress,transition:prev.transition}];}}return [{index:p.index,local:p.local,weight:1,transition:'cut'}];}
};
