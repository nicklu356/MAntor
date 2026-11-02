// Unit tests for the app's pure logic. Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { FIELD_INFO, FIELDS, ITEMS, describeAnswers, scoreAssessment } from "../lib/assessment.js";
import { average, timeAgo } from "../lib/format.js";
import { buildNotifications, countUnread } from "../lib/notifications.js";
import { buildCriteriaResults } from "../lib/progress.js";
import { cleanProject, fallbackDraft, normaliseDraft } from "../lib/projectDraft.js";

// Someone who loves a field's activities and leans towards its interest types.
const persona = (field) => {
  const top = Object.entries(FIELD_INFO[field].profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t]) => t);
  return Object.fromEntries(ITEMS.map((i) => [i.id, i.field === field ? 5 : top.includes(i.type) ? 4 : 2]));
};

test("every field has assessment items and a profile", () => {
  for (const field of FIELDS) {
    assert.ok(FIELD_INFO[field], field);
    assert.equal(ITEMS.filter((i) => i.field === field).length, 3, field);
  }
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length, "item ids are unique");
});

test("assessment recommends the field a persona clearly prefers", () => {
  for (const field of FIELDS) {
    const result = scoreAssessment(persona(field));
    assert.equal(result.field, field);
    assert.equal(result.confidence, "high", field);
    assert.equal(result.matches.length, FIELDS.length);
    assert.equal(result.hollandCode.length, 3);
  }
});

test("flat or missing answers lower the confidence", () => {
  const flat = Object.fromEntries(ITEMS.map((i) => [i.id, 3]));
  const result = scoreAssessment(flat);
  assert.equal(result.confidence, "low");
  assert.ok(result.notes.some((n) => n.includes("same rating")));
  assert.equal(scoreAssessment({}).confidence, "low");
});

test("describeAnswers lists liked and disliked activities", () => {
  const { liked, disliked } = describeAnswers({ a01: 5, a02: 1, a03: 3 });
  assert.equal(liked.length, 1);
  assert.equal(disliked.length, 1);
});

test("progress keeps the score history per criterion, oldest first", () => {
  const project = { criteria: [{ id: "c1", name: "Research", description: "d" }] };
  const tasks = [{ id: "t1", title: "Interview", criteriaIds: ["c1"] }];
  const feedback = [
    { taskId: "t1", kind: "task", scores: [{ criteriaId: "c1", score: 2, comment: "a" }] },
    { taskId: "t1", kind: "task", scores: [{ criteriaId: "c1", score: 4, comment: "b" }] },
    { taskId: null, kind: "final", scores: [{ criteriaId: "c1", score: 5 }] },
  ];
  const [row] = buildCriteriaResults(project, tasks, feedback);
  assert.deepEqual(row.history, [2, 4]);
  assert.equal(row.firstScore, 2);
  assert.equal(row.latestScore, 4);
  assert.equal(row.latestComment, "b");
});

test("cleanProject keeps existing criterion ids and gives new ones a free id", () => {
  const saved = cleanProject({
    title: " T ",
    description: " D ",
    field: "UX Design",
    difficulty: "beginner",
    teamSize: 99,
    criteria: [
      { name: "New", description: "n" }, // new, listed before an existing one
      { id: "c1", name: "Old", description: "o" },
      { id: "c3", name: "Old 3", description: "o" },
    ],
    taskTemplates: [{ title: "Task", description: "x", criteriaIndexes: [0, 2] }],
  });
  assert.deepEqual(
    saved.criteria.map((c) => c.id),
    ["c2", "c1", "c3"]
  );
  assert.deepEqual(saved.taskTemplates[0].criteriaIds, ["c2", "c3"]);
  assert.equal(saved.teamSize, 5);
  assert.equal(saved.title, "T");
});

