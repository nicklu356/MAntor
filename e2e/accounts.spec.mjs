// End-to-end tests with real accounts, against the Firebase emulators (npm run test:e2e:firebase).
// One story, in order: an admin, a mentor and two learners each use their own browser.
import { readFileSync, rmSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { EMULATOR_ENV } from "../playwright.firebase.config.mjs";

test.describe.configure({ mode: "serial" });

const PROJECT = "demo-mantor";
const FIRESTORE = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";
const run = Date.now().toString(36); // unique emails, so the tests can run again on the same emulators
const email = (name) => `${name}-${run}@example.com`;
const owner = { Authorization: "Bearer owner" }; // emulator-only: skips the security rules

async function uidOf(address) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    method: "POST",
    headers: { ...owner, "Content-Type": "application/json" },
    body: "{}",
  });
  return (await res.json()).userInfo.find((u) => u.email === address).localId;
}

// Like clicking the link in the verification email (only verified addresses get notifications).
async function markVerified(address) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: { ...owner, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: await uidOf(address), emailVerified: true }),
  });
  expect(res.ok).toBeTruthy();
}

// Emails the server "sent" (written to a file by the test setup instead).
function sentEmails() {
  try {
    return readFileSync(EMULATOR_ENV.MAIL_OUTBOX, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
const emailsTo = (address) => sentEmails().filter((m) => m.to === address);

async function profileOf(uid) {
  const res = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/profiles/${uid}`, { headers: owner });
  return (await res.json()).fields || {};
}

async function setField(collection, id, field, value) {
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}?updateMask.fieldPaths=${field}`,
    { method: "PATCH", headers: { ...owner, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { [field]: value } }) }
  );
  expect(res.ok).toBeTruthy();
}

async function allDocs(collection) {
  const res = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?pageSize=300`, {
    headers: owner,
  });
  return (await res.json()).documents || [];
}

// A plain 640 x 480 PNG, to upload as a profile photo.
function testPng(width = 640, height = 480) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x9a)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function signUp(page, fullName, address, dateOfBirth = "2002-03-04") {
  await page.goto("/signup");
  await page.fill('input[type="email"]', address);
  await page.fill('input[type="password"]', "secret123");
  await page.click('button:has-text("Create account")');
  await expect(page.locator("main")).toContainText("Complete your profile");
  const [first, ...rest] = fullName.split(" ");
  await page.fill('label:has-text("First name") input', first);
  await page.fill('label:has-text("Last name") input', rest.join(" "));
  await page.fill('label:has-text("Date of birth") input', dateOfBirth);
  await page.selectOption('label:has-text("Highest education") select', "Bachelor's degree");
  await page.fill('label:has-text("School or university") input', "University of Melbourne");
  await page.fill('label:has-text("Field of study") input', "Engineering");
  await page.click('button:has-text("Save and continue")');
}

// Picks a language from the 🌐 menu in the header.
async function chooseLanguage(page, name) {
  await page.click(".lang-switch");
  await page.locator(".lang-dropdown").getByText(name, { exact: true }).click();
}

let browser, visitor, admin, maya, alice, bob;
let projectUrl, teamUrl, taskUrl;

test.beforeAll(async ({ browser: b }) => {
  browser = b;
  rmSync(EMULATOR_ENV.MAIL_OUTBOX, { force: true });
  const open = async () => (await browser.newContext()).newPage();
  [visitor, admin, maya, alice, bob] = await Promise.all([open(), open(), open(), open(), open()]);
});

test("signed out: landing page, public catalogue, other pages need an account", async () => {
  await visitor.goto("/");
  await expect(visitor.locator("main")).toContainText("Create a free account");
  await visitor.goto("/assessment");
  await expect(visitor.locator("main")).toContainText("Log in to continue");
});

test("sign up asks for the profile; under-13s are refused", async () => {
  const kid = await (await browser.newContext()).newPage();
  await signUp(kid, "Kid Young", email("kid"), "2020-01-01");
  await expect(kid.locator("main")).toContainText("You need to be at least 13");
  await kid.goto("/projects");
  await expect(kid.locator("main")).toContainText("Complete your profile"); // still gated
});

test("admin: promoted in the console, loads the sample projects", async () => {
  await signUp(admin, "Nick Admin", email("admin"));
  await expect(admin.locator(".account-chip")).toContainText("Nick Admin");
  await setField("users", await uidOf(email("admin")), "admin", { booleanValue: true });
  await markVerified(email("admin"));
  await admin.goto("/admin");
  await admin.click("text=Load sample projects");
  await expect(admin.locator(".toast")).toContainText("Sample projects loaded");
  await visitor.goto("/projects/project_001");
  await expect(visitor.locator("main")).toContainText("Sign up to join");
  await expect(visitor.locator("main")).toContainText("Grace Walker"); // mentors are public
});

test("mentor: applies, is approved, publishes a project", async () => {
  await signUp(maya, "Maya Private", email("maya"));
  await markVerified(email("maya"));
  await maya.goto("/account");
  await maya.fill('label:has-text("Public name") input', "Maya Lin");
  await maya.fill('label:has-text("Company") input', "Acme Design");
  await maya.click("text=Apply to be a mentor");
  await expect(maya.locator("main")).toContainText("waiting for approval");
  // The admin hears about it (before approving: once approved, there is no open application to email about).
  await expect.poll(() => emailsTo(email("admin")).map((m) => m.subject)).toContain("New mentor application: Maya Lin");
  await admin.goto("/admin");
  await admin.locator("main li", { hasText: "Acme Design" }).locator('button:has-text("Approve")').click();
  await expect(admin.locator(".toast")).toContainText("is now a mentor");
  await expect.poll(() => emailsTo(email("maya")).map((m) => m.subject)).toContain("You are now a mentor on MAntor");

  await maya.goto("/projects/new");
  await maya.fill('input[placeholder^="e.g. Reduce checkout"]', "Accounts test project");
  await maya.fill('textarea[placeholder^="Describe a realistic"]', "A realistic scenario that is long enough for the form.");
  await maya.click("text=Draft criteria and tasks with AI");
  await expect(maya.locator('input[aria-label="Criterion 4 name"]')).toBeVisible();
  await maya.click("text=Publish project");
  await maya.waitForURL(/\/projects\/project_/);
  projectUrl = maya.url();
});

test("learners join the same team and see each other's names; the mentor does not", async () => {
  await signUp(alice, "Alice Wong", email("alice"));
  await markVerified(email("alice"));
  await alice.goto(projectUrl);
  await alice.click("text=Join this project");
  await alice.waitForURL(/\/teams\//);
  teamUrl = alice.url();
  await signUp(bob, "Bob Smith", email("bob"));
  await markVerified(email("bob"));
  await bob.goto(projectUrl);
  await bob.click("text=Join this project");
  await bob.waitForURL(/\/teams\//);
  expect(bob.url()).toBe(teamUrl);

  await alice.goto(teamUrl);
  await expect(alice.locator("main")).toContainText("Bob Smith");
  await maya.goto(teamUrl);
  await expect(maya.locator("main")).toContainText("Learner #");
  await expect(maya.locator("main")).not.toContainText("Alice");
  await expect(maya.locator("main")).not.toContainText("Bob");
});

test("connection request: the learner shares their name with that mentor only", async () => {
  const aliceUid = await uidOf(email("alice"));
  const anonymous = `Learner #${aliceUid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}`;
  await maya.locator("main li", { hasText: anonymous }).locator("text=Interested in their work").click();
  await maya.click("text=Send request");
  await expect(maya.locator("main")).toContainText("Request pending");
  await expect.poll(() => emailsTo(email("alice")).map((m) => m.subject)).toContain("A mentor is interested in your work");
  const [request] = emailsTo(email("alice"));
  expect(request.text).toContain("Maya Lin from Acme Design");
  expect(request.text).toContain("http://localhost:3200/");
  await alice.goto("/");
  await alice.click("text=Share my name");
  await expect(alice.locator("main")).toContainText("Connected with Maya Lin");
  await maya.goto(teamUrl);
  await expect(maya.locator("main")).toContainText("Alice Wong");
  await expect(maya.locator("main")).not.toContainText("Bob");
});

