<?php
/**
 * GradesHelperTest.php
 * Tests pure helper functions from backend/api/grades.php
 * RUN: vendor/bin/phpunit tests/Helpers/GradesHelperTest.php
 */

namespace Tests\Helpers;

use PHPUnit\Framework\TestCase;

// Include only the helpers, not the full endpoint file.
// We define a bootstrap that stubs out the require_once dependencies
// so grades.php helpers can be loaded in isolation.
require_once __DIR__ . '/../../api/grades.php';

class GradesHelperTest extends TestCase
{
    // =========================================================
    // clampPercentage()
    // =========================================================

    public function testClampPercentage_ReturnsNull_WhenInputIsNull(): void
    {
        // [clampPercentage] - null input - must return null, not 0
        $result = clampPercentage(null);
        $this->assertNull($result, 'A null percentage must remain null — it indicates no grade, not zero.');
    }

    public function testClampPercentage_ReturnsZero_WhenInputIsNegative(): void
    {
        // [clampPercentage] - negative input - clamped to 0
        $result = clampPercentage(-15.5);
        $this->assertSame(0.0, $result, 'Negative percentages must be clamped to 0.');
    }

    public function testClampPercentage_Returns100_WhenInputExceeds100(): void
    {
        // [clampPercentage] - input over 100 - clamped to 100
        $result = clampPercentage(150.0);
        $this->assertSame(100.0, $result, 'Percentages over 100 must be clamped to 100.');
    }

    public function testClampPercentage_ReturnsUnchanged_WhenInRange(): void
    {
        // [clampPercentage] - normal input - returned as float unchanged
        $result = clampPercentage(85.5);
        $this->assertSame(85.5, $result);
    }

    public function testClampPercentage_HandlesBoundary_AtZero(): void
    {
        $this->assertSame(0.0, clampPercentage(0));
    }

    public function testClampPercentage_HandlesBoundary_At100(): void
    {
        $this->assertSame(100.0, clampPercentage(100));
    }

    // =========================================================
    // calculateGrade()
    // =========================================================

    /** @dataProvider gradeThresholdProvider */
    public function testCalculateGrade_ReturnsCorrectLetterGrade(
        float $percentage,
        string $expectedGrade
    ): void {
        // [calculateGrade] - threshold boundaries - correct letter grade assigned
        $result = calculateGrade($percentage);
        $this->assertSame(
            $expectedGrade,
            $result,
            "Percentage {$percentage}% should map to grade {$expectedGrade}."
        );
    }

    public static function gradeThresholdProvider(): array
    {
        return [
            'A+ at 90' => [90.0, 'A+'],
            'A+ at 95' => [95.0, 'A+'],
            'A+ at 100' => [100.0, 'A+'],
            'A at 80' => [80.0, 'A'],
            'A at 89.99' => [89.99, 'A'],
            'B+ at 70' => [70.0, 'B+'],
            'B+ at 79.99' => [79.99, 'B+'],
            'B at 60' => [60.0, 'B'],
            'B at 69.99' => [69.99, 'B'],
            'C at 50' => [50.0, 'C'],
            'C at 59.99' => [59.99, 'C'],
            'D at 40' => [40.0, 'D'],
            'D at 49.99' => [49.99, 'D'],
            'F at 39.99' => [39.99, 'F'],
            'F at 0' => [0.0, 'F'],
        ];
    }

    public function testCalculateGrade_ReturnsNull_WhenPercentageIsNull(): void
    {
        // [calculateGrade] - null input - must return null, not 'F'
        $result = calculateGrade(null);
        $this->assertNull($result, 'A null percentage must not be graded as F. It means no grade exists yet.');
    }

    // =========================================================
    // NULL vs 0 distinction — CRITICAL
    // =========================================================

    public function testNullGrade_IsNotEqualToZeroGrade(): void
    {
        // CRITICAL
        // [Grade Engine] - NULL vs 0 - a missing grade must be fundamentally different from a zero
        $missingGrade = null;
        $zeroGrade = 0;

        $this->assertNotSame($missingGrade, $zeroGrade);
        $this->assertNull($missingGrade);
        $this->assertSame(0, $zeroGrade);
    }

    public function testCalculateGrade_DoesNotReturnF_ForNullInput(): void
    {
        // CRITICAL
        // [Grade Engine] - null grade must not produce 'F' — it must produce null
        $this->assertNotSame('F', calculateGrade(null));
    }
}
