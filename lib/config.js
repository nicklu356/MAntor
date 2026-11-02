// App name and tagline (shown in the header, the home banner and the browser tab).
export const APP_NAME = "MAntor";
export const TEAM_NAME = "Team Sweet Potato";
// Where people can contact the team (used on the Privacy page). Set CONTACT_EMAIL to show an email.
export const CONTACT_EMAIL = "";
export const REPOSITORY_URL = "https://github.com/nicklu356/MAntor";
export const APP_TAGLINE = "Learn by doing real-world projects, guided by industry mentors";

// Input limits (also enforced on the server in app/api/*).
export const MAX_SUBMISSION_CHARS = 4000;
export const MAX_COMMENT_CHARS = 1000;
export const MAX_FEEDBACK_CHARS = 1500;
export const MAX_COACH_MESSAGE_CHARS = 800;
export const MAX_PROJECT_DESCRIPTION_CHARS = 1200;

// Career fields. Projects, the assessment and the course list all use these names.
export const FIELDS = [
  "UX Design",
  "Data Analysis",
  "Cybersecurity",
  "Digital Marketing",
  "Software Development",
  "Product Management",
  "Business Analysis",
  "Sustainability Consulting",
];
// Learners per team (the project form offers this range).
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 5;
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
