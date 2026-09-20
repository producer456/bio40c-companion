const items = [
  [
    "method",
    "Grading method",
    "The syllabus lists category weights but also refers to total points.",
  ],
  [
    "weights",
    "Category weights",
    "Application 20%; modules 20%; prelabs 10%; lab activities 10%; practicals 20%; lecture activities 20%.",
  ],
  [
    "meetings",
    "Meeting days and times",
    "The supplied syllabus mixes Tuesday and Friday meetings and older dates.",
  ],
  [
    "revision",
    "Revision credit",
    "One passage caps revised application answers at 8 points; another mentions full credit.",
  ],
  [
    "extra",
    "Extra credit",
    "One passage says none; another describes make-up extra credit for missed labs.",
  ],
  [
    "assessments",
    "Assessment format and coverage",
    "Application-question check, collaborative lab tasks and a final case-study activity. Confirm current format and coverage.",
  ],
];
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const latest = (state, key) => state.clarifications?.[key]?.at(-1);
const confirmed = (state, key) => {
  const record = latest(state, key);
  return (
    record?.status === "confirmed" &&
    JSON.stringify(record.value) === JSON.stringify(currentValue(state, key))
  );
};
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function gradingConfirmed(state) {
  const method = latest(state, "method");
  const weights = latest(state, "weights");
  if (!method && !weights) return state.policyConfirmed;
  return (
    confirmed(state, "method") &&
    (state.gradingMethod === "points" || confirmed(state, "weights"))
  );
}
export function validateClarifications(state) {
  if (
    state.gradingMethod !== undefined &&
    !["weighted", "points"].includes(state.gradingMethod)
  )
    throw Error("Invalid grading method.");
  if (state.clarifications === undefined) return;
  if (
    !state.clarifications ||
    typeof state.clarifications !== "object" ||
    Array.isArray(state.clarifications)
  )
    throw Error("Invalid course details.");
  const entries = Object.entries(state.clarifications);
  if (entries.length > 10006) throw Error("Too many course details.");
  for (const [key, history] of entries) {
    if (
      !items.some(([id]) => key === id) &&
      !/^deadline:[A-Za-z0-9_-]{1,100}$/.test(key)
    )
      throw Error("Unknown course detail.");
    if (!Array.isArray(history) || history.length > 1000)
      throw Error("Invalid clarification history.");
    for (const record of history) {
      if (
        !record ||
        !["confirmed", "unresolved"].includes(record.status) ||
        !validDate(record.date) ||
        typeof record.reference !== "string" ||
        record.reference.length > 1000 ||
        !Number.isFinite(record.savedAt)
      )
        throw Error("Invalid clarification record.");
      if (record.previous === undefined)
        throw Error("Missing previous course value.");
      for (const value of [record.value, record.previous]) {
        if (key === "weights") {
          if (
            !Array.isArray(value) ||
            value.length !== 6 ||
            new Set(value.map((r) => r.id)).size !== 6 ||
            value.some(
              (r) =>
                !state.rules.some((rule) => rule.id === r.id) ||
                !Number.isFinite(r.weight) ||
                r.weight < 0,
            ) ||
            Math.abs(value.reduce((sum, r) => sum + r.weight, 0) - 100) > 0.001
          )
            throw Error("Category weights must total 100%.");
        } else if (typeof value !== "string" || value.length > 4000)
          throw Error("Invalid clarification value.");
      }
      if (key === "method" && !["weighted", "points"].includes(record.value))
        throw Error("Choose a grading method.");
      if (
        key.startsWith("deadline:") &&
        record.status === "confirmed" &&
        !validDate(record.value)
      )
        throw Error("Choose a valid deadline.");
    }
  }
}
export function currentValue(state, key) {
  if (key === "method") return state.gradingMethod ?? "weighted";
  if (key === "weights")
    return state.rules.map(({ id, weight }) => ({ id, weight }));
  if (key.startsWith("deadline:"))
    return state.assignments.find((a) => key === "deadline:" + a.id)?.due ?? "";
  return latest(state, key)?.value ?? "";
}
export function confirmDetail(
  state,
  key,
  value,
  date,
  reference,
  status = "confirmed",
) {
  const next = structuredClone(state);
  if (!validDate(date))
    throw Error("Enter the date Woods clarified this item.");
  if (status === "confirmed" && typeof value === "string" && !value.trim())
    throw Error("Fill in the correction or confirm the current value.");
  if (
    key.startsWith("deadline:") &&
    !next.assignments.some((a) => key === "deadline:" + a.id)
  )
    throw Error("Choose an existing assignment.");
  next.clarifications ??= {};
  const history = next.clarifications[key] ?? [];
  const previous = currentValue(state, key);
  const record = {
    value: status === "unresolved" ? previous : value,
    previous,
    date,
    reference: reference.trim(),
    status,
    savedAt: Date.now(),
  };
  next.clarifications[key] = [...history, record];
  validateClarifications(next);
  if (status === "confirmed") {
    if (key === "method") next.gradingMethod = value;
    if (key === "weights")
      next.rules = next.rules.map((rule) => ({
        ...rule,
        weight: value.find((r) => r.id === rule.id).weight,
      }));
    if (key.startsWith("deadline:")) {
      const assignment = next.assignments.find(
        (a) => key === "deadline:" + a.id,
      );
      assignment.due = value;
      assignment.modified = record.savedAt;
    }
  }
  next.policyConfirmed = gradingConfirmed(next);
  return next;
}
export function pointsGrade(assignments) {
  const rows = assignments.filter(
    (a) =>
      a.status !== "excused" &&
      a.earned !== null &&
      a.possible !== null &&
      a.possible > 0,
  );
  const possible = rows.reduce((sum, a) => sum + a.possible, 0);
  return possible
    ? (rows.reduce((sum, a) => sum + a.earned, 0) / possible) * 100
    : null;
}
export function pointsTarget(assignments, target) {
  const rows = assignments.filter((a) => a.status !== "excused");
  if (!rows.length || rows.some((a) => a.possible === null))
    return {
      required: null,
      reason: "Enter all course assignments and possible points first.",
    };
  const total = rows.reduce((sum, a) => sum + a.possible, 0);
  const earned = rows.reduce((sum, a) => sum + (a.earned ?? 0), 0);
  const remaining = rows
    .filter((a) => a.earned === null)
    .reduce((sum, a) => sum + a.possible, 0);
  if (!remaining)
    return {
      required: null,
      reason:
        (earned / total) * 100 >= target
          ? "Target already reached with entered scores."
          : "No ungraded points remain in the entered course.",
    };
  const required = Math.max(
    0,
    (((target / 100) * total - earned) / remaining) * 100,
  );
  return {
    required,
    reason:
      required > 100
        ? "Not attainable with the remaining entered points."
        : "Uses total points across all entered assignments. Include all remaining work.",
  };
}
function display(value, state) {
  if (Array.isArray(value))
    return value
      .map(
        (r) =>
          `${state.rules.find((rule) => rule.id === r.id)?.name}: ${r.weight}%`,
      )
      .join("; ");
  return value === "weighted"
    ? "Weighted categories"
    : value === "points"
      ? "Total points"
      : value || "Not entered";
}
function form(state, key, title, baseline) {
  const stored = latest(state, key);
  const record = stored && {
      ...stored,
      status: confirmed(state, key) ? "confirmed" : "unresolved",
    },
    value = currentValue(state, key);
  const safe = escape;
  let input;
  if (key === "method")
    input = `<label>Instructor’s confirmed method<select name="value"><option value="weighted" ${value === "weighted" ? "selected" : ""}>Weighted categories</option><option value="points" ${value === "points" ? "selected" : ""}>Total points</option></select></label>`;
  else if (key === "weights")
    input = state.rules
      .map(
        (rule) =>
          `<label>${safe(rule.name)} (%)<input name="weight-${safe(rule.id)}" type="number" min="0" max="100" step="any" required value="${rule.weight}"></label>`,
      )
      .join("");
  else if (key.startsWith("deadline:"))
    input = `<label>Confirmed due date<input type="date" name="value" required value="${safe(value)}"></label>`;
  else
    input = `<label class="wide">Instructor’s correction or confirmation<textarea name="value" rows="3" maxlength="4000" required placeholder="Fill this in when Woods clarifies it…">${safe(value)}</textarea></label>`;
  const history = state.clarifications?.[key] ?? [];
  return `<section class="card"><h2>${safe(title)}</h2><p><strong>${record?.status === "confirmed" ? "Confirmed" : "Still to confirm"}</strong>${record ? " · " + safe(record.date) : ""}</p><p class="muted">Syllabus reference: ${safe(baseline)}</p><form data-clarification="${safe(key)}" class="form-grid">${input}<label>Clarified on<input name="date" type="date" required value=""></label><label>Reference (optional)<input name="reference" maxlength="1000" placeholder="Lecture timestamp or Canvas announcement"></label><p class="wide muted">${key.startsWith("deadline:") ? "Saving updates only this assignment’s due date. A linked Docket task still needs its separate review." : key === "method" ? "Saving changes how the grade calculator combines scores." : key === "weights" ? "Saving updates the category percentages; they must total 100%." : "Saved as a course note. Scores, penalties and assignment dates are not changed automatically."}</p><div class="form-actions"><button type="submit">Save confirmation</button>${record?.status === "confirmed" ? '<button type="button" class="quiet" data-unresolve>Mark unresolved</button>' : ""}</div><p class="wide" role="status" data-clarification-error></p></form>${
    history.length
      ? `<details><summary>Change history (${history.length})</summary>${[
          ...history,
        ]
          .reverse()
          .map(
            (r) =>
              `<article><p><strong>${safe(r.date)} · ${r.status === "confirmed" ? "Confirmed" : "Marked unresolved"}</strong></p><p style="white-space:pre-wrap">${safe(display(r.value, state))}</p><p class="muted">Previous: ${safe(display(r.previous, state))}</p>${r.reference ? `<p>Reference: ${safe(r.reference)}</p>` : ""}</article>`,
          )
          .join("")}</details>`
      : ""
  }</section>`;
}
export function clarificationPage(state, schedule) {
  const entries = items.map(item => item[0] === 'meetings' && schedule ? [item[0], item[1], schedule.source + '. Current meeting details are filled in below; record any later corrections here.'] : item);
  const count = items.filter(([key]) => confirmed(state, key)).length;
  return `<p class="lede">Fill in Woods’ corrections as you hear them. Confirm each item separately; leave unanswered items open.</p><p role="status">${count} of ${items.length} course details confirmed. The supplied registration schedule is included; later corrections take precedence. Assignment deadlines are confirmed separately below.</p>${entries.map(([key, title, baseline]) => form(state, key, title, baseline)).join("")}<section class="card"><h2>Assignment deadlines</h2><label>Choose the assignment to correct<select id="clarification-assignment"><option value="">Choose an assignment…</option>${state.assignments.map((a) => `<option value="${escape(a.id)}">${escape(a.title)}${a.due ? " · " + escape(a.due) : ""}</option>`).join("")}</select></label><p>Add assignments on the Assignments page first. No old syllabus dates are used automatically.</p></section><div id="deadline-clarification"></div>`;
}
export function bindClarifications(state, commit) {
  function bind(root) {
    root.querySelectorAll("form[data-clarification]").forEach((form) => {
      const save = (status) => {
        const message = form.querySelector("[data-clarification-error]");
        try {
          if (status === "confirmed" && !form.reportValidity()) return;
          const fields = new FormData(form),
            key = form.dataset.clarification;
          const value =
            key === "weights"
              ? state.rules.map((r) => ({
                  id: r.id,
                  weight: Number(fields.get("weight-" + r.id)),
                }))
              : String(fields.get("value") ?? "").trim();
          commit(
            confirmDetail(
              state,
              key,
              value,
              String(fields.get("date") ?? ""),
              String(fields.get("reference") ?? ""),
              status,
            ),
          );
        } catch (error) {
          message.textContent = error.message;
        }
      };
      form.onsubmit = (event) => {
        event.preventDefault();
        save("confirmed");
      };
      form
        .querySelector("[data-unresolve]")
        ?.addEventListener("click", () => save("unresolved"));
    });
  }
  bind(document);
  const select = document.querySelector("#clarification-assignment");
  if (select)
    select.onchange = () => {
      const host = document.querySelector("#deadline-clarification");
      const assignment = state.assignments.find((a) => a.id === select.value);
      host.innerHTML = assignment
        ? form(
            state,
            "deadline:" + assignment.id,
            assignment.title,
            "No current deadline assumed. Enter the date provided by the instructor.",
          )
        : "";
      bind(host);
    };
}
