// Private, opt-in course synchronization. No requests before connection is enabled.
export const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function flatten(state) {
  const result={};
  function visit(value,path) {
    if(value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length) {
      for(const [key,row] of Object.entries(value)) {if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid state key');visit(row,[...path,key]);}
    } else result[JSON.stringify(path)]=value;
  }
  for(const [key,value] of Object.entries(state)) {
    if(['assignments','attempts'].includes(key)) {for(const row of value)visit(row,[key,row.id]);}
    else visit(value,[key]);
  }
  return result;
}
export function inflate(fields,template) {
  const state={};
  // Parents precede children so an old empty object cannot erase new descendants.
  for(const [path,value] of Object.entries(fields).sort(([a],[b])=>JSON.parse(a).length-JSON.parse(b).length)) {
    if(value?.$deleted===true)continue;
    const parts=JSON.parse(path);let target=state;
    if(parts.some(p=>['__proto__','constructor','prototype'].includes(p)))throw Error('Invalid sync path');
    parts.forEach((key,i)=>{if(i===parts.length-1)target[key]=structuredClone(value);else target=target[key]??={};});
  }
  for(const key of ['assignments','attempts'])state[key]=Object.values(state[key]??{});
  return {...template,...state};
}
export function endpoint(value) {
  const url=new URL(value);
  if(url.protocol!=='https:' || !url.hostname.endsWith('.ts.net') || url.port!=='8795' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw Error('Use your private Tailscale HTTPS service address on port 8795.');
  return url.origin;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export class CourseConnection {
  constructor({get,set,render,native=false}) {
    Object.assign(this,{get,set,render,native});this.busy=false;this.message='';
    this.key='bio40c-connection-v1';
    try{this.local=JSON.parse(localStorage.getItem(this.key)??'null')??{};}catch{this.local={};this.message='Connection storage could not be read. Export a course backup before reconnecting.';}
    this.local.pending??=[];this.local.fields??={};this.local.revisions??={};
    this.last=flatten(get());
    if(native && this.local.enabled===undefined)this.local.enabled=true;
    const privateAddress=window.companionService??(location.protocol==='https:'&&location.hostname.endsWith('.ts.net')?'https://'+location.hostname+':8795':null);
    if(!native&&privateAddress&&this.local.enabled===undefined){this.local.url=endpoint(privateAddress);this.local.enabled=true;}
    if(window.companionTesting)this.local.enabled=false;
    window.addEventListener('online',()=>this.sync());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.sync();});
    this.timer=setInterval(()=>{if(!document.hidden)this.sync();},300000);
  }
  persist(){try{localStorage.setItem(this.key,JSON.stringify(this.local));}catch{this.message='Connection changes could not be saved. Export a course backup before closing.';this.local.enabled=false;}}
  capture() {
    const current=flatten(this.get());
    if(this.local.enabled)for(const path of new Set([...Object.keys(this.last),...Object.keys(current)])) {
      if(!same(current[path],this.last[path])) {
        const prior=this.local.pending.find(o=>o.path===path);
        this.local.pending=this.local.pending.filter(o=>o.path!==path);
        this.local.pending.push({id:crypto.randomUUID(),path,value:path in current?current[path]:{$deleted:true},base:prior?.base??this.local.revisions[path]??0});
      }
    }
    this.last=current;this.persist();
  }
  async request(body) {
    if(this.native)return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID();const timer=setTimeout(()=>{delete window.bio40RPC[id];reject(Error('Connection timed out'));},45000);
      window.bio40RPC??={};window.bio40RPC[id]=result=>{clearTimeout(timer);delete window.bio40RPC[id];result.error?reject(Error(result.error)):resolve(result);};
      window.webkit.messageHandlers.companion.postMessage({action:'connected',requestID:id,body});
    });
    const response=await fetch(endpoint(this.local.url)+'/v1/course/connected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw Error('Private service unavailable. Check Tailscale and your connection address.');
    return response.json();
  }
  async connect(url) {
    if(!this.native)this.local.url=endpoint(url);
    this.local.enabled=true;this.persist();await this.sync(true);
  }
  async sync(first=false) {
    if(!this.local.enabled||this.busy)return;
    first=first||!this.local.paired;
    this.capture();this.busy=true;this.message='Syncing course…';this.render();
    try {
      // First fetch remote state before proposing local values. Existing remote fields win
      // on initial pairing; local-only fields are imported and the old state is backed up.
      if(first){
        localStorage.setItem('bio40c-before-connection',JSON.stringify(this.get()));
        const initial=await this.request({operations:[]});
        this.local.fields=Object.fromEntries(initial.fields.map(f=>[f.path,f.value]));
        this.local.revisions=Object.fromEntries(initial.fields.map(f=>[f.path,f.revision]));
        this.local.pending=[];
        for(const [path,value] of Object.entries(flatten(this.get())))if(!(path in this.local.fields))this.local.pending.push({id:crypto.randomUUID(),path,value,base:0});
      }
      const sent=structuredClone(this.local.pending);
      const result=await this.request({operations:sent});
      this.capture(); // Include edits made while the request was in flight.
      const accepted=new Set(result.accepted);
      this.local.pending=this.local.pending.filter(op=>!accepted.has(op.id));
      this.local.fields=Object.fromEntries(result.fields.map(f=>[f.path,f.value]));
      this.local.revisions=Object.fromEntries(result.fields.map(f=>[f.path,f.revision]));
      const sentByPath=new Map(sent.map(o=>[o.path,o]));
      for(const op of this.local.pending)if(accepted.has(sentByPath.get(op.path)?.id))op.base=this.local.revisions[op.path]??0;
      this.local.paired=true;
      this.local.conflicts=result.conflicts;this.local.canvas=result.canvas;this.local.synced=Date.now();
      const merged={...this.local.fields};for(const op of this.local.pending)merged[op.path]=op.value;
      const state=inflate(merged,this.get());this.set(state);this.last=flatten(state);
      this.message=result.conflicts.length?'Some fields changed on another device. Your edits are kept here; choose how to resolve them.':'Course synchronized.';
      this.persist();
    }catch(error){this.message='Sync paused: '+error.message+' Your saved work remains on this device.';}
    finally{this.busy=false;this.render();}
  }
  panel() {
    const c=this.local.canvas;const conflicts=this.local.conflicts??[];
    return `<section class="card connection"><h2>Connected course</h2><p>Connect your private service to share coursework, lecture notes, review progress and theme across your devices. Your public-site work stays local until you connect. Keep Tailscale connected and allow local-network access if your browser asks.</p>${!this.native?`<label>Private service address<input id="course-service" type="url" placeholder="https://your-mac.your-tailnet.ts.net:8795" value="${escape(this.local.url??'')}"></label>`:''}<button id="course-connect" ${this.busy?'disabled':''}>${this.local.enabled?'Sync now':'Connect & sync'}</button>${this.local.enabled?'<button id="course-disconnect" class="quiet">Disconnect this device</button>':''}<p role="status">${escape(this.message||'Not connected. Progress is saved on this device.')}</p><p>${this.local.synced?'Last course sync: '+escape(new Date(this.local.synced).toLocaleString()):'Not synchronized yet'} · ${this.local.pending.length} local changes pending</p>${c?`<p>${escape(c.coverage)}</p>`:''}${conflicts.length?`<p>${conflicts.length} conflicting fields. Your current values remain visible.</p><button id="keep-local">Use my edits</button><button id="use-remote">Use other device’s edits</button>`:''}<p>Initial connection keeps existing shared values where both devices have work. A copy of this device’s pre-connection state is retained.</p><button id="connection-backup">Download pre-connection backup</button></section>`;
  }
  bind(){
    const click=(id,fn)=>{const el=document.getElementById(id);if(el)el.onclick=fn;};
    click('course-connect',async()=>{try{if(!this.local.enabled)await this.connect(document.querySelector('#course-service')?.value);else await this.sync();}catch(e){this.message=e.message;this.render();}});
    click('course-disconnect',()=>{this.capture();this.local.enabled=false;this.persist();this.message='Disconnected. Local course data retained.';this.render();});
    click('keep-local',()=>{for(const conflict of this.local.conflicts??[]){const op=this.local.pending.find(o=>o.id===conflict.id);if(op){op.base=conflict.revision;op.id=crypto.randomUUID();}}this.local.conflicts=[];this.persist();this.sync();});
    click('use-remote',()=>{const ids=new Set((this.local.conflicts??[]).map(c=>c.id));this.local.pending=this.local.pending.filter(o=>!ids.has(o.id));this.local.conflicts=[];this.persist();this.sync();});
    click('connection-backup',()=>{const data=localStorage.getItem('bio40c-before-connection');if(!data){this.message='No pre-connection backup yet.';this.render();return;}const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='bio40c-before-connection.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  }
}
