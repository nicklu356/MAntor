// Career assessment: 6 questions, each answer points to one career field.
// The field with the most points wins (ties go to the earlier field in FIELDS).
// The field names must match the `field` of the projects in lib/seed.js.

export const FIELDS = ["UX Design", "Data Analysis", "Cybersecurity", "Digital Marketing"];

export const FIELD_INFO = {
  "UX Design": {
    blurb:
      "You enjoy understanding how people think and turning messy problems into clear visual solutions. UX projects let you practise both.",
  },
  "Data Analysis": {
    blurb:
      "You like finding patterns and explaining them with evidence. Data projects reward careful, curious thinking like yours.",
  },
  Cybersecurity: {
    blurb:
      "You are detail oriented and enjoy thinking about how things could go wrong. Security projects turn that instinct into a skill.",
  },
  "Digital Marketing": {
    blurb:
      "You are energised by people and stories. Marketing projects let you test ideas with real audiences.",
  },
};

// Each option: { text, field }
export const QUESTIONS = [
  {
    id: "q1",
    text: "Which task sounds like the most fun on a free afternoon?",
    options: [
      { text: "Sketching how an app screen could be easier to use", field: "UX Design" },
      { text: "Digging through a spreadsheet to find why the numbers changed", field: "Data Analysis" },
      { text: "Working out how someone could break into a system", field: "Cybersecurity" },
      { text: "Planning a social post that gets people talking", field: "Digital Marketing" },
    ],
  },
  {
    id: "q2",
    text: "A friend's app keeps getting bad reviews. What do you do first?",
    options: [
      { text: "Watch people use it and ask where they get stuck", field: "UX Design" },
      { text: "Look at usage numbers to see where people drop off", field: "Data Analysis" },
      { text: "Check whether the complaints hide a security or privacy problem", field: "Cybersecurity" },
      { text: "Rewrite the store page so it attracts the right kind of users", field: "Digital Marketing" },
    ],
  },
  {
    id: "q3",
    text: "Which strength describes you best?",
    options: [
      { text: "I understand how other people feel", field: "UX Design" },
      { text: "I notice patterns others miss", field: "Data Analysis" },
      { text: "I spot small details and think about risks", field: "Cybersecurity" },
      { text: "I can explain an idea so people care about it", field: "Digital Marketing" },
    ],
  },
  {
    id: "q4",
    text: "Which result would make you proudest?",
    options: [
      { text: "A design people say \"just works\"", field: "UX Design" },
      { text: "A chart that makes the answer obvious", field: "Data Analysis" },
      { text: "A threat caught before it did any damage", field: "Cybersecurity" },
      { text: "A campaign that reached lots of new people", field: "Digital Marketing" },
    ],
  },
  {
    id: "q5",
    text: "Which activity did you enjoy most at school or in your hobbies?",
    options: [
      { text: "Art, design or building things", field: "UX Design" },
      { text: "Maths, statistics or science experiments", field: "Data Analysis" },
      { text: "Logic puzzles, escape rooms or capture-the-flag games", field: "Cybersecurity" },
      { text: "Writing, video or running a social account", field: "Digital Marketing" },
    ],
  },
  {
    id: "q6",
    text: "How do you like to work?",
    options: [
      { text: "Talking with people to understand what they need", field: "UX Design" },
      { text: "Alone with the data until a pattern appears", field: "Data Analysis" },
      { text: "Methodically, checking every step for weak points", field: "Cybersecurity" },
      { text: "Trying creative ideas and seeing how the audience reacts", field: "Digital Marketing" },
    ],
  },
];

// answers = { q1: 0, q2: 3, ... } (index of the chosen option)
export function scoreAssessment(answers) {
  const scores = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  for (const q of QUESTIONS) {
    const option = q.options[answers[q.id]];
    if (option) scores[option.field] += 1;
  }
  const ranked = [...FIELDS].sort((a, b) => scores[b] - scores[a]);
  return { scores, field: ranked[0], runnerUp: scores[ranked[1]] > 0 ? ranked[1] : null };
}

// Short readable list of the chosen answers (sent to the AI to write the explanation).
export function describeAnswers(answers) {
  return QUESTIONS.filter((q) => q.options[answers[q.id]]).map((q) => ({
    question: q.text,
    answer: q.options[answers[q.id]].text,
  }));
}
