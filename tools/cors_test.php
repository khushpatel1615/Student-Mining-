<?php
/**
 * CORS Test Endpoint
 * Simple endpoint that returns CORS headers and request info
 * Use this with curl/Postman to test CORS implementation
 */

require_once __DIR__ . '/config/database.php';

// Send JSON response
header('Content-Type: application/json');

$response = [
    'success' => true,
    'message' => 'CORS test endpoint',
    'request' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'not-set',
        'timestamp' => date('Y-m-d H:i:s')
    ],
    'cors_headers_sent' => [
        'Access-Control-Allow-Origin' => 'Check response headers',
        'Access-Control-Allow-Credentials' => 'Check response headers',
        'Access-Control-Allow-Methods' => 'Check response headers',
        'Access-Control-Allow-Headers' => 'Check response headers'
    ],
    'instructions' => [
        'Test with curl:',
        '  curl -i -H "Origin: http://localhost:5173" ' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'],
        '',
        'Expected for ALLOWED origin:',
        '  - Access-Control-Allow-Origin: http://localhost:5173',
        '  - Access-Control-Allow-Credentials: true',
        '',
        'Expected for DISALLOWED origin:',
        '  - NO Access-Control-Allow-Origin header',
        '',
        'Expected for OPTIONS (disallowed):',
        '  - HTTP/1.1 403 Forbidden',
        '  - Response: {"success":false,"error":"Origin not allowed"}'
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
