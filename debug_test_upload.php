<?php
require_once __DIR__ . '/backend/includes/jwt.php';

// 1. Generate Token
$teacherId = 8;
$email = 'api_test_teacher@example.com';
$role = 'teacher';
$fullName = 'API Test Teacher';
$token = generateToken($teacherId, $email, $role, $fullName);

// 2. Create a dummy PDF file
$dummyPdf = 'dummy.pdf';
file_put_contents($dummyPdf, '%PDF-1.4 dummy content');

// 3. Prepare Payload
$subjectId = 1;
$data = [
    'subject_id' => $subjectId,
    'title' => 'Upload Test Announcement',
    'content' => 'Testing file upload from script',
    'is_pinned' => '0',
    'attachment' => new CURLFile(realpath($dummyPdf), 'application/pdf', 'dummy.pdf')
];

// 4. Send Request
$url = 'http://localhost/StudentDataMining/backend/api/announcements.php';
$ch = curl_init($url);

$headers = [
    'Authorization: Bearer ' . $token
    // Content-Type should NOT be set manually for multipart/form-data
];

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_VERBOSE, true);

echo "Sending Upload Request...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo 'Curl Error: ' . curl_error($ch) . "\n";
}
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

// Cleanup
unlink($dummyPdf);
