-- Migration: 006_fix_teacher_role_enum.sql
-- Fixes the users table to ensure the role column supports 'teacher' properly.
-- This unifies the role definition across the application.

-- We modify the column to include 'teacher' if it was missing or removed.
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin', 'teacher') NOT NULL DEFAULT 'student';
