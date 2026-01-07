<?php
/**
 * Analytics Calculation Functions
 * Core utilities for student performance analytics
 */

/**
 * Calculate GPA from grades
 * @param array $grades Array of grade objects with 'grade' field
 * @param bool $weighted Whether to use credit-weighted average
 * @return float GPA on 4.0 scale
 */
function calculateGPA($grades, $weighted = false)
{
    if (empty($grades))
        return 0.0;

    $totalPoints = 0;
    $totalCredits = 0;

    foreach ($grades as $grade) {
        $gradeValue = floatval($grade['grade'] ?? 0);
        $credits = floatval($grade['credits'] ?? 3); // Default 3 credits if not specified

        // Convert percentage to 4.0 scale
        $gpaPoints = percentageToGPA($gradeValue);

        if ($weighted) {
            $totalPoints += $gpaPoints * $credits;
            $totalCredits += $credits;
        } else {
            $totalPoints += $gpaPoints;
            $totalCredits += 1;
        }
    }

    return $totalCredits > 0 ? round($totalPoints / $totalCredits, 2) : 0.0;
}

/**
 * Convert percentage grade to 4.0 GPA scale
 */
function percentageToGPA($percentage)
{
    if ($percentage >= 90)
        return 4.0;
    if ($percentage >= 85)
        return 3.7;
    if ($percentage >= 80)
        return 3.3;
    if ($percentage >= 77)
        return 3.0;
    if ($percentage >= 73)
        return 2.7;
    if ($percentage >= 70)
        return 2.3;
    if ($percentage >= 67)
        return 2.0;
    if ($percentage >= 63)
        return 1.7;
    if ($percentage >= 60)
        return 1.3;
    if ($percentage >= 50)
        return 1.0;
    return 0.0;
}

/**
 * Get letter grade from percentage
 */
function getLetterGrade($percentage)
{
    if ($percentage >= 90)
        return 'A+';
    if ($percentage >= 85)
        return 'A';
    if ($percentage >= 80)
        return 'A-';
    if ($percentage >= 77)
        return 'B+';
    if ($percentage >= 73)
        return 'B';
    if ($percentage >= 70)
        return 'B-';
    if ($percentage >= 67)
        return 'C+';
    if ($percentage >= 63)
        return 'C';
    if ($percentage >= 60)
        return 'C-';
    if ($percentage >= 50)
        return 'D';
    return 'F';
}

/**
 * Determine performance tier based on GPA
 */
function getPerformanceTier($gpa)
{
    if ($gpa >= 3.7)
        return 'excellent';
    if ($gpa >= 3.0)
        return 'good';
    if ($gpa >= 2.5)
        return 'average';
    if ($gpa >= 2.0)
        return 'below_average';
    return 'at_risk';
}

/**
 * Calculate percentile rank for a student
 * @param float $studentGPA Student's GPA
 * @param array $allGPAs Array of all GPAs in the cohort
 * @return float Percentile (0-100)
 */
function calculatePercentile($studentGPA, $allGPAs)
{
    if (empty($allGPAs))
        return 0;

    $count = count($allGPAs);
    $belowCount = 0;

    foreach ($allGPAs as $gpa) {
        if ($gpa < $studentGPA) {
            $belowCount++;
        }
    }

    return round(($belowCount / $count) * 100, 2);
}

/**
 * Calculate predicted final grade based on current performance
 * @param array $grades Historical grades
 * @param float $currentGrade Current grade
 * @return array Prediction with confidence
 */
function predictFinalGrade($grades, $currentGrade)
{
    if (empty($grades)) {
        return [
            'predicted_grade' => $currentGrade,
            'confidence' => 50,
            'method' => 'current_only'
        ];
    }

    // Simple linear trend analysis
    $gradeValues = array_map(function ($g) {
        return floatval($g['grade'] ?? 0);
    }, $grades);

    // Calculate trend
    $n = count($gradeValues);
    $sumX = ($n * ($n + 1)) / 2;
    $sumY = array_sum($gradeValues);
    $sumXY = 0;
    $sumXX = 0;

    for ($i = 0; $i < $n; $i++) {
        $x = $i + 1;
        $y = $gradeValues[$i];
        $sumXY += $x * $y;
        $sumXX += $x * $x;
    }

    // Linear regression slope
    $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumXX - $sumX * $sumX);
    $intercept = ($sumY - $slope * $sumX) / $n;

    // Project to next period
    $nextX = $n + 1;
    $predictedGrade = $slope * $nextX + $intercept;

    // Ensure in valid range
    $predictedGrade = max(0, min(100, $predictedGrade));

    // Calculate confidence based on consistency
    $variance = 0;
    $mean = $sumY / $n;
    foreach ($gradeValues as $grade) {
        $variance += pow($grade - $mean, 2);
    }
    $variance /= $n;
    $stdDev = sqrt($variance);

    // Lower variance = higher confidence
    $confidence = max(50, min(95, 100 - ($stdDev * 2)));

    return [
        'predicted_grade' => round($predictedGrade, 2),
        'confidence' => round($confidence, 0),
        'trend' => $slope > 0 ? 'improving' : ($slope < 0 ? 'declining' : 'stable'),
        'method' => 'linear_trend'
    ];
}

/**
 * Calculate what grade is needed to achieve target
 * @param float $currentGPA Current GPA
 * @param float $targetGPA Target GPA
 * @param int $creditsCompleted Credits completed
 * @param int $creditsRemaining Credits remaining
 * @return array Required performance
 */
