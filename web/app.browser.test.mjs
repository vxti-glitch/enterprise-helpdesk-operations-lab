import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function collectConsoleErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("ticket search keeps focus while filtering character by character", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/#/tickets");
  const search = page.getByRole("searchbox", { name: "Search records" });
  await search.pressSequentially("INC009", { delay: 20 });
  await expect(search).toHaveValue("INC009");
  await expect(page.locator("#filter-result")).toContainText("1 of 40");
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(search).toHaveValue("");
  expect(errors).toEqual([]);
});

test("routes, filters, relationships, and the tour work without console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/#/tickets");
  await page.locator("summary", { hasText: "More filters" }).click();
  await page.getByLabel("Priority").selectOption("P2");
  await page.getByLabel("Escalation").selectOption("true");
  await expect(page.locator("#filter-result")).toContainText("3 of 40");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator("#filter-result")).toContainText("40 of 40");
  await page.locator("a.record-id", { hasText: "INC009" }).first().click();
  await expect(page).toHaveURL(/#\/tickets\/INC009$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("INC009");
  await expect(page.getByText("Escalation handoff")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/tickets$/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/tickets\/INC009$/);
  await page.goto("/#/tickets/REQ001");
  await expect(page.getByText("Requested for")).toBeVisible();
  await expect(page.getByRole("link", { name: "Jordan Kim" }).first()).toBeVisible();
  await page.goto("/#/overview");
  await page.getByRole("button", { name: "Start 90-second tour" }).click();
  for (let step = 1; step <= 4; step += 1) {
    await expect(page.locator("[data-tour]")).toContainText(`${step} of 4`);
    if (step < 4) await page.getByRole("button", { name: "Next stop" }).click();
  }
  await page.getByRole("button", { name: "Finish tour" }).click();
  await expect(page).toHaveURL(/#\/overview$/);
  expect(errors).toEqual([]);
});

test("new routes begin at the heading instead of a retained queue scroll position", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/#/tickets");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator("a.record-id", { hasText: "INC009" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("INC009");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeInViewport();
  await expect(page.evaluate(() => document.activeElement === document.querySelector("main h1"))).resolves.toBe(true);
  expect(errors).toEqual([]);
});

test("mobile evidence, deep links, and every route avoid page-level overflow", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 320, height: 720 });
  const routes = ["overview", "tickets", "tickets/INC009", "assets", "assets/NS-LT-005", "people/USR001", "playbooks", "evidence"];
  for (const target of routes) {
    await page.goto(`/#/${target}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  }
  await page.goto("/#/evidence");
  await expect(page.locator(".evidence-card")).toHaveCount(40);
  await page.goto("/#/tickets/DOES-NOT-EXIST");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ticket not found");
  expect(errors).toEqual([]);
});

test("overview has unique case links and no automated accessibility violations", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/#/overview");
  const names = await page.locator("a[aria-label^='Open case']").evaluateAll((links) => links.map((link) => link.getAttribute("aria-label")));
  expect(new Set(names).size).toBe(names.length);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(errors).toEqual([]);
});
