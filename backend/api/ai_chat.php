<?php
/**
 * AI Chat API Endpoint
 * Handles communication with Google Gemini API
 */

// Headers
// Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle OPTIONS request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

// Load .env helper function
function loadEnv($path)
{
    if (!file_exists($path)) {
        return false;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Load environment variables
loadEnv(__DIR__ . '/../.env');

$apiKey = getenv('GEMINI_API_KEY');
// Make sure Gemini API Key is loaded
if (!$apiKey && isset($_ENV['GEMINI_API_KEY'])) {
    $apiKey = $_ENV['GEMINI_API_KEY'];
}

if (!$apiKey) {
    // Attempt to load from alternative location or hardcoded for dev (not recommended but useful for debug ifenv fails)
    // $apiKey = "YOUR_KEY";
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "API key not configured."]);
    exit();
}

// Get POST data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->message)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Message is required."]);
    exit();
}

$userMessage = $data->message;
$history = isset($data->history) ? $data->history : [];

// ---------------------------------------------------------
// Gather System Context from Database
// ---------------------------------------------------------
// ---------------------------------------------------------
// Gather System Context from Database
// ---------------------------------------------------------
$contextData = "";

try {
    $pdo = getDBConnection();
    // Count Students
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1");
    $studentCount = $stmt->fetchColumn();

    // Count Teachers
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = 1");
    $teacherCount = $stmt->fetchColumn();

    // Count Courses/Subjects (assuming table is 'subjects')
    $stmt = $pdo->query("SELECT COUNT(*) FROM subjects");
    $subjectCount = $stmt->fetchColumn();

    // Programs
    $stmt = $pdo->query("SELECT COUNT(*) FROM programs");
    $programCount = $stmt->fetchColumn();

    // Recent Enrollments (Last 7 days) if table exists
    // We'll just stick to totals to avoid errors if tables vary

    $contextData = "
    Current System Stats:
    - Active Students: $studentCount
    - Active Teachers: $teacherCount
    - Total Subjects: $subjectCount
    - Total Programs: $programCount
    ";

} catch (Exception $e) {
    // If DB fails, just proceed without stats
    $contextData = "System stats unavailable: " . $e->getMessage();
}

// ---------------------------------------------------------
// Build System Prompt
// ---------------------------------------------------------
$systemPrompt = "You are an intelligent Admin Assistant for the 'Student Data Mining' application. 
Your goal is to help the administrator manage the university dashboard.

$contextData

Your Capabilities:
1. Explain how to manage students, teachers, and subjects.
2. Provide insights based on the stats above.
3. If the user asks to perform an action (like 'add student'), explain the steps or provide a JSON action block (future feature).
4. Be professional, concise, and helpful. Format your responses in Markdown.
";

// ---------------------------------------------------------
// Prepare Gemini API Request
// ---------------------------------------------------------

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" . $apiKey;

$contents = [];

// History
foreach ($history as $msg) {
    $contents[] = [
        "role" => $msg->role === 'user' ? 'user' : 'model',
        "parts" => [
            ["text" => $msg->content]
        ]
    ];
}

// Current Message with System Context
// We prepend the system prompt only to the relevant turn if history is empty, 
// OR we can rely on the model to "remember" if we put it in the first message of history.
// Simplified approach: Prepend to the LATEST message if history is short, 
// or if history exists, we trust the context was established (not ideal for stateless rest calls unless history is passed back fully).
// Better approach for single-turn logic here: Prepend system prompt to the User's LATEST message to ensure it's always in context.
// (Gemini API 1.5 allows System Instructions properly, but for simple 'generateContent' we often mix it into the prompt).

$finalUserMessage = $systemPrompt . "\n\nUser Question: " . $userMessage;

// If history is empty, use the combined message. 
// If history exists, we might need to inject system prompt differently. 
// Let's just create a new structure where the first message is the system prompt (simulated as user or model?).
// Safest for 'generateContent' without dedicated 'system' role in 1.0/1.5 beta sometimes:
// Just put it in the last user message.

$contents[] = [
    "role" => "user",
    "parts" => [
        ["text" => $finalUserMessage]
    ]
];

// Note: If reusing history, we should be careful not to duplicate prompts. 
// Ideally, the frontend sends history that DOES NOT include the hidden system prompt, 
// and we only prepend it here for the current inference.
// The code above appends the NEW message with the prompt. 
// This is fine for now.

$payload = [
    "contents" => $contents
];

$options = [
    'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($payload),
        'ignore_errors' => true // Fetch content even on 4xx/5xx
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === FALSE) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Request to Gemini API failed."]);
    exit();
}

// Check for HTTP error codes in $http_response_header (magic variable populated by file_get_contents)
$statusLine = $http_response_header[0];
preg_match('{HTTP\/\S*\s(\d{3})}', $statusLine, $match);
$httpCode = $match[1];

$responseData = json_decode($response, true);

if ($httpCode != 200) {
    http_response_code(500);
    $details = isset($responseData['error']['message']) ? $responseData['error']['message'] : $response;
    echo json_encode([
        "status" => "error",
        "message" => "API Error ($httpCode)",
        "details" => $details
    ]);
    exit();
}

// Extract the text response
$aiReply = "";
if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $aiReply = $responseData['candidates'][0]['content']['parts'][0]['text'];
} else {
    $aiReply = "I'm sorry, I encountered an issue interpreting the response.";
}

echo json_encode([
    "status" => "success",
    "reply" => $aiReply
]);

