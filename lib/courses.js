// Curated course list used for AI course recommendations.
// The AI may ONLY pick from this list (it can never invent a course or a link).
// Names are real Google Career Certificates on Coursera. Links use Coursera's search page
// (the UX one is the direct page), so they cannot go stale. Replace with vetted links if you like.
const search = (q) => `https://www.coursera.org/search?query=${encodeURIComponent(q)}`;

export const COURSES = [
  {
    id: "course_ux",
    title: "Google UX Design Professional Certificate",
    provider: "Coursera / Google",
    field: "UX Design",
    level: "beginner",
    url: "https://www.coursera.org/google-certificates/google-ux-design",
  },
  {
    id: "course_data",
    title: "Google Data Analytics Professional Certificate",
    provider: "Coursera / Google",
    field: "Data Analysis",
    level: "beginner",
    url: search("Google Data Analytics Professional Certificate"),
  },
  {
    id: "course_security",
    title: "Google Cybersecurity Professional Certificate",
    provider: "Coursera / Google",
    field: "Cybersecurity",
    level: "beginner",
    url: search("Google Cybersecurity Professional Certificate"),
  },
  {
    id: "course_marketing",
    title: "Google Digital Marketing & E-Commerce Professional Certificate",
    provider: "Coursera / Google",
    field: "Digital Marketing",
    level: "beginner",
    url: search("Google Digital Marketing & E-Commerce Professional Certificate"),
  },
  {
    id: "course_pm",
    title: "Google Project Management Professional Certificate",
    provider: "Coursera / Google",
    field: "General",
    level: "beginner",
    url: search("Google Project Management Professional Certificate"),
  },
  {
    id: "course_ai",
    title: "Google AI Essentials",
    provider: "Coursera / Google",
    field: "General",
    level: "beginner",
    url: search("Google AI Essentials"),
  },
];

export const getCourse = (id) => COURSES.find((c) => c.id === id) || null;
