import { expect, test } from "@playwright/test";

test("a guest completes a booking and mock payment", async ({ page }) => {
  await page.goto("/");

  await page.locator('a[href="/booking"]').first().click();
  await expect(page).toHaveURL(/\/booking$/);

  const serviceCard = page.getByRole("heading", { name: "Classic Cut" }).locator("xpath=../..");
  await serviceCard.getByRole("button").click();

  const barberCard = page.getByRole("heading", { name: "Maksym" }).locator("xpath=../..");
  await barberCard.getByRole("button").click();

  const appointmentDate = nextWeekday(3);
  await page.locator('input[type="date"]').fill(appointmentDate);

  const timeSlot = page.getByRole("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(timeSlot).toBeVisible();
  await timeSlot.click();

  await page.getByPlaceholder(/ім.?я|your name/i).fill("E2E Demo Client");
  await page.getByPlaceholder(/телефон|phone number/i).fill("+15550100200");

  const holdResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/booking-holds"),
  );
  await page.getByRole("button", { name: /перейти до оплати|continue to payment/i }).click();
  const holdResponse = await holdResponsePromise;
  const holdResponseBody = await holdResponse.text();
  expect(
    holdResponse.ok(),
    `Booking hold request failed with ${holdResponse.status()}: ${holdResponseBody}`,
  ).toBeTruthy();

  await expect(page).toHaveURL(/\/booking\/hold\/[^/]+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /сплатити депозит|pay deposit/i }).click();

  await expect(page).toHaveURL(/\/booking\/confirm\/[^/]+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main")).toContainText("Classic Cut");

  const bookingStatus = page.locator("main p").filter({ hasText: /статус|status/i }).first();
  await expect(bookingStatus).toContainText(/підтверджено|confirmed/i);
  await expect(bookingStatus).not.toContainText(/очікує|pending|hold|резерв/i);

  const paymentStatus = page.locator("main p").filter({ hasText: /статус платежу|payment status/i });
  await expect(paymentStatus).toContainText(/частково оплачено|partially paid|оплачено|paid/i);
  await expect(paymentStatus).not.toContainText(/очікуванні|pending/i);
});

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
