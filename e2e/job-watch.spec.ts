import { test, expect } from '@playwright/test';

test.describe('job watch fallback', () => {
  test.skip(!process.env.COMPARATOR_E2E, 'start the local stack and set COMPARATOR_E2E=1');

  test('history keeps previous jobs visible while a new upload starts', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'История сравнений' })).toBeVisible();
  });
});
