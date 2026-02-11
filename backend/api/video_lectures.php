<?php

/**
 * Video Lectures API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        case 'OPTIONS':
            exit(0); // Handled by CORS
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('An error occurred', 500, $e->getMessage());
}

function handleGet($pdo)
{
    $subjectId = filter_input(INPUT_GET, 'subject_id', FILTER_SANITIZE_NUMBER_INT);
    $action = filter_input(INPUT_GET, 'action');

    // Public or Student Access - but let's require at least auth for progress
    // Wait, requirement says "ensure protected endpoints use shared middleware".
    // Assuming video lectures are for logged in users.
    $user = requireAuth();

    if ($action === 'list' && $subjectId) {
        $stmt = $pdo->prepare("SELECT * FROM video_lectures WHERE subject_id = ? ORDER BY sequence_order, created_at");
        $stmt->execute([$subjectId]);
        sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } elseif ($action === 'progress') {
        $stmt = $pdo->prepare("SELECT vp.*, vl.title FROM video_progress vp 
            JOIN video_lectures vl ON vp.video_id = vl.id WHERE vp.user_id = ?");
        $stmt->execute([$user['user_id']]);
        sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } elseif ($action === 'featured') {
        $stmt = $pdo->query("SELECT vl.*, s.name as subject_name FROM video_lectures vl 
            JOIN subjects s ON vl.subject_id = s.id WHERE vl.is_featured = 1 ORDER BY vl.created_at DESC LIMIT 10");
        sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } else {
        // Default or invalid action
        sendError('Invalid action or missing subject_id');
    }
}

function handlePost($pdo)
{
    // Only Admin/Teacher can create video lectures
    // But students can update progress?

    $data = getJsonInput();
    if (!$data)
        sendError('Invalid JSON');

    $action = $data['action'] ?? 'create';

    if ($action === 'create') {
        requireRole(['admin', 'teacher']);

        $stmt = $pdo->prepare("INSERT INTO video_lectures (subject_id, title, description, video_url, 
            video_type, duration_minutes, sequence_order, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['subject_id'],
            $data['title'],
            $data['description'] ?? '',
            $data['video_url'],
            $data['video_type'] ?? 'youtube',
            $data['duration_minutes'] ?? 0,
            $data['sequence_order'] ?? 0,
            $data['thumbnail_url'] ?? ''
        ]);
        sendResponse(['success' => true, 'message' => 'Video added', 'id' => $pdo->lastInsertId()]);

    } elseif ($action === 'update_progress') {
        $user = requireAuth(); // Students/Teachers/Admins all track progress

        $stmt = $pdo->prepare("INSERT INTO video_progress (video_id, user_id, watched_seconds, completed) 
            VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE watched_seconds = ?, completed = ?, updated_at = NOW()");

        $completed = $data['completed'] ?? 0;
        $watchedSeconds = $data['watched_seconds'] ?? 0;

        $stmt->execute([
            $data['video_id'],
            $user['user_id'],
            $watchedSeconds,
            $completed,
            $watchedSeconds,
            $completed
        ]);
        sendResponse(['success' => true]);
    } else {
        sendError('Invalid action');
    }
}

function handlePut($pdo)
{
    requireRole(['admin', 'teacher']);

    $data = getJsonInput();
    $stmt = $pdo->prepare("UPDATE video_lectures SET title=?, description=?, video_url=?, duration_minutes=?, sequence_order=? WHERE id=?");
    $stmt->execute([
        $data['title'],
        $data['description'],
        $data['video_url'],
        $data['duration_minutes'],
        $data['sequence_order'],
        $data['id']
    ]);
    sendResponse(['success' => true]);
}

function handleDelete($pdo)
{
    requireRole(['admin', 'teacher']);

    $data = getJsonInput();
    $stmt = $pdo->prepare("DELETE FROM video_lectures WHERE id = ?");
    $stmt->execute([$data['id']]);
    sendResponse(['success' => true]);
}
