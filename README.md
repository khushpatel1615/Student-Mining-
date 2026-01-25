# Student Data Mining - Enterprise Dashboard

A comprehensive university management system with role-based access for Students, Admins, and Teachers. Includes real-time analytics, grade tracking, AI-powered insights, and attendance management.

## 📋 Prerequisites
- **Node.js**: v18+ (tested on v20)
- **PHP**: v8.1+
- **Database**: MySQL 8.0 / MariaDB 10.4
- **Web Server**: Apache (via XAMPP/WAMP or equivalent)

## 🛠️ Installation & Setup

### 1. Database Setup
1. Create a MySQL database named `student_data_mining`.
2. Import the base schema:
   ```bash
   mysql -u root -p student_data_mining < database/schema.sql
   ```
3. Run migrations to ensure latest structure:
   ```bash
   php database/migrations/run_migrations.php
   ```

### 2. Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up the environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your database credentials and API keys:
   - `DB_PASS`: Your MySQL password
   - `GEMINI_API_KEY`: Your Google Gemini API Key
   - `JWT_SECRET`: A secure random string

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   ```
   *Ensure `VITE_API_BASE_URL` points to your backend URL (e.g., `http://localhost/StudentDataMining/backend/api`)*

## 🚀 Running the Application

### Start Frontend (Development)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Start Backend
Ensure your Apache server is running and serving the `StudentDataMining` directory.
- **XAMPP**: Start Apache & MySQL from Control Panel.
- **Verification**: Visit `http://localhost/StudentDataMining/backend/api/login.php` (Should see Method Not Allowed or similar).

## 🔑 Default Test Accounts
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@college.edu` | `password123` |
| **Student** | `student@college.edu` | `password123` |
| **Teacher** | `teacher@college.edu` | `teacher123` (reset via script if needed) |

## 📁 Project Structure
- **/backend**: PHP API (Raw PHP, No Framework)
  - `/api`: Endpoints
  - `/config`: Database & Core Config
  - `/includes`: Shared Helpers
- **/frontend**: React + Vite Application
- **/database**: Migrations & Schemas

## 🛡️ Security Notes
- AI Endpoint is protected (Admin only).
- CORS is strictly configured in `backend/config/cors.php`.
- Tokens are JWT-based with role validation.
