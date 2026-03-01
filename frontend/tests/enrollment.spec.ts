import { test, expect } from '@playwright/test';

test.describe('Enrollment Workflow', () => {
    test('Admin enrolls student', async ({ page }) => {
        await page.goto('/');
        // Skeleton:
        // 1. Log in as admin
        // 2. Navigate to enrollments
        // 3. Select student and subject
        // 4. Click Enroll
        // 5. Verify success message
    });
});
