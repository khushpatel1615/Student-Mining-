<?php

/**
 * AI Chat API Endpoint
 * Handles communication with Google Gemini API
 */

// Headers and CORS are handled by database.php -> cors.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
// 1. Authentication & Role Check
$userPayload = requireRole('admin');
// Only admins can access this tool

// 2. Rate Limiting (Simple File-Based)
$rateLimitFile = sys_get_temp_dir() . '/ai_chat_limit_' . md5($userPayload['user_id']);
$limitWindow = 60;
// 60 seconds
$limitCount = 10;
// 10 requests per minute

$currentAccess = [
    'time' => time(),
    'count' => 1
];
if (file_exists($rateLimitFile)) {
    $data = json_decode(file_get_contents($rateLimitFile), true);
    if ($data && ($data['time'] > time() - $limitWindow)) {
        if ($data['count'] >= $limitCount) {
            http_response_code(429);
            echo json_encode(['status' => 'error', 'message' => 'Rate limit exceeded. Please try again later.']);
            exit;
        }
        $currentAccess = [
            'time' => $data['time'], // Keep window start
            'count' => $data['count'] + 1
        ];
    }
}
file_put_contents($rateLimitFile, json_encode($currentAccess));
// 3. Environment Variables
$apiKey = getenv('GEMINI_API_KEY');
if (!$apiKey || trim($apiKey) === '' || $apiKey === 'your_gemini_api_key_here') {
    // Log detailed error on server side
    error_log("CRITICAL: GEMINI_API_KEY not configured or using placeholder value");
    error_log("Please set a valid Gemini API key in backend/.env");

    // Return safe error to client
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "AI service not configured."]);
    exit();
}


// 4. Input Validation & Sanitization
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->message)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Message is required."]);
    exit();
}

// Limit input size (max 2000 chars)
$userMessage = substr(trim(strip_tags($data->message)), 0, 2000);
$history = isset($data->history) && is_array($data->history) ? $data->history : [];
if (empty($userMessage)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Message cannot be empty."]);
    exit();
}

// 5. System Context (Safe & Generic)
$contextData = "System Status: Online";
try {
    $pdo = getDBConnection();
    // Use parametrized queries safe from injection (though we are just counting here)
    $s_count = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1")->fetchColumn();
    $t_count = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = 1")->fetchColumn();
    $sub_count = $pdo->query("SELECT COUNT(*) FROM subjects")->fetchColumn();
    $contextData = "Stats: $s_count Students, $t_count Teachers, $sub_count Subjects.";
} catch (Exception $e) {
    // Fail silently on stats
    error_log("AI Chat DB Stats Error: " . $e->getMessage());
}

$systemPrompt = "You are an intelligent Admin Assistant for the 'Student Data Mining' application. 
Your goal is to help the administrator manage the university dashboard.
$contextData
Please be professional, concise, and helpful. Format your responses in Markdown.";
// 6. Prepare Gemini API Request
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
$contents = [];
// Reconstruct history with role validation
// Gemini 1.5 expects 'user' or 'model' roles
foreach ($history as $msg) {
    if (isset($msg->role) && isset($msg->content)) {
        $role = ($msg->role === 'user' || $msg->role === 'model') ? $msg->role : 'user';
        $contents[] = [
            "role" => $role,
            "parts" => [["text" => substr(strip_tags($msg->content), 0, 1000)]]
        ];
    }
}

// Add System Instruction (Gemini 1.5 supports system_instruction, but for simplicity/compat we can prepend to first user message or handle via prompt)
// For 'generateContent', strictly we pass contents.
// We will prepend the system prompt to the context if history is empty, OR pass it as a separate system_instruction if using that specific API version/field.
// Let's stick to the reliable 'prepend to last user message' or 'system_instruction' field if available.
// NOTE: 1.5-flash supports 'systemInstruction'.

$payload = [
    "systemInstruction" => [
        "parts" => [["text" => $systemPrompt]]
    ],
    "contents" => array_merge($contents, [
        [
            "role" => "user",
            "parts" => [["text" => $userMessage]]
        ]
    ])
];
$options = [
    'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($payload),
        'ignore_errors' => true
    ],
    'ssl' => [
        'verify_peer' => true,      // RE-ENABLED
        'verify_peer_name' => true  // RE-ENABLED
    ]
];
$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
if ($response === false) {
    http_response_code(502);
    echo json_encode(["status" => "error", "message" => "External service unavailable."]);
    exit();
}

$responseData = json_decode($response, true);
// Check if valid response
if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $aiReply = $responseData['candidates'][0]['content']['parts'][0]['text'];
    echo json_encode([
        "status" => "success",
        "reply" => $aiReply
    ]);
} else {
    // Log actual error safely
    $errorDetails = isset($responseData['error']) ? json_encode($responseData['error']) : 'Unknown';
    error_log("Gemini API Error: " . $errorDetails);
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "I'm sorry, I couldn't process that request right now."
    ]);
}
