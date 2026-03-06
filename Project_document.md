# Master Prompt: University Management System (EduPortal)

You are an expert full-stack AI coding agent. Your goal is to build an entire end-to-end modern university management system named **EduPortal** from scratch, following the precise specifications in this document. 

You must act as a Senior Full-Stack Engineer, architecting and implementing a production-ready application using modern best practices, exceptional UI/UX, and robust API design.

## 1. Roles & Permissions
The system must support the following five distinct roles with strict Role-Based Access Control (RBAC):
- **Super Admin**: System owner. Can manage institutions, subscription plans, and view global analytics.
- **Institution Admin**: Manages a specific university/school. Can manage users (teachers, students, parents), courses, billing, and view institution-level analytics.
- **Teacher**: Can manage courses they are assigned to, take attendance, grade assignments, and view student-level analytics for their courses.
- **Student**: Can view personal dashboard, enrolled courses, grades, attendance, missing assignments, and submit work.
- **Parent**: Can view linked students' dashboards, grades, attendance, and risk alerts.

## 2. Tech Stack & Integrations
- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS (or styled-components/Vanilla CSS per request), Framer Motion, Chart.js/Recharts.
- **Backend**: Node.js API routes (Next.js) or a standalone Express/NestJS backend if necessary.
- **Database**: PostgreSQL hosted on **Supabase**.
- **ORM**: **Prisma** (15+ models defined below).
- **Authentication**: Supabase Auth (or NextAuth) with JWT.
- **Payments/Billing**: **Stripe** (Subscriptions, invoices).
- **Email**: **Resend** (Transactional emails, risk alerts).

## 3. Database Schema (Prisma)
Implement the following 15+ models in `schema.prisma` with all relations defined:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  INSTITUTION_ADMIN
  TEACHER
  STUDENT
  PARENT
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  role          Role
  firstName     String
  lastName      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  institutionId String?
  institution   Institution? @relation(fields: [institutionId], references: [id])
  
  // Role specific profiles
  studentProfile StudentProfile?
  teacherProfile TeacherProfile?
  parentProfile  ParentProfile?
  adminProfile   AdminProfile?
}

model Institution {
  id            String    @id @default(uuid())
  name          String
  planId        String?
  stripeCustId  String?
  users         User[]
  courses       Course[]
  terms         Term[]
  departments   Department[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AdminProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StudentProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  enrollments   Enrollment[]
  attendance    Attendance[]
  submissions   Submission[]
  parents       ParentStudent[]
}

model TeacherProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courses       Course[]
}

model ParentProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  students      ParentStudent[]
}

model ParentStudent {
  parentId      String
  studentId     String
  parent        ParentProfile  @relation(fields: [parentId], references: [id])
  student       StudentProfile @relation(fields: [studentId], references: [id])
  @@id([parentId, studentId])
}

model Department {
  id            String    @id @default(uuid())
  name          String
  institutionId String
  institution   Institution @relation(fields: [institutionId], references: [id])
  courses       Course[]
}

model Term {
  id            String    @id @default(uuid())
  name          String
  startDate     DateTime
  endDate       DateTime
  institutionId String
  institution   Institution @relation(fields: [institutionId], references: [id])
  courses       Course[]
}

model Course {
  id            String    @id @default(uuid())
  name          String
  code          String
  institutionId String
  institution   Institution @relation(fields: [institutionId], references: [id])
  departmentId  String
  department    Department  @relation(fields: [departmentId], references: [id])
  termId        String
  term          Term        @relation(fields: [termId], references: [id])
  teacherId     String
  teacher       TeacherProfile @relation(fields: [teacherId], references: [id])
  
  enrollments   Enrollment[]
  assignments   Assignment[]
  lessons       Lesson[]
  attendance    Attendance[]
}

model Enrollment {
  id            String    @id @default(uuid())
  studentId     String
  courseId      String
  status        String    @default("ACTIVE") // ACTIVE, DROPPED
  student       StudentProfile @relation(fields: [studentId], references: [id])
  course        Course         @relation(fields: [courseId], references: [id])
  
  @@unique([studentId, courseId])
}

model Lesson {
  id            String    @id @default(uuid())
  courseId      String
  title         String
  content       String?
  date          DateTime
  course        Course    @relation(fields: [courseId], references: [id])
}

model Attendance {
  id            String    @id @default(uuid())
  studentId     String
  courseId      String
  date          DateTime
  status        String    // PRESENT, ABSENT, LATE, EXCUSED
  student       StudentProfile @relation(fields: [studentId], references: [id])
  course        Course         @relation(fields: [courseId], references: [id])
}

model Assignment {
  id            String    @id @default(uuid())
  courseId      String
  title         String
  description   String?
  dueDate       DateTime
  maxScore      Float
  course        Course         @relation(fields: [courseId], references: [id])
  submissions   Submission[]
}

