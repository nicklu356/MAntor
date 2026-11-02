// Demo data used in demo mode, and loaded into Firebase from the /setup page.
// The shape of every record follows docs/data-structure.md.
import { FIELD_INFO, ITEMS, scoreAssessment } from "./assessment.js";
import { addDays, localDate, templateWeeks } from "./schedule.js";

const T = "2026-09-28T09:00:00.000Z";

// Mia's team is always in week 3 of 4, whatever day the demo runs, so the deadlines and
// milestones look alive: one task done, one a little late, two still to come.
const START = addDays(localDate(), -16);

// A full assessment result for a demo learner: they liked their own field's activities most,
// then the interest types of that field, and were lukewarm about the rest.
function demoResult(field, explanation) {
  const top = Object.entries(FIELD_INFO[field].profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type);
  const answers = Object.fromEntries(
    ITEMS.map((item, i) => [
      item.id,
      item.field === field ? 4 + (i % 2) : top.includes(item.type) ? 3 + (i % 2) : 1 + (i % 3),
    ])
  );
  const r = scoreAssessment(answers);
  return {
    careerField: r.field,
    careerExplanation: explanation,
    careerMatches: r.matches,
    careerProfile: r.profile,
    hollandCode: r.hollandCode,
    careerConfidence: r.confidence,
    careerNotes: r.notes,
    assessedAt: T,
  };
}

export const users = [
  {
    id: "user_001",
    role: "learner",
    name: "Mia Chen",
    anonymousName: "Learner #A3F",
    ...demoResult("UX Design", "You enjoy understanding how people think and turning messy problems into clear visual solutions. UX projects let you practise both."),
    createdAt: T,
  },
  {
    id: "user_002",
    role: "learner",
    name: "Liam Nguyen",
    anonymousName: "Learner #B71",
    ...demoResult("Data Analysis", "You like finding patterns and explaining them with evidence. Data projects reward careful, curious thinking like yours."),
    createdAt: T,
  },
  {
    id: "user_003",
    role: "learner",
    name: "Sofia Rossi",
    anonymousName: "Learner #C09",
    ...demoResult("Cybersecurity", "You are detail oriented and enjoy thinking about how things could go wrong. Security projects turn that instinct into a skill."),
    createdAt: T,
  },
  {
    id: "user_004",
    role: "learner",
    name: "Noah Patel",
    anonymousName: "Learner #D52",
    ...demoResult("Digital Marketing", "You are energised by people and stories. Marketing projects let you test ideas with real audiences."),
    createdAt: T,
  },
  {
    id: "user_101",
    role: "mentor",
    name: "Grace Walker",
    anonymousName: "Mentor #M01",
    company: "Northwind Digital",
    createdAt: T,
  },
  {
    id: "user_102",
    role: "mentor",
    name: "Daniel Kim",
    anonymousName: "Mentor #M02",
    company: "Harbour Analytics",
    createdAt: T,
  },
  {
    id: "user_103",
    role: "mentor",
    name: "Priya Sharma",
    anonymousName: "Mentor #M03",
    company: "Southern Cross Security",
    createdAt: T,
  },
  {
    id: "user_104",
    role: "mentor",
    name: "Ethan Brooks",
    anonymousName: "Mentor #M04",
    company: "Lantern Software",
    createdAt: T,
  },
  {
    id: "user_105",
    role: "mentor",
    name: "Aisha Rahman",
    anonymousName: "Mentor #M05",
    company: "Greenline Consulting",
    createdAt: T,
  },
];

