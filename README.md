# Project-Driven Learning

> Learn by doing real-world projects, guided by industry mentors.

FEIT Hackathon 2026 · Untapped challenge: *Engineering the Future of Learning*

Students and career changers need hands-on experience, but online learning rarely gives it. This platform lets learners join a team, work on a realistic workplace project written by an industry mentor, record who did what, and get AI feedback based on the mentor's own criteria.

📘 Full plan: [docs/execution-plan.md](docs/execution-plan.md)
🗄️ Database design: [docs/data-structure.md](docs/data-structure.md)

---

## ✅ MVP status

| Feature | Status |
|---------|--------|
| Career assessment (6 questions, scored in the app) | ✅ Built (AI writes the "why" text) |
| Project matching from the assessment result | ✅ Built (rule based: same field first) |
| Browse and choose projects | ✅ Built |
| Join a project (creates or fills a team) | ✅ Built |
| Task board (To do, In progress, Done) | ✅ Built |
| Submit work, contribution form, team discussion | ✅ Built |
| AI task feedback based on mentor criteria | ✅ Built (Claude API) |
| Progress panel (score history per criterion) | ✅ Built |
| AI personal analysis + course suggestions (curated list) | ✅ Built (Claude API) |
| Mentor view: anonymous learners, guidance, final feedback | ✅ Built |
| Login | 🎭 Simulated ("Viewing as" switch in the header) |
| Mentors creating their own projects | 🎨 Not built (projects come from `lib/seed.js`) |

### 🔌 What happens without an API key

The app **never breaks without a key**. With no `ANTHROPIC_API_KEY` (or if the AI service fails), feedback, the assessment explanation and the personal analysis fall back to a simulated version, clearly labelled **Simulated** in the app. The header badge shows **AI: Live** or **AI: Simulated** so you can see which mode you are in.

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

1. **Assessment:** as *Mia Chen*, open **Assessment**, answer the 6 questions, see the result and the "why" text
2. **Projects:** matching projects appear first with a *Matches your result* badge
3. **Team board:** open *Redesign a banking app onboarding flow* (Mia's team, in progress with Liam)
4. **Task + feedback:** open *Interview 3 users*. The page already shows an **Example** AI review (score 3). Expand the submission with more detail, click **Update submission**, then **Get new feedback**: the score changes (for example **+1**)
5. **Progress:** go back to the team page; the **Progress** panel shows the score history (3 → 4) per criterion
6. **AI personal analysis:** click **Generate my analysis** to get strengths, next steps and suggested courses
7. **Mentor view:** switch *Viewing as* to **Grace Walker (mentor)**. Learners now appear only as *Learner #A3F* / *Learner #B71* (in the dropdown too). Open the team, leave a comment, and give **final feedback**
8. **Back to the learner:** switch to *Learner #A3F* (Mia) and open the team page: the mentor's final feedback is there

Anonymous names: Mia = `Learner #A3F`, Liam = `Learner #B71`, Sofia = `Learner #C09`, Noah = `Learner #D52`.

## 📁 Project structure

```
app/
  page.js                          Home: learner (result + teams) or mentor (projects + teams)
  assessment/page.js               Career assessment (6 questions)
  projects/page.js                 Browse projects
  projects/[id]/page.js            Project brief, mentor criteria, Join
  teams/[id]/page.js               Task board, progress, personal analysis, mentor final feedback
  teams/[id]/tasks/[taskId]/page.js  Task: submission, contributions, AI feedback, discussion
  setup/page.js                    Load demo data into Firebase / reset demo mode
  api/feedback/route.js            AI task feedback (server, keeps the key secret)
  api/analysis/route.js            AI personal analysis + course picks
  api/assessment/route.js          AI "why this field fits you" text
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
lib/
  db.js                            Every read and write (Firebase or demo mode)
  seed.js                          Demo users, projects, team, tasks, example feedback, comments
  assessment.js                    Assessment questions and scoring
  courses.js                       Curated course list (the AI can only pick from here)
  progress.js                      Builds score history per criterion
  server/ai.js                     Shared AI helpers: fallback checks, rate limit, size limits
  firebase.js, mockStore.js, config.js
docs/
  execution-plan.md                Problem, user flow, design decisions, MVP
  data-structure.md                Firestore collections and fields
```

### Common changes

* **App name:** `lib/config.js`
* **Colours and fonts (to match Figma):** the variables at the top of `app/globals.css`
* **Projects, criteria, demo learners:** `lib/seed.js` (then reset demo data, or reload it into Firebase at `/setup`)
* **How the AI gives feedback:** `SYSTEM_PROMPT` in `app/api/feedback/route.js`
* **Assessment questions and results:** `lib/assessment.js` (field names must match the project `field` values)
* **Course suggestions:** `lib/courses.js`. The AI can only choose from this list. Check the links before a pitch
* **Input limits:** `lib/config.js` (submission, comment and feedback length)
* **AI rate limit:** `rateLimit()` in `lib/server/ai.js` (20 requests per 10 minutes per visitor, only when a key is set)
