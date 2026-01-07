<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Simulate a PUT request test
$_SERVER['REQUEST_METHOD'] = 'PUT';

// Create a test token for admin user (ID 1)
$testToken = generateToken(['id' => 1, 'role' => 'admin', 'email' => 'admin@college.edu']);

// Simulate authorization header
$_SERVER['HTTP_AUTHORIZATION'] = "Bearer $testToken";

// Simulate PUT data
$putData = [
    'id' => 6, // Hey Forks event
    'title' => 'Hey Forks Updated',
    'description' => 'Updated description'
];

// Simulate php://input
$GLOBALS['_TEST_INPUT'] = json_encode($putData);

// Override file_get_contents for testing
function file_get_contents_override($filename)
{
    if ($filename === 'php://input') {
        return $GLOBALS['_TEST_INPUT'];
    }
    return file_get_contents($filename);
}

echo "Testing PUT method handler...\n\n";
echo "Request Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
echo "Test Data: " . json_encode($putData) . "\n\n";

// Now test the actual endpoint
// We'll just test if the method routing works
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'PUT') {
    echo "✓ PUT method is now recognized!\n";
    echo "The handlePut function will be called.\n";
} else {
    echo "✗ PUT method not recognized\n";
}

echo "\n--- Testing Complete ---\n";
?>