import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const screenshotDirectory = path.resolve("test-results/portfolio-screenshots");

test("capture real portfolio views from the seeded demo application", async ({ browser }) => {
  await mkdir(screenshotDirectory, { recursive: true });

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const applicationErrors: string[] = [];
  page.on("pageerror", (error) => applicationErrors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) {
      applicationErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/");
  await switchToEnglish(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classic Cut" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("home-desktop") });

  await page.goto("/booking");
  await switchToEnglish(page);
  await chooseBookingSlot(page);
  await page.screenshot({ path: screenshotPath("booking") });

  await page.getByPlaceholder(/your name/i).fill("Portfolio Demo Client");
  await page.getByPlaceholder(/phone number/i).fill("+15550100999");
  const holdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/booking-holds"),
  );
  await page.getByRole("button", { name: /continue to payment/i }).click();
  expect((await holdResponse).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/booking\/hold\/[^/]+/);
  await page.getByRole("button", { name: /pay deposit/i }).click();
  await expect(page).toHaveURL(/\/booking\/confirm\/[^/]+/);
  await expect(page.getByRole("main")).toContainText("Classic Cut");
  await expect(page.getByRole("main")).toContainText(/confirmed/i);
  await page.screenshot({ path: screenshotPath("confirmation") });

  await page.goto("/account");
  await switchToEnglish(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel(/phone/i).first()).toBeVisible();
  await page.screenshot({ path: screenshotPath("account") });

  await page.goto("/admin/login");
  await page.getByPlaceholder(/email from backend\/\.env/i).fill("admin@example.com");
  await page.getByPlaceholder(/password from backend\/\.env/i).fill("e2e-local-only-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const dashboardDate = page.locator("main input[type=date]");
  await dashboardDate.fill(appointmentDateForAdmin);
  await expect(page.getByText("Portfolio Demo Client")).toBeVisible();
  await expect(page.getByText(/Total bookings: 1\./)).toBeVisible();
  await page.getByText("Portfolio Demo Client").scrollIntoViewIfNeeded();
  await page.screenshot({ path: screenshotPath("admin-dashboard") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await switchToEnglish(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classic Cut" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("mobile") });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: screenshotPath("dark-mode") });

  expect(applicationErrors).toEqual([]);
  await desktop.close();
});

let appointmentDateForAdmin = "";

async function chooseBookingSlot(page: import("@playwright/test").Page) {
  const classicCut = page.getByRole("heading", { name: "Classic Cut" });
  await expect(classicCut).toBeVisible();
  await classicCut.locator("xpath=../..").getByRole("button").click();

  const barber = page.getByRole("heading", { name: "Maksym" });
  await expect(barber).toBeVisible();
  await barber.locator("xpath=../..").getByRole("button").click();

  appointmentDateForAdmin = nextWeekday(3);
  await page.locator('input[type="date"]').fill(appointmentDateForAdmin);
  const timeSlot = page.getByRole("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(timeSlot).toBeVisible();
  await timeSlot.click();
  await timeSlot.scrollIntoViewIfNeeded();
}

async function switchToEnglish(page: import("@playwright/test").Page) {
  const englishButton = page.getByRole("button", { name: "EN", exact: true });
  if (!(await englishButton.isVisible())) {
    await page.getByRole("button", { name: "UA", exact: true }).click();
  }
  await expect(englishButton).toBeVisible();
}

function screenshotPath(name: string) {
  return path.join(screenshotDirectory, `${name}.png`);
}

function nextWeekday(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
