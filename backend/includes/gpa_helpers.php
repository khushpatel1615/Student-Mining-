<?php

/**
 * Standardized GPA Calculation Helpers
 * =====================================
 * This is the SINGLE source of truth for all GPA conversions in the project.
 * All files that compute GPA must use these functions for consistency.
 *
 * GPA 4.0 Scale Mapping:
 *   A+ (≥90%) = 4.0
 *   A  (≥80%) = 3.7
 *   B+ (≥70%) = 3.3
 *   B  (≥60%) = 3.0
 *   C  (≥50%) = 2.0
 *   D  (≥40%) = 1.0
 *   F  (<40%) = 0.0
 *
 * GPA 10-point Scale Mapping:
 *   A+ (≥90%) = 10.0
 *   A  (≥80%) = 9.0
 *   B+ (≥70%) = 8.0
 *   B  (≥60%) = 7.0
 *   C  (≥50%) = 6.0
 *   D  (≥40%) = 5.0
 *   F  (<40%) = 0.0
 */

/**
 * Convert percentage to 4.0 GPA scale grade points
 */
function percentageToGPA4(float $percentage): float
{
    if ($percentage >= 90)
        return 4.0;
    if ($percentage >= 80)
        return 3.7;
    if ($percentage >= 70)
        return 3.3;
    if ($percentage >= 60)
        return 3.0;
    if ($percentage >= 50)
        return 2.0;
    if ($percentage >= 40)
        return 1.0;
    return 0.0;
}

/**
 * Convert percentage to 10-point GPA scale grade points
 */
function percentageToGPA10(float $percentage): float
{
    if ($percentage >= 90)
        return 10.0;
    if ($percentage >= 80)
        return 9.0;
    if ($percentage >= 70)
        return 8.0;
    if ($percentage >= 60)
        return 7.0;
    if ($percentage >= 50)
        return 6.0;
    if ($percentage >= 40)
        return 5.0;
    return 0.0;
}

/**
 * SQL CASE expression for converting percentage to 4.0 GPA points.
 * Returns a SQL fragment that can be embedded in queries.
 *
 * @param string $column The SQL column/expression containing percentage value
 * @return string SQL CASE expression
 */
function gpa4SqlCase(string $column = 'se.final_percentage'): string
{
    return "CASE
                WHEN {$column} >= 90 THEN 4.0
                WHEN {$column} >= 80 THEN 3.7
                WHEN {$column} >= 70 THEN 3.3
                WHEN {$column} >= 60 THEN 3.0
                WHEN {$column} >= 50 THEN 2.0
                WHEN {$column} >= 40 THEN 1.0
                ELSE 0.0
            END";
}