test("normaliseDraft maps 1-based criterion numbers and drops bad ones", () => {
  const draft = normaliseDraft({
    criteria: [
      { name: "A", description: "a" },
      { name: "", description: "missing name" },
      { name: "B", description: "b" },
    ],
    tasks: [
      { title: "One", description: "1", criteriaNumbers: [2, 2, 9] },
      { title: "Two", description: "2", criteriaNumbers: [] },
    ],
  });
  assert.equal(draft.criteria.length, 2);
  assert.deepEqual(draft.tasks[0].criteriaIndexes, [1]);
  assert.deepEqual(draft.tasks[1].criteriaIndexes, [0], "a task with no criterion falls back to the first");
  assert.equal(normaliseDraft({ criteria: [], tasks: [] }), null);
});

test("fallbackDraft gives every task a valid criterion", () => {
  const draft = fallbackDraft({ title: "X", field: "Cybersecurity" }, "no-key");
  assert.ok(draft.simulated);
  for (const t of draft.tasks) for (const i of t.criteriaIndexes) assert.ok(draft.criteria[i]);
});

test("notifications skip the viewer's own activity and example feedback", () => {
  const viewer = { id: "u1", role: "learner" };
  const teams = [
    {
      id: "team",
      project: { title: "P" },
      tasks: [
        { id: "t1", title: "Task 1", submission: { submittedBy: "u2", submittedAt: "2026-01-02" } },
        { id: "t2", title: "Task 2", submission: { submittedBy: "u1", submittedAt: "2026-01-03" } },
      ],
      comments: [
        { id: "c1", taskId: "t1", userId: "u2", text: "hi", createdAt: "2026-01-04" },
        { id: "c2", taskId: "t1", userId: "u1", text: "mine", createdAt: "2026-01-05" },
      ],
      feedback: [
        { id: "f1", taskId: "t1", kind: "task", sample: true, createdAt: "2026-01-06" },
        { id: "f2", taskId: null, kind: "final", authorId: "m1", createdAt: "2026-01-07" },
      ],
    },
  ];
  const items = buildNotifications({ viewer, teams, userName: (id) => id.toUpperCase() });
  assert.deepEqual(
    items.map((i) => i.id),
    ["final:f2", "comment:c1", "submission:t1:2026-01-02"]
  );
  assert.equal(countUnread(items, "2026-01-05"), 1);
  assert.equal(countUnread(items, null), 3);
});

test("learners are told about pending mentor requests", () => {
  const items = buildNotifications({
    viewer: { id: "u1", role: "learner" },
    teams: [],
    connections: [{ id: "k", mentorId: "m1", status: "pending", createdAt: "2026-01-01" }],
    userName: (id) => id,
    users: [{ id: "m1", name: "Grace", company: "Northwind" }],
  });
  assert.match(items[0].text, /Grace \(Northwind\)/);
});

test("format helpers", () => {
  const now = Date.parse("2026-01-10T12:00:00Z");
  assert.equal(timeAgo("2026-01-10T11:59:50Z", now), "just now");
  assert.equal(timeAgo("2026-01-10T11:00:00Z", now), "1 h ago");
  assert.equal(timeAgo("2026-01-08T12:00:00Z", now), "2 days ago");
  assert.equal(average([4, 2, null]), 3);
  assert.equal(average([]), null);
});

test("mentor attention: help first, then low scores, then teams ready for final feedback", async () => {
  const { buildAttention } = await import("../lib/attention.js");
  const items = buildAttention([
    {
      id: "a",
      status: "active",
      project: { title: "P" },
      tasks: [
        { id: "t1", title: "One", status: "in_progress", helpRequest: { userId: "u1", at: "2026-01-03", resolvedAt: null } },
        { id: "t2", title: "Two", status: "todo" },
      ],
      feedback: [{ taskId: "t2", kind: "task", createdAt: "2026-01-02", scores: [{ criteriaId: "c1", score: 2 }] }],
    },
    {
      id: "b",
      status: "active",
      project: { title: "Q" },
      tasks: [{ id: "t3", title: "Three", status: "done", helpRequest: { userId: "u2", at: "2026-01-01", resolvedAt: "2026-01-02" } }],
      feedback: [],
    },
  ]);
  assert.deepEqual(
    items.map((i) => i.kind),
    ["help", "struggling", "final"]
  );
});

