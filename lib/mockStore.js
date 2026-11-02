// Demo mode storage: keeps all data in the browser (localStorage).
// Each browser has its own copy, so teammates will not see each other's changes.
// Switch to Firebase (see README) when you need shared data.
import * as seed from "./seed";

// v4: 8 career fields and full assessment results (v3: connections, completed demo team). A new key means old saved demo data is replaced cleanly.
const STORAGE_KEY = "pdl-demo-data-v4";
const COLLECTIONS = ["users", "projects", "teams", "tasks", "contributions", "feedback", "comments", "analyses", "connections"];
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
      connections: seed.connections,
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
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Live updates in the demo: this tab's own changes, and changes made in another tab.
const CHANGE_EVENT = "mantor-demo-change";
export function onChange(callback) {
  const fromOtherTab = (e) => {
    if (e.key !== STORAGE_KEY) return;
    memory = null; // read the other tab's data next time
    callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", fromOtherTab);
  };
}

export function reset() {
  memory = freshData();
  save();
}
