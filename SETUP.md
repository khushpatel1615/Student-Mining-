# Setup Guide

Follow these steps to set up the Student Data Mining system locally.

## 📋 Prerequisites
- **Node.js**: v18+ (v20 recommended)
- **PHP**: v8.1+
- **MySQL**: 8.0+

## 1. Database Setup
1. Create a MySQL database named `student_data_mining`.
2. Import the complete database schema from `database/complete_schema.sql` to your new database.
3. Apply any updates by running the migrations: `php database/migrations/run_migrations.php`.

## 2. Backend Configuration
1. Navigate to the `backend` directory.
2. Copy `.env.example` to `.env`.
3. Open `.env` and fill in your database credentials (`DB_USER`, `DB_PASS`) and set a strong, random `JWT_SECRET`.

## 3. Frontend Configuration
1. Navigate to the `frontend` directory.
2. Copy `.env.example` to `.env`.
3. Verify that `VITE_API_BASE_URL` points correctly to your backend path (e.g., `http://localhost/StudentDataMining/backend/api`).
4. Install all frontend dependencies by running `npm install`.

## 4. Running the Application
1. Start your local web server (e.g., Apache via XAMPP) and make sure it is configured to serve the root directory of this project.
2. Start the frontend development server: run `npm run dev` from inside the `frontend` directory.
3. Access the application in your browser at `http://localhost:5173`.

## 🔑 Default Credentials
- **Admin**: `admin@college.edu` / `password123`
- **Student**: `student@college.edu` / `password123`
- **Teacher**: `teacher@college.edu` / `password123`
