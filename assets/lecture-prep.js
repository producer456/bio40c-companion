import { lectureGuides } from "./lecture-guides.js";
import { lectureBriefings } from './lecture-briefings.js';
import { sourceSessions } from './source-study-data.js';
import { sourceURL } from './source-files.js';
import { validateLearning, learningCard, collectLearning, bindLearning } from './learning-activities.js';
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const label = (day) =>
  new Date(day + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
let selectedDate = "";
export function lectureDates(schedule) {
  if (!schedule) return [];
  const dates = [];
  for (
    let time = Date.parse(schedule.termStart + "T12:00:00Z");
    time <= Date.parse(schedule.termEnd + "T12:00:00Z");
    time += 86400000
  ) {
    const date = new Date(time);
    if (schedule.lectureDays.includes(date.getUTCDay()))
      dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}
function localClock(schedule, now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: schedule.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
export function nextLecture(schedule, now = new Date()) {
  if (!schedule) return "";
  const clock = localClock(schedule, now);
  return (
    lectureDates(schedule).find(
      (date) =>
        date > clock.date ||
        (date === clock.date && clock.time < schedule.lectureEnd),
    ) ?? ""
  );
}
export function lecturePhase(schedule, day, now = new Date()) {
  const clock = localClock(schedule, now);
  if (
    day < clock.date ||
    (day === clock.date && clock.time >= schedule.lectureEnd)
  )
    return "After class";
  if (day === clock.date && clock.time >= schedule.lectureStart)
    return "During class";
  return "Before class";
}
export function validateLecturePrep(state) {
  if (state.lecturePrep === undefined) return;
  if (
    !state.lecturePrep ||
    typeof state.lecturePrep !== "object" ||
    Array.isArray(state.lecturePrep) ||
    Object.keys(state.lecturePrep).length > 200
  )
    throw Error("Invalid lecture preparation.");
  for (const [day, record] of Object.entries(state.lecturePrep)) {
    validateLearning(record?.learning);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day ||
      !record ||
      (record.quizSource !== undefined && (typeof record.quizSource !== 'string' || !/^(source-\d{2})?$/.test(record.quizSource))) ||
      (record.slideDeck !== undefined && (typeof record.slideDeck !== 'string' || (record.slideDeck !== '' && !sourceSessions.some(session => session.kind === 'lecture' && session.source === record.slideDeck && session.unit === record.unit)))) ||
      !Object.hasOwn(lectureGuides, record.unit) ||
      typeof record.notes !== "string" ||
      record.notes.length > 4000 ||
      !Array.isArray(record.discussed) ||
      record.discussed.length > 18 ||
      record.discussed.some((id) => !/^([a-z]+)-[0-2]$/.test(id)) ||
      !Number.isFinite(record.modified)
    )
      throw Error("Invalid saved lecture preparation.");
  }
}
export function saveLecturePrep(state, schedule, day, record) {
  if (!lectureDates(schedule).includes(day))
    throw Error("Choose a registered lecture date.");
  const next = structuredClone(state);
  next.lecturePrep ??= {};
  next.lecturePrep[day] = { ...record, modified: Date.now() };
  validateLecturePrep(next);
  return next;
}
export function lectureQuiz(course, state, day) {
  const record = state.lecturePrep?.[day],
    unit = course.units.find((u) => u.id === record?.unit);
  if (!unit) return { title: "Choose a lecture topic", questions: [] };
  const number = lectureDates(course.schedule).indexOf(day) + 1;
  const questions = course.questions.filter(
    (q) =>
      q.unit === unit.id &&
      (!record.quizSource ||
        q.refs.some((ref) => ref.source === record.quizSource)),
  );
  return { title: `Quiz on Lecture ${number} — ${unit.title}`, questions, day };
}
export function quizCard(course, state, day = selectedDate) {
  const quiz = lectureQuiz(course, state, day),
    record = state.lecturePrep?.[day];
  if (!record) return "";
  const sources = [
    ...new Set(
      course.questions
        .filter((q) => q.unit === record.unit)
        .flatMap((q) => q.refs.map((ref) => ref.source)),
    ),
  ];
  return `<section class="card"><h2>${escape(quiz.title)}</h2><label>Question sources<select id="prep-quiz-source"><option value="">All cited sources for this unit</option>${sources.map((id) => `<option value="${id}" ${record.quizSource === id ? "selected" : ""}>${escape(course.sources.find((s) => s.id === id)?.title ?? id)}</option>`).join("")}</select></label><p>${quiz.questions.length} questions from the existing source-referenced bank. Includes the source’s cited questions, not necessarily every slide. The lecture label uses your selected topic; it is not an automatic match to the lecture recording.</p><button data-lecture-quiz="${day}" ${quiz.questions.length ? "" : "disabled"}>Start this lecture quiz</button></section>`;
}
export function lecturePreview(schedule) {
  const next = nextLecture(schedule);
  if (!next) return "";
  return `<p class="lecture-preview"><a href="#lecture">Optional lecture prep · ${escape(label(next))} →</a></p>`;
}
export function lectureBriefing(course, source, native = false) {
  const session = sourceSessions.find(item => item.kind === 'lecture' && item.source === source);
  const briefing = lectureBriefings[source];
  if (!session || !briefing) return '';
  const link = page => native
    ? `<button class="quiet" data-source="${escape(source)}" data-page="${page}">Open slide</button>`
    : `<a href="${escape(sourceURL(source, page, course.originalFilesHosted === true))}" target="_blank" rel="noopener noreferrer">Open slide</a>`;
  return `<section class="card lecture-briefing" id="lecture-briefing" data-topic="${escape(session.unit)}" aria-labelledby="briefing-title"><span class="eyebrow">SUPPLIED SLIDES · COMPANION BRIEFING</span><h2 id="briefing-title" tabindex="-1">Lecture summary: ${escape(session.title)}</h2><p>${escape(briefing.summary)}</p><h3>Likely learning goal</h3><p>${escape(briefing.focus)}</p><h3>Key points to watch for</h3><ul>${briefing.highlights.map(point => `<li><strong>PDF p. ${point.page}:</strong> ${escape(point.text)} ${link(point.page)}</li>`).join('')}</ul><h3>Good moments to engage with your teacher</h3><ul>${session.stops.map(stop => `<li><strong>PDF p. ${stop.page} · ${escape(stop.title)}:</strong> ${escape(stop.prompt)}</li>`).join('')}</ul><h3>Questions worth asking</h3><ol>${session.stops.map(stop => `<li>${escape(stop.ask)} <span class="muted">PDF p. ${stop.page}</span></li>`).join('')}</ol><p class="muted">This is a selected study summary of the supplied slides, not a transcript, full slide-by-slide summary or confirmation of what your teacher will emphasize. Choose the deck assigned for this class date.</p></section>`;
}
export function lecturePage(course, state, native = false) {
  const schedule = course.schedule,
    dates = lectureDates(schedule);
  if (!dates.length) return "<p>No lecture schedule is configured.</p>";
  const next = nextLecture(schedule);
  if (!dates.includes(selectedDate)) selectedDate = next || dates.at(-1);
  const record = state.lecturePrep?.[selectedDate];
  const unit = course.units.find((u) => u.id === record?.unit);
  const guide = unit && lectureGuides[unit.id];
  const deckOptions = sourceSessions.filter(session => session.kind === 'lecture').map(session => {
    const topic = course.units.find(item => item.id === session.unit)?.title ?? session.unit;
    return `<option value="${escape(session.source)}" ${record?.slideDeck === session.source ? 'selected' : ''}>${escape(topic)} · ${escape(session.title)}</option>`;
  }).join('');
  const deckPicker = `<label class="wide">Teacher's lecture slide deck<select id="prep-deck"><option value="">Choose the slides assigned for this class…</option>${deckOptions}</select></label>`;
  const briefing = record?.slideDeck ? lectureBriefing(course, record.slideDeck, native) : '<section class="card lecture-briefing-prompt"><h2>Lecture summary & questions</h2><p>Choose one of your teacher’s slide decks above to see its summary, key points, likely learning goal, moments to speak up, and questions to ask.</p></section>';
  return `<p class="lede">An optional way to prepare a conversation with your teacher. Pick the actual topic for this lecture; the registration schedule does not assign topics to dates.</p><section class="card"><div class="form-grid"><label>Lecture date<select id="prep-date">${dates.map((day) => `<option value="${day}" ${day === selectedDate ? "selected" : ""}>${escape(label(day))}</option>`).join("")}</select></label><label>Topic for this lecture<select id="prep-unit"><option value="">Choose the topic Woods has assigned…</option>${course.units.map((u) => `<option value="${u.id}" ${u.id === unit?.id ? "selected" : ""}>${escape(u.title)}</option>`).join("")}</select></label>${deckPicker}</div><p><strong>${lecturePhase(schedule, selectedDate)}</strong> · ${escape(label(selectedDate))} · 9:00–10:50 AM · Room 8403</p><p class="muted">Regular Tuesday/Thursday registration slots, in Pacific time. Check announcements for holidays and schedule changes. This panel does not send notifications.</p><p role="status" id="prep-status"></p></section>${briefing}${learningCard(course,state,selectedDate)}${guide ? `<section class="card"><h2>Before class: find your uncertain step</h2><ul>${guide.before.map((text) => `<li>${escape(text)}</li>`).join("")}</ul><p>Try: “I think ___ because ___. The step I’m unsure about is ___.” Bring that reasoning, even if it is incomplete.</p><button class="quiet" data-unit="${unit.id}">Review ${escape(unit.title)}</button></section><h2>During class: listen, predict, ask</h2><p>These are suggested discussion areas, not the instructor’s confirmed slide order. Choose a question when it matches what is being taught.</p>${guide.sections.map((section, i) => `<section class="card"><h3>${escape(section.title)}</h3><p><strong>Pay attention to:</strong> ${escape(section.listen)}</p><p><strong>Ask for a live explanation:</strong> ${escape(section.ask)}</p><details><summary>If it still feels unclear</summary><p>${escape(section.followup)}</p><p>After the explanation, try the reasoning again on a new example. Ask the teacher to check the step you changed.</p></details><label class="checkbox"><input type="checkbox" data-discussed="${unit.id}-${i}" ${record.discussed.includes(unit.id + "-" + i) ? "checked" : ""}> Asked or discussed</label></section>`).join("")}<section class="card"><h2>Your question or takeaway</h2><label>Keep the reasoning you want checked, or what clicked in class<textarea id="prep-notes" rows="4" maxlength="4000" placeholder="I thought… The teacher pointed out… On the next example I’ll look for…">${escape(record.notes)}</textarea></label><button id="prep-save">Save lecture notes</button><p role="status" id="prep-notes-status"></p><p class="muted">Based on the ${escape(unit.title)} guide and its source references. These questions are study prompts, not predictions of exam content. Your notes stay in your own course data.</p></section>` : '<section class="card"><h2>Choose this lecture’s topic above</h2><p>Then see what to review beforehand, what to listen for, and questions that invite the teacher to check your reasoning.</p></section>'}`;
}
export function bindLecturePrep(course, state, commit, rerender) {
  const date = document.querySelector("#prep-date"),
    unit = document.querySelector("#prep-unit"),
    deck = document.querySelector('#prep-deck');
  if (!date) return;
  let notes = document.querySelector("#prep-notes");
  const record = () => state.lecturePrep?.[selectedDate];
  const save = (patch, refresh = false) => {
    const previous = record() ?? { unit: unit.value, notes: "", discussed: [] };
    const next = saveLecturePrep(state, course.schedule, selectedDate, {
      ...previous,
      notes: notes?.value ?? previous.notes,
      ...(previous.learning || document.querySelector('#learning-form') ? {learning:collectLearning(previous)} : {}),
      ...patch,
    });
    commit(next);
    state = next;
    if (refresh) rerender();
  };
  if(record())bindLearning(record(),save,rerender);
  unit.onchange = () => {
    if (!unit.value) {
      unit.value = record()?.unit ?? "";
      return;
    }
    try {
      const selected = sourceSessions.find(session => session.source === record()?.slideDeck);
      save({ unit: unit.value, slideDeck: selected?.unit === unit.value ? selected.source : '', quizSource: "" }, true);
    } catch (error) {
      document.querySelector("#prep-status").textContent = error.message;
    }
  };
  deck.onchange = () => {
    const selected = sourceSessions.find(session => session.kind === 'lecture' && session.source === deck.value);
    if (!selected && !record()) return;
    try {
      save({ unit: selected?.unit ?? unit.value, slideDeck: selected?.source ?? '', quizSource: '' }, true);
      document.querySelector('#briefing-title')?.focus();
    } catch (error) {
      document.querySelector('#prep-status').textContent = error.message;
    }
  };
  const source = document.querySelector("#prep-quiz-source");
  if (source)
    source.onchange = () => {
      try {
        save({ quizSource: source.value }, true);
      } catch (error) {
        document.querySelector("#prep-status").textContent = error.message;
      }
    };
  date.onchange = () => {
    try {
      if (record() && (document.querySelector('#learning-form') || notes && notes.value !== record().notes)) save({});
      selectedDate = date.value;
      rerender();
    } catch (error) {
      date.value = selectedDate;
      document.querySelector("#prep-status").textContent = error.message;
    }
  };
  document.querySelectorAll("[data-discussed]").forEach(
    (box) =>
      (box.onchange = () => {
        try {
          const old = record().discussed.filter(
            (id) => id !== box.dataset.discussed,
          );
          save({
            discussed: box.checked ? [...old, box.dataset.discussed] : old,
          });
          document.querySelector("#prep-status").textContent =
            "Saved for this lecture.";
        } catch (error) {
          box.checked = !box.checked;
          document.querySelector("#prep-status").textContent = error.message;
        }
      }),
  );
  document.querySelector("#prep-save")?.addEventListener("click", () => {
    try {
      save({});
      document.querySelector("#prep-notes-status").textContent =
        "Lecture notes saved.";
    } catch (error) {
      document.querySelector("#prep-notes-status").textContent = error.message;
    }
  });
}
