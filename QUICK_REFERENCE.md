# 🚀 Quick Reference Card

> **One-page cheat sheet for common tasks**

---

## 📦 Installation (First Time)

### Windows (Recommended)
```cmd
# Run automated setup
setup.bat

# Then start frontend
cd frontend
npm run dev
```

### Manual (All Platforms)
```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE student_data_mining;"
mysql -u root -p student_data_mining < database/complete_schema.sql
php database/migrations/run_migrations.php

# 2. Backend
cd backend
cp .env.example .env
# Edit .env: Set DB_PASS and JWT_SECRET

# 3. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

---

## 🔐 Default Logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@college.edu` | `password123` |
| Student | `student@college.edu` | `password123` |
| Teacher | `teacher@college.edu` | `teacher123` |

---

## ⚙️ Common Commands

### Start Development Server
```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

### Build for Production
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Run Database Migrations
```bash
php database/migrations/run_migrations.php
```

### Validate Setup
```bash
php setup_validator.php
```

### Import Sample Grades
```bash
mysql -u root -p student_data_mining < database/populate_random_grades.sql
```

---

## 🗂️ Key File Locations

```
StudentDataMining/
├── backend/.env              # Backend config (DB, JWT, API keys)
├── frontend/.env             # Frontend config (API URL)
├── database/
│   ├── complete_schema.sql   # Full database schema
│   └── migrations/           # Database updates
├── backend/api/              # All API endpoints
├── frontend/src/             # React components
└── backend/uploads/          # User-uploaded files
```

---

## 🔧 Configuration Files

### backend/.env
```env
DB_HOST=localhost
DB_NAME=student_data_mining
DB_USER=root
DB_PASS=                      # Set your MySQL password
JWT_SECRET=CHANGE_TO_RANDOM   # Min 32 chars
ALLOWED_ORIGIN=http://localhost:5173
GEMINI_API_KEY=               # Optional - for AI chat
```

### frontend/.env
```env
VITE_API_BASE_URL=http://localhost/StudentDataMining/backend/api
VITE_GOOGLE_CLIENT_ID=        # Optional - for Google login
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Database connection failed" | Check MySQL running, verify `backend/.env` credentials |
| "CORS policy error" | Ensure `ALLOWED_ORIGIN` matches frontend URL |
| "404 on API calls" | Check Apache running, verify API URL in `frontend/.env` |
| "Cannot find module" | Run `cd frontend && npm install` |
| Frontend won't start | Delete `node_modules`, run `npm install` again |

---

## 📊 Database Quick Actions

### Reset Database
```sql
DROP DATABASE student_data_mining;
CREATE DATABASE student_data_mining;
```
```bash
mysql -u root -p student_data_mining < database/complete_schema.sql
php database/migrations/run_migrations.php
```

### Backup Database
```bash
mysqldump -u root -p student_data_mining > backup_$(date +%Y%m%d).sql
```

### Restore Backup
```bash
mysql -u root -p student_data_mining < backup_20260126.sql
```

---

## 🎯 Feature Access

### Admin Features
- Risk Center: `/admin` → "Risk Center" tab
- Grade Management: `/admin/grades`
- Attendance: `/admin/attendance`
- AI Chat: Bottom-right floating button (admin only)
- Reports: `/admin/reports`

### Student Features
- Dashboard: `/student`
- My Grades: `/student/grades`
- Assignments: `/student/assignments`
- Attendance: `/student/attendance`

### Teacher Features
- Students: `/teacher/students`
- Grade Entry: `/teacher/grades`
- Assignments: `/teacher/assignments`

---

## 🔑 Generate Secure Secrets

### JWT Secret (Linux/macOS)
```bash
openssl rand -base64 48
```

### JWT Secret (Windows PowerShell)
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

### JWT Secret (Online)
Visit: https://www.random.org/strings/

---

## 📚 Documentation

- **Full Setup Guide:** [SETUP.md](SETUP.md)
- **Security Guide:** [SECURITY.md](SECURITY.md)
- **Fixes Applied:** [FIXES_APPLIED.md](FIXES_APPLIED.md)
- **Project Overview:** [README.md](README.md)

---

## 🆘 Get Help

1. Check [SETUP.md](SETUP.md) → Troubleshooting section
2. Run `php setup_validator.php` to diagnose issues
3. Check browser console for frontend errors
4. Check `backend/error_log` for API errors
5. GitHub Issues: [Submit a bug report](https://github.com/khushpatel1615/Student-Mining-/issues)

---

## ⚡ Performance Tips

- Use `npm run build` for production (10x faster)
- Enable MySQL query cache
- Enable PHP OPcache
- Use Redis for rate limiting (production)
- Enable gzip compression in Apache

---

## 🔒 Pre-Production Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (48+ chars)
- [ ] Enable HTTPS
- [ ] Set `ALLOWED_ORIGIN` to production domain
- [ ] Disable `display_errors` in php.ini
- [ ] Review [SECURITY.md](SECURITY.md)
- [ ] Test all features
- [ ] Setup automated backups

---

**Last Updated:** 2026-01-26  
**Version:** 1.0.0
