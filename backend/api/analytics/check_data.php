<?php

/**
 * Analytics Data Check API
 * Returns diagnostic data about student counts and duplicates.
 * Admin-only endpoint.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';

requireRole('admin');

$pdo = getDBConnection();
header('Content-Type: application/json');

try {
    // Count total active students
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users WHERE role = 'student' AND is_active = 1");
    $totalStudents = $stmt->fetch()['cnt'];

    // Count total students including inactive
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users WHERE role = 'student'");
    $totalStudentsAll = $stmt->fetch()['cnt'];

    // Count risk scores
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM student_risk_scores");
    $totalRiskScores = $stmt->fetch()['cnt'];

    // Risk distribution
    $stmt = $pdo->query("SELECT risk_level, COUNT(*) as cnt FROM student_risk_scores GROUP BY risk_level");
    $riskDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for duplicate users by email
    $stmt = $pdo->query("SELECT email, COUNT(*) as cnt FROM users WHERE role = 'student' AND is_active = 1 GROUP BY email HAVING cnt > 1 LIMIT 10");
    $duplicateEmails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for duplicate users by student_id
    $stmt = $pdo->query("SELECT student_id, COUNT(*) as cnt FROM users WHERE role = 'student' AND is_active = 1 AND student_id IS NOT NULL GROUP BY student_id HAVING cnt > 1 LIMIT 10");
    $duplicateStudentIds = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for orphan risk scores (user_id not in users table)
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM student_risk_scores srs LEFT JOIN users u ON srs.user_id = u.id WHERE u.id IS NULL");
    $orphanScores = $stmt->fetch()['cnt'];

    // Check for risk scores pointing to inactive students
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM student_risk_scores srs JOIN users u ON srs.user_id = u.id WHERE u.is_active = 0");
    $inactiveRiskScores = $stmt->fetch()['cnt'];

    echo json_encode([
        'success' => true,
        'data' => [
            'total_active_students' => $totalStudents,
            'total_all_students' => $totalStudentsAll,
            'inactive_students' => $totalStudentsAll - $totalStudents,
            'total_risk_scores' => $totalRiskScores,
            'risk_distribution' => $riskDistribution,
            'duplicate_emails' => $duplicateEmails,
            'duplicate_student_ids' => $duplicateStudentIds,
            'orphan_risk_scores' => $orphanScores,
            'inactive_risk_scores' => $inactiveRiskScores,
            'mismatch' => $totalStudents != $totalRiskScores ? 'YES - Active students (' . $totalStudents . ') differs from risk scores (' . $totalRiskScores . ')' : 'No mismatch'
        ]
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    sendError('Database error occurred', 500);
}