test("achievements are earned from existing records", async () => {
  const { computeAchievements } = await import("../lib/achievements.js");
  const project = { field: "Data Analysis", criteria: [{ id: "c1", name: "Clean", description: "d" }] };
  const entry = {
    team: { status: "completed" },
    project,
    tasks: [{ id: "t1", criteriaIds: ["c1"], submission: { submittedBy: "u1" } }],
    feedback: [
      { taskId: "t1", kind: "task", scores: [{ criteriaId: "c1", score: 3 }] },
      { taskId: "t1", kind: "task", scores: [{ criteriaId: "c1", score: 5 }] },
      { taskId: null, kind: "final", scores: [{ criteriaId: "c1", score: 4 }] },
    ],
    contributions: [{ userId: "u1", hoursSpent: 4, kudos: [{ userId: "u2" }] }],
    comments: [],
  };
  const earned = computeAchievements("u1", [entry]).filter((a) => a.earned).map((a) => a.id);
  assert.deepEqual(earned, ["first-step", "feedback-loop", "appreciated", "finisher", "mentor-approved"]);
});

test("notifications include kudos and help requests", () => {
  const team = {
    id: "team",
    project: { title: "P" },
    tasks: [{ id: "t1", title: "Task", helpRequest: { userId: "u1", note: "stuck", at: "2026-01-02", resolvedAt: null } }],
    contributions: [{ id: "c1", taskId: "t1", userId: "u1", description: "d", kudos: [{ userId: "u2", at: "2026-01-03" }] }],
  };
  const learner = buildNotifications({ viewer: { id: "u1", role: "learner" }, teams: [team], userName: (id) => id });
  assert.ok(learner.some((i) => i.id.startsWith("kudos:")));
  const mentor = buildNotifications({ viewer: { id: "m1", role: "mentor" }, teams: [team], userName: (id) => id });
  assert.ok(mentor.some((i) => i.id.startsWith("help:")));
});

test("profile details: names, age limit and education", async () => {
  const { splitName, validateProfile, ageOn, cleanProfile } = await import("../lib/profile.js");
  assert.deepEqual(splitName("Ada Lovelace King"), { firstName: "Ada Lovelace", lastName: "King" });
  assert.deepEqual(splitName("Cher"), { firstName: "Cher", lastName: "" });
  const today = new Date("2026-11-01T12:00:00");
  assert.equal(ageOn("2000-11-02", today), 25);
  assert.equal(ageOn("2000-11-01", today), 26);
  const ok = {
    firstName: "Ada",
    lastName: "King",
    dateOfBirth: "2003-05-04",
    educationLevel: "Bachelor's degree",
    school: "University of Melbourne",
    fieldOfStudy: "Engineering",
    graduationYear: "2027",
  };
  assert.equal(validateProfile(ok, today), "");
  assert.match(validateProfile({ ...ok, dateOfBirth: "2020-01-01" }, today), /at least 13/);
  assert.match(validateProfile({ ...ok, dateOfBirth: "2030-01-01" }, today), /future/);
  assert.match(validateProfile({ ...ok, educationLevel: "Wizard" }, today), /education/);
  assert.match(validateProfile({ ...ok, graduationYear: "1800" }, today), /graduation year/);
  assert.equal(validateProfile({ ...ok, graduationYear: "" }, today), "");
  assert.equal(cleanProfile(ok).name, "Ada King");
  assert.equal(cleanProfile({ ...ok, graduationYear: "" }).graduationYear, null);
});

// ---- Language ----
import zhTW from "../lib/i18n/zh-TW.js";
import { pickLocale, translate, translator } from "../lib/i18n/index.js";

