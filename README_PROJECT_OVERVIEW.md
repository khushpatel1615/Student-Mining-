# Student Performance Data Mining & Analytics System
## Project Overview
**Project Name**: EduPortal / Student Data Mining
**Goal**: A comprehensive educational management system responsible for tracking student performance, attendance, and engagement. The core differentiator is the "Data Mining" aspect—using collected data to generate insights, predict student outcomes (at-risk), and automate administrative intervention.

---

## 1. Technology Stack
*   **Frontend**: React.js (Vite), Vanilla CSS (Custom Design System), Framer Motion (Animations), Chart.js (Visualizations).
*   **Backend**: Native PHP (REST API), JWT Authentication.
*   **Database**: MySQL (Relational Data).
*   **AI Integration**: Google Gemini API (Chat Assistant, Insights).

---

## 2. Current Architecture & Features
### A. Roles & Portals
*   **Admin Dashboard**: System overview, user management (students/teachers), course management, and high-level analytics (GPA trends, pass rates).
*   **Student Dashboard**: Personal progress tracking, grades view, attendance history, assignment submission.
*   **Teacher Dashboard**: Class management, grading assignments, taking attendance.

### B. Key Modules
*   **Analytics Engine**: `backend/api/analytics/admin.php` aggregates system-wide data (Pass rates, Engagement scores).
*   **Communication**: Announcement system, Notification center (`notifications.php`), basic email triggers.
*   **LMS Features**: Assignment uploads, resource sharing (video lectures), discussion forums.
*   **AI Chat**: `AdminAIChat.jsx` integrated with backend to answer queries using context from the `admin.php` analytics.

---

## 3. Data Structure (The "Mining" Source)
Your "Data Mining" relies on these core relational tables:
*   `users`: Demographics (Role, ID, Email).
*   `student_enrollments`: The link between Student <-> Subject (Status, Mid-term Grade, Final Grade).
*   `student_attendance`: Daily/Lecture-wise tracking (Present/Absent/Late).
*   `student_grades`: Granular assessment data (Exam 1, Quiz 2, Homework).
*   `activity_logs` / `login_history`: (Implicit) Usage patterns for engagement scoring.

---

## 4. HOW TO IMPLEMENT "STUDENT DATA MINING"
This is the roadmap to take the project from a "Management System" to a "Data Mining System".

### Phase 1: Data Collection & Cleaning (Status: ✅ Mostly Complete)
*   **Goal**: Ensure every action (attendance, quiz, login) is recorded.
*   **Implementation**:
    *   Ensure `student_attendance` is populated daily.
    *   Ensure `student_grades` has granular entries, not just final marks.

### Phase 2: Descriptive Analytics (Status: ⚠️ In Progress)
*   **Goal**: "What happened?"
*   **Current**: We show GPA trends and current averages.
*   **To Implement**:
    *   **Cohort Analysis**: Compare "Class of 2024" vs "Class of 2025".
    *   **Distribution Graphs**: Bell curves for exam results (Standard Deviation).
    *   **Correlation**: e.g., "Do students with >90% attendance get >80% grades?"
    *   *Technical Implementation*: Add PHP functions to calculate `STDDEV()` and `CORRELATION()` using SQL queries.

### Phase 3: Predictive Analytics (Status: ❌ Todo)
*   **Goal**: "What will happen?" (The core "Mining" feature).
*   **To Implement**:
    *   **Early Warning System (Dropout Prediction)**:
        *   *Algorithm*: Weighted Score = `(Attendance% * 0.4) + (Assignment_Submission_Rate * 0.3) + (Midterm_Grade * 0.3)`.
        *   *Action*: If Score < 40, flag as "Critical Risk" automatically.
    *   **Performance Forecasting**:
        *   Use simple *Linear Regression* (y = mx + b) on previous semester grades to predict next semester's GPA.
        *   *Tech*: PHP `stats_stat_linear_regression` or a simple Python microservice.

### Phase 4: Prescriptive Analytics (Status: 🔄 Started with AI)
*   **Goal**: "What should we do about it?"
*   **To Implement**:
    *   **Automated Recommendations**: If a student fails "Math 101", the system automatically suggests "Remedial Math" or specific tutors.
    *   **Intervention Automation**: If `Risk_Score` hits critical, auto-draft an email to the student/advisor (User approves sending).

---

## 5. Instructions for AI (ChatGPT)
**Copy and paste the prompt below to ChatGPT to get specific code assistance:**

> "I am working on a Student Data Mining System using React and PHP. I already have the basic CRUD and Dashboard functional.
>
> **My Data:**
> I have tables for `students`, `attendance`, `enrollments` (final grades), and `activities`.
>
> **My Goal:**
> I want to implement a 'Predictive Analysis' module.
>
> **Task:**
> Can you write a PHP function/algorithm that runs on my backend to:
> 1. Calculate a 'Success Probability Score' for each student based on their current attendance and last 3 grade entries.
> 2. Group students into 3 clusters: 'Star Performers', 'Safe', and 'At-Risk'.
> 3. Return this JSON to my React frontend so I can visualize it as a Scatter Plot."
