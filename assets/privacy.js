// Public website only. No student data or telemetry is sent by this module.
const noticeKey = 'bio40c-companion-public-privacy-v1';
const dialog = document.createElement('dialog');
dialog.className = 'privacy-dialog';
dialog.setAttribute('aria-labelledby', 'privacy-title');
dialog.innerHTML = `<h2 id="privacy-title">Your work stays with you</h2>
<p><strong>The information you enter here is stored in your browser on your computer, tablet or phone. Other students cannot see it, and neither can this site's creator through this website.</strong></p>
<p><strong>The site's creator does not track what you do here.</strong> This site sends no activity reports, notes, grades or quiz answers to the creator. There is no dashboard or shared class database where the creator or classmates can view your work.</p>
<p>Classmates cannot see your saved work by opening this website on their own devices. Everyone has their own separate progress. The site does not automatically upload or sync your work; you can choose to export a backup yourself.</p>
<ul>
<li><strong>Use this same browser to pick up where you left off.</strong> Your work does not automatically follow you to another browser or device.</li>
<li><strong>Keep a backup.</strong> Clearing browser data can erase your work. Use <strong>Settings &amp; backup → Export backup</strong> to save a private copy or move it to another device.</li>
</ul>
<details><summary>More about storage, backups and website hosting</summary>
<p>Private browsing may discard your work when the session ends. Browser storage can also be cleared, evicted or blocked. Backup files contain your data, so keep them private and do not post them as GitHub issues.</p>
<p>GitHub Pages receives normal website requests and logs visitors’ IP addresses for security. That is separate from your study data, which this site does not upload. This site adds no analytics, advertising, tracking cookies or remote fonts. External links have their own privacy practices.</p>
<p><a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages" target="_blank" rel="noopener noreferrer">About GitHub Pages hosting</a> · <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub privacy statement</a></p>
</details>
<p>This is an unofficial student study aid, not an instructor submission system. You can reopen this notice using <strong>Privacy &amp; storage</strong>.</p>
<button type="button" id="privacy-close">Got it — continue</button>`;
const reopen = document.createElement('button');
reopen.type = 'button';
reopen.className = 'privacy-reopen';
reopen.textContent = 'Privacy & storage';
document.body.append(dialog, reopen);
const show = () => { dialog.showModal(); dialog.scrollTop=0; dialog.querySelector('button').focus({preventScroll:true}); };
reopen.addEventListener('click', show);
dialog.querySelector('button').addEventListener('click', () => {
  try { localStorage.setItem(noticeKey, 'acknowledged'); } catch { /* Notice remains accessible when storage is blocked. */ }
  dialog.close();
  reopen.focus({preventScroll:true});
});
let acknowledged = false;
try { acknowledged = localStorage.getItem(noticeKey) === 'acknowledged'; } catch { /* Show without requiring storage. */ }
if (!acknowledged) show();
