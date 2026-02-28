import { test, expect } from '@playwright/test';

test.describe('Grade Management Workflow', () => {

    test('teacher can enter grade and student can view it', async ({ browser }) => {
        // Teacher Workflow
        const teacherContext = await browser.newContext();
        const teacherPage = await teacherContext.newPage();

        // Monitor requests
        teacherPage.on('requestfailed', request => {
            console.log(`TEACHER REQ FAILED: ${request.url()} - ${request.failure()?.errorText}`);
        });
        teacherPage.on('response', async response => {
            if (response.status() >= 400) {
                console.log(`TEACHER ERROR ${response.status()} on ${response.url()}`);
                try {
                    console.log('Error Body:', await response.json());
                } catch (e) { }
            }
        });
        teacherPage.on('console', msg => console.log(`TEACHER CONSOLE: ${msg.text()}`));
        teacherPage.on('pageerror', err => console.log(`TEACHER ERROR: ${err.message}`));

        await teacherPage.goto('/');

        // Wait for page to be ready
        await teacherPage.getByPlaceholder(/student@university.edu/i).fill('teacher@college.edu');
        await teacherPage.getByPlaceholder(/Enter your password/i).fill('teacher123');
        await teacherPage.getByRole('button', { name: /Sign In/i }).click();

        // Check for error messages if redirection doesn't happen
        try {
            await teacherPage.waitForURL('**/teacher/dashboard**', { timeout: 10000 });
        } catch (e) {
            const loginError = await teacherPage.locator('.error-alert').innerText().catch(() => 'No error alert found');
            console.log('TEACHER LOGIN FAILED. Error shown:', loginError);
            throw e;
        }

        // Wait for dashboard and navigate to Grades
        await teacherPage.waitForURL('**/teacher/dashboard**');
        // Click Grades tab in Sidebar
        await teacherPage.click('aside a:has-text("Grades")');

        // Wait for student list to load
        await teacherPage.waitForSelector('tr.group', { timeout: 10000 });

        // Log current view to ensure we are on the right page
        const teacherViewContent = await teacherPage.locator('main').innerText();
        console.log('Teacher Grades View Loaded:', teacherViewContent.substring(0, 100) + '...');

        // Find John Doe in the list
        const johnDoeRow = teacherPage.locator('tr.group', { hasText: 'John Doe' });
        await johnDoeRow.waitFor();

        // Enter a grade in the first input of John Doe's row
        const gradeInput = johnDoeRow.locator('input[type="number"]').first();
        const testMarks = '85.5';
        await gradeInput.fill(testMarks);

        // Click Save All to be absolutely sure it persists
        await teacherPage.click('button:has-text("Save All")');

        // Wait for success toast
        await teacherPage.waitForSelector('text=All grades saved successfully', { timeout: 10000 });
        await teacherPage.waitForTimeout(2000); // Animation cooldown

        // Student Workflow
        const studentContext = await browser.newContext();
        const studentPage = await studentContext.newPage();

        studentPage.on('console', msg => console.log(`STUDENT CONSOLE: ${msg.text()}`));
        studentPage.on('pageerror', err => console.log(`STUDENT ERROR: ${err.message}`));

        await studentPage.goto('/');
        await studentPage.fill('#studentId', 'student@college.edu');
        await studentPage.fill('#password', 'student123');
        await studentPage.click('button[type="submit"]');

        await studentPage.waitForURL('**/student/dashboard**');

        // Log to verify who is logged in
        const studentDashText = await studentPage.locator('main').innerText();
        console.log('Student Dashboard Loaded for:', studentDashText.substring(0, 50) + '...');

        // Click Grades tab in Sidebar
        await studentPage.locator('.nav-item', { hasText: 'Grades' }).click();
        await expect(studentPage).toHaveURL(/.*tab=grades/);

        // Check if the grades list is visible
        await studentPage.waitForSelector('.subject-card-modern', { timeout: 15000 });

        // Find Mathematics-I card and expand it
        const mathCard = studentPage.locator('.subject-card-modern', { hasText: 'Mathematics-I' });
        await mathCard.locator('.subject-card-main').click();

        // Verify that the grade is visible. Use a regex to be safe.
        await studentPage.waitForTimeout(2000);

        try {
            await expect(mathCard).toContainText(/85\.5/, { timeout: 15000 });
        } catch (e) {
            const cardText = await mathCard.innerText();
            const allText = await studentPage.locator('main').innerText();
            console.log('MATH CARD CONTENT:', cardText);
            console.log('FULL PAGE CONTENT:', allText.substring(0, 500));
            throw e;
        }

        await studentContext.close();
        await teacherContext.close();
    });
});
