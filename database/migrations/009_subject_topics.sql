-- Subject Topics mapping for dynamic study recommendations
CREATE TABLE IF NOT EXISTS subject_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NULL,
    subject_name VARCHAR(255) NOT NULL,
    topics TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_subject_name (subject_name),
    KEY idx_subject_id (subject_id),
    CONSTRAINT fk_subject_topics_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON DELETE SET NULL
);

-- Optional seed data (safe to re-run due to UNIQUE key on subject_name)
INSERT INTO subject_topics (subject_name, topics) VALUES
('C Programming', 'loops, arrays, functions, pointers'),
('Database Systems', 'select queries, joins, normalization, indexes'),
('Web Development', 'HTML forms, CSS layout, JavaScript events, DOM manipulation')
ON DUPLICATE KEY UPDATE topics = VALUES(topics);
