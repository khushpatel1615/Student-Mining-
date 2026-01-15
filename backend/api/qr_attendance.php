<?php
/**
 * QR Attendance API Enhancement
 * Generates QR codes for attendance sessions
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'GET') {
        handleGet($pdo);
    } elseif ($method === 'POST') {
        handlePost($pdo);
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pdo)
{
    $user = getAuthUser();
    if (!$user || !in_array($user['role'], ['admin', 'teacher'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $action = $_GET['action'] ?? 'list';

    if ($action === 'generate') {
        generateQRSession($pdo, $user);
    } elseif ($action === 'list') {
        listActiveSessions($pdo, $user);
    } elseif ($action === 'validate') {
        validateSession($pdo);
    }
}

function handlePost($pdo)
{
    $user = getAuthUser();
    if (!$user || !in_array($user['role'], ['admin', 'teacher'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? null;

    if ($action === 'end_session') {
        endSession($pdo, $data['session_id'], $user);
    }
}

function generateQRSession($pdo, $user)
{
    $subjectId = $_GET['subject_id'] ?? null;
    $duration = $_GET['duration'] ?? 15; // minutes

    if (!$subjectId) {
        http_response_code(400);
        echo json_encode(['error' => 'Subject ID required']);
        return;
    }

    // Create attendance sessions table if not exists
    createSessionsTable($pdo);

    // Generate unique session code
    $sessionCode = bin2hex(random_bytes(16));
    $expiresAt = date('Y-m-d H:i:s', strtotime("+$duration minutes"));

    $stmt = $pdo->prepare("
        INSERT INTO attendance_sessions (subject_id, session_code, created_by, expires_at, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, NOW())
    ");
    $stmt->execute([$subjectId, $sessionCode, $user['user_id'], $expiresAt]);

    $sessionId = $pdo->lastInsertId();

    // Get subject details
    $stmt = $pdo->prepare("SELECT name, code FROM subjects WHERE id = ?");
    $stmt->execute([$subjectId]);
    $subject = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'session_id' => $sessionId,
            'session_code' => $sessionCode,
            'subject' => $subject,
            'expires_at' => $expiresAt,
            'duration_minutes' => $duration,
            'qr_data' => json_encode([
                'session_code' => $sessionCode,
                'subject_id' => $subjectId,
                'timestamp' => time()
            ])
        ]
    ]);
}

function listActiveSessions($pdo, $user)
{
    createSessionsTable($pdo);

    $stmt = $pdo->prepare("
        SELECT 
            ats.id,
            ats.session_code,
            ats.expires_at,
            ats.created_at,
            s.name as subject_name,
            s.code as subject_code,
            COUNT(DISTINCT sa.student_id) as scanned_count
        FROM attendance_sessions ats
        JOIN subjects s ON ats.subject_id = s.id
        LEFT JOIN student_attendance sa ON sa.session_id = ats.id
        WHERE ats.created_by = ?
        AND ats.is_active = 1
        AND ats.expires_at > NOW()
        GROUP BY ats.id
        ORDER BY ats.created_at DESC
    ");
    $stmt->execute([$user['user_id']]);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $sessions
    ]);
}

function validateSession($pdo)
{
    $sessionCode = $_GET['session_code'] ?? null;

    if (!$sessionCode) {
        http_response_code(400);
        echo json_encode(['error' => 'Session code required']);
        return;
    }

    createSessionsTable($pdo);

    $stmt = $pdo->prepare("
        SELECT 
            ats.*,
            s.name as subject_name,
            s.code as subject_code
        FROM attendance_sessions ats
        JOIN subjects s ON ats.subject_id = s.id
        WHERE ats.session_code = ?
        AND ats.is_active = 1
    ");
    $stmt->execute([$sessionCode]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid session code'
        ]);
        return;
    }

    $now = new DateTime();
    $expires = new DateTime($session['expires_at']);

    if ($now > $expires) {
        echo json_encode([
            'success' => false,
            'error' => 'Session expired'
        ]);
        return;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'session_id' => $session['id'],
            'subject_id' => $session['subject_id'],
            'subject_name' => $session['subject_name'],
            'subject_code' => $session['subject_code'],
            'expires_at' => $session['expires_at'],
            'time_remaining' => $expires->getTimestamp() - $now->getTimestamp()
        ]
    ]);
}

function endSession($pdo, $sessionId, $user)
{
    $stmt = $pdo->prepare("
        UPDATE attendance_sessions 
        SET is_active = 0 
        WHERE id = ? AND created_by = ?
    ");
    $stmt->execute([$sessionId, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Session ended'
    ]);
}

function createSessionsTable($pdo)
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                subject_id INT NOT NULL,
                session_code VARCHAR(255) NOT NULL UNIQUE,
                created_by INT NOT NULL,
                expires_at DATETIME NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session_code (session_code),
                INDEX idx_active (is_active, expires_at)
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}
?>