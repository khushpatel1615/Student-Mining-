# 🎓 Student Data Mining System

A comprehensive, AI-powered Student Data Mining System with advanced analytics, intelligent recommendations, and performance tracking for students, teachers, and administrators.

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Features](https://img.shields.io/badge/Features-115+-blue)
![AI Features](https://img.shields.io/badge/AI%20Features-7-purple)

---

## 🌟 **Key Features**

### **For Students (50+ Features)**
- 📊 **AI Course Recommender** - Personalized elective suggestions
- 📅 **Smart Study Planner** - AI-generated 7-day schedules
- 📈 **Performance Trends** - Grade predictions & analytics
- 📝 **Submission History** - Pattern analysis & procrastination scoring
- 🎯 **Subject Difficulty Rankings** - Data-driven course selection
- 🔔 **Real-time Notifications** - Stay updated on everything
- 🧠 **Skills Competency Map** - Visual skill analysis
- 💼 **Career Fit Analyzer** - Career-course alignment
- 📚 Grades, Attendance, Assignments, Exams
- 👤 Profile Management
- 📆 Academic Calendar

### **For Teachers (30+ Features)**
- 📝 Assignment creation & grading
- 📊 Exam management & results
- ✏️ Direct grade entry (spreadsheet-style)
- 📅 Manual attendance marking
- 📱 **QR Attendance Generator** - Session-based QR codes
- 📆 Calendar integration
- 📈 Subject analytics

### **For Admins (35+ Features)**
- 👥 Complete user management
- 📚 Program & subject management
- 📊 System-wide analytics
- 📅 Calendar management
- 📥 Bulk import/export
- 📈 Enrollment tracking

---

## 🚀 **Quick Start**

### **Prerequisites**
- PHP 7.4+
- MySQL 5.7+
- Node.js 14+
- XAMPP/WAMP (recommended)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Student-Mining-.git
cd Student-Mining-
```

2. **Backend Setup**
```bash
# Place in XAMPP htdocs folder
# Import database (if you have a SQL file)
# Update database credentials in backend/config/database.php
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost/StudentDataMining/backend/api`

### **Default Login Credentials**
- **Admin**: admin@example.com / admin123
- **Teacher**: teacher@example.com / teacher123
- **Student**: student@example.com / student123

---

## 🎯 **AI/Smart Features**

### **1. AI Course Recommender**
**Algorithm**: Multi-factor scoring
- Performance Match (40%)
- Career Path Fit (30%)
- Difficulty Balance (20%)
- Semester Proximity (10%)

**Output**: Top 8 personalized recommendations with match scores

### **2. Smart Study Planner**
**Algorithm**: Priority-based scheduling
- Analyzes upcoming deadlines
- Identifies weak subjects
- Allocates optimal study time
- Generates 7-day schedule

### **3. Performance Trends & Predictions**
**Algorithm**: Linear regression
- Trend analysis (improving/declining/stable)
- Final grade prediction
- Target grade calculator
- Risk assessment

### **4. Submission History Analytics**
**Analysis**:
- Submission patterns (day/hour)
- Procrastination scoring
- Early bird vs night owl classification
- Improvement recommendations

### **5. Subject Difficulty Ranking**
**Algorithm**: Multi-factor difficulty scoring
- Average Grade (40%)
- Pass Rate (30%)
- Grade Variation (20%)
- Attendance Rate (10%)

### **6. QR Attendance System**
**Features**:
- Session-based QR generation
- Configurable duration
- Real-time scan tracking
- Auto-expiry

### **7. Notifications System**
**Features**:
- Real-time updates (30s polling)
- Multiple notification types
- Mark as read/delete
- Slide-in panel UI

---

## 🛠️ **Tech Stack**

### **Backend**
- PHP 7.4+
- MySQL
- JWT Authentication
- RESTful API

### **Frontend**
- React 18
- React Router
- Framer Motion
- Lucide Icons
- React Hot Toast

### **Database**
- MySQL 5.7+
- 17+ tables
- Normalized schema

---

## 📁 **Project Structure**

```
StudentDataMining/
├── backend/
│   ├── api/              # API endpoints
│   ├── config/           # Database config
│   └── includes/         # JWT & utilities
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── context/      # Context providers
│       ├── pages/        # Dashboard pages
│       └── App.jsx       # Main app
└── database/             # SQL files (if any)
```

---

## 🔒 **Security Features**

- ✅ JWT token authentication
- ✅ Role-based access control (RBAC)
- ✅ Password hashing
- ✅ SQL injection prevention
- ✅ Input validation
- ✅ CORS configuration
- ✅ Prepared statements

---

## 📊 **Statistics**

- **Total Features**: 115+
- **API Endpoints**: 18
- **React Components**: 65+
- **Lines of Code**: 17,500+
- **Database Tables**: 17+
- **User Roles**: 3

---

## 🎨 **UI/UX Features**

- ✅ Modern, professional design
- ✅ Dark/Light mode
- ✅ Fully responsive
- ✅ Smooth animations
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling
- ✅ Toast notifications

---

## 📖 **Documentation**

- [Features List](FEATURES.md) - Complete feature documentation
- [Implementation Summary](IMPLEMENTATION_COMPLETE.md) - Integration details
- [API Documentation](#) - Coming soon
- [User Guide](#) - Coming soon

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 **License**

This project is licensed under the MIT License.

---

## 👨‍💻 **Author**

**Khush Patel**
- GitHub: [@khushpatel1615](https://github.com/khushpatel1615)
- Project: [Student-Mining-](https://github.com/khushpatel1615/Student-Mining-)

---

## 🙏 **Acknowledgments**

- Built with modern web technologies
- Inspired by real-world educational needs
- Designed for scalability and maintainability

---

## 📞 **Support**

For support, email your-email@example.com or open an issue on GitHub.

---

**⭐ If you find this project helpful, please give it a star!**

---

**Status**: ✅ Production Ready | 🚀 Ready to Deploy | 💼 Portfolio Ready
