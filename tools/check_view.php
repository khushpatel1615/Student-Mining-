<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');
print_r($pdo->query('SHOW CREATE VIEW vw_student_performance')->fetch());
