// Public dates only: no private-service requests and no coursework uploads.
import {escape as esc} from './course-connection.js';
export function validateCalendar(value) {
  if(value?.version!==1||value.course!=='39756'||!Array.isArray(value.items)||value.items.length>10000||!Number.isFinite(value.lastSuccess)||value.lastSuccess<=0)throw Error('Invalid class calendar');
  const ids=new Set();
  for(const item of value.items){
    if(!/^canvas-39756-[a-zA-Z0-9_-]+$/.test(item.id)||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>500)throw Error('Invalid calendar item');
    ids.add(item.id);
    const url=new URL(item.url);
    if(url.origin!=='https://foothillcollege.instructure.com'||!/^\/courses\/39756(?:\/assignments\/\d+)?$/.test(url.pathname)||url.search||url.hash||url.username||url.password)throw Error('Invalid course link');
    if(!['instant','date','floating','unknown'].includes(item.dueKind)||typeof item.due!=='string'||(item.due&&!Number.isFinite(Date.parse(item.due)))||typeof item.cancelled!=='boolean'||!Number.isFinite(item.lastSeen))throw Error('Invalid calendar deadline');
  }
  return value;
}
export class PublicCalendar {
  constructor({render}) {
    this.render=render;this.public=true;this.busy=false;this.message='';this.key='bio40c-public-calendar-v1';this.local={enabled:true,pending:[]};
    try{const saved=localStorage.getItem(this.key);if(saved)this.local.canvas=validateCalendar(JSON.parse(saved));}catch{/* A damaged calendar cache can be replaced without touching coursework. */}
    window.addEventListener('online',()=>this.sync());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.sync();});
    this.timer=setInterval(()=>{if(!document.hidden)this.sync();},300000);
  }
  capture() {} // Personal progress continues to use the app's existing local storage.
  async sync() {
    if(this.busy)return;this.busy=true;this.message='Checking class deadlines…';this.render();
    try {
      const response=await fetch(new URL('calendar.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw Error('Calendar unavailable');
      this.local.canvas=validateCalendar(await response.json());
      try{localStorage.setItem(this.key,JSON.stringify(this.local.canvas));}catch{/* Work storage is handled separately. */}
      this.message='Latest published calendar loaded.';
    }catch{
      this.message='Calendar update unavailable. Showing saved dates if available; confirm deadlines in Canvas.';
      if(this.local.canvas)this.local.canvas={...this.local.canvas,error:this.message};
    }finally{this.busy=false;this.render();}
  }
  panel() {
    return `<section class="card connection"><h2>Class deadlines</h2><p>Bio 40C deadlines update from the site owner's Canvas-linked calendar. No account or special network connection is needed.</p><p>These are one section's calendar dates. Confirm your own deadlines in Canvas, including individual extensions and work not on the calendar.</p><button id="course-calendar-refresh" ${this.busy?'disabled':''}>Refresh published dates</button><p role="status">${esc(this.message)}</p><p>Canvas last checked: ${this.local.canvas?.lastSuccess?esc(new Date(this.local.canvas.lastSuccess*1000).toLocaleString()):'Not available yet'}. Scheduled refreshes run about every 30 minutes and can be delayed.</p><h3>Your work stays on this device</h3><p>Your notes, completion marks, study progress and appearance stay in this browser. They are not uploaded or shared with classmates. Use Export backup and Restore backup to move your work between devices. Automatic website progress sync is not enabled.</p></section>`;
  }
  bind(){document.querySelector('#course-calendar-refresh')?.addEventListener('click',()=>this.sync());}
}
