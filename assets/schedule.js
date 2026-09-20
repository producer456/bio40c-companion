const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
export function scheduleSummary(schedule) {
  if (!schedule) return '';
  return `${schedule.course} · Section ${schedule.section} · CRN ${schedule.crn}\n${date(schedule.termStart)} – ${date(schedule.termEnd)}\n${schedule.instructor} · ${schedule.campus} · ${schedule.instruction}\n` + schedule.meetings.map(m=>`${m.type}: ${m.days}, ${m.time} · Room ${m.room}`).join('\n');
}
export function registrationState(state, schedule) {
  if (!schedule || state.clarifications?.meetings?.length) return state;
  const next = structuredClone(state);
  next.clarifications ??= {};
  next.clarifications.meetings = [{value:scheduleSummary(schedule), previous:'', status:'confirmed', date:schedule.sourceDate, reference:schedule.source, savedAt:Date.parse(schedule.sourceDate+'T12:00:00Z')}];
  return next;
}
export function scheduleCard(schedule, state) {
  if (!schedule) return '';
  const saved = state.clarifications?.meetings?.at(-1);
  const correction = saved && (saved.value !== scheduleSummary(schedule) || saved.status !== 'confirmed') ? saved : null;
  const registration = `<p>${escape(schedule.course)} · Section ${escape(schedule.section)} · CRN ${escape(schedule.crn)} · ${schedule.units} units</p><p>${date(schedule.termStart)} – ${date(schedule.termEnd)}<br>${escape(schedule.instructor)} · ${escape(schedule.campus)} · ${escape(schedule.instruction)}</p>${schedule.meetings.map(m=>`<div class="list-row"><div><strong>${escape(m.type)} · ${escape(m.days)}</strong><p>${escape(m.time)} · Room ${escape(m.room)}</p></div></div>`).join('')}<p class="muted">${escape(schedule.source)}. Assignment deadlines and holiday changes are tracked separately.</p>`;
  return `<section class="card" id="course-schedule"><div class="section-heading"><h2>Your class schedule</h2><a href="#clarifications">Update in Course details →</a></div>${correction?`<p><strong>${correction.status==='confirmed'?'Your confirmed meeting update':'Meeting details need confirmation'}</strong> · ${escape(correction.date)}</p><p style="white-space:pre-wrap">${escape(correction.value)}</p><details><summary>Original registration schedule</summary>${registration}</details>`:registration}</section>`;
}
