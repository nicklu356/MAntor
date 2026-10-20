# MAntor

> Learn by doing real-world projects, guided by industry mentors.

FEIT Hackathon 2026 · Untapped challenge: *Engineering the Future of Learning*

Students and career changers need hands-on experience, but online learning rarely gives it. This platform lets learners join a team, work on a realistic workplace project written by an industry mentor, record who did what, and get AI feedback based on the mentor's own criteria.

📘 Full plan: [docs/execution-plan.md](docs/execution-plan.md)
🗄️ Database design: [docs/data-structure.md](docs/data-structure.md)

---

## ✅ MVP status

| Feature | Status |
|---------|--------|
| Career assessment: 32 activities on Holland's RIASEC model, 8 career fields, % fit, consistency checks, interest profile | ✅ Built (AI writes the "why" text) |
| Project matching from the assessment result | ✅ Built (projects ranked by % fit) |
| Browse and choose projects | ✅ Built |
| Join a project (creates or fills a team) | ✅ Built |
| Task board (To do, In progress, Done) | ✅ Built |
| Submit work, contribution form, team discussion | ✅ Built |
| AI task feedback based on mentor criteria | ✅ Built (Claude API) |
| Progress panel (score history per criterion) | ✅ Built |
| AI personal analysis + course suggestions (curated list) | ✅ Built (Claude API) |
| Mentor view: anonymous learners, guidance, final feedback | ✅ Built |
| Mentors create and edit their own projects, with an AI draft of criteria and tasks | ✅ Built (Claude API) |
| AI coach on every task (hints and questions, never the finished work) | ✅ Built (Claude API) |
| Identity reveal: a mentor asks to connect, the learner decides whether to share their name | ✅ Built |
| Learner portfolio: projects, contributions, scores, mentor quotes; shareable and printable as PDF | ✅ Built |
| Notifications bell (comments, submissions, feedback, connection requests) | ✅ Built |
| "Ask the mentor" help requests, and a mentor "Needs your attention" queue | ✅ Built |
| Kudos between teammates, and achievements on the portfolio | ✅ Built |
| Drag-and-drop task board, project search and filters, toasts, 404 and error pages | ✅ Built |
| Unit tests (`npm test`) and GitHub Actions CI (test + build) | ✅ Built |
| Login | 🎭 Simulated ("Viewing as" switch in the header) |

### 🔌 What happens without an API key

The app **never breaks without a key**. With no `ANTHROPIC_API_KEY` (or if the AI service fails), feedback, the assessment explanation, the personal analysis, the AI coach and the project draft fall back to a simulated version, clearly labelled **Simulated** in the app. The header badge shows **AI: Live** or **AI: Simulated** so you can see which mode you are in.

---

## 🧪 Tests

```bash
npm test         # unit tests for the logic in lib/
npm run build    # production build
```

GitHub Actions runs both on every push to `main` and on every pull request.

---

## 🛠️ Tech stack

* **Frontend and backend:** Next.js (React)
* **Database:** Firebase Firestore
* **AI:** Claude API
* **Design:** Figma
* **Deployment:** Vercel
* **Collaboration:** GitHub

---

## 🚀 Run it on your computer

### 1. Install once

