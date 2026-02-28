<?php
/**
 * GradesApiTest.php
 * Integration tests for backend/api/grades.php HTTP endpoints.
 * Requires: test DB seeded with test_seed.sql, dev server running on TEST_BASE_URL.
 * RUN: vendor/bin/phpunit tests/Integration/GradesApiTest.php
 */

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;

class GradesApiIntegrationTest extends TestCase
{
    private string $baseUrl;
    private string $adminToken;
    private string $teacherToken;
    private string $studentToken;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/backend/api/';

        require_once __DIR__ . '/../../includes/jwt.php';
        require_once __DIR__ . '/../../config/database.php';

        $this->adminToken = generateToken(1, 'admin@college.edu', 'admin', 'Admin User');
        $this->teacherToken = generateToken(2, 'teacher@college.edu', 'teacher', 'Teacher User');
        $this->studentToken = generateToken(3, 'student@college.edu', 'student', 'Student User');
    }

    private function request(string $method, string $endpoint, ?string $token = null, array $data = []): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $headers = "Content-Type: application/json\r\n";
        if ($token) {
            $headers .= "Authorization: Bearer $token\r\n";
        }

        $options = [
            'http' => [
                'header' => $headers,
                'method' => $method,
                'content' => in_array($method, ['POST', 'PUT']) ? json_encode($data) : null,
                'ignore_errors' => true
            ]
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        $status = 0;
        if (isset($http_response_header[0]) && preg_match('#HTTP/\d+\.\d+ (\d+)#', $http_response_header[0], $matches)) {
            $status = (int) $matches[1];
        }

        return [
            'status' => $status,
            'body' => json_decode($response, true)
        ];
    }

    // =========================================================
    // AUTH GUARD TESTS
    // =========================================================

    public function testGet_NoToken_Returns401(): void
    {
        $response = $this->request('GET', 'grades.php');
        $this->assertSame(401, $response['status']);
    }

    public function testPut_StudentRole_Returns403(): void
    {
        $response = $this->request('PUT', 'grades.php', $this->studentToken, ['grade_id' => 1, 'marks_obtained' => 90]);
        $this->assertSame(403, $response['status']);
    }

    public function testGet_ByEnrollmentId_Returns200WithCorrectShape(): void
    {
        $response = $this->request('GET', 'grades.php?enrollment_id=1', $this->adminToken);
        $this->assertSame(200, $response['status']);
        $this->assertArrayHasKey('grades', $response['body']['data'] ?? []);
        $this->assertArrayHasKey('summary', $response['body']['data'] ?? []);
    }

    public function testPut_NegativeMarks_Returns400(): void
    {
        $response = $this->request('PUT', 'grades.php', $this->adminToken, [
            'grades' => [['grade_id' => 1, 'marks_obtained' => -10, 'criteria_id' => 1]]
        ]);
        $this->assertSame(400, $response['status']);
    }

    public function testPut_MarksExceedMax_Returns400(): void
    {
        $response = $this->request('PUT', 'grades.php', $this->adminToken, [
            'grades' => [['grade_id' => 1, 'criteria_id' => 1, 'marks_obtained' => 999]]
        ]);
        $this->assertSame(400, $response['status']);
    }
}
