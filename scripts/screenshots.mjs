// Takes the README screenshots from the demo (sample learners and mentors).
//   1. npm run build && npx next start -p 3100   (without Firebase keys, so it runs as the demo)
//   2. node scripts/screenshots.mjs [http://localhost:3100]
// The pictures are saved in docs/screenshots/.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3100";
const out = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// Scrolls so this heading sits just under the sticky header.
const scrollToHeading = (page, text) =>
  page.evaluate((text) => {
    const heading = [...document.querySelectorAll("main h1, main h2")].find((h) => h.textContent.includes(text));
    if (heading) window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 100);
  }, text);

async function shoot(name, path, { locale = "en-AU", as, before, height = 860, element } = {}) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base + "/");
  await page.waitForSelector("main");
  if (as) {
    await page.selectOption('select[aria-label="Switch demo user"], select[aria-label="切換示範使用者"]', { label: as });
    await page.waitForTimeout(500);
  }
  await page.goto(base + path);
  await page.waitForTimeout(1500);
  if (before) await before(page);
  const target = element ? page.locator(element).first() : page;
  await target.screenshot({ path: `${out}${name}.png` });
  console.log("saved", name);
  await context.close();
}

await shoot("home", "/", { height: 900 });
await shoot("assessment", "/assessment");
await shoot("projects", "/projects");
await shoot("team-board", "/teams/team_001", { height: 1180 });
await shoot("task-feedback", "/teams/team_001/tasks/task_001", {
  height: 1100,
  before: (page) => scrollToHeading(page, "Submission"),
});
await shoot("mentor-week", "/", {
  as: "Grace Walker (mentor)",
  height: 1000,
  before: async (page) => {
    await page.click("text=Summarise my week");
    await page.waitForTimeout(1200);
    await scrollToHeading(page, "Hi Grace");
  },
});
await shoot("portfolio", "/portfolio/user_002", { height: 1000 });
await shoot("chinese", "/teams/team_001", { locale: "zh-TW", height: 900 });

await browser.close();
