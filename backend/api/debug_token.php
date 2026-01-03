<?php
require_once __DIR__ . '/../includes/jwt.php';
// Generate token for Khush Patel (ID 3)
echo generateToken(3, 'khushpatel1615@gmail.com', 'student', 'Khush Patel');
?>