test("teamwork: submit, verified AI feedback, contribution, comment, help, kudos, final feedback", async () => {
  // Bob reads the site in Chinese, so his emails come in Chinese.
  const bobUid = await uidOf(email("bob"));
  await bob.goto("/");
  await chooseLanguage(bob, "繁體中文");
  await expect.poll(async () => (await profileOf(bobUid)).language?.stringValue).toBe("zh-TW");

  await alice.goto(teamUrl);
  await alice.locator(".task-card a").first().click();
  await alice.fill('textarea[aria-label="Submission"]', "Our first draft with research notes.");
  await alice.click("text=Submit work");
  await expect(alice.locator(".toast")).toContainText("Work submitted");
  await alice.click("text=Get AI feedback");
  await expect(alice.locator("main")).toContainText("✓ Verified"); // scored and saved by the server
  const docs = await allDocs("feedback");
  expect(docs.some((d) => d.fields.verified?.booleanValue === true)).toBeTruthy();

  await alice.fill('textarea[placeholder^="e.g. Ran 2"]', "Wrote the draft");
  await alice.click("text=Add contribution");
  await alice.fill('textarea[aria-label="Message"]', "Hi team");
  await alice.click("button:has-text('Send')");
  await alice.click("text=Ask the mentor");
  await alice.fill('textarea[aria-label="What you need help with"]', "Is this the right scope?");
  await alice.click("text=Send to mentor");
  await expect(alice.locator("main")).toContainText("Waiting for the mentor");
  taskUrl = alice.url();

  // Emails: Bob hears about Alice's comment (in Chinese); the mentor about the help request, by anonymous name.
  await expect.poll(() => emailsTo(email("bob")).map((m) => m.subject).join()).toContain("Alice Wong 在「");
  expect(emailsTo(email("bob"))[0].text).toContain("Hi team");
  await expect.poll(() => emailsTo(email("maya")).map((m) => m.subject).join()).toContain("A team needs your help on");
  const help = emailsTo(email("maya")).find((m) => m.subject.startsWith("A team needs your help"));
  expect(help.text).toContain("Is this the right scope?");
  expect(help.text).toContain("Learner #");
  expect(help.text).not.toContain("Alice");
  expect(emailsTo(email("alice")).some((m) => m.subject.includes("commented"))).toBeFalsy(); // not about your own comment

  await chooseLanguage(bob, "English"); // back to English
  await expect(bob.locator(".lang-switch")).toContainText("English");
  // Alice switches emails off.
  await alice.goto("/account");
  await alice.locator('label:has-text("Email me when something needs me") input').click();
  await expect(alice.locator(".toast")).toContainText("Email notifications are off");

  await bob.goto(taskUrl);
  await bob.locator("main li", { hasText: "Wrote the draft" }).locator("button.kudos").click();
  await expect(bob.locator("main")).toContainText("Thanked");

  await maya.goto(taskUrl);
  await expect(maya.locator("main")).toContainText("asked for your help");
  await maya.click("text=Mark as answered");
  await expect(maya.locator(".toast")).toContainText("Marked as answered");
  await maya.goto(teamUrl);
  await maya.fill('textarea[placeholder^="What went well"]', "Good start.");
  await maya.click("text=Save final feedback");
  await expect(maya.locator("main")).toContainText("Update final feedback");
  await expect.poll(() => emailsTo(email("bob")).map((m) => m.subject)).toContain("Final feedback on “Accounts test project”");
  expect(emailsTo(email("alice")).some((m) => m.subject.startsWith("Final feedback"))).toBeFalsy(); // switched off
});

