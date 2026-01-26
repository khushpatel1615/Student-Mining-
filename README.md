# 🎓 Student Data Mining - Enterprise Dashboard

> A comprehensive university management system with role-based access, real-time analytics, AI-powered insights, and intelligent student performance tracking.

[![PHP](https://img.shields.io/badge/PHP-%3E%3D8.1-8892BF?logo=php)](https://php.net)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-%3E%3D8.0-4479A1?logo=mysql)](https://mysql.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Key Features

### 📊 **For Administrators**
- **Real-Time Analytics Dashboard** - Comprehensive overview of student performance, attendance, and risk factors
- **Risk Center** - AI-powered student risk identification and intervention recommendations
- **Grade Management** - Bulk grade import, dynamic evaluation criteria, and grade distribution analysis
- **Attendance Tracking** - CSV import support, manual/QR-based marking, and detailed reports
- **AI Chat Assistant** - Google Gemini-powered assistant for administrative tasks
- **Report Generator** - Generate academic transcripts, performance analyses, and attendance reports

### 👨‍🎓 **For Students**
- **Personalized Dashboard** - GPA tracking, semester progress, and performance tier visualization
- **Subject Enrollments** - View enrolled courses, grades, attendance, and assignments
- **Assignment Submission** - Upload assignments with file support and track submission history
- **Academic Calendar** - View exams, deadlines, and university events
- **Performance Insights** - Trend analysis, subject-wise breakdown, and improvement suggestions

### 👨‍🏫 **For Teachers**
- **Grade Management** - Assign grades per evaluation component with weighted calculations
- **Attendance Management** - Mark attendance and generate subject-wise reports
- **Assignment Creation** - Create assignments with due dates and grading criteria
- **Student Analytics** - View enrolled students' performance and attendance trends

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ | **PHP** 8.1+ | **MySQL** 8.0+ | **Apache** 2.4+

### Installation (5 Minutes)

```bash
# 1. Clone the repository
git clone https://github.com/khushpatel1615/Student-Mining-.git
cd Student-Mining-

# 2. Setup database
mysql -u root -p
CREATE DATABASE student_data_mining;
EXIT;
mysql -u root -p student_data_mining < database/complete_schema.sql
php database/migrations/run_migrations.php

# 3. Configure backend
cd backend
cp .env.example .env
# Edit .env with your credentials (see SETUP.md for details)

# 4. Configure + start frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev

# 5. Open http://localhost:5173
```

### 🔐 Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@college.edu` | `password123` |
| Student | `student@college.edu` | `password123` |
| Teacher | `teacher@college.edu` | `teacher123` |

> ⚠️ **Change passwords immediately in production!**

---

## 📖 Documentation

- **[Complete Setup Guide](SETUP.md)** - Detailed installation, configuration, and troubleshooting
- **[Project Overview](README_PROJECT_OVERVIEW.md)** - Architecture and technical details
- **[API Documentation](backend/README.md)** - API endpoints and usage

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - Component-based UI framework
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Chart.js & Recharts** - Data visualization
- **Framer Motion** - Smooth animations
- **date-fns** - Date manipulation

### Backend
- **PHP 8.1+** - Pure PHP (no framework)
- **MySQL 8.0+** - Relational database
- **JWT** - Stateless authentication
- **Google OAuth** - Optional social login

### AI & Analytics
- **Google Gemini API** - AI chat assistant
- **Custom Analytics Engine** - Risk scoring and predictions

---

## 📂 Project Structure

```
StudentDataMining/
├── backend/          # PHP API + Business Logic
│   ├── api/          # REST endpoints
│   ├── config/       # Database, CORS, JWT config
│   └── includes/     # Shared utilities
├── frontend/         # React SPA
│   ├── src/          # Components, pages, styles
│   └── public/       # Static assets
├── database/         # SQL schemas + migrations
│   ├── complete_schema.sql
│   └── migrations/
└── docs/             # Additional documentation
```

---

## 🔒 Security Features

✅ **JWT-based authentication** with role-based access control (RBAC)  
✅ **CORS protection** with configurable allowed origins  
✅ **Environment-based secrets** (.env files, never committed)  
✅ **SQL injection prevention** via prepared statements  
✅ **Rate limiting** on AI endpoints  
✅ **Secure file uploads** with validation  
✅ **Audit trails** for grade changes and imports  

---

## 🎨 Screenshots

### Admin Dashboard
![Admin Risk Center](docs/screenshots/admin-dashboard.png)

### Student Dashboard
![Student Performance](docs/screenshots/student-dashboard.png)

### Grade Management
![Grade Management](docs/screenshots/grade-management.png)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Ganpat University** - Educational context and curriculum structure
- **Google Gemini** - AI chat capabilities
- **React Community** - UI component libraries
- **Contributors** - Thanks to all who have contributed to this project

---

## 📬 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/khushpatel1615/Student-Mining-/issues)
- **Discussions**: [GitHub Discussions](https://github.com/khushpatel1615/Student-Mining-/discussions)
- **Email**: [Your contact email]

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for better education management

</div>
