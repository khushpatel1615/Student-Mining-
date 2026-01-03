<?php
require_once __DIR__ . '/backend/includes/jwt.php';

// 1. Generate Token for existing teacher
$teacherId = 8; // From previous successful test
$email = 'api_test_teacher@example.com';
$role = 'teacher';
$fullName = 'API Test Teacher';
$token = generateToken($teacherId, $email, $role, $fullName);

// 2. Prepare payload
$subjectId = 1; // From previous successful test
$data = [
    'subject_id' => $subjectId,
    'title' => 'API Created Announcement',
    'content' => 'This announcement was created via API simulation.',
    'is_pinned' => true
];

// 3. Setup Request
$url = 'http://localhost/StudentDataMining/backend/api/announcements.php';
$ch = curl_init($url);
$payload = json_encode($data);
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
];

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_VERBOSE, true);

echo "\nSending POST request to $url\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo 'Curl Error: ' . curl_error($ch) . "\n";
}

curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response Body:\n----------------\n";
echo $response . "\n----------------\n";