test("deadlines: a new team gets a calendar; the daily job emails tasks due tomorrow", async () => {
  await alice.goto(teamUrl);
  await expect(alice.locator("main")).toContainText("Week 1 of 4");
  await expect(alice.locator("main h2", { hasText: "Milestones" })).toBeVisible();
  const teamId = teamUrl.split("/").pop();
  const tasks = (await allDocs("tasks")).filter((d) => d.fields.teamId.stringValue === teamId);
  expect(tasks.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.fields.dueDate?.stringValue))).toBeTruthy();

  // Make one open task due tomorrow, then run the daily job the way Vercel does.
  const open = tasks.find((d) => d.fields.status.stringValue !== "done");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await setField("tasks", open.name.split("/").pop(), "dueDate", { stringValue: tomorrow });
  const run = (secret) => fetch("http://localhost:3200/api/cron/reminders", { headers: { Authorization: `Bearer ${secret}` } });
  expect((await run("wrong")).status).toBe(401);
  const result = await (await run("test-cron-secret")).json();
  expect(result.sent).toBeGreaterThanOrEqual(1);
  const reminder = emailsTo(email("bob")).find((m) => m.subject === "Due tomorrow in “Accounts test project”");
  expect(reminder.text).toContain(open.fields.title.stringValue);
  expect((await (await run("test-cron-secret")).json()).sent).toBe(0); // once per team and day

  // Monday: the mentor's week by email, with learners by anonymous name only.
  const weekly = await fetch("http://localhost:3200/api/cron/weekly", { headers: { Authorization: "Bearer test-cron-secret" } });
  expect((await weekly.json()).sent).toBe(1);
  const digest = emailsTo(email("maya")).find((m) => m.subject.startsWith("Your week as a mentor"));
  expect(digest.text).toContain("Accounts test project");
  expect(digest.text).toContain("Try:");
  expect(digest.text).not.toContain("Bob");
});

