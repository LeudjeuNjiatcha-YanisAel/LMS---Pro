USE lms_db;

-- 1. Create live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    course_id INT NULL,
    session_code VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('active', 'ended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Add columns to evaluations for scheduling
ALTER TABLE evaluations ADD COLUMN course_id INT NULL;
ALTER TABLE evaluations ADD COLUMN scheduled_date DATETIME NULL;
ALTER TABLE evaluations ADD COLUMN required_score DECIMAL(5,2) DEFAULT 50.00;
ALTER TABLE evaluations ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 3. Add status to certificates for pending approval
-- Wait, let's check if cert_status exists