model Submission {
  id            String    @id @default(uuid())
  assignmentId  String
  studentId     String
  score         Float?
  feedback      String?
  submittedAt   DateTime  @default(now())
  assignment    Assignment     @relation(fields: [assignmentId], references: [id])
  student       StudentProfile @relation(fields: [studentId], references: [id])
}

model BillingInvoice {
  id            String    @id @default(uuid())
  institutionId String
  stripeInvId   String    @unique
  amount        Float
  status        String    // PAID, PENDING, OVERDUE
  createdAt     DateTime  @default(now())
}
```

## 4. Feature Specifications

### 4.1 Grading
- Teachers can create assignments with max scores and due dates.
- Interactive, spreadsheet-like gradebook for teachers to rapidly input grades.
- Auto-calculation of final weighted grades.
- Students and Parents can view individual grades and class averages.

### 4.2 Attendance
- Mark students as Present, Absent, Late, or Excused.
- Batch operations (mark all present).
- Auto-flag students falling below 80% attendance (triggers Resend email alert to parents).

### 4.3 Analytics Module
- **Institution-Level (Super/Inst Admin)**: Revenue tracking (Stripe), total active users, overall institution attendance rates, and average GPA across departments.
- **Course-Level (Teacher)**: Bell curve of grades, attendance trends over the semester, assignment completion rates.
- **Student-Level (Student/Parent)**: Personal GPA progression line chart, attendance donut chart, upcoming deadlines calendar.

### 4.4 Assignments & Submissions
- File uploads for submissions (using Supabase Storage).
- Rich text editor for assignment descriptions and feedback.

### 4.5 Billing (Stripe)
- Super Admin manages SaaS subscription tiers (Basic, Pro, Enterprise).
- Institutions utilize Stripe Checkout for subscription payments.
- Webhooks to update the `Institution` planId on successful payments.

## 5. File & Folder Structure
Create exactly the following structure:
```
/
├── .env.example
├── README.md
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   ├── institution/
│   │   │   ├── teacher/
│   │   │   ├── student/
│   │   │   └── parent/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── stripe/webhooks/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── grades/
│   │   │   └── attendance/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (Generic buttons, inputs, modals)
│   │   ├── layout/ (Sidebar, Navbar)
│   │   ├── analytics/ (Charts)
│   │   └── domain/ (Gradebook, AttendanceTracker)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── stripe.ts
│   │   ├── supabase.ts
│   │   └── resend.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── formatters.ts
│       └── auth.ts
```

## 6. API Conventions & Security Rules
- All `/api/*` routes MUST check the user's JWT and verify RBAC permissions before proceeding.
- Use standard REST methods properly (`GET`, `POST`, `PUT`, `DELETE`).
- Respond with standard HTTP status codes (200, 201, 400, 401, 403, 404, 500).
- Sanitize and validate all incoming inputs (using Zod or Joi) before interacting with Prisma.
- Never return `passwordHash` in any API response.
- Rate limit sensitive endpoints like login.

## 7. UI/UX Requirements
- **Design Aesthetic**: Premium, elite, modern enterprise feel. Dark mode support.
- **Micro-interactions**: Use Framer Motion for subtle page transitions, hover effects on cards, and loaders.
- **Data Tables**: All tables (e.g., Student List, Gradebook) must have pagination, search, and sorting.
- **Responsiveness**: The entire dashboard must work flawlessly on mobile, tablet, and desktop viewports.
- **Charts**: Use engaging, smooth-animating charts (Chart.js/Recharts) with tooltip interactions.

## 8. Stripe, Supabase, and Resend Specs
- **Supabase**: Use for Postgres DB hosting and file storage (for assignment attachments). Use Prisma to interact with the DB.
- **Stripe**: Implement Stripe Checkout for institution onboarding. Implement a webhook handler at `/api/stripe/webhooks` to listen for `checkout.session.completed` and `invoice.payment_failed` to update institution status.
- **Resend**: Implement a utility in `src/lib/resend.ts` to send HTML emails. Trigger emails on: Password Reset, Welcome Email, and Risk Alerts (e.g., student attendance drops).

## 9. Deliverables Checklist
Agent, you must complete the following in order:
1. [ ] Setup Next.js, Tailwind, and Prisma.
2. [ ] Define the `schema.prisma` exactly as provided and generate client.
3. [ ] Set up Supabase connection and integrate NextAuth/JWT.
4. [ ] Build the UI Layout (Sidebar, Topbar) accommodating the 5 roles.
5. [ ] Implement CRUD for Users, Institutions, and Courses.
6. [ ] Build the Teacher Gradebook and Attendance modules.
7. [ ] Build the Analytics dashboards (Institution, Course, Student levels).
8. [ ] Integrate Stripe subscriptions and webhooks.
9. [ ] Integrate Resend for transaction emails.
10. [ ] Polish the UI with Framer Motion and ensure responsiveness.

**START BUILDING NOW.** Read this file entirely, comprehend the relationships, and begin with Step 1 of the deliverables. Do not wait for further prompts to start Step 1.
