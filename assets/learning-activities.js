// Optional, ungraded study activities. Uses existing cited questions; no telemetry.
import {sourceLink} from './source-files.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const confidence=['','guessing','somewhat','very'];
const fields=['prediction','after','uncertainty','teachback'];
const object=value=>value && typeof value==='object' && !Array.isArray(value);
export function validateLearning(value) {
  if(value===undefined)return;
  if(!object(value)||typeof value.open!=='boolean'||!object(value.units)||Object.keys(value.units).length>6)throw Error('Invalid optional activity data.');
  for(const [unit,data] of Object.entries(value.units)) {
    if(!['digestion','urinary','balance','endocrine','immune','reproduction'].includes(unit)||!object(data))throw Error('Invalid activity topic.');
    for(const field of fields)if(data[field]!==undefined&&(typeof data[field]!=='string'||data[field].length>2000))throw Error('Activity notes must be at most 2,000 characters.');
    if(data.teachDone!==undefined&&typeof data.teachDone!=='boolean')throw Error('Invalid teach-back status.');
    if(!object(data.answers)||Object.keys(data.answers).length>60)throw Error('Invalid recall answers.');
    for(const [id,row] of Object.entries(data.answers)) {
      if(!/^(digestion|urinary|balance|endocrine|immune|reproduction)-\d{2}$/.test(id)||!object(row)||typeof row.answer!=='string'||row.answer.length>2000||!confidence.includes(row.confidence)||typeof row.checked!=='boolean'||!['','got-it','revisit'].includes(row.verdict))throw Error('Invalid recall response.');
    }
  }
}
export function activityPlan(course,state,day) {
  const current=state.lecturePrep?.[day];
  if(!current)return null;
  const earlier=Object.entries(state.lecturePrep??{}).filter(([date,r])=>date<day&&course.units.some(u=>u.id===r.unit)).sort(([a],[b])=>b.localeCompare(a));
  const prior=earlier[0];
  const unit=prior?.[1].unit??current.unit;
  const pool=course.questions.filter(q=>q.unit===unit);
  const recall=pool.slice(0,3);
  const older=earlier.find(([,r])=>r.unit!==unit)??earlier[1]??prior;
  const returning=older ? course.questions.filter(q=>q.unit===older[1].unit).find(q=>!recall.some(r=>r.id===q.id)) : null;
  return {recall,priorDay:prior?.[0]??'',recallUnit:unit,returning,returnDay:older?.[0]??''};
}
function questionCard(course,q,data,kind) {
  const row=data.answers?.[q.id]??{answer:'',confidence:'',checked:false,verdict:''};
  const refs=q.refs.map(r=>`${sourceLink(course,r.source,r.page,typeof window!=='undefined' && !!window.webkit?.messageHandlers?.companion)} · PDF p. ${r.page}`).join('<br>');
  return `<section class="card" data-recall="${q.id}"><h3>${esc(q.prompt)}</h3><label>Your answer from memory<textarea data-answer rows="2" maxlength="2000">${esc(row.answer)}</textarea></label><label>How sure are you?<select data-confidence>${confidence.map((value,i)=>`<option value="${value}" ${row.confidence===value?'selected':''}>${['Choose (optional)','Guessing','Somewhat sure','Very sure'][i]}</option>`).join('')}</select></label><button type="button" data-check="${q.id}">Save &amp; check explanation</button><p class="muted">${kind} · Try a sentence before checking; “not sure” is a useful answer. No score or grade.</p>${row.checked?`<div class="feedback"><p><strong>Reference answer:</strong> ${esc(q.choices[q.correct])}</p><p>${esc(q.explanation)}</p><p class="sources">${refs}</p><label>Compare your reasoning (self-check, not automatic grading)<select data-verdict><option value="">Choose (optional)</option><option value="got-it" ${row.verdict==='got-it'?'selected':''}>My reasoning matched</option><option value="revisit" ${row.verdict==='revisit'?'selected':''}>I need to revisit this</option></select></label>${row.confidence==='very'&&row.verdict==='revisit'?'<p class="notice">Bring this uncertainty to class: “I was sure because ___. Which step in my reasoning needs changing?”</p>':''}</div>`:''}</section>`;
}
export function learningCard(course,state,day) {
  const record=state.lecturePrep?.[day];
  if(!record)return '';
  const learning=record.learning??{open:false,units:{}},data=learning.units[record.unit]??{answers:{}};
  const plan=activityPlan(course,state,day), unit=course.units.find(u=>u.id===record.unit);
  const intro=`<h2>Optional learning activities</h2><p>${esc(day)} · ${esc(unit.title)}. Try any activity, or skip all of them. No grade, streak, deadline or completion requirement. Your responses are saved with your own lecture preparation.</p>`;
  if(!learning.open)return `<section class="card" id="learning-activities">${intro}<button type="button" id="learning-open">Try optional activities</button><p class="muted">Skipping is fine—continue with your usual lecture prep or quiz.</p><p role="status" id="learning-status"></p></section>`;
  return `<section class="card" id="learning-activities">${intro}<button type="button" class="quiet" id="learning-skip">Skip / hide activities</button><p class="muted">Hiding keeps anything already saved. Use Save activities before leaving this page; changing the lecture date/topic also saves your draft.</p><form id="learning-form">
<details><summary>1. Recall before notes — three quick questions</summary><p>${plan.priorDay?`Review your selected topic from ${esc(plan.priorDay)}.`:'No earlier lecture topic is saved yet. These are warm-up questions for your selected topic, not a test of material you should already know.'} Answer from memory first, then check the cited explanation. These reuse the study bank, not confirmed instructor quiz questions.</p>${plan.recall.map(q=>questionCard(course,q,data,'Recall practice')).join('')}</details>
<details><summary>2. My prediction → what I learned</summary><p>Choose one of the lecture’s “what if?” questions above. Predict before the explanation; return afterward to capture the change.</p><label>Before class, I thought ___ because ___<textarea data-learning="prediction" rows="2" maxlength="2000">${esc(data.prediction)}</textarea></label><label>After the explanation, I changed ___ because ___<textarea data-learning="after" rows="2" maxlength="2000">${esc(data.after)}</textarea></label></details>
<details><summary>3. Confidence → a question to bring to class</summary><p>Use Guessing / Somewhat sure / Very sure beside recall and return-visit answers. After checking, decide whether your reasoning matched. A “Very sure” answer you mark “revisit” is worth discussing—not a penalty.</p><label>One uncertainty I want help with<textarea data-learning="uncertainty" rows="2" maxlength="2000" placeholder="I think ___ because ___. Can you check the step where ___?">${esc(data.uncertainty)}</textarea></label></details>
<details><summary>4. A 60-second teach-back</summary><p>Explain one ${esc(unit.title)} process aloud without reading. A classmate can ask “Why does that step happen?” or “What would change if that step stopped?” Working alone? Ask yourself those questions aloud. No recording or microphone is used.</p><p>Check your explanation against the course guide/source afterward. Correct a missing or reversed step, then try again on a new example.</p><label>Where my explanation got stuck, or what I corrected<textarea data-learning="teachback" rows="2" maxlength="2000">${esc(data.teachback)}</textarea></label><label class="checkbox"><input type="checkbox" id="teach-done" ${data.teachDone?'checked':''}> I tried a teach-back (optional)</label></details>
<details><summary>5. Return to an earlier concept</summary>${plan.returning?`<p>A short return to ${esc(course.units.find(u=>u.id===plan.returning.unit)?.title)} from ${esc(plan.returnDay)}. Recall it again before looking; when possible this draws on a different earlier topic.</p>${questionCard(course,plan.returning,data,'Return visit')}`:'<p>Once you assign a topic to an earlier lecture date, one earlier concept will appear here alongside the new topic. Nothing is due, and no reminder is sent.</p>'}</details>
<button type="submit">Save activities</button><p role="status" id="learning-status"></p></form></section>`;
}
export function collectLearning(record) {
  const form=document.querySelector('#learning-form');
  if(!form)return record.learning;
  const learning=structuredClone(record.learning??{open:true,units:{}});
  const data=learning.units[record.unit]??{answers:{}};
  form.querySelectorAll('[data-learning]').forEach(el=>data[el.dataset.learning]=el.value);
  data.teachDone=form.querySelector('#teach-done').checked;
  form.querySelectorAll('[data-recall]').forEach(el=>{
    const id=el.dataset.recall,old=data.answers[id];
    const answer=el.querySelector('[data-answer]').value;
    const changed=old && answer!==old.answer;
    data.answers[id]={answer,confidence:el.querySelector('[data-confidence]').value,checked:changed?false:old?.checked??false,verdict:changed?'':el.querySelector('[data-verdict]')?.value??old?.verdict??''};
  });
  learning.units[record.unit]=data;validateLearning(learning);return learning;
}
export function bindLearning(record,save,rerender) {
  const root=document.querySelector('#learning-activities');
  if(!root)return;
  const status=message=>{const el=root.querySelector('#learning-status');if(el)el.textContent=message;};
  const run=async(change,refresh=true)=>{
    try {
      const learning=collectLearning(record)??{open:false,units:{}};
      change(learning);
      const open=[...root.querySelectorAll('details')].map(el=>el.open);
      const active=document.activeElement;
      const focusSelector=active?.dataset.check ? `[data-check="${CSS.escape(active.dataset.check)}"]` : active?.hasAttribute('data-verdict') ? `[data-recall="${CSS.escape(active.closest('[data-recall]').dataset.recall)}"] [data-verdict]` : active?.type==='submit' ? '#learning-form button[type="submit"]' : null;
      await save({learning});record={...record,learning};
      if(refresh){rerender();document.querySelectorAll('#learning-activities details').forEach((el,i)=>el.open=open[i]??false);}
      if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
      const live=document.querySelector('#learning-status');if(live)live.textContent='Activities saved. These do not affect your grade.';
    }catch(error){status(error.message);}
  };
  root.querySelector('#learning-open')?.addEventListener('click',()=>run(value=>value.open=true));
  root.querySelector('#learning-skip')?.addEventListener('click',()=>run(value=>value.open=false));
  root.querySelector('#learning-form')?.addEventListener('submit',event=>{event.preventDefault();run(()=>{});});
  root.querySelectorAll('[data-check]').forEach(button=>button.onclick=()=>run(value=>{
    const row=value.units[record.unit].answers[button.dataset.check];
    if(!row.answer.trim())throw Error('Try an answer first, or write “not sure”, then check the explanation.');
    row.checked=true;
  }));
  root.querySelectorAll('[data-verdict]').forEach(select=>select.onchange=()=>run(()=>{}));
}
