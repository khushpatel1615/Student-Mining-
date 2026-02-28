<?php

/**
 * Grade Components API
 * Handles CRUD operations for evaluation criteria (grade components)
 * Maps the evaluation_criteria table to the frontend's expected format
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
                SELECT id, 
                       component_name AS name, 
                       weight_percentage AS weightage, 
                       max_marks, 
                       description AS component_type
                FROM evaluation_criteria
                WHERE subject_id = ?
                ORDER BY component_name
            ");
            $stmt->execute([$subject_id]);
            $components = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(['success' => true, 'data' => $components]);
            break;

        case 'POST':
            // Create grade component (Admin/Teacher)
            if (!in_array($user['role'], ['admin', 'teacher'])) {
                sendError('Unauthorized', 403);
            }

            $data = getJsonInput();
            if (!$data || empty($data['subject_id']) || empty($data['name'])) {
                sendError('Subject ID and component name are required', 400);
            }

            $stmt = $pdo->prepare("
                INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['subject_id'],
                $data['name'],
                $data['weightage'] ?? $data['weight_percentage'] ?? 0,
                $data['max_marks'] ?? 100,
                $data['component_type'] ?? $data['description'] ?? ''
            ]);
            sendResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            // Update grade component (Admin/Teacher)
            if (!in_array($user['role'], ['admin', 'teacher'])) {
                sendError('Unauthorized', 403);
            }

            $data = getJsonInput();
            if (!$data || empty($data['id'])) {
                sendError('Component ID is required', 400);
            }

            $stmt = $pdo->prepare("
                UPDATE evaluation_criteria
                SET component_name = ?, weight_percentage = ?, max_marks = ?, description = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['weightage'] ?? $data['weight_percentage'] ?? 0,
                $data['max_marks'],
                $data['component_type'] ?? $data['description'] ?? '',
                $data['id']
            ]);
            sendResponse(['success' => true]);
            break;

        case 'DELETE':
            // Delete grade component (Admin/Teacher)
            if (!in_array($user['role'], ['admin', 'teacher'])) {
                sendError('Unauthorized', 403);
            }

            $data = getJsonInput();
            $id = $data['id'] ?? $_GET['id'] ?? null;
            if (!$id) {
                sendError('Component ID required', 400);
            }

            $stmt = $pdo->prepare("DELETE FROM evaluation_criteria WHERE id = ?");
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
