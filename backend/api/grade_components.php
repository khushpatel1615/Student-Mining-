<?php

/**
 * Grade Components API
 * Handles CRUD operations for grade/evaluation components
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Authenticate
$user = requireAuth();
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get grade components for a subject
            $subject_id = $_GET['subject_id'] ?? null;
            if (!$subject_id) {
                sendError('Subject ID required', 400);
            }

            $stmt = $pdo->prepare("
                SELECT id, name, weightage, max_marks, component_type
                FROM grade_components
                WHERE subject_id = ?
                ORDER BY component_type, name
            ");
            $stmt->execute([$subject_id]);
            $components = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(['success' => true, 'data' => $components]);
            break;

        case 'POST':
            // Create grade component (Admin only)
            if ($user['role'] !== 'admin') {
                sendError('Unauthorized', 403);
            }

            $data = getJsonInput();
            if (!$data || empty($data['subject_id']) || empty($data['name'])) {
                sendError('Subject ID and component name are required', 400);
            }

            $stmt = $pdo->prepare("
                INSERT INTO grade_components (subject_id, name, weightage, max_marks, component_type)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['subject_id'],
                $data['name'],
                $data['weightage'] ?? 0,
                $data['max_marks'] ?? 100,
                $data['component_type'] ?? 'assessment'
            ]);
            sendResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            // Update grade component (Admin only)
            if ($user['role'] !== 'admin') {
                sendError('Unauthorized', 403);
            }

            $data = getJsonInput();
            if (!$data || empty($data['id'])) {
                sendError('Component ID is required', 400);
            }

            $stmt = $pdo->prepare("
                UPDATE grade_components
                SET name = ?, weightage = ?, max_marks = ?, component_type = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['weightage'],
                $data['max_marks'],
                $data['component_type'],
                $data['id']
            ]);
            sendResponse(['success' => true]);
            break;

        case 'DELETE':
            // Delete grade component (Admin only)
            if ($user['role'] !== 'admin') {
                sendError('Unauthorized', 403);
            }

            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendError('Component ID required', 400);
            }

            $stmt = $pdo->prepare("DELETE FROM grade_components WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);
            break;

        case 'OPTIONS':
            exit(0);

        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    Logger::error('Grade components error', ['message' => $e->getMessage()]);
    sendError('Database error occurred', 500);
}
