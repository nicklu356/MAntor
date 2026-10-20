// Career assessment, built on Holland's RIASEC interest model (the model behind O*NET's Interest Profiler).
//
// The learner rates 32 work activities from "Strongly dislike" (1) to "Strongly like" (5).
// Every activity belongs to one RIASEC interest type; most also belong to one career field.
// Fit for a field = 60% how much they liked that field's own activities
//                 + 40% how closely the SHAPE of their RIASEC profile matches the field's profile.
// Using the shape (not the raw level) means someone who rates everything highly still gets a
// meaningful ranking. Consistency checks flag answers that make the result less certain.
//
// It is a guide for choosing a first project, not a validated psychometric test.
// The field names must match the `field` of the projects in lib/seed.js (see lib/config.js).
import { FIELDS } from "./config.js";

export { FIELDS };

export const SCALE = [
  { value: 1, label: "Strongly dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly like" },
];

export const RIASEC = {
  R: { name: "Realistic", nickname: "Builder", description: "Hands-on work with tools, systems and how things physically work." },
  I: { name: "Investigative", nickname: "Thinker", description: "Analysing, researching and solving problems with evidence." },
  A: { name: "Artistic", nickname: "Creator", description: "Designing, writing and coming up with original ideas." },
  S: { name: "Social", nickname: "Helper", description: "Understanding, helping and teaching people." },
  E: { name: "Enterprising", nickname: "Persuader", description: "Leading, persuading and making business decisions." },
  C: { name: "Conventional", nickname: "Organiser", description: "Structure, accuracy, data and clear processes." },
};
export const RIASEC_KEYS = Object.keys(RIASEC);

// profile: how strongly each RIASEC type describes the field (0 to 1).
export const FIELD_INFO = {
  "UX Design": {
    profile: { A: 1, S: 0.7, I: 0.6, E: 0.2 },
    blurb:
      "You enjoy understanding how people think and turning messy problems into clear visual solutions. UX projects let you practise both.",
    summary: "Make apps and websites easy and pleasant to use, by studying real users and designing around them.",
    dayToDay: ["Interview and observe users", "Sketch and prototype screens", "Test designs and improve them"],
    roles: ["UX designer", "UX researcher", "Product designer"],
    skills: ["User research", "Wireframing (Figma)", "Usability testing", "Accessibility basics"],
  },
  "Data Analysis": {
    profile: { I: 1, C: 0.8, R: 0.2 },
    blurb:
      "You like finding patterns and explaining them with evidence. Data projects reward careful, curious thinking like yours.",
    summary: "Turn raw numbers into answers: why sales dropped, which customers leave, what to do next.",
    dayToDay: ["Clean and combine datasets", "Look for patterns and causes", "Explain findings with clear charts"],
    roles: ["Data analyst", "Reporting analyst", "Junior data scientist"],
    skills: ["Spreadsheets", "SQL", "Charts and dashboards", "Explaining numbers in plain language"],
  },
  Cybersecurity: {
    profile: { I: 0.9, R: 0.7, C: 0.7 },
    blurb:
      "You are detail oriented and enjoy thinking about how things could go wrong. Security projects turn that instinct into a skill.",
    summary: "Protect people and companies from attacks by finding weak spots before attackers do.",
    dayToDay: ["Investigate suspicious activity", "Check systems against security standards", "Plan the response to incidents"],
    roles: ["Security analyst", "SOC analyst", "IT risk and compliance analyst"],
    skills: ["Networking basics", "Threat analysis", "Security frameworks", "Incident reporting"],
  },
  "Digital Marketing": {
    profile: { E: 1, A: 0.7, S: 0.4 },
    blurb: "You are energised by people and stories. Marketing projects let you test ideas with real audiences.",
    summary: "Help the right people discover a product, using content, social media, ads and data.",
    dayToDay: ["Research audiences", "Create and schedule content", "Measure what works and adjust"],
    roles: ["Digital marketing coordinator", "Social media specialist", "Content marketer"],
    skills: ["Audience research", "Copywriting", "Campaign planning", "Analytics"],
  },
  "Software Development": {
    profile: { I: 1, R: 0.8, C: 0.5, A: 0.3 },
    blurb:
      "You like building things that work and figuring out why they break. Software projects let you turn ideas into working tools.",
    summary: "Design, write and test the code behind apps, websites and the systems companies run on.",
    dayToDay: ["Turn requirements into code", "Find and fix bugs", "Review code and write tests with the team"],
    roles: ["Junior software developer", "Front-end developer", "QA / test engineer"],
    skills: ["A programming language (JavaScript or Python)", "Debugging", "Git", "Testing"],
  },
  "Product Management": {
    profile: { E: 1, S: 0.6, I: 0.6, A: 0.3 },
    blurb:
      "You like deciding what matters most and bringing people together around a plan. Product projects put those strengths to work.",
    summary: "Decide what a product should do next, and lead designers, engineers and the business to build it.",
    dayToDay: ["Talk to customers about their problems", "Prioritise what to build next", "Align the team on goals and success metrics"],
    roles: ["Associate product manager", "Product owner", "Product analyst"],
    skills: ["Customer discovery", "Prioritisation", "Success metrics", "Clear written communication"],
  },
  "Business Analysis": {
    profile: { C: 1, I: 0.7, E: 0.6, S: 0.3 },
    blurb:
      "You like bringing order to messy situations and backing decisions with facts. Business analysis projects reward exactly that.",
    summary: "Find out how a business really works, where it loses time or money, and what should change.",
    dayToDay: ["Map business processes", "Gather requirements from stakeholders", "Recommend improvements with evidence"],
    roles: ["Business analyst", "Process analyst", "Operations analyst"],
    skills: ["Process mapping", "Requirements writing", "Stakeholder interviews", "Spreadsheets"],
  },
  "Sustainability Consulting": {
    profile: { I: 0.8, S: 0.7, E: 0.6, R: 0.4 },
    blurb:
      "You care about real-world impact and like solving problems with evidence. Sustainability projects connect both.",
    summary: "Help organisations cut emissions, energy and waste in ways that also make business sense.",
    dayToDay: ["Measure energy, emissions or waste", "Research practical options", "Build the business case and bring staff on board"],
    roles: ["Sustainability analyst", "ESG reporting analyst", "Energy efficiency consultant"],
    skills: ["Carbon and energy basics", "Data collection", "Cost-benefit analysis", "Stakeholder engagement"],
  },
};

