// Public website only. No student data or telemetry is sent by this module.
const noticeKey = 'bio40c-companion-public-privacy-v1';
const dialog = document.createElement('dialog');
dialog.className = 'privacy-dialog';
dialog.setAttribute('aria-labelledby', 'privacy-title');
dialog.innerHTML = `<h2 id="privacy-title">Your study data stays in this browser</h2>
<p>Your quiz history, grades, assignments, lecture notes and settings are saved locally in the browser profile you use on this device. This website does not upload that study data to the creator, your instructor, classmates or GitHub.</p>
<ul>
<li><strong>No automatic sync:</strong> another browser, browser profile, device or website address has a separate copy.</li>
<li><strong>Keep a backup:</strong> clearing site data, resetting your browser, or ending a private-browsing session can erase your work. Use <strong>Settings &amp; backup → Export backup</strong>, then restore that file where you want to continue. Browser storage can also be evicted or blocked.</li>
<li><strong>Shared device?</strong> anyone using the same browser profile may see your work. The site does not encrypt it. Other pages on this same GitHub Pages domain may access its browser storage. Avoid sensitive personal information.</li>
<li><strong>Backup files contain your data:</strong> keep them somewhere private; do not post them as GitHub issues or share them accidentally.</li>
<li><strong>Hosting is different from study data:</strong> GitHub Pages receives normal website requests and logs visitors’ IP addresses for security. This site adds no analytics, advertising, tracking cookies or remote fonts. External links have their own privacy practices.</li>
</ul>
<p><a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages" target="_blank" rel="noopener noreferrer">About GitHub Pages hosting</a> · <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub privacy statement</a></p>
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
