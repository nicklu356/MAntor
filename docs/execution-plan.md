# 📘 Execution Plan

> 🎯 **Core idea: A "learn by doing" platform for people who want to build real, hands-on experience**

* 🏆 Challenge: Untapped | Engineering the Future of Learning (Future Work)

---

## 1. 👥 Target Users

| User | What they have in common |
|------|--------------------------|
| 🎓 Students | Lack practical experience and have no workplace to practise in |
| 🔄 Career changers | Lack practical experience in their new field |

* 📚 Platform purpose: **learning**, not recruitment

---

## 2. 😣 Pain Points

| Pain point | Description | Evidence |
|------------|-------------|----------|
| 📉 Learners don't finish online courses | Overall MOOC completion rates are around 15% or lower | Jordan (2015) |
| 🧍 Learning alone, with little interaction | Low completion is often attributed to low learner interaction | Dolata et al. (2019) |
| 🧭 Requires strong self-discipline | Learners with stronger self-directed learning skills complete more of the course | Schulze (2014) |
| 🧩 Knowledge isn't applied | Watching videos and answering quizzes is not the same as doing real work | Challenge brief |

**💥 If this isn't solved**
* 🧑‍🎓 People without experience can't find a way in, and their skills fall behind
* 🏢 Companies can't find new hires with practical experience
* 🌏 Strong self-learners pull further ahead while others fall behind, widening the gap

---

## 3. 🔄 User Flow

1. 🧠 **Career assessment**
   * The user completes a career assessment
   * A **simple result** is shown: "You're a good fit for [field]"
   * A short AI explanation is included: why this field fits, and how it connects to the recommended projects
2. 🤖 **AI project matching**
   * Projects are recommended based on the assessment result
3. 🙋 **User chooses a project**
   * Projects are provided by industry mentors and are **based on realistic workplace scenarios** (avoiding confidentiality issues)
4. 🤝 **Team completes tasks**
   * Each project is broken into tasks that users complete together
   * A **Contribution form** records each member's contribution
5. 🧑‍🏫 **Mentor guidance**
   * Mentors set the **Criteria** (the standards of their field)
   * AI helps generate tasks and give task feedback
   * Mentors guide throughout, without over-intervening
6. 📊 **AI personal analysis**
   * When a project or milestone is completed, AI gives personalised advice based on mentor feedback and the user's work
   * The standard comes from the mentor's Criteria
7. 🔗 **Ask AI anytime**
   * During a project, users can ask AI to recommend relevant external courses

---

## 4. 🎭 Roles

| Role | What they do | What they get |
|------|--------------|---------------|
| 🧑‍🎓 Learner | Chooses projects, completes tasks, records contributions | Practical experience, personalised advice |
| 🧑‍🏫 Mentor | Provides projects, sets Criteria, guides | Company exposure |
| 🏢 Company | Sends mentors, provides scenarios | Brand exposure |
| 🤖 AI | Matching, task generation, feedback, analysis, course recommendations | N/A |

---

## 5. 🧩 Design Decisions

| Decision | Reason |
|----------|--------|
| Users **choose** their own project | People are more motivated by what they choose, similar to graduate programs that let trainees pick what they work on |
| Use **realistic scenarios**, not real company projects | Avoids company confidentiality issues |
| Mentors set Criteria, **AI delivers** feedback | Mentors don't need to personally guide every team, so one mentor can support more learners and the platform can run long term |
| Mentors can't see a user's identity until they're interested in their work | Reduces bias, so evaluation is based only on the work |
| Assessment shows a **simple result + AI explanation** | Users understand why they were recommended a project, so they trust the matching |
| No penalty for free-riding | The platform doesn't recruit or grade, so free-riding only cheats yourself; users are here to learn |

---

## 6. ⚠️ Known Limitations and Assumptions

* 🙋 **Assumption:** Users genuinely want to learn
* 🚌 **Limitation:** Free-riders may still hold back committed teammates
* 📏 **Limitation:** The quality of AI feedback depends on how well mentors write their Criteria
* 🏢 **Limitation:** Each mentor represents the standards of their company or field, not the whole industry
* 🐣 **Limitation:** Early on, there will be few mentors, so project choice will be limited

---

## 7. 🛠️ MVP Scope (Day 3)

| Type | Content |
|------|---------|
| ✅ Built | Career assessment (scored in the app, AI explanation), project matching, browse and choose projects, task board, Contribution form, team discussion, AI task feedback (based on Criteria), progress panel, AI personal analysis with curated course suggestions, mentor view (anonymous learners) with final feedback |
| 🎭 Simulated | Login ("Viewing as" switch), demo data. Without an API key the AI parts fall back to labelled simulated answers |
| 🎨 Not built | Mentors creating their own projects, real-time group chat |

* 🏷️ The presentation will **clearly label** what is built and what is simulated

**Tech Stack**
* Frontend & Backend: Next.js (React)
* Database: Firebase Firestore
* AI: Claude API
* Design: Figma
* Deployment: Vercel
* Collaboration: GitHub

---

## 8. 🏆 Marking Criteria

| Criteria | Weighting | Our argument |
|----------|-----------|--------------|
| Potential Effectiveness | 40% | Realistic projects + peer collaboration + mentor standards directly address three pain points: knowledge not applied, learning alone, and low motivation |
| Technical Feasibility | 30% | The MVP focuses on project features; everything else is simulated and clearly labelled |
| Originality | 15% | Learners do projects instead of watching courses; AI amplifies mentors instead of replacing them |
| Viability | 10% | Companies gain exposure; AI reduces mentors' time cost so the platform can run long term |

⚠️ Weightings add up to 95%; the remaining 5% needs to be confirmed with the organisers

---

## 9. 📌 Untapped Focus Areas

* **A. AI Tutors and Learning Companions:** AI feedback, AI personal analysis, course recommendations
* **D. Simulations and Virtual Environments:** Projects based on realistic workplace scenarios
* **E. Collaborative Learning:** Team tasks, peer collaboration

---

## 📚 References

* Jordan, K. (2015). *MOOC completion rates: The data.* https://www.researchgate.net/publication/249994962_MOOC_completion_rates_The_data
* Dolata, M. et al. (2019). *How Knowledge Stock Exchanges can increase student success in MOOCs.* https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6762193/
* Schulze, A. S. (2014). *MOOCs and completion rates: are self-directed adult learners the most successful at MOOCs?* Pepperdine University. https://digitalcommons.pepperdine.edu/etd/442/
