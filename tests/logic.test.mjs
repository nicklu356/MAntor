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
