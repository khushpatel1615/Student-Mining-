@echo off
REM ============================================
REM StudentDataMining - Quick Setup Script (Windows)
REM ============================================
REM This script automates the initial setup process
REM Run this ONCE after cloning the repository
REM ============================================

echo ============================================
echo   StudentDataMining - Quick Setup
echo ============================================
echo.

REM Check if running from correct directory
if not exist "backend" (
    echo ERROR: backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo [1/6] Checking prerequisites...
echo.

REM Check if Node.js is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js/npm not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo   [OK] Node.js is installed

REM Check if PHP is installed
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP not found!
    echo Please install XAMPP or ensure PHP is in your PATH.
    pause
    exit /b 1
)
echo   [OK] PHP is installed

REM Check if MySQL is accessible
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MySQL CLI not found in PATH
    echo You'll need to run database setup manually via phpMyAdmin
    set MYSQL_AVAILABLE=0
) else (
    echo   [OK] MySQL is accessible
    set MYSQL_AVAILABLE=1
)

echo.
echo [2/6] Setting up backend configuration...
echo.

if not exist "backend\.env" (
    echo Copying backend/.env.example to backend/.env...
    copy "backend\.env.example" "backend\.env" >nul
    echo   [DONE] Created backend/.env
    echo.
    echo   IMPORTANT: Edit backend/.env and set:
    echo     - DB_PASS (if your MySQL has a password)
    echo     - JWT_SECRET (generate a random string)
    echo     - GEMINI_API_KEY (for AI chat, optional)
    echo.
) else (
    echo   [SKIP] backend/.env already exists
)

echo.
echo [3/6] Setting up frontend configuration...
echo.

if not exist "frontend\.env" (
    echo Copying frontend/.env.example to frontend/.env...
    copy "frontend\.env.example" "frontend\.env" >nul
    echo   [DONE] Created frontend/.env
) else (
    echo   [SKIP] frontend/.env already exists
)

echo.
echo [4/6] Installing frontend dependencies...
echo.
echo This may take a few minutes...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo   [DONE] Frontend dependencies installed
cd ..

echo.
echo [5/6] Creating required directories...
echo.

if not exist "backend\uploads" (
    mkdir "backend\uploads"
    echo   [DONE] Created backend/uploads
)

if not exist "backend\data\attendance" (
    mkdir "backend\data\attendance"
    echo   [DONE] Created backend/data/attendance
)

echo.
echo [6/6] Database Setup
echo.

if %MYSQL_AVAILABLE%==1 (
    echo MySQL is available. Would you like to create the database now?
    echo.
    set /p CREATE_DB="Create database 'student_data_mining'? (Y/N): "
    
    if /i "%CREATE_DB%"=="Y" (
        echo.
        echo Creating database...
        mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS student_data_mining CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        
        echo Importing schema...
        mysql -u root -p student_data_mining < database\complete_schema.sql
        
        echo Running migrations...
        php database\migrations\run_migrations.php
        
        echo   [DONE] Database setup complete!
    ) else (
        echo   [SKIP] Database setup skipped
        echo.
        echo   Run these commands manually:
        echo     1. mysql -u root -p
        echo     2. CREATE DATABASE student_data_mining;
        echo     3. EXIT;
        echo     4. mysql -u root -p student_data_mining ^< database\complete_schema.sql
        echo     5. php database\migrations\run_migrations.php
    )
) else (
    echo MySQL CLI not available. Use phpMyAdmin to:
    echo   1. Create database 'student_data_mining'
    echo   2. Import database/complete_schema.sql
    echo   3. Run: php database\migrations\run_migrations.php
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Review and edit backend/.env (especially JWT_SECRET)
echo   2. Ensure XAMPP Apache and MySQL are running
echo   3. cd frontend
echo   4. npm run dev
echo   5. Open http://localhost:5173
echo.
echo Default login:
echo   Admin:   admin@college.edu / password123
echo   Student: student@college.edu / password123
echo.
echo For detailed instructions, see SETUP.md
echo.

pause
