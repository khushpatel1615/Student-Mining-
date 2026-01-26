# Student Data Mining - Complete Setup Guide

> **📌 This guide ensures a reproducible, secure, end-to-end setup from a clean clone.**

---

## 📋 Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Download |
|------------|---------|----------|
| **Node.js** | v18+ (recommended: v20) | [nodejs.org](https://nodejs.org) |
| **PHP** | v8.1+ | Included in XAMPP |
| **MySQL** | 8.0+ or MariaDB 10.4+ | Included in XAMPP |
| **Apache** | 2.4+ | Included in XAMPP |
| **Composer** | Latest (optional) | [getcomposer.org](https://getcomposer.org) |

### Recommended Setup
- **XAMPP** (Windows/Linux): [apachefriends.org](https://www.apachefriends.org)
- **MAMP** (macOS): [mamp.info](https://www.mamp.info)

---

## 🚀 Installation Steps

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/khushpatel1615/Student-Mining-.git
cd Student-Mining-
```

> ⚠️ **IMPORTANT**: If you downloaded a ZIP file, extract it to your web server's document root (e.g., `C:\xampp\htdocs\StudentDataMining`).

---

### **Step 2: Database Setup**

#### 2.1 Start MySQL Server
- **XAMPP Users**: Start Apache + MySQL from XAMPP Control Panel
- **Others**: Ensure MySQL is running on port 3306

#### 2.2 Create Database
Open a terminal/command prompt and run:

```bash
# Option 1: Via MySQL CLI
mysql -u root -p
CREATE DATABASE student_data_mining CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Option 2: Via phpMyAdmin
# Navigate to http://localhost/phpmyadmin
# Click "New" → Enter "student_data_mining" → Click "Create"
```

#### 2.3 Import Complete Schema

```bash
# Navigate to project root
cd database

# Import the complete unified schema
mysql -u root -p student_data_mining < complete_schema.sql
```

> 📝 **Note**: The `complete_schema.sql` file includes all required tables (users, subjects, assignments, analytics, etc.).

#### 2.4 Run Migrations

```bash
php migrations/run_migrations.php
```

**Expected Output:**
```
=== Student Data Mining - Database Migration Runner ===

📄 Checking migration: 001_remove_teacher_role.sql
   -> Processed (Success: 1)
📄 Checking migration: 002_enhanced_analytics_schema.sql
   -> Processed (Success: 15)
...
=== Migration Process Complete ===
```

#### 2.5 (Optional) Populate Sample Data

```bash
# Import sample grades
mysql -u root -p student_data_mining < populate_random_grades.sql

# OR use the PHP script
php populate_grades.php
```

---

### **Step 3: Backend Configuration**

#### 3.1 Navigate to Backend
```bash
cd backend
```

#### 3.2 Create Environment File
```bash
# Copy the example file
cp .env.example .env
```

#### 3.3 Configure `.env` File
Edit `backend/.env` with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=student_data_mining
DB_USER=root
DB_PASS=               # Leave empty if no password, or set your MySQL password

# JWT Security (CHANGE THIS!)
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING_AT_LEAST_32_CHARS
JWT_EXPIRY=86400       # 24 hours in seconds

# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Frontend CORS Origin
ALLOWED_ORIGIN=http://localhost:5173

# Gemini AI API Key (Optional - for Admin AI Chat)
GEMINI_API_KEY=your_gemini_api_key_here
```

> 🔐 **Security Recommendations**:
> - **JWT_SECRET**: Generate a secure random string (min 32 characters)
>   ```bash
>   # Linux/macOS
>   openssl rand -base64 32
>   
>   # Windows PowerShell
>   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
>   ```
> - **Never commit `.env` to version control!**

#### 3.4 Verify Backend is Accessible

Open your browser and visit:
```
http://localhost/StudentDataMining/backend/api/
```

You should see a JSON error like `{"success":false,"error":"Not Found"}` (this is expected).

---

### **Step 4: Frontend Configuration**

#### 4.1 Navigate to Frontend
```bash
cd ../frontend
```

#### 4.2 Install Dependencies
```bash
npm install
```

> ⏱️ **This may take 2-5 minutes depending on your internet speed.**

#### 4.3 Create Frontend Environment File
```bash
# Copy the example file
cp .env.example .env
```

#### 4.4 Configure `frontend/.env`

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost/StudentDataMining/backend/api

# Google OAuth Client ID (must match backend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

> 📝 **Important**: If your project is in a different folder, update `VITE_API_BASE_URL` accordingly.  
> Example: `http://localhost/MyProject/backend/api`

---

### **Step 5: Start the Application**

#### 5.1 Start Frontend Development Server

In the `frontend/` directory:

```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

#### 5.2 Open in Browser

Navigate to: **http://localhost:5173**

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@college.edu` | `password123` | Full system access + AI chat |
| **Student** | `student@college.edu` | `password123` | Student dashboard |
| **Teacher** | `teacher@college.edu` | `teacher123` | Grade/attendance management |

> ⚠️ **Change these passwords immediately in production!**

---

## ✅ Verification Checklist

After setup, verify the following:

- [ ] **Database**: `student_data_mining` exists with 20+ tables
- [ ] **Backend**: `http://localhost/StudentDataMining/backend/api/login.php` is accessible
- [ ] **Frontend**: `http://localhost:5173` shows login page
- [ ] **Login**: Can log in with default credentials
- [ ] **Dashboard**: Admin/Student dashboards load without errors
- [ ] **CORS**: No CORS errors in browser console
- [ ] **API**: Network tab shows successful API calls to backend

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"

**Solution:**
1. Verify MySQL is running (`XAMPP Control Panel → MySQL → Running`)
2. Check `backend/.env` has correct `DB_USER` and `DB_PASS`
3. Ensure database `student_data_mining` exists:
   ```sql
   mysql -u root -p -e "SHOW DATABASES LIKE 'student_data_mining';"
   ```

---

### Issue: "CORS policy error" in browser console

**Solution:**
1. Ensure backend `.env` has `ALLOWED_ORIGIN=http://localhost:5173`
2. Ensure frontend `.env` has the correct `VITE_API_BASE_URL`
3. Restart both frontend (`npm run dev`) and Apache

---

### Issue: "404 Not Found" on API calls

**Solution:**
1. Verify Apache is serving the project directory
2. Check `.htaccess` files are not being ignored (enable `mod_rewrite` in Apache)
3. Ensure `backend/api/` path is correct in `frontend/.env`

---

### Issue: Frontend won't start / "Cannot find module"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: "JWT_SECRET not configured"

**Solution:**
1. Copy `backend/.env.example` to `backend/.env`
2. Set `JWT_SECRET` to a random string (min 32 chars)
3. Restart Apache

---

### Issue: AI Chat not working

**Solution:**
1. Ensure you have a valid Google Gemini API key
2. Add it to `backend/.env` as `GEMINI_API_KEY=your_key_here`
3. AI Chat is **admin-only** - login as `admin@college.edu`

---

## 📂 Project Structure

```
StudentDataMining/
├── backend/
│   ├── api/              # API endpoints
│   │   ├── login.php
│   │   ├── grades.php
│   │   ├── analytics/
│   │   └── ...
│   ├── config/           # Configuration files
│   │   ├── database.php
│   │   ├── cors.php
│   │   └── EnvLoader.php
│   ├── includes/         # Shared utilities
│   │   ├── jwt.php
│   │   └── api_helpers.php
│   ├── uploads/          # User-uploaded files
│   └── .env              # Environment config (DO NOT COMMIT)
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── styles/       # Global styles
│   │   ├── utils/        # Utilities
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   ├── public/           # Static assets
│   ├── package.json      # Dependencies
│   └── .env              # Environment config (DO NOT COMMIT)
│
├── database/
│   ├── complete_schema.sql      # Full database schema
│   ├── migrations/              # Database migrations
│   │   ├── run_migrations.php
│   │   └── 00*_*.sql
│   └── populate_random_grades.sql
│
├── .gitignore
├── README.md
└── SETUP.md              # This file
```

---

## 🛡️ Security Best Practices

### For Development:
✅ Use `.env` files for all secrets  
✅ Keep `.env` out of version control (already in `.gitignore`)  
✅ Use strong, random JWT secrets  
✅ Change default passwords immediately  

### For Production:
✅ Use HTTPS (SSL/TLS)  
✅ Set `display_errors = Off` in `php.ini`  
✅ Use environment-specific `.env` files  
✅ Enable MySQL binary logging for audit trails  
✅ Implement rate limiting on login endpoints  
✅ Regular security audits and dependency updates  

---

## 📊 Database Schema Overview

The system uses the following main tables:

| Table | Purpose |
|-------|---------|
| `users` | Student/Admin/Teacher accounts |
| `programs` | Academic programs (BCA, MCA, etc.) |
| `subjects` | Courses/subjects per semester |
| `student_enrollments` | Which students are in which subjects |
| `student_grades` | Individual grades per evaluation criteria |
| `evaluation_criteria` | Grading components (midterm, final, etc.) |
| `student_attendance` | Attendance records |
| `assignments` | Assignment/homework definitions |
| `assignment_submissions` | Student submissions with files |
| `student_analytics` | Pre-computed analytics cache |
| `predictions` | AI/ML predictions for student outcomes |
| `recommendations` | Personalized student recommendations |

---

## 🔄 Update & Maintenance

### Pulling Latest Changes
```bash
git pull origin main

# Re-run migrations if database changed
php database/migrations/run_migrations.php

# Update frontend dependencies if package.json changed
cd frontend && npm install
```

### Database Backup
```bash
# Backup entire database
mysqldump -u root -p student_data_mining > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u root -p student_data_mining < backup_20260126.sql
```

---

## 📞 Support & Contribution

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `README.md` for feature overview
- **License**: See `LICENSE` file

---

## 🎓 Next Steps

After successful setup:

1. **Explore the Dashboard**: Log in as Admin to see all features
2. **Import Real Data**: Use CSV import features for grades/attendance
3. **Configure AI Chat**: Add Gemini API key to enable AI assistant
4. **Customize**: Modify subjects, evaluation criteria, etc. via Admin panel

---

✨ **Congratulations! Your Student Data Mining system is now ready to use!** ✨
