import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the login page before each test
        await page.goto('/');
    });

    test('Successful Admin Login', async ({ page }) => {
        // Fill credentials
        // Note: Assuming the input fields have placeholders or names we can select.
        // Given the component has placeholders observed in 'auth.test.jsx':
        await page.getByPlaceholder(/student@university.edu/i).fill('admin@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('password123');

        // Click login
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Verify redirect to admin dashboard
        await expect(page).toHaveURL(/.*\/admin\/dashboard/);
        await expect(page.getByText(/administration dashboard/i)).toBeVisible();
    });

    test('Successful Student Login', async ({ page }) => {
        await page.getByPlaceholder(/student@university.edu/i).fill('student@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('student123');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Verify redirect to student dashboard
        try {
            await expect(page).toHaveURL(/.*\/student\/dashboard/, { timeout: 10000 });
        } catch (e) {
            const errorText = await page.locator('.error-alert').innerText().catch(() => 'No error alert found');
            console.log('STUDENT LOGIN FAILED. Error shown:', errorText);
            throw e;
        }
    });

    test('Successful Teacher Login', async ({ page }) => {
        await page.getByPlaceholder(/student@university.edu/i).fill('teacher@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('teacher123');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Verify redirect to teacher dashboard
        await expect(page).toHaveURL(/.*\/teacher\/dashboard/);
    });

    test('Invalid Credentials show error', async ({ page }) => {
        await page.getByPlaceholder(/student@university.edu/i).fill('wrong@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Verify we stay on the login page and an error is shown (often a toast or error text)
        await expect(page).toHaveURL(/.*\/$/);

        // Check for standard error text or toast notification
        await expect(page.getByText(/Invalid/i)).toBeVisible();
    });

    test('Logout Workflow', async ({ page }) => {
        // 1. Login first
        await page.getByPlaceholder(/student@university.edu/i).fill('student@college.edu');
        await page.getByPlaceholder(/Enter your password/i).fill('student123');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await expect(page).toHaveURL(/.*\/student\/dashboard/);

        // 2. Click Logout
        // Assuming there's a logout button with 'Logout' or 'Sign Out' text in the sidebar/nav
        const logoutBtn = page.getByRole('button', { name: /Log ?out/i });
        if (await logoutBtn.isVisible()) {
            await logoutBtn.click();
        } else {
            // If it's an icon without text, we might have to target by specific class or title
            // Sometimes logout requires clicking a profile menu first
            const btn = page.locator('.logout-btn');
            await btn.click(); // correct class from Sidebar.jsx

            // Handle Logout Modal
            const confirmBtn = page.locator('.modal-btn-confirm');
            if (await confirmBtn.isVisible({ timeout: 2000 })) {
                await confirmBtn.click();
            }
        }

        // 3. Verify redirect to login
        await expect(page).toHaveURL(/.*\/$/);
        // Ensure we can't browse back
        await page.goto('/student/dashboard');
        await expect(page).toHaveURL(/.*\/$/); // Should bounce back
    });

});
