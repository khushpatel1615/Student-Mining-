<?php
/**
 * Subjects API
 * Handles CRUD operations for subjects with evaluation criteria
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

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
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - List subjects with filters
 */
function handleGet($pdo)
{
    $subjectId = $_GET['id'] ?? null;
    $programId = $_GET['program_id'] ?? null;
    $semester = $_GET['semester'] ?? null;

    if ($subjectId) {
        // Get single subject with evaluation criteria
        $stmt = $pdo->prepare("
            SELECT s.*, p.name as program_name, p.code as program_code
            FROM subjects s
            JOIN programs p ON s.program_id = p.id
            WHERE s.id = ?
        ");
        $stmt->execute([$subjectId]);
        $subject = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$subject) {
            http_response_code(404);
            echo json_encode(['error' => 'Subject not found']);
            return;
        }

        // Get evaluation criteria
        $criteriaStmt = $pdo->prepare("
            SELECT * FROM evaluation_criteria WHERE subject_id = ? ORDER BY weight_percentage DESC
        ");
        $criteriaStmt->execute([$subjectId]);
        $subject['evaluation_criteria'] = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $subject]);
    } else {
        // List subjects with filters
        $sql = "
            SELECT s.*, p.name as program_name, p.code as program_code,
                   (SELECT COUNT(*) FROM evaluation_criteria ec WHERE ec.subject_id = s.id) as criteria_count
            FROM subjects s
            JOIN programs p ON s.program_id = p.id
            WHERE s.is_active = TRUE
        ";
        $params = [];

        if ($programId) {
            $sql .= " AND s.program_id = ?";
            $params[] = $programId;
        }

        if ($semester) {
            $sql .= " AND s.semester = ?";
            $params[] = $semester;
        }

        $sql .= " ORDER BY s.semester ASC, s.subject_type DESC, s.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by semester if requested
        if (isset($_GET['grouped']) && $_GET['grouped'] === 'true') {
            $grouped = [];
            foreach ($subjects as $subject) {
                $sem = $subject['semester'];
                if (!isset($grouped[$sem])) {
                    $grouped[$sem] = [
                        'semester' => $sem,
                        'subjects' => [],
                        'total_credits' => 0
                    ];
                }
                $grouped[$sem]['subjects'][] = $subject;
                $grouped[$sem]['total_credits'] += $subject['credits'];
            }
            echo json_encode(['success' => true, 'data' => array_values($grouped)]);
        } else {
            echo json_encode(['success' => true, 'data' => $subjects]);
        }
    }
}

/**
 * POST - Create new subject with evaluation criteria (Admin only)
 */
function handlePost($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['program_id', 'semester', 'name', 'code'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            return;
        }
    }

    $pdo->beginTransaction();

    try {
        // Create subject
        $stmt = $pdo->prepare("
            INSERT INTO subjects (program_id, semester, name, code, subject_type, credits, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $data['program_id'],
            $data['semester'],
            $data['name'],
            strtoupper($data['code']),
            $data['subject_type'] ?? 'Open',
            $data['credits'] ?? 3,
            $data['description'] ?? null
        ]);

        $subjectId = $pdo->lastInsertId();

        // Create evaluation criteria if provided
        if (!empty($data['evaluation_criteria']) && is_array($data['evaluation_criteria'])) {
            $totalWeight = 0;
            foreach ($data['evaluation_criteria'] as $criteria) {
                $totalWeight += $criteria['weight_percentage'] ?? 0;
            }

            if (abs($totalWeight - 100) > 0.01) {
                throw new Exception("Evaluation criteria weights must sum to 100% (got $totalWeight%)");
            }

            $criteriaStmt = $pdo->prepare("
                INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                VALUES (?, ?, ?, ?, ?)
            ");

            foreach ($data['evaluation_criteria'] as $criteria) {
                $criteriaStmt->execute([
                    $subjectId,
                    $criteria['component_name'],
                    $criteria['weight_percentage'],
                    $criteria['max_marks'] ?? 100,
                    $criteria['description'] ?? null
                ]);
            }
        } else {
            // Create default evaluation criteria
            $defaultCriteria = [
                ['component_name' => 'Mid-Term Exam', 'weight_percentage' => 20, 'max_marks' => 20],
                ['component_name' => 'Final Exam', 'weight_percentage' => 40, 'max_marks' => 40],
                ['component_name' => 'Lab Practicals', 'weight_percentage' => 25, 'max_marks' => 25],
                ['component_name' => 'Assignments', 'weight_percentage' => 15, 'max_marks' => 15]
            ];

            $criteriaStmt = $pdo->prepare("
                INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks)
                VALUES (?, ?, ?, ?)
            ");

            foreach ($defaultCriteria as $criteria) {
                $criteriaStmt->execute([
                    $subjectId,
                    $criteria['component_name'],
                    $criteria['weight_percentage'],
                    $criteria['max_marks']
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Subject created successfully',
            'data' => ['id' => $subjectId]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * PUT - Update subject (Admin only)
 */
function handlePut($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Subject ID is required']);
        return;
    }

    $pdo->beginTransaction();

    try {
        $fields = [];
        $params = [];

        $allowedFields = ['name', 'code', 'semester', 'subject_type', 'credits', 'description', 'is_active'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $field === 'code' ? strtoupper($data[$field]) : $data[$field];
            }
        }

        if (!empty($fields)) {
            $params[] = $data['id'];
            $stmt = $pdo->prepare("UPDATE subjects SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        // Update evaluation criteria if provided
        if (isset($data['evaluation_criteria']) && is_array($data['evaluation_criteria'])) {
            // Delete existing criteria
            $pdo->prepare("DELETE FROM evaluation_criteria WHERE subject_id = ?")->execute([$data['id']]);

            // Insert new criteria
            $criteriaStmt = $pdo->prepare("
                INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                VALUES (?, ?, ?, ?, ?)
            ");

            foreach ($data['evaluation_criteria'] as $criteria) {
                $criteriaStmt->execute([
                    $data['id'],
                    $criteria['component_name'],
                    $criteria['weight_percentage'],
                    $criteria['max_marks'] ?? 100,
                    $criteria['description'] ?? null
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Subject updated successfully']);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * DELETE - Delete subject (Admin only)
 */
function handleDelete($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $subjectId = $_GET['id'] ?? null;

    if (!$subjectId) {
        http_response_code(400);
        echo json_encode(['error' => 'Subject ID is required']);
        return;
    }

    // Soft delete
    $stmt = $pdo->prepare("UPDATE subjects SET is_active = FALSE WHERE id = ?");
    $stmt->execute([$subjectId]);

    echo json_encode(['success' => true, 'message' => 'Subject deleted successfully']);
}

/**
 * Helper: Verify admin token
 */
function verifyAdminToken()
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $result = verifyToken($token);

    if (!$result['valid'] || $result['payload']['role'] !== 'admin') {
        return null;
    }

    return $result['payload'];
}
