<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');
echo "Students: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student'")->fetchColumn() . "\n";
echo "Active Students: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1")->fetchColumn() . "\n";
echo "Teachers: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher'")->fetchColumn() . "\n";
echo "Admins: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() . "\n";
echo "Total Enrollments: " . $pdo->query("SELECT COUNT(*) FROM student_enrollments")->fetchColumn() . "\n";
echo "Total Subjects: " . $pdo->query("SELECT COUNT(*) FROM subjects")->fetchColumn() . "\n";
echo "Total Programs: " . $pdo->query("SELECT COUNT(*) FROM programs")->fetchColumn() . "\n";
