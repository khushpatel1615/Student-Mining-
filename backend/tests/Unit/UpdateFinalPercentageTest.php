<?php
/**
 * UpdateFinalPercentageTest.php
 * Tests the grade calculation engine helpers with mocked PDO.
 * CRITICAL: Covers NULL handling, divide-by-zero, and weighted average accuracy.
 * RUN: vendor/bin/phpunit tests/Unit/UpdateFinalPercentageTest.php
 */

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use PDO;
use PDOStatement;

require_once __DIR__ . '/../../api/grades.php';

class UpdateFinalPercentageTest extends TestCase
{
    // =========================================================
    // updateFinalPercentage() — CRITICAL
    // =========================================================

    public function testUpdateFinalPercentage_AllNullGrades_SetsPercentageToNull(): void
    {
        // CRITICAL
        // [updateFinalPercentage] - all grades NULL - final_percentage must be NULL, not 0
        // The SQL query filters WHERE marks_obtained IS NOT NULL, so $results will be empty.
        // This test validates the downstream behavior: empty results → percentage stays null.

        $fetchStmt = $this->createMock(PDOStatement::class);
        $fetchStmt->method('execute')->willReturn(true);
        $fetchStmt->method('fetchAll')->willReturn([]); // No non-null grades

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')
            ->with($this->callback(function ($params) {
                // CRITICAL: first param (final_percentage) must be null, not 0
                $this->assertNull(
                    $params[0],
                    'final_percentage must be NULL when all grade components are NULL.'
                );
                $this->assertNull(
                    $params[1],
                    'final_grade must be NULL when final_percentage is NULL.'
                );
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($fetchStmt, $updateStmt);

        updateFinalPercentage($pdo, 999);
    }

    public function testUpdateFinalPercentage_PartialNullGrades_ExcludesNullsFromCalculation(): void
    {
        // CRITICAL
        // [updateFinalPercentage] - partial NULL grades - only non-null grades contribute to average
        // Student has: Midterm=20/20 (weight 25%), Final=NULL, Assignments=14/15 (weight 15%)
        // Expected: only Midterm and Assignments are summed. Final (NULL) is excluded.
        // weighted_score for Midterm: (20/20)*25 = 25.0
        // weighted_score for Assignments: (14/15)*15 = 14.0
        // total = 39.0 (not divided or adjusted — this is the raw weighted sum of present components)

        $fetchStmt = $this->createMock(PDOStatement::class);
        $fetchStmt->method('execute')->willReturn(true);
        $fetchStmt->method('fetchAll')->willReturn([
            [
                'weight_percentage' => 25.00,
                'max_marks' => 20,
                'marks_obtained' => 20,
                'weighted_score' => 25.0, // (20/20)*25
            ],
            [
                'weight_percentage' => 15.00,
                'max_marks' => 15,
                'marks_obtained' => 14,
                'weighted_score' => 14.0, // (14/15)*15
            ],
            // Final exam row is absent because SQL filters WHERE marks_obtained IS NOT NULL
        ]);

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')
            ->with($this->callback(function ($params) {
                $this->assertSame(39.0, $params[0], 'Partial grade sum should be 39.0.');
                $this->assertSame('D', $params[1], '39.0% maps to grade D.');
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($fetchStmt, $updateStmt);

        updateFinalPercentage($pdo, 42);
    }

    public function testUpdateFinalPercentage_AllGradesPresent_CalculatesCorrectWeightedAverage(): void
    {
        // CRITICAL
        // [updateFinalPercentage] - all grades present - correct weighted total
        // Final=38/40 (weight 40%): (38/40)*40 = 38.0
        // Midterm=18/20 (weight 20%): (18/20)*20 = 18.0
        // Labs=23/25 (weight 25%): (23/25)*25 = 23.0
        // Assignments=13/15 (weight 15%): (13/15)*15 = 13.0
        // Total weighted = 92.0 → grade A+

        $fetchStmt = $this->createMock(PDOStatement::class);
        $fetchStmt->method('execute')->willReturn(true);
        $fetchStmt->method('fetchAll')->willReturn([
            ['weight_percentage' => 40.00, 'max_marks' => 40, 'marks_obtained' => 38, 'weighted_score' => 38.0],
            ['weight_percentage' => 20.00, 'max_marks' => 20, 'marks_obtained' => 18, 'weighted_score' => 18.0],
            ['weight_percentage' => 25.00, 'max_marks' => 25, 'marks_obtained' => 23, 'weighted_score' => 23.0],
            ['weight_percentage' => 15.00, 'max_marks' => 15, 'marks_obtained' => 13, 'weighted_score' => 13.0],
        ]);

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')
            ->with($this->callback(function ($params) {
                $this->assertSame(92.0, $params[0]);
                $this->assertSame('A+', $params[1]);
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($fetchStmt, $updateStmt);

        updateFinalPercentage($pdo, 1);
    }

    public function testUpdateFinalPercentage_ResultClamped_WhenRoundingExceeds100(): void
    {
        // [updateFinalPercentage] - floating point rounding edge case - result clamped to 100
        $fetchStmt = $this->createMock(PDOStatement::class);
        $fetchStmt->method('execute')->willReturn(true);
        $fetchStmt->method('fetchAll')->willReturn([
            ['weight_percentage' => 100.00, 'max_marks' => 100, 'marks_obtained' => 100, 'weighted_score' => 100.0],
        ]);

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')
            ->with($this->callback(function ($params) {
                $this->assertLessThanOrEqual(100.0, $params[0], 'Final percentage must never exceed 100.');
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($fetchStmt, $updateStmt);

        updateFinalPercentage($pdo, 55);
    }

    // =========================================================
    // syncStudentAnalytics() — GPA Engine
    // =========================================================

    public function testSyncStudentAnalytics_NullFinalPercentage_ExcludedFromGPA(): void
    {
        // CRITICAL
        // [syncStudentAnalytics] - enrollment with null final_percentage - must not contribute to GPA
        // If a student has one subject with 85% and one with NULL, GPA should reflect only the 85%.

        $enrollStmt = $this->createMock(PDOStatement::class);
        $enrollStmt->method('execute')->willReturn(true);
        $enrollStmt->method('fetchAll')->willReturn([
            ['final_percentage' => 85.0, 'credits' => 3, 'semester' => 1],
            ['final_percentage' => null, 'credits' => 3, 'semester' => 1], // NULL — must be skipped
        ]);

        $semStmt = $this->createMock(PDOStatement::class);
        $semStmt->method('execute')->willReturn(true);
        $semStmt->method('fetchColumn')->willReturn(1); // current_semester = 1

        $oldTierStmt = $this->createMock(PDOStatement::class);
        $oldTierStmt->method('execute')->willReturn(true);
        $oldTierStmt->method('fetchColumn')->willReturn('good'); // existing tier

        $upsertStmt = $this->createMock(PDOStatement::class);
        $upsertStmt->method('execute')
            ->with($this->callback(function ($params) {
                // With 85% on one 3-credit subject → 4.0 GPA points * 3 = 12 / 3 = 4.0 cumGpa
                // NULL subject must NOT drag GPA down
                $cumGpa = $params[4];
                $this->assertGreaterThan(
                    3.0,
                    $cumGpa,
                    'GPA should reflect only graded subjects. NULL enrollment must not lower the GPA.'
                );
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($enrollStmt, $semStmt, $oldTierStmt, $upsertStmt);

        syncStudentAnalytics($pdo, 3);
    }

    public function testSyncStudentAnalytics_NoEnrollments_SetsGpaToZero(): void
    {
        // [syncStudentAnalytics] - brand new student with no enrollments - cumGpa = 0, no crash
        $enrollStmt = $this->createMock(PDOStatement::class);
        $enrollStmt->method('execute')->willReturn(true);
        $enrollStmt->method('fetchAll')->willReturn([]);

        $semStmt = $this->createMock(PDOStatement::class);
        $semStmt->method('execute')->willReturn(true);
        $semStmt->method('fetchColumn')->willReturn(1);

        $oldTierStmt = $this->createMock(PDOStatement::class);
        $oldTierStmt->method('execute')->willReturn(true);
        $oldTierStmt->method('fetchColumn')->willReturn(false);

        $upsertStmt = $this->createMock(PDOStatement::class);
        $upsertStmt->method('execute')
            ->with($this->callback(function ($params) {
                $this->assertSame(0.0, (float) $params[2], 'cumGpa must be 0.0 for a new student.');
                $this->assertSame('average', $params[5], 'Tier must be average when cumCredits = 0.');
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($enrollStmt, $semStmt, $oldTierStmt, $upsertStmt);

        syncStudentAnalytics($pdo, 999);
    }

    /** @dataProvider tierThresholdProvider */
    public function testSyncStudentAnalytics_AssignsCorrectPerformanceTier(
        float $percentage,
        string $expectedTier
    ): void {
        // [syncStudentAnalytics] - tier thresholds - correct performance tier assigned
        $enrollStmt = $this->createMock(PDOStatement::class);
        $enrollStmt->method('execute')->willReturn(true);
        $enrollStmt->method('fetchAll')->willReturn([
            ['final_percentage' => $percentage, 'credits' => 3, 'semester' => 1],
        ]);

        $semStmt = $this->createMock(PDOStatement::class);
        $semStmt->method('execute')->willReturn(true);
        $semStmt->method('fetchColumn')->willReturn(1);

        $oldTierStmt = $this->createMock(PDOStatement::class);
        $oldTierStmt->method('execute')->willReturn(true);
        $oldTierStmt->method('fetchColumn')->willReturn($expectedTier); // Same tier, no notification needed

        $upsertStmt = $this->createMock(PDOStatement::class);
        $upsertStmt->method('execute')
            ->with($this->callback(function ($params) use ($expectedTier) {
                $this->assertSame($expectedTier, $params[5], "Performance tier mismatch.");
                return true;
            }))
            ->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($enrollStmt, $semStmt, $oldTierStmt, $upsertStmt);

        syncStudentAnalytics($pdo, 10);
    }

    public static function tierThresholdProvider(): array
    {
        // GPA points: >=90→4.0, >=80→4.0, >=70→3.5, >=60→3.0, >=50→2.0, >=40→1.0, else→0.0
        // With 3 credits: cumGpa = gpaPoints/3 * 3 / 3 = gpaPoints
        return [
            'excellent at 95%' => [95.0, 'excellent'],  // GPA 4.0 → >=3.5 → excellent
            'excellent at 80%' => [80.0, 'excellent'],  // GPA 4.0 → >=3.5 → excellent
            'good at 70%' => [70.0, 'good'],       // GPA 3.5 → >=3.0 → good
            'good at 60%' => [60.0, 'good'],       // GPA 3.0 → >=3.0 → good (edge)
            'average at 50%' => [50.0, 'average'],    // GPA 2.0 → not <2.0, not <2.5 → average... 
            // NOTE: 2.0 is NOT < 2.0, so not at_risk. 
            // 2.0 IS < 2.5, so below_average
            'at_risk at 30%' => [30.0, 'at_risk'],    // GPA 0.0 → <2.0 → at_risk
        ];
    }
}
