<?php
require_once __DIR__ . '/../config/database.php';

// Fix for CORS and Content-Type if run from browser
if (function_exists('setCORSHeaders')) {
    setCORSHeaders();
} else {
    header("Content-Type: application/json");
}

try {
    // Get PDO connection from the function
    $pdo = getDBConnection();

    // Determine the current academic year
    $currentYear = date('Y');
    $currentMonth = date('n');

    // If month >= 6 (June), start year is current year. Else start year is previous year.
    $startYear = ($currentMonth >= 6) ? $currentYear : $currentYear - 1;
    $academicYear = $startYear . '-' . ($startYear + 1);

    // Update all enrollments to this year, ignoring duplicates if they already exist for the target year
    $sql = "UPDATE IGNORE student_enrollments SET academic_year = :year";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['year' => $academicYear]);

    echo json_encode([
        'success' => true,
        'message' => "Updated enrollments to $academicYear",
        'updated_count' => $stmt->rowCount()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>