test("profile photo: shrunk to 256 x 256, seen by teammates and the accepted mentor only", async () => {
  await alice.goto("/account");
  await alice.setInputFiles('input[type="file"]', { name: "me.png", mimeType: "image/png", buffer: testPng() });
  await expect(alice.locator(".toast")).toContainText("Photo updated");
  const src = await alice.locator(".account-chip .avatar img").getAttribute("src");
  expect(src.startsWith("data:image/jpeg")).toBeTruthy();
  const size = await alice.evaluate(
    (s) => new Promise((done) => { const i = new Image(); i.onload = () => done(`${i.naturalWidth}x${i.naturalHeight}`); i.src = s; }),
    src
  );
  expect(size).toBe("256x256");

  await bob.goto(teamUrl);
  await expect(bob.locator("main li", { hasText: "Alice Wong" }).locator(".avatar img")).toBeVisible();
  await maya.goto(teamUrl);
  await expect(maya.locator("main li", { hasText: "Alice Wong" }).locator(".avatar img")).toBeVisible();
  await expect(maya.locator("main li", { hasText: "Learner #" }).locator(".avatar img")).toHaveCount(0);
});

test("live updates: teammates see messages, board moves and submissions without reloading", async () => {
  await alice.goto(taskUrl);
  await bob.goto(taskUrl);
  await expect(bob.locator("main")).toContainText("Hi team");
  await alice.fill('textarea[aria-label="Message"]', "Live hello from Alice");
  await alice.click("button:has-text('Send')");
  await expect(bob.locator("main")).toContainText("Live hello from Alice"); // no reload

  // Bob is editing; Alice saves a new version. Bob keeps his text and is told.
  await bob.fill('textarea[aria-label="Submission"]', "Bob's unsaved edit");
  await alice.fill('textarea[aria-label="Submission"]', "Alice's newer version");
  await alice.click("text=Update submission");
  await expect(bob.locator("main")).toContainText("A teammate saved a newer version");
  await expect(bob.locator('textarea[aria-label="Submission"]')).toHaveValue("Bob's unsaved edit");
  await bob.click("text=Load it");
  await expect(bob.locator('textarea[aria-label="Submission"]')).toHaveValue("Alice's newer version");

  await alice.goto(teamUrl);
  await bob.goto(teamUrl);
  const card = alice.locator(".column").nth(0).locator(".task-card").first();
  const title = (await card.locator("a").innerText()).trim();
  await card.dragTo(alice.locator(".column").nth(2));
  await expect(bob.locator(".column").nth(2)).toContainText(title); // no reload
});

test("account: edit details; the new name reaches teammates", async () => {
  await bob.goto("/account");
  await expect(bob.locator("main")).toContainText("You can log in with your email and password.");
  await expect(bob.locator('label:has-text("School or university") input')).toHaveValue("University of Melbourne");
  await bob.fill('label:has-text("First name") input', "Bobby");
  await bob.click("text=Save changes");
  await expect(bob.locator(".toast")).toContainText("Details saved");
  await alice.goto(teamUrl);
  await expect(alice.locator("main")).toContainText("Bobby Smith");
});

test("public portfolio: private until published, then open to anyone", async () => {
  const aliceUid = await uidOf(email("alice"));
  const before = await visitor.goto(`/p/${aliceUid}`);
  expect(before.status()).toBe(404);
  await alice.goto(`/portfolio/${aliceUid}`);
  await alice.click("text=Make public");
  await expect(alice.locator('main button:has-text("Make private")')).toBeVisible();
  await visitor.goto(`/p/${aliceUid}`);
  await expect(visitor.locator("main h1")).toContainText("Alice Wong");
  await expect(visitor.locator("main")).toContainText("University of Melbourne");
  await expect(visitor.locator("main")).toContainText("Good start.");
  await expect(visitor.locator("main")).not.toContainText("2002"); // no date of birth
});

