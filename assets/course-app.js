import {CourseConnection} from './course-connection.js';
import {validateHub,timeline,reviewCard,questionsCard,bindHub} from './learning-theme.js';
let connection;
import { validateClarifications, clarificationPage, bindClarifications, gradingConfirmed, pointsGrade, pointsTarget } from './clarifications.js';
import { scheduleCard, registrationState } from './schedule.js';
import { lecturePreview, lecturePage, bindLecturePrep, validateLecturePrep, lectureQuiz, quizCard } from './lecture-prep.js';
import {sourceLink,sourceLibrary} from './source-files.js';
import {validateSourceStudy,sourceStudyCatalog,sourceStudyPanel,bindSourceStudy} from './source-study.js';
let quizTitle = '';
const systemAppearance = matchMedia('(prefers-color-scheme: dark)');
function applyAppearance() {
  document.documentElement.dataset.learning=String(p.learningTheme??false);
  const theme=p.theme ?? 'system';
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.dark=String(theme==='dark' || theme==='dim' || theme==='system' && systemAppearance.matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dim'?'#252529':document.documentElement.dataset.dark==='true'?'#000000':'#f5f5f7');
}
systemAppearance.addEventListener('change',()=>applyAppearance());
(function () {
  let e = document.createElement(`link`).relList;
  if (e && e.supports && e.supports(`modulepreload`)) return;
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e);
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes)
          e.tagName === `LINK` && e.rel === `modulepreload` && n(e);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(e) {
    let t = {};
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      (t.credentials =
        e.crossOrigin === `use-credentials`
          ? `include`
          : e.crossOrigin === `anonymous`
            ? `omit`
            : `same-origin`),
      t
    );
  }
  function n(e) {
    if (e.ep) return;
    e.ep = !0;
    let n = t(e);
    fetch(e.href, n);
  }
})();
function e() {
  if (typeof crypto.randomUUID == `function`) return crypto.randomUUID();
  let e = crypto.getRandomValues(new Uint8Array(16));
  ((e[6] = (e[6] & 15) | 64), (e[8] = (e[8] & 63) | 128));
  let t = Array.from(e, (e) => e.toString(16).padStart(2, `0`)).join(``);
  return (
    t.slice(0, 8) +
    `-` +
    t.slice(8, 12) +
    `-` +
    t.slice(12, 16) +
    `-` +
    t.slice(16, 20) +
    `-` +
    t.slice(20)
  );
}
var t = [
  { id: `application`, name: `Application questions`, weight: 20 },
  { id: `modules`, name: `Canvas modules & activities`, weight: 20 },
  { id: `prelabs`, name: `Pre-labs`, weight: 10 },
  { id: `labs`, name: `Lab activity credit`, weight: 10 },
  { id: `practicals`, name: `Lab practical tests`, weight: 20 },
  { id: `lecture`, name: `Lecture quizzes & final activities`, weight: 20 },
];
function n() {
  return {
    version: 1,
    assignments: [],
    attempts: [],
    rules: structuredClone(t),
    policyConfirmed: !1,
    lastBackup: null,
  };
}
function r(e, t, method = 'weighted') {
  let n = t.map((t) => {
      let n = e.filter((e) => e.category === t.id && e.status !== `excused`),
        r = n.filter(
          (e) => e.earned !== null && e.possible !== null && e.possible > 0,
        ),
        i = r.reduce((e, t) => e + t.possible, 0),
        a = r.reduce((e, t) => e + t.earned, 0),
        o = n.reduce((e, t) => e + (t.possible ?? 0), 0);
      return {
        ...t,
        possible: i,
        earned: a,
        total: o,
        percent: i > 0 ? (a / i) * 100 : null,
        unknown: n.some((e) => e.possible === null),
        remaining: n
          .filter((e) => e.earned === null)
          .reduce((e, t) => e + (t.possible ?? 0), 0),
      };
    }),
    r = n.filter((e) => e.percent !== null).reduce((e, t) => e + t.weight, 0),
    i = n.reduce((e, t) => e + (t.percent ?? 0) * t.weight, 0);
  return { categories: n, current: method === 'points' ? pointsGrade(e) : r > 0 ? i / r : null, activeWeight: r };
}
function i(e, t, n) {
  let i = r(e, t).categories.filter((e) => e.weight > 0);
  if (
    Math.abs(t.reduce((e, t) => e + t.weight, 0) - 100) > 0.001 ||
    i.some((e) => e.total === 0 || e.unknown)
  )
    return {
      required: null,
      reason: `Enter the full set of course assignments and possible points in every category first.`,
    };
  let a = i.reduce((e, t) => e + (t.weight * t.earned) / t.total, 0),
    o = i.reduce((e, t) => e + (t.weight * t.remaining) / t.total, 0);
  if (!o)
    return {
      required: null,
      reason:
        a >= n
          ? `Target already reached with entered scores.`
          : `No ungraded points remain in the entered course.`,
    };
  let s = ((n - a) / o) * 100;
  return {
    required: Math.max(0, s),
    reason:
      s > 100
        ? `Not attainable with the remaining entered points.`
        : `Assumes the same average on remaining work in every category; only as complete as your assignment list.`,
  };
}
function a(e) {
  validateHub(e);
  if (!e || typeof e != `object`) throw Error(`Not a course backup.`);
  if(e.theme!==undefined && !['system','light','dim','dark'].includes(e.theme)) throw Error('Invalid appearance setting.');
  let n = e;
  if (
    n.version !== 1 ||
    !Array.isArray(n.assignments) ||
    !Array.isArray(n.attempts) ||
    !Array.isArray(n.rules)
  )
    throw Error(`Unsupported or incomplete backup.`);
  if (
    n.assignments.length > 1e4 ||
    n.attempts.length > 1e5 ||
    n.rules.length !== 6
  )
    throw Error(`Backup exceeds supported limits.`);
  let r = new Set(t.map((e) => e.id));
  if (
    new Set(n.rules.map((e) => e.id)).size !== 6 ||
    n.rules.some(
      (e) =>
        !r.has(e.id) ||
        typeof e.name != `string` ||
        !Number.isFinite(e.weight) ||
        e.weight < 0,
    ) ||
    Math.abs(n.rules.reduce((e, t) => e + t.weight, 0) - 100) > 0.001
  )
    throw Error(`Category weights must total 100%.`);
  let i = new Set(),
    a = (e) => typeof e == `string` && /^[a-zA-Z0-9_-]{1,100}$/.test(e);
  for (let e of n.assignments) {
    if (
      !a(e.id) ||
      i.has(e.id) ||
      typeof e.title != `string` ||
      !e.title.trim() ||
      !r.has(e.category) ||
      ![`todo`, `done`, `missing`, `excused`].includes(e.status)
    )
      throw Error(`Invalid assignment.`);
    if (
      (i.add(e.id),
      e.possible !== null && (!Number.isFinite(e.possible) || e.possible <= 0))
    )
      throw Error(`Possible points must be positive or unknown.`);
    if (
      e.earned !== null &&
      (!Number.isFinite(e.earned) ||
        e.earned < 0 ||
        e.possible === null ||
        e.earned > e.possible)
    )
      throw Error(`A score must be between zero and possible points.`);
    if (
      typeof e.due != `string` ||
      (e.due !== `` && !/^\d{4}-\d{2}-\d{2}$/.test(e.due)) ||
      !Number.isFinite(e.modified) ||
      typeof e.source != `string`
    )
      throw Error(`Invalid assignment metadata.`);
    if (
      e.due &&
      (!Number.isFinite(Date.parse(e.due)) ||
        new Date(e.due).toISOString().slice(0, 10) !== e.due)
    )
      throw Error(`Invalid calendar date.`);
    if (
      e.docketID !== void 0 &&
      (!Number.isSafeInteger(e.docketID) || e.docketID <= 0)
    )
      throw Error(`Invalid Docket reference.`);
  }
  if (
    new Set(n.attempts.map((e) => e.id)).size !== n.attempts.length ||
    n.attempts.some(
      (e) =>
        !a(e.id) ||
        !a(e.question) ||
        typeof e.correct != `boolean` ||
        !Number.isFinite(e.date) ||
        !Number.isInteger(e.selected) ||
        e.selected < 0 ||
        e.selected > 3,
    )
  )
    throw Error(`Invalid practice history.`);
  if (
    typeof n.policyConfirmed != `boolean` ||
    (n.lastBackup !== null && !Number.isFinite(n.lastBackup))
  )
    throw Error(`Invalid settings.`);
  validateClarifications(n);
  validateLecturePrep(n);
  validateSourceStudy(n);
  return registrationState(structuredClone(n), f?.schedule);
}
function o(e) {
  let t = [],
    n = [],
    r = ``,
    i = !1;
  for (let a = 0; a < e.length; a++) {
    let o = e[a];
    o === `"`
      ? i && e[a + 1] === `"`
        ? ((r += `"`), a++)
        : (i = !i)
      : o === `,` && !i
        ? (n.push(r.trim()), (r = ``))
        : (o ===
              `
` ||
              o === `\r`) &&
            !i
          ? (o === `\r` &&
              e[a + 1] ===
                `
` &&
              a++,
            n.push(r.trim()),
            n.some(Boolean) && t.push(n),
            (n = []),
            (r = ``))
          : (r += o);
  }
  if (i) throw Error(`CSV has an unclosed quote.`);
  return (n.push(r.trim()), n.some(Boolean) && t.push(n), t);
}
function s(t) {
  let r = o(t);
  if (r.length < 2)
    throw Error(`Include a header and at least one assignment.`);
  let i = r.shift().map((e) => e.toLowerCase().replace(/^\uFEFF/, ``));
  for (let e of [`title`, `category`, `possible`])
    if (!i.includes(e))
      throw Error(
        `Required CSV columns: title,category,possible. Optional: earned,due,status.`,
      );
  let s = r.map((t, n) => {
    let r = (e) => t[i.indexOf(e)] ?? ``;
    return {
      id: e(),
      title: r(`title`),
      category: r(`category`),
      possible: r(`possible`) === `` ? null : Number(r(`possible`)),
      earned: r(`earned`) === `` ? null : Number(r(`earned`)),
      due: r(`due`),
      status: r(`status`) || `todo`,
      source: `Reviewed import, row ` + (n + 2),
      modified: Date.now(),
    };
  });
  return (a({ ...n(), assignments: s }), s);
}
function c(e) {
  let t = [...e];
  for (let e = t.length - 1; e > 0; e--) {
    let n = Math.floor(Math.random() * (e + 1));
    [t[e], t[n]] = [t[n], t[e]];
  }
  return t;
}
var l = document.querySelector(`#app`),
  u = `bio40c-companion-public-state-v1`,
  d = !!window.webkit?.messageHandlers.companion,
  f,
  p = n(),
  m = `today`,
  h = ``,
  g = [],
  _ = `digestion`,
  v = [],
  y = 0,
  b = null,
  x = [],
  S = ``,
  C = ``,
  w = !1,
  T = (e) =>
    String(e ?? ``).replace(
      /[&<>"']/g,
      (e) =>
        ({
          "&": `&amp;`,
          "<": `&lt;`,
          ">": `&gt;`,
          '"': `&quot;`,
          "'": `&#39;`,
        })[e],
    ),
  E = (e) => (e === null ? `—` : e.toFixed(1) + `%`),
  D = (e, t, n = ``) =>
    `<button data-action="` + t + `" ` + n + `>` + e + `</button>`,
  O = (e) => f.sources.find((t) => t.id === e)?.title ?? e;
function k(e, t = 1) {
  return sourceLink(f,e,t,d);
}
function A(e) {
  return e.refs
    .map((e) => k(e.source, e.page) + ` · PDF p. ` + e.page)
    .join(`<br>`);
}
function j() {
  try {
    if ((a(p), w))
      throw Error(
        `Existing unreadable backup is protected. Restore a valid backup first.`,
      );
    d
      ? window.webkit.messageHandlers.companion.postMessage({
          action: `save`,
          state: p,
        })
      : localStorage.setItem(u, JSON.stringify(p));
  } catch (e) {
    h =
      `Could not save changes: ` +
      String(e) +
      `. Export a backup before closing this page.`;
  }
}
function M(e) {
  ((m = e), (location.hash = e), U(), document.querySelector(`main`)?.focus());
}
function N(e) {
  return (
    `<figure><a href="./figures/` +
    e.id +
    `.png" target="_blank" rel="noopener"><img src="./figures/` +
    e.id +
    `.png" alt="` +
    T(e.title) +
    ` — supplied textbook diagram; open full size" loading="lazy"></a><figcaption>OpenStax Anatomy & Physiology 2e · PDF p. ` +
    f.figurePages[e.id] +
    ` · <a href="https://openstax.org/details/books/anatomy-and-physiology-2e" target="_blank" rel="noopener">Access for free at openstax.org.</a> · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a></figcaption></figure>`
  );
}
const featureSpaces={
 today:{title:'Today',kind:'Daily agenda',symbol:'◷'},
 course:{title:'Course library',kind:'Reference library',symbol:'◎'},
 lecture:{title:'Lecture prep',kind:'Lecture notebook',symbol:'◉'},
 practice:{title:'Practice',kind:'Recall & application',symbol:'✎'},
 assignments:{title:'Assignments',kind:'Work tracker',symbol:'☷'},
 grades:{title:'Grades',kind:'Grade calculator',symbol:'↗'},
 clarifications:{title:'Course details',kind:'Instructor record',symbol:'✓'},
 settings:{title:'Settings & backup',kind:'Data & preferences',symbol:'⚙'}
};
function P(e) {
  const space=featureSpaces[m]??featureSpaces.settings;
  applyAppearance();
  ((l.innerHTML =
    `<a class="skip-content" href="#main-content">Skip to content</a><aside class="sidebar"><a class="brand" href="#today"><span class="brandmark">40<span>C</span></span><span>BIOLOGY<br><small>COURSE COMPANION</small></span></a><div class="term">ANATOMY & PHYSIOLOGY III</div><nav aria-label="Main navigation">` +
    [
      [`today`, `◷`, `Today`],
      [`course`, `◎`, `Course library`],
      [`lecture`, `◉`, `Lecture prep`],
      [`practice`, `✎`, `Practice`],
      [`assignments`, `☷`, `Assignments`],
      [`grades`, `↗`, `Grades`],
      [`clarifications`, `✓`, `Course details`],
      [`settings`, `⚙`, `Settings & backup`],
    ]
      .map(
        ([e, t, n]) =>
          `<a href="#` +
          e +
          `" ` +
          (m === e ? `aria-current="page"` : ``) +
          `><span aria-hidden="true">` +
          t +
          `</span>` +
          n +
          `</a>`,
      )
      .join(``) +
    `</nav><label class="appearance-control">Presentation<select id="learning-theme"><option value="standard" ${!p.learningTheme?'selected':''}>Standard</option><option value="learning" ${p.learningTheme?'selected':''}>Learning</option></select></label><label class="appearance-control">Appearance<select id="appearance">${['system','light','dim','dark'].map(theme=>`<option value="${theme}" ${(p.theme ?? 'system')===theme?'selected':''}>${theme[0].toUpperCase()+theme.slice(1)}</option>`).join('')}</select></label><div class="sidebar-note"><span class="dot"></span> ` +
    (d ? `Your private companion` : `No account needed`) +
    `<p>` +
    (d
      ? `Coursework syncs through your private Mac.`
      : `Progress stays in this browser. Export a backup to keep it safe.`) +
    `</p></div></aside><div class="workspace space-${m}" data-space="${m}" data-session="${m==='practice'&&v.length&&y<v.length?'active':'idle'}"><header><span>FOOTHILL · BIO 40C <span class="space-breadcrumb">/ ${space.title}</span></span><span class="badge">STUDENT-BUILT · PREVIEW</span></header><main id="main-content" tabindex="-1"><div class="space-heading"><div><div class="eyebrow">${space.kind}</div><h1>${space.title}</h1></div><span class="space-symbol" aria-hidden="true">${space.symbol}</span></div>` +
    (h || S
      ? `<div class="notice" role="status">` +
        T(h || S) +
        D(`Dismiss`, `dismiss`, `class="quiet"`) +
        `</div>`
      : ``) +
    `<div class="feature-body">` + (['today','assignments'].includes(m)?timeline(p,connection,m==='assignments'):'') + e + (m==='settings'?(connection?.panel()??''):'') + (['lecture','today'].includes(m)?reviewCard(f,p,d):'') + (m==='lecture'?questionsCard(p):'') +
    `</div></main><footer>Built for learning together. Unofficial course companion · Content ` +
    T(f.version) +
    `<br>Original practice questions, not official exam questions. Diagrams: OpenStax · Access for free at openstax.org. · CC BY-NC-SA 4.0.</footer></div>`),
    J());
}
function F() {
  let e = p.assignments
      .filter((e) => e.status === `todo` || e.status === `missing`)
      .sort((e, t) => (e.due || `9999`).localeCompare(t.due || `9999`))
      .slice(0, 5),
    t = r(p.assignments, p.rules, p.gradingMethod),
    n = p.attempts.length,
    i = p.attempts.filter((e) => e.correct).length;
  return (
    `<div class="agenda-layout"><div class="agenda-main"><section class="study-start"><div><span class="eyebrow">BIO 40C / STUDY DESK</span><h2>Ready for a little recall?</h2><p>Digestion, filtration, hormones, immunity and reproduction.</p></div><a class="button" href="#course">Open course library <span aria-hidden="true">↗</span></a></section><div class="stats"><article><span>Graded work</span><strong>` +
    E(t.current) +
    `</strong><small>` + (gradingConfirmed(p) ? 'Confirmed grading method' : 'Provisional grading method · confirm in Course details') + `</small></article><article><span>Practice answers</span><strong>` +
    n +
    `</strong><small>` +
    (n
      ? Math.round((i / n) * 100) + `% correct across attempts`
      : `Your first session starts here`) +
    `</small></article><article><span>Open assignments</span><strong>` +
    p.assignments.filter((e) => e.status === `todo` || e.status === `missing`)
      .length +
    `</strong><small>Only assignments you have entered</small></article></div><div class="section-heading"><h2>On your horizon</h2><a href="#assignments">Manage assignments →</a></div><section class="card">` +
    (e.length
      ? e
          .map(
            (e) =>
              `<div class="list-row"><div><strong>` +
              T(e.title) +
              `</strong><small>` +
              T(e.due || `Date not set`) +
              ` · ` +
              T(e.status) +
              `</small></div><span>` +
              T(e.possible ?? `?`) +
              ` pts</span></div>`,
          )
          .join(``)
      : `<div class="empty"><h3>A clean slate.</h3><p>Add your assignments or import a reviewed list. Old syllabus dates have not been turned into deadlines.</p><a href="#assignments">Add your first assignment →</a></div>`) +
    `</section></div><aside class="agenda-reference">` + scheduleCard(f.schedule,p) + lecturePreview(f.schedule) + `</aside></div><div class="section-heading"><h2>Explore the course</h2><a href="#course">All six units →</a></div><div class="unit-grid">` +
    f.units.slice(0, 3).map(I).join(``) +
    `</div>` +
    (d
      ? `<section class="card"><h2>Plan my next study session</h2><p>Your deadlines and weakest practiced topics help prioritize the next step.</p>` +
        D(`Build my study plan`, `plan`) +
        `<div class="response" id="tutor-result">` +
        T(C) +
        `</div></section>`
      : ``)
  );
}
function I(e) {
  let t = f.questions.filter((t) => t.unit === e.id).length;
  return (
    `<button class="unit-card" data-unit="` +
    e.id +
    `" data-topic="` + e.id +
    `"><span class="unit-symbol">` +
    {
      digestion: `01`,
      urinary: `02`,
      balance: `03`,
      endocrine: `04`,
      immune: `05`,
      reproduction: `06`,
    }[e.id] +
    `</span><h3>` +
    T(e.title) +
    `</h3><p>` +
    T(e.subtitle) +
    `</p><small>` +
    t +
    ` practice questions · Ch. ` +
    e.chapters +
    `</small><span class="arrow">↗</span></button>`
  );
}
function L() {
  let e = f.units.find((e) => e.id === _);
  return (
    `<p class="lede">Lecture objectives first. Textbook explanations and figures alongside them.</p><div class="unit-grid">` +
    f.units.map(I).join(``) +
    `</div>` + sourceStudyPanel(f,p,d) + sourceStudyCatalog(f,p,_,d) + sourceLibrary(f,d) + `<section class="card unit-detail"><div><span class="eyebrow">TEXTBOOK SUPPORT · CHAPTERS ` +
    e.chapters +
    `</span><h2>` +
    T(e.title) +
    `</h2><h3>What you should be able to explain</h3><ul>` +
    e.objectives.map((e) => `<li>` + T(e) + `</li>`).join(``) +
    `</ul><h3>The essentials</h3>` +
    e.guide.map((e) => `<p>` + T(e) + `</p>`).join(``) +
    D(`Practice this unit`, `unit-practice`) +
    `<details><summary>Source material</summary><ul>` +
    e.sources.map((e) => `<li>` + k(e) + `</li>`).join(``) +
    `</ul><p>` +
    (d
      ? `Open your original class documents above. The full textbook opens at OpenStax.`
      : `Open the original documents above. PDF links jump to the cited page where supported. Shared for noncommercial study; do not sell. The full textbook opens at OpenStax.`) +
    `</p></details></div>` +
    N(e) +
    `</section>` +
    (d
      ? `<section class="card"><h2>Work through it with Marcus</h2><label>Your question or explanation<textarea id="tutor-question" placeholder="Explain your understanding or ask about a mechanism."></textarea></label>` +
        D(`Ask Marcus`, `tutor`) +
        `<div class="response" id="tutor-result">` +
        T(C) +
        `</div></section>`
      : ``)
  );
}
function R() {
  if (v.length && y < v.length) {
    let e = v[y],
      t = f.units.find((t) => t.id === e.unit);
    return (
      `<div class="section-heading"><p>` +
      T(quizTitle || t.title) +
      ` · Question ` +
      (y + 1) +
      ` of ` +
      v.length +
      `</p>` +
      D(`End session`, `end`, `class="quiet"`) +
      `</div><progress value="` +
      y +
      `" max="` +
      v.length +
      `" aria-label="Session progress"></progress><section class="card quiz" data-topic="` + e.unit + `"><span class="topic-tag">` + String(f.units.indexOf(t)+1).padStart(2,'0') + ` · ` + T(t.title) + `</span><span class="eyebrow">` +
      T(e.objective) +
      `</span><h2>` +
      T(e.prompt) +
      `</h2>` +
      (e.image
        ? `<details><summary>Open the supplied reference figure</summary>` +
          N(t) +
          `</details>`
        : ``) +
      `<div class="choices">` +
      e.choices
        .map(
          (t, n) =>
            `<button data-answer="` +
            n +
            `" aria-label="Answer ` + String.fromCharCode(65 + n) + `: ` + T(t) + `" ` +
            (b === null ? `` : `disabled`) +
            ` class="` +
            (b === null
              ? ``
              : n === e.correct
                ? `right`
                : n === b
                  ? `wrong`
                  : ``) +
            `"><span>` +
            String.fromCharCode(65 + n) +
            `</span>` +
            T(t) +
            `</button>`,
        )
        .join(``) +
      `</div>` +
      (b === null
        ? ``
        : `<section class="feedback" aria-live="polite"><h3>` +
          (b === e.correct ? `That’s right.` : `A useful one to revisit.`) +
          `</h3><p><strong>Correct answer: ` +
          T(e.choices[e.correct]) +
          `</strong></p><p>` +
          T(e.explanation) +
          `</p><details><summary>Why the other answers don’t fit</summary>` +
          e.rationales
            .map((t, n) => (n === e.correct ? `` : `<p>` + T(t) + `</p>`))
            .join(``) +
          `</details><p class="sources">` +
          A(e) +
          `</p>` +
          D(y + 1 === v.length ? `See results` : `Next question`, `next`) +
          `</section>`) +
      `</section>`
    );
  }
  return (
    (v.length
      ? `<section class="card result"><span class="eyebrow">SESSION COMPLETE</span><h2>` +
        x.filter(Boolean).length +
        ` / ` +
        v.length +
        ` correct</h2><p>Your answers are saved. A missed question is a direction for your next study session.</p>` +
        D(`Retry missed questions`, `retry-session`) +
        `</section>`
      : ``) +
    `<p class="lede">Mixed-source practice: lecture slides, lab handouts and textbook support. Every question includes feedback and references.</p><p>For document-specific guided checks, open <a href="#course">Course library → Study this lecture</a>.</p><p><a href="#lecture">Quiz by lecture date and topic →</a> Choose a topic and optionally filter by a cited lecture source.</p><div class="practice-grid"><section class="card"><span class="eyebrow">10 QUESTIONS</span><h2>One topic at a time</h2><label>Choose a unit<select id="practice-unit">` +
    f.units
      .map(
        (e) =>
          `<option value="` +
          e.id +
          `" ` +
          (e.id === _ ? `selected` : ``) +
          `>` +
          T(e.title) +
          `</option>`,
      )
      .join(``) +
    `</select></label>` +
    D(`Start topic quiz`, `topic`) +
    `</section><section class="card"><span class="eyebrow">UP TO 30 QUESTIONS</span><h2>Lab-test preparation</h2><label>Study set<select id="lab-set"><option value="1">Set 1 · digestion, kidneys & balance</option><option value="2">Set 2 · endocrine, immunity & reproduction</option></select></label><p class="muted">Provisional topic grouping; confirm actual test coverage with your instructor.</p>` +
    D(`Start lab practice`, `lab`) +
    `</section><section class="card"><span class="eyebrow">UP TO 60 QUESTIONS</span><h2>Connect the whole course</h2><p>A mixed practice exam across all six units. No timer. Explanations after each answer.</p>` +
    D(`Start cumulative exam`, `exam`) +
    `</section><section class="card"><span class="eyebrow">FOCUS YOUR EFFORT</span><h2>Revisit weak topics</h2><p>Practice questions whose latest recorded answer was incorrect.</p>` +
    D(`Review missed questions`, `missed`) +
    `</section></div><section class="card"><h2>Your progress by unit</h2>` +
    f.units
      .map((e) => {
        let t = p.attempts.filter((t) =>
          f.questions.some((n) => n.id === t.question && n.unit === e.id),
        );
        return (
          `<div class="list-row"><strong>` +
          T(e.title) +
          `</strong><span>` +
          (t.length
            ? Math.round((t.filter((e) => e.correct).length / t.length) * 100) +
              `% · ` +
              t.length +
              ` attempts`
            : `Not practiced yet`) +
          `</span></div>`
        );
      })
      .join(``) +
    `</section>`
  );
}
function z(e) {
  return (
    `<form id="assignment-form" class="form-grid"><input type="hidden" name="id" value="` +
    T(e?.id ?? ``) +
    `"><label class="wide">Assignment title<input name="title" required maxlength="200" value="` +
    T(e?.title ?? ``) +
    `"></label><label>Category<select name="category">` +
    p.rules
      .map(
        (t) =>
          `<option value="` +
          t.id +
          `" ` +
          (e?.category === t.id ? `selected` : ``) +
          `>` +
          T(t.name) +
          `</option>`,
      )
      .join(``) +
    `</select></label><label>Due date (optional)<input type="date" name="due" value="` +
    T(e?.due ?? ``) +
    `"></label><label>Points possible (blank = unknown)<input name="possible" type="number" min="0.01" step="any" value="` +
    (e?.possible ?? ``) +
    `"></label><label>Score earned (blank = ungraded)<input name="earned" type="number" min="0" step="any" value="` +
    (e?.earned ?? ``) +
    `"></label><label>Status<select name="status">` +
    [`todo`, `done`, `missing`, `excused`]
      .map(
        (t) =>
          `<option ` +
          (t === e?.status ? `selected` : ``) +
          `>` +
          t +
          `</option>`,
      )
      .join(``) +
    `</select></label><div class="form-actions"><button type="submit">` +
    (e ? `Save changes` : `Add assignment`) +
    `</button>` +
    (e ? D(`Cancel edit`, `cancel-edit`, `type="button" class="quiet"`) : ``) +
    `</div></form>`
  );
}
function B() {
  return (
    `<p class="lede">Your checklist and your gradebook are connected, but completion and scores are separate.</p><section class="card assignment-create"><h2>Add an assignment</h2><div id="assignment-editor">` +
    z() +
    `</div></section><section class="card assignment-ledger"><div class="section-heading"><h2>Your assignments</h2>` +
    D(`Add syllabus templates`, `templates`, `class="quiet"`) +
    `</div><p class="muted">Templates have no dates and must be checked against Canvas. Unknown points remain blank.</p><div class="table-wrap"><table><thead><tr><th>Assignment</th><th>Due</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead><tbody>` +
    p.assignments
      .map(
        (e) =>
          `<tr><td><strong>` +
          T(e.title) +
          `</strong><small>` +
          T(p.rules.find((t) => t.id === e.category)?.name) +
          `</small></td><td>` +
          T(e.due || `Not set`) +
          `</td><td>` +
          T(e.status) +
          `</td><td>` +
          (e.earned ?? `—`) +
          ` / ` +
          (e.possible ?? `?`) +
          `</td><td>` +
          D(`Edit`, `edit`, `data-id="` + e.id + `" class="quiet"`) +
          ` ` +
          D(`Remove`, `remove`, `data-id="` + e.id + `" class="quiet"`) +
          (d
            ? ` ` +
              D(
                e.docketID ? `Review Docket update` : `Review for Docket`,
                `docket`,
                `data-id="` + e.id + `" class="quiet"`,
              )
            : ``) +
          `</td></tr>`,
      )
      .join(``) +
    `</tbody></table></div>` +
    (p.assignments.length
      ? ``
      : `<p class="empty">Nothing entered yet. Add an assignment or import a reviewed list.</p>`) +
    `</section><section class="card assignment-import"><h2>Import and review</h2><p>Paste CSV or choose a CSV file. Category IDs: ` +
    t.map((e) => e.id).join(`, `) +
    `.</p><pre>title,category,possible,earned,due,status
Week 1 module,modules,,,,todo</pre><label>CSV file<input type="file" id="csv-file" accept=".csv,text/csv"></label><label>Assignment CSV<textarea id="csv-input" rows="5" placeholder="Paste structured assignment details here"></textarea></label>` +
    D(`Preview import`, `preview-import`) +
    `<div id="import-preview">` +
    (g.length
      ? `<h3>` +
        g.length +
        ` assignments ready to review</h3>` +
        g
          .map(
            (e, t) =>
              `<div class="import-row"><input aria-label="Imported title ` +
              (t + 1) +
              `" data-pending="` +
              t +
              `" value="` +
              T(e.title) +
              `"><span>` +
              T(e.category) +
              ` · ` +
              (e.possible ?? `unknown`) +
              ` points · ` +
              T(e.due || `no date`) +
              `</span></div>`,
          )
          .join(``) +
        `<p>Review this list before adding. Exact title/category/date duplicates will be skipped. You can edit all fields after import.</p>` +
        D(`Accept reviewed import`, `accept-import`)
      : ``) +
    `</div></section>`
  );
}
function V() {
  let e = r(p.assignments, p.rules, p.gradingMethod);
  return (
    `<p class="lede">A transparent estimate—not the official Canvas grade.</p>` +
    (gradingConfirmed(p)
      ? ``
      : `<div class="notice">Grading is provisional. <a href="#clarifications">Fill in the confirmed method and any category weights</a> when Woods clarifies them.</div>`) +
    `<div class="stats"><article><span>Grade on graded work</span><strong>` +
    E(e.current) +
    `</strong><small>` +
    (p.gradingMethod === 'points' ? 'Total earned / possible points on graded work' : e.activeWeight + '% of category weight currently has graded work') +
    `</small></article><article><span>Ungraded assignments</span><strong>` +
    p.assignments.filter((e) => e.earned === null && e.status !== `excused`)
      .length +
    `</strong><small>Not silently counted as zeros</small></article><article><span>Grading method</span><strong class="small-number">` + (p.gradingMethod === 'points' ? 'Total points' : 'Weighted') + `</strong><small><a href="#clarifications">Review course details</a></small></article></div><section class="card grade-breakdown"><h2>Category breakdown</h2><div class="table-wrap"><table><thead><tr><th>Category</th><th>Weight</th><th>Graded points</th><th>Category grade</th></tr></thead><tbody>` +
    e.categories
      .map(
        (e) =>
          `<tr><td>` +
          T(e.name) +
          `</td><td>` +
          (p.gradingMethod === 'points' ? 'Not used' : e.weight + '%') +
          `</td><td>` +
          e.earned +
          ` / ` +
          e.possible +
          `</td><td>` +
          E(e.percent) +
          `</td></tr>`,
      )
      .join(``) +
    `</tbody></table></div><p class="muted">` + (p.gradingMethod === 'points' ? 'Total-points grading combines earned and possible points across categories.' : 'Empty categories are excluded and active weights normalized for the current grade.') + ` Missing work remains ungraded until you explicitly enter zero. Excused work is excluded.</p></section><section class="card grade-scenario"><h2>What do I need next?</h2><label>Target course percentage<input id="target" type="number" min="0" max="100" value="90"></label>` +
    D(`Calculate scenario`, `target`) +
    `<div id="target-result" aria-live="polite"></div><p class="muted">Enter all remaining assignments and possible points first. This calculation cannot know about work you haven’t entered.</p></section>`
  );
}
function H() {
  return (
    `<section class="card"><h2>Keep a copy of your progress</h2><p>` +
    (d
      ? `Your personal data is stored in this app and synced through your private Mac.`
      : `Your progress stays in this browser. Clearing site data or using another browser starts a fresh copy.`) +
    `</p><p>Last backup: ` +
    (p.lastBackup
      ? new Date(p.lastBackup).toLocaleString()
      : `Not exported yet`) +
    `</p>` +
    D(`Export backup`, `export`) +
    `<label>Restore a backup (replaces this device’s course data)<input id="backup-file" type="file" accept=".json,application/json"></label>` +
    (d ? D(`Sync personal coursework`, `sync`) : ``) +
    `</section><section class="card"><h2>Instructor clarifications</h2><p>Record confirmed grading rules, meeting times, deadlines and assessment details in <a href="#clarifications">Course details</a>. Each item keeps its own confirmation and change history.</p></section><section class="card"><h2>Course sources</h2><p>Six selected diagrams are rendered from your supplied OpenStax textbook. <a href="./figures/attribution.json" target="_blank">Figure provenance and license</a>.</p><p>Original guide text and questions are student study aids, not official course material. No classmates’ reflections or personal recordings are published.</p></section>`
  );
}
function U() {
  connection?.capture();
  if (m === 'clarifications') { P(clarificationPage(p, f.schedule)); return; }
  if (m === 'lecture') {
    const opened=[...document.querySelectorAll('#learning-activities details')].map(el=>el.open);
    P(lecturePage(f,p,d) + '<section class="card"><h2>Study the full slide deck</h2><p>The briefing above highlights selected pages. Open <a href="#course">Course library</a>, choose the topic, then Study this lecture for guided checkpoints across the supplied slides. Save an optional class date there to associate it with your meeting.</p></section>' + quizCard(f,p));
    document.querySelectorAll('#learning-activities details').forEach((el,i)=>el.open=opened[i]??false);
    return;
  }
  P(
    m === `today`
      ? F()
      : m === `course`
        ? L()
        : m === `practice`
          ? R()
          : m === `assignments`
            ? B()
            : m === `grades`
              ? V()
              : H(),
  );
}
function W(e, t, title='') {
  quizTitle=title;
  if (!e.length) {
    ((h = `No questions in this set yet. Try a topic quiz first.`), U());
    return;
  }
  ((v = c(e).slice(0, t)), (y = 0), (b = null), (x = []), M(`practice`));
}
function G() {
  let e = new Map();
  return (
    [...p.attempts]
      .sort((e, t) => e.date - t.date)
      .forEach((t) => e.set(t.question, t.correct)),
    f.questions.filter((t) => e.get(t.id) === !1)
  );
}
function K(e, t) {
  if (d) {
    window.webkit.messageHandlers.companion.postMessage({
      action: `export`,
      contents: t,
    });
    return;
  }
  let n = URL.createObjectURL(new Blob([t], { type: `application/json` })),
    r = document.createElement(`a`);
  ((r.href = n),
    (r.download = e),
    r.click(),
    setTimeout(() => URL.revokeObjectURL(n), 1e3));
}
function q(e, t = {}) {
  ((S = `Working…`),
    U(),
    window.webkit?.messageHandlers.companion?.postMessage({
      action: e,
      body: t,
    }));
}
function J() {
  connection?.bind();
  bindHub(f,p,next=>{p=a(next);j();},U);
  document.querySelector('#learning-theme')?.addEventListener('change',event=>{p.learningTheme=event.target.value==='learning';j();U();});
  bindSourceStudy(p,next=>{
    if(w)throw Error('Restore a valid backup before saving study responses.');
    const valid=a(next);
    if(!d)localStorage.setItem(u,JSON.stringify(valid));
    else window.webkit.messageHandlers.companion.postMessage({action:'save',state:valid});
    p=valid;
  },U);
  document.querySelector('.skip-content')?.addEventListener('click',event=>{event.preventDefault();const main=document.querySelector('main');main.focus();main.scrollIntoView({block:'start'});});
  document.querySelector('#appearance')?.addEventListener('change',event=>{p.theme=event.target.value;j();applyAppearance();});
  document.querySelectorAll('[data-lecture-quiz]').forEach(button=>button.onclick=()=>{const quiz=lectureQuiz(f,p,button.dataset.lectureQuiz);W(quiz.questions,quiz.questions.length,quiz.title);});
  bindLecturePrep(f,p,next=>{
    if (w) throw Error('Restore a valid backup before saving lecture preparation.');
    const previous=p;
    p=a(next);
    try {
      if (!d) localStorage.setItem(u,JSON.stringify(p));
      else window.webkit.messageHandlers.companion.postMessage({action:'save',state:p,lecturePrep:true});
    } catch(error) {p=previous;throw error;}
  },U);
  bindClarifications(p, next => {
    if (w) throw Error('Restore a valid backup before changing course details.');
    const previous = p;
    p = a(next);
    try {
      if (!d) localStorage.setItem(u, JSON.stringify(p));
      else window.webkit.messageHandlers.companion.postMessage({action:'save', state:p, clarification:true});
    } catch (error) { p = previous; throw error; }
    h = d ? '' : 'Course detail saved.';
    S = d ? 'Saving course detail…' : '';
    U();
  });
  (document
    .querySelectorAll(`[data-source]`)
    .forEach(
      (e) =>
        (e.onclick = () =>
          window.webkit?.messageHandlers.companion?.postMessage({
            action: `source`,
            id: e.dataset.source,
            page: Number(e.dataset.page),
          })),
    ),
    document.querySelectorAll(`[data-unit]`).forEach(
      (e) =>
        (e.onclick = () => {
          ((_ = e.dataset.unit), M(`course`));
        }),
    ),
    document.querySelectorAll(`[data-answer]`).forEach(
      (t) =>
        (t.onclick = () => {
          if (b !== null) return;
          b = Number(t.dataset.answer);
          let n = v[y],
            r = b === n.correct;
          (p.attempts.push({
            id: e(),
            question: n.id,
            selected: b,
            correct: r,
            date: Date.now(),
          }),
            x.push(r),
            j(),
            U());
        }),
    ),
    document
      .querySelectorAll(`[data-action]`)
      .forEach((e) => (e.onclick = () => Y(e.dataset.action, e.dataset.id))),
    document
      .querySelectorAll(`[data-pending]`)
      .forEach(
        (e) =>
          (e.oninput = () => (g[Number(e.dataset.pending)].title = e.value)),
      ));
  let t = document.querySelector(`#assignment-form`);
  t &&
    (t.onsubmit = (n) => {
      n.preventDefault();
      let r = new FormData(t),
        i = (e) => String(r.get(e) ?? ``),
        o = p.assignments.find((e) => e.id === i(`id`)),
        s = {
          id: i(`id`) || e(),
          title: i(`title`).trim(),
          category: i(`category`),
          possible: i(`possible`) === `` ? null : Number(i(`possible`)),
          earned: i(`earned`) === `` ? null : Number(i(`earned`)),
          due: i(`due`),
          status: i(`status`),
          source: o?.source ?? `Manual entry`,
          modified: Date.now(),
          ...(o?.docketID ? { docketID: o.docketID } : {}),
        };
      try {
        ((p = a({
          ...p,
          assignments: [...p.assignments.filter((e) => e.id !== s.id), s],
        })),
          j(),
          U());
      } catch (e) {
        alert(String(e));
      }
    });
  let r = document.querySelector(`#csv-file`);
  r &&
    (r.onchange = async () => {
      let e = r.files?.[0];
      if (e) {
        if (e.size > 2e6) {
          alert(`CSV must be under 2 MB.`);
          return;
        }
        document.querySelector(`#csv-input`).value = await e.text();
      }
    });
  let i = document.querySelector(`#backup-file`);
  i &&
    (i.onchange = async () => {
      let e = i.files?.[0];
      if (e)
        try {
          if (e.size > 25e6) throw Error(`Backup is too large.`);
          let t = a(JSON.parse(await e.text()));
          confirm(
            `Replace the course data on this device with this backup? Export your current data first if needed.`,
          ) && ((p = t), (w = !1), j(), (h = `Backup restored.`), U());
        } catch (e) {
          alert(`Restore failed: ` + String(e));
        }
    });
}
function Y(t, n) {
  if (t === `dismiss`) ((h = ``), (S = ``), U());
  else if (t === `topic`)
    ((_ = document.querySelector(`#practice-unit`).value),
      W(
        f.questions.filter((e) => e.unit === _),
        10,
      ));
  else if (t === `unit-practice`)
    W(
      f.questions.filter((e) => e.unit === _),
      10,
    );
  else if (t === `lab`) {
    let e = document.querySelector(`#lab-set`).value === `1`;
    W(
      f.questions.filter(
        (t) => [`digestion`, `urinary`, `balance`].includes(t.unit) === e,
      ),
      30,
    );
  } else if (t === `exam`) W(f.questions, 60);
  else if (t === `missed`) W(G(), 60);
  else if (t === `next`) (y++, (b = null), U());
  else if (t === `end`)
    confirm(
      `End this practice session? Answers already completed are saved.`,
    ) && ((v = []), U());
  else if (t === `retry-session`)
    W(
      v.filter((e, t) => x[t] === !1),
      60,
    );
  else if (t === `edit`) {
    let e = p.assignments.find((e) => e.id === n);
    ((document.querySelector(`#assignment-editor`).innerHTML = z(e)),
      J(),
      document
        .querySelector(`#assignment-editor`)
        ?.scrollIntoView({ behavior: `smooth` }));
  } else if (t === `cancel-edit`) U();
  else if (t === `remove`)
    confirm(`Remove this assignment?`) &&
      ((p.assignments = p.assignments.filter((e) => e.id !== n)), j(), U());
  else if (t === `preview-import`)
    try {
      ((g = s(document.querySelector(`#csv-input`).value)), U());
    } catch (e) {
      alert(String(e));
    }
  else if (t === `accept-import`) {
    let e = new Set(
        p.assignments.map((e) =>
          [e.title.toLowerCase().trim(), e.category, e.due].join(`|`),
        ),
      ),
      t = [];
    for (let n of g) {
      let r = [n.title.toLowerCase().trim(), n.category, n.due].join(`|`);
      e.has(r) || (t.push(n), e.add(r));
    }
    try {
      ((p = a({ ...p, assignments: [...p.assignments, ...t] })),
        (g = []),
        j(),
        (h =
          t.length +
          ` assignments added. Review dates and points against Canvas.`),
        U());
    } catch (e) {
      alert(String(e));
    }
  } else if (t === `templates`) {
    let t = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 10, 11].forEach((e) =>
      t.push([`Week ` + e + ` module`, `modules`, null]),
    );
    for (let e = 1; e <= 8; e++) t.push([`Pre-lab ` + e, `prelabs`, 10]);
    for (let e = 1; e <= 9; e++) t.push([`Lab activity ` + e, `labs`, 10]);
    (t.push(
      [`Lab test 1`, `practicals`, 70],
      [`Lab test 2`, `practicals`, 70],
      [`Application question check`, `lecture`, 50],
      [`Final activity`, `lecture`, 120],
    ),
      (g = t.map(([t, n, r]) => ({
        id: e(),
        title: t,
        category: n,
        possible: r,
        earned: null,
        due: ``,
        status: `todo`,
        source: `Syllabus PDF pp. 1, 4–5; provisional`,
        modified: Date.now(),
      }))),
      U(),
      document.querySelector(`#import-preview`)?.scrollIntoView());
  } else if (t === `target`) {
    let e = Number(document.querySelector(`#target`).value);
    if (!Number.isFinite(e) || e < 0 || e > 100) {
      alert(`Choose a target from 0 to 100.`);
      return;
    }
    let t = p.gradingMethod === 'points' ? pointsTarget(p.assignments, e) : i(p.assignments, p.rules, e);
    document.querySelector(`#target-result`).innerHTML =
      `<h3>` +
      (t.required === null
        ? `More information needed`
        : E(t.required) + ` average needed`) +
      `</h3><p>` +
      T(t.reason) +
      `</p>`;
  } else if (t === `export`)
    ((p.lastBackup = Date.now()),
      j(),
      K(
        `bio40c-backup-` + new Date().toISOString().slice(0, 10) + `.json`,
        JSON.stringify(p, null, 2),
      ),
      U());
  else if (t === `sync`) q(`sync`);
  else if (t === `docket`) {
    let e = p.assignments.find((e) => e.id === n);
    confirm(
      `Review Docket ` +
        (e.docketID ? `update` : `task`) +
        `:

` +
        e.title +
        `
Due: ` +
        (e.due || `No deadline`) +
        `
Project: Bio 40C

` +
        (e.status === `done`
          ? `This will mark the linked task complete.`
          : `No grade or score will be sent.`) +
        `

Approve?`,
    ) && q(`docket`, { assignment: e });
  } else if (t === `tutor`) {
    let e = document.querySelector(`#tutor-question`).value.trim();
    if (!e) {
      alert(`Enter a question or explanation first.`);
      return;
    }
    q(`tutor`, { unit: f.units.find((e) => e.id === _).id, question: e });
  } else if (t === `plan`) {
    let e = G().map((e) => e.unit),
      t = [...new Set(e)],
      n = p.assignments
        .filter((e) => e.status === `todo` || e.status === `missing`)
        .sort((e, t) => (e.due || `9999`).localeCompare(t.due || `9999`))
        .slice(0, 5);
    ((C =
      `Suggested next steps

` +
      (n.length
        ? n.map(
            (e, t) =>
              t + 1 + `. ` + e.title + ` — ` + (e.due || `confirm deadline`),
          ).join(`
`)
        : `Add current assignment deadlines to prioritize coursework.`) +
      `

Study: ` +
      (t.length
        ? t.map((e) => f.units.find((t) => t.id === e).title).join(`, `)
        : `Start with a topic quiz to identify weak areas.`) +
      `

Suggested session: 10 minutes of source review, 10 practice questions, then explain one missed mechanism aloud.`),
      U(),
      d && q(`plan`, { deadlines: n, weakUnits: t }));
  }
}
window.companionReceive = (e) => {
  let t = e;
  if (t.state)
    try {
      p = a(t.state);
    } catch (e) {
      h = `Could not load synced coursework: ` + String(e);
    }
  if (t.assignmentID && t.docketID) {
    let e = p.assignments.find((e) => e.id === t.assignmentID);
    e && ((e.docketID = t.docketID), (e.modified = Date.now()), j());
  }
  ((S = t.error ?? t.message ?? ``), t.answer && (C = t.answer), U());
};
async function X() {
  let e = await fetch(`./course.json`);
  if (!e.ok) throw Error(`Course package could not be loaded.`);
  ((f = await e.json()), document.body.classList.toggle(`native`, d));
  p = registrationState(p, f.schedule);
  try {
    let e =
      window.companionInitialState ??
      (d ? null : JSON.parse(localStorage.getItem(u) ?? `null`));
    e && (p = a(e));
  } catch {
    ((w = !0),
      (h = `Saved data could not be read. It has not been overwritten. Recover the original browser data or restore a valid backup before making changes.`));
  }
  connection = new CourseConnection({get:()=>p,set:next=>{p=a(next);j();},render:()=>{if(!document.querySelector('textarea:focus,input:focus'))U();},native:d});
  if(w)connection.local.enabled=false;
  window.bio40Connection=connection;
  setTimeout(()=>connection.sync(),1500);
  let t = location.hash.slice(1);
  ([
    `today`,
    `course`,
    `lecture`,
    `practice`,
    `assignments`,
    `grades`,
    `clarifications`,
    `settings`,
  ].includes(t) && (m = t),
    (window.onhashchange = () => {
      let e = location.hash.slice(1);
      [
        `today`,
        `course`,
        `lecture`,
        `practice`,
        `assignments`,
        `grades`,
        `clarifications`,
        `settings`,
      ].includes(e) && ((m = e), U());
    }),
    U(),
    d &&
      window.webkit.messageHandlers.companion.postMessage({ action: `load` }));
}
X().catch((e) => {
  l.innerHTML =
    `<main><h1>Couldn’t load the course</h1><p>` +
    T(e) +
    `</p><p>Reload to try again. Your saved progress has not been removed.</p></main>`;
});
