# 📊 Student Data Mining System

> A comprehensive full-stack web application for educational institutions to manage student data, track academic performance, and generate actionable insights through data analytics.

[![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)]()
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)]()
[![Backend](https://img.shields.io/badge/Backend-PHP-777BB4?logo=php)]()
[![Database](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql)]()

---

## 🎯 Project Overview

The **Student Data Mining System** is designed to streamline academic administration by providing role-based dashboards for administrators, teachers, and students. The system enables efficient management of student records, grades, attendance, subjects, and calendar events while offering powerful analytics to identify trends and improve educational outcomes.

**🚀 Current Status:** This project is under active development. I am currently migrating the frontend from vanilla JavaScript to React to improve scalability, maintainability, and user experience with modern UI/UX patterns.

---

## ✨ Key Features

### 👨‍💼 Admin Dashboard
- **Student Management**: Add, edit, and delete student records with comprehensive profile management
- **Grade Management**: Oversee all student grades across subjects with card-based UI for easy navigation
- **Subject Administration**: Create and manage subjects, assign teachers, and track enrollment
- **Analytics Dashboard**: Visualize key metrics including:
  - Total students, teachers, and subjects
  - Average attendance rates
  - Grade distribution charts
  - Performance trends over time
- **Calendar Management**: Schedule holidays, exams, and important academic events

### 👩‍🏫 Teacher Dashboard
- **Grade Entry**: Input and update student grades for assigned subjects
- **Attendance Tracking**: Mark and monitor student attendance
- **Subject Overview**: View detailed subject information and enrolled students
- **Quick Actions**: Streamlined workflows for common tasks

### 👨‍🎓 Student Dashboard
- **Personal Profile**: View and update personal information
- **Grade Tracking**: Monitor grades across all enrolled subjects
- **Attendance Records**: Track attendance history with visual charts
- **Subject Details**: Access subject-specific information and performance metrics
- **Calendar View**: Stay updated on academic events and deadlines

---

## 🛠️ Technology Stack

### Frontend
- **React** (Migration in progress)
- **React Router** for navigation
- **Recharts** for data visualization
- **CSS3** with modern design patterns (gradients, glassmorphism, animations)
- **Custom Hooks** for reusable logic (e.g., `useCountUp` for animated statistics)

### Backend
- **PHP** for server-side logic
- **RESTful API** architecture
- **JWT Authentication** for secure session management
- **Custom middleware** for role-based access control

### Database
- **MySQL** for relational data storage
- Normalized schema design for optimal performance
- Stored procedures for complex queries

### Development Environment
- **XAMPP** for local development (Apache + MySQL)
- **Git** for version control
- **npm** for package management

---

## 📂 Project Structure

```
StudentDataMining/
├── backend/
│   ├── api/              # API endpoints (add_subjects.php, etc.)
│   ├── includes/         # Shared utilities (jwt.php, db connection)
│   └── ...
├── database/             # SQL schema and migration files
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (LoginCard, Dashboard, etc.)
│   │   ├── hooks/        # Custom React hooks (useCountUp.js)
│   │   ├── pages/        # Page-level components
│   │   └── ...
│   └── public/           # Static assets
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **XAMPP** (or equivalent Apache + MySQL stack)
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/khushpatel1615/Student-Mining-.git
   cd StudentDataMining
   ```

2. **Set up the database**
   - Start XAMPP and ensure MySQL is running
   - Import the database schema from `database/` folder into phpMyAdmin
   - Update database credentials in `backend/includes/db_config.php` (if needed)

3. **Configure the backend**
   - Place the `backend/` folder in your XAMPP `htdocs` directory
   - Ensure Apache is running on `localhost`

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

5. **Run the development server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost/StudentDataMining/backend/api/`

---

## 🔐 Security Considerations

- **JWT-based authentication** ensures secure API access
- **Role-based access control** prevents unauthorized actions
- **Prepared statements** protect against SQL injection
- **Input validation** on both client and server sides

> ⚠️ **Note:** This project is for educational/portfolio purposes. Before deploying to production, ensure all sensitive credentials (API keys, database passwords) are stored in environment variables and not hardcoded.

---

## 📈 Roadmap

### ✅ Completed
- [x] Core authentication system with JWT
- [x] Admin dashboard with analytics
- [x] Student and teacher dashboards
- [x] Grade and attendance management
- [x] Calendar functionality

### 🔄 In Progress
- [ ] Complete React migration for all components
- [ ] Implement advanced data visualization (predictive analytics)
- [ ] Add export functionality (PDF reports, Excel sheets)
- [ ] Improve mobile responsiveness

### 🔮 Future Enhancements
- [ ] Real-time notifications (WebSockets)
- [ ] Parent portal for student progress tracking
- [ ] Integration with external learning management systems
- [ ] AI-powered insights for student performance prediction

---

## 🎓 Learning Outcomes

This project demonstrates my proficiency in:
- **Full-stack development** with modern frontend and backend technologies
- **Database design** and optimization for educational data
- **Authentication & Authorization** using industry-standard practices (JWT)
- **UI/UX design** with a focus on user-centric, role-based interfaces
- **Data visualization** to transform raw data into actionable insights
- **Version control** and collaborative development workflows

---

## 📸 Screenshots

> *Screenshots coming soon as the React migration is finalized.*

---

## 🤝 Contributing

This is a personal portfolio project, but feedback and suggestions are always welcome! Feel free to open an issue or reach out if you have ideas for improvement.

---

## 📧 Contact

**Khush Patel**  
- GitHub: [@khushpatel1615](https://github.com/khushpatel1615)
- LinkedIn: [Add your LinkedIn URL here]
- Email: [Add your email here]

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  <p><strong>⭐ If you find this project interesting, please consider giving it a star!</strong></p>
  <p><em>Built with ❤️ by Khush Patel</em></p>
</div>
