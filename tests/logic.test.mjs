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
