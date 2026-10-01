import { expect, test } from "@playwright/test";

test("homepage is reachable and renders the application shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BarberBook Studio/i);
  await expect(page.locator("body")).toContainText(/BarberBook|Studio/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("booking route is reachable and renders booking UI", async ({ page }) => {
  await page.goto("/booking");
  await expect(page).toHaveURL(/\/booking$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("admin login route renders its login form", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator("input").first()).toBeVisible();
});
