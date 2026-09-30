# 🗄️ Data Structure (Firebase Firestore)

## 📖 Three terms first

| Term | Meaning | Excel comparison |
|------|---------|------------------|
| **Collection** | A group of records of one kind | A worksheet |
| **Document** | One record | One row |
| **Field** | One value in a record | One column |

* 🔗 Every document has an **id**; other records link to it using that id
* 📂 All collections sit at the top level (no nesting), so they are easy to read and query
* 🕒 Times are stored as ISO text, e.g. `"2026-09-30T10:00:00.000Z"`
* 💻 The code for every read and write is in `lib/db.js`; the demo data is in `lib/seed.js`

---

## 🗺️ How the data connects

```
users (learners and mentors)
  │
  ├── mentor creates ──► projects (with criteria + task templates)
  │                        │
  │                        └── learners join ──► teams
  │                                                │
  │                                                └── tasks (copied from the templates)
  │                                                      │
  ├── learners record ──────────────────────────► contributions
  │                                                      │
  ├──────────────────────────────── AI / mentor ──► feedback
  │                                                      │
  ├── learners and mentors write ───────────────► comments
  └── AI summarises a learner's work ───────────► analyses
```

---

## 📦 Collections overview

| Collection | Stores | MVP status |
|------------|--------|------------|
| `users` | Learners and mentors | 🎭 Demo data |
| `projects` | Projects, criteria and task templates | ✅ Used |
| `teams` | Who works on which project | ✅ Used |
| `tasks` | Each task of a team's project | ✅ Used |
| `contributions` | What each member did | ✅ Used |
| `feedback` | AI feedback per task, and the mentor's final feedback per team | ✅ Used |
| `comments` | Team discussion under a task | ✅ Used |
| `analyses` | AI personal analysis and course suggestions | ✅ Used |

---

## 1. 👤 `users`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | User id | `"user_001"` |
| `role` | string | `"learner"` or `"mentor"` | `"learner"` |
| `name` | string | Real name | `"Mia Chen"` |
| `anonymousName` | string | Anonymous name, the only name mentors see | `"Learner #A3F"` |
| `company` | string | Mentor's company (mentors only) | `"Northwind Digital"` |
| `careerField` | string | Career assessment result (learners only). Saved by the Assessment page | `"UX Design"` |
| `careerExplanation` | string | Short AI explanation of the result (fixed text without an API key) | `"You enjoy understanding how people think..."` |
| `createdAt` | string | Created time | |

* 🔒 **Anonymity:** mentor screens show `anonymousName`, never `name`
* 🎭 Demo learners start with a result already saved; the Assessment page overwrites it

---

## 2. 📁 `projects`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Project id | `"project_001"` |
| `title` | string | Project name | `"Redesign a banking app onboarding flow"` |
| `description` | string | The workplace scenario | `"A fintech app loses 40% of new users..."` |
| `field` | string | Project field, matched against `careerField` | `"UX Design"` |
| `mentorId` | string | Mentor who wrote it (links to `users`) | `"user_101"` |
| `company` | string | Mentor's company | `"Northwind Digital"` |
| `difficulty` | string | `"beginner"`, `"intermediate"` or `"advanced"` | `"beginner"` |
| `teamSize` | number | Learners per team | `3` |
| `criteria` | array | Mentor's standards (see below) | |
| `taskTemplates` | array | Tasks every new team gets (see below) | |
| `createdAt` | string | Created time | |

**Each item in `criteria`:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Criterion id | `"c1"` |
| `name` | string | Criterion name | `"User research"` |
| `description` | string | What "good" looks like | `"Interviews at least 3 users and summarises their key needs"` |

**Each item in `taskTemplates`:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Task name |
| `description` | string | Task instructions |
| `criteriaIds` | array of string | Which criteria this task is judged on |

* 📏 `criteria` are the **industry standard set by the mentor**; AI feedback scores work against them
* 📋 When a new team is created, every template is copied into `tasks` for that team

---

## 3. 👥 `teams`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Team id | `"team_001"` |
| `projectId` | string | Project the team works on (links to `projects`) | `"project_001"` |
| `memberIds` | array of string | Members (links to `users`) | `["user_001", "user_002"]` |
| `status` | string | `"active"` or `"completed"` | `"active"` |
| `createdAt` | string | Created time | |

* ✅ `status` becomes `"completed"` when the mentor gives final feedback and every task is done
* 🤝 Joining a project: the learner goes into an active team that still has space, otherwise a new team is created

---

