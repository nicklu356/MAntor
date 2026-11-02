// End-to-end tests of the demo (no Firebase): every test starts with fresh demo data,
// because each one gets a new browser context (and so a fresh localStorage).
import { expect, test } from "@playwright/test";

const switchUser = async (page, label) => {
  await page.selectOption('select[aria-label="Switch demo user"]', { label });
  await page.waitForTimeout(300);
};

// Picks a language from the 🌐 menu in the header.
async function chooseLanguage(page, name) {
  await page.click(".lang-switch");
  await page.locator(".lang-dropdown").getByText(name, { exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toContainText("Hi Mia");
});

test("notifications bell shows unread activity and marks it read", async ({ page }) => {
  await page.click(".bell-button");
  await expect(page.locator(".bell-panel")).toContainText("commented on");
  await page.click("text=Mark all read");
  await expect(page.locator(".bell-count")).toHaveCount(0);
});

test("projects: search, field filter from a link, ranked by fit", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".project-card").first()).toContainText("UX Design"); // Mia's best match
  await page.fill('input[aria-label="Search projects"]', "phishing");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.goto(`/projects?field=${encodeURIComponent("Sustainability Consulting")}`);
  await expect(page.locator(".project-card")).toHaveCount(1);
});

test("task: update submission, get feedback, ask the AI coach", async ({ page }) => {
  await page.goto("/teams/team_001/tasks/task_001");
  const box = page.locator('textarea[aria-label="Submission"]');
  await expect(box).toHaveValue(/interview/i); // the saved submission is loaded for editing
  await expect(page.locator("main")).not.toContainText("A teammate saved a newer version");
  await box.fill((await box.inputValue()) + " Key needs: clear progress, fewer password rules.");
  await page.click("text=Update submission");
  await expect(page.locator(".toast")).toContainText("Submission updated");
  await page.click("text=Get new feedback");
  await expect(page.locator("main")).toContainText("Simulated");
  await page.click("text=Where should I start?");
  await expect(page.locator(".bubble").last()).toContainText("Simulated coach");
});

test("task board: drag a card to another column", async ({ page }) => {
  await page.goto("/teams/team_001");
  const card = page.locator(".task-card", { hasText: "Design the new flow" });
  await card.dragTo(page.locator(".column").nth(1));
  await expect(page.locator(".column").nth(1)).toContainText("Design the new flow");
});

test("live updates between two tabs of the demo", async ({ page, context }) => {
  await page.goto("/teams/team_001");
  const other = await context.newPage();
  await other.goto("/teams/team_001");
  await page.locator(".task-card", { hasText: "Test and iterate" }).dragTo(page.locator(".column").nth(1));
  await expect(other.locator(".column").nth(1)).toContainText("Test and iterate"); // the other tab, no reload
});

test("anonymity: mentor sees anonymous names until the learner accepts", async ({ page }) => {
  await switchUser(page, "Grace Walker (mentor)");
  await page.goto("/teams/team_001");
  await expect(page.locator("main")).toContainText("Learner #A3F");
  await expect(page.locator("main")).not.toContainText("Mia Chen");
  await page.locator("main li", { hasText: "Learner #A3F" }).locator("text=Interested in their work").click();
  await page.fill('textarea[aria-label="Note to the learner"]', "Great interview summary.");
  await page.click("text=Send request");
  await expect(page.locator("main")).toContainText("Request pending");

  await switchUser(page, "Learner #A3F");
  await page.goto("/");
  await page.click("text=Share my name");
  await expect(page.locator("main")).toContainText("Connected with Grace Walker");

  await switchUser(page, "Grace Walker (mentor)");
  await page.goto("/teams/team_001");
  await expect(page.locator("main .card").filter({ hasText: "Team" }).first()).toContainText("Mia Chen");
  await expect(page.locator("main")).toContainText("Learner #B71"); // Liam stays anonymous
});

