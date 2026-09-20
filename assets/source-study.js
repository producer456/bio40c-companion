import {sourceSessions} from './source-study-data.js';
import {sourceLink} from './source-files.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
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
    }
  }
}
export function sourceStudyCatalog(course,state,unit,native=false) {
  const items=sourceSessions.filter(s=>s.unit===unit);
  const card=s=>{
    const answers=state.sourceStudy?.[s.source]?.answers??{};
    const revisits=Object.values(answers).filter(a=>a.verdict==='revisit').length;
    return `<article class="study-source"><span class="eyebrow">${s.kind==='lecture'?'LECTURE SLIDES':'LAB / RECAP'}</span><h3>${esc(s.title)}</h3><p>${s.stops.length} guided checkpoints${revisits?` · ${revisits} to revisit`:''}</p><button data-study-open="${s.source}">Study this ${s.kind==='lecture'?'lecture':'lab'}</button><details><summary>Read original file</summary>${sourceLink(course,s.source,1,native)}</details></article>`;
  };
  return `<section class="card source-study-catalog"><h2>Study from the class material</h2><p>Start with a lecture, then apply it in lab. Checkpoints are companion-written practice tied to specific pages—not instructor questions, confirmed exam coverage or every slide.</p><p>Choose a topic above to see its files. Cross-topic decks are grouped by their main focus; “Mystery hormones & innate defenses” also reviews endocrine feedback.</p><h3>Lecture sessions</h3><div class="study-source-grid">${items.filter(s=>s.kind==='lecture').map(card).join('')}</div><h3>Labs alongside the lectures</h3><div class="study-source-grid">${items.filter(s=>s.kind==='lab').map(card).join('')}</div><details><summary>Textbook support</summary><p>Use the textbook to unpack a mechanism after working with the class source. Chapter references and topic explanations are below.</p>${sourceLink(course,'source-25',1,native)}</details></section>`;
}
export function sourceStudyPanel(course,state,native=false) {
  const session=sourceSessions.find(s=>s.source===active);
  if(!session)return '';
  const saved=state.sourceStudy?.[active]??{answers:{}};
  return `<section class="card study-workspace" id="source-study" aria-labelledby="study-title"><button class="quiet" data-study-close>← Back to course library</button><span class="eyebrow">${session.kind==='lecture'?'LECTURE-DERIVED':'LAB-DERIVED'} · OPTIONAL STUDY</span><h2 id="study-title" tabindex="-1">${esc(session.title)}</h2><p>Read a short section, hide it, explain from memory, then compare. Nothing here affects grades or quiz streaks. Free text is self-checked, not automatically graded.</p><p class="muted">Supplied course edition; confirm current emphasis in class. Lab activities here are study rehearsals, not instructions to perform experiments at home.</p><label>My class date (optional—not an official schedule)<input id="study-date" type="date" value="${esc(saved.date??'')}"></label><p>Save before leaving this screen. Your responses travel with your course backup.</p><form id="source-study-form">${session.stops.map((stop,i)=>{
    const a=saved.answers[stop.id]??{text:'',revealed:false,choice:null,verdict:'',confidence:''};
    return `<article class="study-stop" data-study-stop="${stop.id}"><span class="eyebrow">CHECKPOINT ${i+1} OF ${session.stops.length}</span><h3>${esc(stop.title)}</h3><details><summary>1. Read the source · ${active==='source-11'?'Table 1':`PDF page ${stop.page}`}</summary><p>${sourceLink(course,active,stop.page,native)}</p>${inlinePage(active,stop.page)}<p>Read the cited page and any surrounding pages named in the prompt, then return and try without looking.</p></details><h4>2. Try it from memory</h4><p>${esc(stop.prompt)}</p>${stop.choices?`<fieldset><legend>Your choice (optional)</legend>${stop.choices.map((_,i)=>{const index=(i+stop.id.length)%stop.choices.length;const choice=stop.choices[index];return `<label><input type="radio" name="choice-${stop.id}" value="${index}" ${a.choice===index?'checked':''}> ${esc(choice)}</label>`;}).join('')}</fieldset>`:''}<label>Your explanation<textarea name="text-${stop.id}" maxlength="3000" placeholder="Explain why, name the structure or describe the evidence. You can also rehearse aloud and leave this blank.">${esc(a.text)}</textarea></label><label>Confidence before checking<select name="confidence-${stop.id}">${[['','Not recorded'],['low','Still unsure'],['medium','Partly confident'],['high','Confident']].map(([v,t])=>`<option value="${v}" ${a.confidence===v?'selected':''}>${t}</option>`).join('')}</select></label><button type="button" data-study-reveal="${stop.id}">${a.revealed?'Save revised response':'3. Save & reveal self-check'}</button>${a.revealed?`<section class="feedback"><h4>Compare your reasoning</h4>${stop.choices&&a.choice!==null?`<p>${a.choice===stop.correct?'Your choice matches.':'A useful one to revisit.'} Answer: ${esc(stop.choices[stop.correct])}.</p>`:''}<p>${esc(stop.check)}</p><p>${sourceLink(course,active,stop.page,native)} · ${active==='source-11'?'Table 1':`PDF p. ${stop.page}`}</p><label>My self-check<select name="verdict-${stop.id}"><option value="">Not assessed</option><option value="revisit" ${a.verdict==='revisit'?'selected':''}>Revisit this</option><option value="ready" ${a.verdict==='ready'?'selected':''}>I can explain it</option></select></label>${a.confidence==='high'&&a.verdict==='revisit'?'<p>Bring this confident-but-incomplete explanation to class and ask which step needs changing.</p>':''}<h4>Ask a human to show the reasoning</h4><p>${esc(stop.ask)}</p></section>`:''}</article>`;
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
    record.answers[stop.id]={text,choice,confidence:root.querySelector(`[name="confidence-${stop.id}"]`).value,revealed:reveal===stop.id||Boolean(prior?.revealed&&!changed),verdict:changed?'':root.querySelector(`[name="verdict-${stop.id}"]`)?.value??''};
  }
  next.sourceStudy[source]=record;
  validateSourceStudy(next);
  return next;
}
export function bindSourceStudy(state,commit,render) {
  document.querySelectorAll('[data-study-open]').forEach(button=>button.onclick=()=>{active=button.dataset.studyOpen;render();document.querySelector('#study-title')?.focus();document.querySelector('#source-study')?.scrollIntoView({block:'start'});});
  document.querySelector('[data-study-close]')?.addEventListener('click',()=>{active=null;render();document.querySelector('.source-study-catalog h2')?.scrollIntoView({block:'start'});});
  const save=reveal=>{
    try {
      commit(collectSourceStudy(state,document,active,reveal));
      render();
      const status=document.querySelector('#study-save-status');
      if(status)status.textContent=window.webkit?.messageHandlers?.companion?'Save requested in the app.':'Study responses saved in this browser.';
      if(reveal)document.querySelector(`[data-study-reveal="${reveal}"]`)?.focus();
    } catch(error) {document.querySelector('#study-save-status').textContent=`Could not save: ${error.message}. Your entries are still on this screen.`;}
  };
  document.querySelector('#source-study-form')?.addEventListener('submit',event=>{event.preventDefault();save();});
  document.querySelectorAll('[data-study-reveal]').forEach(button=>button.onclick=()=>save(button.dataset.studyReveal));
}
