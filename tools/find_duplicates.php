<?php
/**
 * Database Duplicate Finder
 * Scans all tables in the student_data_mining database for duplicate data
 * Run: php tools/find_duplicates.php
 */

// Direct DB connection (no CORS/API stuff needed)
$host = 'localhost';
$dbname = 'student_data_mining';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    die("DB Connection Failed: " . $e->getMessage() . "\n");
}

echo "=== Student Data Mining - Duplicate Data Scanner ===\n";
echo "Database: $dbname\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n";
echo str_repeat('=', 60) . "\n\n";

// Get all tables
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "Found " . count($tables) . " tables\n\n";

$totalDuplicates = 0;
$duplicateDetails = [];

// Define meaningful column groups for each table to check for duplicates
// (columns that should be unique in combination, beyond the existing UNIQUE constraints)
$checkGroups = [
    'users' => [
        ['email'],
        ['student_id'],
        ['google_id'],
        ['full_name', 'email'],
        ['full_name', 'role', 'student_id'],
    ],
    'programs' => [
        ['code'],
        ['name'],
    ],
    'subjects' => [
        ['code', 'program_id', 'semester'],
        ['name', 'program_id', 'semester'],
    ],
    'evaluation_criteria' => [
        ['subject_id', 'component_name'],
    ],
    'student_enrollments' => [
        ['user_id', 'subject_id', 'academic_year'],
        ['user_id', 'subject_id'],  // check without academic_year too
    ],
    'student_grades' => [
        ['enrollment_id', 'criteria_id'],
    ],
    'student_attendance' => [
        ['enrollment_id', 'attendance_date'],
    ],
    'attendance' => [
        ['student_id', 'subject_id', 'attendance_date', 'session_type'],
        ['student_id', 'subject_id', 'attendance_date'],  // without session_type
    ],
    'assignments' => [
        ['subject_id', 'title'],
        ['subject_id', 'title', 'due_date'],
    ],
    'assignment_submissions' => [
        ['assignment_id', 'student_id'],
    ],
    'exams' => [
        ['subject_id', 'title'],
        ['subject_id', 'title', 'start_datetime'],
    ],
    'exam_results' => [
        ['exam_id', 'student_id'],
    ],
    'teacher_subjects' => [
        ['teacher_id', 'subject_id'],
    ],
    'announcements' => [
        ['subject_id', 'teacher_id', 'title'],
    ],
    'notifications' => [
        ['user_id', 'title', 'message'],
        ['user_id', 'type', 'title', 'created_at'],
    ],
    'academic_calendar' => [
        ['title', 'event_date'],
        ['title', 'event_date', 'type'],
    ],
    'course_reviews' => [
        ['subject_id', 'user_id'],
    ],
    'video_lectures' => [
        ['subject_id', 'title'],
        ['subject_id', 'video_url'],
    ],
    'video_progress' => [
        ['video_id', 'user_id'],
    ],
    'email_preferences' => [
        ['user_id'],
    ],
    'email_queue' => [
        ['user_id', 'email_type', 'subject', 'created_at'],
    ],
    'activity_logs' => [
        ['user_id', 'action', 'details', 'created_at'],
    ],
    'student_risk_scores' => [
        ['user_id'],
    ],
    'student_analytics' => [
        ['student_id', 'semester'],
    ],
    'program_analytics' => [
        ['program_id', 'semester'],
    ],
    'subject_analytics' => [
        ['subject_id', 'semester'],
    ],
    'predictions' => [
        ['student_id', 'prediction_type', 'subject_id', 'semester'],
    ],
    'recommendations' => [
        ['student_id', 'recommendation_type', 'title'],
    ],
    'grade_history' => [
        ['grade_id', 'changed_at'],
    ],
    'calendar_events' => [
        ['title', 'start_date', 'end_date'],
    ],
    'discussions' => [
        ['subject_id', 'user_id', 'title', 'content'],
    ],
    'user_sessions' => [
        ['token_hash'],
    ],
];

