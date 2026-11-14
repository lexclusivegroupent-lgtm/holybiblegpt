import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hbgpt_onboarding_accepted', 'true');
  });
}

async function settle(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Setting up Bible'), null, { timeout: 90_000 });
}

test('the journal page has no buy button until checkout is open', async ({ page }) => {
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/journal');
  await settle(page);
  await expect(page.getByRole('heading', { name: '30 Days in the Word' })).toBeVisible();
  await expect(page.getByText('Reading, search, and AI study on Holy Bible GPT stay free.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get the journal ($9)' })).toHaveCount(0);
  await page.goto('/');
  await settle(page);
  await expect(page.getByRole('link', { name: 'Get the journal' })).toHaveCount(0);
});

test('an open offer shows the home announcement and the buy button', async ({ page }) => {
  await ready(page);
  await page.route('**/api/journal/offer', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, checkout: true }),
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await settle(page);
  const link = page.getByRole('link', { name: 'Get the journal' });
  await expect(link).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(link).toHaveCount(0);
  await page.reload();
  await settle(page);
  await expect(page.getByRole('link', { name: 'Get the journal' })).toHaveCount(0);

  await page.goto('/bible/genesis/1');
  await settle(page);
  await expect(page.getByText(/In the beginning God created the heaven and the earth/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get the journal' })).toHaveCount(0);
});

test('the product page keeps the reader free and does not leave the site on a bad checkout', async ({ page }) => {
  await ready(page);
  await page.route('**/api/journal/offer', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, checkout: true }),
  }));
  await page.route('**/api/journal/checkout', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Checkout is not open yet.' }),
  }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/journal');
  await settle(page);
  await page.getByRole('button', { name: 'Get the journal ($9)' }).click();
  await expect(page.getByRole('status')).toContainText('Checkout did not open');
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByText('Reading, search, and AI study on Holy Bible GPT stay free.')).toBeVisible();
});
