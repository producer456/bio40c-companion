import {sourceSessions,diagramPractice} from './source-study-data.js';
import {sourceLink} from './source-files.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
let reviewActive=null;
let reviewDraft=null;
const orders=new Map();
export function shuffledChoices(stop,random=Math.random) {
  const indices=stop.choices.map((_,i)=>i);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  return indices;
}
function choiceOrder(source,stop){const key=`${source}/${stop.id}`;if(!orders.has(key))orders.set(key,shuffledChoices(stop));return orders.get(key);}
const day=86400000;
export function reviewQueue(state,now=Date.now()) {
  return sourceSessions.flatMap(session=>session.stops.flatMap(stop=>{
    const answer=state.sourceStudy?.[session.source]?.answers?.[stop.id];
    if(!answer||!(answer.text.trim()||answer.choice!==null||answer.revealed||answer.verdict))return [];
    if(answer.review?.due>now)return [];
    const rating=answer.review?.rating??answer.verdict;
    const confidence=answer.review?.confidence??answer.confidence;
    const priority=rating==='revisit'?(confidence==='high'?0:1):2;
    return [{session,stop,answer,priority,reason:priority===0?'Confident, then marked for review':priority===1?'Marked for review':answer.review?'Time to recall again':'First review'}];
  })).sort((a,b)=>a.priority-b.priority||(a.answer.review?.due??0)-(b.answer.review?.due??0));
}
export function recordReview(state,source,id,draft,rating,now=Date.now()) {
  const next=structuredClone(state),answer=next.sourceStudy?.[source]?.answers?.[id];
  if(!answer||!['revisit','ready'].includes(rating))throw Error('Invalid review.');
  const streak=rating==='ready'?Math.min((answer.review?.streak??0)+1,5):0;
  answer.review={...draft,rating,streak,last:now,due:now+[1,1,3,7,14,30][streak]*day};
  validateSourceStudy(next);
  return next;
}
function topicTag(course,unit) {
  const index=course.units.findIndex(item=>item.id===unit),topic=course.units[index];
  return topic?`<span class="topic-tag" data-topic="${esc(unit)}">${String(index+1).padStart(2,'0')} · ${esc(topic.title)}</span>`:'';
}
function diagramPanel(source,stop,answer) {
  const diagram=diagramPractice[`${source}/${stop.id}`];
  if(!diagram)return '';
  const saved=answer.diagram??{answers:[],revealed:false};
  return `<details class="diagram-practice" data-diagram="${stop.id}"><summary>Diagram practice · ${esc(diagram.title)}</summary><button type="button" class="diagram-zoom" data-diagram-zoom aria-label="Enlarge diagram" title="Enlarge diagram" aria-pressed="false">+</button><div class="diagram-scroll" tabindex="0" aria-label="Original diagram with lettered label covers"><figure class="diagram-stage"><img src="./study-pages/${source}-p${diagram.page}.png" alt="${esc(diagram.title)}. Lettered positions correspond to the response fields below.">${diagram.labels.map((label,i)=>`<span class="diagram-outline" data-cue="${i}" aria-hidden="true" style="left:${label.box[0]}%;top:${label.box[1]}%;width:${label.box[2]}%;height:${label.box[3]}%"></span><span class="diagram-mask" data-cue="${i}" style="left:${label.box[0]}%;top:${label.box[1]}%;width:${label.box[2]}%;height:${label.box[3]}%" ${saved.revealed?'hidden':''}>${String.fromCharCode(65+i)}</span>`).join('')}</figure></div>${diagram.labels.map((label,i)=>`<label class="diagram-response" data-cue="${i}"><span class="diagram-prompt">${esc(label.prompt)}</span><input name="diagram-${stop.id}-${i}" maxlength="300" value="${esc(saved.answers[i]??'')}"></label>`).join('')}<button type="button" data-diagram-toggle="${stop.id}" aria-expanded="${saved.revealed}">${saved.revealed?'Cover labels':'Reveal original labels'}</button><div class="diagram-key" ${saved.revealed?'':'hidden'}>${diagram.labels.map((label,i)=>`<p data-cue="${i}"><strong class="cue-letter">${String.fromCharCode(65+i)}.</strong> ${esc(label.answer)}</p>`).join('')}</div></details>`;
}
function reviewPanel(course,state,native) {
  if(reviewActive){const [source,id]=reviewActive.split('/');if(!state.sourceStudy?.[source]?.answers?.[id]){reviewActive=null;reviewDraft=null;}}
  const queue=reviewQueue(state);
  if(!reviewActive)return `<section class="study-review"><h2>Review today</h2><p>${queue.length?`${queue.length} checkpoints ready to revisit.`:'No checkpoints due. Study a lecture or lab to build your review list.'}</p>${queue.slice(0,5).map(({session,stop,reason})=>`<div class="review-row" data-topic="${session.unit}"><div>${topicTag(course,session.unit)}<strong>${esc(stop.title)}</strong><p>${esc(session.title)} · ${esc(reason)}</p></div><button data-review-open="${session.source}/${stop.id}">Review</button></div>`).join('')}</section>`;
  const [source,id]=reviewActive.split('/'),session=sourceSessions.find(s=>s.source===source),stop=session.stops.find(s=>s.id===id);
  const previous=state.sourceStudy[source].answers[id];
  return `<section class="study-review" id="review-workspace" data-topic="${session.unit}"><button data-review-close>Back to review list</button>${topicTag(course,session.unit)}<h2 tabindex="-1" id="review-title">${esc(stop.title)}</h2><p>${esc(session.title)}</p><form id="review-form"><p>${esc(stop.prompt)}</p>${stop.choices?`<fieldset><legend>Your choice</legend>${choiceOrder(source,stop).map(i=>`<label><input type="radio" name="review-choice" value="${i}" ${reviewDraft?.choice===i?'checked':''} ${reviewDraft?'disabled':''}> ${esc(stop.choices[i])}</label>`).join('')}</fieldset>`:''}<label>Your explanation<textarea name="review-text" maxlength="3000" ${reviewDraft?'readonly':''}>${esc(reviewDraft?.text??'')}</textarea></label><label>Confidence before checking<select name="review-confidence" ${reviewDraft?'disabled':''}>${[['','Not recorded'],['low','Still unsure'],['medium','Partly confident'],['high','Confident']].map(([v,t])=>`<option value="${v}" ${reviewDraft?.confidence===v?'selected':''}>${t}</option>`).join('')}</select></label>${reviewDraft?`<div class="feedback"><h3>Compare your reasoning</h3>${stop.choices&&reviewDraft.choice!==null?`<p>${reviewDraft.choice===stop.correct?'Your choice matches.':'A useful one to revisit.'} Answer: ${esc(stop.choices[stop.correct])}.</p>`:''}<p>${esc(stop.check)}</p>${sourceLink(course,source,stop.page,native)}<details><summary>Your previous response</summary><p>${esc(previous.review?.text??previous.text)||'No written response.'}</p></details><p>${esc(stop.ask)}</p><button type="button" data-review-rate="revisit">Revisit tomorrow</button> <button type="button" data-review-rate="ready">I can explain it</button></div>`:'<button type="submit">Reveal self-check</button>'}<p id="review-status" role="status"></p></form></section>`;
}
const inlinePages={'source-23':[11],'source-21':[12],'source-20':[8,10],'source-18':[18],'source-15':[19],'source-14':[18,23]};
const pageDescriptions={
 'source-23-11':'Original slide comparing physical breakup of food with chemical breakdown of molecules.',
 'source-21-12':'Original glomerular filtration barrier figure. Use the full-size source to examine the labeled structures.',
 'source-20-8':'Original proximal-tubule graph for a prediction exercise. Inspect axis labels before placing predicted points.',
 'source-20-10':'Original paired experimental graphs comparing explanations for urine concentration.',
 'source-18-18':'Original lipid-soluble hormone signaling diagram; compare with the next page in the source.',
 'source-15-19':'Original seminiferous-tubule diagram, with developmental stages from the outer edge toward the lumen.',
 'source-14-18':'Original FSH and follicular atresia feedback diagram.',
 'source-14-23':'Original positive-feedback diagram for labor.'
};
function inlinePage(source,page){return inlinePages[source]?.includes(page)?`<figure class="study-original"><img loading="lazy" src="./study-pages/${source}-p${page}.png" alt="${esc(pageDescriptions[`${source}-${page}`])}"><figcaption>Original slide · PDF page ${page}. Open the source for full-size details. Close this reading section before recalling.</figcaption></figure>`:'';}
const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
export function validateSourceStudy(state) {
  if(state.sourceStudy===undefined)return;
  if(!object(state.sourceStudy)||Object.keys(state.sourceStudy).length>23)throw Error('Invalid source study data.');
  for(const [id,record] of Object.entries(state.sourceStudy)) {
    const session=sourceSessions.find(s=>s.source===id);
    if(!session||!object(record)||!object(record.answers)||Object.keys(record.answers).length>session.stops.length)throw Error('Invalid source study session.');
    if(record.date!==undefined && (typeof record.date!=='string'||record.date!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||!Number.isFinite(Date.parse(record.date))||new Date(record.date).toISOString().slice(0,10)!==record.date)))throw Error('Invalid study date.');
    for(const [key,answer] of Object.entries(record.answers)) {
      const stop=session.stops.find(s=>s.id===key);
      if(!stop||!object(answer)||typeof answer.text!=='string'||answer.text.length>3000||typeof answer.revealed!=='boolean'||!['','revisit','ready'].includes(answer.verdict)||!['','low','medium','high'].includes(answer.confidence))throw Error('Invalid source study response.');
      if(answer.choice!==null && (!stop.choices||!Number.isInteger(answer.choice)||answer.choice<0||answer.choice>=stop.choices.length))throw Error('Invalid source study choice.');
      if(answer.review!==undefined){
        const r=answer.review;
        if(!object(r)||!Number.isSafeInteger(r.last)||r.last<0||!Number.isSafeInteger(r.due)||r.due<=r.last||!Number.isInteger(r.streak)||r.streak<0||r.streak>5||!['ready','revisit'].includes(r.rating)||!['','low','medium','high'].includes(r.confidence)||typeof r.text!=='string'||r.text.length>3000||r.choice!==null&&(!stop.choices||!Number.isInteger(r.choice)||r.choice<0||r.choice>=stop.choices.length))throw Error('Invalid review data.');
      }
      if(answer.diagram!==undefined){
        const d=answer.diagram,definition=diagramPractice[`${id}/${key}`];
        if(!definition||!object(d)||typeof d.revealed!=='boolean'||!Array.isArray(d.answers)||d.answers.length!==definition.labels.length||d.answers.some(a=>typeof a!=='string'||a.length>300))throw Error('Invalid diagram response.');
      }
    }
  }
}
export function sourceStudyCatalog(course,state,unit,native=false) {
  const items=sourceSessions.filter(s=>s.unit===unit);
  const card=s=>{
    const answers=state.sourceStudy?.[s.source]?.answers??{};
    const revisits=Object.values(answers).filter(a=>a.verdict==='revisit').length;
    return `<article class="study-source" data-topic="${s.unit}">${topicTag(course,s.unit)}<span class="eyebrow">${s.kind==='lecture'?'LECTURE SLIDES':'LAB / RECAP'}</span><h3>${esc(s.title)}</h3><p>${s.stops.length} guided checkpoints${revisits?` · ${revisits} to revisit`:''}</p><button data-study-open="${s.source}">Study this ${s.kind==='lecture'?'lecture':'lab'}</button><details><summary>Read original file</summary>${sourceLink(course,s.source,1,native)}</details></article>`;
  };
  return `${reviewPanel(course,state,native)}<section class="source-study-catalog"><h2>Study from the class material</h2><p>Start with a lecture, then apply it in lab. Checkpoints are companion-written practice tied to specific pages—not instructor questions, confirmed exam coverage or every slide.</p><p>Choose a topic above to see its files. Cross-topic decks are grouped by their main focus; “Mystery hormones & innate defenses” also reviews endocrine feedback.</p><h3>Lecture sessions</h3><div class="study-source-grid">${items.filter(s=>s.kind==='lecture').map(card).join('')}</div><h3>Labs alongside the lectures</h3><div class="study-source-grid">${items.filter(s=>s.kind==='lab').map(card).join('')}</div><details><summary>Textbook support</summary><p>Use the textbook to unpack a mechanism after working with the class source. Chapter references and topic explanations are below.</p>${sourceLink(course,'source-25',1,native)}</details></section>`;
}
export function sourceStudyPanel(course,state,native=false) {
  const session=sourceSessions.find(s=>s.source===active);
  if(!session)return '';
  const saved=state.sourceStudy?.[active]??{answers:{}};
  return `<section class="study-workspace" data-topic="${session.unit}" id="source-study" aria-labelledby="study-title"><button class="quiet" data-study-close>← Back to course library</button>${topicTag(course,session.unit)}<span class="eyebrow">${session.kind==='lecture'?'LECTURE-DERIVED':'LAB-DERIVED'} · OPTIONAL STUDY</span><h2 id="study-title" tabindex="-1">${esc(session.title)}</h2><p>Read a short section, hide it, explain from memory, then compare. Nothing here affects grades or quiz streaks. Free text is self-checked, not automatically graded.</p><p class="muted">Supplied course edition; confirm current emphasis in class. Lab activities here are study rehearsals, not instructions to perform experiments at home.</p><label>My class date (optional—not an official schedule)<input id="study-date" type="date" value="${esc(saved.date??'')}"></label><p>Save before leaving this screen. Your responses travel with your course backup.</p><form id="source-study-form">${session.stops.map((stop,i)=>{
    const a=saved.answers[stop.id]??{text:'',revealed:false,choice:null,verdict:'',confidence:''};
    return `<article class="study-stop" data-study-stop="${stop.id}"><span class="eyebrow">CHECKPOINT ${i+1} OF ${session.stops.length}</span><h3>${esc(stop.title)}</h3><details><summary>1. Read the source · ${active==='source-11'?'Table 1':`PDF page ${stop.page}`}</summary><p>${sourceLink(course,active,stop.page,native)}</p>${inlinePage(active,stop.page)}<p>Read the cited page and any surrounding pages named in the prompt, then return and try without looking.</p></details>${diagramPanel(active,stop,a)}<h4>2. Try it from memory</h4><p>${esc(stop.prompt)}</p>${stop.choices?`<fieldset><legend>Your choice (optional)</legend>${choiceOrder(active,stop).map(index=>{const choice=stop.choices[index];return `<label><input type="radio" name="choice-${stop.id}" value="${index}" ${a.choice===index?'checked':''}> ${esc(choice)}</label>`;}).join('')}</fieldset>`:''}<label>Your explanation<textarea name="text-${stop.id}" maxlength="3000" placeholder="Explain why, name the structure or describe the evidence. You can also rehearse aloud and leave this blank.">${esc(a.text)}</textarea></label><label>Confidence before checking<select name="confidence-${stop.id}">${[['','Not recorded'],['low','Still unsure'],['medium','Partly confident'],['high','Confident']].map(([v,t])=>`<option value="${v}" ${a.confidence===v?'selected':''}>${t}</option>`).join('')}</select></label><button type="button" data-study-reveal="${stop.id}">${a.revealed?'Save revised response':'3. Save & reveal self-check'}</button>${a.revealed?`<section class="feedback"><h4>Compare your reasoning</h4>${stop.choices&&a.choice!==null?`<p>${a.choice===stop.correct?'Your choice matches.':'A useful one to revisit.'} Answer: ${esc(stop.choices[stop.correct])}.</p>`:''}<p>${esc(stop.check)}</p><p>${sourceLink(course,active,stop.page,native)} · ${active==='source-11'?'Table 1':`PDF p. ${stop.page}`}</p><label>My self-check<select name="verdict-${stop.id}"><option value="">Not assessed</option><option value="revisit" ${a.verdict==='revisit'?'selected':''}>Revisit this</option><option value="ready" ${a.verdict==='ready'?'selected':''}>I can explain it</option></select></label>${a.confidence==='high'&&a.verdict==='revisit'?'<p>Bring this confident-but-incomplete explanation to class and ask which step needs changing.</p>':''}<h4>Ask a human to show the reasoning</h4><p>${esc(stop.ask)}</p></section>`:''}</article>`;
  }).join('')}<button type="submit">Save study responses</button><p id="study-save-status" role="status"></p></form><p>Instructor corrections can be recorded in <a href="#clarifications">Course details</a>; class preparation and discussion notes remain in <a href="#lecture">Lecture prep</a>.</p></section>`;
}
export function collectSourceStudy(state,root,source,reveal) {
  const session=sourceSessions.find(s=>s.source===source);
  if(!session)throw Error('Unknown study source.');
  const next=structuredClone(state);
  next.sourceStudy??={};
  const record={date:root.querySelector('#study-date').value,answers:{}};
  for(const stop of session.stops) {
    const prior=state.sourceStudy?.[source]?.answers?.[stop.id];
    const text=root.querySelector(`[name="text-${stop.id}"]`).value;
    const selected=root.querySelector(`[name="choice-${stop.id}"]:checked`);
    const choice=selected?Number(selected.value):null;
    const changed=prior && (prior.text!==text||prior.choice!==choice);
    record.answers[stop.id]={...prior,text,choice,confidence:root.querySelector(`[name="confidence-${stop.id}"]`).value,revealed:reveal===stop.id||Boolean(prior?.revealed&&!changed),verdict:changed?'':root.querySelector(`[name="verdict-${stop.id}"]`)?.value??''};
  }
    for(const stop of session.stops){
    const definition=diagramPractice[`${source}/${stop.id}`];
    if(definition)record.answers[stop.id].diagram={
      answers:definition.labels.map((_,i)=>root.querySelector(`[name="diagram-${stop.id}-${i}"]`).value),
      revealed:root.querySelector(`[data-diagram-toggle="${stop.id}"]`).getAttribute('aria-expanded')==='true'
    };
    const prior=state.sourceStudy?.[source]?.answers?.[stop.id],current=record.answers[stop.id];
    if(prior&&(prior.text!==current.text||prior.choice!==current.choice||prior.verdict!==current.verdict))delete current.review;
  }
  next.sourceStudy[source]=record;
  validateSourceStudy(next);
  return next;
}
export function bindSourceStudy(state,commit,render) {
  const current=typeof state==='function'?state:()=>state;
  document.querySelectorAll('.diagram-response input').forEach(input=>{
    const label=input.closest('[data-cue]'),panel=input.closest('[data-diagram]');
    const highlight=active=>panel.querySelectorAll('[data-cue]').forEach(element=>element.classList.toggle('cue-active',active&&element.dataset.cue===label.dataset.cue));
    input.addEventListener('focus',()=>highlight(true));
    input.addEventListener('blur',()=>highlight(false));
  });
  document.querySelectorAll('[data-diagram-zoom]').forEach(button=>button.onclick=()=>{
    const enlarged=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(enlarged));button.textContent=enlarged?'−':'+';
    button.title=enlarged?'Fit diagram':'Enlarge diagram';button.setAttribute('aria-label',button.title);
    button.closest('[data-diagram]').querySelector('.diagram-stage').classList.toggle('enlarged',enlarged);
  });
  document.querySelectorAll('[data-diagram-toggle]').forEach(button=>button.onclick=()=>{
    const panel=button.closest('[data-diagram]'),show=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(show));button.textContent=show?'Cover labels':'Reveal original labels';
    panel.querySelectorAll('.diagram-mask').forEach(mask=>mask.hidden=show);
    panel.querySelector('.diagram-key').hidden=!show;
  });
  document.querySelectorAll('[data-review-open]').forEach(button=>button.onclick=()=>{
    reviewActive=button.dataset.reviewOpen;reviewDraft=null;active=null;
    const [source,id]=reviewActive.split('/');orders.delete(`${source}/${id}`);
    render();document.querySelector('#review-title')?.focus();
  });
  document.querySelector('[data-review-close]')?.addEventListener('click',()=>{reviewActive=null;reviewDraft=null;render();});
  document.querySelector('#review-form')?.addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget,selected=form.querySelector('[name="review-choice"]:checked');
    reviewDraft={text:form.querySelector('[name="review-text"]').value,choice:selected?Number(selected.value):null,confidence:form.querySelector('[name="review-confidence"]').value};
    render();document.querySelector('[data-review-rate]')?.focus();
  });
  document.querySelectorAll('[data-review-rate]').forEach(button=>button.onclick=async()=>{
    try{
      const [source,id]=reviewActive.split('/');
      await commit(recordReview(current(),source,id,reviewDraft,button.dataset.reviewRate));
      reviewActive=null;reviewDraft=null;render();
      document.querySelector('.study-review h2')?.scrollIntoView({block:'start'});
    }catch(error){document.querySelector('#review-status').textContent=`Could not save: ${error.message}. Your response is still here.`;}
  });
  document.querySelectorAll('[data-study-open]').forEach(button=>button.onclick=()=>{active=button.dataset.studyOpen;reviewActive=null;reviewDraft=null;render();document.querySelector('#study-title')?.focus();document.querySelector('#source-study')?.scrollIntoView({block:'start'});});
  document.querySelector('[data-study-close]')?.addEventListener('click',()=>{active=null;render();document.querySelector('.source-study-catalog h2')?.scrollIntoView({block:'start'});});
  const save=async reveal=>{
    try {
      await commit(collectSourceStudy(current(),document,active,reveal));
      render();
      const status=document.querySelector('#study-save-status');
      if(status)status.textContent=window.webkit?.messageHandlers?.companion?'Save requested in the app.':'Study responses saved in this browser.';
      if(reveal)document.querySelector(`[data-study-reveal="${reveal}"]`)?.focus();
    } catch(error) {document.querySelector('#study-save-status').textContent=`Could not save: ${error.message}. Your entries are still on this screen.`;}
  };
  document.querySelector('#source-study-form')?.addEventListener('submit',event=>{event.preventDefault();save();});
  document.querySelectorAll('[data-study-reveal]').forEach(button=>button.onclick=()=>save(button.dataset.studyReveal));
}
