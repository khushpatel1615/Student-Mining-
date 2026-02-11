<?php
// Mock DELETE request
$_SERVER['REQUEST_METHOD'] = 'DELETE';
// Mock php://input
function mockInput($data)
{
    global $mockedInput;
    $mockedInput = $data;
}
// For testing I won't use the real file_get_contents('php://input')
// I'll just check if it works normally.
$data = ['id' => 5];
$encoded = json_encode($data);

// Simulate the logic in discussions.php
$decoded = json_decode($encoded, true);
if (isset($decoded['id'])) {
    echo "ID found: " . $decoded['id'];
} else {
    echo "ID NOT found";
}
