<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
$DATA_DIR = __DIR__ . '/../data/attendance';
// Require authentication for all attendance routes
$authUser = getAuthUser();
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// Ensure data directory exists
if (!file_exists($DATA_DIR)) {
    mkdir($DATA_DIR, 0777, true);
}
try {
    if ($method === 'GET') {
        $action = $_GET['action'] ?? '';

        switch ($action) {
            case 'fetch_sheet':
                if (!in_array($authUser['role'], ['admin', 'teacher'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }
                handleFetchSheet($pdo, $DATA_DIR);

                break;
            case 'student_view':
                handleStudentView($pdo, $DATA_DIR);

                break;
            default:
                throw new Exception("Invalid action");
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        switch ($action) {
            case 'save_daily':
                if (!in_array($authUser['role'], ['admin', 'teacher'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }
                handleSaveDaily($pdo, $DATA_DIR, $data);

                break;
            default:
                throw new Exception("Invalid action");
        }
    } else {
        throw new Exception("Method not allowed");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function getCsvFilename($dataDir, $subjectId)
{
    // Sanitize
    $subjectId = intval($subjectId);
    return $dataDir . "/attendance_subject_{$subjectId}.csv";
}

function handleFetchSheet($pdo, $dataDir)
{
    // Admin only
    // verifyToken check... omitted for brevity but should be here?
    // User asked for feature implementation, I will assume valid token passed and check strictly if needed.
    // For now, I'll allow it if token is present.

    $subjectId = $_GET['subject_id'] ?? null;
    if (!$subjectId) {
        throw new Exception("Subject ID required");
    }

    // 1. Fetch Students from DB
    $stmt = $pdo->prepare("
        SELECT u.student_id, u.full_name, u.email
        FROM student_enrollments se
        JOIN users u ON se.user_id = u.id
        WHERE se.subject_id = ? AND se.status IN ('active', 'completed')
        ORDER BY u.full_name ASC
    ");
    $stmt->execute([$subjectId]);
    $dbStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Map by student_id for easy lookup
    $studentMap = []; // student_id -> { info, attendance: {} }
    foreach ($dbStudents as $s) {
        // Use student_id string (e.g. "STU001") as key if available, else email?
        // User request: "csv file will have the student name and student ID"
        // Existing system uses `student_id` column in `users` table.
        $sid = $s['student_id'] ?: $s['email']; // Fallback
        $studentMap[$sid] = [
            'info' => $s,
            'attendance' => []
        ];
    }

    // 2. Read CSV if exists
    $file = getCsvFilename($dataDir, $subjectId);
    $dates = [];

    if (file_exists($file)) {
        if (($handle = fopen($file, "r")) !== false) {
            // Read Header: "Student ID", "Name", Date1, Date2...
            $header = fgetcsv($handle);

            if ($header && count($header) > 2) {
                // Extract dates (skip ID and Name)
                $dates = array_slice($header, 2);
            }

            // Read Rows
            while (($row = fgetcsv($handle)) !== false) {
                $sid = $row[0];
                // If student is valid (still in DB), populate their attendance
                // Even if not in DB (dropped?), we might want to keep?
                // For now, only map to active students or add them if we want to see history of dropped?
                // User said "all the students who are studying comes to the list". So DB is source of truth for rows.

                if (isset($studentMap[$sid])) {
                    // Map data to dates
                    foreach ($dates as $index => $date) {
                        // row index = index + 2
                        $val = $row[$index + 2] ?? '-';
                        $studentMap[$sid]['attendance'][$date] = $val;
                    }
                }
            }
            fclose($handle);
        }
    }

    // 3. Format Response
    $rows = [];
    foreach ($studentMap as $sid => $data) {
        $rows[] = [
            'student_id' => $sid,
            'name' => $data['info']['full_name'],
            'attendance' => $data['attendance']
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'dates' => $dates,
            'students' => $rows
        ]
    ]);
}

function handleSaveDaily($pdo, $dataDir, $input)
{
    if (empty($input['subject_id']) || empty($input['date']) || empty($input['records'])) {
        throw new Exception("Missing required fields");
    }

    $subjectId = $input['subject_id'];
    $date = $input['date']; // YYYY-MM-DD
    $newRecords = $input['records']; // Map: student_id -> status ('P', 'A', 'E')

    $file = getCsvFilename($dataDir, $subjectId);

    // Load existing data
    $existingData = []; // student_id -> map of date -> status
    $headers = ['Student ID', 'Student Name'];
    $dates = [];

    if (file_exists($file)) {
        if (($handle = fopen($file, "r")) !== false) {
            $row0 = fgetcsv($handle);
            if ($row0) {
                $headers = array_slice($row0, 0, 2);
                $dates = array_slice($row0, 2);
            }
            while (($row = fgetcsv($handle)) !== false) {
                $sid = $row[0];
                $name = $row[1];
                $existingData[$sid] = [
                    'name' => $name,
                    'statuses' => []
                ];
                foreach ($dates as $i => $d) {
                    $existingData[$sid]['statuses'][$d] = $row[$i + 2] ?? '';
                }
            }
            fclose($handle);
        }
    }

    // Check if date exists, if not add it
    if (!in_array($date, $dates)) {
        $dates[] = $date;
        // Sort dates chronologically?
        usort($dates, function ($a, $b) {
            return strtotime($a) - strtotime($b);
        });
    }

    // Update/Add records from input
    // We also need to fetch ALL valid students from DB to ensure the CSV includes everyone, even if they have no past data
    $stmt = $pdo->prepare("
        SELECT u.student_id, u.full_name, u.email
        FROM student_enrollments se
        JOIN users u ON se.user_id = u.id
        WHERE se.subject_id = ? AND se.status IN ('active', 'completed')
    ");
    $stmt->execute([$subjectId]);
    $dbStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($dbStudents as $s) {
        $sid = $s['student_id'] ?: $s['email'];
        if (!isset($existingData[$sid])) {
            $existingData[$sid] = [
                'name' => $s['full_name'],
                'statuses' => []
            ];
        }

        // Update status for this date
        // If provided in input, use it. Else leave as is or empty?
        // User puts "Present/Absent" for everyone.
        if (isset($newRecords[$sid])) {
            $existingData[$sid]['statuses'][$date] = $newRecords[$sid];
        }
    }

    // Write back to CSV
    if (($fp = fopen($file, 'w')) !== false) {
        // Write Header
        $finalHeader = array_merge(['Student ID', 'Student Name'], $dates);
        fputcsv($fp, $finalHeader);

        // Write Rows
        foreach ($existingData as $sid => $data) {
            $row = [$sid, $data['name']];
            foreach ($dates as $d) {
                $row[] = $data['statuses'][$d] ?? '';
            }
            fputcsv($fp, $row);
        }
        fclose($fp);
    } else {
        throw new Exception("Failed to write to CSV file");
    }

    echo json_encode(['success' => true, 'message' => 'Attendance saved successfully']);
}

function handleStudentView($pdo, $dataDir)
{
    // Basic student view: fetch all their attendance across subjects?
    // Or just for specific subject?
    // Let's do specific subject for now to match component usage
    $token = getTokenFromHeader();
    $result = verifyToken($token);
    if (!$result['valid']) {
        throw new Exception('Unauthorized');
    }
    $user = $result['payload'];

    $subjectId = $_GET['subject_id'] ?? null;
    $studentId = $user['student_id'] ?? null; // We need the student_id that matches CSV key

    // Fetch latest user data to match CSV key logic
    $stmt = $pdo->prepare("SELECT student_id, email FROM users WHERE id = ?");
    $stmt->execute([$user['user_id']]);
    $uData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$uData) {
        throw new Exception("User not found");
    }

    // Logic must MATCH handleSaveDaily: $sid = $s['student_id'] ?: $s['email'];
    $studentIdKey = $uData['student_id'] ?: $uData['email'];

    if (!$subjectId || !$studentIdKey) {
        throw new Exception("Subject and Student ID required");
    }

    $file = getCsvFilename($dataDir, $subjectId);
    $attendanceRecord = [];

    if (file_exists($file)) {
        if (($handle = fopen($file, "r")) !== false) {
            $header = fgetcsv($handle); // dates start at index 2
            $dates = array_slice($header, 2);

            while (($row = fgetcsv($handle)) !== false) {
                // Compare with the key we derived
                if ($row[0] === $studentIdKey) {
                    // Found student
                    foreach ($dates as $i => $date) {
                        $attendanceRecord[] = [
                            'date' => $date,
                            'status' => $row[$i + 2] ?? '-'
                        ];
                    }
                    break;
                }
            }
            fclose($handle);
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $attendanceRecord
    ]);
}