// Items are mixed on purpose, so the same field never appears twice in a row.
// type: RIASEC type. field: the career field this activity belongs to (null = general interest item).
export const ITEMS = [
  { id: "a01", text: "Sketch screens of an app so it is easier to use", type: "A", field: "UX Design" },
  { id: "a02", text: "Find patterns in a large spreadsheet", type: "I", field: "Data Analysis" },
  { id: "a03", text: "Write code that automates a boring task", type: "R", field: "Software Development" },
  { id: "a04", text: "Plan a campaign to reach a new audience", type: "E", field: "Digital Marketing" },
  { id: "a05", text: "Map out each step of a business process to find delays", type: "C", field: "Business Analysis" },
  { id: "a06", text: "Work out how a hacker might break into a system", type: "I", field: "Cybersecurity" },
  { id: "a07", text: "Decide which features a product should build next", type: "E", field: "Product Management" },
  { id: "a08", text: "Measure how much energy or waste a building produces", type: "R", field: "Sustainability Consulting" },
  { id: "a09", text: "Teach or tutor someone a new skill", type: "S", field: null },
  { id: "a10", text: "Watch people use a website and note where they get stuck", type: "I", field: "UX Design" },
  { id: "a11", text: "Clean up messy data so it is accurate", type: "C", field: "Data Analysis" },
  { id: "a12", text: "Track down why a program crashes", type: "I", field: "Software Development" },
  { id: "a13", text: "Write a social media post that gets people talking", type: "A", field: "Digital Marketing" },
  { id: "a14", text: "Write clear requirements so a team knows exactly what to build", type: "C", field: "Business Analysis" },
  { id: "a15", text: "Set up firewalls and network settings", type: "R", field: "Cybersecurity" },
  { id: "a16", text: "Get designers, engineers and customers to agree on one plan", type: "S", field: "Product Management" },
  { id: "a17", text: "Research how a company could cut its carbon emissions", type: "I", field: "Sustainability Consulting" },
  { id: "a18", text: "Design a poster, logo or illustration", type: "A", field: null },
  { id: "a19", text: "Interview people about what frustrates them", type: "S", field: "UX Design" },
  { id: "a20", text: "Build a dashboard that tracks key numbers every week", type: "C", field: "Data Analysis" },
  { id: "a21", text: "Build a small app from scratch", type: "R", field: "Software Development" },
  { id: "a22", text: "Create a short video to promote a product", type: "A", field: "Digital Marketing" },
  { id: "a23", text: "Recommend changes to managers based on facts", type: "E", field: "Business Analysis" },
  { id: "a24", text: "Check that systems follow a security checklist", type: "C", field: "Cybersecurity" },
  { id: "a25", text: "Pitch an idea for a new product to managers", type: "E", field: "Product Management" },
  { id: "a26", text: "Run a workshop to help staff adopt greener habits", type: "S", field: "Sustainability Consulting" },
  { id: "a27", text: "Fix or put together a piece of equipment", type: "R", field: null },
  { id: "a28", text: "Read research to understand why something happens", type: "I", field: null },
  { id: "a29", text: "Write a story, blog post or article", type: "A", field: null },
  { id: "a30", text: "Volunteer to support people in your community", type: "S", field: null },
  { id: "a31", text: "Lead a team project and keep everyone on track", type: "E", field: null },
  { id: "a32", text: "Keep detailed records and organise files so nothing gets lost", type: "C", field: null },
];