foreach ($tables as $table) {
    // Skip views
    $type = $pdo->query("SELECT TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = '$table'")->fetchColumn();
    if ($type === 'VIEW') {
        continue;
    }

    // Get row count
    $count = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();

    echo "--- Table: $table ($count rows) ---\n";

    if ($count == 0) {
        echo "  [EMPTY] No data to check.\n\n";
        continue;
    }

    // Get actual columns for this table
    $cols = $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll();
    $colNames = array_column($cols, 'Field');

    // Check existing UNIQUE constraints
    $indexes = $pdo->query("SHOW INDEX FROM `$table` WHERE Non_unique = 0")->fetchAll();
    $uniqueKeys = [];
    foreach ($indexes as $idx) {
        $uniqueKeys[$idx['Key_name']][] = $idx['Column_name'];
    }

    // Method 1: Check all non-PK columns for exact row duplicates
    $contentCols = array_filter($colNames, function ($c) {
        return !in_array($c, ['id']);
    });

    if (count($contentCols) > 0) {
        $colList = implode(', ', array_map(function ($c) {
            return "`$c`";
        }, $contentCols));
        $sql = "SELECT $colList, COUNT(*) as dup_count FROM `$table` GROUP BY $colList HAVING COUNT(*) > 1";

        try {
            $dupes = $pdo->query($sql)->fetchAll();
            if (count($dupes) > 0) {
                echo "  [EXACT DUPLICATES] Found " . count($dupes) . " groups of exact duplicate rows:\n";
                foreach ($dupes as $d) {
                    $dupCount = $d['dup_count'];
                    unset($d['dup_count']);
                    $totalDuplicates += ($dupCount - 1);
                    // Show first few columns
                    $preview = array_slice($d, 0, 4);
                    $previewStr = implode(', ', array_map(function ($k, $v) {
                        $val = is_null($v) ? 'NULL' : (strlen($v) > 40 ? substr($v, 0, 40) . '...' : $v);
                        return "$k=$val";
                    }, array_keys($preview), array_values($preview)));
                    echo "    $dupCount copies: $previewStr\n";
                    $duplicateDetails[] = [
                        'table' => $table,
                        'type' => 'exact',
                        'count' => $dupCount,
                        'data' => $d,
                    ];
                }
            }
        } catch (PDOException $e) {
            // Some columns may not be groupable (TEXT, BLOB), try without them
            $groupableCols = array_filter($contentCols, function ($c) use ($cols) {
                foreach ($cols as $col) {
                    if ($col['Field'] === $c) {
                        $t = strtoupper($col['Type']);
                        return strpos($t, 'TEXT') === false && strpos($t, 'BLOB') === false && strpos($t, 'JSON') === false;
                    }
                }
                return true;
            });
            if (count($groupableCols) > 0) {
                $colList = implode(', ', array_map(function ($c) {
                    return "`$c`";
                }, $groupableCols));
                $sql = "SELECT $colList, COUNT(*) as dup_count FROM `$table` GROUP BY $colList HAVING COUNT(*) > 1";
                try {
                    $dupes = $pdo->query($sql)->fetchAll();
                    if (count($dupes) > 0) {
                        echo "  [NEAR-EXACT DUPLICATES] Found " . count($dupes) . " groups (excluding TEXT/JSON cols):\n";
                        foreach ($dupes as $d) {
                            $dupCount = $d['dup_count'];
                            unset($d['dup_count']);
                            $totalDuplicates += ($dupCount - 1);
                            $preview = array_slice($d, 0, 4);
                            $previewStr = implode(', ', array_map(function ($k, $v) {
                                $val = is_null($v) ? 'NULL' : (strlen($v) > 40 ? substr($v, 0, 40) . '...' : $v);
                                return "$k=$val";
                            }, array_keys($preview), array_values($preview)));
                            echo "    $dupCount copies: $previewStr\n";
                            $duplicateDetails[] = [
                                'table' => $table,
                                'type' => 'near-exact',
                                'count' => $dupCount,
                                'data' => $d,
                            ];
                        }
                    }
                } catch (PDOException $e2) {
                    echo "  [SKIP] Cannot check: " . $e2->getMessage() . "\n";
                }
            }
        }
    }

    // Method 2: Check defined column groups
    if (isset($checkGroups[$table])) {
        foreach ($checkGroups[$table] as $group) {
            // Make sure all columns exist in the table
            $validCols = array_intersect($group, $colNames);
            if (count($validCols) !== count($group))
                continue;

            $colList = implode(', ', array_map(function ($c) {
                return "`$c`";
            }, $group));
            $groupLabel = implode('+', $group);

            $sql = "SELECT $colList, COUNT(*) as dup_count FROM `$table` WHERE 1=1";
            // Skip NULL values for meaningful comparison
            foreach ($group as $col) {
                $sql .= " AND `$col` IS NOT NULL";
            }
            $sql .= " GROUP BY $colList HAVING COUNT(*) > 1";

            try {
                $dupes = $pdo->query($sql)->fetchAll();
                if (count($dupes) > 0) {
                    echo "  [DUPLICATES on $groupLabel] Found " . count($dupes) . " groups:\n";
                    foreach ($dupes as $d) {
                        $dupCount = $d['dup_count'];
                        unset($d['dup_count']);
                        $totalDuplicates += ($dupCount - 1);
                        $previewStr = implode(', ', array_map(function ($k, $v) {
                            $val = is_null($v) ? 'NULL' : (strlen($v) > 40 ? substr($v, 0, 40) . '...' : $v);
                            return "$k=$val";
                        }, array_keys($d), array_values($d)));
                        echo "    $dupCount copies: $previewStr\n";
                        $duplicateDetails[] = [
                            'table' => $table,
                            'type' => 'column-group',
                            'group' => $groupLabel,
                            'count' => $dupCount,
                            'data' => $d,
                        ];
                    }
                }
            } catch (PDOException $e) {
                // Skip if query fails (e.g., TEXT column grouping)
            }
        }
    }

    echo "\n";
}

echo str_repeat('=', 60) . "\n";
echo "SUMMARY:\n";
echo "Total duplicate rows found: $totalDuplicates\n";
echo "Tables with duplicates: " . count(array_unique(array_column($duplicateDetails, 'table'))) . "\n";

if ($totalDuplicates > 0) {
    echo "\nDuplicate breakdown by table:\n";
    $byTable = [];
    foreach ($duplicateDetails as $d) {
        $key = $d['table'];
        if (!isset($byTable[$key]))
            $byTable[$key] = 0;
        $byTable[$key] += ($d['count'] - 1);
    }
    foreach ($byTable as $table => $count) {
        echo "  $table: $count duplicate rows to remove\n";
    }
}

echo "\nDone.\n";
