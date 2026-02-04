# 📊 Student Data Mining - Comprehensive Project Analysis

> **Generated**: February 3, 2026  
> **Repository**: [khushpatel1615/Student-Mining-](https://github.com/khushpatel1615/Student-Mining-)  
> **Analysis Tool**: Google Antigravity IDE

---

## 📑 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Inventory](#part-1-project-inventory)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Data Flow & Workflows](#data-flow--workflows)
9. [Code Quality Assessment](#code-quality-assessment)
10. [Identified Issues & Technical Debt](#identified-issues--technical-debt)
11. [Security Analysis](#security-analysis)
12. [Performance Considerations](#performance-considerations)
13. [Recommendations & Roadmap](#recommendations--roadmap)

---

## Executive Summary

**Student Data Mining** is a comprehensive university management system built for Ganpat University. It provides role-based dashboards for administrators, teachers, and students with features including:

- **Real-time Analytics** - AI-powered risk identification and performance tracking
- **Grade Management** - Weighted evaluation criteria with bulk import capabilities
- **Attendance Tracking** - CSV import and manual marking
- **Report Generation** - Academic transcripts and performance reports
- **AI Chat Assistant** - Google Gemini-powered administrative assistant

### Key Metrics

| Metric | Value |
|--------|-------|
| **Total Frontend Files** | ~200+ files |
| **Total Backend Files** | ~74 PHP files |
| **Database Tables** | 30+ tables |
| **React Components** | 74 JSX components |
| **CSS Stylesheets** | 61 CSS files |
| **API Endpoints** | 38 endpoints |
| **Lines of Code (Est.)** | ~25,000+ |

---

## Part 1: Project Inventory

### Directory Structure

```
StudentDataMining/
├── .agent/                    # Antigravity AI config
│   └── workflows/             # Automation workflows
├── .gemini/                   # Gemini AI settings
├── backend/                   # PHP REST API (55 children)
│   ├── api/                   # REST endpoints (39 files)
│   │   ├── analytics/         # Analytics & risk scoring
│   │   ├── import/            # CSV/Excel import handlers
│   │   └── *.php              # Core API endpoints
│   ├── config/                # Database & CORS config
│   ├── data/                  # Runtime data storage
│   ├── debug/                 # Debug utilities
│   ├── includes/              # Shared utilities (JWT, helpers)
│   └── uploads/               # File upload storage
├── database/                  # SQL schemas (17 files)
│   ├── complete_schema.sql    # Master schema (784 lines)
│   ├── migrations/            # Database migrations (8 files)
│   └── *.sql                  # Additional schemas
├── docs/                      # Documentation
├── frontend/                  # React SPA (149 children)
│   ├── public/                # Static assets
│   └── src/                   # Source code
│       ├── components/        # React components (118 children)
│       ├── context/           # Auth & state context
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility libraries
│       ├── pages/             # Page components (13 files)
│       └── styles/            # Global styles
├── *.md                       # Documentation files (10+)
└── setup.bat                  # Windows setup script
```

### File Count by Type

| Extension | Count | Purpose |
|-----------|-------|---------|
| `.jsx` | 74 | React components |
| `.css` | 61 | Component styles |
| `.php` | 74 | Backend API & utilities |
| `.sql` | 14 | Database schemas/migrations |
| `.md` | 12 | Documentation |
| `.json` | 5 | Configuration |
| `.js` | 6 | Config & utilities |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI Framework |
| **Vite** | 5.0.8 | Build tool & dev server |
| **React Router** | 6.21 | Client-side routing |
| **Chart.js** | 4.5.1 | Data visualization |
| **Recharts** | 3.7.0 | Additional charts |
| **Framer Motion** | 12.29 | Animations |
| **Lucide React** | 0.562 | Icons |
| **date-fns** | 4.1.0 | Date utilities |
| **jsPDF** | 3.0.4 | PDF generation |
| **xlsx** | 0.18.5 | Excel import/export |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **PHP** | 8.1+ | Server-side logic |
| **MySQL** | 8.0+ | Database |
| **JWT** | Custom | Authentication |
| **Google OAuth** | - | Social login |
| **Google Gemini** | API | AI chat assistant |

### Infrastructure

| Component | Technology |
|-----------|------------|
| **Web Server** | Apache (XAMPP) |
| **Database** | MySQL/MariaDB |
| **Environment** | Local development |
| **Version Control** | Git + GitHub |

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite)                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │  │
│  │  │ Student │  │  Admin  │  │ Teacher │  │   Shared    │ │  │
│  │  │Dashboard│  │Dashboard│  │Dashboard│  │ Components  │ │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘ │  │
│  │       │            │            │              │         │  │
│  │       └────────────┴────────────┴──────────────┘         │  │
│  │                         │                                 │  │
│  │              ┌──────────▼──────────┐                     │  │
│  │              │   AuthContext.jsx   │                     │  │
│  │              │   (JWT + OAuth)     │                     │  │
│  │              └──────────┬──────────┘                     │  │
│  └─────────────────────────┼────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   PHP REST API                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │  │
│  │  │ Auth APIs  │  │ CRUD APIs  │  │  Analytics APIs    │ │  │
│  │  │ login.php  │  │ grades.php │  │  features.php      │ │  │
│  │  │ google-auth│  │ students   │  │  compute_features  │ │  │
│  │  │ verify-tok │  │ attendance │  │  admin.php         │ │  │
│  │  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────┘ │  │
│  │        │               │                     │           │  │
│  │        └───────────────┴─────────────────────┘           │  │
│  │                         │                                 │  │
│  │              ┌──────────▼──────────┐                     │  │
│  │              │    jwt.php          │                     │  │
│  │              │    database.php     │                     │  │
│  │              └──────────┬──────────┘                     │  │
│  └─────────────────────────┼────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ PDO
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     MySQL 8.0+                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │  │
│  │  │  users  │  │subjects │  │ grades  │  │  analytics  │ │  │
│  │  │programs │  │enrollmt │  │ attend  │  │ predictions │ │  │
│  │  │sessions │  │criteria │  │exams/asgn│ │ risk_scores │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Dependency Graph

```
App.jsx
├── AuthContext (Global)
├── LoginPage
│   └── LoginCard
├── StudentDashboard
│   ├── MainLayout
│   │   ├── Sidebar
│   │   └── Header
│   ├── StudentOverview
│   ├── StudentAnalytics
│   ├── StudentAttendance
│   ├── StudentGrades
│   ├── StudentAssignments
│   └── StudentExams
├── AdminDashboard
│   ├── MainLayout
│   ├── AdminOverview
│   ├── RiskCenter
│   ├── GradeManagement
│   ├── AttendanceManagement
│   ├── EnrollmentManagement
│   ├── StudentManagement
│   ├── SubjectManagement
│   ├── ProgramManagement
│   ├── CalendarManagement
│   └── ReportGenerator
└── StudentProfilePage
```

---

## Database Schema

### Core Tables (30+ Tables)

#### User Management
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `users` | All users (students, teachers, admins) | FK: program_id |
| `user_sessions` | JWT token management | FK: user_id |
| `programs` | Academic programs | - |

#### Academic Structure
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `subjects` | Courses/subjects | FK: program_id |
| `evaluation_criteria` | Grading components per subject | FK: subject_id |
| `student_enrollments` | Student-subject relationships | FK: user_id, subject_id |
| `student_grades` | Individual grades per criteria | FK: enrollment_id, criteria_id |
| `student_attendance` | Attendance records | FK: enrollment_id |

#### Assignments & Exams
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `assignments` | Assignment definitions | FK: subject_id, teacher_id |
| `assignment_submissions` | Student submissions | FK: assignment_id, student_id |
| `exams` | Exam schedules | FK: subject_id |
| `exam_results` | Exam scores | FK: exam_id, student_id |

#### Analytics & Predictions
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `student_analytics` | Pre-computed metrics | FK: student_id |
| `student_risk_scores` | Risk assessment data | FK: user_id |
| `predictions` | AI-generated predictions | FK: student_id |
| `recommendations` | AI recommendations | FK: student_id |

#### Communication
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `announcements` | Teacher announcements | FK: subject_id, teacher_id |
| `discussions` | Forum discussions | FK: subject_id, user_id |
| `notifications` | User notifications | FK: user_id |

### Entity Relationship Diagram (Simplified)

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   programs    │◄──────│    users      │───────►│ user_sessions │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       
        │                       │                       
        ▼                       ▼                       
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   subjects    │◄──────│ enrollments   │───────►│student_grades │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│eval_criteria  │       │  attendance   │       │ risk_scores   │
└───────────────┘       └───────────────┘       └───────────────┘
```

---

## API Endpoints

### Authentication APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login.php` | Email/password login |
| POST | `/api/google-auth.php` | Google OAuth login |
| GET | `/api/verify-token.php` | Validate JWT token |
| POST | `/api/logout.php` | Logout & invalidate session |
| POST | `/api/set-password.php` | Set/reset password |

### User Management APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/students.php` | Student CRUD |
| GET/POST/PUT/DELETE | `/api/teachers.php` | Teacher CRUD |
| GET/PUT | `/api/profile.php` | User profile management |

### Academic APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/subjects.php` | Subject management |
| GET/POST/PUT/DELETE | `/api/programs.php` | Program management |
| GET/POST/PUT/DELETE | `/api/enrollments.php` | Enrollment management |
| GET/POST/PUT/DELETE | `/api/grades.php` | Grade management |
| GET/POST | `/api/attendance.php` | Attendance tracking |
| GET/POST/PUT/DELETE | `/api/assignments.php` | Assignment management |
| GET/POST/PUT/DELETE | `/api/exams.php` | Exam management |

### Analytics APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/features.php` | Student feature vectors |
| POST | `/api/analytics/compute_features.php` | Recalculate analytics |
| GET | `/api/analytics/admin.php` | Admin dashboard stats |
| GET | `/api/student_dashboard.php` | Student overview data |
| GET | `/api/student_live_analytics.php` | Real-time student metrics |

### Report & Communication APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports.php` | Generate PDF reports |
| GET/POST/DELETE | `/api/announcements.php` | Announcements |
| GET/POST | `/api/discussions.php` | Discussion forum |
| GET/PUT | `/api/notifications.php` | Notifications |
| POST | `/api/ai_chat.php` | Google Gemini AI chat |

---

## Frontend Components

### Component Hierarchy

```
src/
├── components/
│   ├── Admin/
│   │   └── AIChat/AdminAIChat.jsx          # AI assistant interface
│   ├── Analytics/
│   │   ├── InsightsDashboard.jsx           # Analytics overview
│   │   ├── RiskCenter.jsx                  # At-risk students
│   │   └── StudentMiningProfile.jsx        # Individual student analysis
│   ├── AssignmentManagement/               # Admin assignment CRUD
│   ├── AttendanceManagement/               # Admin attendance CRUD
│   ├── CalendarManagement/                 # Academic calendar
│   ├── Charts/                             # Reusable chart components
│   │   ├── GPATrendChart.jsx
│   │   ├── GradeDistribution.jsx
│   │   └── PerformanceMetrics.jsx
│   ├── Curriculum/                         # Semester roadmap & subjects
│   ├── Discussions/                        # Forum components
│   ├── EmptyState/                         # Empty state placeholders
│   ├── EnrollmentManagement/               # Student enrollment CRUD
│   ├── ExamManagement/                     # Exam CRUD
│   ├── GradeManagement/                    # Grade entry & import
│   ├── Import/                             # CSV/Excel import
│   ├── Layout/
│   │   ├── Header.jsx                      # Top navigation
│   │   ├── MainLayout.jsx                  # Page wrapper
│   │   └── Sidebar.jsx                     # Side navigation
│   ├── Login/                              # Authentication UI
│   ├── LogoutModal/                        # Logout confirmation
│   ├── Notifications/                      # Notification system
│   ├── Overview/                           # Dashboard overviews
│   ├── ProgramManagement/                  # Program CRUD
│   ├── QuickActions/                       # Quick action panels
│   ├── Reports/                            # Report generation
│   ├── Reviews/                            # Course reviews
│   ├── Skeleton*/                          # Loading states
│   ├── Student/                            # Student-specific components
│   │   ├── Analytics/
│   │   ├── Assignments/
│   │   ├── Attendance/
│   │   ├── Exams/
│   │   ├── Grades/
│   │   ├── Overview/
│   │   ├── Profile/
│   │   └── SkillsMap/
│   ├── StudentManagement/                  # Admin student CRUD
│   ├── SubjectManagement/                  # Subject CRUD
│   ├── Teacher/                            # Teacher-specific components
│   └── TeacherManagement/                  # Teacher CRUD
├── context/
│   ├── AuthContext.jsx                     # Auth state management
│   └── ThemeContext.jsx                    # Theme (if used)
├── hooks/
│   └── useMediaQuery.js                    # Responsive utilities
├── lib/
│   └── utils.js                            # Utility functions
└── pages/
    ├── AdminDashboard.jsx                  # Admin page container
    ├── LoginPage.jsx                       # Login page
    ├── StudentDashboard.jsx                # Student page container
    ├── StudentProfilePage.jsx              # Student profile view
    └── SubjectDetailPage.jsx               # Subject details
```

### Key Component Features

| Component | Features |
|-----------|----------|
| **RiskCenter** | At-risk student identification, risk scores, interventions |
| **GradeManagement** | Weighted grading, CSV import, grade distribution |
| **ReportGenerator** | PDF generation, transcripts, attendance reports |
| **StudentAnalyticsDashboard** | GPA trends, performance metrics, predictions |
| **AdminAIChat** | Google Gemini integration, admin assistance |

---

## Data Flow & Workflows

### Authentication Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐
│  User   │───►│ LoginCard   │───►│ login.php   │───►│  MySQL  │
│         │    │ (React)     │    │ (JWT Gen)   │    │ (users) │
└─────────┘    └─────────────┘    └─────────────┘    └─────────┘
                     │                   │
                     │                   ▼
                     │            ┌─────────────┐
                     │            │ JWT Token   │
                     │            │ Generated   │
                     │            └─────────────┘
                     │                   │
                     ▼                   ▼
              ┌─────────────┐    ┌─────────────┐
              │ AuthContext │◄───│ localStorage│
              │ (State)     │    │ (Token)     │
              └─────────────┘    └─────────────┘
```

### Grade Entry Workflow

```
1. Admin navigates to Grade Management
2. Selects Subject → fetches evaluation criteria
3. Selects Student → fetches current enrollment
4. Enters grades per component (weighted)
5. System auto-calculates final percentage & letter grade
6. Saves to student_grades & updates student_enrollments
7. Triggers recalculation of student_analytics
8. Updates student_risk_scores if needed
```

### Report Generation Workflow

```
1. User clicks "Generate Report Card"
2. Frontend calls /api/reports.php?action=report_card
3. Backend fetches:
   - Student info (users table)
   - Current semester enrollments (student_enrollments)
   - Grades per subject (student_grades + evaluation_criteria)
   - Attendance summary (student_attendance)
4. Calculates GPA & credit points
5. Returns JSON payload
6. Frontend generates HTML template
7. Opens print window for PDF download
```

---

## Code Quality Assessment

### Strengths ✅

| Area | Observation |
|------|-------------|
| **Structure** | Clear separation of frontend/backend |
| **Database** | Comprehensive schema with proper FKs |
| **API Design** | RESTful endpoints with consistent patterns |
| **Component Organization** | Logical component hierarchy |
| **Authentication** | JWT + role-based access control |
| **Error Handling** | Try-catch blocks in API handlers |
| **Documentation** | Extensive README and setup guides |

### Areas for Improvement ⚠️

| Area | Issue | Severity |
|------|-------|----------|
| **Type Safety** | No TypeScript, weak typing | Medium |
| **Testing** | No automated tests found | High |
| **State Management** | No centralized state (Redux/Zustand) | Medium |
| **API Versioning** | No API versioning | Low |
| **Caching** | No caching strategy | Medium |
| **CSS Organization** | 61 separate CSS files, no design system | Medium |
| **Code Duplication** | Similar patterns across components | Medium |

---

## Identified Issues & Technical Debt

### Critical Issues 🔴

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| C1 | **Duplicate Enrollments** | `student_enrollments` table | Data integrity | Fixed ✅ |
| C2 | **No Input Validation (Frontend)** | Various components | XSS risk | 2-3 days |
| C3 | **Hardcoded API URLs** | Some components | Deployment issues | 1 day |

### High Priority Issues 🟠

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| H1 | No automated tests | Entire project | Regression risk | 2 weeks |
| H2 | No error boundaries | React components | UX crashes | 1 day |
| H3 | Large component files | Some exceed 500 lines | Maintainability | 1 week |
| H4 | No loading state consistency | Various | UX inconsistency | 3 days |
| H5 | PHP error messages expose paths | API handlers | Security | 1 day |

### Medium Priority Issues 🟡

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| M1 | No TypeScript | Frontend | Type errors | 1-2 weeks |
| M2 | CSS duplication | 61 CSS files | Bundle size | 1 week |
| M3 | No design tokens | Styles | Inconsistency | 3 days |
| M4 | Magic numbers in code | Various | Readability | 2 days |
| M5 | No API response caching | Frontend | Performance | 3 days |
| M6 | Console.log statements | Various | Production logs | 1 day |

### Low Priority Issues 🟢

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| L1 | Inconsistent naming | Some files | Readability | Ongoing |
| L2 | Missing JSDoc comments | Most functions | Documentation | Ongoing |
| L3 | No dark mode toggle | UI | User preference | 2 days |
| L4 | No keyboard shortcuts | UI | Accessibility | 3 days |

---

## Security Analysis

### Current Security Features ✅

| Feature | Status | Notes |
|---------|--------|-------|
| JWT Authentication | ✅ Implemented | Custom implementation |
| Role-Based Access Control | ✅ Implemented | admin, teacher, student |
| CORS Protection | ✅ Implemented | Configurable origins |
| Prepared Statements | ✅ Implemented | SQL injection prevention |
| Password Hashing | ✅ Implemented | bcrypt via password_hash() |
| Environment Variables | ✅ Implemented | .env for secrets |
| File Upload Validation | ⚠️ Partial | Basic validation |

### Security Concerns ⚠️

| Concern | Severity | Recommendation |
|---------|----------|----------------|
| No rate limiting on login | High | Implement rate limiting |
| JWT stored in localStorage | Medium | Consider httpOnly cookies |
| No CSRF protection | Medium | Add CSRF tokens |
| No input sanitization (some endpoints) | Medium | Sanitize all inputs |
| Debug endpoints exposed | High | Remove in production |
| No audit logging for sensitive actions | Medium | Implement audit trail |

---

## Performance Considerations

### Current State

| Area | Status | Notes |
|------|--------|-------|
| Database Indexes | ✅ Good | Proper indexes on FKs |
| API Response Size | ⚠️ Medium | Some endpoints return too much data |
| Frontend Bundle | ⚠️ Unknown | No bundle analysis |
| Image Optimization | ❌ None | No image optimization |
| Lazy Loading | ⚠️ Partial | Some components not lazy loaded |
| Caching | ❌ None | No caching strategy |

### Recommendations

1. **Database**: Add composite indexes for common queries
2. **API**: Implement pagination on all list endpoints
3. **Frontend**: Add React.lazy() for route-based code splitting
4. **Caching**: Implement Redis for session/API caching
5. **CDN**: Serve static assets via CDN in production

---

## Recommendations & Roadmap

### Phase 1: Stabilization (Week 1-2)

- [ ] Remove all debug endpoints from production
- [ ] Add input validation to all API endpoints
- [ ] Implement error boundaries in React
- [ ] Add rate limiting to authentication endpoints
- [ ] Audit and fix all console.log statements
- [ ] Create production environment configuration

### Phase 2: Testing (Week 3-4)

- [ ] Set up Jest + React Testing Library
- [ ] Write unit tests for critical components
- [ ] Set up PHPUnit for backend testing
- [ ] Write API integration tests
- [ ] Achieve 60%+ code coverage on critical paths

### Phase 3: Refactoring (Week 5-6)

- [ ] Migrate to TypeScript (gradual)
- [ ] Implement centralized state management (Zustand)
- [ ] Create design token system
- [ ] Refactor large components into smaller pieces
- [ ] Implement proper API error handling

### Phase 4: Performance (Week 7-8)

- [ ] Implement API response caching
- [ ] Add pagination to all list views
- [ ] Optimize database queries
- [ ] Bundle analysis and optimization
- [ ] Implement lazy loading for all routes

### Phase 5: Production Readiness (Week 9-10)

- [ ] Security audit and fixes
- [ ] Performance benchmarking
- [ ] Load testing
- [ ] Documentation updates
- [ ] Deployment automation (CI/CD)

---

## Quick Reference

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | password123 |
| Student | student@college.edu | password123 |
| Teacher | teacher@college.edu | teacher123 |

### Key Commands

```bash
# Frontend Development
cd frontend
npm install
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build

# Database Setup
mysql -u root -p student_data_mining < database/complete_schema.sql
php database/migrations/run_migrations.php

# Backend
# Configure backend/.env with database credentials
# Ensure Apache points to backend folder
```

### Important Files

| Purpose | File Path |
|---------|-----------|
| Main Query Schema | `database/complete_schema.sql` |
| Backend Config | `backend/.env` |
| Frontend Config | `frontend/src/config.js` |
| Auth Context | `frontend/src/context/AuthContext.jsx` |
| Main Routes | `frontend/src/App.jsx` |
| JWT Handler | `backend/includes/jwt.php` |
| Database Connection | `backend/config/database.php` |

---

## Appendix

### A. Complete API Response Formats

All APIs return JSON with consistent structure:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

### B. Database Migrations

| Migration | Description |
|-----------|-------------|
| 000_create_academic_calendar | Calendar events table |
| 001_remove_teacher_role | Legacy cleanup |
| 002_enhanced_analytics_schema | Analytics tables |
| 003_add_real_data_fields | Extended user fields |
| 004_update_calendar_enum | Calendar type updates |
| 005_assignment_system | Assignment tables |
| 006_fix_teacher_role_enum | Fix role enum |
| 007_missing_feature_tables | Additional tables |

### C. Environment Variables

```env
# Backend (.env)
DB_HOST=localhost
DB_NAME=student_data_mining
DB_USER=root
DB_PASS=
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GEMINI_API_KEY=your-gemini-api-key
ALLOWED_ORIGINS=http://localhost:5173

# Frontend (.env) - if needed
VITE_API_BASE=http://localhost/StudentDataMining/backend/api
```

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**Author**: Generated by Google Antigravity IDE  