// Kept for older code paths: the questions are the items.
export const QUESTIONS = ITEMS;

const ACTIVITY_WEIGHT = 0.6;
const SHAPE_WEIGHT = 0.4;

const norm = (rating) => (rating - 1) / 4; // 1..5 -> 0..1
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function cosine(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const size = Math.sqrt(a.reduce((s, v) => s + v * v, 0)) * Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return size ? dot / size : 0;
}

const centred = (values) => {
  const m = mean(values);
  return values.map((v) => v - m);
};

// answers = { a01: 4, a02: 2, ... } (1 to 5). Unanswered items are ignored.
export function scoreAssessment(answers) {
  const rated = ITEMS.filter((item) => Number.isInteger(answers[item.id]) && answers[item.id] >= 1 && answers[item.id] <= 5);
  const valueOf = (item) => norm(answers[item.id]);

  // RIASEC profile: average liking per type, 0 to 1.
  const profile = Object.fromEntries(
    RIASEC_KEYS.map((key) => [key, mean(rated.filter((i) => i.type === key).map(valueOf))])
  );
  const profileVector = centred(RIASEC_KEYS.map((key) => profile[key]));

  const matches = FIELDS.map((field) => {
    const own = rated.filter((i) => i.field === field).map(valueOf);
    const activity = mean(own);
    const fieldVector = centred(RIASEC_KEYS.map((key) => FIELD_INFO[field].profile[key] || 0));
    const shape = (cosine(profileVector, fieldVector) + 1) / 2;
    const fit = ACTIVITY_WEIGHT * activity + SHAPE_WEIGHT * shape;
    return { field, fit, percent: Math.round(fit * 100), activity, shape };
  }).sort((a, b) => b.fit - a.fit || FIELDS.indexOf(a.field) - FIELDS.indexOf(b.field));

  // Holland code: the 3 strongest types, e.g. "ICR".
  const hollandCode = [...RIASEC_KEYS]
    .sort((a, b) => profile[b] - profile[a] || RIASEC_KEYS.indexOf(a) - RIASEC_KEYS.indexOf(b))
    .slice(0, 3)
    .join("");

  // Consistency checks.
  const ratings = rated.map((i) => answers[i.id]);
  const spread = Math.sqrt(mean(ratings.map((r) => (r - mean(ratings)) ** 2)));
  const notes = [];
  if (rated.length < ITEMS.length) notes.push(`You answered ${rated.length} of ${ITEMS.length} activities.`);
  if (spread < 0.6) {
    notes.push("You gave most activities the same rating, so the differences between fields are small. Try to use the whole scale.");
  }
  if (mean(ratings) < 2.2) {
    notes.push("You disliked most activities. Your top match is the least disliked field, so treat it as a starting point to explore.");
  }
  const gap = matches[0].fit - matches[1].fit;
  if (gap < 0.04) notes.push(`${matches[0].field} and ${matches[1].field} are almost tied. Try a project in each.`);

  const confidence =
    spread < 0.6 || mean(ratings) < 2.2 || rated.length < ITEMS.length * 0.8 ? "low" : gap < 0.04 ? "medium" : "high";

  return {
    field: matches[0].field,
    runnerUp: matches[1].field,
    matches: matches.map(({ field, percent }) => ({ field, percent })),
    profile: Object.fromEntries(RIASEC_KEYS.map((k) => [k, Math.round(profile[k] * 100)])),
    hollandCode,
    confidence,
    notes,
  };
}

// The activities the learner liked and disliked most (sent to the AI to write the explanation).
export function describeAnswers(answers) {
  const rated = ITEMS.filter((item) => answers[item.id]);
  return {
    liked: rated.filter((i) => answers[i.id] >= 4).sort((a, b) => answers[b.id] - answers[a.id]).map((i) => i.text),
    disliked: rated.filter((i) => answers[i.id] <= 2).sort((a, b) => answers[a.id] - answers[b.id]).map((i) => i.text),
  };
}

// The percent match for a field from a saved result, or null if there is none.
export function matchPercent(user, field) {
  return user?.careerMatches?.find((m) => m.field === field)?.percent ?? null;
}
