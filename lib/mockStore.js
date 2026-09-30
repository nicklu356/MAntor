// Demo mode storage: keeps all data in the browser (localStorage).
// Each browser has its own copy, so teammates will not see each other's changes.
// Switch to Firebase (see README) when you need shared data.
import * as seed from "./seed";

// v2: added comments and analyses. A new key means old saved demo data is replaced cleanly.
const STORAGE_KEY = "pdl-demo-data-v2";
const COLLECTIONS = ["users", "projects", "teams", "tasks", "contributions", "feedback", "comments", "analyses"];
let memory = null;

function freshData() {
  return JSON.parse(
    JSON.stringify({
      users: seed.users,
      projects: seed.projects,
      teams: seed.teams,
      tasks: seed.tasks,
      contributions: seed.contributions,
      feedback: seed.feedback,
      comments: seed.comments,
      analyses: seed.analyses,
    })
  );
}

export function load() {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memory = raw ? JSON.parse(raw) : freshData();
  } catch {
    memory = freshData();
  }
  // Safety net: make sure every collection exists, even in older saved data.
  for (const name of COLLECTIONS) {
    if (!Array.isArray(memory[name])) memory[name] = [];
  }
  return memory;
}

export function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Storage can be blocked (private window). The data still works until the page reloads.
  }
}

export function reset() {
  memory = freshData();
  save();
}
