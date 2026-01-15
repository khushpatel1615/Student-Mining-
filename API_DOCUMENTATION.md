# Student Data Mining System - API Documentation

## 📚 **Overview**

This document provides comprehensive API documentation for the Student Data Mining System backend.

**Base URL**: `http://localhost/StudentDataMining/backend/api`

**Authentication**: All endpoints require JWT token authentication via `Authorization: Bearer {token}` header.

---

## 🔐 **Authentication**

### Login
```
POST /auth/login.php
```

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "student@example.com",
    "role": "student"
  }
}
```

---

## 👤 **Students API**

### Get All Students
```
GET /students.php
```

### Get Student by ID
```
GET /students.php?id={student_id}
```

### Create Student
```
POST /students.php
```

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "program_id": 1,
  "semester": 1
}
```

### Update Student
```
PUT /students.php
```

### Delete Student
```
DELETE /students.php?id={student_id}
```

---

## 📚 **Subjects API**

### Get All Subjects
```
GET /subjects.php
```

### Get Subject by ID
```
GET /subjects.php?id={subject_id}
```

### Create Subject
```
POST /subjects.php
```

**Request Body**:
```json
{
  "code": "CS101",
  "name": "Introduction to Programming",
  "credits": 3,
  "program_id": 1,
  "semester": 1,
  "teacher_id": 5
}
```

---

## 📝 **Assignments API**

### Get Assignments
```
GET /assignments.php
GET /assignments.php?subject_id={subject_id}
```

### Create Assignment
```
POST /assignments.php
```

**Request Body**:
```json
{
  "subject_id": 1,
  "title": "Assignment 1",
  "description": "Complete the exercises",
  "due_date": "2024-12-31",
  "total_marks": 100
}
```

### Submit Assignment (Student)
```
POST /assignments.php
```

**Request Body**:
```json
{
  "action": "submit",
  "assignment_id": 1,
  "file_path": "/uploads/assignment1.pdf"
}
```

---

## 📊 **Grades API**

### Get Grades
```
GET /grades.php
GET /grades.php?student_id={student_id}
GET /grades.php?subject_id={subject_id}
```

### Create/Update Grade
```
POST /grades.php
```

**Request Body**:
```json
{
  "enrollment_id": 1,
  "grade": 85.5,
  "component_type": "assignment",
  "component_id": 1
}
```

---

## 📅 **Attendance API**

### Get Attendance
```
GET /attendance.php?student_id={student_id}
GET /attendance.php?subject_id={subject_id}&date={YYYY-MM-DD}
```

### Mark Attendance
```
POST /attendance.php
```

**Request Body**:
```json
{
  "subject_id": 1,
  "date": "2024-01-15",
  "attendance": [
    {"student_id": 1, "status": "present"},
    {"student_id": 2, "status": "absent"}
  ]
}
```

---

## 🎓 **Smart Features APIs**

### 1. AI Course Recommender
```
GET /course_recommendations.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "subject_id": 5,
        "code": "CS301",
        "name": "Data Structures",
        "match_score": 95,
        "reasoning": "Strong performance in prerequisites...",
        "factors": {
          "performance_match": 38,
          "career_fit": 28,
          "difficulty_balance": 19,
          "semester_proximity": 10
        }
      }
    ]
  }
}
```

### 2. Smart Study Planner
```
GET /study_planner.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "schedule": [
      {
        "day": "Monday",
        "blocks": [
          {
            "time_slot": "18:00-20:00",
            "subject": "Mathematics",
            "task": "Assignment 3",
            "urgency": "high"
          }
        ]
      }
    ],
    "summary": {
      "upcoming_deadlines": 5,
      "pending_assignments": 3
    }
  }
}
```

### 3. Performance Trends
```
GET /performance_trends.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overall_stats": {
      "gpa": 3.5,
      "subjects_at_risk": 1,
      "improving_subjects": 3
    },
    "subject_trends": [
      {
        "subject_code": "CS101",
        "current_grade": 85,
        "trend": "improving",
        "predicted_final": 88,
        "risk_level": "low"
      }
    ]
  }
}
```

### 4. Notifications
```
GET /notifications.php
GET /notifications.php?unread=true
```

**Create Notification**:
```
POST /notifications.php
```

**Request Body**:
```json
{
  "user_id": 1,
  "type": "assignment",
  "title": "New Assignment",
  "message": "Assignment 5 has been posted",
  "link": "/student?tab=assignments"
}
```

**Mark as Read**:
```
PUT /notifications.php
```

**Request Body**:
```json
{
  "action": "mark_read",
  "notification_id": 5
}
```

### 5. QR Attendance
```
GET /qr_attendance.php?action=generate&subject_id={id}&duration={minutes}
GET /qr_attendance.php?action=list
GET /qr_attendance.php?action=validate&session_code={code}
```

**Response (Generate)**:
```json
{
  "success": true,
  "data": {
    "session_id": 1,
    "session_code": "abc123def456",
    "expires_at": "2024-01-15 10:30:00",
    "qr_data": "{...}"
  }
}
```

### 6. Submission Analytics
```
GET /submission_analytics.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_submissions": 25,
      "on_time_rate": 80,
      "average_grade": 85.5
    },
    "patterns": {
      "most_common_day": "Sunday",
      "most_common_hour": 20,
      "procrastinator_score": 45
    }
  }
}
```

### 7. Subject Difficulty
```
GET /subject_difficulty.php
GET /subject_difficulty.php?program_id={id}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "code": "CS401",
      "name": "Advanced Algorithms",
      "difficulty_score": 75.5,
      "difficulty_level": "Very Hard",
      "statistics": {
        "average_grade": 65.5,
        "pass_rate": 75,
        "total_students": 50
      }
    }
  ]
}
```

### 8. Achievement Badges
```
GET /badges.php?action=my_badges
GET /badges.php?action=check_eligibility
GET /badges.php?action=all_badges
```

**Response (My Badges)**:
```json
{
  "success": true,
  "data": {
    "earned_badges": [
      {
        "code": "TOP_PERFORMER",
        "name": "Top Performer",
        "icon": "🌟",
        "earned_at": "2024-01-15"
      }
    ],
    "total_earned": 5,
    "completion_percentage": 38.5
  }
}
```

### 9. Peer Comparison
```
GET /peer_comparison.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "percentiles": {
      "overall_gpa_percentile": 75,
      "interpretation": "You're in the top 25% of your class!"
    },
    "leaderboard": {
      "top_10": [...],
      "your_rank": 3
    },
    "similar_students": {
      "courses": [...]
    }
  }
}
```

### 10. Study Habits
```
GET /study_habits.php
```

**Response**:
```json
{
  "success": true,
  "data": {
    "patterns": {
      "most_productive_hours": [
        {"hour": 20, "avg_grade": 92.5}
      ],
      "average_session_duration": 2.5
    },
    "correlations": {
      "early_submission_impact": {
        "improvement": 8.3,
        "message": "Submitting early improves grades by 8.3%"
      }
    },
    "recommendations": [...]
  }
}
```

---

## 📋 **Error Responses**

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

---

## 🔒 **Security**

- All endpoints require JWT authentication
- Passwords are hashed using bcrypt
- SQL injection prevention via prepared statements
- Role-based access control (RBAC)
- Input validation on all endpoints

---

## 📝 **Notes**

- All dates are in `YYYY-MM-DD` format
- All timestamps are in `YYYY-MM-DD HH:MM:SS` format
- Pagination is available on list endpoints (add `?page=1&limit=50`)
- Sorting is available on list endpoints (add `?sort=name&order=asc`)

---

**API Version**: 1.0  
**Last Updated**: January 2024