test("ad blocker: warning before the click, clear message after", async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".adsbox, .ad-banner { display: none !important; }";
      document.head.appendChild(style);
    });
  });
  await context.route(/googlesyndication|apis\.google\.com/, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("main")).toContainText("An ad blocker seems to be on");
  await page.click("text=Continue with Google");
  await expect(page.locator("main")).toContainText("Your ad blocker stopped the Google window");
});

test("demo sandbox from a signed-out browser, and back", async () => {
  await visitor.goto("/");
  await visitor.click("main >> text=Try the demo");
  await expect(visitor.locator(".header")).toContainText("Demo");
  await expect(visitor.locator("main")).toContainText("Hi Mia");
  await visitor.click("text=Exit demo");
  await expect(visitor.locator("main")).toContainText("Create a free account");
});

test("privacy: download my data, then delete the account and everything that belongs to it", async () => {
  await visitor.goto("/privacy");
  await expect(visitor.locator("main h1")).toContainText("Privacy and terms");

  const dora = await (await browser.newContext({ acceptDownloads: true })).newPage();
  await signUp(dora, "Dora Delete", email("dora"));
  await dora.goto(projectUrl);
  await dora.click("text=Join this project");
  await dora.waitForURL(/\/teams\//);
  const doraTeam = dora.url().split("/teams/")[1];
  await dora.locator(".task-card a").first().click();
  await dora.fill('textarea[aria-label="Message"]', "Hello from Dora");
  await dora.click("button:has-text('Send')");
  await expect(dora.locator("main")).toContainText("Hello from Dora");
  const doraUid = await uidOf(email("dora"));

  await dora.goto("/account");
  const [download] = await Promise.all([dora.waitForEvent("download"), dora.click("text=Download my data")]);
  const exported = JSON.parse(await (await import("node:fs/promises")).readFile(await download.path(), "utf8"));
  expect(exported.profile.name).toBe("Dora Delete");
  expect(exported.projects[0].myComments[0].text).toBe("Hello from Dora");

  await dora.click("text=Delete my account…");
  await dora.fill('input[aria-label="Type DELETE to confirm"]', "DELETE");
  await dora.click("text=Permanently delete my account");
  await expect(dora.locator("main")).toContainText("Create a free account"); // logged out, back home

  const exists = async (path) =>
    (await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers: owner })).ok;
  expect(await exists(`users/${doraUid}`)).toBeFalsy();
  expect(await exists(`profiles/${doraUid}`)).toBeFalsy();
  const team = await (await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/teams/${doraTeam}`, { headers: owner })).json();
  expect(JSON.stringify(team.fields.memberIds)).not.toContain(doraUid);
  const comments = await allDocs("comments");
  expect(comments.some((c) => c.fields.userId?.stringValue === doraUid)).toBeFalsy();
  const accounts = await (
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
      method: "POST",
      headers: { ...owner, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  expect(accounts.userInfo.some((u) => u.email === email("dora"))).toBeFalsy();
});

test("account menu: settings, portfolio; log out, wrong password, log back in", async () => {
  await bob.goto("/projects");
  const menu = bob.locator(".account-dropdown");
  await bob.click(".account-chip");
  await expect(menu).toContainText(email("bob"));
  await expect(menu).toContainText("Learner #");
  await expect(menu.locator("[role=menuitem]")).toHaveText(["My portfolio", "Account settings", "Log out"]); // settings just above Log out
  await menu.locator("text=Account settings").click();
  await bob.waitForURL("**/account");
  await expect(menu).toHaveCount(0); // closes on a new page
  await bob.click(".account-chip");
  await bob.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await chooseLanguage(bob, "繁體中文");
  await expect(bob.locator("main h1")).toContainText("帳號");
  await chooseLanguage(bob, "English");
  await expect(bob.locator("main h1")).toContainText("Account");

  await bob.click(".account-chip");
  await menu.locator("text=Log out").click();
  await expect(bob.locator(".header")).toContainText("Sign up");
  await bob.goto("/login");
  await bob.fill('input[type="email"]', email("bob"));
  await bob.fill('input[type="password"]', "wrongpass");
  await bob.click('form button:has-text("Log in")');
  await expect(bob.locator("main")).toContainText("The email or password is wrong.");
  await bob.fill('input[type="password"]', "secret123");
  await bob.click('form button:has-text("Log in")');
  await expect(bob.locator(".account-chip")).toContainText("Bobby Smith");
});
