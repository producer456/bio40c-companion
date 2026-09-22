import {escape as esc} from './course-connection.js';
import {sourceLink} from './source-files.js';
export function validateHub(state) {
  if(state.learningTheme!==undefined&&typeof state.learningTheme!=='boolean')throw Error('Invalid Learning theme.');
  if(state.learningHub===undefined)return;
  const h=state.learningHub;
  if(!h||typeof h!=='object'||Array.isArray(h))throw Error('Invalid learning progress.');
  for(const key of ['work','reviews','questions','drafts','reviewEvents'])if(h[key]!==undefined&&(!h[key]||typeof h[key]!=='object'||Array.isArray(h[key])||Object.keys(h[key]).length>10000))throw Error('Invalid learning records.');
  for(const row of Object.values(h.work??{}))if(!row||!['todo','doing','done'].includes(row.status)||typeof row.note!=='string'||row.note.length>2000)throw Error('Invalid coursework progress.');
  for(const row of Object.values(h.reviews??{}))if(!row||!['again','good'].includes(row.verdict)||!Number.isFinite(row.at)||!Number.isFinite(row.next)||!Number.isInteger(row.level)||row.level<0||row.level>8)throw Error('Invalid review history.');
  for(const draft of Object.values(h.drafts??{}))if(typeof draft!=='string'||draft.length>2000)throw Error('Invalid recall draft.');
  for(const row of Object.values(h.questions??{}))if(!row||typeof row.question!=='string'||row.question.length>2000||typeof row.answer!=='string'||row.answer.length>2000||typeof row.resolved!=='boolean')throw Error('Invalid instructor question.');
}
export function dueLabel(item){
  if(!item.due)return 'Deadline not supplied';
  if(item.dueKind==='date')return item.due+' · time not supplied';
  if(item.dueKind==='floating')return item.due.replace('T',' ')+' · timezone unconfirmed';
  return new Date(item.due).toLocaleString(undefined,{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'})+' Pacific';
}
export function overdue(item,now=Date.now()) {
  if(item.dueKind==='instant')return Date.parse(item.due)<now;
  if(item.dueKind==='date')return item.due<new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return false;
}
export function timeline(state,connection,full=false) {
  const canvas=connection?.local.canvas;
  const work=state.learningHub?.work??{};
  const items=[...(canvas?.items??[])].sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  const done=items.filter(i=>work[i.id]?.status==='done');
  const active=items.filter(i=>!i.cancelled&&work[i.id]?.status!=='done');
  const old=active.filter(i=>overdue(i));
  const stale=!canvas?.lastSuccess||Date.now()/1000-canvas.lastSuccess>1800||canvas.error;
  const filter=state.learningHub?.timelineView??'upcoming';
  const filtered=filter==='completed'?done:filter==='all'?items:active.filter(i=>!i.due||i.dueKind==='floating'||Date.parse(i.due)<=Date.now()+14*86400000);
  const shown=full?filtered:[...old,...active.filter(i=>!overdue(i))].slice(0,5);
  return `<section class="card course-timeline"><h2>Your class timeline</h2>${full?`<label>Show deliverables<select id="timeline-filter"><option value="upcoming" ${filter==='upcoming'?'selected':''}>Overdue & next two weeks</option><option value="completed" ${filter==='completed'?'selected':''}>Completed work</option><option value="all" ${filter==='all'?'selected':''}>Full available calendar</option></select></label>`:''}<p><strong>${active.length} open · ${old.length} overdue · ${done.length} marked done</strong></p><p role="status">${connection?.local.enabled?'Connected course':'This device is not connected'} · ${canvas?.lastSuccess?'Canvas checked '+esc(new Date(canvas.lastSuccess*1000).toLocaleString()):'Canvas has not been checked'}${stale?' · Refresh needed':''}</p>${canvas?.docketError?`<p class="notice">${esc(canvas.docketError)}</p>`:''}${canvas?.error?`<p class="notice">${esc(canvas.error)}</p>`:''}<p>${esc(canvas?.coverage??'Connect in Settings & backup to see your Canvas deliverables on this device.')}</p>${shown.map(item=>{const row=work[item.id]??{status:'todo',note:''};return `<article class="deliverable"><h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3><p>${esc(dueLabel(item))} · ${item.cancelled?'Cancelled in Canvas':row.status==='done'?'Marked done by you':overdue(item)?'Overdue':row.status==='doing'?'In progress':'To do'}</p><p class="muted">Canvas calendar${item.docketID?` · Linked Docket task ${item.docketID}`:''} · Submission not verified${canvas.lastSuccess&&item.lastSeen<canvas.lastSuccess?' · Not present in latest feed; retained for tracking':''}</p>${!item.cancelled?`<label>Progress<select data-work-status="${esc(item.id)}">${[['todo','Not started'],['doing','In progress'],['done','Marked done']].map(([v,l])=>`<option value="${v}" ${row.status===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Next action / planned work<textarea data-work-note="${esc(item.id)}" maxlength="2000" rows="2">${esc(row.note)}</textarea></label><button data-save-work="${esc(item.id)}">Save progress</button>`:''}${item.history?.length?`<details><summary>${item.history.length} source changes</summary>${item.history.map(h=>`<p>${esc(new Date(h.at*1000).toLocaleString())}: previous deadline ${esc(h.due||'not supplied')} · ${esc(h.title)}</p>`).join('')}</details>`:''}</article>`;}).join('')}${!shown.length?'<p>No saved calendar items to show. Check Canvas for work outside this feed.</p>':''}${!full?'<a href="#assignments">View all deliverables and completed work</a>':''}<p><a href="#lecture">Prepare for lecture</a> · <a href="#settings">Connection & sync</a></p></section>`;
}
// Calendar days follow the course timezone, including daylight-saving transitions.
const courseDay = now => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function agendaItems(state,connection,now=Date.now()) {
  const today=courseDay(now);
  const tomorrow=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  const weekEnd=new Date(Date.parse(today+'T12:00:00Z')+(7-(new Date(today+'T12:00:00Z').getUTCDay()||7))*86400000).toISOString().slice(0,10);
  const work=state.learningHub?.work??{};
  const items=[...(connection?.local.canvas?.items??[]).filter(i=>!i.cancelled&&work[i.id]?.status!=='done').map(i=>({...i,note:work[i.id]?.note??'',origin:'Canvas calendar'})),
    ...(state.assignments??[]).filter(i=>['todo','missing'].includes(i.status)).map(i=>({...i,id:'local-'+i.id,dueKind:'date',origin:'Added by you',note:work['local-'+i.id]?.note??'',url:'#assignments'}))];
  return items.map(i=>{
    const day=i.dueKind==='instant'?courseDay(Date.parse(i.due)):i.due?.slice(0,10);
    const group=!day||i.dueKind==='floating'?'Confirm deadline':overdue(i,now)?'Overdue':day===today?'Today':day===tomorrow?'Tomorrow':day<=weekEnd?'This week':'Later';
    return {...i,group,sortDay:day??'9999'};
  }).sort((a,b)=>a.sortDay.localeCompare(b.sortDay)||(a.due??'').localeCompare(b.due??''));
}
export function nextActions(state,connection,now=Date.now()) {
  const items=agendaItems(state,connection,now),canvas=connection?.local.canvas;
  const next=items.find(i=>i.group!=='Confirm deadline')??items[0];
  const fresh=canvas?.lastSuccess&&now/1000-canvas.lastSuccess<=1800&&!canvas.error;
  const card=(i,featured=false)=>`<article class="deliverable ${featured?'next-assignment':''}"><h3>${esc(i.title)}</h3><p><strong>${esc(i.group)} · ${esc(dueLabel(i))}</strong></p><p class="muted">${esc(i.origin)} · Submission not verified${i.lastSeen&&canvas?.lastSuccess>i.lastSeen?' · Missing from latest feed; confirm in Canvas':''}</p>${i.note?`<p>Next action: ${esc(i.note)}</p>`:''}<a class="button" href="${esc(i.url)}" ${i.origin==='Canvas calendar'?'target="_blank" rel="noopener noreferrer"':''}>${i.origin==='Canvas calendar'?'Open in Canvas':'Edit assignment'}</a><details><summary>Update my progress / next action</summary><label>Next action<textarea data-agenda-note="${esc(i.id)}" maxlength="2000" rows="2">${esc(i.note)}</textarea></label><button data-agenda-save="${esc(i.id)}">Save next action</button><button class="quiet" data-agenda-done="${esc(i.id)}">Mark done by me</button></details></article>`;
  return `<section class="card next-actions"><h2>What do I need to do next?</h2><p role="status">${connection?.local.enabled?'Connected':'Not connected to Canvas'} · ${canvas?.lastSuccess?'Canvas checked '+esc(new Date(canvas.lastSuccess*1000).toLocaleString()):'Canvas has not been checked'}${fresh?'':' · Refresh needed'}</p>${canvas?.error?`<p class="notice">${esc(canvas.error)}</p>`:''}<p class="muted">Calendar deadlines plus work you add. Undated work and class announcements may be missing. Marking done here does not submit to Canvas.</p>${connection?.local.enabled?'<button id="agenda-refresh" class="quiet">Refresh deadlines</button>':'<a href="#settings">Connect your private Canvas service</a>'}<h3>Next up</h3>${next?card(next,true):'<p>No unfinished work saved here. Check Canvas and add anything assigned in class.</p>'}<details class="class-capture"><summary>Add something from class</summary><form id="class-capture"><label>What needs doing?<input name="title" required maxlength="200" placeholder="Finish the lab worksheet"></label><label>Due date (optional)<input name="due" type="date"></label><label>Category<select name="category">${state.rules.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><label>Next action (optional)<textarea name="note" maxlength="2000" rows="2" placeholder="Finish questions 4–8, then upload"></textarea></label><button type="submit">Save class assignment</button><p>Saved as your own assignment; confirm the deadline in Canvas.</p></form></details></section><section class="card due-soon"><h2>Due soon</h2>${['Overdue','Today','Tomorrow','This week','Confirm deadline'].map(group=>{const rows=items.filter(i=>i.group===group&&i.id!==next?.id);return rows.length?`<section><h3>${group}</h3>${rows.map(i=>card(i)).join('')}</section>`:'';}).join('')||'<p>No other saved work due soon.</p>'}<p><a href="#assignments">All deadlines & completed work →</a></p></section>`;
}
export function bindAgenda(state,save,render,connection) {
  const update=fn=>{const next=structuredClone(state);next.learningHub??={};next.learningHub.work??={};fn(next);validateHub(next);save(next);render();};
  document.querySelector('#agenda-refresh')?.addEventListener('click',()=>connection.sync());
  document.querySelector('#class-capture')?.addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),title=data.get('title').trim();if(!title)return;
    update(next=>{const id=crypto.randomUUID();next.assignments.push({id,title,category:data.get('category'),due:data.get('due'),status:'todo',possible:null,earned:null,modified:Date.now(),source:'Added in class'});next.learningHub.work['local-'+id]={status:'todo',note:data.get('note').trim(),at:Date.now()};});
  });
  for(const action of ['save','done'])document.querySelectorAll(`[data-agenda-${action}]`).forEach(button=>button.onclick=()=>update(next=>{
    const id=button.dataset[action==='save'?'agendaSave':'agendaDone'];const note=document.querySelector(`[data-agenda-note="${id}"]`).value;
    next.learningHub.work[id]={status:action==='done'?'done':next.learningHub.work[id]?.status??'todo',note,at:Date.now()};
    if(action==='done'&&id.startsWith('local-')){const item=next.assignments.find(i=>'local-'+i.id===id);if(item){item.status='done';item.modified=Date.now();}}
  }));
}
export function reviewCard(course,state,native=false) {
  const reviews=state.learningHub?.reviews??{};const now=Date.now();
  const prepared=new Set(Object.values(state.lecturePrep??{}).map(r=>r.unit));
  const pool=course.questions.filter(q=>prepared.has(q.unit)||reviews[q.id]);
  const due=pool.filter(q=>!reviews[q.id]||reviews[q.id].next<=now).sort((a,b)=>(reviews[a.id]?.next??0)-(reviews[b.id]?.next??0));
  return `<section class="card recall-queue"><h2>Recall & spaced review</h2><p>${due.length} concepts ready for review. Work on a few, then return another day. Review dates are suggestions; assignment deadlines remain separate.</p>${due.slice(0,3).map(q=>`<article class="deliverable" data-review="${q.id}"><h3>${esc(q.prompt)}</h3><label>Try recalling before checking<textarea data-recall-draft="${q.id}" rows="2" maxlength="2000">${esc(state.learningHub?.drafts?.[q.id]??'')}</textarea></label><details><summary>Reveal explanation & source</summary><p>${esc(q.choices[q.correct])}</p><p>${esc(q.explanation)}</p><p>${q.refs.map(r=>sourceLink(course,r.source,r.page,native)+' · p. '+r.page).join('<br>')}</p><p>Compare your explanation with the source. This is a self-check.</p><button data-review-again="${q.id}">Review again tomorrow</button><button data-review-good="${q.id}">My reasoning matched</button></details><button class="quiet" data-ask-review="${q.id}">Save a question for the teacher</button></article>`).join('')}${!pool.length?'<p>Select a topic in Lecture Prep to begin.</p>':''}${pool.length&&!due.length?'<p>Your scheduled reviews are up to date. New topics and future reviews will appear here.</p>':''}<p>Learning progress records recall attempts, not pages opened. Intervals adapt from 1 to 3 to 7 days and beyond; they are practical defaults.</p></section>`;
}
export function questionsCard(state){const rows=Object.entries(state.learningHub?.questions??{});return `<section class="card"><h2>Questions for the teacher</h2><p>Save questions while reviewing. Add what the teacher explains, then mark your uncertainty resolved.</p>${rows.map(([id,r])=>`<article class="deliverable"><h3>${esc(r.question)}</h3><label>Teacher’s explanation / your notes<textarea data-teacher-answer="${esc(id)}" rows="2" maxlength="2000">${esc(r.answer)}</textarea></label><label><input type="checkbox" data-teacher-resolved="${esc(id)}" ${r.resolved?'checked':''}> My question is resolved</label><button data-save-question="${esc(id)}">Save answer</button></article>`).join('')||'<p>No saved questions yet.</p>'}</section>`;}
export function bindHub(course,state,save,render){
  function update(fn,redraw=true){const next=structuredClone(state);next.learningHub??={};next.learningHub.work??={};next.learningHub.reviews??={};next.learningHub.questions??={};fn(next.learningHub);validateHub(next);save(next);state=next;if(redraw)render();}
  const filter=document.querySelector('#timeline-filter');if(filter)filter.onchange=()=>update(h=>h.timelineView=filter.value);
  document.querySelectorAll('[data-recall-draft]').forEach(el=>el.oninput=()=>update(h=>{h.drafts??={};h.drafts[el.dataset.recallDraft]=el.value;},false));
  const bind=(selector,fn)=>document.querySelectorAll(selector).forEach(b=>b.onclick=()=>fn(b));
  bind('[data-save-work]',b=>{const id=b.dataset.saveWork;update(h=>h.work[id]={status:document.querySelector(`[data-work-status="${id}"]`).value,note:document.querySelector(`[data-work-note="${id}"]`).value,at:Date.now()});});
  for(const verdict of ['again','good'])bind(`[data-review-${verdict}]`,b=>{const id=b.dataset[verdict==='again'?'reviewAgain':'reviewGood'];update(h=>{const level=verdict==='again'?0:Math.min(8,(h.reviews[id]?.level??0)+1);h.reviews[id]={verdict,level,at:Date.now(),next:Date.now()+[1,3,7,14,21,30,45,60,90][level]*86400000};h.reviewEvents??={};h.reviewEvents[crypto.randomUUID()]={question:id,verdict,at:Date.now(),answer:h.drafts?.[id]??''};});});
  bind('[data-ask-review]',b=>{const q=course.questions.find(q=>q.id===b.dataset.askReview);update(h=>{h.questions[q.id]??={question:'Could you explain how to reason through: '+q.prompt,answer:'',resolved:false};});});
  bind('[data-save-question]',b=>{const id=b.dataset.saveQuestion;update(h=>{h.questions[id].answer=document.querySelector(`[data-teacher-answer="${id}"]`).value;h.questions[id].resolved=document.querySelector(`[data-teacher-resolved="${id}"]`).checked;});});
}