* [Node.js](https://nodejs.org) (LTS version)
* [Git](https://git-scm.com)
* [VS Code](https://code.visualstudio.com) (recommended)

### 2. Install packages

Open a terminal in this folder and run:

```bash
npm install
```

### 3. Start the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser. 🎉

The app works straight away in **demo mode**: data is saved in your browser, and AI feedback is simulated. Add keys (below) to switch on the real parts.

---

## 🔑 Add your keys (optional)

1. Copy `.env.example` and rename the copy to `.env.local`
2. Fill in the values you have
3. Stop the app (`Ctrl + C`) and run `npm run dev` again

`.env.local` is ignored by Git, so your keys are never uploaded. Never paste keys into any other file.

### Claude API (real AI feedback)

1. Create a key at https://console.anthropic.com
2. Put it in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Firebase (shared database)

Demo mode saves data only in your own browser, so teammates cannot see each other's changes. Firebase fixes that.

1. Go to https://console.firebase.google.com and create a project
2. **Build > Firestore Database > Create database**, choose **test mode** (fine for a hackathon)
3. **Project settings > Your apps > Web app (</>)**, register the app
4. Copy the `firebaseConfig` values into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

5. Restart the app, open http://localhost:3000/setup and click **Load demo data into Firebase**

The badge in the header shows which mode you are in: **Demo data** or **Firebase**.

If you already loaded demo data before this update, open `/setup` and click **Load demo data into Firebase** again so the new records (example feedback, discussion) are added.

⚠️ Test mode rules expire after 30 days and let anyone read and write. That is fine for the hackathon, not for a real product.

---

## 🌐 Deploy to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com, click **Add New > Project** and import the repo
3. In **Environment Variables**, add the same keys as your `.env.local`
4. Click **Deploy**

---

## 🎬 Demo script

Before a pitch, open `/setup` and click **Reset demo data** so the demo starts clean. Check the header badge says **AI: Live** (real key set).

1. **Assessment:** as *Mia Chen*, open **Assessment**: her saved result shows (best match, every field's % fit, interest profile). Click **Retake** and rate the 32 activities (8 per page; progress is saved if you leave)
2. **Projects:** projects are ranked by % fit, with a *Best match* badge
3. **Team board:** open *Redesign a banking app onboarding flow* (Mia's team, in progress with Liam)
4. **Task + feedback:** open *Interview 3 users*. The page already shows an **Example** AI review (score 3). Expand the submission with more detail, click **Update submission**, then **Get new feedback**: the score changes (for example **+1**)
5. **Progress:** go back to the team page; the **Progress** panel shows the score history (3 → 4) per criterion
6. **AI personal analysis:** click **Generate my analysis** to get strengths, next steps and suggested courses
7. **AI coach:** on the task page, click **Where should I start?** in *Ask the AI coach*. It gives hints, not answers
8. **Mentor view:** switch *Viewing as* to **Grace Walker (mentor)**. Learners now appear only as *Learner #A3F* / *Learner #B71* (in the dropdown too). Open the team, leave a comment, and give **final feedback**
9. **Interested in their work:** in the *Team* panel, click **Interested in their work** next to *Learner #A3F* and send the request
10. **Back to the learner:** switch to *Learner #A3F* (Mia). Home shows the request: click **Share my name**. The bell shows the mentor's activity. Switch back to Grace: she now sees *Mia Chen*, but Liam stays *Learner #B71*
11. **Mentor creates a project:** as Grace, click **New project**, write a title and scenario, then **Draft criteria and tasks with AI**, edit, and **Publish**
12. **Portfolio:** switch to Liam and open **Portfolio**: a completed, mentor-reviewed data project with scores (3 → 5) and the mentor's quote. **Save as PDF** prints it

Anonymous names: Mia = `Learner #A3F`, Liam = `Learner #B71`, Sofia = `Learner #C09`, Noah = `Learner #D52`.

## 📁 Project structure

```
app/
  page.js                          Home: learner (result + teams) or mentor (projects + teams)
  assessment/page.js               Career assessment (6 questions)
  projects/page.js                 Browse projects
  projects/[id]/page.js            Project brief, mentor criteria, Join
  projects/new/page.js             Mentor: publish a new project
  projects/[id]/edit/page.js       Mentor: edit their project
  portfolio/[id]/page.js           Learner portfolio (shareable, printable)
  teams/[id]/page.js               Task board, progress, personal analysis, mentor final feedback
  teams/[id]/tasks/[taskId]/page.js  Task: submission, contributions, AI feedback, discussion
  setup/page.js                    Load demo data into Firebase / reset demo mode
  api/feedback/route.js            AI task feedback (server, keeps the key secret)
  api/analysis/route.js            AI personal analysis + course picks
  api/assessment/route.js          AI "why this field fits you" text
  api/coach/route.js               AI coach chat on a task (hints only)
  api/project-draft/route.js       AI draft of criteria and tasks for a mentor's project
  api/status/route.js              Tells the header if AI is live or simulated
components/
  Header.js                        Menu, AI/mode badges, "Viewing as" switch (learners and mentors)
  UserProvider.js                  Current demo user; userName() hides learner names from mentors
  ContributionForm.js              Contribution form
  FeedbackPanel.js                 AI feedback with score changes and history
  ProgressPanel.js                 Tasks done + score history per criterion
  PersonalAnalysis.js              AI personal analysis and course cards
  FinalFeedback.js                 Mentor final feedback (form for the mentor, display for others)
  CommentThread.js                 Team discussion under a task
  CoachPanel.js                    "Ask the AI coach" chat
  CareerResult.js                  Assessment result: matches, field details, interest profile
  HelpRequest.js                   "Ask the mentor" on a task
  ProjectForm.js                   Mentor's project editor (criteria, tasks, AI draft)
  TeamMembers.js                   Team panel; mentors send "Interested in their work" requests
  ConnectionRequests.js            Learner accepts or declines mentor requests
  NotificationBell.js              Bell in the header
  Hero.js, Toast.js                Home banner; small confirmation messages
lib/
  db.js                            Every read and write (Firebase or demo mode)
  seed.js                          Demo users, projects, team, tasks, example feedback, comments
  assessment.js                    Assessment activities, 8 career fields (RIASEC), scoring and checks
  courses.js                       Curated course list (the AI can only pick from here)
  progress.js                      Builds score history per criterion
  notifications.js                 Builds the bell's list from existing records
  attention.js                     Mentor's "Needs your attention" list
  achievements.js                  Achievements shown on the portfolio
  projectDraft.js                  Cleans the project form; normalises the AI draft
  format.js                        timeAgo and other display helpers
  server/ai.js                     Shared AI helpers: fallback checks, rate limit, size limits
  firebase.js, mockStore.js, config.js
tests/                             Unit tests for lib/ (npm test)
docs/
  execution-plan.md                Problem, user flow, design decisions, MVP
  data-structure.md                Firestore collections and fields
```

### Common changes

* **App name:** `lib/config.js`
* **Colours and fonts (to match Figma):** the variables at the top of `app/globals.css`
* **Projects, criteria, demo learners:** `lib/seed.js` (then reset demo data, or reload it into Firebase at `/setup`)
* **How the AI gives feedback:** `SYSTEM_PROMPT` in `app/api/feedback/route.js` (the coach and project draft have their own prompts in `app/api/coach` and `app/api/project-draft`)
* **AI model:** `ANTHROPIC_MODEL` in `.env.local`. All AI calls go through `askJson` / `askText` in `lib/server/ai.js` (structured outputs, so answers always match the expected JSON)
* **Assessment activities, fields and scoring:** `lib/assessment.js`. Each activity has a RIASEC type and (usually) a field; each field has a RIASEC profile and the text shown on the result page. Career field names live in `lib/config.js` and must match the project `field` values. `npm test` checks every field still gets recommended for a matching persona
* **Course suggestions:** `lib/courses.js`. The AI can only choose from this list. Check the links before a pitch
* **Input limits:** `lib/config.js` (submission, comment and feedback length)
* **AI rate limit:** `rateLimit()` in `lib/server/ai.js` (20 requests per 10 minutes per visitor, only when a key is set)
