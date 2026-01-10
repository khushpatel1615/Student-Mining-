<?php
require_once __DIR__ . '/../config/database.php';
echo "JWT_SECRET: " . (defined('JWT_SECRET') ? JWT_SECRET : 'NOT DEFINED') . "\n";
echo "JWT_EXPIRY: " . (defined('JWT_EXPIRY') ? JWT_EXPIRY : 'NOT DEFINED') . "\n";
?>