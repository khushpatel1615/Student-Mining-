<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * Integration Test for Role-Based Access Control
 * Verifies that endpoints check roles correctly and block unauthorized access.
 */
class RbacApiTest extends TestCase
{
    private $baseUrl;
    private $adminToken;
    private $teacherToken;
    private $studentToken;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/backend/api/';

        // We will attempt to use JWT tokens generated directly to bypass full authentication dependency
        require_once __DIR__ . '/../../includes/jwt.php';
        require_once __DIR__ . '/../../config/EnvLoader.php';

        $this->adminToken = generateToken(1, 'admin@college.edu', 'admin', 'Admin User');
        $this->teacherToken = generateToken(2, 'teacher@college.edu', 'teacher', 'Teacher User');
        $this->studentToken = generateToken(3, 'student@college.edu', 'student', 'Student User');
    }

    private function getRequest(string $endpoint, ?string $token): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $headers = "Content-Type: application/json\r\n";
        if ($token !== null) {
            $headers .= "Authorization: Bearer $token\r\n";
        }

        $options = [
            'http' => [
                'header' => $headers,
                'method' => 'GET',
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

    private function postRequest(string $endpoint, ?string $token, array $data = []): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $headers = "Content-Type: application/json\r\n";
        if ($token !== null) {
            $headers .= "Authorization: Bearer $token\r\n";
        }

        $options = [
            'http' => [
                'header' => $headers,
                'method' => 'POST',
                'content' => json_encode($data),
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

    public function testEndpointWithoutTokenIsUnauthorized()
    {
        // describe_tables.php typically requires admin role
        $response = $this->getRequest('describe_tables.php', null);
        $this->assertEquals(401, $response['status'], 'Request without token must return 401 Unauthorized');
    }

    public function testStudentCannotAccessAdminEndpoint()
    {
        // Programs endpoint is an admin-level endpoint for POST requests
        $response = $this->postRequest('programs.php', $this->studentToken, [
            'name' => 'Hack Program',
            'code' => 'HACK'
        ]);

        $this->assertEquals(403, $response['status'], 'Student token should be forbidden (403)');
        $this->assertStringContainsString('Forbidden', $response['body']['error'] ?? '');
    }

    public function testTeacherCannotAccessAdminEndpoint()
    {
        // Teachers cannot create programs
        $response = $this->postRequest('programs.php', $this->teacherToken, [
            'name' => 'Hack Program',
            'code' => 'HACK'
        ]);

        $this->assertEquals(403, $response['status'], 'Teacher token should be forbidden (403)');
    }

    public function testStudentCannotAccessTeacherEndpoint()
    {
        // grades.php POST assigns grades; students cannot do this
        $response = $this->postRequest('grades.php', $this->studentToken, [
            'enrollment_id' => 1,
            'criteria_id' => 1,
            'marks_obtained' => 90
        ]);

        $this->assertEquals(403, $response['status'], 'Student token should be forbidden from entering grades');
    }
}
