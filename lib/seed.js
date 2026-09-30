// Demo data used in demo mode, and loaded into Firebase from the /setup page.
// The shape of every record follows docs/data-structure.md.

const T = "2026-09-28T09:00:00.000Z";

export const users = [
  {
    id: "user_001",
    role: "learner",
    name: "Mia Chen",
    anonymousName: "Learner #A3F",
    careerField: "UX Design",
    careerExplanation:
      "You enjoy understanding how people think and turning messy problems into clear visual solutions. UX projects let you practise both.",
    createdAt: T,
  },
  {
    id: "user_002",
    role: "learner",
    name: "Liam Nguyen",
    anonymousName: "Learner #B71",
    careerField: "Data Analysis",
    careerExplanation:
      "You like finding patterns and explaining them with evidence. Data projects reward careful, curious thinking like yours.",
    createdAt: T,
  },
  {
    id: "user_003",
    role: "learner",
    name: "Sofia Rossi",
    anonymousName: "Learner #C09",
    careerField: "Cybersecurity",
    careerExplanation:
      "You are detail oriented and enjoy thinking about how things could go wrong. Security projects turn that instinct into a skill.",
    createdAt: T,
  },
  {
    id: "user_004",
    role: "learner",
    name: "Noah Patel",
    anonymousName: "Learner #D52",
    careerField: "Digital Marketing",
    careerExplanation:
      "You are energised by people and stories. Marketing projects let you test ideas with real audiences.",
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
];

// One team already in progress, so the demo has something to show straight away.
export const teams = [
  {
    id: "team_001",
    projectId: "project_001",
    memberIds: ["user_001", "user_002"],
    status: "active",
    createdAt: T,
  },
];

export const tasks = [
  {
    id: "task_001",
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
    projectId: "project_001",
    teamId: "team_001",
    title: "Write the problem statement",
    description: "Use the interview notes to write one clear problem statement for the team.",
    criteriaIds: ["c2"],
    status: "in_progress",
    assigneeIds: ["user_002"],
    submission: null,
    createdAt: T,
  },
  {
    id: "task_003",
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
];

export const contributions = [
  {
    id: "contrib_001",
    taskId: "task_001",
    teamId: "team_001",
    userId: "user_001",
    description: "Ran 2 of the 3 interviews and wrote the summary of findings.",
    hoursSpent: 3,
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
];

// AI personal analyses are created in the app (empty at the start).
export const analyses = [];
