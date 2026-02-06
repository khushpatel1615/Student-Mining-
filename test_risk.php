<?php
// Mock GET params
$_GET['risk_level'] = 'risky';
$_GET['limit'] = 5;

// Mock dependencies/environment if needed, or just include the actual file if it can run standalone-ish
// Since at_risk_students.php includes jwt.php and database.php using __DIR__, it should work if we place this test script in the same directory or adjust paths.
// Let's place it in e:\XAMP\htdocs\StudentDataMining to be safe and use absolute paths in the includes of the target file?
// Actually, let's just use curl if the server is running. The user stats says "npm run dev" is running. PHP is usually served by Apache (Port 80).
// I'll try curl first.
?>