import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) Route Protection', () => {

    test('Student cannot access admin dashboard', async ({ page }) => {
        // 1. Login as Student
        await page.goto('/');
        await page.getByPlaceholder(/student@university.edu/i).fill('student@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('password123');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await expect(page).toHaveURL(/.*\/student\/dashboard/);

        // 2. Attempt to force-browse to Admin Dashboard
        await page.goto('/admin/dashboard');

        // 3. Should bounce back to student dashboard
        await expect(page).toHaveURL(/.*\/student\/dashboard/);
    });

    test('Teacher cannot access admin dashboard', async ({ page }) => {
        // 1. Login as Teacher
        await page.goto('/');
        await page.getByPlaceholder(/student@university.edu/i).fill('teacher@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('teacher123');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await expect(page).toHaveURL(/.*\/teacher\/dashboard/);

        // 2. Attempt to force-browse to Admin Dashboard
        await page.goto('/admin/dashboard');

        // 3. Should bounce back to teacher dashboard
        await expect(page).toHaveURL(/.*\/teacher\/dashboard/);
    });

    test('Unauthenticated user is redirected to login', async ({ page, context }) => {
        // Ensure no session exists
        await context.clearCookies();

        // Attempt to access protected dashboard
        await page.goto('/admin/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/$/);
    });

});