function calculateRequiredGrade($currentGPA, $targetGPA, $creditsCompleted, $creditsRemaining)
{
    $currentPoints = $currentGPA * $creditsCompleted;
    $targetPoints = $targetGPA * ($creditsCompleted + $creditsRemaining);
    $requiredPoints = $targetPoints - $currentPoints;
    $requiredGPA = $creditsRemaining > 0 ? $requiredPoints / $creditsRemaining : 0;

    // Convert GPA back to percentage (approximate)
    $requiredPercentage = gpaToPercentage($requiredGPA);

    return [
        'required_gpa' => round($requiredGPA, 2),
        'required_percentage' => round($requiredPercentage, 1),
        'achievable' => $requiredGPA <= 4.0,
        'difficulty' => $requiredGPA >= 3.7 ? 'very_hard' : ($requiredGPA >= 3.0 ? 'hard' : 'moderate')
    ];
}

/**
 * Approximate GPA to percentage conversion
 */
function gpaToPercentage($gpa)
{
    if ($gpa >= 4.0)
        return 95;
    if ($gpa >= 3.7)
        return 88;
    if ($gpa >= 3.3)
        return 83;
    if ($gpa >= 3.0)
        return 78;
    if ($gpa >= 2.7)
        return 75;
    if ($gpa >= 2.3)
        return 71;
    if ($gpa >= 2.0)
        return 68;
    if ($gpa >= 1.7)
        return 64;
    if ($gpa >= 1.3)
        return 61;
    if ($gpa >= 1.0)
        return 55;
    return 45;
}

/**
 * Identify at-risk subjects for a student
 * @param array $grades Student's grades
 * @param float $threshold Threshold percentage
 * @return array At-risk subjects
 */
function identifyAtRiskSubjects($grades, $threshold = 70)
{
    $atRisk = [];

    foreach ($grades as $grade) {
        $gradeValue = floatval($grade['grade'] ?? 0);
        if ($gradeValue < $threshold && $gradeValue > 0) {
            $atRisk[] = [
                'subject_id' => $grade['subject_id'],
                'subject_name' => $grade['subject_name'] ?? 'Unknown',
                'current_grade' => $gradeValue,
                'gap' => $threshold - $gradeValue,
                'risk_level' => $gradeValue < 50 ? 'critical' : ($gradeValue < 60 ? 'high' : 'moderate')
            ];
        }
    }

    // Sort by risk level
    usort($atRisk, function ($a, $b) {
        return $a['current_grade'] - $b['current_grade'];
    });

    return $atRisk;
}

/**
 * Generate study recommendations based on performance
 * @param array $grades Student grades
 * @param array $attendance Attendance data
 * @return array Recommendations
 */
function generateRecommendations($grades, $attendance = [])
{
    $recommendations = [];

    // Identify weakest subjects
    $sortedGrades = $grades;
    usort($sortedGrades, function ($a, $b) {
        return floatval($a['grade'] ?? 0) - floatval($b['grade'] ?? 0);
    });

    // Recommendation: Focus on weakest subject
    if (!empty($sortedGrades) && floatval($sortedGrades[0]['grade'] ?? 0) < 75) {
        $recommendations[] = [
            'type' => 'study_focus',
            'title' => 'Focus on ' . ($sortedGrades[0]['subject_name'] ?? 'this subject'),
            'message' => 'Your grade in this subject is below target. Consider allocating more study time here.',
            'priority' => 'high',
            'subject_id' => $sortedGrades[0]['subject_id'] ?? null
        ];
    }

    // Recommendation: Attendance improvement
    $avgAttendance = !empty($attendance) ? array_sum(array_column($attendance, 'percentage')) / count($attendance) : 100;
    if ($avgAttendance < 80) {
        $recommendations[] = [
            'type' => 'time_management',
            'title' => 'Improve Attendance',
            'message' => 'Your attendance is below 80%. Regular attendance is strongly correlated with better grades.',
            'priority' => 'high',
            'subject_id' => null
        ];
    }

    // Recommendation: Celebrate improvements
    if (count($grades) >= 2) {
        $recent = array_slice($sortedGrades, -2);
        if (floatval($recent[1]['grade'] ?? 0) > floatval($recent[0]['grade'] ?? 0) + 5) {
            $recommendations[] = [
                'type' => 'positive_feedback',
                'title' => 'Great Improvement!',
                'message' => 'Keep up the good work! Your recent performance shows positive trends.',
                'priority' => 'low',
                'subject_id' => null
            ];
        }
    }

    return $recommendations;
}

/**
 * Calculate subject difficulty based on class performance
 * @param array $allGrades All student grades for a subject
 * @return array Difficulty analysis
 */
function calculateSubjectDifficulty($allGrades)
{
    if (empty($allGrades)) {
        return ['difficulty' => 'moderate', 'average' => 0, 'pass_rate' => 0];
    }

    $gradeValues = array_map(function ($g) {
        return floatval($g['grade'] ?? 0);
    }, $allGrades);

    $average = array_sum($gradeValues) / count($gradeValues);
    $passCount = count(array_filter($gradeValues, function ($g) {
        return $g >= 50; }));
    $passRate = ($passCount / count($gradeValues)) * 100;

    // Determine difficulty
    $difficulty = 'moderate';
    if ($average < 60 || $passRate < 70) {
        $difficulty = 'very_hard';
    } elseif ($average < 70 || $passRate < 80) {
        $difficulty = 'hard';
    } elseif ($average >= 80 && $passRate >= 90) {
        $difficulty = 'easy';
    }

    return [
        'difficulty' => $difficulty,
        'average_grade' => round($average, 2),
        'pass_rate' => round($passRate, 2),
        'fail_rate' => round(100 - $passRate, 2)
    ];
}

?>