export const projects = [
  {
    id: "project_001",
    title: "Redesign a banking app onboarding flow",
    description:
      "A fintech app loses 40% of new users during sign up. Users say the process is long and confusing. Your team will research why users drop off, then redesign the onboarding flow and test it.",
    field: "UX Design",
    mentorId: "user_101",
    company: "Northwind Digital",
    difficulty: "beginner",
    teamSize: 3,
    criteria: [
      {
        id: "c1",
        name: "User research",
        description: "Interviews at least 3 users and summarises their key needs and pain points.",
      },
      {
        id: "c2",
        name: "Problem definition",
        description: "Turns research into a clear problem statement that the whole team agrees on.",
      },
      {
        id: "c3",
        name: "Design quality",
        description: "The new flow has fewer steps, clear labels, and follows accessibility basics.",
      },
      {
        id: "c4",
        name: "Testing",
        description: "Tests the new design with users and explains what changed because of the results.",
      },
    ],
    taskTemplates: [
      {
        title: "Interview 3 users",
        description: "Find out where and why users drop off during sign up. Write down quotes, not just opinions.",
        criteriaIds: ["c1"],
      },
      {
        title: "Write the problem statement",
        description: "Use the interview notes to write one clear problem statement for the team.",
        criteriaIds: ["c2"],
      },
      {
        title: "Design the new flow",
        description: "Create a wireframe of the new onboarding flow. Share a link to your Figma file.",
        criteriaIds: ["c3"],
      },
      {
        title: "Test and iterate",
        description: "Test the wireframe with 2 users and describe what you changed based on their feedback.",
        criteriaIds: ["c4"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_002",
    title: "Find why online orders are dropping",
    description:
      "An online grocery store saw orders fall by 15% last quarter. You get a sample sales dataset. Your team will clean the data, find the cause, and present a recommendation to the manager.",
    field: "Data Analysis",
    mentorId: "user_102",
    company: "Harbour Analytics",
    difficulty: "beginner",
    teamSize: 3,
    criteria: [
      {
        id: "c1",
        name: "Data cleaning",
        description: "Finds and fixes missing or wrong values, and explains every change made.",
      },
      {
        id: "c2",
        name: "Analysis",
        description: "Compares the right time periods and customer groups to find a likely cause.",
      },
      {
        id: "c3",
        name: "Communication",
        description: "Explains the finding in plain language with one clear chart and a recommendation.",
      },
    ],
    taskTemplates: [
      {
        title: "Clean the dataset",
        description: "List the problems you found in the data and how you fixed each one.",
        criteriaIds: ["c1"],
      },
      {
        title: "Find the cause",
        description: "Compare this quarter with last quarter. Which customers or products changed the most?",
        criteriaIds: ["c2"],
      },
      {
        title: "Present a recommendation",
        description: "Write a short summary for the manager with one chart and one action to take.",
        criteriaIds: ["c3"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_003",
    title: "Respond to a phishing incident",
    description:
      "Several staff at a small accounting firm clicked a suspicious email link this morning. Your team will investigate what happened, contain the risk, and write a short incident report.",
    field: "Cybersecurity",
    mentorId: "user_103",
    company: "Southern Cross Security",
    difficulty: "intermediate",
    teamSize: 3,
    criteria: [
      {
        id: "c1",
        name: "Investigation",
        description: "Identifies the signs of phishing in the email and which accounts may be affected.",
      },
      {
        id: "c2",
        name: "Containment",
        description: "Lists clear, ordered actions to stop the damage, such as password resets and blocking the sender.",
      },
      {
        id: "c3",
        name: "Reporting",
        description: "Writes an incident report that a non technical manager can understand.",
      },
    ],
    taskTemplates: [
      {
        title: "Analyse the phishing email",
        description: "List every warning sign in the email: sender, links, wording, attachments.",
        criteriaIds: ["c1"],
      },
      {
        title: "Write a containment plan",
        description: "What should the firm do in the first hour? Put the actions in order and explain why.",
        criteriaIds: ["c2"],
      },
      {
        title: "Write the incident report",
        description: "Summarise what happened, the impact, and how to prevent it next time.",
        criteriaIds: ["c3"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_004",
    title: "Launch a social campaign for a local cafe",
    description:
      "A local cafe wants more students to visit on weekdays. Your team will research the audience, plan a two week social media campaign, and decide how to measure success.",
    field: "Digital Marketing",
    mentorId: "user_101",
    company: "Northwind Digital",
    difficulty: "beginner",
    teamSize: 3,
    criteria: [
      {
        id: "c1",
        name: "Audience insight",
        description: "Describes the target audience based on evidence, not guesses.",
      },
      {
        id: "c2",
        name: "Campaign plan",
        description: "A realistic two week plan with channels, posts, and timing.",
      },
      {
        id: "c3",
        name: "Measurement",
        description: "Picks 2 or 3 measurable goals and explains how to track them.",
      },
    ],
    taskTemplates: [
      {
        title: "Research the audience",
        description: "Survey or interview at least 5 students about when and why they visit cafes.",
        criteriaIds: ["c1"],
      },
      {
        title: "Plan the campaign",
        description: "Create a two week content calendar with post ideas for each channel.",
        criteriaIds: ["c2"],
      },
      {
        title: "Define success metrics",
        description: "Choose the numbers you will track and set a target for each one.",
        criteriaIds: ["c3"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_005",
    title: "Build a ticket tracker for a support team",
    description:
      "A five person customer support team tracks problems in a shared spreadsheet, and requests get lost. Your team will turn their needs into requirements, build a small web app to log and update tickets, and test it.",
    field: "Software Development",
    mentorId: "user_104",
    company: "Lantern Software",
    difficulty: "intermediate",
    teamSize: 4,
    criteria: [
      { id: "c1", name: "Requirements", description: "Writes clear user stories with acceptance criteria that the support team agrees with." },
      { id: "c2", name: "Working software", description: "The app lets users create, update and close tickets without errors." },
      { id: "c3", name: "Code quality", description: "Code is readable, uses version control with clear commits, and avoids repetition." },
      { id: "c4", name: "Testing", description: "Includes tests or a test checklist for the main flows, and reports what was found." },
    ],
    taskTemplates: [
      {
        title: "Write the user stories",
        description: "Write 5 to 8 user stories for the support team, each with acceptance criteria.",
        criteriaIds: ["c1"],
      },
      {
        title: "Build the first version",
        description: "Build the screens to create and list tickets. Share a link to your GitHub repo.",
        criteriaIds: ["c2", "c3"],
      },
      {
        title: "Add updates and closing",
        description: "Let users change a ticket's status and add notes. Keep commits small and clear.",
        criteriaIds: ["c2", "c3"],
      },
      {
        title: "Test and report",
        description: "Test every user story. List the bugs you found and which ones you fixed.",
        criteriaIds: ["c4"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_006",
    title: "Decide what a study app should build next",
    description:
      "A study planner app has 20,000 student users but growth has stalled. The team has ideas for ten new features and time to build two. Your team will talk to students, prioritise the ideas, and pitch a plan with success metrics.",
    field: "Product Management",
    mentorId: "user_104",
    company: "Lantern Software",
    difficulty: "beginner",
    teamSize: 4,
    criteria: [
      { id: "c1", name: "Customer insight", description: "Bases decisions on real conversations with at least 4 students, not assumptions." },
      { id: "c2", name: "Prioritisation", description: "Uses a clear method (such as impact versus effort) and explains the trade-offs." },
      { id: "c3", name: "Success metrics", description: "Defines how the team will know each feature worked, with a measurable target." },
      { id: "c4", name: "Pitch", description: "Presents a short, persuasive plan that a busy manager can approve." },
    ],
    taskTemplates: [
      {
        title: "Interview students",
        description: "Talk to at least 4 students about how they plan their study and what frustrates them.",
        criteriaIds: ["c1"],
      },
      {
        title: "Prioritise the feature ideas",
        description: "Score the ten ideas for impact and effort, and choose two. Explain what you are not building and why.",
        criteriaIds: ["c2"],
      },
      {
        title: "Set success metrics",
        description: "For each chosen feature, pick one number to track and a target for the first month.",
        criteriaIds: ["c3"],
      },
      {
        title: "Pitch the plan",
        description: "Write a one page pitch for the head of product.",
        criteriaIds: ["c4"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_007",
    title: "Fix a slow refund process",
    description:
      "An online electronics store takes 14 days on average to refund customers, and complaints are rising. Your team will map how refunds work today, find the delays, and recommend changes with their expected effect.",
    field: "Business Analysis",
    mentorId: "user_102",
    company: "Harbour Analytics",
    difficulty: "beginner",
    teamSize: 3,
    criteria: [
      { id: "c1", name: "Process mapping", description: "Maps every step and hand-off of the current process, including who does what." },
      { id: "c2", name: "Root cause", description: "Identifies where time is lost and backs it with evidence, not guesses." },
      { id: "c3", name: "Recommendation", description: "Proposes specific changes with expected time saved and any risks." },
    ],
    taskTemplates: [
      {
        title: "Map the current process",
        description: "Draw the refund process from the customer's request to the money arriving. Note every hand-off.",
        criteriaIds: ["c1"],
      },
      {
        title: "Find the delays",
        description: "Use the sample case log to find which steps take longest and why.",
        criteriaIds: ["c2"],
      },
      {
        title: "Recommend the new process",
        description: "Draw the improved process and estimate how many days it saves.",
        criteriaIds: ["c3"],
      },
    ],
    createdAt: T,
  },
  {
    id: "project_008",
    title: "Cut a cafe chain's energy and waste",
    description:
      "A chain of four cafes wants to cut its energy bills and food waste by 20% this year, without hurting service. Your team will measure a baseline, research practical options, and present a costed plan to the owners.",
    field: "Sustainability Consulting",
    mentorId: "user_105",
    company: "Greenline Consulting",
    difficulty: "beginner",
    teamSize: 3,
    criteria: [
      { id: "c1", name: "Baseline", description: "Estimates current energy use and waste from the sample bills and logs, and states assumptions." },
      { id: "c2", name: "Options analysis", description: "Compares at least 4 realistic options by impact, cost and effort." },
      { id: "c3", name: "Business case", description: "Recommends a plan with costs, savings, payback time and how staff will be involved." },
    ],
    taskTemplates: [
      {
        title: "Measure the baseline",
        description: "Use the sample energy bills and waste log to estimate where the biggest impacts are.",
        criteriaIds: ["c1"],
      },
      {
        title: "Research the options",
        description: "Find at least 4 options (for example equipment, schedules, suppliers, staff habits) and compare them.",
        criteriaIds: ["c2"],
      },
      {
        title: "Present the plan",
        description: "Write a short plan for the owners with costs, savings and a first-month action list.",
        criteriaIds: ["c3"],
      },
    ],
    createdAt: T,
  },
];

// Each sample project lasts one week per task, and each task is due at the end of its week.
for (const project of projects) {
  project.durationWeeks = project.taskTemplates.length;
  templateWeeks(project.taskTemplates, project.durationWeeks).forEach((week, i) => {
    project.taskTemplates[i].week = week;
  });
}

// One team already in progress, so the demo has something to show straight away.
export const teams = [
  {
    id: "team_001",
    projectId: "project_001",
    memberIds: ["user_001", "user_002"],
    status: "active",
    startDate: START,
    endDate: addDays(START, 28),
    createdAt: T,
  },
  // A finished project (with mentor final feedback), so portfolios and the mentor dashboard
  // show what "completed" looks like.
  {
    id: "team_002",
    projectId: "project_002",
    memberIds: ["user_002", "user_003"],
    status: "completed",
    startDate: "2026-09-10",
    endDate: "2026-10-01",
    createdAt: "2026-09-10T09:00:00.000Z",
  },
];

export const tasks = [
  {
    id: "task_001",
    week: 1,
    dueDate: addDays(START, 7),
    projectId: "project_001",
    teamId: "team_001",
    title: "Interview 3 users",
    description: "Find out where and why users drop off during sign up. Write down quotes, not just opinions.",
    criteriaIds: ["c1"],
    status: "done",
    assigneeIds: ["user_001"],
    submission: {
      content:
        "We interviewed 3 users aged 20 to 35. Key findings: (1) All 3 were confused by the ID verification step, one said 'I didn't know why they needed my passport'. (2) 2 of 3 gave up when asked to create a password with too many rules. (3) Users wanted to see how many steps were left.",
      submittedBy: "user_001",
      submittedAt: "2026-09-29T03:00:00.000Z",
    },
    createdAt: T,
  },
  {
    id: "task_002",
    week: 2,
    dueDate: addDays(START, 14),
    projectId: "project_001",
    teamId: "team_001",
    title: "Write the problem statement",
    description: "Use the interview notes to write one clear problem statement for the team.",
    criteriaIds: ["c2"],
    status: "in_progress",
    assigneeIds: ["user_002"],
    submission: null,
    // An open "Ask the mentor" request, so the mentor's attention list has something in it.
    helpRequest: {
      userId: "user_002",
      note: "We have three pain points from the interviews. Should the problem statement cover all three, or focus on the biggest one?",
      at: "2026-09-30T02:00:00.000Z",
      resolvedAt: null,
      resolvedBy: null,
    },
    createdAt: T,
  },
  {
    id: "task_003",
    week: 3,
    dueDate: addDays(START, 21),
    projectId: "project_001",
    teamId: "team_001",
    title: "Design the new flow",
    description: "Create a wireframe of the new onboarding flow. Share a link to your Figma file.",
    criteriaIds: ["c3"],
    status: "todo",
    assigneeIds: [],
    submission: null,
    createdAt: T,
  },
  {
    id: "task_004",
    week: 4,
    dueDate: addDays(START, 28),
    projectId: "project_001",
    teamId: "team_001",
    title: "Test and iterate",
    description: "Test the wireframe with 2 users and describe what you changed based on their feedback.",
    criteriaIds: ["c4"],
    status: "todo",
    assigneeIds: [],
    submission: null,
    createdAt: T,
  },

  {
    id: "task_101",
    week: 1,
    dueDate: "2026-09-17",
    projectId: "project_002",
    teamId: "team_002",
    title: "Clean the dataset",
    description: "List the problems you found in the data and how you fixed each one.",
    criteriaIds: ["c1"],
    status: "done",
    assigneeIds: ["user_002"],
    submission: {
      content:
        "Problems found: (1) 212 orders had no region, we filled them from the delivery postcode. (2) 38 duplicate order ids from a checkout retry bug, we kept the first row only. (3) Prices in March were stored in cents, we divided by 100. Every change is listed in the 'changes' tab with the row count.",
      submittedBy: "user_002",
      submittedAt: "2026-09-12T05:00:00.000Z",
    },
    createdAt: "2026-09-10T09:00:00.000Z",
  },
  {
    id: "task_102",
    week: 2,
    dueDate: "2026-09-24",
    projectId: "project_002",
    teamId: "team_002",
    title: "Find the cause",
    description: "Compare this quarter with last quarter. Which customers or products changed the most?",
    criteriaIds: ["c2"],
    status: "done",
    assigneeIds: ["user_002", "user_003"],
    submission: {
      content:
        "Orders fell 15% overall, but almost all of the drop is from returning customers in the north region (-41%). New customers are flat. The drop starts the week the delivery fee rose from $4 to $9 for orders under $50, and baskets just under $50 fell the most.",
      submittedBy: "user_003",
      submittedAt: "2026-09-15T05:00:00.000Z",
    },
    createdAt: "2026-09-10T09:00:00.000Z",
  },
  {
    id: "task_103",
    week: 3,
    dueDate: "2026-10-01",
    projectId: "project_002",
    teamId: "team_002",
    title: "Present a recommendation",
    description: "Write a short summary for the manager with one chart and one action to take.",
    criteriaIds: ["c3"],
    status: "done",
    assigneeIds: ["user_002"],
    submission: {
      content:
        "Summary for the manager: the order drop comes from loyal customers in the north after the delivery fee increase. Chart: weekly orders by region, with the fee change marked. Recommendation: test a free-delivery threshold at $40 for returning customers for 4 weeks and track repeat orders.",
      submittedBy: "user_002",
      submittedAt: "2026-09-18T05:00:00.000Z",
    },
    createdAt: "2026-09-10T09:00:00.000Z",
  },
];

export const contributions = [
  {
    id: "contrib_001",
    taskId: "task_001",
    teamId: "team_001",
    userId: "user_001",
    description: "Ran 2 of the 3 interviews and wrote the summary of findings.",
    hoursSpent: 3,
    kudos: [{ userId: "user_002", at: "2026-09-29T03:05:00.000Z" }],
    createdAt: "2026-09-29T02:00:00.000Z",
  },
  {
    id: "contrib_002",
    taskId: "task_001",
    teamId: "team_001",
    userId: "user_002",
    description: "Wrote the interview questions and ran 1 interview.",
    hoursSpent: 2,
    createdAt: "2026-09-29T02:30:00.000Z",
  },
  {
    id: "contrib_101",
    taskId: "task_101",
    teamId: "team_002",
    userId: "user_002",
    description: "Found the duplicate orders and the cents bug, and wrote the change log.",
    hoursSpent: 4,
    createdAt: "2026-09-12T04:00:00.000Z",
  },
  {
    id: "contrib_102",
    taskId: "task_102",
    teamId: "team_002",
    userId: "user_003",
    description: "Built the region and customer-type comparison and spotted the fee change date.",
    hoursSpent: 5,
    kudos: [{ userId: "user_002", at: "2026-09-15T05:30:00.000Z" }],
    createdAt: "2026-09-15T04:00:00.000Z",
  },
  {
    id: "contrib_103",
    taskId: "task_102",
    teamId: "team_002",
    userId: "user_002",
    description: "Checked basket sizes around the $50 threshold.",
    hoursSpent: 2,
    createdAt: "2026-09-15T04:30:00.000Z",
  },
  {
    id: "contrib_104",
    taskId: "task_103",
    teamId: "team_002",
    userId: "user_002",
    description: "Wrote the manager summary and made the weekly orders chart.",
    hoursSpent: 3,
    createdAt: "2026-09-18T04:00:00.000Z",
  },
];

// One example AI review so the demo shows feedback immediately (no waiting for the API).
// It is labelled "Example" in the app. Resubmitting a richer answer and clicking
// "Get new feedback" shows the score change in the progress panel.
export const feedback = [
  {
    id: "fb_seed_001",
    taskId: "task_001",
    teamId: "team_001",
    source: "ai",
    kind: "task",
    sample: true,
    simulated: false,
    scores: [
      {
        criteriaId: "c1",
        score: 3,
        comment:
          "You interviewed 3 users and kept real quotes, which is a strong start. To reach the top score, add one sentence per user about their key need, and say how many users shared each pain point.",
      },
    ],
    summary:
      "Good research base with real quotes. The most useful next step is to turn the findings into clear user needs, so the problem statement is easy to write.",
    createdAt: "2026-09-29T04:00:00.000Z",
  },
  {
    id: "fb_seed_101",
    taskId: "task_101",
    teamId: "team_002",
    source: "ai",
    kind: "task",
    requestedBy: "user_002",
    simulated: false,
    scores: [
      {
        criteriaId: "c1",
        score: 3,
        comment: "You found real problems, but say how you fixed each one and how many rows it affected.",
      },
    ],
    summary: "Good eye for data problems. Add the fix and the row count for every change.",
    createdAt: "2026-09-11T06:00:00.000Z",
  },
  {
    id: "fb_seed_102",
    taskId: "task_101",
    teamId: "team_002",
    source: "ai",
    kind: "task",
    requestedBy: "user_002",
    simulated: false,
    scores: [
      {
        criteriaId: "c1",
        score: 5,
        comment: "Every problem now has a fix and a row count, and the change log makes your work easy to check.",
      },
    ],
    summary: "Clear, checkable cleaning. This is the standard a manager expects.",
    createdAt: "2026-09-12T06:00:00.000Z",
  },
  {
    id: "fb_seed_103",
    taskId: "task_102",
    teamId: "team_002",
    source: "ai",
    kind: "task",
    requestedBy: "user_003",
    simulated: false,
    scores: [
      {
        criteriaId: "c2",
        score: 4,
        comment: "Strong comparison by region and customer type. Rule out one other cause (for example a competitor promotion) to be sure.",
      },
    ],
    summary: "You found a likely cause with good evidence. Ruling out one alternative would make it convincing.",
    createdAt: "2026-09-15T06:00:00.000Z",
  },
  {
    id: "fb_seed_104",
    taskId: "task_103",
    teamId: "team_002",
    source: "ai",
    kind: "task",
    requestedBy: "user_002",
    simulated: false,
    scores: [
      {
        criteriaId: "c3",
        score: 4,
        comment: "Plain language and one clear action. Put the expected impact in numbers so the manager can decide.",
      },
    ],
    summary: "A manager could act on this today. Add the expected impact to make the decision easy.",
    createdAt: "2026-09-18T06:00:00.000Z",
  },
  {
    id: "fb_seed_105",
    taskId: null,
    teamId: "team_002",
    source: "mentor",
    kind: "final",
    authorId: "user_102",
    simulated: false,
    scores: [
      { criteriaId: "c1", score: 5, comment: "The change log is exactly what our analysts do." },
      { criteriaId: "c2", score: 4, comment: "Good segmenting. Next time test one alternative explanation." },
      { criteriaId: "c3", score: 4, comment: "Clear recommendation with a sensible test." },
    ],
    summary:
      "This is work I would be happy to see from a junior analyst. You cleaned the data carefully, found the cause by comparing the right groups, and turned it into a recommendation a manager can test. Keep practising putting numbers on the expected impact.",
    createdAt: "2026-09-20T06:00:00.000Z",
  },
];

// Short team discussion under a task (learners and the project's mentor).
export const comments = [
  {
    id: "comment_seed_001",
    taskId: "task_001",
    teamId: "team_001",
    userId: "user_002",
    text: "Nice summary. I can draft the problem statement from these three findings.",
    createdAt: "2026-09-29T03:10:00.000Z",
  },
  {
    id: "comment_seed_002",
    taskId: "task_001",
    teamId: "team_001",
    userId: "user_101",
    text: "Good use of direct quotes. Next time note which user said each one, so patterns are easier to spot.",
    createdAt: "2026-09-29T05:00:00.000Z",
  },
  {
    id: "comment_seed_101",
    taskId: "task_102",
    teamId: "team_002",
    userId: "user_003",
    text: "The north region drop lines up with the fee change week. Can someone check basket sizes near $50?",
    createdAt: "2026-09-14T03:00:00.000Z",
  },
];

// AI personal analyses are created in the app (empty at the start).
export const analyses = [];

export const connections = [];