test("mentor creates and edits a project; a learner joins it", async ({ page }) => {
  await switchUser(page, "Grace Walker (mentor)");
  await page.goto("/projects/new");
  await page.fill('input[placeholder^="e.g. Reduce checkout"]', "Improve a bike rental app's booking flow");
  await page.fill(
    'textarea[placeholder^="Describe a realistic"]',
    "Riders give up when booking a bike because the map is confusing. Research why and redesign the booking flow."
  );
  await page.click("text=Draft criteria and tasks with AI");
  await expect(page.locator('input[aria-label="Criterion 4 name"]')).toBeVisible();
  await page.click("text=Publish project");
  await page.waitForURL(/\/projects\/project_/);
  const projectUrl = page.url();

  await page.click("text=Edit project");
  await page.fill('input[placeholder^="e.g. Reduce checkout"]', "Improve a bike rental app's booking flow (v2)");
  await page.click("text=+ Add task");
  await page.fill('input[aria-label="Task 5 title"]', "Redesign the booking screen");
  await page.fill('textarea[aria-label="Task 5 instructions"]', "Wireframe the new booking screen.");
  await page.click("text=Save changes");
  await expect(page.locator("main h1")).toContainText("(v2)");

  await page.click("text=Edit project");
  await page.click("text=+ Add task");
  await page.click("text=Save changes");
  await expect(page.locator("main")).toContainText("Every task needs a title and instructions.");

  await switchUser(page, "Learner #C09");
  await page.goto(projectUrl);
  await page.click("text=Join this project");
  await page.waitForURL(/\/teams\//);
  await expect(page.locator("main")).toContainText("Redesign the booking screen");

  await switchUser(page, "Daniel Kim (mentor)");
  await page.goto(projectUrl + "/edit");
  await expect(page.locator("main")).toContainText("Only the mentor who wrote this project can edit it.");
});

test("career assessment: saved result, retake, best match and ranked projects", async ({ page }) => {
  await page.goto("/assessment");
  await expect(page.locator("main")).toContainText("Your best match");
  await page.click("main >> text=Retake");
  const software = ["automates a boring task", "why a program crashes", "small app from scratch"];
  for (let pageNo = 0; pageNo < 4; pageNo++) {
    for (const item of await page.locator("fieldset.likert").all()) {
      const text = await item.locator("legend").innerText();
      const answer = software.some((s) => text.includes(s))
        ? "Strongly like"
        : /hacker|firewall|equipment|research|spreadsheet|energy|carbon/i.test(text)
          ? "Like"
          : "Dislike";
      await item.locator(".likert-option", { hasText: new RegExp(`^${answer}$`) }).click();
    }
    await page.click(pageNo < 3 ? "text=Next →" : "text=See my result");
  }
  await expect(page.locator("main .career-field")).toContainText("Software Development");
  await page.goto("/projects");
  await expect(page.locator(".project-card").first()).toContainText("Software Development");
});

test("kudos, help requests and the mentor's attention list", async ({ page }) => {
  await page.goto("/teams/team_001/tasks/task_001");
  await page.locator("main li", { hasText: "Wrote the interview questions" }).locator("button.kudos").click();
  await expect(page.locator("main")).toContainText("Thanked");

  await switchUser(page, "Grace Walker (mentor)");
  await page.goto("/");
  await expect(page.locator("main .badge", { hasText: "Help request" })).toBeVisible();
  await page.locator("main a", { hasText: "Write the problem statement" }).click();
  await page.click("text=Mark as answered");
  await page.goto("/");
  await expect(page.locator("main")).toContainText("All clear");

  await switchUser(page, "Learner #A3F");
  await page.goto("/teams/team_001/tasks/task_003");
  await page.click("text=Ask the mentor");
  await page.fill('textarea[aria-label="What you need help with"]', "How many screens should the wireframe have?");
  await page.click("text=Send to mentor");
  await expect(page.locator("main")).toContainText("Waiting for the mentor");
});

test("portfolio shows a completed project and achievements", async ({ page }) => {
  await switchUser(page, "Liam Nguyen");
  await page.goto("/portfolio/user_002");
  await expect(page.locator("main")).toContainText("Completed · reviewed by mentor");
  await expect(page.locator("main")).toContainText("This is work I would be happy");
  expect(await page.locator(".achievement.earned").count()).toBeGreaterThanOrEqual(4);
});

test("privacy and terms page is linked from the footer", async ({ page }) => {
  await page.click("footer >> text=Privacy and terms");
  await page.waitForURL("**/privacy");
  await expect(page.locator("main h1")).toContainText("Privacy and terms");
});

test("unknown pages show the not-found page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.locator("main")).toContainText("Page not found");
});