## 4. ✅ `tasks`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Task id | `"task_001"` |
| `projectId` | string | Project it belongs to | `"project_001"` |
| `teamId` | string | Team working on it | `"team_001"` |
| `title` | string | Task name | `"Interview 3 users"` |
| `description` | string | Task instructions | `"Find out where and why users drop off..."` |
| `criteriaIds` | array of string | Criteria this task is judged on | `["c1"]` |
| `status` | string | `"todo"`, `"in_progress"` or `"done"` | `"todo"` |
| `assigneeIds` | array of string | Members working on it | `["user_001"]` |
| `submission` | object or null | The submitted work (see below) | |
| `createdAt` | string | Created time | |

**`submission`:**

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | The work (text or a link) |
| `submittedBy` | string | Who submitted it |
| `submittedAt` | string | Submitted time |

* 📋 The three `status` values are the three columns of the **task board**

---

## 5. 🙋 `contributions`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Record id | `"contrib_001"` |
| `taskId` | string | Task | `"task_001"` |
| `teamId` | string | Team | `"team_001"` |
| `userId` | string | Who wrote it | `"user_001"` |
| `description` | string | What they did | `"Ran 2 of the 3 interviews and wrote the summary"` |
| `hoursSpent` | number | Hours spent | `3` |
| `createdAt` | string | Created time | |

* 🧾 This is what the **Contribution form** saves
* One task can have many records, one per member per piece of work

---

## 6. 💬 `feedback`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Feedback id | `"fb_001"` |
| `taskId` | string or null | Task (null for the mentor's final feedback) | `"task_001"` |
| `teamId` | string | Team | `"team_001"` |
| `source` | string | `"ai"` or `"mentor"` | `"ai"` |
| `kind` | string | `"task"` (one task) or `"final"` (mentor's final feedback for the team) | `"task"` |
| `authorId` | string or null | Mentor who wrote a final feedback (links to `users`) | `"user_101"` |
| `scores` | array | Score per criterion (see below) | |
| `summary` | string | Overall feedback | `"Good research depth, but..."` |
| `simulated` | boolean | `true` when no Claude API key was set or the AI call failed | `false` |
| `sample` | boolean | `true` for the example review in the demo data (shown as "Example") | `false` |
| `createdAt` | string | Created time | |

**Each item in `scores`:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `criteriaId` | string | Criterion | `"c1"` |
| `score` | number | 1 to 5 | `4` |
| `comment` | string | Advice for this criterion | `"Try asking more open questions"` |

* 🤖 AI feedback flow: read `tasks.submission` + `projects.criteria` + `contributions` → Claude API scores it → saved as one `feedback` record
* 📈 Every new review is a new record, so the **Progress** panel can show the score history (for example 3 → 4)

---

## 7. 🗨️ `comments`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Comment id | `"comment_001"` |
| `taskId` | string | Task | `"task_001"` |
| `teamId` | string | Team | `"team_001"` |
| `userId` | string | Who wrote it (learner of the team, or the project's mentor) | `"user_002"` |
| `text` | string | The message | `"I can draft the problem statement"` |
| `createdAt` | string | Created time | |

---

## 8. 📊 `analyses`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Analysis id |
| `teamId` | string | Team |
| `projectId` | string | Project |
| `userId` | string | Learner |
| `summary` | string | How the project went |
| `strengths` | array of string | What they did well |
| `improvements` | array of string | What to work on |
| `nextSteps` | array of string | Concrete next steps |
| `courses` | array | Suggested courses: `id` (from `lib/courses.js`) and `reason` |
| `simulated` | boolean | `true` when built without the Claude API |
| `createdAt` | string | Created time |

* 📚 Courses are stored by `id` only. The AI can only choose ids from the curated list in `lib/courses.js`
* 🔒 No names are sent to the AI: only scores, comments and the learner's own contribution text

---

## 🔄 Which data each MVP feature uses

| MVP feature | Reads | Writes |
|-------------|-------|--------|
| Browse and choose projects | `projects` | `teams`, `tasks` |
| Task board | `tasks` | `tasks` (`status`, `assigneeIds`) |
| Submit work | `tasks` | `tasks` (`submission`) |
| Contribution form | `contributions` | `contributions` |
| AI task feedback | `tasks`, `projects.criteria`, `contributions` | `feedback` |
| Career assessment | `users` | `users` (`careerField`, `careerExplanation`) |
| Progress panel | `tasks`, `feedback`, `projects.criteria` | nothing |
| AI personal analysis | `feedback`, `contributions`, `projects` | `analyses` |
| Mentor final feedback | `teams`, `projects`, `tasks` | `feedback` (`kind: "final"`), `teams` (`status`) |
| Team discussion | `comments` | `comments` |
