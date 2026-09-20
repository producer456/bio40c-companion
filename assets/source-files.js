const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const approvedSourceIDs=Array.from({length:24},(_,i)=>`source-${String(i+1).padStart(2,'0')}`);
export function sourceURL(id,page=1,local=false) {
  if(id==='source-25')return 'https://openstax.org/details/books/anatomy-and-physiology-2e';
  if(!approvedSourceIDs.includes(id))return null;
  const ext=id==='source-11'?'docx':'pdf';
  const base=local?'./sources/':'https://producer456.github.io/bio40c-companion/sources/';
  return `${base}${id}.${ext}${ext==='pdf'?`#page=${Math.max(1,Math.floor(Number(page)||1))}`:''}`;
}
export function sourceLink(course,id,page=1,native=false) {
  const title=esc(course.sources.find(source=>source.id===id)?.title??id);
  if(native)return `<button class="quiet" data-source="${esc(id)}" data-page="${Number(page)||1}">${title}</button>`;
  const url=sourceURL(id,page,course.originalFilesHosted===true);
  return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a>`:title;
}
export function sourceLibrary(course,native=false) {
  return `<section class="card" id="original-course-files"><h2>Original course files</h2><p>Read the lecture slides, lab handouts and syllabus used by this companion. Shared for noncommercial study with instructor permission reported by the project owner. Do not sell these materials. Original authors and credits are retained in each document.</p><p class="muted">These are the supplied course editions; some contain older dates or a different instructor’s name. Use current class announcements and Course details for corrections. ${native?'Class documents open in the app; the full textbook opens at OpenStax.':'PDF links open in a new tab; the Word document opens or downloads according to your device.'}</p><details><summary>Browse all 24 class files and the textbook</summary><ul class="source-file-list">${course.sources.map(source=>`<li>${sourceLink(course,source.id,1,native)}${!native&&source.id!=='source-25'?` <a class="source-download" href="${esc(sourceURL(source.id,1,course.originalFilesHosted===true).split('#')[0])}" download="${esc(source.title)}" aria-label="Download ${esc(source.title)}">Download ${source.id==='source-11'?'DOCX':'PDF'}</a>`:source.id==='source-25'?'<small>Full textbook hosted by OpenStax · CC BY-NC-SA 4.0</small>':''}</li>`).join('')}</ul></details></section>`;
}
