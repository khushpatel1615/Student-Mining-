-- ============================================
-- Migration: Remove Teacher Role
-- Purpose: Simplify system to Admin + Student only
-- Date: 2026-01-07
-- ============================================

USE student_data_mining;

-- Step 1: Backup existing teacher users (optional - for safety)
CREATE TABLE IF NOT EXISTS users_backup_teachers AS 
SELECT * FROM users WHERE role = 'teacher';

-- Step 2: Delete teacher users (or convert them to students/admins if needed)
-- Uncomment the line below if you want to delete teacher accounts
-- DELETE FROM users WHERE role = 'teacher';

-- Or convert teachers to admin (safer option):
-- UPDATE users SET role = 'admin' WHERE role = 'teacher';

-- Step 3: Drop teacher_subjects table if it exists
DROP TABLE IF EXISTS teacher_subjects;

-- Step 4: Update users table - remove 'teacher' from role ENUM
-- Note: MySQL doesn't allow direct ENUM modification, so we need to alter the column
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin') NOT NULL DEFAULT 'student';

-- Step 5: Update academic_calendar table - remove subject-specific targeting
-- (We'll keep the structure but simplify usage)
-- No schema changes needed, just business logic changes

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Step 7: Verify changes
SELECT 'Migration Complete!' as Status;
SELECT COUNT(*) as remaining_users, role FROM users GROUP BY role;
