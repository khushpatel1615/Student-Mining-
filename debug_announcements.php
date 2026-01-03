<?php
require_once __DIR__ . '/backend/config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "\n=== DEBUG ANNOUNCEMENTS ===\n";

try {
    $pdo = getDBConnection();

    // 1. List all subjects
    echo "\n[1. All Subjects]\n";
    $stmt = $pdo->query("SELECT id, name, code, semester FROM subjects ORDER BY name");
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subjects as $s) {
        echo "ID: {$s['id']} | Name: {$s['name']} | Code: {$s['code']} | Sem: {$s['semester']}\n";
    }

    // 2. List all announcements
    echo "\n[2. All Announcements]\n";
    $stmt = $pdo->query("
        SELECT a.id, a.title, a.content, a.subject_id, s.name as subject_name, a.teacher_id, u.full_name as teacher_name
        FROM announcements a
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN users u ON a.teacher_id = u.id
        ORDER BY a.created_at DESC
    ");
    $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($announcements as $a) {
        echo "ID: {$a['id']} | Title: {$a['title']} | SubjID: {$a['subject_id']} ({$a['subject_name']}) | Teacher: {$a['teacher_name']}\n";
    }

    // 3. Check for duplicates or mismatches
    echo "\n[3. Duplicate Check]\n";
    $duplicateSubjects = $pdo->query("
        SELECT name, code, COUNT(*) as count 
        FROM subjects 
        GROUP BY name, code 
        HAVING count > 1
    ")->fetchAll(PDO::FETCH_ASSOC);

    if (count($duplicateSubjects) > 0) {
        echo "WARNING: Duplicate subjects found!\n";
        print_r($duplicateSubjects);
    } else {
        echo "No duplicate subjects found.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
