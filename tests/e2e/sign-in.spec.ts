import { expect, test, type Page } from '@playwright/test';

async function installPuter(page: Page, signedIn: boolean) {
  await page.addInitScript((startSignedIn) => {
    localStorage.setItem('hbgpt_onboarding_accepted', 'true');
    const state = { signedIn: startSignedIn, attempts: 0 };
    (window as unknown as { __auth: typeof state }).__auth = state;
    window.puter = {
      authToken: startSignedIn ? 'test-token' : '',
      ai: {
        chat: async () => ({ text: 'Peace I leave with you.' }),
      },
      auth: {
        isSignedIn: () => state.signedIn,
        signIn: async () => {
          state.attempts += 1;
          if ((window as unknown as { __blockPopup?: boolean }).__blockPopup) {
            throw new Error('Popup blocked by the browser');
          }
          state.signedIn = true;
          window.puter!.authToken = 'test-token';
        },
        signOut: async () => {
          state.signedIn = false;
          window.puter!.authToken = '';
        },
        getUser: async () => ({ username: 'reader' }),
      },
    };
  }, signedIn);
}

async function settle(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Setting up Bible'), null, { timeout: 90_000 });
}

test.describe('signed out', () => {
  test.beforeEach(async ({ page }) => {
    await installPuter(page, false);
  });

  test('header Sign in is visible at mobile and desktop widths', async ({ page }) => {
    test.setTimeout(180_000);
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      for (const path of ['/', '/bible/genesis/1', '/about', '/settings']) {
        await page.goto(path);
        await settle(page);
        const button = page.getByRole('banner').getByRole('button', { name: /^Sign in/ });
        await expect(button).toBeVisible();
        const box = await button.boundingBox();
        expect(box, `Sign in box at ${width} on ${path}`).toBeTruthy();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

  test('Sign in keeps keyboard focus and a visible ring', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await settle(page);
    const menu = page.getByRole('banner').getByRole('button', { name: 'Toggle Menu' });
    await menu.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const signIn = page.getByRole('banner').getByRole('button', { name: /^Sign in/ });
    await expect(signIn).toBeFocused();
    const outline = await signIn.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
    const colors = await signIn.evaluate((el) => {
      const style = getComputedStyle(el);
      return { bg: style.backgroundColor, color: style.color };
    });
    expect(colors.bg).toBe('rgb(212, 175, 55)');
    expect(colors.color).toBe('rgb(0, 0, 0)');
  });

  test('reading, reference search, and the study helper work without an account', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/bible/genesis/1');
    await settle(page);
    await expect(page.getByText(/In the beginning God created the heaven and the earth/)).toBeVisible();

    await page.goto('/search');
    await settle(page);
    await page.getByRole('button', { name: /Reference/ }).click();
    await page.getByRole('textbox', { name: 'Search Bible' }).fill('John 3:16');
    await page.getByRole('textbox', { name: 'Search Bible' }).press('Enter');
    await expect(page.getByRole('heading', { name: /John 3/ })).toBeVisible();
    await expect(page.getByText(/For God so loved the world/)).toBeVisible();

    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: /Study with AI/i }).click();
    const box = page.getByRole('textbox');
    await expect(box).toBeEnabled();
    await box.fill('What is grace?');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Peace I leave with you.')).toBeVisible();
  });

  test('saving a bookmark offers sign-in and still leaves the verse on the page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/bible/genesis/1');
    await settle(page);
    await page.getByText(/In the beginning God created the heaven and the earth/).click();
    await page.getByRole('button', { name: 'Bookmark' }).click();
    await expect(page.getByText('Sign in to save this across your devices.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to save this across your devices' })).toBeVisible();
    await expect(page.getByText(/In the beginning God created the heaven and the earth/)).toBeVisible();
    await page.getByRole('button', { name: 'Keep reading' }).click();
    await expect(page.getByText('Sign in to save this across your devices.')).toHaveCount(0);
  });

  test('a blocked sign-in window explains what happened and can be tried again', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await settle(page);
    await page.evaluate(() => { (window as unknown as { __blockPopup: boolean }).__blockPopup = true; });
    await page.getByRole('banner').getByRole('button', { name: /^Sign in/ }).click();
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Accounts are free. This opens sign-in and sign-up.')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/blocked/i);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect.poll(async () => page.evaluate(() => (window as unknown as { __auth: { attempts: number } }).__auth.attempts)).toBe(2);
  });
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await installPuter(page, true);
  });

  test('the header shows an account menu with sign out', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await settle(page);
    const account = page.getByRole('banner').getByRole('button', { name: /Account menu/ });
    await expect(account).toBeVisible();
    const box = await account.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await account.click();
    await expect(page.getByRole('menu', { name: 'Account' })).toBeVisible();
    await expect(page.getByText('Signed in as reader')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('banner').getByRole('button', { name: /^Sign in/ })).toBeVisible();
  });

  test('a saved bookmark does not ask them to sign in again', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/bible/john/3');
    await settle(page);
    await expect(page.getByRole('banner').getByRole('button', { name: /Account menu/ })).toBeVisible();
    await page.getByText(/For God so loved the world/).click();
    await page.getByRole('button', { name: 'Bookmark' }).click();
    await expect(page.getByText('Sign in to save this across your devices.')).toHaveCount(0);
  });
});
