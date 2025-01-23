import test, { expect } from '@playwright/test';

test('User should be logged in', async ({ page }) => {
    await page.goto('https://ovcharski.com/shop/login/');

    await expect(page.getByRole('link', { name: 'Automation User' })).toBeVisible();
    await expect(page.getByText('Automation User')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Your account' })).toBeVisible();

    await page.close();
});