test("translate: Chinese text with placeholders, English fallback for unknown text", () => {
  assert.equal(translate("zh-TW", "Hi {name}", { name: "Mia" }), "嗨，Mia");
  assert.equal(translate("en", "Hi {name}", { name: "Mia" }), "Hi Mia");
  assert.equal(translate("zh-TW", "Text nobody translated"), "Text nobody translated");
  assert.equal(translator("zh-TW")("{n} min ago", { n: 5 }), "5 分鐘前");
  assert.equal(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString(), Date.now(), translator("zh-TW")), "5 分鐘前");
});

test("pickLocale: the saved choice wins, then the browser language", () => {
  assert.equal(pickLocale("en", "zh-TW,zh;q=0.9"), "en");
  assert.equal(pickLocale(undefined, "zh-TW,zh;q=0.9"), "zh-TW");
  assert.equal(pickLocale("fr", "en-US,en;q=0.9"), "en");
  assert.equal(pickLocale(undefined, ""), "en");
});

test("zh-TW dictionary keeps every placeholder of its English key", () => {
  const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const [english, chinese] of Object.entries(zhTW)) {
    assert.ok(chinese.trim(), `empty translation for "${english}"`);
    assert.equal(placeholders(chinese), placeholders(english), `placeholders differ for "${english}"`);
  }
});

test("every field, interest type and assessment activity has a translation", () => {
  const missing = [];
  for (const field of FIELDS) {
    const info = FIELD_INFO[field];
    for (const text of [field, info.blurb, info.summary, ...info.dayToDay, ...info.roles, ...info.skills]) {
      if (!(text in zhTW)) missing.push(text);
    }
  }
  for (const item of ITEMS) if (!(item.text in zhTW)) missing.push(item.text);
  assert.deepEqual(missing, []);
});

test("every text the code passes to t() has a Traditional Chinese translation", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = new URL("..", import.meta.url).pathname;
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".js") && !path.includes("i18n")) files.push(path);
    }
  };
  ["app", "components", "lib"].forEach((dir) => walk(join(root, dir)));
  const literal = String.raw`("(?:[^"\\\n]|\\.)*")`;
  const direct = new RegExp(String.raw`\bt\(\s*` + literal, "g"); // t("text")
  const choice = new RegExp(String.raw`\bt\(\s*[^"()]*(?:\([^()]*\))?[^"()]*\?\s*` + literal + String.raw`\s*:\s*` + literal, "g"); // t(n > 1 ? "a" : "b")
  const missing = new Set();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of [...source.matchAll(direct), ...source.matchAll(choice)]) {
      for (const text of match.slice(1).filter(Boolean).map((s) => JSON.parse(s))) {
        if (!(text in zhTW)) missing.add(`${file.slice(root.length)}: ${text}`);
      }
    }
  }
  assert.deepEqual([...missing], []);
});

// ---- Deadlines and milestones ----
import { dueLabel, dueState, milestones, planTeamSchedule, teamProgress, templateWeeks } from "../lib/schedule.js";
import { buildAttention } from "../lib/attention.js";

