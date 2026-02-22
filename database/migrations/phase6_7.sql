-- 1. Grade Lock System
ALTER TABLE student_enrollments 
  ADD COLUMN is_finalized TINYINT(1) DEFAULT 0 NOT NULL,
  ADD COLUMN finalized_by INT DEFAULT NULL,
  ADD COLUMN finalized_at TIMESTAMP NULL,
  ADD FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Grade Edit Audit Trail
CREATE TABLE IF NOT EXISTS grade_edit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  criteria_id INT NOT NULL,
  edited_by INT NOT NULL,
  old_marks DECIMAL(5,2) DEFAULT NULL,
  new_marks DECIMAL(5,2) DEFAULT NULL,
  edit_reason VARCHAR(500) DEFAULT NULL,
  override_approved_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (override_approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Total Credits Required for Graduation per Program
ALTER TABLE programs
  ADD COLUMN total_credits_required INT DEFAULT 120 NOT NULL,
  ADD COLUMN min_gpa_required DECIMAL(3,2) DEFAULT 2.00 NOT NULL;

-- 4. CSV Import Job Tracking
CREATE TABLE IF NOT EXISTS grade_import_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  imported_by INT NOT NULL,
  status ENUM('pending', 'validated', 'applied', 'failed') DEFAULT 'pending',
  total_rows INT DEFAULT 0,
  valid_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  validation_report JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Email Queue Wiring
CREATE TABLE IF NOT EXISTS email_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  grade_finalized TINYINT(1) DEFAULT 1,
  risk_alert TINYINT(1) DEFAULT 1,
  tier_achievement TINYINT(1) DEFAULT 1,
  import_complete TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  template_type ENUM('grade_finalized','risk_alert','tier_achievement','import_complete') DEFAULT NULL,
  template_data JSON,
  status ENUM('pending','sent','failed') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Still try to alter in case it DOES exist
ALTER TABLE email_queue 
  ADD COLUMN IF NOT EXISTS template_type 
    ENUM('grade_finalized','risk_alert','tier_achievement','import_complete') 
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