test("phone width: no sideways scrolling on the main pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/projects", "/teams/team_001", "/portfolio/user_001", "/assessment", "/about"]) {
    await page.goto(path);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(391);
  }
});

test("language: switch to Traditional Chinese and back, and the choice is remembered", async ({ page }) => {
  await page.click(".lang-switch");
  await expect(page.locator(".lang-dropdown [aria-checked=true]")).toContainText("English"); // the current one is ticked
  await page.keyboard.press("Escape");
  await chooseLanguage(page, "繁體中文");
  await expect(page.locator("main")).toContainText("嗨，Mia");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
  await page.goto("/projects");
  await expect(page.locator("main h1")).toContainText("專案");
  await expect(page.locator(".project-card").first()).toContainText("UX 設計");
  await page.reload();
  await expect(page.locator("main h1")).toContainText("專案");
  await chooseLanguage(page, "English");
  await expect(page.locator("main h1")).toContainText("Projects");
});

test("language: a Chinese browser gets Chinese pages, rendered on the server too", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-TW" });
  const page = await context.newPage();
  const response = await page.goto("/about");
  expect(await response.text()).toContain("為什麼重要"); // server-rendered HTML, before any script runs
  await expect(page.locator("footer")).toContainText("隱私權與使用條款");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/projects", "/assessment"]) {
    await page.goto(path);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(391);
  }
  await context.close();
});

test("deadlines: late badge, milestones, and moving a due date", async ({ page }) => {
  await page.goto("/teams/team_001");
  const late = page.locator(".task-card", { hasText: "Write the problem statement" });
  await expect(late.locator(".badge-late")).toHaveText("2 days late");
  await expect(page.locator("main")).toContainText("Week 3 of 4");
  const timeline = page.locator("section", { has: page.locator("h2", { hasText: "Milestones" }) });
  await expect(timeline).toContainText("Behind plan");
  await expect(timeline.locator("li.done")).toHaveCount(1); // week 1: the interviews are done
  await expect(timeline.locator("li.late")).toHaveCount(1); // week 2: the problem statement is late

  await late.locator("a").click();
  await page.click("text=Change");
  const inFiveDays = new Date(Date.now() + 5 * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  await page.fill('input[aria-label="Due date"]', `${inFiveDays.getFullYear()}-${pad(inFiveDays.getMonth() + 1)}-${pad(inFiveDays.getDate())}`);
  await page.click("form >> text=Save");
  await expect(page.locator(".toast")).toContainText("Due date changed");
  await page.goto("/teams/team_001");
  await expect(late.locator(".badge-late")).toHaveCount(0);
});

test("mentor's week: summary of every team with one thing to do", async ({ page }) => {
  await switchUser(page, "Grace Walker (mentor)");
  const card = page.locator("section", { has: page.locator("h2", { hasText: "Your week" }) });
  await card.locator("text=Summarise my week").click();
  await expect(card).toContainText("Simulated"); // no API key in the tests
  await expect(card).toContainText("1 active team(s)");
  await expect(card).toContainText("Redesign a banking app onboarding flow");
  await expect(card).toContainText("Learner #"); // anonymous names only
  await expect(card).not.toContainText("Mia");
  await expect(card).toContainText("Try:");
  await page.reload();
  await expect(card).toContainText("Summary from"); // kept in this browser
});