test("schedule: tasks spread over the weeks, each due at the end of its week", () => {
  assert.deepEqual(templateWeeks([{}, {}, {}, {}], 4), [1, 2, 3, 4]);
  assert.deepEqual(templateWeeks([{}, {}, {}, {}, {}, {}, {}, {}], 4), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(templateWeeks([{ week: 3 }, { week: 99 }], 3), [3, 3]); // invalid weeks fall back to the spread
  const plan = planTeamSchedule({ durationWeeks: 2, taskTemplates: [{}, { week: 1 }] }, "2026-12-28");
  assert.equal(plan.endDate, "2027-01-11"); // across the new year
  assert.deepEqual(plan.tasks, [{ week: 1, dueDate: "2027-01-04" }, { week: 1, dueDate: "2027-01-04" }]);
});

test("due state and label: late, today, tomorrow, soon, later; nothing once done", () => {
  const t = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  const task = (dueDate, status = "todo") => ({ dueDate, status });
  assert.equal(dueLabel(task("2026-11-01"), t, "2026-11-04"), "3 days late");
  assert.equal(dueLabel(task("2026-11-03"), t, "2026-11-04"), "1 day late");
  assert.equal(dueLabel(task("2026-11-04"), t, "2026-11-04"), "Due today");
  assert.equal(dueLabel(task("2026-11-05"), t, "2026-11-04"), "Due tomorrow");
  assert.equal(dueLabel(task("2026-11-07"), t, "2026-11-04"), "Due in 3 days");
  assert.match(dueLabel(task("2026-11-20"), t, "2026-11-04"), /^Due 20 Nov/);
  assert.equal(dueState(task("2026-11-01", "done"), "2026-11-04"), null);
  assert.equal(dueState({ status: "todo" }, "2026-11-04"), null);
});

test("team progress and milestones", () => {
  const team = { startDate: "2026-11-01", endDate: "2026-11-29", status: "active" };
  const tasks = [
    { id: "a", week: 1, dueDate: "2026-11-08", status: "done" },
    { id: "b", week: 2, dueDate: "2026-11-15", status: "todo" },
    { id: "c", week: 4, dueDate: "2026-11-29", status: "todo" },
  ];
  const progress = teamProgress(team, "2026-11-17");
  assert.equal(progress.week, 3);
  assert.equal(progress.weeks, 4);
  assert.equal(progress.daysLeft, 12);
  const steps = milestones(team, tasks, "2026-11-17");
  assert.deepEqual(steps.map((s) => [s.week, s.done, s.late, s.current, s.tasks.length]), [
    [1, true, false, false, 1],
    [2, false, true, false, 1],
    [3, false, false, true, 0],
    [4, false, false, false, 1],
  ]);
  assert.equal(milestones({}, tasks).length, 0); // teams from before deadlines existed
});

test("deadlines reach the bell (learners) and the mentor's attention list (3+ days late)", () => {
  const team = {
    id: "team1",
    status: "active",
    project: { title: "P" },
    tasks: [
      { id: "a", title: "Research", dueDate: "2026-11-05", status: "todo", assigneeIds: [] },
      { id: "b", title: "Draft", dueDate: "2026-11-01", status: "in_progress", assigneeIds: [] },
    ],
  };
  const items = buildNotifications({ viewer: { id: "u1", role: "learner" }, teams: [team], userName: () => "x", today: "2026-11-04" });
  assert.deepEqual(items.map((i) => i.text).sort(), ["“Draft” is past its due date", "“Research” is due tomorrow"]);
  const mentorItems = buildNotifications({ viewer: { id: "m1", role: "mentor" }, teams: [team], userName: () => "x", today: "2026-11-04" });
  assert.equal(mentorItems.length, 0);
  const attention = buildAttention([team], "2026-11-04");
  assert.deepEqual(attention.map((i) => [i.kind, i.late.length]), [["late", 1]]);
  assert.equal(buildAttention([team], "2026-11-03").length, 0); // only 2 days late
});

// ---- Mentor weekly summary ----
import { simulatedSummary, teamStatus, weekStats } from "../lib/weeklySummary.js";

test("weekly summary: facts per team, anonymous names only, and a plain summary without AI", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");
  const recent = "2026-11-08T10:00:00.000Z";
  const old = "2026-10-20T10:00:00.000Z";
  const teams = [
    {
      id: "busy",
      status: "active",
      startDate: "2026-11-01",
      endDate: "2026-11-29",
      memberIds: ["a", "b"],
      project: { title: "Bank app" },
      tasks: [
        { id: "t1", title: "Interviews", status: "done", dueDate: "2026-11-08", submission: { submittedAt: recent, submittedBy: "a" } },
        { id: "t2", title: "Problem", status: "todo", dueDate: "2026-11-07", helpRequest: { userId: "b", note: "Scope?", at: recent } },
      ],
      feedback: [],
      comments: [{ userId: "a", createdAt: recent }],
      contributions: [{ userId: "a", hoursSpent: 2, createdAt: recent }, { userId: "b", hoursSpent: 5, createdAt: old }],
    },
    { id: "calm", status: "active", memberIds: ["c"], project: { title: "Cafe" }, tasks: [{ id: "t3", title: "Plan", status: "todo" }], feedback: [], comments: [], contributions: [{ userId: "c", hoursSpent: 1, createdAt: recent }] },
    { id: "gone", status: "disbanded", memberIds: [], project: { title: "Old" }, tasks: [] },
  ];
  const names = { a: "Learner #AAA", b: "Learner #BBB", c: "Learner #CCC" };
  const stats = weekStats(teams, { anonymousName: (id) => names[id], now, today: "2026-11-10" });
  assert.deepEqual(stats.teams.map((s) => s.teamId), ["busy", "calm"]); // active teams only
  const busy = stats.teams[0];
  assert.deepEqual(busy.members, ["Learner #AAA", "Learner #BBB"]);
  assert.deepEqual(busy.submitted, ["Interviews"]);
  assert.equal(busy.hours, 2); // last week only
  assert.deepEqual(busy.late, [{ task: "Problem", days: 3 }]);
  assert.deepEqual(busy.help, [{ task: "Problem", from: "Learner #BBB", note: "Scope?" }]);
  assert.deepEqual(busy.quiet, ["Learner #BBB"]);
  assert.equal(busy.week, 2);
  assert.equal(teamStatus(busy), "stuck"); // open help request
  assert.equal(teamStatus(stats.teams[1]), "on_track");

  const summary = simulatedSummary(stats);
  assert.equal(summary.overview, "2 active team(s): 1 on track, 0 need attention, 1 stuck.");
  assert.equal(summary.teams[0].suggestion, "Answer the help request on “Problem”.");
  assert.deepEqual(summary.priorities, ["Bank app: Answer the help request on “Problem”."]);
  assert.equal(simulatedSummary({ teams: [] }).overview, "No active teams this week.");
});

