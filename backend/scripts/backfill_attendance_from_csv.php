<?php

require_once __DIR__ . '/../config/database.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "This script must be run from CLI.\n";
    exit(1);
}

$pdo = getDBConnection();
$dataDir = __DIR__ . '/../data/attendance';

if (!is_dir($dataDir)) {
    echo "Attendance data directory not found: {$dataDir}\n";
    exit(1);
}

$files = glob($dataDir . '/attendance_subject_*.csv');
if (!$files) {
    echo "No attendance CSV files found in {$dataDir}\n";
    exit(0);
}

$userCache = [];       // key => user_id
$enrollCache = [];     // user_id:subject_id => enrollment_id
$totalInserted = 0;
$totalSkipped = 0;

$stmtUser = $pdo->prepare("SELECT id FROM users WHERE student_id = ? OR email = ? LIMIT 1");
$stmtEnroll = $pdo->prepare("SELECT id FROM student_enrollments WHERE user_id = ? AND subject_id = ? LIMIT 1");
$stmtUpsert = $pdo->prepare("
    INSERT INTO student_attendance (enrollment_id, attendance_date, status)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status)
");

foreach ($files as $file) {
    if (!preg_match('/attendance_subject_(\d+)\.csv$/', $file, $m)) {
        continue;
    }
    $subjectId = (int) $m[1];
    echo "Processing subject {$subjectId} from {$file}\n";

    if (($handle = fopen($file, 'r')) === false) {
        echo "  Failed to open file\n";
        continue;
    }

    $header = fgetcsv($handle);
    if (!$header || count($header) < 3) {
        fclose($handle);
        echo "  Invalid header\n";
        continue;
    }

    $dates = array_slice($header, 2);
    $validDateIdx = [];
    foreach ($dates as $i => $date) {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $validDateIdx[$i] = $date;
        } else {
            $validDateIdx[$i] = null;
        }
    }

    $pdo->beginTransaction();
    try {
        while (($row = fgetcsv($handle)) !== false) {
            $sid = $row[0] ?? '';
            if ($sid === '') {
                $totalSkipped++;
                continue;
            }

            if (!isset($userCache[$sid])) {
                $stmtUser->execute([$sid, $sid]);
                $uid = $stmtUser->fetchColumn();
                if (!$uid) {
                    $userCache[$sid] = null;
                } else {
                    $userCache[$sid] = (int) $uid;
                }
            }

            $userId = $userCache[$sid];
            if (!$userId) {
                $totalSkipped++;
                continue;
            }

            $enrollKey = $userId . ':' . $subjectId;
            if (!isset($enrollCache[$enrollKey])) {
                $stmtEnroll->execute([$userId, $subjectId]);
                $enrollId = $stmtEnroll->fetchColumn();
                $enrollCache[$enrollKey] = $enrollId ? (int) $enrollId : null;
            }

            $enrollmentId = $enrollCache[$enrollKey];
            if (!$enrollmentId) {
                $totalSkipped++;
                continue;
            }

            foreach ($validDateIdx as $idx => $date) {
                if (!$date) {
                    continue;
                }
                $statusCode = $row[$idx + 2] ?? '';
                $status = mapAttendanceStatus($statusCode);
                if (!$status) {
                    continue;
                }
                $stmtUpsert->execute([$enrollmentId, $date, $status]);
                $totalInserted++;
            }
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        fclose($handle);
        echo "  Error: " . $e->getMessage() . "\n";
        continue;
    }

    fclose($handle);
}

echo "Done.\n";
echo "Inserted/updated rows: {$totalInserted}\n";
echo "Skipped rows: {$totalSkipped}\n";

function mapAttendanceStatus($status)
{
    $status = is_string($status) ? trim($status) : $status;
    if ($status === 'P' || $status === 'present') return 'present';
    if ($status === 'A' || $status === 'absent') return 'absent';
    if ($status === 'E' || $status === 'excused') return 'excused';
    if ($status === 'L' || $status === 'late') return 'late';
    return null;
}

