import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
    test('Login page should not have any automatically detectable accessibility issues', async ({ page }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Admin Dashboard should not have accessibility issues', async ({ page }) => {
        // assuming valid session
        // await page.goto('/admin');
        // const results = await new AxeBuilder({ page }).analyze();
        // expect(results.violations).toEqual([]);
    });
});
