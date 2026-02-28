<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');
print_r($pdo->query('SHOW CREATE TABLE academic_calendar')->fetch());
print_r($pdo->query('SHOW CREATE TABLE activity_logs')->fetch());