// ---- Server settings check (/api/status) ----
import { missingSettings, settingProblems } from "../lib/server/env.js";

test("server settings: names of missing settings and plain problems, never the values", () => {
  const saved = { ...process.env };
  const names = ["ANTHROPIC_API_KEY", "FIREBASE_SERVICE_ACCOUNT", "FIRESTORE_EMULATOR_HOST", "MAIL_OUTBOX", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_PORT", "CRON_SECRET", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
  try {
    for (const name of names) delete process.env[name];
    assert.deepEqual(missingSettings(), ["ANTHROPIC_API_KEY", "FIREBASE_SERVICE_ACCOUNT", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "CRON_SECRET"]);
    assert.deepEqual(settingProblems("22.12.0"), []);
    assert.match(settingProblems("20.18.1")[0], /Node.js 20.18.1, but Firebase Admin needs 22/);
    process.env.ANTHROPIC_API_KEY = '"sk-ant-abc"';
    assert.match(settingProblems("22.12.0")[0], /does not start with sk-ant-/);
    delete process.env.ANTHROPIC_API_KEY;

    Object.assign(process.env, { SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@b.c", SMTP_PASS: "  ", SMTP_PORT: "465 " });
    assert.ok(missingSettings().includes("SMTP_PASS")); // blank counts as missing

    process.env.FIREBASE_SERVICE_ACCOUNT = '{"project_id": "my-app", "private_key": "secret-value"'; // cut short
    assert.match(settingProblems("22.12.0")[0], /not valid JSON/);
    assert.ok(!settingProblems("22.12.0").join().includes("secret-value"));

    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: "other", private_key: "k", client_email: "e" });
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "my-app";
    assert.match(settingProblems("22.12.0")[0], /for project "other", but the site uses "my-app"/);
  } finally {
    for (const name of names) delete process.env[name];
    Object.assign(process.env, saved);
  }
});
