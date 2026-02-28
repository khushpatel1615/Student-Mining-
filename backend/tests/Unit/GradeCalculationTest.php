<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/gpa_helpers.php';
require_once __DIR__ . '/../../api/grades.php';

class GradeCalculationTest extends TestCase
{
    /**
     * @dataProvider gpa4Provider
     */
    public function testPercentageToGPA4(float $percentage, float $expectedGPA): void
    {
        $this->assertEquals($expectedGPA, percentageToGPA4($percentage));
    }

    public static function gpa4Provider(): array
    {
        return [
            'A+ (95%)' => [95.0, 4.0],
            'A+ (90%)' => [90.0, 4.0],
            'A (85%)' => [85.0, 3.7],
            'A (80%)' => [80.0, 3.7],
            'B+ (75%)' => [75.0, 3.3],
            'B+ (70%)' => [70.0, 3.3],
            'B (65%)' => [65.0, 3.0],
            'B (60%)' => [60.0, 3.0],
            'C (55%)' => [55.0, 2.0],
            'C (50%)' => [50.0, 2.0],
            'D (45%)' => [45.0, 1.0],
            'D (40%)' => [40.0, 1.0],
            'F (39.9%)' => [39.9, 0.0],
            'F (0%)' => [0.0, 0.0],
        ];
    }

    /**
     * @dataProvider gpa10Provider
     */
    public function testPercentageToGPA10(float $percentage, float $expectedGPA): void
    {
        $this->assertEquals($expectedGPA, percentageToGPA10($percentage));
    }

    public static function gpa10Provider(): array
    {
        return [
            'A+ (90%)' => [90.0, 10.0],
            'A (80%)' => [80.0, 9.0],
            'B+ (70%)' => [70.0, 8.0],
            'B (60%)' => [60.0, 7.0],
            'C (50%)' => [50.0, 6.0],
            'D (40%)' => [40.0, 5.0],
            'F (30%)' => [30.0, 0.0],
        ];
    }

    /**
     * @dataProvider clampProvider
     */
    public function testClampPercentage($value, $expected): void
    {
        $this->assertEquals($expected, clampPercentage($value));
    }

    public static function clampProvider(): array
    {
        return [
            'Normal value' => [85.5, 85.5],
            'Above 100' => [105.0, 100.0],
            'Below 0' => [-5.0, 0.0],
            'Null value' => [null, null],
            'String value' => ['90.5', 90.5],
        ];
    }
}
